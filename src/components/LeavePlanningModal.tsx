import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO, type Locale, addDays } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import {
  Sparkles,
  Calculator,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  CalendarCheck2,
  CalendarDays,
  ArrowRight,
  RotateCcw,
  Layers,
  FileText,
  Minimize2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { db, type ShiftPattern, type ShiftException, type ShiftType } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAppStore } from '../store/useAppStore';
import {
  generateLeaveOpportunities,
  calculateCustomLeavePlan,
  applyLeaveOpportunityToCalendar,
  LEAVE_PERIODS_INFO,
  type LeaveOpportunity,
  type LeavePeriod,
  type DayBreakdown,
} from '../utils/leavePlanner';
import { formatToFullDateFast } from '../utils/holidays';
import { ShiftRangeCalendar } from './ShiftRangeCalendar';

export type WizardStep = 'METHOD' | 'PERIOD_SELECT' | 'OPPORTUNITIES' | 'MANUAL_CALENDAR';
export type OpportunityShiftFilter = 'ALL' | 'SINGLE' | 'DOUBLE' | 'BRIDGES' | 'BEST';

export const PERIOD_MONTHS: Record<LeavePeriod, { monthIndex: number; name: string }[]> = {
  WINTER_1: [
    { monthIndex: 0, name: 'Ocak' },
    { monthIndex: 1, name: 'Şubat' },
    { monthIndex: 2, name: 'Mart' },
    { monthIndex: 3, name: 'Nisan' },
    { monthIndex: 4, name: 'Mayıs' },
  ],
  SUMMER: [
    { monthIndex: 5, name: 'Haziran' },
    { monthIndex: 6, name: 'Temmuz' },
    { monthIndex: 7, name: 'Ağustos' },
  ],
  WINTER_2: [
    { monthIndex: 8, name: 'Eylül' },
    { monthIndex: 9, name: 'Ekim' },
    { monthIndex: 10, name: 'Kasım' },
    { monthIndex: 11, name: 'Aralık' },
  ],
};

interface DropdownOption<T> {
  value: T;
  label: string;
  count?: number;
}

interface CustomDropdownProps<T> {
  value: T;
  onChange: (value: T) => void;
  options: DropdownOption<T>[];
  icon: React.ReactNode;
  align?: 'left' | 'right';
}

