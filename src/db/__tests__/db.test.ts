import { describe, it, expect, beforeEach } from 'vitest';
import {
  db,
  ensureDefaultShiftTypes,
  ensureDefaultPatterns,
  getFixedShiftInfo,
  isFixedShiftType,
  DEFAULT_SHIFT_TYPES,
  DEFAULT_PATTERNS,
} from '../db';

describe('db - Dexie IndexedDB & Seeds', () => {
  beforeEach(async () => {
    await db.shiftTypes.clear();
    await db.patterns.clear();
    await db.activePatterns.clear();
    await db.exceptions.clear();
  });

  it('should seed default shift types when empty', async () => {
    await ensureDefaultShiftTypes();
    const count = await db.shiftTypes.count();
    expect(count).toBeGreaterThanOrEqual(DEFAULT_SHIFT_TYPES.length);

    const morning = await db.shiftTypes.get('st-morning');
    expect(morning).toBeDefined();
    expect(morning?.name).toBe('Sabah');
    expect(morning?.type).toBe('WORK');
    expect(morning?.startTime).toBe('06:30');
    expect(morning?.endTime).toBe('15:00');

    const vacation = await db.shiftTypes.get('st-vacation');
    expect(vacation).toBeDefined();
    expect(vacation?.systemCategory).toBe('VACATION');
  });

  it('should seed default team patterns and activate D1 by default', async () => {
    await ensureDefaultPatterns();
    const patternsCount = await db.patterns.count();
    expect(patternsCount).toBe(DEFAULT_PATTERNS.length);

    const activeList = await db.activePatterns.toArray();
    expect(activeList.length).toBe(1);
    expect(activeList[0].patternId).toBe('pattern-d1');
  });

  it('should accurately identify fixed and system shift types', () => {
    expect(isFixedShiftType({ id: 'st-morning', name: 'Sabah' })).toBe(true);
    expect(isFixedShiftType({ id: 'st-night', name: 'Gece' })).toBe(true);
    expect(isFixedShiftType({ id: 'st-custom', name: 'Özel Vardiya' })).toBe(false);

    const fixedInfo = getFixedShiftInfo({ id: 'st-afternoon', name: 'Öğle' });
    expect(fixedInfo?.fixedHours?.startTime).toBe('14:30');
    expect(fixedInfo?.fixedHours?.endTime).toBe('23:00');
  });
});
