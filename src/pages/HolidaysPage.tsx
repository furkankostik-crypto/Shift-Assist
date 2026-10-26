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
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ShiftType } from '../db/db';
import { useAppStore } from '../store/useAppStore';
import {
  getHolidaysForYear,
  SUPPORTED_HOLIDAY_YEARS,
  type YearHolidayItem,
} from '../utils/holidays';
import { getShiftForDate, resolveShiftDayWithTypes } from '../utils/shiftLogic';
import { ShiftIcon } from '../utils/shiftIcons';
import { hapticTap } from '../utils/haptics';

type FilterTab = 'OFFICIAL' | 'ALL' | 'NATIONAL' | 'RELIGIOUS' | 'SPECIAL';

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

  // Get all holidays for selected year
  const yearHolidays = useMemo(
    () => getHolidaysForYear(selectedYear),
    [selectedYear]
  );

  // Filter holidays based on selected tab
  const filteredHolidays = useMemo(() => {
    return yearHolidays.filter((item) => {
      if (activeFilter === 'OFFICIAL') return item.isOfficial;
      if (activeFilter === 'NATIONAL') return item.type === 'national' || (item.type === 'eve' && item.dateStr.endsWith('10-28'));
      if (activeFilter === 'RELIGIOUS') return item.type === 'religious' || (item.type === 'eve' && !item.dateStr.endsWith('10-28'));
      if (activeFilter === 'SPECIAL') return !item.isOfficial;
      return true;
    });
  }, [yearHolidays, activeFilter]);

  // Calculate summary stats for official holidays in the selected year
  const officialStats = useMemo(() => {
    const officialItems = yearHolidays.filter((h) => h.isOfficial);
    // Deduplicate by dateStr for exact day count (in case national & religious overlap)
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
        if (ex?.type === 'VACATION' || ex?.type === 'SICK' || resolved?.type === 'REST') {
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

  return (
    <div className="flex-1 flex flex-col p-3 sm:p-4 max-w-4xl mx-auto w-full pb-[calc(5rem+var(--sab))] select-none">
      {/* Top Quick Back Navigation */}
      <div className="mb-2.5 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-card hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-primary-600 dark:hover:text-primary-400 border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-all text-xs font-bold active:scale-95 group cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
          <span>Takvime Dön</span>
        </Link>
      </div>

      {/* Header with Title and Year Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3.5">
        <div className="flex items-center space-x-2.5">
          <div
            style={{ backgroundColor: customHolidayColor }}
            className="w-10 h-10 rounded-2xl text-white flex items-center justify-center shadow-md shrink-0"
          >
            <CalendarHeart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <span>Resmi Tatiller & Özel Günler</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-extrabold">
                {selectedYear}
              </span>
            </h1>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
              Senelik resmi tatil listesi • Takvimde görmek için güne dokunun
            </p>
          </div>
        </div>

        {/* Year Selector Pills */}
        <div className="flex items-center space-x-1 bg-card border border-slate-200/80 dark:border-slate-800 p-1 rounded-2xl shadow-2xs self-stretch sm:self-auto overflow-x-auto no-scrollbar justify-start sm:justify-center">
          {SUPPORTED_HOLIDAY_YEARS.map((yr) => (
            <button
              key={yr}
              onClick={() => {
                hapticTap();
                setSelectedYear(yr);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
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

      {/* Annual Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-3.5">
        <div className="bg-card border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-2xs flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 font-black text-xs">
            🇹🇷
          </div>
          <div className="min-w-0">
            <div className="text-[10.5px] font-bold text-slate-400 dark:text-slate-500 truncate">
              Toplam Resmi Tatil
            </div>
            <div className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
              {officialStats.totalOfficialDays} Gün
            </div>
          </div>
        </div>

        <div className="bg-card border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-2xs flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Coffee className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10.5px] font-bold text-slate-400 dark:text-slate-500 truncate">
              İstirahate Denk Gelen
            </div>
            <div className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400">
              {currentPattern ? `${officialStats.restHolidayCount} Gün` : '—'}
            </div>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-card border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-2xs flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10.5px] font-bold text-slate-400 dark:text-slate-500 truncate">
              Mesaiye Denk Gelen
            </div>
            <div className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400">
              {currentPattern ? `${officialStats.workHolidayCount} Gün` : 'Düzen Seçilmedi'}
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-3 pb-0.5">
        {(
          [
            { id: 'OFFICIAL', label: 'Resmi Tatiller' },
            { id: 'ALL', label: 'Tüm Özel Günler' },
            { id: 'NATIONAL', label: 'Milli Bayramlar' },
            { id: 'RELIGIOUS', label: 'Dini Bayramlar' },
            { id: 'SPECIAL', label: 'Anma & Özel Günler' },
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
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                  : 'bg-card border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Holidays List */}
      <div className="space-y-2">
        {filteredHolidays.map((item) => {
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
          const isPast = diffDays < 0;
          const isTodayItem = diffDays === 0;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectHoliday(item)}
              className={`w-full text-left bg-card hover:bg-slate-50/90 dark:hover:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 sm:p-3.5 shadow-2xs transition-all active:scale-[0.99] flex items-center justify-between gap-3 cursor-pointer group ${
                isPast ? 'opacity-75 hover:opacity-100' : ''
              }`}
            >
              {/* Left: Date Box + Holiday Info */}
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                {/* Date Badge */}
                <div
                  style={{
                    borderColor: item.isOfficial
                      ? `${customHolidayColor}45`
                      : undefined,
                    backgroundColor: item.isOfficial
                      ? `${customHolidayColor}12`
                      : undefined,
                  }}
                  className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl border flex flex-col items-center justify-center shrink-0 ${
                    !item.isOfficial
                      ? 'bg-slate-100/80 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80'
                      : ''
                  }`}
                >
                  <span
                    style={{
                      color: item.isOfficial ? customHolidayColor : undefined,
                    }}
                    className={`text-[10px] font-black uppercase tracking-wider leading-none ${
                      !item.isOfficial
                        ? 'text-slate-500 dark:text-slate-400'
                        : ''
                    }`}
                  >
                    {format(item.date, 'MMM', { locale: dateLocale })}
                  </span>
                  <span className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 leading-tight mt-0.5">
                    {format(item.date, 'd')}
                  </span>
                </div>

                {/* Holiday Title & Meta */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                      {item.name}
                    </span>

                    {item.isHalfDay ? (
                      <span className="text-[9.5px] font-extrabold px-2 py-0.2 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
                        Yarım Gün (Arife)
                      </span>
                    ) : item.isOfficial ? (
                      <span
                        style={{
                          backgroundColor: `${customHolidayColor}15`,
                          color: customHolidayColor,
                          borderColor: `${customHolidayColor}35`,
                        }}
                        className="text-[9.5px] font-extrabold px-2 py-0.2 rounded-full border shrink-0"
                      >
                        Resmi Tatil
                      </span>
                    ) : (
                      <span className="text-[9.5px] font-extrabold px-2 py-0.2 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 shrink-0 flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Özel Gün</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex-wrap">
                    <span>
                      {format(item.date, 'd MMMM yyyy, EEEE', {
                        locale: dateLocale,
                      })}
                    </span>
                    <span>•</span>
                    {isTodayItem ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                        Bugün
                      </span>
                    ) : diffDays > 0 ? (
                      <span className="text-primary-600 dark:text-primary-400 font-bold">
                        {diffDays} gün kaldı
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">
                        Geçti
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Shift Status on That Day + Chevron */}
              <div className="flex items-center space-x-2 shrink-0">
                {shiftLabel && shiftColor ? (
                  <div
                    style={{
                      backgroundColor: `${shiftColor}18`,
                      color: shiftColor,
                      borderColor: `${shiftColor}40`,
                    }}
                    className="px-2.5 py-1.5 rounded-xl border flex items-center space-x-1.5 text-[11px] font-extrabold shadow-2xs"
                  >
                    <ShiftIcon
                      icon={shiftIconName}
                      type={isRest ? 'REST' : 'WORK'}
                      name={shiftLabel}
                      className="w-3.5 h-3.5 shrink-0"
                    />
                    <span className="max-w-[85px] sm:max-w-[120px] truncate">
                      {shiftLabel}
                    </span>
                  </div>
                ) : (
                  <span className="hidden sm:inline-flex items-center space-x-1 text-[11px] font-bold text-slate-400 dark:text-slate-500">
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>Takvimde Gör</span>
                  </span>
                )}

                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default HolidaysPage;
