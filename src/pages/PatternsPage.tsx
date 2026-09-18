import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format, isValid } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import {
  Plus,
  Calendar as CalendarIcon,
  CheckCircle2,
  Trash2,
  Edit2,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Briefcase,
  Coffee,
  ChevronLeft,
  Users,
  Clock,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { db, type ShiftPattern, DEFAULT_PATTERN_START_DATE } from '../db/db';
import { PatternBuilder } from '../components/PatternBuilder';
import { SetPatternStartDateModal } from '../components/SetPatternStartDateModal';
import { ShiftTypesTab } from '../components/ShiftTypesTab';
import { triggerAutoSync } from '../services/syncService';
import { hapticTap, hapticSuccess } from '../utils/haptics';

const GROUPS = ['A', 'B', 'C', 'D'] as const;
type GroupType = typeof GROUPS[number];
const SUB_TEAMS = [1, 2, 3, 4] as const;

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

  const [activeTab, setActiveTab] = useState<'patterns' | 'shift_types'>('patterns');
  const [selectedGroup, setSelectedGroup] = useState<GroupType>('A');
  const [isTeamSelectorOpen, setIsTeamSelectorOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingPattern, setEditingPattern] = useState<ShiftPattern | null>(null);

  // State to track expanded patterns
  const [expandedPatternIds, setExpandedPatternIds] = useState<Record<string, boolean>>({});

  // State for Setting Start Date via Modal from Patterns List
  const [patternForStartDate, setPatternForStartDate] = useState<ShiftPattern | null>(null);

  const activePatternObj = activePatterns?.[0];
  const activePattern = patterns?.find((p) => p.id === activePatternObj?.patternId);

  const activePatternId = activePatternObj?.patternId;
  const defaultPatternMatch = activePatternId?.match(/^pattern-([a-d])([1-4])$/);
  const matchedGroup = defaultPatternMatch ? (defaultPatternMatch[1].toUpperCase() as GroupType) : null;
  const isDefaultActivePattern = !!defaultPatternMatch;
  const activeDefaultTeamCode = defaultPatternMatch
    ? `${defaultPatternMatch[1].toUpperCase()}${defaultPatternMatch[2]}`
    : null;

  // Auto-sync selected group with currently active default pattern
  useEffect(() => {
    if (matchedGroup) {
      setSelectedGroup(matchedGroup);
    }
  }, [matchedGroup]);

  // Custom user patterns (exclude built-in pattern-a1 to pattern-d4)
  const customPatterns = useMemo(() => {
    if (!patterns) return [];
    return patterns.filter((p) => !/^pattern-[a-d][1-4]$/.test(p.id));
  }, [patterns]);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

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
    triggerAutoSync();

    setPatternForStartDate(null);
    showToast('Vardiya düzeni takvime uygulandı! 🎉');
  };

  const handleSelectTeam = async (group: GroupType, sub: number) => {
    hapticTap();
    const patternId = `pattern-${group.toLowerCase()}${sub}`;
    await db.activePatterns.clear();
    await db.activePatterns.add({
      id: 'default-active-pattern',
      patternId,
      startDate: DEFAULT_PATTERN_START_DATE,
    });
    triggerAutoSync();
    hapticSuccess();
    showToast(`${group}${sub} Ekibi takvime uygulandı! 🎉`);
  };

  const handleDeletePattern = async (pattern: ShiftPattern) => {
    if (confirm(`"${pattern.name}" düzenini silmek istediğinize emin misiniz?`)) {
      await db.patterns.delete(pattern.id);
      if (activePatternObj?.patternId === pattern.id) {
        await db.activePatterns.clear();
      }
      triggerAutoSync();
      showToast('Düzen silindi.');
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
    <div className="w-full max-w-full overflow-x-hidden min-w-0 pt-4 px-3 sm:px-4 pb-[calc(5rem+var(--sab))] animate-in fade-in slide-in-from-bottom-4 duration-400">
      {!isCreating ? (
        <>
          {/* Top Quick Back Navigation & Main Page Header */}
          <div className="mb-3">
            <div className="mb-2">
              <Link
                to="/"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-card hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-primary-600 dark:hover:text-primary-400 border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-all text-xs font-bold active:scale-95 group cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
                <span>Takvime Dön</span>
              </Link>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  {t('patterns', 'Vardiyalar')}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Çalışma ekipleri, özel döngüler ve vardiya tipleri
                </p>
              </div>

              {/* Main Dual Tab Switcher */}
              <div className="flex items-center space-x-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('patterns')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    activeTab === 'patterns'
                      ? 'bg-card text-primary-600 dark:text-primary-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Vardiya Düzenleri</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('shift_types')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    activeTab === 'shift_types'
                      ? 'bg-card text-primary-600 dark:text-primary-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Vardiya Tipleri</span>
                </button>
              </div>
            </div>
          </div>

          {activeTab === 'patterns' ? (
            <div className="space-y-4 animate-in fade-in duration-300 w-full max-w-full overflow-x-hidden min-w-0">
              {/* 1. Aktif Vardiya Düzeni Kartı */}
              {activePattern && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-primary-500/10 to-transparent border-2 border-emerald-500/40 shadow-xs space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse shrink-0" />
                        <span className="text-[10.5px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                          Şu Anda Takvimde Aktif Düzen
                        </span>
                      </div>
                      <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                        {activePattern.name}
                      </h2>
                      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-bold inline-flex items-center gap-1">
                          <RotateCcw className="w-3 h-3 text-slate-400" />
                          <span>{activePattern.cycleLength || activePattern.days?.length} Günlük Döngü</span>
                        </span>
                        {activePatternObj?.startDate && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-500 dark:text-slate-400">
                              <CalendarIcon className="w-3 h-3 text-primary-500" />
                              <span>Başlangıç: {formatStartDate(activePatternObj.startDate)}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {!isDefaultActivePattern && (
                      <button
                        type="button"
                        onClick={() => handleOpenStartDateModal(activePattern)}
                        className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-black transition-all shadow-2xs cursor-pointer shrink-0 self-start sm:self-auto active:scale-95"
                      >
                        Başlangıç Tarihini Değiştir
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 2. 2026 Standart Vardiya Ekipleri (Özet / Açılır Seçici) */}
              {!isTeamSelectorOpen ? (
                <div className="bg-card rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 dark:border-slate-800 shadow-2xs transition-all">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/60 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0 border border-primary-500/20">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                            2026 Vardiya Ekipleri
                          </h2>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-500/20">
                            32 Günlük Döngü
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 flex items-center gap-1.5">
                          {activeDefaultTeamCode ? (
                            <>
                              <span>Seçili Ekip:</span>
                              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                                {activeDefaultTeamCode} Ekibi
                              </span>
                            </>
                          ) : (
                            <span>Standart ekip seçin veya değiştirin</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        hapticTap();
                        if (defaultPatternMatch) {
                          setSelectedGroup(defaultPatternMatch[1].toUpperCase() as GroupType);
                        }
                        setIsTeamSelectorOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-black transition-all shadow-xs shrink-0 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Ekip Değiştir</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-card rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-primary-500" />
                      <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                        2026 Vardiya Ekipleri
                      </h2>
                      <span className="text-[10.5px] font-black px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-500/20">
                        32 Günlük Döngü
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        hapticTap();
                        setIsTeamSelectorOpen(false);
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>Kapat</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Group Selector Pills: A Ekibi, B Ekibi, C Ekibi, D Ekibi */}
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    {GROUPS.map((grp) => {
                      const isGroupSelected = selectedGroup === grp;
                      const isGroupActive = activePatternObj?.patternId?.startsWith(`pattern-${grp.toLowerCase()}`);
                      return (
                        <button
                          key={grp}
                          type="button"
                          onClick={() => {
                            hapticTap();
                            setSelectedGroup(grp);
                          }}
                          className={`py-2 px-1 rounded-xl text-center font-black transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 border-2 relative active:scale-95 ${
                            isGroupSelected
                              ? 'border-primary-500 bg-primary-50/80 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 shadow-xs ring-2 ring-primary-500/20'
                              : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          <span className="text-base sm:text-lg leading-none">{grp}</span>
                          <span className="text-[10px] font-bold opacity-80">Ekibi</span>
                          {isGroupActive && (
                            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-slate-900" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Sub-teams single row: A1, A2, A3, A4 or D1, D2, D3, D4 */}
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2 pt-1">
                    {SUB_TEAMS.map((sub) => {
                      const patternId = `pattern-${selectedGroup.toLowerCase()}${sub}`;
                      const isTeamActive = activePatternObj?.patternId === patternId;
                      const teamCode = `${selectedGroup}${sub}`;

                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => handleSelectTeam(selectedGroup, sub)}
                          className={`py-2.5 sm:py-3 px-1 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 active:scale-95 touch-manipulation relative ${
                            isTeamActive
                              ? 'border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-100 shadow-xs ring-2 ring-emerald-500/25'
                              : 'border-slate-200/90 dark:border-slate-800 bg-card hover:border-primary-400 text-slate-800 dark:text-slate-100 hover:bg-primary-50/30'
                          }`}
                        >
                          <span className={`text-sm sm:text-base font-black ${isTeamActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-900 dark:text-slate-100'}`}>
                            {teamCode}
                          </span>
                          {isTeamActive ? (
                            <span className="flex items-center gap-0.5 text-[9px] font-black text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                              <span>Aktif</span>
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                              Seç
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Özel Vardiya Düzenleri Başlığı ve Listesi */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                      Özel Vardiya Düzenleri
                    </h2>
                    {customPatterns.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {customPatterns.length}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingPattern(null);
                      setIsCreating(true);
                    }}
                    className="bg-primary-600 hover:bg-primary-700 text-white font-black text-xs px-3.5 py-2 rounded-xl shadow-xs transition-transform active:scale-95 flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Yeni Düzen Ekle</span>
                  </button>
                </div>

                {customPatterns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-6 sm:p-8 text-center bg-card rounded-2xl border border-slate-200/90 dark:border-slate-800 border-dashed space-y-2.5">
                    <div className="bg-primary-50 dark:bg-primary-900/20 p-3 rounded-2xl text-primary-500">
                      <CalendarIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                        Henüz Özel Vardiya Düzeni Eklenmedi
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm mx-auto mt-0.5">
                        Kendi çalışma sisteminize göre (örneğin 2 Çalış 2 İzin, 24/48 veya özel rotasyonlar) yeni bir döngü oluşturabilirsiniz.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPattern(null);
                        setIsCreating(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-black text-xs shadow-xs transition-all active:scale-95 inline-flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>İlk Özel Düzenini Oluştur</span>
                    </button>
                  </div>
                ) : (
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
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <h3 className="font-extrabold text-base text-slate-900 dark:text-white truncate">
                                  {pattern.name}
                                </h3>

                                <div className="flex items-center gap-1.5 text-xs font-bold">
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80"
                                    title={t('cycle_days', { count: pattern.cycleLength })}
                                  >
                                    <RotateCcw className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                                    <span>{pattern.cycleLength}</span>
                                  </span>

                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/70"
                                    title={t('work_days_count', { count: workCount })}
                                  >
                                    <Briefcase className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                                    <span>{workCount}</span>
                                  </span>

                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/70"
                                    title={t('rest_days_count', { count: restCount })}
                                  >
                                    <Coffee className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    <span>{restCount}</span>
                                  </span>
                                </div>
                              </div>

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

                            {/* Mini Shift Rhythm Visual Bar */}
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

                          {/* EXPANDED DETAILS */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                className="overflow-hidden border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-3.5 sm:p-4 space-y-3"
                              >
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
                                    <button
                                      type="button"
                                      onClick={() => handleOpenStartDateModal(pattern)}
                                      className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline cursor-pointer ml-2"
                                    >
                                      {t('change_date')}
                                    </button>
                                  </div>
                                )}

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
                                onClick={() => handleOpenStartDateModal(pattern)}
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
                )}
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in duration-300">
              <ShiftTypesTab />
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
        <div className="fixed bottom-[calc(5.5rem+var(--sab))] left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
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
