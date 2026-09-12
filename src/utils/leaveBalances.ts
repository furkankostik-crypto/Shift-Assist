import { setYear, isBefore, isSunday } from 'date-fns';
import { type ShiftException } from '../db/db';
import { isOfficialHoliday } from './holidays';

export function getCurrentAnniversaryYear(employmentStartDateStr: string | null): { start: Date; end: Date } | null {
  if (!employmentStartDateStr) return null;
  const startObj = new Date(employmentStartDateStr);
  if (isNaN(startObj.getTime())) return null;

  const now = new Date();
  
  // Calculate this year's anniversary
  const anniversaryThisYear = setYear(startObj, now.getFullYear());
  
  let currentPeriodStart: Date;
  let currentPeriodEnd: Date;

  if (isBefore(now, anniversaryThisYear)) {
    // We haven't reached the anniversary this year yet
    currentPeriodStart = setYear(startObj, now.getFullYear() - 1);
    currentPeriodEnd = new Date(anniversaryThisYear.getTime() - 86400000); // minus 1 day
  } else {
    // We have passed the anniversary this year
    currentPeriodStart = anniversaryThisYear;
    currentPeriodEnd = new Date(setYear(startObj, now.getFullYear() + 1).getTime() - 86400000);
  }

  return { start: currentPeriodStart, end: currentPeriodEnd };
}

export function calculateLeaveBalances(
  exceptions: ShiftException[], 
  employmentStartDateStr: string | null,
  annualLeaveEntitlement: number
) {
  const period = getCurrentAnniversaryYear(employmentStartDateStr);
  
  let usedVacation = 0;
  let usedExcuse = 0;
  const EXCUSE_QUOTA = 7;

  if (!period) {
    // If no employment date, just calculate for the current calendar year.
    const now = new Date();
    const startObj = new Date(now.getFullYear(), 0, 1);
    const endObj = new Date(now.getFullYear(), 11, 31);
    
    exceptions.forEach(ex => {
      const exDate = new Date(ex.date);
      if (exDate >= startObj && exDate <= endObj) {
        if (ex.type === 'VACATION') {
          // Pazar günleri ve resmi tatiller kanunen yıllık izin hakkından düşülmez
          if (isSunday(exDate) || isOfficialHoliday(exDate)) return;
          usedVacation += (ex.weight || 1);
        }
        if (ex.type === 'EXCUSE') usedExcuse += (ex.weight || 1);
      }
    });

    return {
      usedVacation,
      usedExcuse,
      remainingVacation: annualLeaveEntitlement - usedVacation,
      remainingExcuse: EXCUSE_QUOTA - usedExcuse,
      periodStart: startObj,
      periodEnd: endObj,
      hasEmploymentDate: false,
    };
  }

  exceptions.forEach(ex => {
    const exDate = new Date(ex.date);
    if (exDate >= period.start && exDate <= period.end) {
      if (ex.type === 'VACATION') {
        // Pazar günleri ve resmi tatiller kanunen yıllık izin hakkından düşülmez
        if (isSunday(exDate) || isOfficialHoliday(exDate)) return;
        usedVacation += (ex.weight || 1);
      }
      if (ex.type === 'EXCUSE') usedExcuse += (ex.weight || 1);
    }
  });

  return {
    usedVacation,
    usedExcuse,
    remainingVacation: annualLeaveEntitlement - usedVacation,
    remainingExcuse: EXCUSE_QUOTA - usedExcuse,
    periodStart: period.start,
    periodEnd: period.end,
    hasEmploymentDate: true,
  };
}
