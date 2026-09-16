import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO, isSunday } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import {
  Palmtree,
  Sparkles,
  Plus,
  CalendarCheck2,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  Trash2,
  Calendar,
  CalendarDays,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { db, type ShiftPattern, type ShiftException } from '../db/db';
import { useAppStore } from '../store/useAppStore';
import {
  getLeavePeriod,
  LEAVE_PERIODS_INFO,
  type LeavePeriod,
} from '../utils/leavePlanner';
import { isOfficialHoliday } from '../utils/holidays';
import { LeaveBalancesSummary } from '../components/LeaveBalancesSummary';

interface SavedLeaveGroup {
  id: string;
  startDate: Date;
  endDate: Date;
  startDateStr: string;
  endDateStr: string;
  dayCount: number;
  deductibleDays: number;
  period: LeavePeriod;
  exceptions: ShiftException[];
}

export const LeavePlannerPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dateLocale = i18n.language?.startsWith('tr') ? tr : enUS;
  const {
    setSelectedDate,
    leavePlanningYear,
    setLeavePlanningYear,
    openLeavePlanning,
  } = useAppStore();

  const currentYear = new Date().getFullYear();
  const selectedYear = leavePlanningYear;
  const setSelectedYear = setLeavePlanningYear;
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load database data in a single batched query
  const dbData = useLiveQuery(async () => {
    const [patterns, activePatterns, exceptions] = await Promise.all([
      db.patterns.toArray(),
      db.activePatterns.toArray(),
      db.exceptions.toArray(),
    ]);
    return { patterns, activePatterns, exceptions };
  }, []);

  const patterns = dbData?.patterns;
  const activePatterns = dbData?.activePatterns;
  const exceptions = dbData?.exceptions;

  const activePatternObj = activePatterns?.[0];
  const currentPattern: ShiftPattern | undefined = patterns?.find(
    (p) => p.id === activePatternObj?.patternId
  );

  // Saved vacation exceptions for selected year
  const savedVacationsInYear = useMemo(() => {
    if (!exceptions) return [];
    const yStartStr = `${selectedYear}-01-01`;
    const yEndStr = `${selectedYear}-12-31`;
    return exceptions
      .filter((ex) => ex.type === 'VACATION' && ex.date >= yStartStr && ex.date <= yEndStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [exceptions, selectedYear]);

  // Group contiguous saved vacation exceptions into blocks
  const savedLeaveGroups = useMemo(() => {
    if (savedVacationsInYear.length === 0) return [];
    const groups: SavedLeaveGroup[] = [];
    let currentGroup: ShiftException[] = [];

    for (let i = 0; i < savedVacationsInYear.length; i++) {
      const curr = savedVacationsInYear[i];
      if (currentGroup.length === 0) {
        currentGroup.push(curr);
      } else {
        const prev = currentGroup[currentGroup.length - 1];
        const prevTime = parseISO(prev.date).getTime();
        const currTime = parseISO(curr.date).getTime();
        const diffDays = Math.round((currTime - prevTime) / 86400000);

        if (diffDays <= 4) {
          currentGroup.push(curr);
        } else {
          const sDate = parseISO(currentGroup[0].date);
          const eDate = parseISO(currentGroup[currentGroup.length - 1].date);
          const deductible = currentGroup.filter((ex) => {
            const d = parseISO(ex.date);
            return !isSunday(d) && !isOfficialHoliday(d);
          }).length;
          groups.push({
            id: currentGroup[0].id,
            startDate: sDate,
            endDate: eDate,
            startDateStr: currentGroup[0].date,
            endDateStr: currentGroup[currentGroup.length - 1].date,
            dayCount: currentGroup.length,
            deductibleDays: deductible,
            period: getLeavePeriod(sDate),
            exceptions: [...currentGroup],
          });
          currentGroup = [curr];
        }
      }
    }

    if (currentGroup.length > 0) {
      const sDate = parseISO(currentGroup[0].date);
      const eDate = parseISO(currentGroup[currentGroup.length - 1].date);
      const deductible = currentGroup.filter((ex) => {
        const d = parseISO(ex.date);
        return !isSunday(d) && !isOfficialHoliday(d);
      }).length;
      groups.push({
        id: currentGroup[0].id,
        startDate: sDate,
        endDate: eDate,
        startDateStr: currentGroup[0].date,
        endDateStr: currentGroup[currentGroup.length - 1].date,
        dayCount: currentGroup.length,
        deductibleDays: deductible,
        period: getLeavePeriod(sDate),
        exceptions: [...currentGroup],
      });
    }

    return groups;
  }, [savedVacationsInYear]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteSavedGroup = async (group: SavedLeaveGroup) => {
    try {
      await db.transaction('rw', db.exceptions, async () => {
        for (const ex of group.exceptions) {
          await db.exceptions.delete(ex.id);
        }
      });
      showToast('Kayıtlı izin takvimden kaldırıldı.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleGoToCalendarDate = (date: Date) => {
    setSelectedDate(date);
    navigate('/');
  };

  const openModalWithPeriod = (period: LeavePeriod) => {
    openLeavePlanning({ year: selectedYear, period, step: 'OPPORTUNITIES' });
  };

  return (
    <div className="flex-1 flex flex-col p-3 sm:p-4 max-w-4xl mx-auto w-full pb-[calc(5rem+var(--sab))] select-none">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-[calc(0.75rem+var(--sat))] left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 px-4 py-2.5 rounded-2xl shadow-xl border border-slate-800 dark:border-slate-200 flex items-center space-x-2 text-xs sm:text-sm font-bold backdrop-blur-md"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <Palmtree className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <span>{t('leave_planner_title', 'İzin Planlayıcı')}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-extrabold">
                {selectedYear}
              </span>
            </h1>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
              3 parça senelik izin sistemi (1. Kış • Yaz • 2. Kış)
            </p>
          </div>
        </div>

        {/* Year Selector Pills */}
        <div className="flex items-center space-x-1 bg-card border border-slate-200/80 dark:border-slate-800 p-1 rounded-2xl shadow-2xs self-stretch sm:self-auto justify-center">
          {[currentYear, currentYear + 1, currentYear + 2].map((yr) => (
            <button
              key={yr}
              onClick={() => setSelectedYear(yr)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
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

      <LeaveBalancesSummary />

      {/* Warning if no active shift pattern */}
      {!currentPattern && (
        <div className="mb-3.5 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <div>
              <h3 className="text-xs sm:text-sm font-black text-rose-900 dark:text-rose-200">
                {t('no_active_pattern_warning', 'Henüz aktif bir vardiya düzeni seçilmedi')}
              </h3>
              <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                {t(
                  'no_active_pattern_desc',
                  'Vardiya offlarınızı birleştiren akıllı önerileri görmek için bir düzeni aktif yapın.'
                )}
              </p>
            </div>
          </div>
          <Link
            to="/patterns"
            className="px-3 py-1.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700 text-xs font-black shadow-xs transition-all shrink-0"
          >
            {t('select_pattern_button', 'Vardiya Düzeni Seç →')}
          </Link>
        </div>
      )}

      {/* Leave Planning Action Card - Cohesive App Theme */}
      <div className="relative overflow-hidden rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 mb-4 shadow-2xs group">
        {/* Subtle background ambient glow */}
        <div className="pointer-events-none absolute -right-8 -top-8 w-36 h-36 rounded-full bg-primary-500/5 dark:bg-primary-500/10 blur-2xl" />
        <div className="pointer-events-none absolute -left-8 -bottom-8 w-28 h-28 rounded-full bg-amber-500/5 dark:bg-amber-500/5 blur-2xl" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 sm:gap-4">
          <div className="flex items-start gap-3 sm:gap-3.5 max-w-xl">
            {/* Styled Icon Box */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-primary-500/10 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0 border border-primary-500/20 mt-0.5 sm:mt-0 shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-700 dark:bg-primary-950/70 dark:text-primary-300 border border-primary-200/70 dark:border-primary-800/60">
                  <Sparkles className="w-2.5 h-2.5 text-primary-500 shrink-0" />
                  <span>
                    {savedVacationsInYear.length > 0
                      ? `${savedVacationsInYear.length} Gün Kayıtlı İzin`
                      : 'Akıllı İzin Planlayıcı'}
                  </span>
                </span>
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                  {selectedYear} Yılı
                </span>
              </div>

              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
                Yıllık İzninizi Kolayca Planlayın
              </h2>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal sm:font-medium">
                Vardiya dinlenme günlerinizi ve resmi tatilleri bağlayarak tatilinizi uzatın veya kendi tarihinizi seçin.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              openLeavePlanning({ year: selectedYear, step: 'METHOD' });
            }}
            className="w-full sm:w-auto px-4.5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>İzin Planla</span>
          </button>
        </div>
      </div>

      {/* Planned Leaves Section Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center space-x-2">
          <CalendarCheck2 className="w-4 h-4 text-primary-500" />
          <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
            {selectedYear} Yılı Planlı İzinleriniz
          </h3>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
            {savedLeaveGroups.reduce((sum, g) => sum + g.deductibleDays, 0)} Gün İzin
          </span>
        </div>

        {savedLeaveGroups.length > 0 && (
          <button
            onClick={() => handleGoToCalendarDate(new Date(selectedYear, 0, 1))}
            className="text-xs font-extrabold text-primary-600 dark:text-primary-400 hover:underline flex items-center space-x-1 cursor-pointer"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Takvimde Gör</span>
          </button>
        )}
      </div>

      {/* Planned Leaves Content */}
      {savedLeaveGroups.length > 0 ? (
        <div className="space-y-3.5">
          {(['WINTER_1', 'SUMMER', 'WINTER_2'] as LeavePeriod[]).map((periodKey) => {
            const groupsInPeriod = savedLeaveGroups.filter((g) => g.period === periodKey);
            const periodInfo = LEAVE_PERIODS_INFO[periodKey];
            const totalPeriodDays = groupsInPeriod.reduce((sum, g) => sum + g.deductibleDays, 0);

            return (
              <div
                key={periodKey}
                className="bg-card rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3"
              >
                {/* Period Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-xl">{periodInfo.icon}</span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                        {periodInfo.title}{' '}
                        <span className="text-[11px] font-bold text-slate-400">
                          ({periodInfo.monthsRange})
                        </span>
                      </h4>
                    </div>
                  </div>

                  <span
                    className={`text-[10.5px] font-black px-2.5 py-0.5 rounded-full ${
                      totalPeriodDays > 0
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {totalPeriodDays > 0
                      ? `${totalPeriodDays} Gün İzin`
                      : 'Henüz İzin Yok'}
                  </span>
                </div>

                {/* Groups List */}
                {groupsInPeriod.length > 0 ? (
                  <div className="space-y-2">
                    {groupsInPeriod.map((grp) => (
                      <div
                        key={grp.id}
                        className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                              {format(grp.startDate, 'd MMMM', { locale: dateLocale })} –{' '}
                              {format(grp.endDate, 'd MMMM yyyy', { locale: dateLocale })}
                            </span>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-500/30">
                              {grp.deductibleDays} Gün İzin {grp.dayCount > grp.deductibleDays ? `(${grp.dayCount} Gün Takvim)` : ''}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Takviminizde yıllık izin olarak kayıtlıdır.
                          </p>
                        </div>

                        <div className="flex items-center space-x-2 self-end sm:self-auto">
                          <button
                            onClick={() => handleGoToCalendarDate(grp.startDate)}
                            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center space-x-1 cursor-pointer transition-all shadow-2xs"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>İncele</span>
                          </button>

                          <button
                            onClick={() => handleDeleteSavedGroup(grp)}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Kaldır</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-between py-1 px-1">
                    <p className="text-[11px] text-slate-400 italic">
                      Bu dönem için planlanmış bir izin bulunmuyor.
                    </p>
                    <button
                      onClick={() => openModalWithPeriod(periodKey)}
                      className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      <span>+ Bu Dönem İçin Planla</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State Card when no leaves planned */
        <div className="p-6 sm:p-8 text-center bg-card rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Palmtree className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100">
              {selectedYear} yılı için henüz planlanmış bir izniniz yok
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              Vardiya off günlerinizi ve bayramları birleştirerek tatilinizi uzatmak için hemen bir izin planlayın.
            </p>
          </div>
          <button
            onClick={() => {
              openLeavePlanning({ year: selectedYear, step: 'METHOD' });
            }}
            className="px-4.5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-extrabold text-xs sm:text-sm shadow-xs active:scale-95 transition-all inline-flex items-center space-x-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>İlk İznini Planla</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default LeavePlannerPage;