function CustomDropdown<T extends string | number>({
  value,
  onChange,
  options,
  icon,
  align = 'left',
}: CustomDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200/90 dark:border-slate-700/80 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-xs hover:border-slate-400 dark:hover:border-slate-500 focus:outline-hidden transition-all cursor-pointer"
      >
        <div className="flex items-center space-x-2 min-w-0 pr-1">
          <span className="shrink-0">{icon}</span>
          <span className="truncate font-black text-[11.5px] sm:text-xs">
            {selectedOption ? selectedOption.label : ''}
            {selectedOption?.count !== undefined ? ` (${selectedOption.count})` : ''}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary-500' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute top-full mt-1.5 z-50 min-w-full w-max max-w-[calc(100vw-2.5rem)] sm:max-w-xs bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-1.5 space-y-0.5 ${
              align === 'right' ? 'right-0 left-auto' : 'left-0 right-auto'
            }`}
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-primary-50 dark:bg-primary-950/80 text-primary-600 dark:text-primary-300 font-black border border-primary-500/30'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {option.count !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-black shrink-0 ${
                        isSelected
                          ? 'bg-primary-200 dark:bg-primary-900 text-primary-800 dark:text-primary-200'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {option.count}
                    </span>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const DayTimelineRibbon: React.FC<{
  breakdown: DayBreakdown[];
  dateLocale: Locale;
  showLegend?: boolean;
}> = ({ breakdown, dateLocale, showLegend = true }) => {
  return (
    <div className="space-y-2">
      {/* Legend */}
      {showLegend && (
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[10.5px] font-bold text-slate-500 dark:text-slate-400">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-md bg-amber-500 shadow-2xs shrink-0" />
            <span>Yıllık İzin</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-md bg-emerald-500 shadow-2xs shrink-0" />
            <span>Vardiya Off</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-md bg-rose-500 shadow-2xs shrink-0" />
            <span>Resmi Tatil</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-md bg-sky-500 shadow-2xs shrink-0" />
            <span>Hafta Tatili (Pazar)</span>
          </div>
        </div>
      )}

      {/* Days Ribbon with responsive scroll & wrap */}
      <div className="flex gap-1.5 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar sm:flex-wrap">
        {breakdown.map((d, idx) => {
          const dayLetter = format(d.date, 'EEE', { locale: dateLocale });
          const dayNumber = format(d.date, 'd');

          const isHoliday = Boolean(
            d.dayRole === 'OFFICIAL_HOLIDAY' ||
            d.isOfficialHoliday ||
            (d.holidayDetail && d.holidayDetail.isOfficial)
          );
          const isLeave = d.dayRole === 'LEAVE';
          const isSundayDay = d.dayRole === 'SUNDAY_OFF';

          let bgClass = 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-xs border border-emerald-400/30';
          let badgeLabel = 'Off';
          let tooltipText = `${format(d.date, 'd MMMM yyyy, EEEE', { locale: dateLocale })} • Vardiya İstirahatı (Off)`;

          if (isHoliday) {
            bgClass = 'bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-xs border border-rose-400/30';
            badgeLabel = 'Tatil';
            tooltipText = `${format(d.date, 'd MMMM yyyy, EEEE', { locale: dateLocale })} • ${
              d.holidayDetail?.name || 'Resmi Tatil'
            }`;
          } else if (isLeave) {
            bgClass = 'bg-gradient-to-b from-amber-500 to-amber-600 text-white shadow-xs border border-amber-400/30';
            badgeLabel = 'İzin';
            tooltipText = `${format(d.date, 'd MMMM yyyy, EEEE', { locale: dateLocale })} • Yıllık İzin${
              d.shiftDay ? ` (${d.shiftDay.name})` : ''
            }`;
          } else if (isSundayDay) {
            bgClass = 'bg-gradient-to-b from-sky-500 to-blue-600 text-white shadow-xs border border-sky-400/30';
            badgeLabel = 'Pazar';
            tooltipText = `${format(d.date, 'd MMMM yyyy, EEEE', { locale: dateLocale })} • Pazar (Hafta Tatili)`;
          }

          return (
            <div
              key={idx}
              className={`flex flex-col items-center justify-center shrink-0 min-w-[38px] sm:min-w-[42px] sm:flex-1 py-1.5 px-1 rounded-xl text-center shadow-xs transition-transform duration-150 hover:scale-105 select-none ${bgClass}`}
              title={tooltipText}
            >
              <span className="text-[9px] font-bold opacity-85 leading-none">{dayLetter}</span>
              <span className="text-xs sm:text-[13px] font-black leading-tight my-0.5">{dayNumber}</span>
              <span className="text-[8px] font-black uppercase tracking-tight opacity-95 truncate max-w-full leading-none">
                {badgeLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export interface LeavePlanningModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  selectedYear?: number;
  onYearChange?: (year: number) => void;
  currentPattern?: ShiftPattern;
  patternStartDate?: string;
  exceptions?: ShiftException[];
  shiftTypes?: ShiftType[];
  initialPeriod?: LeavePeriod;
  onLeaveApplied?: (msg: string) => void;
}

export const LeavePlanningModal: React.FC<LeavePlanningModalProps> = (props) => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const dateLocale = i18n.language?.startsWith('tr') ? tr : enUS;

  const {
    setSelectedDate,
    setLeavePreview,
    isLeavePlanningOpen,
    isLeavePlanningMinimized,
    leavePlanningYear,
    leavePlanningStep,
    leavePlanningPeriod,
    leavePlanningMonth,
    leavePlanningShift,
    leavePlanningExpandedCardId,
    leavePlanningCustomStart,
    leavePlanningCustomEnd,
    closeLeavePlanning,
    minimizeLeavePlanning,
    setLeavePlanningYear,
    setLeavePlanningStep,
    setLeavePlanningPeriod,
    setLeavePlanningMonth,
    setLeavePlanningShift,
    setLeavePlanningExpandedCardId,
    setLeavePlanningCustomRange,
    showGlobalToast,
  } = useAppStore();

  // Self-contained live query if props are not provided
  const dbData = useLiveQuery(async () => {
    const [patterns, activePatterns, exceptions, shiftTypes] = await Promise.all([
      db.patterns.toArray(),
      db.activePatterns.toArray(),
      db.exceptions.toArray(),
      db.shiftTypes.toArray(),
    ]);
    return { patterns, activePatterns, exceptions, shiftTypes };
  }, []);

  const patterns = dbData?.patterns;
  const activePatterns = dbData?.activePatterns;
  const activePatternObj = activePatterns?.[0];
  const currentPattern =
    props.currentPattern ||
    patterns?.find((p) => p.id === activePatternObj?.patternId);
  const patternStartDate = props.patternStartDate || activePatternObj?.startDate;
  const exceptions = props.exceptions || dbData?.exceptions || [];
  const shiftTypes = props.shiftTypes || dbData?.shiftTypes || [];

  // Effective state variables bound to useAppStore
  const selectedYear = props.selectedYear ?? leavePlanningYear;
  const step = leavePlanningStep;
  const setStep = setLeavePlanningStep;
  const selectedPeriod = leavePlanningPeriod;
  const setSelectedPeriod = setLeavePlanningPeriod;
  const selectedMonth = leavePlanningMonth;
  const setSelectedMonth = setLeavePlanningMonth;
  const selectedShift = leavePlanningShift;
  const setSelectedShift = setLeavePlanningShift;
  const expandedCardId = leavePlanningExpandedCardId;
  const setExpandedCardId = setLeavePlanningExpandedCardId;
  const customStartDateStr = leavePlanningCustomStart;
  const customEndDateStr = leavePlanningCustomEnd;
  const setCustomStartDateStr = (s: string) =>
    setLeavePlanningCustomRange(s, leavePlanningCustomEnd);
  const setCustomEndDateStr = (e: string) =>
    setLeavePlanningCustomRange(leavePlanningCustomStart, e);

  // Sync initial period if passed via props
  useEffect(() => {
    if (props.initialPeriod && props.isOpen && !isLeavePlanningOpen) {
      setSelectedPeriod(props.initialPeriod);
    }
  }, [props.initialPeriod, props.isOpen, isLeavePlanningOpen, setSelectedPeriod]);

  // Year pills for Step 1
  const currentSystemYear = new Date().getFullYear();
  const yearPills = useMemo(() => {
    const list = [currentSystemYear, currentSystemYear + 1, currentSystemYear + 2];
    if (!list.includes(selectedYear)) {
      list.push(selectedYear);
      list.sort((a, b) => a - b);
    }
    return list;
  }, [currentSystemYear, selectedYear]);

  const handleYearChange = (yr: number) => {
    setLeavePlanningYear(yr);
    props.onYearChange?.(yr);
  };

  const handleClose = () => {
    closeLeavePlanning();
    props.onClose?.();
  };

  const handleMinimize = () => {
    minimizeLeavePlanning();
  };

  // Generate smart opportunities for the year
  const allOpportunities = useMemo(() => {
    if (!currentPattern || !patternStartDate) return [];
    return generateLeaveOpportunities(
      currentPattern,
      patternStartDate,
      selectedYear,
      exceptions || []
    );
  }, [currentPattern, patternStartDate, selectedYear, exceptions]);

  // Filter opportunities for selected period
  const periodOpportunities = useMemo(() => {
    return allOpportunities.filter((o) => o.period === selectedPeriod);
  }, [allOpportunities, selectedPeriod]);

  // Counts per period
  const winter1Count = useMemo(
    () => allOpportunities.filter((o) => o.period === 'WINTER_1').length,
    [allOpportunities]
  );
  const summerCount = useMemo(
    () => allOpportunities.filter((o) => o.period === 'SUMMER').length,
    [allOpportunities]
  );
  const winter2Count = useMemo(
    () => allOpportunities.filter((o) => o.period === 'WINTER_2').length,
    [allOpportunities]
  );

  // Current period months
  const currentPeriodMonths = PERIOD_MONTHS[selectedPeriod] || [];

  // Counts per month for current period
  const monthCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const m of currentPeriodMonths) {
      counts[m.monthIndex] = periodOpportunities.filter(
        (o) =>
          o.vacationStartDate.getMonth() === m.monthIndex ||
          o.vacationEndDate.getMonth() === m.monthIndex
      ).length;
    }
    return counts;
  }, [currentPeriodMonths, periodOpportunities]);

  // Counts per shift type for current period
  const singleShiftCount = useMemo(
    () => periodOpportunities.filter((o) => o.shiftCount === 1).length,
    [periodOpportunities]
  );

  const doubleShiftCount = useMemo(
    () => periodOpportunities.filter((o) => o.shiftCount === 2).length,
    [periodOpportunities]
  );

  const bridgesCount = useMemo(
    () =>
      periodOpportunities.filter(
        (o) => o.category === 'HOLIDAY_BRIDGE' || o.holidayNames.length > 0
      ).length,
    [periodOpportunities]
  );

  // Filtered opportunities inside selected period based on month and shift dropdowns
  const filteredOpportunities = useMemo(() => {
    let list = [...periodOpportunities];

    // 1. Month filter
    if (selectedMonth !== 'ALL') {
      list = list.filter((opp) => {
        const sMonth = opp.vacationStartDate.getMonth();
        const eMonth = opp.vacationEndDate.getMonth();
        return sMonth === selectedMonth || eMonth === selectedMonth;
      });
    }

    // 2. Shift / duration filter
    if (selectedShift === 'SINGLE') {
      list = list.filter((o) => o.shiftCount === 1);
    } else if (selectedShift === 'DOUBLE') {
      list = list.filter((o) => o.shiftCount === 2);
    } else if (selectedShift === 'BRIDGES') {
      list = list.filter((o) => o.category === 'HOLIDAY_BRIDGE' || o.holidayNames.length > 0);
    } else if (selectedShift === 'BEST') {
      list = list
        .sort((a, b) => b.savedFreeDays - a.savedFreeDays || b.totalVacationDays - a.totalVacationDays)
        .slice(0, 3);
    }

    return list;
  }, [periodOpportunities, selectedMonth, selectedShift]);

  // Top recommendation in the current period (Hero Best Pick)
  const heroOpportunity = useMemo(() => {
    if (periodOpportunities.length === 0) return null;
    return [...periodOpportunities].sort(
      (a, b) => b.savedFreeDays - a.savedFreeDays || b.totalVacationDays - a.totalVacationDays
    )[0];
  }, [periodOpportunities]);

  // Custom analysis for manual selection
  const customAnalysis = useMemo(() => {
    try {
      const sDate = parseISO(customStartDateStr);
      const eDate = parseISO(customEndDateStr);
      if (isNaN(sDate.getTime()) || isNaN(eDate.getTime()) || sDate > eDate) {
        return null;
      }
      return calculateCustomLeavePlan(
        currentPattern || null,
        patternStartDate || customStartDateStr,
        sDate,
        eDate
      );
    } catch {
      return null;
    }
  }, [customStartDateStr, customEndDateStr, currentPattern, patternStartDate]);

  const handleApplyOpportunity = async (opp: LeaveOpportunity) => {
    try {
      await applyLeaveOpportunityToCalendar(opp);
      closeLeavePlanning();
      const msg = 'İzin günleri takviminize başarıyla eklendi! 🎉';
      showGlobalToast(msg);
      props.onLeaveApplied?.(msg);
      props.onClose?.();
    } catch (err) {
      console.error(err);
    }
  };

  const handleShowOpportunityOnCalendar = (opp: LeaveOpportunity) => {
    setLeavePreview({
      id: opp.id,
      title: opp.title,
      startDateStr: opp.vacationStartDateStr,
      endDateStr: opp.vacationEndDateStr,
      formalStartDateStr: opp.formalStartDateStr,
      formalEndDateStr: opp.formalEndDateStr,
      leaveDaysSpent: opp.leaveDaysSpent,
      totalVacationDays: opp.totalVacationDays,
      savedFreeDays: opp.savedFreeDays,
      efficiencyMultiplier: opp.efficiencyMultiplier,
      holidayNames: opp.holidayNames,
      opportunity: opp,
      breakdown: opp.breakdown,
    });
    setSelectedDate(opp.vacationStartDate);
    minimizeLeavePlanning();
    navigate('/');
  };

  const handleShowCustomOnCalendar = () => {
    if (!customAnalysis) return;
    setLeavePreview({
      id: 'custom-preview',
      title: 'Özel Yıllık İzin',
      startDateStr: customAnalysis.vacationStartDateStr,
      endDateStr: customAnalysis.vacationEndDateStr,
      formalStartDateStr: customAnalysis.formalStartDateStr,
      formalEndDateStr: customAnalysis.formalEndDateStr,
      leaveDaysSpent: customAnalysis.leaveDaysSpent,
      totalVacationDays: customAnalysis.totalVacationDays,
      savedFreeDays: customAnalysis.totalVacationDays - customAnalysis.leaveDaysSpent,
      efficiencyMultiplier: customAnalysis.efficiencyMultiplier,
      holidayNames: [],
      breakdown: customAnalysis.breakdown,
    });
    setSelectedDate(customAnalysis.vacationStartDate);
    minimizeLeavePlanning();
    navigate('/');
  };

  const handleApplyCustomLeave = async () => {
    if (!customAnalysis) return;
    try {
      const oppLike: LeaveOpportunity = {
        id: 'custom',
        title: 'Özel Yıllık İzin',
        category: 'SHIFT_BLOCK',
        period: customAnalysis.period,
        shiftCount: customAnalysis.shiftCount >= 2 ? 2 : 1,
        isSummerSeason: customAnalysis.period === 'SUMMER',
        isPriority: true,
        seasonTag: LEAVE_PERIODS_INFO[customAnalysis.period].title,
        formalStartDate: customAnalysis.formalStartDate,
        formalEndDate: customAnalysis.formalEndDate,
        formalStartDateStr: customAnalysis.formalStartDateStr,
        formalEndDateStr: customAnalysis.formalEndDateStr,
        vacationStartDate: customAnalysis.vacationStartDate,
        vacationEndDate: customAnalysis.vacationEndDate,
        vacationStartDateStr: customAnalysis.vacationStartDateStr,
        vacationEndDateStr: customAnalysis.vacationEndDateStr,
        leaveDaysSpent: customAnalysis.leaveDaysSpent,
        totalVacationDays: customAnalysis.totalVacationDays,
        efficiencyMultiplier: customAnalysis.efficiencyMultiplier,
        savedFreeDays: customAnalysis.totalVacationDays - customAnalysis.leaveDaysSpent,
        holidayNames: [],
        breakdown: customAnalysis.breakdown,
      };
      await applyLeaveOpportunityToCalendar(oppLike);
      closeLeavePlanning();
      const msg = 'Özel izin takviminize başarıyla kaydedildi! 🎉';
      showGlobalToast(msg);
      props.onLeaveApplied?.(msg);
      props.onClose?.();
    } catch (err) {
      console.error(err);
    }
  };

  const setPresetDays = (daysCount: number) => {
    try {
      const s = customStartDateStr ? parseISO(customStartDateStr) : new Date();
      if (!isNaN(s.getTime())) {
        const sStr = formatToFullDateFast(s);
        const eStr = formatToFullDateFast(addDays(s, daysCount - 1));
        setCustomStartDateStr(sStr);
        setCustomEndDateStr(eStr);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Back button behavior
  const handleBack = () => {
    if (step === 'OPPORTUNITIES') {
      setStep('PERIOD_SELECT');
    } else if (step === 'PERIOD_SELECT' || step === 'MANUAL_CALENDAR') {
      setStep('METHOD');
    }
  };

  const isModalOpen = (props.isOpen ?? isLeavePlanningOpen) && !isLeavePlanningMinimized;
  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-950 w-full max-w-2xl rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center space-x-2">
            {step !== 'METHOD' && (
              <button
                onClick={handleBack}
                className="p-1.5 rounded-xl hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all cursor-pointer active:scale-90"
                title="Geri Dön"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
                  {step === 'METHOD' && 'İzin Planlama Yöntemi'}
                  {step === 'PERIOD_SELECT' && 'Dönem Seçimi'}
                  {step === 'OPPORTUNITIES' && `${LEAVE_PERIODS_INFO[selectedPeriod].title} Fırsatları`}
                  {step === 'MANUAL_CALENDAR' && 'Manuel Tarih Seçimi'}
                </span>
                <span className="text-[10.5px] font-black px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 shadow-2xs">
                  {selectedYear}
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {step === 'METHOD' && 'Adım 1 / 3: Planlama türünüzü belirleyin'}
                {step === 'PERIOD_SELECT' && 'Adım 2 / 3: Hangi mevsimde çıkmak istiyorsunuz?'}
                {step === 'OPPORTUNITIES' && 'Adım 3 / 3: Size en uygun tatil fırsatını seçin'}
                {step === 'MANUAL_CALENDAR' && 'Takvimden istediğiniz aralığı seçin'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={handleMinimize}
              className="p-1.5 rounded-xl hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all cursor-pointer"
              title="Takvimi Gör (Küçült)"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-xl hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all cursor-pointer"
              title="Planlamayı İptal Et / Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 bg-slate-50/60 dark:bg-slate-950">
          {/* ========================================================================= */}
          {/* STEP 1: METHOD SELECTION */}
          {/* ========================================================================= */}
          {step === 'METHOD' && (
            <div className="space-y-3.5 py-1">
              <div className="text-center space-y-1 mb-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  İzninizi Nasıl Planlamak İstersiniz?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto font-medium">
                  Vardiyanızdaki dinlenme (off) günlerini ve bayramları birleştirerek maksimum tatil yapabilirsiniz.
                </p>
              </div>

              {/* Year Selector Component on First Step */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center space-x-2.5 w-full sm:w-auto">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black shrink-0 border border-amber-500/20">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                        Planlama Yılı
                      </span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 shadow-2xs">
                        {selectedYear}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Öneriler ve tatiller seçilen yıla göre listelenir
                    </p>
                  </div>
                </div>

                {/* Year Navigator Pills */}
                <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 w-full sm:w-auto justify-center">
                  <button
                    type="button"
                    onClick={() => handleYearChange(selectedYear - 1)}
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-all cursor-pointer"
                    title="Önceki Yıl"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {yearPills.map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => handleYearChange(yr)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        selectedYear === yr
                          ? 'bg-amber-500 text-slate-950 shadow-xs scale-[1.02]'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      {yr}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => handleYearChange(selectedYear + 1)}
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-all cursor-pointer"
                    title="Sonraki Yıl"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Option 1: Smart Opportunities */}
                <button
                  onClick={() => setStep('PERIOD_SELECT')}
                  className="group relative p-4 sm:p-5 rounded-2xl border-2 border-amber-500/60 dark:border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900 text-left transition-all shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between space-y-3 active:scale-[0.98]"
                >
                  <div className="absolute top-3 right-3">
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500 text-white shadow-xs">
                      Tavsiye Edilen ⭐
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors">
                        Akıllı Vardiya Önerileri
                      </h4>
                      <p className="text-[11.5px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed font-medium">
                        Vardiya off günlerinizi ve bayramları otomatik bağlar. En az izin harcayarak en uzun tatili önerir.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-amber-500/30 dark:border-amber-500/30 flex items-center justify-between text-xs font-black text-amber-600 dark:text-amber-400">
                    <span>Önerileri Keşfet</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* Option 2: Manual Calendar Picker */}
                <button
                  onClick={() => setStep('MANUAL_CALENDAR')}
                  className="group p-4 sm:p-5 rounded-2xl border-2 border-blue-500/60 dark:border-blue-500/50 bg-gradient-to-br from-blue-500/10 via-white to-blue-500/5 dark:from-blue-950/40 dark:via-slate-900 dark:to-slate-900 text-left transition-all shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between space-y-3 active:scale-[0.98]"
                >
                  <div className="space-y-2.5">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                        Manuel / Kendi Tarihini Seç
                      </h4>
                      <p className="text-[11.5px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed font-medium">
                        Takvimden gitmek istediğiniz başlangıç ve bitiş günlerini kendiniz belirleyin; izin dökümünü canlı görün.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-blue-500/30 dark:border-blue-500/30 flex items-center justify-between text-xs font-black text-blue-600 dark:text-blue-400">
                    <span>Tarih Belirle</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2A: PERIOD SELECTION */}
          {/* ========================================================================= */}
          {step === 'PERIOD_SELECT' && (
            <div className="space-y-3 py-1">
              <div className="text-center space-y-1 mb-3">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Hangi Dönemde Tatile Çıkmak İstiyorsunuz?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  {selectedYear} yılı için tanımlı 3 izin periyodundan birini seçin:
                </p>
              </div>

              <div className="space-y-3 sm:space-y-3.5">
                {/* 1. Kış İzni */}
                <button
                  onClick={() => {
                    setSelectedPeriod('WINTER_1');
                    setSelectedMonth('ALL');
                    setSelectedShift('ALL');
                    setStep('OPPORTUNITIES');
                  }}
                  className="w-full p-4 sm:p-4.5 rounded-2xl border-2 border-blue-400/50 dark:border-blue-500/40 bg-gradient-to-br from-blue-500/10 via-white to-blue-500/5 dark:from-blue-950/40 dark:via-slate-900 dark:to-slate-900 text-left transition-all cursor-pointer group active:scale-[0.99] shadow-xs hover:shadow-md hover:border-blue-500 dark:hover:border-blue-400 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center text-xl sm:text-2xl shrink-0 shadow-sm shadow-blue-500/30 group-hover:scale-105 transition-transform">
                        ❄️
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors tracking-tight">
                          1. Kış İzni
                        </h4>
                        <div className="inline-flex items-center space-x-1.5 mt-1 px-2.5 py-0.5 rounded-lg bg-blue-500/15 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-400/30 text-[11px] sm:text-xs font-black whitespace-nowrap">
                          <Calendar className="w-3 h-3 shrink-0 opacity-80" />
                          <span>Ocak – Mayıs</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs font-black shadow-xs shadow-blue-600/20">
                      <Sparkles className="w-3 h-3 opacity-90" />
                      <span>{winter1Count} Fırsat</span>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-blue-500/15 dark:border-blue-500/20 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400 font-medium">
                      <Layers className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>1 veya 2 Shift (10 – 19 Gün Tatil)</span>
                    </div>
                    <div className="flex items-center space-x-1 font-black text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform shrink-0">
                      <span className="hidden sm:inline">Fırsatları</span>
                      <span>Gör</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </button>

                {/* Yaz İzni */}
                <button
                  onClick={() => {
                    setSelectedPeriod('SUMMER');
                    setSelectedMonth('ALL');
                    setSelectedShift('ALL');
                    setStep('OPPORTUNITIES');
                  }}
                  className="w-full p-4 sm:p-4.5 rounded-2xl border-2 border-amber-400/50 dark:border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900 text-left transition-all cursor-pointer group active:scale-[0.99] shadow-xs hover:shadow-md hover:border-amber-500 dark:hover:border-amber-400 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-xl sm:text-2xl shrink-0 shadow-sm shadow-amber-500/30 group-hover:scale-105 transition-transform">
                        ☀️
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors tracking-tight">
                          Yaz İzni
                        </h4>
                        <div className="inline-flex items-center space-x-1.5 mt-1 px-2.5 py-0.5 rounded-lg bg-amber-500/15 dark:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-400/30 text-[11px] sm:text-xs font-black whitespace-nowrap">
                          <Calendar className="w-3 h-3 shrink-0 opacity-80" />
                          <span>Haziran – Ağustos</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-amber-500 text-slate-950 text-xs font-black shadow-xs shadow-amber-500/20">
                      <Sparkles className="w-3 h-3 opacity-90" />
                      <span>{summerCount} Fırsat</span>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-amber-500/15 dark:border-amber-500/20 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400 font-medium">
                      <Layers className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>1 Shift (10 Gün Tatil - Kural)</span>
                    </div>
                    <div className="flex items-center space-x-1 font-black text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform shrink-0">
                      <span className="hidden sm:inline">Fırsatları</span>
                      <span>Gör</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </button>

                {/* 2. Kış İzni */}
                <button
                  onClick={() => {
                    setSelectedPeriod('WINTER_2');
                    setSelectedMonth('ALL');
                    setSelectedShift('ALL');
                    setStep('OPPORTUNITIES');
                  }}
                  className="w-full p-4 sm:p-4.5 rounded-2xl border-2 border-purple-400/50 dark:border-purple-500/40 bg-gradient-to-br from-purple-500/10 via-white to-purple-500/5 dark:from-purple-950/40 dark:via-slate-900 dark:to-slate-900 text-left transition-all cursor-pointer group active:scale-[0.99] shadow-xs hover:shadow-md hover:border-purple-500 dark:hover:border-purple-400 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center text-xl sm:text-2xl shrink-0 shadow-sm shadow-purple-500/30 group-hover:scale-105 transition-transform">
                        🍂
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors tracking-tight">
                          2. Kış İzni
                        </h4>
                        <div className="inline-flex items-center space-x-1.5 mt-1 px-2.5 py-0.5 rounded-lg bg-purple-500/15 dark:bg-purple-500/25 text-purple-700 dark:text-purple-300 border border-purple-400/30 text-[11px] sm:text-xs font-black whitespace-nowrap">
                          <Calendar className="w-3 h-3 shrink-0 opacity-80" />
                          <span>Eylül – Aralık</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-purple-600 text-white text-xs font-black shadow-xs shadow-purple-600/20">
                      <Sparkles className="w-3 h-3 opacity-90" />
                      <span>{winter2Count} Fırsat</span>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-purple-500/15 dark:border-purple-500/20 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400 font-medium">
                      <Layers className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      <span>1 veya 2 Shift (10 – 19 Gün Tatil)</span>
                    </div>
                    <div className="flex items-center space-x-1 font-black text-purple-600 dark:text-purple-400 group-hover:translate-x-1 transition-transform shrink-0">
                      <span className="hidden sm:inline">Fırsatları</span>
                      <span>Gör</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3A: OPPORTUNITY CARDS & HERO RECOMMENDATION */}
          {/* ========================================================================= */}
          {step === 'OPPORTUNITIES' && (
            <div className="space-y-3.5">
              {/* Dual Side-by-Side Dropdown Filters */}
              <div className="grid grid-cols-2 gap-2">
                {/* 1. Ay Filtresi Dropdown */}
                <CustomDropdown
                  value={selectedMonth}
                  onChange={(val) => setSelectedMonth(val as number | 'ALL')}
                  icon={<Calendar className="w-4 h-4 text-primary-500" />}
                  align="left"
                  options={[
                    { value: 'ALL', label: 'Tüm Aylar', count: periodOpportunities.length },
                    ...currentPeriodMonths.map((m) => ({
                      value: m.monthIndex,
                      label: m.name,
                      count: monthCounts[m.monthIndex],
                    })),
                  ]}
                />

                {/* 2. Tek / Çift Shift & Süre Filtresi Dropdown */}
                <CustomDropdown
                  value={selectedShift}
                  onChange={(val) => setSelectedShift(val as OpportunityShiftFilter)}
                  icon={<Layers className="w-4 h-4 text-amber-500" />}
                  align="right"
                  options={[
                    { value: 'ALL', label: 'Tüm Shiftler', count: periodOpportunities.length },
                    ...(singleShiftCount > 0
                      ? [{ value: 'SINGLE' as const, label: 'Tek Shift (10 Gün)', count: singleShiftCount }]
                      : []),
                    ...(selectedPeriod !== 'SUMMER' && doubleShiftCount > 0
                      ? [{ value: 'DOUBLE' as const, label: 'Çift Shift (19 Gün)', count: doubleShiftCount }]
                      : []),
                    ...(bridgesCount > 0
                      ? [{ value: 'BRIDGES' as const, label: 'Bayram Köprüleri', count: bridgesCount }]
                      : []),
                    { value: 'BEST' as const, label: '⭐ En Karlı Fırsatlar', count: Math.min(3, periodOpportunities.length) },
                  ]}
                />
              </div>

              {/* Active Filter Clear Helper Row */}
              {(selectedMonth !== 'ALL' || selectedShift !== 'ALL') && (
                <div className="flex items-center justify-between px-1 text-xs">
                  <span className="text-slate-600 dark:text-slate-300 text-[11px] font-bold">
                    {filteredOpportunities.length} fırsat gösteriliyor
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMonth('ALL');
                      setSelectedShift('ALL');
                    }}
                    className="text-primary-600 dark:text-primary-400 hover:underline flex items-center space-x-1 text-[11px] font-black cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Filtreleri Sıfırla</span>
                  </button>
                </div>
              )}

              {/* Hero Best Opportunity Card (Shown when all filters are open) */}
              {heroOpportunity && selectedMonth === 'ALL' && selectedShift === 'ALL' && (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/15 via-white to-amber-500/5 dark:from-amber-950/60 dark:via-slate-900 dark:to-slate-900 border-2 border-amber-500 shadow-md shadow-amber-500/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-base">🌟</span>
                      <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                        Bu Dönemin En Karlı Fırsatı
                      </span>
                    </div>
                    <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-500 text-white shadow-xs">
                      +{heroOpportunity.savedFreeDays} Gün Bedava
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                        {format(heroOpportunity.vacationStartDate, 'd MMMM', { locale: dateLocale })} –{' '}
                        {format(heroOpportunity.vacationEndDate, 'd MMMM yyyy', { locale: dateLocale })}
                      </h4>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                        Yalnızca <span className="text-amber-600 dark:text-amber-400 font-black">{heroOpportunity.leaveDaysSpent} gün</span> izin harcayarak{' '}
                        <span className="text-emerald-600 dark:text-emerald-400 font-black">{heroOpportunity.totalVacationDays} gün</span> kesintisiz tatil yapın!
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0 pt-1 sm:pt-0">
                      <button
                        onClick={() => handleShowOpportunityOnCalendar(heroOpportunity)}
                        className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-800 dark:text-slate-100 text-xs font-black transition-all shadow-2xs cursor-pointer"
                      >
                        Önizle
                      </button>
                      <button
                        onClick={() => handleApplyOpportunity(heroOpportunity)}
                        className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-black shadow-md shadow-primary-600/30 active:scale-95 transition-all flex items-center space-x-1.5 cursor-pointer"
                      >
                        <CalendarCheck2 className="w-4 h-4" />
                        <span>Takvime İşle</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* List of Opportunities with Compact Collapsed & Detailed Expanded Cards */}
              <div className="space-y-2">
                {filteredOpportunities.length > 0 ? (
                  filteredOpportunities.map((opp) => {
                    const isExpanded = expandedCardId === opp.id;
                    const returnToWorkDate = addDays(opp.vacationEndDate, 1);

                    return (
                      <div
                        key={opp.id}
                        className={`rounded-2xl transition-all duration-200 overflow-hidden ${
                          isExpanded
                            ? 'bg-white dark:bg-slate-900 border-2 border-primary-500 dark:border-primary-500/80 shadow-lg shadow-primary-500/10 ring-1 ring-primary-500/20'
                            : 'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-md'
                        }`}
                      >
                        {/* Compact Interactive Card Header */}
                        <div
                          onClick={() => setExpandedCardId(isExpanded ? null : opp.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setExpandedCardId(isExpanded ? null : opp.id);
                            }
                          }}
                          className={`p-2.5 sm:p-3 flex items-center justify-between gap-2.5 cursor-pointer transition-colors select-none ${
                            isExpanded
                              ? 'bg-primary-50/50 dark:bg-primary-950/25'
                              : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                            {/* Themed Icon Box */}
                            <div
                              className={`w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-sm sm:text-base shrink-0 border shadow-2xs transition-transform duration-200 ${
                                isExpanded ? 'scale-105' : ''
                              } ${
                                opp.period === 'SUMMER'
                                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                  : opp.shiftCount === 2
                                  ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30'
                                  : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                              }`}
                            >
                              {opp.period === 'SUMMER' ? '☀️' : opp.shiftCount === 2 ? '✈️' : '❄️'}
                            </div>

                            {/* Main Titles & Compact Summary */}
                            <div className="min-w-0 flex-1">
                              {/* Row 1: Dates & Badges */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-black text-xs sm:text-[13px] text-slate-900 dark:text-white tracking-tight">
                                  {format(opp.vacationStartDate, 'd MMM', { locale: dateLocale })} –{' '}
                                  {format(opp.vacationEndDate, 'd MMM yyyy', { locale: dateLocale })}
                                </span>
                                <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
                                  {opp.totalVacationDays} Gün Tatil
                                </span>
                                {opp.holidayNames.length > 0 && (
                                  <span
                                    className="text-[9.5px] font-black px-1.5 py-0.2 rounded-md bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 inline-flex items-center gap-0.5 shrink-0"
                                    title={opp.holidayNames.join(', ')}
                                  >
                                    <Sparkles className="w-2.5 h-2.5 text-rose-500" />
                                    <span>Tatil</span>
                                  </span>
                                )}
                              </div>

                              {/* Row 2: Dot-separated stats */}
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center flex-wrap gap-x-1.5 gap-y-0.5 mt-0.5 leading-tight">
                                <span className="text-amber-700 dark:text-amber-400 font-black">
                                  {opp.leaveDaysSpent} gün izin
                                </span>
                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                <span className="text-emerald-700 dark:text-emerald-400 font-black">
                                  +{opp.savedFreeDays} gün off/tatil
                                </span>
                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                <span className="text-slate-600 dark:text-slate-300 font-semibold">
                                  İş başı: {format(returnToWorkDate, 'd MMM', { locale: dateLocale })}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right Chevron Toggle */}
                          <div className="shrink-0 pl-1">
                            <div
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all ${
                                isExpanded
                                  ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400 border border-primary-500/40'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                              }`}
                            >
                              <ChevronDown
                                className={`w-4 h-4 transition-transform duration-200 ${
                                  isExpanded ? 'rotate-180 text-primary-600 dark:text-primary-400' : ''
                                }`}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Detailed Drawer with Smooth Framer Motion Animation (Expanded State) */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.22, ease: 'easeInOut' }}
                              className="overflow-hidden"
                            >
                              <div className="p-3.5 sm:p-4.5 border-t border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 space-y-3.5">
                                {/* 1. Stat Summary Cards */}
                                <div className="grid grid-cols-3 gap-2 sm:gap-2.5 text-center">
                                  <div className="p-2.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/20">
                                    <span className="text-[10.5px] font-bold text-amber-700 dark:text-amber-300 block mb-0.5">
                                      Harcanan İzin
                                    </span>
                                    <span className="text-sm sm:text-base font-black text-amber-800 dark:text-amber-200">
                                      {opp.leaveDaysSpent} Gün
                                    </span>
                                    <span className="text-[9.5px] font-semibold text-amber-600/80 dark:text-amber-400/80 block mt-0.5">
                                      Yıllık İzniniz
                                    </span>
                                  </div>

                                  <div className="p-2.5 rounded-2xl bg-blue-500/10 dark:bg-blue-950/30 border border-blue-500/20">
                                    <span className="text-[10.5px] font-bold text-blue-700 dark:text-blue-300 block mb-0.5">
                                      Kazanılan Günler
                                    </span>
                                    <span className="text-sm sm:text-base font-black text-blue-800 dark:text-blue-200">
                                      +{opp.savedFreeDays} Gün
                                    </span>
                                    <span className="text-[9.5px] font-semibold text-blue-600/80 dark:text-blue-400/80 block mt-0.5">
                                      Off & Bayram
                                    </span>
                                  </div>

                                  <div className="p-2.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/20">
                                    <span className="text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300 block mb-0.5">
                                      Toplam Tatil
                                    </span>
                                    <span className="text-sm sm:text-base font-black text-emerald-800 dark:text-emerald-200">
                                      {opp.totalVacationDays} Gün
                                    </span>
                                    <span className="text-[9.5px] font-semibold text-emerald-600/80 dark:text-emerald-400/80 block mt-0.5">
                                      Kesintisiz
                                    </span>
                                  </div>
                                </div>

                                {/* 2. Formal Petition Dates & Return to Work Callout */}
                                <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-2xs">
                                  <div className="flex items-start sm:items-center space-x-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-primary-500/15 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                                      <FileText className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                                        Dilekçeye / İzin Formuna Yazılacak:
                                      </span>
                                      <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                                        {format(opp.formalStartDate, 'd MMMM', { locale: dateLocale })} –{' '}
                                        {format(opp.formalEndDate, 'd MMMM yyyy', { locale: dateLocale })}{' '}
                                        <span className="text-amber-600 dark:text-amber-400 font-bold">({opp.leaveDaysSpent} Gün İzin)</span>
                                      </span>
                                    </div>
                                  </div>

                                  <div className="sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                                      İşe Dönüş / İlk Mesai:
                                    </span>
                                    <span className="font-black text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                                      {format(returnToWorkDate, 'd MMMM yyyy, EEEE', { locale: dateLocale })}
                                    </span>
                                  </div>
                                </div>

                                {/* 3. Holiday Notice if present */}
                                {opp.holidayNames.length > 0 && (
                                  <div className="px-3.5 py-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center space-x-2.5">
                                    <Sparkles className="w-4 h-4 text-rose-500 shrink-0" />
                                    <div>
                                      <span className="font-black">Resmi Tatil Avantajı: </span>
                                      <span>
                                        {opp.holidayNames.join(', ')} bu aralıkta tatilinize denk geliyor ve izin hakkınızdan düşmüyor.
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* 4. Day Timeline */}
                                <div>
                                  <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 mb-1.5 block">
                                    🗓️ Gün Gün Tatil Akışı:
                                  </span>
                                  <DayTimelineRibbon breakdown={opp.breakdown} dateLocale={dateLocale} />
                                </div>

                                {/* 5. Action Row */}
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-200/90 dark:border-slate-800">
                                  <button
                                    type="button"
                                    onClick={() => handleShowOpportunityOnCalendar(opp)}
                                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-black flex items-center justify-center space-x-2 transition-all shadow-2xs active:scale-98 cursor-pointer"
                                  >
                                    <CalendarDays className="w-4 h-4 text-primary-500" />
                                    <span>Takvimde Önizle</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleApplyOpportunity(opp)}
                                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-black shadow-md shadow-primary-600/30 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                                  >
                                    <CalendarCheck2 className="w-4 h-4" />
                                    <span>Bu İzni Takvime Kaydet</span>
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 text-slate-400 text-xs space-y-2">
                    <p className="font-bold text-slate-600 dark:text-slate-300">
                      Seçilen ay ve shift filtresine uygun fırsat bulunamadı.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMonth('ALL');
                        setSelectedShift('ALL');
                      }}
                      className="px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Filtreleri Sıfırla
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2B: MANUAL RANGE CALENDAR PICKER */}
          {/* ========================================================================= */}
          {step === 'MANUAL_CALENDAR' && (
            <div className="space-y-3.5">
              <ShiftRangeCalendar
                startDateStr={customStartDateStr}
                endDateStr={customEndDateStr}
                onRangeChange={(start, end) => {
                  setCustomStartDateStr(start);
                  setCustomEndDateStr(end);
                }}
                currentPattern={currentPattern}
                patternStartDate={patternStartDate}
                exceptions={exceptions}
                shiftTypes={shiftTypes}
                customAnalysis={customAnalysis}
                onPresetDays={setPresetDays}
              />

              {/* Analysis Result Box */}
              {customAnalysis ? (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-2">
                    <div className="flex items-center space-x-2">
                      <Calculator className="w-4 h-4 text-primary-500" />
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                        İzin Analiz Sonucu
                      </h4>
                    </div>
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40">
                      {customAnalysis.totalVacationDays} Gün Kesintisiz Tatil
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-200">
                      <span className="text-[10px] block opacity-80 font-bold">Harcanan İzin:</span>
                      <span className="font-black text-sm">{customAnalysis.leaveDaysSpent} Gün</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200">
                      <span className="text-[10px] block opacity-80 font-bold">Toplam Tatil:</span>
                      <span className="font-black text-sm">{customAnalysis.totalVacationDays} Gün</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-800 dark:text-blue-200">
                      <span className="text-[10px] block opacity-80 font-bold">Kazanılan Ek Gün:</span>
                      <span className="font-black text-sm">
                        +{customAnalysis.totalVacationDays - customAnalysis.leaveDaysSpent} Gün
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-800 dark:text-indigo-200">
                      <span className="text-[10px] block opacity-80 font-bold">İş Başı:</span>
                      <span className="font-black text-sm">
                        {format(addDays(customAnalysis.vacationEndDate, 1), 'd MMM', { locale: dateLocale })}
                      </span>
                    </div>
                  </div>

                  {/* Day Timeline */}
                  <div>
                    <span className="text-[10.5px] font-black text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Tatil Şeridi:
                    </span>
                    <DayTimelineRibbon breakdown={customAnalysis.breakdown} dateLocale={dateLocale} />
                  </div>

                  {/* Action Button */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleShowCustomOnCalendar}
                      className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs"
                    >
                      <CalendarDays className="w-4 h-4 text-primary-500" />
                      <span>Takvimde Önizle</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyCustomLeave}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-black text-xs shadow-md shadow-primary-600/30 active:scale-95 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <CalendarCheck2 className="w-4 h-4" />
                      <span>Bu İzni Takvime Kaydet</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                  Yukarıdaki takvimden başlangıç ve bitiş tarihlerine tıklayarak izin analizinizi görün.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
