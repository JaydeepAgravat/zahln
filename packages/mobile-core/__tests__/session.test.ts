import { AppState } from 'react-native';
import { z } from 'zod';
import { api, setAuth } from '../src/api';
import { configureApp } from '../src/app';
import { checkPin, savePin, saveSession } from '../src/secure';
import { LOCK_AFTER_BACKGROUND_MS, startAutoLock, useSession } from '../src/session';

type Listener = (state: string) => void;

function captureAppStateListener(): { emit: Listener } {
  const spy = jest.spyOn(AppState, 'addEventListener');
  let listener: Listener = () => {};
  spy.mockImplementation((_type, cb) => {
    listener = cb as Listener;
    return { remove: () => {} } as ReturnType<typeof AppState.addEventListener>;
  });
  return { emit: (s) => listener(s) };
}

describe('background auto-lock', () => {
  beforeEach(() => useSession.setState({ status: 'ready', backgroundedAt: null, deviceId: 'device-1' }));

  it('locks after 60 s in the background', () => {
    let now = 0;
    const appState = captureAppStateListener();
    startAutoLock(() => now);
    appState.emit('background');
    now = LOCK_AFTER_BACKGROUND_MS;
    appState.emit('active');
    expect(useSession.getState().status).toBe('locked');
  });

  it('a quick app switch does not lock', () => {
    let now = 0;
    const appState = captureAppStateListener();
    startAutoLock(() => now);
    appState.emit('background');
    now = 5_000;
    appState.emit('active');
    expect(useSession.getState().status).toBe('ready');
  });
});

describe('PIN attempts', () => {
  it('counts wrong PINs and pauses after five', async () => {
    await savePin('482915');
    for (let i = 1; i <= 4; i++)
      expect(await checkPin('000000', 1_000)).toEqual({ ok: false, failed: i, lockedForMs: 0 });
    expect(await checkPin('000000', 1_000)).toEqual({ ok: false, failed: 5, lockedForMs: 30_000 });
    // Even the right PIN is refused during the pause.
    expect((await checkPin('482915', 2_000)).ok).toBe(false);
    expect(await checkPin('482915', 1_000 + 30_000)).toEqual({ ok: true });
  });
});

describe('unlock', () => {
  it('only reaches ready when a stored session exists', async () => {
    useSession.setState({ status: 'locked', deviceId: 'device-1' });
    await saveSession({ token: 'secret', userId: 'usr_lena' });
    await useSession.getState().unlock();
    expect(useSession.getState().status).toBe('ready');
  });
});

describe('revoked session', () => {
  it('a 401 on an authenticated request signs the device out instead of leaving a broken screen', async () => {
    configureApp('consumer');
    useSession.setState({ status: 'ready' });
    setAuth({ token: 'revoked', deviceId: 'device-1' });
    const fetchMock = jest.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: 'unauthorized', message: 'session revoked' }),
    }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await expect(api('/me', z.unknown())).rejects.toMatchObject({ status: 401 });
    await new Promise<void>((r) => setTimeout(r, 0));
    expect(useSession.getState().status).toBe('onboarding');
  });
});
