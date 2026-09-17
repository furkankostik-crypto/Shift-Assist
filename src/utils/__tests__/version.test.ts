import { describe, it, expect } from 'vitest';
import {
  APP_VERSION,
  compareVersions,
  formatLastCheckedTime,
  getRuntimeEnvironment,
  CURRENT_RELEASE_HIGHLIGHTS,
} from '../version';

describe('version utilities', () => {
  it('has valid APP_VERSION and highlights', () => {
    expect(APP_VERSION).toBe('1.4.1');
    expect(CURRENT_RELEASE_HIGHLIGHTS.length).toBeGreaterThan(0);
  });

  describe('compareVersions', () => {
    it('correctly compares equal versions with or without v prefix', () => {
      expect(compareVersions('1.3.0', '1.3.0')).toBe(0);
      expect(compareVersions('v1.3.0', '1.3.0')).toBe(0);
      expect(compareVersions('1.3.0', 'v1.3.0')).toBe(0);
    });

    it('returns 1 when v1 is newer than v2', () => {
      expect(compareVersions('1.3.1', '1.3.0')).toBe(1);
      expect(compareVersions('1.4.0', '1.3.9')).toBe(1);
      expect(compareVersions('2.0.0', '1.9.9')).toBe(1);
    });

    it('returns -1 when v1 is older than v2', () => {
      expect(compareVersions('1.2.9', '1.3.0')).toBe(-1);
      expect(compareVersions('1.3.0', '1.3.1')).toBe(-1);
      expect(compareVersions('0.9.0', '1.0.0')).toBe(-1);
    });

    it('handles differing segment counts', () => {
      expect(compareVersions('1.3.0.1', '1.3.0')).toBe(1);
      expect(compareVersions('1.3', '1.3.0')).toBe(0);
      expect(compareVersions('1.3', '1.3.1')).toBe(-1);
    });
  });

  describe('formatLastCheckedTime', () => {
    it('returns default text when null', () => {
      expect(formatLastCheckedTime(null)).toBe('Henüz denetlenmedi');
    });

    it('returns "Az önce" for timestamps within 30 seconds', () => {
      const now = Date.now();
      expect(formatLastCheckedTime(now - 5000)).toBe('Az önce');
    });

    it('returns minutes ago for timestamps under an hour', () => {
      const now = Date.now();
      expect(formatLastCheckedTime(now - 120000)).toBe('2 dakika önce');
    });
  });

  describe('getRuntimeEnvironment', () => {
    it('returns valid environment object', () => {
      const env = getRuntimeEnvironment();
      expect(env).toHaveProperty('modeLabel');
      expect(env).toHaveProperty('isStandalone');
      expect(env).toHaveProperty('platform');
      expect(typeof env.modeLabel).toBe('string');
    });
  });
});
