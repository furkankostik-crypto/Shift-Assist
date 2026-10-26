import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, differenceInCalendarDays, startOfDay } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import {
  CalendarHeart,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  Coffee,
  Sparkles,
  GraduationCap,
  Sun,
  BookOpen,
  School,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ShiftType } from '../db/db';
import { useAppStore } from '../store/useAppStore';
import {
  getHolidaysForYear,
  getSchoolHolidaysForYear,
  schoolPeriodToHolidayItem,
  SUPPORTED_HOLIDAY_YEARS,
  type YearHolidayItem,
} from '../utils/holidays';
import { getShiftForDate, resolveShiftDayWithTypes } from '../utils/shiftLogic';
import { ShiftIcon } from '../utils/shiftIcons';
import { hapticTap } from '../utils/haptics';

type FilterTab = 'OFFICIAL' | 'SCHOOL' | 'ALL' | 'NATIONAL' | 'RELIGIOUS' | 'SPECIAL';

export const HolidaysPage: React.FC = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const dateLocale = i18n.language?.startsWith('tr') ? tr : enUS;

  const { setSelectedDate, setIsDayDetailOpen } = useAppStore();

  const currentYear = new Date().getFullYear();
  const initialYear = SUPPORTED_HOLIDAY_YEARS.includes(currentYear)
    ? currentYear
    : 2026;

  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('OFFICIAL');

  // Load shift data to show which shift falls on each holiday
  const dbData = useLiveQuery(async () => {
    const [patterns, activePatterns, exceptions, shiftTypes] = await Promise.all([
      db.patterns.toArray(),
      db.activePatterns.toArray(),
      db.exceptions.toArray(),
      db.shiftTypes.toArray(),
    ]);
    return { patterns, activePatterns, exceptions, shiftTypes };
  }, []);

  const activePatternObj = dbData?.activePatterns?.[0];
  const currentPattern = useMemo(
    () => dbData?.patterns?.find((p) => p.id === activePatternObj?.patternId),
    [dbData?.patterns, activePatternObj?.patternId]
  );

  const shiftTypesMap = useMemo(() => {
    const map = new Map<string, ShiftType>();
    if (dbData?.shiftTypes) {
      for (const st of dbData.shiftTypes) {
        map.set(st.id, st);
      }
    }
    return map;
  }, [dbData?.shiftTypes]);

  const exceptionsMap = useMemo(() => {
    const map = new Map<string, NonNullable<typeof dbData>['exceptions'][number]>();
    if (dbData?.exceptions) {
      for (const ex of dbData.exceptions) {
        map.set(ex.date, ex);
      }
    }
    return map;
  }, [dbData?.exceptions]);

  const holidayShiftType = useMemo(
    () =>
      dbData?.shiftTypes?.find(
        (st) => st.systemCategory === 'HOLIDAY' || st.id === 'st-holiday'
      ),
    [dbData?.shiftTypes]
  );

  const vacationShiftType = useMemo(
    () =>
      dbData?.shiftTypes?.find(
        (st) =>
          st.systemCategory === 'VACATION' ||
          st.id === 'st-vacation' ||
          st.id === 'st-leave'
      ),
    [dbData?.shiftTypes]
  );

  const customHolidayColor = holidayShiftType?.color || '#e11d48';
  const customVacationColor = vacationShiftType?.color || '#f59e0b';
  const customVacationIcon = vacationShiftType?.icon || 'Palmtree';
  const customVacationName = vacationShiftType?.name || 'Yıllık İzin';

  // Get all standard holidays for selected year
  const yearHolidays = useMemo(
    () => getHolidaysForYear(selectedYear),
    [selectedYear]
  );

  // Get school holiday periods (MEB: Sömestr, Ara Tatiller, Yaz Tatili)
  const schoolHolidays = useMemo(
    () => getSchoolHolidaysForYear(selectedYear),
    [selectedYear]
  );

  const schoolHolidayItems = useMemo(
    () => schoolHolidays.map(schoolPeriodToHolidayItem),
    [schoolHolidays]
  );

  // Filter holidays based on selected tab
  const filteredHolidays = useMemo(() => {
    if (activeFilter === 'SCHOOL') {
      return schoolHolidayItems;
    }
    if (activeFilter === 'OFFICIAL') {
      return yearHolidays.filter((item) => item.isOfficial);
    }
    if (activeFilter === 'NATIONAL') {
      return yearHolidays.filter(
        (item) =>
          item.type === 'national' ||
          (item.type === 'eve' && item.dateStr.endsWith('10-28'))
      );
    }
    if (activeFilter === 'RELIGIOUS') {
      return yearHolidays.filter(
        (item) =>
          item.type === 'religious' ||
          (item.type === 'eve' && !item.dateStr.endsWith('10-28'))
      );
    }
    if (activeFilter === 'SPECIAL') {
      return yearHolidays.filter(
        (item) => !item.isOfficial && item.type !== 'school'
      );
    }
    // ALL: Combine single holidays and school periods, chronologically sorted
    const combined = [...yearHolidays, ...schoolHolidayItems];
    combined.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    return combined;
  }, [yearHolidays, schoolHolidayItems, activeFilter]);

  // Calculate summary stats for official holidays in the selected year
  const officialStats = useMemo(() => {
    const officialItems = yearHolidays.filter((h) => h.isOfficial);
    const uniqueOfficialMap = new Map<string, YearHolidayItem>();
    for (const item of officialItems) {
      const existing = uniqueOfficialMap.get(item.dateStr);
      if (!existing || (!item.isHalfDay && existing.isHalfDay)) {
        uniqueOfficialMap.set(item.dateStr, item);
      }
    }

    let totalOfficialDays = 0;
    let workHolidayCount = 0;
    let restHolidayCount = 0;

    uniqueOfficialMap.forEach((item) => {
      totalOfficialDays += item.isHalfDay ? 0.5 : 1;
      if (activePatternObj && currentPattern) {
        const ex = exceptionsMap.get(item.dateStr);
        const rawShift = getShiftForDate(
          item.date,
          currentPattern as any,
          activePatternObj.startDate
        );
        const resolved = resolveShiftDayWithTypes(rawShift, shiftTypesMap);
        if (
          ex?.type === 'VACATION' ||
          ex?.type === 'SICK' ||
          resolved?.type === 'REST'
        ) {
          restHolidayCount += 1;
        } else if (resolved?.type === 'WORK') {
          workHolidayCount += 1;
        }
      }
    });

    return {
      totalOfficialDays,
      officialCount: uniqueOfficialMap.size,
      workHolidayCount,
      restHolidayCount,
    };
  }, [yearHolidays, activePatternObj, currentPattern, exceptionsMap, shiftTypesMap]);

  const today = useMemo(() => startOfDay(new Date()), []);

  const handleSelectHoliday = (item: YearHolidayItem) => {
    hapticTap();
    setSelectedDate(item.date);
    setIsDayDetailOpen(true);
    navigate('/');
  };

  const handleSelectSchoolHoliday = (item: YearHolidayItem) => {
    hapticTap();
    setSelectedDate(item.date);
    navigate('/');
  };

  return (
    <div className="flex-1 flex flex-col p-2.5 sm:p-4 max-w-4xl mx-auto w-full pb-[calc(5rem+var(--sab))] select-none">
      {/* Top Quick Back Navigation */}
      <div className="mb-2 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-card hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-primary-600 dark:hover:text-primary-400 border border-slate-200/90 dark:border-slate-800 shadow-2xs transition-all text-xs font-bold active:scale-95 group cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
          <span>Takvime Dön</span>
        </Link>
      </div>

      {/* Header with Title and Year Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 mb-3">
        <div className="flex items-center space-x-2.5">
          <div
            style={{ backgroundColor: customHolidayColor }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-white flex items-center justify-center shadow-md shrink-0"
          >
            <CalendarHeart className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <span>Resmi Tatiller & Özel Günler</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 font-black">
                {selectedYear}
              </span>
            </h1>
            <p className="text-[10.5px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
              Milli ve dini bayramlar, MEB okul tatilleri ve vardiya durumu
            </p>
          </div>
        </div>

        {/* Year Selector Pills */}
        <div className="flex items-center space-x-1 bg-card border border-slate-200/90 dark:border-slate-800 p-1 rounded-xl shadow-2xs self-stretch sm:self-auto overflow-x-auto no-scrollbar justify-start sm:justify-center">
          {SUPPORTED_HOLIDAY_YEARS.map((yr) => (
            <button
              key={yr}
              onClick={() => {
                hapticTap();
                setSelectedYear(yr);
              }}
              className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer shrink-0 ${
                selectedYear === yr
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {yr}
            </button>
          ))}
        </div>
      </div>

      {/* Annual Summary Banner (Compact 2x2 Grid on Mobile, 4-Col on Desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {/* Total Official Holidays */}
        <div className="bg-card border border-rose-200/60 dark:border-rose-900/40 rounded-xl p-2.5 shadow-2xs flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 font-black text-xs">
            🇹🇷
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate">
              Resmi Tatil
            </div>
            <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
              {officialStats.totalOfficialDays} Gün
            </div>
          </div>
        </div>

        {/* Rest Holiday Count */}
        <div className="bg-card border border-emerald-200/60 dark:border-emerald-900/40 rounded-xl p-2.5 shadow-2xs flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Coffee className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate">
              İstirahat
            </div>
            <div className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
              {currentPattern ? `${officialStats.restHolidayCount} Gün` : '—'}
            </div>
          </div>
        </div>

        {/* Work Holiday Count */}
        <div className="bg-card border border-amber-200/60 dark:border-amber-900/40 rounded-xl p-2.5 shadow-2xs flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate">
              Mesaiye Denk
            </div>
            <div className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400">
              {currentPattern ? `${officialStats.workHolidayCount} Gün` : '—'}
            </div>
          </div>
        </div>

        {/* School Holidays Shortcut Pill */}
        <button
          type="button"
          onClick={() => {
            hapticTap();
            setActiveFilter('SCHOOL');
          }}
          className={`bg-card border rounded-xl p-2.5 shadow-2xs flex items-center space-x-2 text-left transition-all cursor-pointer ${
            activeFilter === 'SCHOOL'
              ? 'border-sky-500 ring-1 ring-sky-500/40 bg-sky-500/10 dark:bg-sky-950/30'
              : 'border-sky-200/60 dark:border-sky-900/40 hover:border-sky-400'
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-sky-500/15 dark:bg-sky-500/25 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <School className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate">
              Okul Tatilleri
            </div>
            <div className="text-xs sm:text-sm font-black text-sky-600 dark:text-sky-400 flex items-center gap-1">
              <span>{schoolHolidays.length} Dönem</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-sky-500/20 text-sky-700 dark:text-sky-300 font-bold">MEB</span>
            </div>
          </div>
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-2.5 pb-0.5">
        {(
          [
            { id: 'OFFICIAL', label: 'Resmi Tatiller' },
            { id: 'SCHOOL', label: 'Okul Tatilleri 🎒' },
            { id: 'ALL', label: 'Tüm Takvim' },
            { id: 'NATIONAL', label: 'Milli Bayramlar' },
            { id: 'RELIGIOUS', label: 'Dini Bayramlar' },
            { id: 'SPECIAL', label: 'Anma & Özel' },
          ] as { id: FilterTab; label: string }[]
        ).map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                hapticTap();
                setActiveFilter(tab.id);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
                isActive
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                  : 'bg-card border border-slate-200/90 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Holidays & School Breaks List */}
      <div className="space-y-1.5 sm:space-y-2">
        {filteredHolidays.map((item) => {
          const isSchoolRange = Boolean(item.isRange || item.type === 'school');

          // School Holiday Period Card Render
          if (isSchoolRange) {
            const isOngoing = item.endDate
              ? differenceInCalendarDays(today, item.date) >= 0 &&
                differenceInCalendarDays(item.endDate, today) >= 0
              : false;
            const diffDaysStart = differenceInCalendarDays(item.date, today);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectSchoolHoliday(item)}
                className={`w-full text-left bg-card hover:bg-slate-50 dark:hover:bg-slate-800/90 border rounded-xl p-2.5 sm:p-3 shadow-2xs hover:shadow-xs transition-all active:scale-[0.99] flex items-center justify-between gap-2.5 cursor-pointer group relative overflow-hidden ${
                  isOngoing
                    ? 'border-emerald-500/80 ring-1 ring-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/20'
                    : 'border-sky-200/80 dark:border-sky-900/50 hover:border-sky-400 dark:hover:border-sky-700'
                }`}
              >
                {/* Active Left Indicator Bar */}
                <div
                  className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full ${
                    isOngoing
                      ? 'bg-emerald-500'
                      : 'bg-gradient-to-b from-sky-400 to-indigo-500'
                  }`}
                />

                {/* Left: Icon & Days Badge */}
                <div className="flex items-center space-x-2.5 min-w-0 flex-1 pl-1.5">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl border border-sky-400/40 bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex flex-col items-center justify-center shrink-0 shadow-2xs">
                    {item.name.includes('Yaz') ? (
                      <Sun className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                    ) : item.name.includes('Sömestr') ||
                      item.name.includes('Yarıyıl') ? (
                      <GraduationCap className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                    ) : (
                      <BookOpen className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                    )}
                    <span className="text-[9.5px] font-black leading-none mt-0.5 text-sky-700 dark:text-sky-300">
                      {item.daysCount}G
                    </span>
                  </div>

                  {/* Center: Title & Period Span */}
                  <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-black text-xs sm:text-[13px] text-slate-900 dark:text-slate-100 truncate">
                        {item.name}
                      </span>
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 shrink-0">
                        Okul Tatili • {item.daysCount} Gün
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                      <span>
                        {item.endDate
                          ? `${format(item.date, 'd MMM', { locale: dateLocale })} - ${format(item.endDate, 'd MMM yyyy', { locale: dateLocale })}`
                          : format(item.date, 'd MMMM yyyy', { locale: dateLocale })}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      {isOngoing ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-black flex items-center gap-1 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Tatil Sürüyor
                        </span>
                      ) : diffDaysStart > 0 ? (
                        <span className="text-sky-600 dark:text-sky-400 font-bold shrink-0">
                          {diffDaysStart} gün kaldı
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 font-medium shrink-0">
                          Bitti
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: School Closed Pill & Chevron */}
                <div className="flex items-center space-x-1.5 shrink-0">
                  <div className="hidden xs:flex items-center space-x-1 px-2 py-1 rounded-lg bg-sky-500/10 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30 text-[10px] font-black">
                    <School className="w-3 h-3 shrink-0" />
                    <span>Okul Kapalı</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              </button>
            );
          }

          // Single Day Holiday Card Render
          const exception = exceptionsMap.get(item.dateStr);
          const rawShiftDay =
            activePatternObj && currentPattern
              ? getShiftForDate(
                  item.date,
                  currentPattern as any,
                  activePatternObj.startDate
                )
              : null;
          const shiftDay = resolveShiftDayWithTypes(rawShiftDay, shiftTypesMap);

          const isVacation = exception?.type === 'VACATION';
          const shiftLabel = isVacation
            ? customVacationName
            : exception?.name || shiftDay?.name;
          const shiftColor = isVacation
            ? customVacationColor
            : exception?.color || shiftDay?.color;
          const shiftIconName = isVacation
            ? customVacationIcon
            : shiftDay?.icon;
          const isRest =
            isVacation ||
            exception?.type === 'SICK' ||
            shiftDay?.type === 'REST';

          const diffDays = differenceInCalendarDays(item.date, today);
          const isTodayItem = diffDays === 0;

          // Color themes by holiday type
          const isReligious = item.type === 'religious';
          const isCommemoration =
            item.type === 'commemoration' || item.type === 'special';

          const accentGradient = item.isOfficial
            ? isReligious
              ? 'from-emerald-500 to-teal-600'
              : 'from-rose-500 to-rose-600'
            : isCommemoration
              ? 'from-purple-500 to-indigo-600'
              : 'from-slate-400 to-slate-500';

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectHoliday(item)}
              className={`w-full text-left bg-card hover:bg-slate-50 dark:hover:bg-slate-800/90 border rounded-xl p-2.5 sm:p-3 shadow-2xs hover:shadow-xs transition-all active:scale-[0.99] flex items-center justify-between gap-2.5 cursor-pointer group relative overflow-hidden ${
                isTodayItem
                  ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/20'
                  : 'border-slate-200/90 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Active Left Indicator Bar */}
              <div
                className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full ${
                  isTodayItem
                    ? 'bg-emerald-500'
                    : `bg-gradient-to-b ${accentGradient}`
                }`}
              />

              {/* Left: Compact Date Badge + Holiday Info */}
              <div className="flex items-center space-x-2.5 min-w-0 flex-1 pl-1.5">
                {/* Date Badge */}
                <div
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl border flex flex-col items-center justify-center shrink-0 shadow-2xs ${
                    item.isOfficial
                      ? isReligious
                        ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/30 text-rose-600 dark:text-rose-400'
                      : 'bg-purple-500/10 dark:bg-purple-500/20 border-purple-500/30 text-purple-600 dark:text-purple-400'
                  }`}
                >
                  <span className="text-[9.5px] font-black uppercase tracking-wider leading-none">
                    {format(item.date, 'MMM', { locale: dateLocale })}
                  </span>
                  <span className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 leading-none mt-0.5">
                    {format(item.date, 'd')}
                  </span>
                </div>

                {/* Holiday Title & Meta (Compact 2-Line Hierarchy) */}
                <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-black text-xs sm:text-[13px] text-slate-900 dark:text-slate-100 truncate">
                      {item.name}
                    </span>

                    {item.isHalfDay ? (
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
                        Yarım Gün
                      </span>
                    ) : item.isOfficial ? (
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.2 rounded-md border shrink-0 ${
                          isReligious
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                        }`}
                      >
                        Resmi Tatil
                      </span>
                    ) : (
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 shrink-0 flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Özel Gün</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                    <span>
                      {format(item.date, 'd MMMM, EEE', {
                        locale: dateLocale,
                      })}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    {isTodayItem ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-black flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Bugün
                      </span>
                    ) : diffDays > 0 ? (
                      <span className="text-primary-600 dark:text-primary-400 font-bold shrink-0">
                        {diffDays} gün kaldı
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 font-medium shrink-0">
                        Geçti
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Shift Status on That Day + Chevron */}
              <div className="flex items-center space-x-1.5 shrink-0">
                {shiftLabel && shiftColor ? (
                  <div
                    style={{
                      backgroundColor: `${shiftColor}18`,
                      color: shiftColor,
                      borderColor: `${shiftColor}40`,
                    }}
                    className="px-2 py-1 rounded-lg border flex items-center space-x-1 text-[10.5px] font-black shadow-2xs"
                  >
                    <ShiftIcon
                      icon={shiftIconName}
                      type={isRest ? 'REST' : 'WORK'}
                      name={shiftLabel}
                      className="w-3.5 h-3.5 shrink-0"
                    />
                    <span className="max-w-[70px] sm:max-w-[100px] truncate">
                      {shiftLabel}
                    </span>
                  </div>
                ) : (
                  <span className="hidden sm:inline-flex items-center space-x-1 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                    <CalendarDays className="w-3 h-3" />
                    <span>Takvim</span>
                  </span>
                )}

                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default HolidaysPage;
