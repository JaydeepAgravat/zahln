import { bundledDefaults, type RemoteConfig } from '@zaster/shared';
import { configureApp } from '../src/app';
import { currentConfig, refreshConfig, useConfigStore } from '../src/remoteConfig';

jest.mock('react-native-sse', () => jest.fn());

const server: RemoteConfig = {
  ...bundledDefaults('merchant'),
  version: 7,
  minSupportedVersion: '0.1.0',
  latestVersion: '0.2.0',
  killSwitches: { nfc_pay: true, refunds: false, topup: false },
  plan: 'pro',
  features: ['static_qr', 'dynamic_qr', 'refunds', 'tips'],
};

const respond = (impl: () => Promise<unknown>) => {
  globalThis.fetch = jest.fn(impl) as unknown as typeof fetch;
};

beforeAll(() => configureApp('merchant', '0.1.0'));
beforeEach(() => useConfigStore.setState({ config: null, offline: false }));

describe('remote config on the device', () => {
  it('before any answer it runs on the bundled defaults: no kill switch, no plan, no forced update', () => {
    expect(currentConfig()).toEqual(bundledDefaults('merchant'));
  });

  it("stores the server's answer", async () => {
    respond(async () => ({ ok: true, status: 200, json: async () => server }));
    await refreshConfig();
    expect(currentConfig().version).toBe(7);
    expect(currentConfig().killSwitches.nfc_pay).toBe(true);
    expect(useConfigStore.getState().offline).toBe(false);
  });

  it('when the server is unreachable it keeps the last known config and says it is offline', async () => {
    respond(async () => ({ ok: true, status: 200, json: async () => server }));
    await refreshConfig();
    respond(async () => {
      throw new Error('network down');
    });
    await refreshConfig();
    expect(currentConfig().version).toBe(7);
    expect(useConfigStore.getState().offline).toBe(true);
  });

  it('a malformed answer is not applied (a broken server cannot push garbage config)', async () => {
    respond(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ...server, minSupportedVersion: 'nine' }),
    }));
    await refreshConfig();
    expect(currentConfig()).toEqual(bundledDefaults('merchant'));
    expect(useConfigStore.getState().offline).toBe(true);
  });
});
