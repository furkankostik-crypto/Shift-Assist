import { describe, it, expect } from 'vitest';
import { getShiftForDate } from '../shiftLogic';
import { createTeamPattern, type ShiftPattern } from '../../db/db';

describe('shiftLogic - getShiftForDate', () => {
  const samplePattern: ShiftPattern = {
    id: 'test-pattern-4d',
    name: '2 Gündüz 2 Off',
    cycleLength: 4,
    days: [
      { dayIndex: 1, type: 'WORK', name: 'Gündüz 1', color: '#3b82f6' },
      { dayIndex: 2, type: 'WORK', name: 'Gündüz 2', color: '#3b82f6' },
      { dayIndex: 3, type: 'REST', name: 'Off 1', color: '#10b981' },
      { dayIndex: 4, type: 'REST', name: 'Off 2', color: '#10b981' },
    ],
  };

  const patternStartDate = '2026-01-12'; // Pazartesi

  it('should return the first day on the exact pattern start date', () => {
    const targetDate = new Date(2026, 0, 12); // 2026-01-12
    const shift = getShiftForDate(targetDate, samplePattern, patternStartDate);
    expect(shift).toBeDefined();
    expect(shift?.dayIndex).toBe(1);
    expect(shift?.type).toBe('WORK');
    expect(shift?.name).toBe('Gündüz 1');
  });

  it('should return subsequent days correctly within the first cycle', () => {
    // Day 2
    const day2 = getShiftForDate(new Date(2026, 0, 13), samplePattern, patternStartDate);
    expect(day2?.dayIndex).toBe(2);
    expect(day2?.type).toBe('WORK');

    // Day 3 (Rest)
    const day3 = getShiftForDate(new Date(2026, 0, 14), samplePattern, patternStartDate);
    expect(day3?.dayIndex).toBe(3);
    expect(day3?.type).toBe('REST');

    // Day 4 (Rest)
    const day4 = getShiftForDate(new Date(2026, 0, 15), samplePattern, patternStartDate);
    expect(day4?.dayIndex).toBe(4);
    expect(day4?.type).toBe('REST');
  });

  it('should wrap around correctly after a full cycle (diffDays = 4)', () => {
    const nextCycleDay1 = getShiftForDate(new Date(2026, 0, 16), samplePattern, patternStartDate);
    expect(nextCycleDay1?.dayIndex).toBe(1);
    expect(nextCycleDay1?.name).toBe('Gündüz 1');
  });

  it('should handle dates prior to pattern start date using euclidean modulo', () => {
    // 1 day before start date (2026-01-11) -> should be day 4 (Off 2)
    const dayBefore = getShiftForDate(new Date(2026, 0, 11), samplePattern, patternStartDate);
    expect(dayBefore?.dayIndex).toBe(4);
    expect(dayBefore?.type).toBe('REST');

    // 4 days before start date (2026-01-08) -> exactly 1 cycle before -> day 1
    const oneCycleBefore = getShiftForDate(new Date(2026, 0, 8), samplePattern, patternStartDate);
    expect(oneCycleBefore?.dayIndex).toBe(1);
    expect(oneCycleBefore?.name).toBe('Gündüz 1');
  });

  it('should accurately calculate shifts for official 32-day HAT team patterns', () => {
    const d1Pattern = createTeamPattern('D1');
    expect(d1Pattern.cycleLength).toBe(32);
    expect(d1Pattern.days.length).toBe(32);

    // Day 1 of D1 pattern
    const day1 = getShiftForDate(new Date(2026, 0, 12), d1Pattern, patternStartDate);
    expect(day1).toBeDefined();
    expect(day1?.dayIndex).toBe(1);

    // 32 days later: 2026-02-13 should repeat day 1
    const day33 = getShiftForDate(new Date(2026, 1, 13), d1Pattern, patternStartDate);
    expect(day33?.dayIndex).toBe(1);
  });

  it('should return null gracefully for empty or invalid pattern', () => {
    const emptyPattern: ShiftPattern = {
      id: 'empty',
      name: 'Empty',
      cycleLength: 0,
      days: [],
    };
    const shift = getShiftForDate(new Date(2026, 0, 12), emptyPattern, patternStartDate);
    expect(shift).toBeNull();
  });
});
