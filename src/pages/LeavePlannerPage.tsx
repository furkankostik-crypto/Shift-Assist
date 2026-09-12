import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
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
import { LeaveBalancesSummary } from '../components/LeaveBalancesSummary';

interface SavedLeaveGroup {
  id: string;
  startDate: Date;
  endDate: Date;
  startDateStr: string;
  endDateStr: string;
  dayCount: number;
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
          groups.push({
            id: currentGroup[0].id,
            startDate: sDate,
            endDate: eDate,
            startDateStr: currentGroup[0].date,
            endDateStr: currentGroup[currentGroup.length - 1].date,
            dayCount: currentGroup.length,
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
      groups.push({
        id: currentGroup[0].id,
        startDate: sDate,
        endDate: eDate,
        startDateStr: currentGroup[0].date,
        endDateStr: currentGroup[currentGroup.length - 1].date,
        dayCount: currentGroup.length,
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
    <div className="flex-1 flex flex-col p-3 sm:p-4 max-w-4xl mx-auto w-full pb-8 select-none">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 px-4 py-2.5 rounded-2xl shadow-xl border border-slate-800 dark:border-slate-200 flex items-center space-x-2 text-xs sm:text-sm font-bold backdrop-blur-md"
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

      {/* Prominent Hero Action Callout */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-primary-600 via-primary-700 to-indigo-700 text-white border-2 border-primary-400/40 shadow-lg shadow-primary-500/25 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1 max-w-md">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-xs">
              {savedVacationsInYear.length > 0
                ? `${savedVacationsInYear.length} Gün Kayıtlı İzin`
                : 'Yeni Planlama'}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight">
            Yıllık İzninizi Kolayca Planlayın
          </h2>
          <p className="text-xs text-primary-100/90 leading-relaxed font-medium">
            Akıllı öneriler ile vardiya dinlenme günlerinizi bağlayarak tatilinizi iki katına çıkarın veya kendi tarihinizi seçin.
          </p>
        </div>

        <button
          onClick={() => {
            openLeavePlanning({ year: selectedYear, step: 'METHOD' });
          }}
          className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white text-primary-700 hover:bg-primary-50 font-black text-sm shadow-md active:scale-95 transition-all flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>İzin Planla</span>
        </button>
      </div>

      {/* Planned Leaves Section Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center space-x-2">
          <CalendarCheck2 className="w-4 h-4 text-primary-500" />
          <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
            {selectedYear} Yılı Planlı İzinleriniz
          </h3>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
            {savedVacationsInYear.length} Gün
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
            const totalPeriodDays = groupsInPeriod.reduce((sum, g) => sum + g.dayCount, 0);

            return (
              <div
                key={periodKey}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border-2 border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3"
              >
                {/* Period Header */}
                <div className="flex items-center justify-between pb-2.5 border-b-2 border-slate-100 dark:border-slate-800">
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
                        className="bg-slate-50 dark:bg-slate-800/90 rounded-xl p-3 border-2 border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                              {format(grp.startDate, 'd MMMM', { locale: dateLocale })} –{' '}
                              {format(grp.endDate, 'd MMMM yyyy', { locale: dateLocale })}
                            </span>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-500/30">
                              {grp.dayCount} Gün İzin
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
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border-2 border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Palmtree className="w-7 h-7" />
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
            className="px-5 py-2.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-black text-xs sm:text-sm shadow-md shadow-primary-500/20 active:scale-95 transition-all inline-flex items-center space-x-2 cursor-pointer"
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
