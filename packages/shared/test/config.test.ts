import { describe, expect, it } from 'vitest';
import {
  AdminConfigSchema,
  bundledDefaults,
  compareVersions,
  INITIAL_ADMIN_CONFIG,
  RemoteConfigSchema,
  updateStatus,
} from '../src/config';

describe('version comparison', () => {
  it('compares numerically, not as strings', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBe(1);
    expect(compareVersions('0.1.0', '0.1.0')).toBe(0);
    expect(compareVersions('0.9.9', '1.0.0')).toBe(-1);
    expect(compareVersions('2.0.0', '10.0.0')).toBe(-1);
  });

  it('separates a forced update from a soft one', () => {
    const cfg = { minSupportedVersion: '1.0.0', latestVersion: '1.2.0' };
    expect(updateStatus('0.9.0', cfg)).toBe('required');
    expect(updateStatus('1.1.0', cfg)).toBe('available');
    expect(updateStatus('1.2.0', cfg)).toBe('current');
    expect(updateStatus('1.3.0', cfg)).toBe('current');
  });
});

describe('defaults', () => {
  it('the initial admin config is valid', () => {
    expect(AdminConfigSchema.parse(INITIAL_ADMIN_CONFIG)).toEqual(INITIAL_ADMIN_CONFIG);
  });

  it('bundled defaults never force an update, fire no kill switch and assume no plan', () => {
    const d = RemoteConfigSchema.parse(bundledDefaults('merchant'));
    expect(updateStatus('0.0.1', d)).toBe('current');
    expect(Object.values(d.killSwitches).every((v) => v === false)).toBe(true);
    expect(d.features).toEqual([]);
    expect(d.plan).toBeNull();
  });

  it('rejects a version that is not x.y.z, so a typo in the console cannot lock everyone out', () => {
    const bad: typeof INITIAL_ADMIN_CONFIG = JSON.parse(JSON.stringify(INITIAL_ADMIN_CONFIG));
    bad.apps.consumer.minSupportedVersion = '1.0';
    expect(AdminConfigSchema.safeParse(bad).success).toBe(false);
  });
});
