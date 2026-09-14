import { describe, it, expect } from 'vitest';
import { getCurrentAnniversaryYear, calculateLeaveBalances } from '../leaveBalances';
import { type ShiftException } from '../../db/db';

describe('leaveBalances - Annual & Excuse Leave Balances', () => {
  describe('getCurrentAnniversaryYear', () => {
    it('should return null if employment start date is null or invalid', () => {
      expect(getCurrentAnniversaryYear(null)).toBeNull();
      expect(getCurrentAnniversaryYear('invalid-date')).toBeNull();
    });

    it('should calculate the current anniversary period properly', () => {
      const result = getCurrentAnniversaryYear('2020-06-15');
      expect(result).toBeDefined();
      expect(result?.start).toBeInstanceOf(Date);
      expect(result?.end).toBeInstanceOf(Date);
      expect(result?.start.getMonth()).toBe(5); // June
      expect(result?.start.getDate()).toBe(15);
      expect(result?.end.getTime()).toBeGreaterThan(result?.start.getTime() || 0);
    });
  });

  describe('calculateLeaveBalances', () => {
    it('should calculate balances for calendar year when no employment start date is given', () => {
      const thisYear = new Date().getFullYear();
      const exceptions: ShiftException[] = [
        // 2026-02-10 is a Tuesday (not Sunday, not holiday)
        { id: 'ex-1', date: `${thisYear}-02-10`, type: 'VACATION', name: 'Yıllık İzin', color: '#f59e0b' },
        { id: 'ex-2', date: `${thisYear}-02-11`, type: 'VACATION', name: 'Yıllık İzin', color: '#f59e0b' },
        { id: 'ex-3', date: `${thisYear}-02-12`, type: 'EXCUSE', name: 'Mazeret', color: '#06b6d4' },
      ];

      const balances = calculateLeaveBalances(exceptions, null, 14);
      expect(balances.hasEmploymentDate).toBe(false);
      expect(balances.usedVacation).toBe(2);
      expect(balances.remainingVacation).toBe(12);
      expect(balances.usedExcuse).toBe(1);
      expect(balances.remainingExcuse).toBe(6); // 7 - 1
    });

    it('should NOT deduct vacation quota for Sundays or Official Holidays', () => {
      const thisYear = new Date().getFullYear();
      // 2026-04-23 is Thursday (Ulusal Egemenlik Bayramı - Official Holiday)
      // 2026-02-15 is Sunday
      const exceptions: ShiftException[] = [
        { id: 'ex-sunday', date: `${thisYear}-02-15`, type: 'VACATION', name: 'Yıllık İzin', color: '#f59e0b' },
        { id: 'ex-holiday', date: `2026-04-23`, type: 'VACATION', name: 'Yıllık İzin', color: '#f59e0b' },
        { id: 'ex-workday', date: `2026-04-24`, type: 'VACATION', name: 'Yıllık İzin', color: '#f59e0b' },
      ];

      const balances = calculateLeaveBalances(exceptions, null, 14);
      // Only the work day should be counted, Sunday and 23 Nisan must NOT consume leave quota
      expect(balances.usedVacation).toBe(1);
      expect(balances.remainingVacation).toBe(13);
    });

    it('should respect fractional weights (e.g. 0.5 day leave)', () => {
      const thisYear = new Date().getFullYear();
      const exceptions: ShiftException[] = [
        { id: 'ex-half', date: `${thisYear}-02-10`, type: 'VACATION', name: 'Yarım Gün İzin', color: '#f59e0b', weight: 0.5 },
      ];

      const balances = calculateLeaveBalances(exceptions, null, 14);
      expect(balances.usedVacation).toBe(0.5);
      expect(balances.remainingVacation).toBe(13.5);
    });
  });
});
