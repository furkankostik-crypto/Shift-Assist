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

  describe('isDayLeaveDeductible (Turkish Labor Law & HR Rules)', () => {
    it('should NOT deduct leave on official holidays', () => {
      const bayram = new Date(2026, 3, 23); // 23 Nisan
      expect(isDayLeaveDeductible(bayram)).toBe(false);
    });

    it('should NOT deduct leave on Sundays under any circumstance', () => {
      const sunday = new Date(2026, 0, 18); // Sunday
      expect(isDayLeaveDeductible(sunday)).toBe(false);
      expect(isDayLeaveDeductible(sunday, { dayIndex: 1, type: 'WORK', name: 'Sabah', color: '#3b82f6' })).toBe(false);
    });

    it('should deduct leave on any other day (both work days and shift off days in formal leave)', () => {
      const regularTuesday = new Date(2026, 0, 13);
      expect(isDayLeaveDeductible(regularTuesday, { dayIndex: 3, type: 'REST', name: 'Off', color: '#10b981' })).toBe(true);

      const regularSaturday = new Date(2026, 0, 17);
      expect(isDayLeaveDeductible(regularSaturday, { dayIndex: 4, type: 'REST', name: 'Off', color: '#10b981' })).toBe(true);

      const workday = new Date(2026, 0, 14); // Wednesday
      expect(isDayLeaveDeductible(workday, { dayIndex: 1, type: 'WORK', name: 'Sabah', color: '#3b82f6' })).toBe(true);
    });
  });

  describe('adjustLeaveBoundaries', () => {
    it('should adjust formal start date backward to Saturday when starting on Sunday', () => {
      const sundayStart = new Date(2026, 4, 10); // Sunday May 10, 2026
      const fridayEnd = new Date(2026, 4, 15); // Friday May 15, 2026

      const { formalStart, adjusted } = adjustLeaveBoundaries(sundayStart, fridayEnd);
      expect(adjusted).toBe(true);
      expect(formalStart.getDate()).toBe(9); // Saturday May 9
    });

    it('should adjust formal end date forward to Monday when ending on Sunday', () => {
      const tuesdayStart = new Date(2026, 4, 12); // Tuesday
      const sundayEnd = new Date(2026, 4, 17); // Sunday

      const { formalEnd, adjusted } = adjustLeaveBoundaries(tuesdayStart, sundayEnd);
      expect(adjusted).toBe(true);
      expect(formalEnd.getDate()).toBe(18); // Monday
    });

    it('should adjust formal start date backward when starting on an official holiday', () => {
      const holidayStart = new Date(2026, 3, 23); // Thursday April 23 (Official Holiday)
      const mondayEnd = new Date(2026, 3, 27);

      const { formalStart, adjusted } = adjustLeaveBoundaries(holidayStart, mondayEnd);
      expect(adjusted).toBe(true);
      expect(formalStart.getDate()).toBe(22); // Wednesday April 22
    });

    it('should adjust formal end date forward when ending on an official holiday', () => {
      const mondayStart = new Date(2026, 3, 20);
      const holidayEnd = new Date(2026, 3, 23); // 23 Nisan (Thursday)

      const { formalEnd, adjusted } = adjustLeaveBoundaries(mondayStart, holidayEnd);
      expect(adjusted).toBe(true);
      expect(formalEnd.getDate()).toBe(24); // Friday April 24
    });
  });

  describe("User's Exact Real-World Scenario", () => {
    /**
     * User's scenario:
     * - Friday (off), Saturday (off)
     * - Sunday is shift's first day (work)
     * - Monday to Friday (work, shift's last day is Friday)
     * - Following Saturday, Sunday, Monday are off
     *
     * Leave rule:
     * - Start date cannot be Sunday, must be extended backwards to Saturday.
     * - Saturday (off) consumes 1 day of quota.
     * - Sunday consumes 0 days.
     * - Mon-Fri (5 days) consumes 5 days.
     * - Total leave spent = 6 days!
     * - Preceding off: Friday (1 day)
     * - Leave period: Saturday to Friday (7 days)
     * - Succeeding off: Sat, Sun, Mon (3 days)
     * - Total vacation days = 11 days (uninterrupted).
     */
    it('should accurately calculate user scenario: 6 leave days spent for 11 continuous vacation days', () => {
      const userPattern: ShiftPattern = {
        id: 'user-test-pattern',
        name: 'Custom Shift Pattern',
        cycleLength: 14,
        days: [
          { dayIndex: 1, type: 'WORK', name: 'W0', color: '#3b82f6' },   // Thursday May 7
          { dayIndex: 2, type: 'REST', name: 'Off1', color: '#10b981' }, // Friday May 8
          { dayIndex: 3, type: 'REST', name: 'Off2', color: '#10b981' }, // Saturday May 9
          { dayIndex: 4, type: 'WORK', name: 'W1', color: '#3b82f6' },   // Sunday May 10 (shift start)
          { dayIndex: 5, type: 'WORK', name: 'W2', color: '#3b82f6' },   // Monday May 11
          { dayIndex: 6, type: 'WORK', name: 'W3', color: '#3b82f6' },   // Tuesday May 12
          { dayIndex: 7, type: 'WORK', name: 'W4', color: '#3b82f6' },   // Wednesday May 13
          { dayIndex: 8, type: 'WORK', name: 'W5', color: '#3b82f6' },   // Thursday May 14
          { dayIndex: 9, type: 'WORK', name: 'W6', color: '#3b82f6' },   // Friday May 15 (shift end)
          { dayIndex: 10, type: 'REST', name: 'Off3', color: '#10b981' },// Saturday May 16
          { dayIndex: 11, type: 'REST', name: 'Off4', color: '#10b981' },// Sunday May 17
          { dayIndex: 12, type: 'REST', name: 'Off5', color: '#10b981' },// Monday May 18
          { dayIndex: 13, type: 'WORK', name: 'W7', color: '#3b82f6' },  // Tuesday May 19
          { dayIndex: 14, type: 'WORK', name: 'W8', color: '#3b82f6' },  // Wednesday May 20
        ],
      };
      // Day 1 = Thursday 2026-05-07
      const patternStartDate = '2026-05-07';

      // The work shift is Sunday May 10 to Friday May 15
      const startShiftDate = new Date(2026, 4, 10); // Sunday
      const endShiftDate = new Date(2026, 4, 15);   // Friday

      const analysis = calculateCustomLeavePlan(userPattern, patternStartDate, startShiftDate, endShiftDate);

      // Boundary must be adjusted backward because Sunday is invalid start
      expect(analysis.hasBoundaryAdjustment).toBe(true);
      expect(analysis.suggestedStartDateStr).toBe('2026-05-09'); // Saturday
      expect(analysis.suggestedEndDateStr).toBe('2026-05-15'); // Friday

      // Connected vacation span includes preceding Friday (May 8) and succeeding off days (May 16, 17, 18)
      expect(analysis.vacationStartDateStr).toBe('2026-05-08'); // Friday
      expect(analysis.vacationEndDateStr).toBe('2026-05-18');   // Monday

      // Exactly 6 leave days consumed:
      // May 9 (Sat - off in leave): 1
      // May 10 (Sun - Sunday): 0
      // May 11 (Mon - work): 1
      // May 12 (Tue - work): 1
      // May 13 (Wed - work): 1
      // May 14 (Thu - work): 1
      // May 15 (Fri - work): 1
      expect(analysis.leaveDaysSpent).toBe(6);

      // 11 continuous vacation days (May 8 through May 18)
      expect(analysis.totalVacationDays).toBe(11);

      // When generated via opportunities engine
      const opps = generateLeaveOpportunities(userPattern, patternStartDate, 2026);
      const userOpp = opps.find((o) => o.shiftCount === 1 && o.vacationStartDateStr === '2026-05-08');
      expect(userOpp).toBeDefined();
      expect(userOpp!.formalStartDateStr).toBe('2026-05-09');
      expect(userOpp!.formalEndDateStr).toBe('2026-05-15');
      expect(userOpp!.leaveDaysSpent).toBe(6);
      expect(userOpp!.totalVacationDays).toBe(11);
    });
  });

  describe('2-Shift Extended Combo Rules', () => {
    it('should consume quota for gap off days (except Sunday) between two work blocks', () => {
      // Pattern: 4 Work, 2 Off (cycleLength: 6)
      const comboPattern: ShiftPattern = {
        id: 'combo-test-pattern',
        name: '4 Work 2 Off',
        cycleLength: 6,
        days: [
          { dayIndex: 1, type: 'WORK', name: 'W1', color: '#3b82f6' },
          { dayIndex: 2, type: 'WORK', name: 'W2', color: '#3b82f6' },
          { dayIndex: 3, type: 'WORK', name: 'W3', color: '#3b82f6' },
          { dayIndex: 4, type: 'WORK', name: 'W4', color: '#3b82f6' },
          { dayIndex: 5, type: 'REST', name: 'Off1', color: '#10b981' },
          { dayIndex: 6, type: 'REST', name: 'Off2', color: '#10b981' },
        ],
      };
      // 2026-01-12 is Monday (Day 1)
      const opps = generateLeaveOpportunities(comboPattern, '2026-01-12', 2026);
      const twoShiftOpps = opps.filter((o) => o.shiftCount === 2);
      expect(twoShiftOpps.length).toBeGreaterThan(0);

      // Specific combo: 2026-01-12 to 2026-01-21
      // Block 1 (Mon-Thu: 4 days) + Gap (Fri, Sat: 2 off days) + Block 2 (Sun-Wed: 4 days)
      // Fri & Sat are off days within formal leave -> they consume 2 days!
      // Sun consumes 0 days.
      // Total leave days spent = 4 + 2 + 3 = 9 days!
      const janCombo = twoShiftOpps.find((o) => o.formalStartDateStr === '2026-01-12');
      expect(janCombo).toBeDefined();
      expect(janCombo!.formalEndDateStr).toBe('2026-01-21');
      expect(janCombo!.leaveDaysSpent).toBe(9);
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

    it('should flag warning and adjust date if user attempts to start leave on official holiday', () => {
      // 2026-04-23 is 23 Nisan (Official holiday)
      const start = new Date(2026, 3, 23);
      const end = new Date(2026, 3, 27);

      const result = calculateCustomLeavePlan(d1Pattern, '2026-01-12', start, end);
      expect(result.isValid).toBe(false);
      expect(result.hasBoundaryAdjustment).toBe(true);
      expect(result.suggestedStartDateStr).toBe('2026-04-22');
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
  });
});
