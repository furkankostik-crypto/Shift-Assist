import React, { useState, useMemo, useEffect } from 'react';
import {
  format,
  addMonths,
  subMonths,
  addDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  parseISO,
  isSunday,
  isBefore,
  isAfter,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  RotateCcw,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ShiftPattern, type ShiftException, type ShiftType, type ShiftDay } from '../db/db';
import { getShiftForDate, resolveShiftDayWithTypes } from '../utils/shiftLogic';
import { getHolidayDetail, formatToFullDateFast } from '../utils/holidays';
import {
  isValidLeaveBoundary,
  isOfficialHoliday,
  type CustomLeaveAnalysis,
} from '../utils/leavePlanner';

interface ShiftRangeCalendarProps {
  startDateStr: string;
  endDateStr: string;
  onRangeChange: (startDateStr: string, endDateStr: string) => void;
  selectedYear?: number;
  currentPattern?: ShiftPattern;
  patternStartDate?: string;
  exceptions?: ShiftException[];
  shiftTypes?: ShiftType[];
  customAnalysis?: CustomLeaveAnalysis | null;
  onPresetDays?: (days: number) => void;
}

export const ShiftRangeCalendar: React.FC<ShiftRangeCalendarProps> = ({
  startDateStr,
  endDateStr,
  onRangeChange,
  selectedYear,
  currentPattern,
  patternStartDate,
  exceptions = [],
  shiftTypes: propShiftTypes,
  customAnalysis,
  onPresetDays,
}) => {
  const liveShiftTypes = useLiveQuery(async () => db.shiftTypes.toArray(), []);
  const effectiveShiftTypes = propShiftTypes || liveShiftTypes;

  const shiftTypesMap = useMemo(() => {
    const map = new Map<string, ShiftType>();
    if (effectiveShiftTypes) {
      for (const st of effectiveShiftTypes) {
        map.set(st.id, st);
      }
    }
    return map;
  }, [effectiveShiftTypes]);
  // Parse current selected dates
  const parsedStartDate = useMemo(() => {
    try {
      const d = parseISO(startDateStr);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }, [startDateStr]);

  const parsedEndDate = useMemo(() => {
    try {
      const d = parseISO(endDateStr);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }, [endDateStr]);

  // Current visible month in calendar
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    if (parsedStartDate) {
      return startOfMonth(parsedStartDate);
    }
    if (selectedYear) {
      const today = new Date();
      if (today.getFullYear() === selectedYear) {
        return startOfMonth(today);
      }
      return new Date(selectedYear, 0, 1);
    }
    return startOfMonth(new Date());
  });

  // Keep calendar month aligned if selectedYear changes and there is no active selected start date
  useEffect(() => {
    if (selectedYear && !parsedStartDate) {
      const today = new Date();
      if (today.getFullYear() === selectedYear) {
        setCurrentMonth(startOfMonth(today));
      } else {
        setCurrentMonth(new Date(selectedYear, 0, 1));
      }
    }
  }, [selectedYear, parsedStartDate]);

  // Selection step: 'idle' (both set or none) vs 'selecting_end' (user picked start, picking end)
  const isSelectingEnd = Boolean(parsedStartDate && !parsedEndDate);

  // Hover state for interactive preview
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  // Exceptions quick lookup map
  const exceptionsMap = useMemo(() => {
    const map = new Map<string, ShiftException>();
    for (const ex of exceptions) {
      map.set(ex.date, ex);
    }
    return map;
  }, [exceptions]);

  // Navigation handlers
  const handlePrevMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));
  const handleGoToToday = () => {
    const today = new Date();
    setCurrentMonth(startOfMonth(today));
  };
  const handleGoToSelected = () => {
    if (parsedStartDate) {
      setCurrentMonth(startOfMonth(parsedStartDate));
    }
  };

  // Days generation for current month view (Monday to Sunday)
  const daysInView = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  // Date selection click handler
  const handleDayClick = (day: Date) => {
    const dayStr = formatToFullDateFast(day);

    if (!isSelectingEnd || !parsedStartDate) {
      // First click: sets start date and enters selecting_end phase
      onRangeChange(dayStr, '');
    } else {
      // Second click:
      if (isBefore(day, parsedStartDate)) {
        // User clicked an earlier date: make it the new start date
        onRangeChange(dayStr, '');
      } else {
        // User clicked same or later date: complete the range
        onRangeChange(formatToFullDateFast(parsedStartDate), dayStr);
      }
    }
  };

  // Quick preset button click
  const handlePresetClick = (daysCount: number) => {
    if (onPresetDays && parsedStartDate) {
      onPresetDays(daysCount);
    } else {
      const baseDate = parsedStartDate || new Date();
      const newEnd = addDays(baseDate, daysCount - 1);
      onRangeChange(formatToFullDateFast(baseDate), formatToFullDateFast(newEnd));
    }
  };

  // Reset / Clear to empty
  const handleReset = () => {
    onRangeChange('', '');
  };

  // Vacation span range boundaries from customAnalysis (preceding/succeeding off days)
  const connectedVacationSpan = useMemo(() => {
    if (!customAnalysis) return null;
    return {
      vacationStartStr: customAnalysis.vacationStartDateStr,
      vacationEndStr: customAnalysis.vacationEndDateStr,
      formalStartStr: customAnalysis.formalStartDateStr,
      formalEndStr: customAnalysis.formalEndDateStr,
      savedFreeDays: customAnalysis.totalVacationDays - customAnalysis.leaveDaysSpent,
    };
  }, [customAnalysis]);

  // Selected range count in days
  const selectedRangeDaysCount = useMemo(() => {
    if (!parsedStartDate || !parsedEndDate || isSelectingEnd) return 0;
    const diff = Math.round((parsedEndDate.getTime() - parsedStartDate.getTime()) / 86400000);
    return Math.max(1, diff + 1);
  }, [parsedStartDate, parsedEndDate, isSelectingEnd]);

  // Human-friendly summary text (e.g. "6 Gün İzin • 11 Gün Tatil" or "6 Gün İzin")
  const leaveSummaryText = useMemo(() => {
    if (!parsedStartDate || !parsedEndDate || isSelectingEnd) return '';
    if (customAnalysis && customAnalysis.leaveDaysSpent !== undefined) {
      const leaveDays = customAnalysis.leaveDaysSpent;
      const totalVacation = customAnalysis.totalVacationDays;
      if (totalVacation > leaveDays) {
        return `${leaveDays} Gün İzin • ${totalVacation} Gün Tatil`;
      }
      return `${leaveDays} Gün İzin`;
    }
    return `${selectedRangeDaysCount} Gün`;
  }, [parsedStartDate, parsedEndDate, isSelectingEnd, customAnalysis, selectedRangeDaysCount]);

  // Boundary validity checks (senelik izin Pazar veya Resmi Tatilde başlayamaz ve bitemez)
  const isStartSunday = parsedStartDate ? isSunday(parsedStartDate) : false;
  const isStartOfficial = parsedStartDate ? isOfficialHoliday(parsedStartDate) : false;
  const isStartInvalid = Boolean(parsedStartDate && !isValidLeaveBoundary(parsedStartDate));

  const isEndSunday = parsedEndDate && !isSelectingEnd ? isSunday(parsedEndDate) : false;
  const isEndOfficial = parsedEndDate && !isSelectingEnd ? isOfficialHoliday(parsedEndDate) : false;
  const isEndInvalid = Boolean(parsedEndDate && !isSelectingEnd && !isValidLeaveBoundary(parsedEndDate));

  const hasAnyInvalidBoundary = isStartInvalid || isEndInvalid;

  const suggestedStartStr = customAnalysis?.hasBoundaryAdjustment
    ? customAnalysis.suggestedStartDateStr
    : undefined;
  const suggestedEndStr = customAnalysis?.hasBoundaryAdjustment
    ? customAnalysis.suggestedEndDateStr
    : undefined;

  return (
    <div className="bg-card rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden select-none">
      {/* 1. Header Toolbar */}
      <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        {/* Month Navigator */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl bg-card border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all cursor-pointer active:scale-90"
            title="Önceki Ay"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 min-w-32 text-center capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: tr })}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl bg-card border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all cursor-pointer active:scale-90"
            title="Sonraki Ay"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleGoToToday}
            className="px-2.5 py-1 text-[11px] font-extrabold rounded-lg bg-slate-200/70 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
          >
            Bugün
          </button>
        </div>

        {/* Quick Presets & Clear */}
        <div className="flex items-center flex-wrap gap-1 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center space-x-1">
            <span className="text-[10.5px] font-bold text-slate-400 mr-1 hidden sm:inline">
              Süre:
            </span>
            {[5, 7, 10, 14].map((cnt) => (
              <button
                key={cnt}
                type="button"
                onClick={() => handlePresetClick(cnt)}
                className={`px-2 py-1 rounded-lg text-[10.5px] font-black transition-all cursor-pointer active:scale-95 ${
                  selectedRangeDaysCount === cnt
                    ? 'bg-primary-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-primary-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400'
                }`}
              >
                +{cnt}g
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            title="Sıfırla"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Interactive Selection Status Banner */}
      <div
        className={`px-3 sm:px-4 py-2.5 border-b transition-colors flex flex-wrap items-center justify-between gap-2 text-xs ${
          hasAnyInvalidBoundary
            ? 'bg-rose-500/10 dark:bg-rose-500/20 border-rose-200 dark:border-rose-900/50'
            : 'bg-primary-500/5 dark:bg-primary-500/10 border-slate-100 dark:border-slate-800/80'
        }`}
      >
        <div className="flex items-center space-x-2 min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              hasAnyInvalidBoundary
                ? 'bg-rose-500 animate-ping'
                : isSelectingEnd
                ? 'bg-amber-500 animate-ping'
                : parsedStartDate && parsedEndDate
                ? 'bg-emerald-500'
                : 'bg-slate-300 dark:bg-slate-600'
            }`}
          />
          {isSelectingEnd ? (
            isStartInvalid ? (
              <div className="flex items-center space-x-1.5 font-black text-rose-700 dark:text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>
                  ⚠️ Başlangıç {isStartSunday ? 'Pazar gününe' : 'Resmi Tatil gününe'} denk geliyor! İzin bu günde başlatılamaz.
                </span>
              </div>
            ) : (
              <span className="font-extrabold text-amber-700 dark:text-amber-300 truncate">
                📍 Başlangıç: {parsedStartDate ? format(parsedStartDate, 'd MMMM', { locale: tr }) : ''} — Şimdi <span className="underline decoration-amber-400 font-black">Bitiş Gününü</span> seçin (veya +5g, +7g tıklayın)
              </span>
            )
          ) : parsedStartDate && parsedEndDate ? (
            hasAnyInvalidBoundary ? (
              <div className="flex items-center space-x-1.5 font-extrabold text-rose-700 dark:text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>
                  ⚠️ {isStartInvalid && isEndInvalid
                    ? 'Başlangıç ve bitiş günleri resmi mevzuata uygun değildir (Pazar/Tatil)!'
                    : isStartInvalid
                    ? `İzin başlangıcı (${isStartSunday ? 'Pazar' : isStartOfficial ? 'Resmi Tatil' : 'Geçersiz Gün'}) mevzuata aykırıdır!`
                    : `İzin bitişi (${isEndSunday ? 'Pazar' : isEndOfficial ? 'Resmi Tatil' : 'Geçersiz Gün'}) mevzuata aykırıdır!`}
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 font-extrabold text-slate-800 dark:text-slate-200 truncate">
                <span>Seçili İzin:</span>
                <span className="text-primary-600 dark:text-primary-400 font-black">
                  {format(parsedStartDate, 'd MMM yyyy', { locale: tr })} –{' '}
                  {format(parsedEndDate, 'd MMM yyyy', { locale: tr })} ({leaveSummaryText})
                </span>
                {customAnalysis?.hasBoundaryAdjustment && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold border border-amber-500/30">
                    ⚠️ Düzeltme Önerisi
                  </span>
                )}
              </div>
            )
          ) : (
            <div className="flex items-center space-x-1.5 font-bold text-slate-500 dark:text-slate-400 truncate">
              <span>🗓️</span>
              <span>Takvimden izin başlangıç gününü seçin</span>
            </div>
          )}
        </div>

        {/* Quick auto fix button on banner if adjustment exists */}
        {hasAnyInvalidBoundary && suggestedStartStr && suggestedEndStr ? (
          <button
            type="button"
            onClick={() => onRangeChange(suggestedStartStr, suggestedEndStr)}
            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-black flex items-center space-x-1 cursor-pointer shadow-xs active:scale-95 transition-all shrink-0"
          >
            <Sparkles className="w-3 h-3" />
            <span>Mevzuata Göre Düzelt</span>
          </button>
        ) : (
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 hidden sm:flex items-center space-x-1">
            <span>💡</span>
            <span>
              {isSelectingEnd
                ? 'Bitiş gününe tıklayın veya hızlı sürelere basın'
                : parsedStartDate && parsedEndDate
                ? 'Yeni aralık için takvime tıklayabilirsiniz'
                : 'Hesaplama için takvimde bir güne tıklayın'}
            </span>
          </div>
        )}
      </div>

      {/* 3. Days of Week Header */}
      <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 text-center bg-slate-50/40 dark:bg-slate-900/20">
        {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((dw, i) => (
          <div
            key={dw}
            className={`py-2 text-[10.5px] sm:text-xs font-black uppercase tracking-wider ${
              i >= 5 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {dw}
          </div>
        ))}
      </div>

      {/* 4. Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-slate-200/70 dark:bg-slate-800/80 p-px">
        {daysInView.map((day) => {
          const dayStr = formatToFullDateFast(day);
          const isCurrMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());
          const isSun = isSunday(day);

          // Shift calculation from active pattern
          const rawShiftDay: ShiftDay | null =
            currentPattern && patternStartDate
              ? getShiftForDate(day, currentPattern, patternStartDate)
              : null;
          const shiftDay = resolveShiftDayWithTypes(rawShiftDay, shiftTypesMap);

          // Holiday calculation
          const holidayDetail = getHolidayDetail(day);
          const isOfficial = Boolean(holidayDetail?.isOfficial);

          // Exception from DB
          const exception = exceptionsMap.get(dayStr);
          const isSavedVacation = exception?.type === 'VACATION';

          // Selection matching
          const isStart = Boolean(parsedStartDate && isSameDay(day, parsedStartDate));
          const isEnd = Boolean(!isSelectingEnd && parsedEndDate && isSameDay(day, parsedEndDate));

          // Suggested boundary matching (for when current selection is invalid)
          const isSuggestedStart = Boolean(
            suggestedStartStr &&
            dayStr === suggestedStartStr &&
            !isStart &&
            isStartInvalid
          );
          const isSuggestedEnd = Boolean(
            suggestedEndStr &&
            dayStr === suggestedEndStr &&
            !isEnd &&
            isEndInvalid
          );

          // In-between calculation
          let isInSelectedRange = false;
          if (parsedStartDate && parsedEndDate && !isSelectingEnd) {
            isInSelectedRange =
              (isAfter(day, parsedStartDate) && isBefore(day, parsedEndDate)) ||
              isStart ||
              isEnd;
          }

          // Hover preview when picking end date
          let isHoveredInRange = false;
          if (isSelectingEnd && parsedStartDate && hoveredDate && !isInSelectedRange) {
            if (isAfter(hoveredDate, parsedStartDate)) {
              isHoveredInRange =
                (isAfter(day, parsedStartDate) && isBefore(day, hoveredDate)) ||
                isSameDay(day, hoveredDate);
            }
          }

          // Connected vacation span from custom analysis (Preceding / Succeeding Off days)
          let isConnectedFreeSpan = false;
          if (connectedVacationSpan && !isInSelectedRange) {
            const spanStart = parseISO(connectedVacationSpan.vacationStartStr);
            const spanEnd = parseISO(connectedVacationSpan.vacationEndStr);
            if (!isNaN(spanStart.getTime()) && !isNaN(spanEnd.getTime())) {
              if (
                (isAfter(day, spanStart) && isBefore(day, spanEnd)) ||
                isSameDay(day, spanStart) ||
                isSameDay(day, spanEnd)
              ) {
                isConnectedFreeSpan = true;
              }
            }
          }

          // Shift colors & visual badges
          const isRest = shiftDay?.type === 'REST' || exception?.type === 'SICK' || isSavedVacation;
          const shiftColor = exception
            ? exception.color
            : shiftDay?.color || (isRest ? '#10b981' : '#3b82f6');
          const shiftName = exception?.name || shiftDay?.name || (isRest ? 'Off' : '');

          return (
            <div
              key={dayStr}
              data-date={dayStr}
              onClick={() => handleDayClick(day)}
              onMouseEnter={() => setHoveredDate(day)}
              onMouseLeave={() => setHoveredDate(null)}
              className={`
                relative min-h-[56px] sm:min-h-[66px] p-1 sm:p-1.5 flex flex-col justify-between cursor-pointer transition-all duration-75 select-none
                ${
                  !isCurrMonth
                    ? 'bg-slate-50/40 dark:bg-slate-900/30 opacity-40 hover:opacity-80'
                    : 'bg-card hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                }
                ${
                  isInSelectedRange
                    ? '!bg-primary-500/15 dark:!bg-primary-500/25 ring-1 ring-inset ring-primary-500/40'
                    : ''
                }
                ${
                  isHoveredInRange
                    ? '!bg-primary-500/10 dark:!bg-primary-500/15 border-dashed border-primary-400/40'
                    : ''
                }
                ${
                  isConnectedFreeSpan
                    ? '!bg-emerald-500/10 dark:!bg-emerald-500/15 border-y border-dashed border-emerald-500/40'
                    : ''
                }
                ${
                  isStart
                    ? isStartInvalid
                      ? 'ring-2 ring-rose-500 !bg-rose-500/20 dark:!bg-rose-500/30 z-20 rounded-l-xl shadow-md shadow-rose-500/20'
                      : 'ring-2 ring-primary-500 z-20 rounded-l-xl shadow-xs'
                    : ''
                }
                ${
                  isEnd
                    ? isEndInvalid
                      ? 'ring-2 ring-rose-500 !bg-rose-500/20 dark:!bg-rose-500/30 z-20 rounded-r-xl shadow-md shadow-rose-500/20'
                      : 'ring-2 ring-primary-500 z-20 rounded-r-xl shadow-xs'
                    : ''
                }
                ${isStart && isEnd ? '!rounded-xl' : ''}
                ${
                  isSuggestedStart || isSuggestedEnd
                    ? 'ring-2 ring-dashed ring-amber-500 dark:ring-amber-400 !bg-amber-500/10 z-15 rounded-xl'
                    : ''
                }
              `}
            >
              {/* Today Frame Overlay */}
              {isToday && !isInSelectedRange && !isStart && !isEnd && (
                <div className="absolute inset-0 border-[3px] border-slate-900 dark:border-white pointer-events-none z-0 rounded-xl" />
              )}

              {/* Day Number and Today Indicator */}
              <div className="flex items-center justify-between w-full leading-none z-10">
                <span
                  className={`text-xs sm:text-sm font-black transition-all ${
                    isStart && isStartInvalid
                      ? 'bg-rose-600 text-white w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full flex items-center justify-center shadow-xs text-[10px] sm:text-xs animate-pulse ring-2 ring-rose-300 dark:ring-rose-800'
                      : isEnd && isEndInvalid
                      ? 'bg-rose-600 text-white w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full flex items-center justify-center shadow-xs text-[10px] sm:text-xs animate-pulse ring-2 ring-rose-300 dark:ring-rose-800'
                      : isStart || isEnd
                      ? 'bg-primary-600 text-white w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full flex items-center justify-center shadow-xs text-[10px] sm:text-xs'
                      : isToday
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 w-5 h-5 rounded-full flex items-center justify-center text-[10.5px] font-black ring-2 ring-white/50 dark:ring-black/50'
                      : isSuggestedStart || isSuggestedEnd
                      ? 'text-amber-600 dark:text-amber-400 underline font-black'
                      : isSun
                      ? 'text-rose-600 dark:text-rose-400'
                      : isCurrMonth
                      ? 'text-slate-800 dark:text-slate-200'
                      : 'text-slate-400 dark:text-slate-600'
                  }`}
                >
                  {format(day, 'd')}
                </span>

                {/* Holiday Badge, Free Span Pill, or Sunday inside selection */}
                {holidayDetail ? (
                  <span
                    className={`text-[8px] sm:text-[9px] font-black px-1 py-0.2 rounded-md truncate max-w-[50px] sm:max-w-[70px] ${
                      isOfficial
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                    }`}
                    title={`${holidayDetail.name}${isOfficial ? ' • Resmi Tatil (İzinden Düşmez)' : ''}`}
                  >
                    {holidayDetail.shortName || 'Tatil'}
                  </span>
                ) : isConnectedFreeSpan ? (
                  <span
                    className="text-[7.5px] sm:text-[8.5px] font-black px-1 py-0.2 rounded-xs bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 uppercase truncate"
                    title="Vardiya Off (Bedava Tatil - İzinden Düşmez)"
                  >
                    {isRest ? 'Off+' : 'Tatil'}
                  </span>
                ) : isInSelectedRange && isSun ? (
                  <span
                    className="text-[7.5px] sm:text-[8.5px] font-black px-1 py-0.2 rounded-xs bg-blue-500/20 text-blue-700 dark:text-blue-300 uppercase truncate"
                    title="Pazar Hafta Tatili (İzinden Düşmez)"
                  >
                    Pazar
                  </span>
                ) : isSavedVacation ? (
                  <span
                    className="text-[8px] font-black px-1 py-0.2 rounded-xs bg-amber-500/20 text-amber-700 dark:text-amber-300"
                    title="Kayıtlı İzin"
                  >
                    İzinli
                  </span>
                ) : null}
              </div>

              {/* Shift Information (Name / Badge / Dot) */}
              <div className="w-full mt-1">
                {shiftDay ? (
                  <div
                    style={{
                      color: shiftColor,
                      backgroundColor: `${shiftColor}15`,
                      borderColor: `${shiftColor}30`,
                    }}
                    className={`border rounded-md px-1 py-0.5 text-[8.5px] sm:text-[9.5px] font-extrabold flex items-center justify-between gap-0.5 truncate leading-tight`}
                  >
                    <span className="truncate">{shiftName}</span>
                    {shiftDay.type === 'REST' ? (
                      <span className="text-[7.5px] opacity-80 font-black">OFF</span>
                    ) : null}
                  </div>
                ) : (
                  <div className="h-3" />
                )}
              </div>

              {/* Start / End Floating Badges */}
              {isStart && (
                <div
                  className={`absolute -top-2 left-1 text-white font-black text-[7.5px] sm:text-[8px] px-1 py-0.2 rounded-xs shadow-xs uppercase tracking-tight z-30 ${
                    isStartInvalid
                      ? 'bg-rose-600 shadow-rose-600/30 animate-pulse'
                      : 'bg-primary-600'
                  }`}
                >
                  {isStartInvalid
                    ? isStartSunday
                      ? '⚠️ Pazar Başlayamaz'
                      : '⚠️ Tatilde Başlayamaz'
                    : isStart && isEnd
                    ? '1 Gün İzin'
                    : 'İzin Başı'}
                </div>
              )}
              {isEnd && !isStart && (
                <div
                  className={`absolute -top-2 right-1 text-white font-black text-[7.5px] sm:text-[8px] px-1 py-0.2 rounded-xs shadow-xs uppercase tracking-tight z-30 ${
                    isEndInvalid
                      ? 'bg-rose-600 shadow-rose-600/30 animate-pulse'
                      : 'bg-primary-600'
                  }`}
                >
                  {isEndInvalid
                    ? isEndSunday
                      ? '⚠️ Pazar Bitemez'
                      : '⚠️ Tatilde Bitemez'
                    : 'İzin Sonu'}
                </div>
              )}

              {/* Suggested boundary ghost indicator badges */}
              {isSuggestedStart && (
                <div className="absolute -top-2 left-1 bg-amber-500 text-slate-950 font-black text-[7px] sm:text-[7.5px] px-1 py-0.2 rounded-xs shadow-xs uppercase tracking-tight z-30 animate-bounce">
                  💡 Önerilen Başlangıç
                </div>
              )}
              {isSuggestedEnd && (
                <div className="absolute -top-2 right-1 bg-amber-500 text-slate-950 font-black text-[7px] sm:text-[7.5px] px-1 py-0.2 rounded-xs shadow-xs uppercase tracking-tight z-30 animate-bounce">
                  💡 Önerilen Bitiş
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 5. Footer Legend & Quick Summary */}
      <div className="p-3 bg-slate-50/70 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-400">
        {/* Legend */}
        <div className="flex items-center flex-wrap gap-2.5 sm:gap-3.5">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-md bg-primary-500 ring-2 ring-primary-300 dark:ring-primary-700" />
            <span>Seçilen İzin</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500/20 border border-emerald-500/50" />
            <span>Off / Bedava</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-md bg-rose-500/20 border border-rose-500/50" />
            <span>Resmi Tatil</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-md bg-blue-500/20 border border-blue-500/50" />
            <span>Pazar (Düşmez)</span>
          </div>

          {hasAnyInvalidBoundary && (
            <div className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400 font-black">
              <span className="w-3 h-3 rounded-md bg-rose-500 ring-2 ring-rose-300 dark:ring-rose-800" />
              <span>Hatalı Seçim</span>
            </div>
          )}

          {customAnalysis?.hasBoundaryAdjustment && (
            <div className="flex items-center space-x-1.5 text-amber-600 dark:text-amber-400 font-black">
              <span className="w-3 h-3 rounded-md border-2 border-dashed border-amber-500 bg-amber-500/20" />
              <span>Önerilen Gün</span>
            </div>
          )}
        </div>

        {/* Selected Date Range Jump Action */}
        {parsedStartDate && (
          <button
            type="button"
            onClick={handleGoToSelected}
            className="text-[10.5px] font-extrabold text-primary-600 dark:text-primary-400 hover:underline cursor-pointer flex items-center space-x-1"
          >
            <CalendarIcon className="w-3 h-3" />
            <span>Seçili Aya Git</span>
          </button>
        )}
      </div>
    </div>
  );
};
