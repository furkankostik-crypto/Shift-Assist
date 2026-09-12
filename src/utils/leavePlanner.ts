import {
  format,
  addDays,
  subDays,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  isSunday,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { db, type ShiftPattern, type ShiftDay, type ShiftException } from '../db/db';
import { getShiftForDate } from './shiftLogic';
import { getHolidayDetail, formatToFullDateFast, type HolidayDetail } from './holidays';

export type LeavePeriod = 'WINTER_1' | 'SUMMER' | 'WINTER_2';

export interface LeavePeriodInfo {
  key: LeavePeriod;
  title: string;
  shortTitle: string;
  monthsRange: string;
  shiftRule: string;
  allowedShifts: (1 | 2)[];
  icon: string;
}

export const LEAVE_PERIODS_INFO: Record<LeavePeriod, LeavePeriodInfo> = {
  WINTER_1: {
    key: 'WINTER_1',
    title: '1. Kış İzni',
    shortTitle: '1. Kış',
    monthsRange: 'Ocak - Mayıs',
    shiftRule: '1 veya 2 Shift (10 - 19 Gün)',
    allowedShifts: [1, 2],
    icon: '❄️',
  },
  SUMMER: {
    key: 'SUMMER',
    title: 'Yaz İzni',
    shortTitle: 'Yaz',
    monthsRange: 'Haziran - Ağustos',
    shiftRule: '1 Shift (10 Gün)',
    allowedShifts: [1],
    icon: '☀️',
  },
  WINTER_2: {
    key: 'WINTER_2',
    title: '2. Kış İzni',
    shortTitle: '2. Kış',
    monthsRange: 'Eylül - Aralık',
    shiftRule: '1 veya 2 Shift (10 - 19 Gün)',
    allowedShifts: [1, 2],
    icon: '❄️',
  },
};

export interface DayBreakdown {
  date: Date;
  dateStr: string;
  dayOfWeek: number; // 0: Sunday, 1: Monday, ..., 6: Saturday
  isSunday: boolean;
  holidayDetail: HolidayDetail | null;
  isOfficialHoliday: boolean;
  shiftDay: ShiftDay | null;
  isShiftWork: boolean;
  isShiftRest: boolean;
  isLeaveDeductible: boolean; // Does this day consume annual leave?
  dayRole: 'LEAVE' | 'SHIFT_OFF' | 'OFFICIAL_HOLIDAY' | 'SUNDAY_OFF' | 'WEEKEND_OFF';
}

export interface LeaveOpportunity {
  id: string;
  title: string;
  category: 'HOLIDAY_BRIDGE' | 'SHIFT_BLOCK' | 'EXTENDED_COMBO';
  period: LeavePeriod; // WINTER_1 | SUMMER | WINTER_2
  shiftCount: 1 | 2; // 1 shift (1 blok) or 2 shifts (2 blok)
  isSummerSeason: boolean; // June, July, August
  isPriority: boolean; // True for non-summer 2-shift and summer 1-shift opportunities
  seasonTag: string; // e.g. "❄️ 1. Kış İzni (2 Shift)", "☀️ Yaz İzni (1 Shift)", "❄️ 2. Kış İzni"
  // Formal leave dates (Resmi dilekçeye / sisteme yazılan başlangıç ve bitiş)
  formalStartDate: Date;
  formalEndDate: Date;
  formalStartDateStr: string;
  formalEndDateStr: string;
  // Actual uninterrupted vacation dates (Öncesi ve sonrası offlar ile kesintisiz tatil süresi)
  vacationStartDate: Date;
  vacationEndDate: Date;
  vacationStartDateStr: string;
  vacationEndDateStr: string;
  // Stats
  leaveDaysSpent: number; // Harcanan senelik izin günü
  totalVacationDays: number; // Kazanılan kesintisiz tatil günü
  efficiencyMultiplier: number; // totalVacationDays / leaveDaysSpent
  savedFreeDays: number; // İzin hakkından düşmeyen toplam gün sayısı (Off + Bayram + Pazar)
  holidayNames: string[];
  breakdown: DayBreakdown[];
  isAppliedToCalendar?: boolean;
}

export interface CustomLeaveAnalysis {
  isValid: boolean;
  period: LeavePeriod;
  periodMismatch?: boolean;
  periodInfoMessage?: string;
  warningMessage?: string;
  summerWarning?: string;
  shiftCount: number;
  formalStartDate: Date;
  formalEndDate: Date;
  formalStartDateStr: string;
  formalEndDateStr: string;
  suggestedStartDate?: Date;
  suggestedEndDate?: Date;
  vacationStartDate: Date;
  vacationEndDate: Date;
  vacationStartDateStr: string;
  vacationEndDateStr: string;
  leaveDaysSpent: number;
  totalVacationDays: number;
  efficiencyMultiplier: number;
  breakdown: DayBreakdown[];
}

/**
 * Returns which leave period a date belongs to:
 * - Jan to May (0-4): WINTER_1 (1. Kış İzni)
 * - Jun to Aug (5-7): SUMMER (Yaz İzni)
 * - Sep to Dec (8-11): WINTER_2 (2. Kış İzni)
 */
export function getLeavePeriod(date: Date): LeavePeriod {
  const m = date.getMonth();
  if (m <= 4) return 'WINTER_1';
  if (m <= 7) return 'SUMMER';
  return 'WINTER_2';
}

/**
 * Checks if a date falls in summer months (June = 5, July = 6, August = 7 in 0-indexed JS)
 */
export function isSummerDate(date: Date): boolean {
  const m = date.getMonth();
  return m === 5 || m === 6 || m === 7;
}

/**
 * Checks if a date interval touches summer months
 */
export function isIntervalInSummer(start: Date, end: Date): boolean {
  return isSummerDate(start) || isSummerDate(end);
}

/**
 * Checks if a specific day is an official holiday (religious or national official day)
 */
export function isOfficialHoliday(date: Date): boolean {
  const detail = getHolidayDetail(date);
  return Boolean(detail && detail.isOfficial);
}

/**
 * Checks if a specific day is a valid start or end date for formal annual leave.
 * RULE: Annual leave CANNOT start or end on an Off day (REST shift, or Official Holiday).
 */
export function isValidLeaveBoundary(
  date: Date,
  pattern?: ShiftPattern | null,
  patternStartDate?: string
): boolean {
  if (isOfficialHoliday(date)) return false;
  if (isSunday(date)) return false;
  if (pattern && patternStartDate) {
    const shift = getShiftForDate(date, pattern, patternStartDate);
    if (shift && shift.type === 'REST') return false;
    return true;
  }
  return true;
}

/**
 * Determines whether taking leave on this day consumes 1 day of annual leave quota.
 * RULE (Turkish Labor Law & HR Regulations):
 * 1. Official holidays (religious, national, eve days) do NOT consume leave quota.
 * 2. Sundays (weekly rest day / hafta tatili) do NOT consume leave quota under ANY circumstance (even if a work shift is scheduled).
 * 3. In shift patterns: REST (Off) shifts do NOT consume leave quota.
 * 4. Only actual work days/shifts (excluding Sundays, official holidays, and off days) consume leave quota.
 */
export function isDayLeaveDeductible(date: Date, shiftDay?: ShiftDay | null): boolean {
  // Resmi tatiller (bayramlar, arife günleri) izin hakkından düşülmez
  if (isOfficialHoliday(date)) return false;
  // Pazar günleri (hafta tatili) izin hakkından düşülmez
  if (isSunday(date)) return false;
  // Vardiya planında dinlenme (Off) günleri izin hakkından düşülmez
  if (shiftDay) {
    return shiftDay.type === 'WORK';
  }
  return true;
}

/**
 * Classifies a single day within a vacation period.
 */
export function analyzeDay(
  date: Date,
  pattern: ShiftPattern | null,
  patternStartDate: string,
  isWithinFormalLeave: boolean = false
): DayBreakdown {
  const dateStr = formatToFullDateFast(date);
  const sunday = isSunday(date);
  const holiday = getHolidayDetail(date);
  const officialHol = Boolean(holiday && holiday.isOfficial);
  const shift = pattern ? getShiftForDate(date, pattern, patternStartDate) : null;
  const isWork = shift ? shift.type === 'WORK' : (!sunday && !officialHol);
  const isRest = shift ? shift.type === 'REST' : (sunday || officialHol);

  let role: DayBreakdown['dayRole'] = 'SHIFT_OFF';
  let deductible = false;

  // 1. Resmi Tatil (Resmi bayram ve arife günleri harcanan izinden eksilmez)
  if (officialHol) {
    role = 'OFFICIAL_HOLIDAY';
    deductible = false;
  }
  // 2. Pazar Günü (Hafta tatili, vardiyada çalışma olsa dahi kanunen harcanan izinden eksilmez)
  else if (sunday) {
    role = 'SUNDAY_OFF';
    deductible = false;
  }
  // 3. Vardiya Off (İstirahat günü, izinden eksilmez)
  else if (isRest) {
    role = 'SHIFT_OFF';
    deductible = false;
  }
  // 4. İzin Aralığındaki Çalışma Günleri (İzin hakkından düşen gerçek çalışma günleri)
  else if (isWithinFormalLeave) {
    if (isWork) {
      role = 'LEAVE';
      deductible = true;
    } else {
      role = 'SHIFT_OFF';
      deductible = false;
    }
  }
  // 5. İzin Dışındaki Normal Günler
  else {
    role = isWork ? 'LEAVE' : 'SHIFT_OFF';
    deductible = false;
  }

  return {
    date,
    dateStr,
    dayOfWeek: date.getDay(),
    isSunday: sunday,
    holidayDetail: holiday,
    isOfficialHoliday: officialHol,
    shiftDay: shift,
    isShiftWork: isWork,
    isShiftRest: isRest,
    isLeaveDeductible: deductible,
    dayRole: role,
  };
}

/**
 * Adjusts formal start and end dates according to Turkish labor law & shift rules:
 * - RULE 1: Annual leave CANNOT start on an Off day (REST shift, Sunday, or Official Holiday).
 *   If the selected start date is already an off day, formal leave starts on the first actual work day.
 * - RULE 2: Annual leave CANNOT end on an Off day (REST shift, Sunday, or Official Holiday).
 *   If the selected end date is already an off day, formal leave ends on the last actual work day.
 */
export function adjustLeaveBoundaries(
  startDate: Date,
  endDate: Date,
  pattern: ShiftPattern | null,
  patternStartDate: string
): { formalStart: Date; formalEnd: Date; adjusted: boolean } {
  let formalStart = new Date(startDate);
  let formalEnd = new Date(endDate);
  let adjusted = false;

  // 1. Adjust Start Date:
  // Eğer başlangıç günü zaten off/tatil/Pazar ise, resmi izin ilk fiili çalışma gününden başlar.
  while (formalStart <= formalEnd) {
    const shift = pattern ? getShiftForDate(formalStart, pattern, patternStartDate) : null;
    const sunday = isSunday(formalStart);
    const holiday = isOfficialHoliday(formalStart);
    const isOff = sunday || holiday || (shift ? shift.type === 'REST' : false);

    if (isOff) {
      formalStart = addDays(formalStart, 1);
      adjusted = true;
    } else {
      break;
    }
  }

  // 2. Adjust End Date:
  // Eğer bitiş günü zaten off/tatil/Pazar ise, resmi izin son fiili çalışma gününde biter.
  while (formalEnd >= formalStart) {
    const shift = pattern ? getShiftForDate(formalEnd, pattern, patternStartDate) : null;
    const sunday = isSunday(formalEnd);
    const holiday = isOfficialHoliday(formalEnd);
    const isOff = sunday || holiday || (shift ? shift.type === 'REST' : false);

    if (isOff) {
      formalEnd = subDays(formalEnd, 1);
      adjusted = true;
    } else {
      break;
    }
  }

  return { formalStart, formalEnd, adjusted };
}

/**
 * Finds all contiguous off days immediately preceding a given date
 */
export function findPrecedingOffDays(
  firstWorkDate: Date,
  pattern: ShiftPattern,
  patternStartDate: string,
  maxLookback: number = 14
): Date[] {
  const offDays: Date[] = [];
  let curr = subDays(firstWorkDate, 1);

  for (let i = 0; i < maxLookback; i++) {
    const shift = getShiftForDate(curr, pattern, patternStartDate);
    const sunday = isSunday(curr);
    const holiday = isOfficialHoliday(curr);
    // Kesin kural: Vardiya planında WORK olan gün ASLA tatil/off sayılmaz.
    const isOff = shift ? shift.type === 'REST' : (sunday || holiday);

    if (isOff) {
      offDays.unshift(new Date(curr));
      curr = subDays(curr, 1);
    } else {
      break;
    }
  }
  return offDays;
}

/**
 * Finds all contiguous off days immediately following a given date
 */
export function findSucceedingOffDays(
  lastWorkDate: Date,
  pattern: ShiftPattern,
  patternStartDate: string,
  maxLookforward: number = 14
): Date[] {
  const offDays: Date[] = [];
  let curr = addDays(lastWorkDate, 1);

  for (let i = 0; i < maxLookforward; i++) {
    const shift = getShiftForDate(curr, pattern, patternStartDate);
    const sunday = isSunday(curr);
    const holiday = isOfficialHoliday(curr);
    // Kesin kural: Vardiya planında WORK olan gün ASLA tatil/off sayılmaz.
    const isOff = shift ? shift.type === 'REST' : (sunday || holiday);

    if (isOff) {
      offDays.push(new Date(curr));
      curr = addDays(curr, 1);
    } else {
      break;
    }
  }
  return offDays;
}

/**
 * Generates all optimized annual leave opportunities for a given shift pattern and year,
 * respecting the 3-part annual leave system:
 * 1. 1. Kış İzni (Ocak - Mayıs): 1 veya 2 shift kullanılabilir.
 * 2. Yaz İzni (Haziran - Ağustos): KESİNLİKLE yalnızca 1 shift kullanılabilir.
 * 3. 2. Kış İzni (Eylül - Aralık): 1 veya 2 shift kullanılabilir.
 */
export function generateLeaveOpportunities(
  pattern: ShiftPattern,
  patternStartDate: string,
  year: number,
  existingExceptions: ShiftException[] = []
): LeaveOpportunity[] {
  if (!pattern || !pattern.days || pattern.days.length === 0) return [];

  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 11, 31));
  const allDaysInYear = eachDayOfInterval({ start: yearStart, end: yearEnd });

  // Map of existing vacation exceptions
  const vacationMap = new Set<string>();
  for (const ex of existingExceptions) {
    if (ex.type === 'VACATION') {
      vacationMap.add(ex.date);
    }
  }

  // 1. Identify all consecutive WORK blocks in the year
  interface WorkBlock {
    startDate: Date;
    endDate: Date;
    days: Date[];
    length: number;
  }

  const workBlocks: WorkBlock[] = [];
  let currentBlock: Date[] = [];

  for (const day of allDaysInYear) {
    const shift = getShiftForDate(day, pattern, patternStartDate);
    if (shift && shift.type === 'WORK') {
      currentBlock.push(day);
    } else {
      if (currentBlock.length > 0) {
        workBlocks.push({
          startDate: currentBlock[0],
          endDate: currentBlock[currentBlock.length - 1],
          days: [...currentBlock],
          length: currentBlock.length,
        });
        currentBlock = [];
      }
    }
  }
  if (currentBlock.length > 0) {
    workBlocks.push({
      startDate: currentBlock[0],
      endDate: currentBlock[currentBlock.length - 1],
      days: [...currentBlock],
      length: currentBlock.length,
    });
  }

  const opportunities: LeaveOpportunity[] = [];
  const processedKeys = new Set<string>();

  // Helper to build and register an opportunity
  const registerOpportunity = (
    formalStart: Date,
    formalEnd: Date,
    title: string,
    category: LeaveOpportunity['category'],
    shiftCount: 1 | 2,
    period: LeavePeriod,
    isSummerSeason: boolean,
    isPriority: boolean,
    seasonTag: string
  ) => {
    // Boundary enforcement
    const { formalStart: validStart, formalEnd: validEnd } = adjustLeaveBoundaries(
      formalStart,
      formalEnd,
      pattern,
      patternStartDate
    );

    if (validStart > validEnd) return;

    const key = `${formatToFullDateFast(validStart)}_${formatToFullDateFast(validEnd)}`;
    if (processedKeys.has(key)) return;

    // Find preceding and succeeding connected off days
    const precedingOffs = findPrecedingOffDays(validStart, pattern, patternStartDate);
    const succeedingOffs = findSucceedingOffDays(validEnd, pattern, patternStartDate);

    const vacationStart = precedingOffs.length > 0 ? precedingOffs[0] : validStart;
    const vacationEnd = succeedingOffs.length > 0 ? succeedingOffs[succeedingOffs.length - 1] : validEnd;

    // Analyze every day in full vacation span
    const vacationDaysInterval = eachDayOfInterval({ start: vacationStart, end: vacationEnd });
    const breakdown: DayBreakdown[] = [];
    let leaveDaysSpent = 0;
    const holidayNamesSet = new Set<string>();

    for (const day of vacationDaysInterval) {
      const isWithinFormalLeave = day >= validStart && day <= validEnd;
      const bDay = analyzeDay(day, pattern, patternStartDate, isWithinFormalLeave);

      if (isWithinFormalLeave && bDay.isLeaveDeductible) {
        leaveDaysSpent++;
      }

      if (bDay.holidayDetail) {
        holidayNamesSet.add(bDay.holidayDetail.name);
      }

      breakdown.push(bDay);
    }

    if (leaveDaysSpent === 0) return;

    const totalVacationDays = vacationDaysInterval.length;
    const efficiencyMultiplier = Number((totalVacationDays / leaveDaysSpent).toFixed(1));
    const savedFreeDays = totalVacationDays - leaveDaysSpent;

    // Check if fully applied in calendar exceptions
    const isAppliedToCalendar = breakdown
      .filter((d) => d.dayRole === 'LEAVE')
      .every((d) => vacationMap.has(d.dateStr));

    opportunities.push({
      id: `opp_${key}`,
      title,
      category,
      period,
      shiftCount,
      isSummerSeason,
      isPriority,
      seasonTag,
      formalStartDate: validStart,
      formalEndDate: validEnd,
      formalStartDateStr: formatToFullDateFast(validStart),
      formalEndDateStr: formatToFullDateFast(validEnd),
      vacationStartDate: vacationStart,
      vacationEndDate: vacationEnd,
      vacationStartDateStr: formatToFullDateFast(vacationStart),
      vacationEndDateStr: formatToFullDateFast(vacationEnd),
      leaveDaysSpent,
      totalVacationDays,
      efficiencyMultiplier,
      savedFreeDays,
      holidayNames: Array.from(holidayNamesSet),
      breakdown,
      isAppliedToCalendar,
    });

    processedKeys.add(key);
  };

  // 2. Scenario A: Single Shift Block Leaves (1 Shift) for all 3 periods
  for (const block of workBlocks) {
    const blockMonth = format(block.startDate, 'MMMM', { locale: tr });
    const period = getLeavePeriod(block.startDate);

    if (period === 'SUMMER') {
      // In summer (Jun, Jul, Aug): strictly 1 shift
      const title = `☀️ Yaz İzni • ${blockMonth} (1 Shift)`;
      registerOpportunity(
        block.startDate,
        block.endDate,
        title,
        'SHIFT_BLOCK',
        1,
        'SUMMER',
        true,
        true,
        '☀️ Yaz İzni (1 Shift)'
      );
    } else if (period === 'WINTER_1') {
      // In Winter 1 (Jan-May): 1 shift alternative
      const title = `❄️ 1. Kış İzni • ${blockMonth} (1 Shift)`;
      registerOpportunity(
        block.startDate,
        block.endDate,
        title,
        'SHIFT_BLOCK',
        1,
        'WINTER_1',
        false,
        false,
        '❄️ 1. Kış İzni (1 Shift)'
      );
    } else {
      // In Winter 2 (Sep-Dec): 1 shift alternative
      const title = `❄️ 2. Kış İzni • ${blockMonth} (1 Shift)`;
      registerOpportunity(
        block.startDate,
        block.endDate,
        title,
        'SHIFT_BLOCK',
        1,
        'WINTER_2',
        false,
        false,
        '❄️ 2. Kış İzni (1 Shift)'
      );
    }
  }

  // 3. Scenario B: Holiday Bridges (1 Shift) categorized into their respective periods
  for (const day of allDaysInYear) {
    const holiday = getHolidayDetail(day);
    if (!holiday || !holiday.isOfficial) continue;

    const windowStart = subDays(day, 5);
    const windowEnd = addDays(day, 5);

    const relevantBlocks = workBlocks.filter(
      (b) => b.startDate <= windowEnd && b.endDate >= windowStart
    );

    for (const b of relevantBlocks) {
      const period = getLeavePeriod(b.startDate);
      const isSummer = period === 'SUMMER';
      const periodShort = LEAVE_PERIODS_INFO[period].shortTitle;
      const title = isSummer
        ? `☀️ ${holiday.name} Yaz Köprüsü`
        : `🕌 ${holiday.name} • ${periodShort} Köprüsü`;
      registerOpportunity(
        b.startDate,
        b.endDate,
        title,
        'HOLIDAY_BRIDGE',
        1,
        period,
        isSummer,
        true,
        isSummer ? '☀️ Yaz Bayram Köprüsü' : `🕌 ${periodShort} Bayram Köprüsü`
      );
    }
  }

  // 4. Scenario C: Extended 2-Shift Combos (2 Ardışık Vardiya Bloğu)
  // RULE: Allowed ONLY in 1. Kış İzni (Ocak-Mayıs) and 2. Kış İzni (Eylül-Aralık).
  // Strictly prohibited in Yaz İzni (Haziran-Ağustos) and prohibited across period boundaries!
  for (let i = 0; i < workBlocks.length - 1; i++) {
    const b1 = workBlocks[i];
    const b2 = workBlocks[i + 1];

    const p1 = getLeavePeriod(b1.startDate);
    const p2 = getLeavePeriod(b2.endDate);

    // If either block touches summer or if it spans across two different periods, skip!
    if (p1 === 'SUMMER' || p2 === 'SUMMER' || p1 !== p2) {
      continue;
    }

    const gapDays = Math.round((b2.startDate.getTime() - b1.endDate.getTime()) / 86400000) - 1;

    // Standard off gap between two blocks
    if (gapDays >= 1 && gapDays <= 5) {
      const formalStart = b1.startDate;
      const formalEnd = b2.endDate;
      const periodName = LEAVE_PERIODS_INFO[p1].title;
      const title = `⭐ ${periodName} • 2 Shift Öncelikli (${format(b1.startDate, 'MMMM', { locale: tr })})`;
      registerOpportunity(
        formalStart,
        formalEnd,
        title,
        'EXTENDED_COMBO',
        2,
        p1,
        false,
        true, // Priority in winter months
        `⭐ ${periodName} (2 Shift)`
      );
    }
  }

  // Sorting & Prioritization:
  // 1. High-priority opportunities (non-summer 2-shifts & summer 1-shifts & bridges) first
  // 2. Efficiency multiplier descending
  // 3. Total vacation days descending
  // 4. Chronological order
  return opportunities.sort((a, b) => {
    if (a.isPriority !== b.isPriority) {
      return a.isPriority ? -1 : 1;
    }
    if (b.efficiencyMultiplier !== a.efficiencyMultiplier) {
      return b.efficiencyMultiplier - a.efficiencyMultiplier;
    }
    if (b.totalVacationDays !== a.totalVacationDays) {
      return b.totalVacationDays - a.totalVacationDays;
    }
    return a.formalStartDate.getTime() - b.formalStartDate.getTime();
  });
}

