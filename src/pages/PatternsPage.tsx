import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format, isValid } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import {
  Plus,
  Calendar as CalendarIcon,
  CheckCircle2,
  Trash2,
  Edit2,
  CalendarCheck,
  Clock,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Briefcase,
  Coffee,
  Users,
  X,
  ChevronLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { db, type ShiftPattern, DEFAULT_PATTERN_START_DATE } from '../db/db';
import { PatternBuilder } from '../components/PatternBuilder';
import { ShiftTypesTab } from '../components/ShiftTypesTab';
import { SetPatternStartDateModal } from '../components/SetPatternStartDateModal';

const getPatternColumns = (pattern: ShiftPattern): number => {
  if (pattern.columns && pattern.columns > 0) return pattern.columns;
  const len = pattern.cycleLength || pattern.days?.length || 0;
  if (len <= 1) return 1;
  if (len <= 8) return len;
  if (len % 8 === 0) return 8;
  if (len % 7 === 0) return 7;
  if (len % 6 === 0) return 6;
  if (len % 5 === 0) return 5;
  if (len % 4 === 0) return 4;
  return 7;
};

const PatternsPage = () => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('tr') ? tr : enUS;

  // Batched live query for patterns, active patterns, and shift types
  const dbData = useLiveQuery(async () => {
    const [patterns, activePatterns, shiftTypes] = await Promise.all([
      db.patterns.toArray(),
      db.activePatterns.toArray(),
      db.shiftTypes.toArray(),
    ]);
    return { patterns, activePatterns, shiftTypes };
  }, []);

  const patterns = dbData?.patterns;
  const activePatterns = dbData?.activePatterns;
  const shiftTypes = dbData?.shiftTypes;

  const [activeTab, setActiveTab] = useState<'types' | 'patterns'>('types');
  const [isCreating, setIsCreating] = useState(false);
  const [editingPattern, setEditingPattern] = useState<ShiftPattern | null>(null);

  // State to track expanded patterns
  const [expandedPatternIds, setExpandedPatternIds] = useState<Record<string, boolean>>({});

  // State for Setting Start Date via Modal from Patterns List
  const [patternForStartDate, setPatternForStartDate] = useState<ShiftPattern | null>(null);

  const activePatternObj = activePatterns?.[0];

  // State to track selected group for the 2-step quick selection
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // State to toggle the team & sub-team selector (normally hidden to prevent accidental taps)
  const [isTeamSelectorOpen, setIsTeamSelectorOpen] = useState(false);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const activeBuiltInPattern = patterns?.find(
    (p) => p.id === activePatternObj?.patternId && /^pattern-[a-d][1-4]$/.test(p.id)
  );

  // Initialize selectedGroup based on the active pattern
  useEffect(() => {
    if (activePatternObj?.patternId) {
      const match = activePatternObj.patternId.match(/^pattern-([a-d])[1-4]$/);
      if (match) {
        setSelectedGroup(prev => prev || match[1].toUpperCase());
      }
    }
  }, [activePatternObj]);

  const toggleExpand = (patternId: string) => {
    setExpandedPatternIds((prev) => ({
      ...prev,
      [patternId]: !prev[patternId],
    }));
  };

  const handleOpenStartDateModal = (pattern: ShiftPattern) => {
    setPatternForStartDate(pattern);
  };

  const handleApplyStartDateFromList = async (startDate: string) => {
    if (!patternForStartDate) return;

    await db.activePatterns.clear();
    await db.activePatterns.add({
      id: crypto.randomUUID(),
      patternId: patternForStartDate.id,
      startDate: startDate,
    });

    setPatternForStartDate(null);
    showToast('Vardiya düzeni takvime uygulandı! 🎉');
  };

  const handleQuickSelectTeam = async (team: string) => {
    const patternId = `pattern-${team.toLowerCase()}`;
    await db.activePatterns.clear();
    await db.activePatterns.add({
      id: crypto.randomUUID(),
      patternId,
      startDate: DEFAULT_PATTERN_START_DATE,
    });
    setIsTeamSelectorOpen(false);
    showToast(`${team} Ekibi takvime uygulandı! 🎉`);
  };

  const handleDeletePattern = async (pattern: ShiftPattern) => {
    if (confirm(`"${pattern.name}" düzenini silmek istediğinize emin misiniz?`)) {
      await db.patterns.delete(pattern.id);
      if (activePatternObj?.patternId === pattern.id) {
        await db.activePatterns.clear();
      }
    }
  };

  const handleEditPattern = (pattern: ShiftPattern) => {
    setEditingPattern(pattern);
    setIsCreating(true);
  };

  const formatStartDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(`${dateStr}T00:00:00`);
      if (isValid(d)) {
        return format(d, 'd MMMM yyyy', { locale: dateLocale });
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden min-w-0 py-4 px-3 sm:px-4 pb-4 md:pb-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
      {!isCreating ? (
        <>
          {/* Top Quick Back Navigation & Main Page Header */}
          <div className="mb-4">
            <div className="mb-2">
              <Link
                to="/"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-card hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-primary-600 dark:hover:text-primary-400 border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-all text-xs font-bold active:scale-95 group cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
                <span>Takvime Dön</span>
              </Link>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {t('patterns')}
            </h1>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl mb-5">
            <button
              type="button"
              onClick={() => setActiveTab('types')}
              className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                activeTab === 'types'
                  ? 'bg-card text-primary-600 dark:text-primary-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{t('shift_types')}</span>
              {shiftTypes && (
                <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 font-extrabold">
                  {shiftTypes.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('patterns')}
              className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                activeTab === 'patterns'
                  ? 'bg-card text-primary-600 dark:text-primary-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <CalendarCheck className="w-4 h-4" />
              <span>{t('shift_patterns')}</span>
              {patterns && (
                <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 font-extrabold">
                  {patterns.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'types' ? (
            <ShiftTypesTab />
          ) : (
            <div className="space-y-4 animate-in fade-in duration-300 w-full max-w-full overflow-x-hidden min-w-0">
              {/* Section Sub-Header & Action Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    {t('shift_patterns')}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('shift_patterns_desc')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPattern(null);
                    setIsCreating(true);
                  }}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-transform active:scale-95 flex items-center space-x-1.5 cursor-pointer shrink-0 self-start sm:self-auto touch-manipulation"
                >
                  <Plus className="w-4 h-4" />
                  <span>Yeni Düzen Ekle</span>
                </button>
              </div>

              {/* 2026 Çalışma Programı Hızlı Seçici */}
              <div className="bg-card rounded-2xl p-3.5 sm:p-4 border border-primary-200/90 dark:border-primary-800/70 shadow-xs space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-primary-500/10 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                          2026 Çalışma Programı
                        </h3>
                        <span className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded-md font-extrabold">
                          32 Günlük Döngü
                        </span>
                      </div>
                      {activeBuiltInPattern ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                          <span>
                            Aktif Ekip: <strong className="text-primary-700 dark:text-primary-300 font-bold">{activeBuiltInPattern.name.replace(/\s*\(HAT\)/gi, '').replace(/\s*ekibi/gi, '').replace(/\s*ekib[iİ]/gi, '').trim() || activeBuiltInPattern.name}</strong>
                          </span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          Takviminiz için 32 günlük hazır döngü
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Seçim Butonlarını Aç / Kapat Butonu */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsTeamSelectorOpen((prev) => {
                        const next = !prev;
                        if (!next && activePatternObj?.patternId) {
                          const match = activePatternObj.patternId.match(/^pattern-([a-d])[1-4]$/);
                          if (match) setSelectedGroup(match[1].toUpperCase());
                        }
                        return next;
                      });
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 shrink-0 cursor-pointer touch-manipulation active:scale-95 ${
                      isTeamSelectorOpen
                        ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        : 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-500/20'
                    }`}
                  >
                    {isTeamSelectorOpen ? (
                      <>
                        <X className="w-3.5 h-3.5" />
                        <span>Kapat</span>
                      </>
                    ) : (
                      <>
                        <Users className="w-3.5 h-3.5" />
                        <span>{activeBuiltInPattern ? 'Ekip Değiştir' : 'Ekip Seç'}</span>
                        <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                      </>
                    )}
                  </button>
                </div>

                {/* Ekip ve Alt Ekip Seçim Alanı (Normalde Gizli) */}
                <AnimatePresence>
                  {isTeamSelectorOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3 pb-1 space-y-3 border-t border-primary-100 dark:border-primary-900/50">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            Önce ekibinizi, ardından alt ekibinizi seçin:
                          </span>
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-md border border-amber-200/50 dark:border-amber-800/40">
                            Tıklayınca uygulanır
                          </span>
                        </div>

                        {/* Aşama 1: Ekip Seçimi */}
                        <div className="grid grid-cols-4 gap-2">
                          {(['A', 'B', 'C', 'D'] as const).map((group) => {
                            const isGroupSelected = selectedGroup === group;
                            const isActiveInGroup = activePatternObj?.patternId?.startsWith(`pattern-${group.toLowerCase()}`);

                            return (
                              <button
                                key={group}
                                type="button"
                                onClick={() => setSelectedGroup(group)}
                                className={`relative py-2 px-1 sm:px-2 rounded-xl text-center font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 border touch-manipulation active:scale-95 ${
                                  isGroupSelected
                                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-primary-300 dark:border-primary-700 shadow-sm ring-1 ring-primary-200/50'
                                    : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/80'
                                }`}
                              >
                                <span className="text-sm font-extrabold">{group} Ekibi</span>
                                {isActiveInGroup && !isGroupSelected && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500 absolute top-1.5 right-1.5"></span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Aşama 2: Alt Ekip Seçimi */}
                        {selectedGroup && (
                          <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-1.5">
                            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-1">
                              {selectedGroup} Ekibi için Alt Ekibinizi Seçin:
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              {(['1', '2', '3', '4'] as const).map((num) => {
                                const team = `${selectedGroup}${num}`;
                                const patternId = `pattern-${team.toLowerCase()}`;
                                const isSelected = activePatternObj?.patternId === patternId;

                                return (
                                  <button
                                    key={team}
                                    type="button"
                                    onClick={() => handleQuickSelectTeam(team)}
                                    className={`py-2 px-1 sm:px-2 rounded-xl text-center font-black transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 border touch-manipulation active:scale-95 ${
                                      isSelected
                                        ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-500/25 ring-2 ring-primary-400/40 scale-[1.02]'
                                        : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700/80'
                                    }`}
                                  >
                                    <span className="text-sm font-black">{team}</span>
                                    <span
                                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                        isSelected
                                          ? 'bg-white/20 text-white'
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                      }`}
                                    >
                                      {isSelected ? '✓ Aktif' : 'Seç'}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Aktif 2026 Ekip Detayları (32 Günlük Döngü Tablosu) */}
                {activeBuiltInPattern && (
                  <div className="pt-3 border-t border-slate-200/80 dark:border-slate-700/80">
                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-medium mb-2 px-1">
                      <span className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                        <CalendarDays className="w-3.5 h-3.5 text-primary-500" />
                        <span>{activeBuiltInPattern.name} Detayları</span>
                      </span>
                      <span className="text-[11px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md font-bold">
                        {activeBuiltInPattern.cycleLength} Günlük Döngü
                      </span>
                    </div>

                    <div
                      className="grid gap-1 sm:gap-1.5 p-2 bg-slate-100 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700"
                      style={{
                        gridTemplateColumns: `repeat(${getPatternColumns(activeBuiltInPattern)}, minmax(0, 1fr))`,
                      }}
                    >
                      {activeBuiltInPattern.days.map((d, i) => (
                        <div
                          key={d.id || `${d.shiftTypeId || ''}-${i}`}
                          className="rounded-lg p-1 shadow-2xs relative flex flex-col justify-between select-none aspect-square min-h-[38px] sm:min-h-[44px] text-white border border-black/10 dark:border-white/10 hover:opacity-90 transition-opacity"
                          style={{ backgroundColor: d.color }}
                          title={`${i + 1}. Gün: ${d.name} (${d.startTime || 'İstirahat'})`}
                        >
                          <span className="text-[8px] sm:text-[9px] font-black text-white/90 leading-none">
                            {i + 1}
                          </span>
                          <div className="w-full text-center px-0.5 my-auto">
                            <div className="font-black text-[9px] sm:text-[11px] text-white truncate leading-tight drop-shadow-2xs">
                              {d.name}
                            </div>
                          </div>
                          <span className="text-[7px] sm:text-[8px] font-bold text-white/85 font-mono truncate text-center block leading-none">
                            {d.type === 'WORK' && d.startTime
                              ? d.startTime.slice(0, 5)
                              : 'İzin'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {patterns === undefined ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : (() => {
                const customPatterns = patterns.filter(p => !/^pattern-[a-d][1-4]$/.test(p.id));
                return customPatterns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 sm:p-10 text-center bg-card rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed">
                    <div className="bg-primary-50 dark:bg-primary-900/20 p-3.5 rounded-full mb-3 text-primary-500">
                      <CalendarIcon className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                      {t('no_patterns_yet')}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mb-4 max-w-[280px]">
                      {t('no_patterns_desc')}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPattern(null);
                        setIsCreating(true);
                      }}
                      className="bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-transform active:scale-95 flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Yeni Düzen Ekle</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Helper Hint Strip */}
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-100/70 dark:bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/80">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400 shrink-0" />
                        <span className="truncate">{t('patterns_hint')}</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0 bg-slate-200/70 dark:bg-slate-700/70 px-2 py-0.5 rounded-full">
                        {t('patterns_count', { count: customPatterns.length })}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {customPatterns.map((pattern) => {
                      const isActive = activePatternObj?.patternId === pattern.id;
                      const isExpanded = !!expandedPatternIds[pattern.id];
                      const workCount = pattern.days.filter((d) => d.type === 'WORK').length;
                      const restCount = pattern.days.filter((d) => d.type === 'REST').length;
                      const cols = getPatternColumns(pattern);

                      return (
                        <div
                          key={pattern.id}
                          className={`bg-card rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs ${
                            isActive
                              ? 'border-emerald-500 ring-2 ring-emerald-500/25 bg-card dark:border-emerald-500'
                              : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          {/* COLLAPSED / MAIN CARD VIEW */}
                          <div className="p-3.5 sm:p-4 space-y-2.5">
                            {/* Top Row: Title + Compact Icon Badges (Left) & Edit/Delete when expanded (Right) */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <h3 className="font-extrabold text-base text-slate-900 dark:text-white truncate">
                                  {pattern.name}
                                </h3>

                                {/* Compact Icon Stats Badges */}
                                <div className="flex items-center gap-1.5 text-xs font-bold">
                                  {/* Total Cycle Length */}
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80"
                                    title={t('cycle_days', { count: pattern.cycleLength })}
                                  >
                                    <RotateCcw className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                                    <span>{pattern.cycleLength}</span>
                                  </span>

                                  {/* Work Days */}
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/70"
                                    title={t('work_days_count', { count: workCount })}
                                  >
                                    <Briefcase className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                                    <span>{workCount}</span>
                                  </span>

                                  {/* Rest Days */}
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/70"
                                    title={t('rest_days_count', { count: restCount })}
                                  >
                                    <Coffee className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    <span>{restCount}</span>
                                  </span>
                                </div>
                              </div>

                              {/* Right: Edit & Delete (Only visible when Expanded) */}
                              {isExpanded && (
                                <div className="flex items-center space-x-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleEditPattern(pattern)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors cursor-pointer"
                                    title={t('edit')}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePattern(pattern)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                                    title={t('delete')}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Mini Shift Rhythm Visual Bar (Visible in Collapsed State) */}
                            <div className="pt-0.5">
                              <div className="flex items-center gap-0.5 w-full h-2.5 sm:h-3 rounded-full overflow-hidden p-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80">
                                {pattern.days.map((d, i) => (
                                  <div
                                    key={i}
                                    className="h-full flex-1 rounded-xs transition-transform hover:opacity-90"
                                    style={{ backgroundColor: d.color }}
                                    title={`${i + 1}. Gün: ${d.name} (${d.type === 'WORK' && d.startTime ? d.startTime.slice(0, 5) : 'İzin'})`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* EXPANDED DETAILS (Revealed when user clicks "Detayları Göster") */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                className="overflow-hidden border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-3.5 sm:p-4 space-y-3"
                              >
                                {/* Active Start Date Banner (Inside Details) */}
                                {isActive && activePatternObj?.startDate && (
                                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-card border border-slate-200/90 dark:border-slate-700/80 text-xs shadow-2xs">
                                    <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
                                      <CalendarIcon className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0" />
                                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                                        {t('start_date')}:
                                      </span>
                                      <span className="font-bold text-slate-900 dark:text-white">
                                        {formatStartDate(activePatternObj.startDate)}
                                      </span>
                                    </div>
                                    {!/^pattern-[a-d][1-4]$/.test(pattern.id) && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenStartDateModal(pattern)}
                                        className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline cursor-pointer ml-2"
                                      >
                                        {t('change_date')}
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* Structured Cycle Days Grid (Inside Details) */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-medium">
                                    <span className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                                      <CalendarDays className="w-3.5 h-3.5 text-primary-500" />
                                      <span>{t('days_in_cycle')}</span>
                                    </span>
                                    <span className="text-[11px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md font-bold">
                                      {t('columns_count', { count: cols })}
                                    </span>
                                  </div>

                                  <div
                                    className="grid gap-1 sm:gap-1.5 p-2 bg-slate-100 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700"
                                    style={{
                                      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                                    }}
                                  >
                                    {pattern.days.map((d, i) => (
                                      <div
                                        key={d.id || `${d.shiftTypeId || ''}-${i}`}
                                        className="rounded-lg p-1 shadow-2xs relative flex flex-col justify-between select-none aspect-square min-h-[38px] sm:min-h-[44px] text-white border border-black/10 dark:border-white/10"
                                        style={{ backgroundColor: d.color }}
                                        title={`${i + 1}. Gün: ${d.name} (${d.startTime || 'İstirahat'})`}
                                      >
                                        <span className="text-[8px] sm:text-[9px] font-black text-white/90 leading-none">
                                          {i + 1}
                                        </span>
                                        <div className="w-full text-center px-0.5 my-auto">
                                          <div className="font-black text-[9px] sm:text-[11px] text-white truncate leading-tight drop-shadow-2xs">
                                            {d.name}
                                          </div>
                                        </div>
                                        <span className="text-[7px] sm:text-[8px] font-bold text-white/85 font-mono truncate text-center block leading-none">
                                          {d.type === 'WORK' && d.startTime
                                            ? d.startTime.slice(0, 5)
                                            : 'İzin'}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* BOTTOM FOOTER BAR */}
                          <div className="flex items-center justify-between px-3.5 sm:px-4 py-2.5 bg-slate-50/60 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={() => toggleExpand(pattern.id)}
                              className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer py-1"
                            >
                              <span>{isExpanded ? t('hide_details') : t('show_details')}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {!isActive ? (
                              <button
                                type="button"
                                onClick={async () => {
                                  if (/^pattern-[a-d][1-4]$/.test(pattern.id)) {
                                    await db.activePatterns.clear();
                                    await db.activePatterns.add({
                                      id: crypto.randomUUID(),
                                      patternId: pattern.id,
                                      startDate: DEFAULT_PATTERN_START_DATE,
                                    });
                                  } else {
                                    handleOpenStartDateModal(pattern);
                                  }
                                }}
                                className="text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-500 px-3 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                              >
                                <CalendarDays className="w-3.5 h-3.5" />
                                <span>{t('apply_to_calendar')}</span>
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                );
              })()}
            </div>
          )}
        </>
      ) : (
        <PatternBuilder
          initialPattern={editingPattern}
          onCancel={() => {
            setIsCreating(false);
            setEditingPattern(null);
          }}
          onSave={() => {
            setIsCreating(false);
            setEditingPattern(null);
          }}
        />
      )}

      {/* Start Date Modal for Applying Pattern from List */}
      <SetPatternStartDateModal
        isOpen={patternForStartDate !== null}
        pattern={patternForStartDate}
        initialDate={
          patternForStartDate && activePatternObj?.patternId === patternForStartDate.id
            ? activePatternObj.startDate
            : /^pattern-[a-d][1-4]$/.test(patternForStartDate?.id || '')
            ? DEFAULT_PATTERN_START_DATE
            : undefined
        }
        onClose={() => setPatternForStartDate(null)}
        onApply={handleApplyStartDateFromList}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 px-4 py-2.5 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-bold border border-slate-700/50 dark:border-slate-300/50 backdrop-blur-md">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatternsPage;


