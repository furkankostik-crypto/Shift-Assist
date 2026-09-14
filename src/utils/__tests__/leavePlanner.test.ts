import { describe, it, expect } from 'vitest';
import {
  getLeavePeriod,
  isSummerDate,
  isIntervalInSummer,
  isDayLeaveDeductible,
  adjustLeaveBoundaries,
  generateLeaveOpportunities,
  calculateCustomLeavePlan,
} from '../leavePlanner';
import { createTeamPattern, type ShiftPattern } from '../../db/db';

describe('leavePlanner - Annual Leave Optimization Engine', () => {
  describe('Leave Period Classification', () => {
    it('should classify January through May as WINTER_1', () => {
      expect(getLeavePeriod(new Date(2026, 0, 15))).toBe('WINTER_1'); // Jan
      expect(getLeavePeriod(new Date(2026, 2, 20))).toBe('WINTER_1'); // Mar
      expect(getLeavePeriod(new Date(2026, 4, 30))).toBe('WINTER_1'); // May
    });

    it('should classify June through August as SUMMER', () => {
      expect(getLeavePeriod(new Date(2026, 5, 1))).toBe('SUMMER'); // Jun
      expect(getLeavePeriod(new Date(2026, 6, 15))).toBe('SUMMER'); // Jul
      expect(getLeavePeriod(new Date(2026, 7, 31))).toBe('SUMMER'); // Aug
    });

    it('should classify September through December as WINTER_2', () => {
      expect(getLeavePeriod(new Date(2026, 8, 1))).toBe('WINTER_2'); // Sep
      expect(getLeavePeriod(new Date(2026, 10, 15))).toBe('WINTER_2'); // Nov
      expect(getLeavePeriod(new Date(2026, 11, 31))).toBe('WINTER_2'); // Dec
    });

    it('should accurately test isSummerDate and isIntervalInSummer', () => {
      expect(isSummerDate(new Date(2026, 6, 10))).toBe(true);
      expect(isSummerDate(new Date(2026, 3, 10))).toBe(false);

      expect(isIntervalInSummer(new Date(2026, 4, 28), new Date(2026, 5, 5))).toBe(true);
      expect(isIntervalInSummer(new Date(2026, 0, 1), new Date(2026, 1, 1))).toBe(false);
    });
  });

  describe('isDayLeaveDeductible (Turkish Labor Law Rules)', () => {
    it('should NOT deduct leave on official holidays', () => {
      const bayram = new Date(2026, 3, 23); // 23 Nisan
      expect(isDayLeaveDeductible(bayram)).toBe(false);
    });

    it('should NOT deduct leave on Sundays under any circumstance', () => {
      const sunday = new Date(2026, 0, 18); // Sunday
      expect(isDayLeaveDeductible(sunday)).toBe(false);
      // Even if scheduled as WORK in shift
      expect(isDayLeaveDeductible(sunday, { dayIndex: 1, type: 'WORK', name: 'Sabah', color: '#3b82f6' })).toBe(false);
    });

    it('should NOT deduct leave on shift REST (Off) days', () => {
      const regularTuesday = new Date(2026, 0, 13);
      expect(isDayLeaveDeductible(regularTuesday, { dayIndex: 3, type: 'REST', name: 'Off', color: '#10b981' })).toBe(false);
    });

    it('should deduct leave only on actual WORK days on non-Sunday / non-holiday', () => {
      const workday = new Date(2026, 0, 14); // Wednesday
      expect(isDayLeaveDeductible(workday, { dayIndex: 1, type: 'WORK', name: 'Sabah', color: '#3b82f6' })).toBe(true);
    });
  });

  describe('adjustLeaveBoundaries', () => {
    const pattern: ShiftPattern = {
      id: 'test-p',
      name: '2 Work 2 Off',
      cycleLength: 4,
      days: [
        { dayIndex: 1, type: 'WORK', name: 'W1', color: '#3b82f6' },
        { dayIndex: 2, type: 'WORK', name: 'W2', color: '#3b82f6' },
        { dayIndex: 3, type: 'REST', name: 'Off1', color: '#10b981' },
        { dayIndex: 4, type: 'REST', name: 'Off2', color: '#10b981' },
      ],
    };
    const startDate = '2026-01-12'; // Day 1 = 2026-01-12 (Mon, Work)

    it('should adjust formal start date forward if user picked an off or Sunday', () => {
      // 2026-01-14 is Day 3 (REST/Off)
      // 2026-01-15 is Day 4 (REST/Off)
      // 2026-01-16 is Day 1 (WORK)
      const inputStart = new Date(2026, 0, 14); // Off
      const inputEnd = new Date(2026, 0, 17);

      const { formalStart, adjusted } = adjustLeaveBoundaries(inputStart, inputEnd, pattern, startDate);
      expect(adjusted).toBe(true);
      expect(formalStart.getDate()).toBe(16); // adjusted to Friday (first work day)
    });

    it('should adjust formal end date backward if user picked an off or Sunday', () => {
      // 2026-01-12 (Mon - Work) to 2026-01-15 (Thu - Off)
      const inputStart = new Date(2026, 0, 12);
      const inputEnd = new Date(2026, 0, 15);

      const { formalEnd, adjusted } = adjustLeaveBoundaries(inputStart, inputEnd, pattern, startDate);
      expect(adjusted).toBe(true);
      expect(formalEnd.getDate()).toBe(13); // adjusted to Tuesday (last work day)
    });
  });

  describe('generateLeaveOpportunities', () => {
    it('should generate opportunities for D1 team pattern in 2026', () => {
      const d1Pattern = createTeamPattern('D1');
      const opportunities = generateLeaveOpportunities(d1Pattern, '2026-01-12', 2026);

      expect(opportunities.length).toBeGreaterThan(0);

      // Check summer opportunities: every summer opportunity MUST be 1 shift
      const summerOpps = opportunities.filter((o) => o.period === 'SUMMER');
      expect(summerOpps.length).toBeGreaterThan(0);
      for (const opp of summerOpps) {
        expect(opp.shiftCount).toBe(1);
      }

      // Check winter opportunities: should contain 2-shift combos
      const winter2ShiftOpps = opportunities.filter((o) => o.period !== 'SUMMER' && o.shiftCount === 2);
      expect(winter2ShiftOpps.length).toBeGreaterThan(0);

      // Check efficiency multiplier calculation: totalVacationDays / leaveDaysSpent
      for (const opp of opportunities) {
        expect(opp.totalVacationDays).toBeGreaterThanOrEqual(opp.leaveDaysSpent);
        expect(opp.efficiencyMultiplier).toBeGreaterThanOrEqual(1.0);
        expect(opp.breakdown.length).toBe(opp.totalVacationDays);
      }
    });
  });

  describe('calculateCustomLeavePlan', () => {
    const d1Pattern = createTeamPattern('D1');

    it('should flag warning if user attempts to start leave on official holiday', () => {
      // 2026-04-23 is 23 Nisan (Official holiday)
      const start = new Date(2026, 3, 23);
      const end = new Date(2026, 3, 27);

      const result = calculateCustomLeavePlan(d1Pattern, '2026-01-12', start, end);
      expect(result.isValid).toBe(false);
      expect(result.warningMessage).toContain('resmi tatil');
    });

    it('should warn when summer custom plan exceeds 1 shift', () => {
      // Range spanning 45 days in summer (more than 32-day cycle)
      const start = new Date(2026, 5, 1);
      const end = new Date(2026, 6, 15);

      const result = calculateCustomLeavePlan(d1Pattern, '2026-01-12', start, end);
      expect(result.summerWarning).toBeDefined();
      expect(result.summerWarning).toContain('Yaz sezonunda');
    });

    it('should correctly include preceding OFF days when starting on official holiday (D4 team case)', () => {
      const d4Pattern = createTeamPattern('D4');
      // User selected 29 Oct 2026 to 2 Nov 2026
      const start = new Date(2026, 9, 29);
      const end = new Date(2026, 10, 2);

      const result = calculateCustomLeavePlan(d4Pattern, '2026-01-12', start, end);

      expect(result.hasBoundaryAdjustment).toBe(true);
      expect(result.suggestedStartDateStr).toBe('2026-10-30');
      expect(result.suggestedEndDateStr).toBe('2026-11-02');
      // 27 & 28 Oct are OFF, 29 Oct is Republic Day, 30 Oct - 2 Nov leave, 3-5 Nov are OFF -> 10 days total!
      expect(result.vacationStartDateStr).toBe('2026-10-27');
      expect(result.vacationEndDateStr).toBe('2026-11-05');
      expect(result.totalVacationDays).toBe(10);
      expect(result.leaveDaysSpent).toBe(3); // 30 Oct, 31 Oct, 2 Nov
    });

    it('should keep full 10-day vacation span when user accepts suggested dates (30 Oct to 2 Nov)', () => {
      const d4Pattern = createTeamPattern('D4');
      // Formally adjusted: 30 Oct 2026 to 2 Nov 2026
      const start = new Date(2026, 9, 30);
      const end = new Date(2026, 10, 2);

      const result = calculateCustomLeavePlan(d4Pattern, '2026-01-12', start, end);

      expect(result.hasBoundaryAdjustment).toBe(false);
      expect(result.vacationStartDateStr).toBe('2026-10-27');
      expect(result.vacationEndDateStr).toBe('2026-11-05');
      expect(result.totalVacationDays).toBe(10);
      expect(result.leaveDaysSpent).toBe(3);
    });

    it('should handle leave starting on an OFF day and suggest the first work day', () => {
      const d4Pattern = createTeamPattern('D4');
      // User picked 27 Oct (which is an OFF day) to 2 Nov
      const start = new Date(2026, 9, 27);
      const end = new Date(2026, 10, 2);

      const result = calculateCustomLeavePlan(d4Pattern, '2026-01-12', start, end);

      expect(result.hasBoundaryAdjustment).toBe(true);
      expect(result.suggestedStartDateStr).toBe('2026-10-30');
      expect(result.vacationStartDateStr).toBe('2026-10-27');
      expect(result.vacationEndDateStr).toBe('2026-11-05');
      expect(result.totalVacationDays).toBe(10);
      expect(result.leaveDaysSpent).toBe(3);
    });
  });
});