/**
 * Calculates leave metrics for custom user-selected dates with rule validation
 */
export function calculateCustomLeavePlan(
  pattern: ShiftPattern | null,
  patternStartDate: string,
  startDate: Date,
  endDate: Date
): CustomLeaveAnalysis {
  let warningMessage: string | undefined;
  let summerWarning: string | undefined;
  let periodInfoMessage: string | undefined;
  let suggestedStartDate: Date | undefined;
  let suggestedEndDate: Date | undefined;

  let isValid = true;

  const startShift = pattern ? getShiftForDate(startDate, pattern, patternStartDate) : null;
  const isStartSunday = isSunday(startDate);
  const isStartRest = isStartSunday || (startShift ? startShift.type === 'REST' : false);

  if (isOfficialHoliday(startDate)) {
    isValid = false;
    const hol = getHolidayDetail(startDate);
    const holName = hol?.name || 'Resmi Tatil';
    warningMessage = `Senelik izin resmi tatil gününde (${holName}) başlatılamaz. İzin tatil sonrası ilk iş gününden başlatılmalıdır.`;
  } else if (isStartRest) {
    isValid = false;
    if (isStartSunday) {
      warningMessage = 'Senelik izin Pazar günü başlatılamaz. Pazar günü hafta tatili olduğundan izin ilk iş gününüz olan Pazartesi gününden başlatılmalıdır.';
    } else {
      warningMessage = 'Senelik izin vardiya off (istirahat) gününde başlatılamaz. İzin ilk iş gününüzden başlatılmalıdır.';
    }
  }

  const endShift = pattern ? getShiftForDate(endDate, pattern, patternStartDate) : null;
  const isEndSunday = isSunday(endDate);
  const isEndRest = isEndSunday || (endShift ? endShift.type === 'REST' : false);

  if (isOfficialHoliday(endDate)) {
    isValid = false;
    const hol = getHolidayDetail(endDate);
    const holName = hol?.name || 'Resmi Tatil';
    const extraMsg = `Senelik izin resmi tatil gününde (${holName}) bitirilemez. İzin tatil öncesi son iş gününde bitirilmelidir.`;
    warningMessage = warningMessage ? `${warningMessage} Ayrıca ${extraMsg}` : extraMsg;
  } else if (isEndRest) {
    isValid = false;
    const extraMsg = isEndSunday
      ? 'Senelik izin Pazar günü bitirilemez. Pazar günü hafta tatili olduğundan izin son fiili iş gününüzde bitirilmelidir.'
      : 'Senelik izin vardiya off (istirahat) gününde bitirilemez. İzin son fiili çalışma gününde bitirilmelidir.';
    warningMessage = warningMessage ? `${warningMessage} Ayrıca ${extraMsg}` : extraMsg;
  }

  const { formalStart: validStart, formalEnd: validEnd, adjusted } = adjustLeaveBoundaries(
    startDate,
    endDate,
    pattern,
    patternStartDate
  );

  if (adjusted) {
    suggestedStartDate = validStart;
    suggestedEndDate = validEnd;
  }

  // Vacation span (kesintisiz tatil aralığı: öncesi ve sonrası off günleri)
  const precedingOffs = pattern
    ? findPrecedingOffDays(validStart, pattern, patternStartDate)
    : [];
  const succeedingOffs = pattern
    ? findSucceedingOffDays(validEnd, pattern, patternStartDate)
    : [];

  const vacationStart = precedingOffs.length > 0 ? precedingOffs[0] : validStart;
  const vacationEnd = succeedingOffs.length > 0 ? succeedingOffs[succeedingOffs.length - 1] : validEnd;

  const vacationDaysInterval = eachDayOfInterval({ start: vacationStart, end: vacationEnd });
  const breakdown: DayBreakdown[] = [];
  let leaveDaysSpent = 0;

  for (const day of vacationDaysInterval) {
    const isWithinSelectedRange = day >= startDate && day <= endDate;
    const bDay = analyzeDay(day, pattern, patternStartDate, isWithinSelectedRange);

    if (isWithinSelectedRange && bDay.isLeaveDeductible) {
      leaveDaysSpent++;
    }
    breakdown.push(bDay);
  }

  const totalVacationDays = vacationDaysInterval.length;
  const efficiencyMultiplier =
    leaveDaysSpent > 0 ? Number((totalVacationDays / leaveDaysSpent).toFixed(1)) : totalVacationDays;

  // Approximate shift blocks count in selected range
  let shiftCount = 1;
  if (pattern && pattern.cycleLength > 0) {
    const totalSelectedDays = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
    if (totalSelectedDays > pattern.cycleLength) {
      shiftCount = Math.round(totalSelectedDays / pattern.cycleLength) + 1;
    }
  }

  const startPeriod = getLeavePeriod(startDate);
  const endPeriod = getLeavePeriod(endDate);
  const periodMismatch = startPeriod !== endPeriod;

  if (periodMismatch) {
    periodInfoMessage = `Seçtiğiniz tarih aralığı hem ${LEAVE_PERIODS_INFO[startPeriod].title} hem de ${LEAVE_PERIODS_INFO[endPeriod].title} dönemlerini kapsamaktadır. İzinlerinizi her dönem için ayrı planlamanız tavsiye edilir.`;
  } else {
    if (startPeriod === 'SUMMER') {
      periodInfoMessage = 'Yaz İzni Dönemi (Haziran - Ağustos): Şirket kuralı gereği sadece 1 shift izin kullanılabilir.';
    } else {
      periodInfoMessage = `${LEAVE_PERIODS_INFO[startPeriod].title} Dönemi (${LEAVE_PERIODS_INFO[startPeriod].monthsRange}): 1 veya 2 shift olarak kullanılabilir.`;
    }
  }

  if ((startPeriod === 'SUMMER' || endPeriod === 'SUMMER') && shiftCount >= 2) {
    summerWarning =
      'Yaz sezonunda (Haziran, Temmuz, Ağustos) şirket kuralı gereği yalnızca 1 shift izin kullanılabilir. Seçtiğiniz aralık 2 veya daha fazla shift içermektedir.';
  }

  return {
    isValid,
    period: startPeriod,
    periodMismatch,
    periodInfoMessage,
    warningMessage,
    summerWarning,
    shiftCount,
    formalStartDate: startDate,
    formalEndDate: endDate,
    formalStartDateStr: formatToFullDateFast(startDate),
    formalEndDateStr: formatToFullDateFast(endDate),
    suggestedStartDate,
    suggestedEndDate,
    vacationStartDate: vacationStart,
    vacationEndDate: vacationEnd,
    vacationStartDateStr: formatToFullDateFast(vacationStart),
    vacationEndDateStr: formatToFullDateFast(vacationEnd),
    leaveDaysSpent,
    totalVacationDays,
    efficiencyMultiplier,
    breakdown,
  };
}

/**
 * Writes the annual leave days into Dexie db.exceptions as VACATION
 */
export async function applyLeaveOpportunityToCalendar(
  opportunity: LeaveOpportunity
): Promise<void> {
  const leaveDays = opportunity.breakdown.filter((d) => d.dayRole === 'LEAVE');

  const shiftTypes = await db.shiftTypes.toArray();
  const vacationSt = shiftTypes.find(
    (st) => st.systemCategory === 'VACATION' || st.id === 'st-vacation' || st.id === 'st-leave'
  );
  const exColor = vacationSt?.color || '#f59e0b';
  const exName = vacationSt?.name || 'Yıllık İzin';

  await db.transaction('rw', db.exceptions, async () => {
    for (const d of leaveDays) {
      const existing = await db.exceptions.where('date').equals(d.dateStr).first();
      if (existing) {
        await db.exceptions.delete(existing.id);
      }
      await db.exceptions.add({
        id: crypto.randomUUID(),
        date: d.dateStr,
        type: 'VACATION',
        name: exName,
        color: exColor,
      });
    }
  });
}

/**
 * Removes the annual leave exceptions from Dexie db.exceptions
 */
export async function removeLeaveOpportunityFromCalendar(
  opportunity: LeaveOpportunity
): Promise<void> {
  const dateStrs = opportunity.breakdown.map((d) => d.dateStr);

  await db.transaction('rw', db.exceptions, async () => {
    for (const dateStr of dateStrs) {
      const existing = await db.exceptions.where('date').equals(dateStr).first();
      if (existing && existing.type === 'VACATION') {
        await db.exceptions.delete(existing.id);
      }
    }
  });
}
