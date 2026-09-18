import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Users,
  CheckCircle2,
  CalendarCheck,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, DEFAULT_PATTERN_START_DATE, type ShiftPattern } from '../db/db';
import { hapticTap, hapticSuccess } from '../utils/haptics';
import { triggerAutoSync } from '../services/syncService';

interface QuickTeamSelectorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onPatternChanged?: (patternName: string) => void;
}

const GROUPS = ['A', 'B', 'C', 'D'] as const;
type GroupType = typeof GROUPS[number];
const SUB_TEAMS = [1, 2, 3, 4] as const;

export const QuickTeamSelectorSheet: React.FC<QuickTeamSelectorSheetProps> = ({
  isOpen,
  onClose,
  onPatternChanged,
}) => {
  const navigate = useNavigate();

  // Batched live query for patterns & active pattern
  const dbData = useLiveQuery(async () => {
    const [patterns, activePatterns] = await Promise.all([
      db.patterns.toArray(),
      db.activePatterns.toArray(),
    ]);
    return { patterns, activePatterns };
  }, []);

  const rawPatterns = dbData?.patterns;
  const patterns = useMemo(() => rawPatterns || [], [rawPatterns]);
  const activePatternObj = dbData?.activePatterns?.[0];
  const activePatternId = activePatternObj?.patternId;

  // Optimistic pattern ID for instant 0ms visual feedback
  const [optimisticPatternId, setOptimisticPatternId] = useState<string | null>(null);
  const effectiveActivePatternId = optimisticPatternId ?? activePatternId;

  const currentPattern = patterns.find((p) => p.id === effectiveActivePatternId);

  // Group selection state (A, B, C, D)
  const [selectedGroup, setSelectedGroup] = useState<GroupType>('A');
  const [activeTab, setActiveTab] = useState<'standard' | 'custom'>('standard');

  // Custom (non-built-in) user patterns memoized to avoid re-renders
  const customPatterns = useMemo(
    () => patterns.filter((p) => !/^pattern-[a-d][1-4]$/.test(p.id)),
    [patterns]
  );

  // Sync selected group and tab when modal opens
  useEffect(() => {
    if (!isOpen) {
      setOptimisticPatternId(null);
      return;
    }
    if (activePatternId) {
      const match = activePatternId.match(/^pattern-([a-d])[1-4]$/);
      if (match) {
        setSelectedGroup(match[1].toUpperCase() as GroupType);
        setActiveTab('standard');
      } else {
        const isCustom = customPatterns.some((cp) => cp.id === activePatternId);
        if (isCustom) {
          setActiveTab('custom');
        }
      }
    }
  }, [isOpen, activePatternId, customPatterns]);

  // Keep optimisticPatternId in sync with actual DB data
  useEffect(() => {
    if (activePatternObj?.patternId && optimisticPatternId === activePatternObj.patternId) {
      setOptimisticPatternId(null);
    }
  }, [activePatternObj?.patternId, optimisticPatternId]);

  if (!isOpen) return null;

  // Handler for 1-tap selection of built-in 32-day team pattern
  const handleSelectTeam = async (group: GroupType, subTeam: number) => {
    const patternId = `pattern-${group.toLowerCase()}${subTeam}`;
    if (effectiveActivePatternId === patternId) {
      hapticTap();
      return;
    }

    hapticTap();
    setOptimisticPatternId(patternId);

    const targetPattern = patterns.find((p) => p.id === patternId);
    const patternName = `${group}-${subTeam} Ekibi`;

    try {
      await db.transaction('rw', db.activePatterns, async () => {
        await db.activePatterns.clear();
        await db.activePatterns.put({
          id: 'default-active-pattern',
          patternId,
          startDate: DEFAULT_PATTERN_START_DATE,
        });
      });

      triggerAutoSync();
      hapticSuccess();
      if (onPatternChanged) {
        onPatternChanged(targetPattern?.name || patternName);
      }
    } catch (err) {
      console.error('Failed to change active pattern:', err);
      setOptimisticPatternId(null);
    }
    // Overlay stays open: user closes explicitly via 'Kapat', 'X', or backdrop
  };

  // Handler for custom pattern selection
  const handleSelectCustomPattern = async (pattern: ShiftPattern) => {
    if (effectiveActivePatternId === pattern.id) {
      hapticTap();
      return;
    }

    hapticTap();
    setOptimisticPatternId(pattern.id);

    try {
      await db.transaction('rw', db.activePatterns, async () => {
        await db.activePatterns.clear();
        await db.activePatterns.put({
          id: 'default-active-pattern',
          patternId: pattern.id,
          startDate: DEFAULT_PATTERN_START_DATE,
        });
      });

      triggerAutoSync();
      hapticSuccess();
      if (onPatternChanged) {
        onPatternChanged(pattern.name);
      }
    } catch (err) {
      console.error('Failed to change active custom pattern:', err);
      setOptimisticPatternId(null);
    }
    // Overlay stays open: user closes explicitly via 'Kapat', 'X', or backdrop
  };

  const getCleanPatternName = (name?: string) => {
    if (!name) return 'Henüz Seçilmedi';
    return (
      name
        .replace(/\s*\(HAT\)/gi, '')
        .replace(/\s*ekibi/gi, '')
        .replace(/\s*ekib[iİ]/gi, '')
        .trim() + ' Ekibi'
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <motion.div
        initial={{ y: 50, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 50, opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', damping: 25, stiffness: 340 }}
        className="relative bg-card w-full max-w-md sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col z-10 overflow-hidden max-h-[calc(100dvh-var(--sat)-1rem)]"
      >
        {/* Mobile pull handle */}
        <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mt-2.5 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2.5 sm:px-5 sm:pt-4 sm:pb-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-slate-100 leading-tight flex items-center gap-1.5">
                <span>Ekip / Vardiya Düzeni</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                Takviminizin çalışma düzenini anında değiştirin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sheet Body */}
        <div className="p-4 space-y-4 overflow-y-auto min-h-0 flex-1">
          {/* Active Team Pill Banner */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-primary-500/5 to-transparent border border-emerald-500/20 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
                  Şu Anda Takvimde Aktif
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-slate-100 truncate block">
                  {getCleanPatternName(currentPattern?.name)}
                </span>
              </div>
            </div>
            <span className="shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
              32 Günlük Döngü
            </span>
          </div>

          {/* Tab Selector: Standard 2026 vs Custom Patterns */}
          {customPatterns.length > 0 && (
            <div className="flex space-x-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveTab('standard')}
                className={`flex-1 py-1.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  activeTab === 'standard'
                    ? 'bg-card text-primary-600 dark:text-primary-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>2026 Ekipleri</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('custom')}
                className={`flex-1 py-1.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  activeTab === 'custom'
                    ? 'bg-card text-primary-600 dark:text-primary-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Özel Düzenler ({customPatterns.length})</span>
              </button>
            </div>
          )}

          {activeTab === 'standard' ? (
            <div className="space-y-4">
              {/* Step 1: Group Selection (A, B, C, D) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <span>1. Adım: Ekibi Seçin</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Seçili: <strong className="text-primary-600 dark:text-primary-400 font-black">{selectedGroup} Ekibi</strong>
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {GROUPS.map((group) => {
                    const isSelected = selectedGroup === group;
                    const isGroupCurrentlyActive = effectiveActivePatternId?.startsWith(
                      `pattern-${group.toLowerCase()}`
                    );

                    return (
                      <button
                        key={group}
                        type="button"
                        onClick={() => {
                          hapticTap();
                          setSelectedGroup(group);
                        }}
                        className={`py-3 px-2 rounded-2xl border-2 font-black text-center transition-all cursor-pointer flex flex-col items-center justify-center relative touch-manipulation active:scale-95 ${
                          isSelected
                            ? 'border-primary-500 bg-primary-500/10 text-primary-700 dark:text-primary-300 shadow-xs ring-2 ring-primary-500/25'
                            : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-xl leading-none">{group}</span>
                        <span className="text-[10px] font-bold opacity-80 mt-1">Ekibi</span>
                        {isGroupCurrentlyActive && (
                          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Sub-team Selection (1, 2, 3, 4) with 1-tap apply */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    2. Adım: Ekibe Dokunun (Anında Uygulanır)
                  </span>
                  <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                    Tek Dokunuş
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {SUB_TEAMS.map((sub) => {
                    const targetPatternId = `pattern-${selectedGroup.toLowerCase()}${sub}`;
                    const isSubActive = effectiveActivePatternId === targetPatternId;

                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => handleSelectTeam(selectedGroup, sub)}
                        className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between relative touch-manipulation active:scale-95 ${
                          isSubActive
                            ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 shadow-sm ring-2 ring-emerald-500/30'
                            : 'border-slate-200/90 dark:border-slate-800 bg-card hover:border-primary-400 dark:hover:border-primary-600 text-slate-800 dark:text-slate-100 hover:bg-primary-50/30 dark:hover:bg-primary-950/20 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-2xs ${
                              isSubActive
                                ? 'bg-emerald-500 text-white'
                                : 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
                            }`}
                          >
                            {selectedGroup}-{sub}
                          </div>
                          <div className="min-w-0 text-left">
                            <span className="font-extrabold text-xs block truncate text-slate-900 dark:text-slate-100">
                              {selectedGroup}-{sub} Ekibi
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
                              {isSubActive ? 'Şu Anda Aktif' : 'Uygulamak için dokunun'}
                            </span>
                          </div>
                        </div>

                        {isSubActive ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 animate-in zoom-in-75 duration-150" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Custom Patterns List */
            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block px-1">
                Kayıtlı Özel Düzenleriniz
              </span>
              {customPatterns.map((cp) => {
                const isActive = effectiveActivePatternId === cp.id;
                return (
                  <button
                    key={cp.id}
                    type="button"
                    onClick={() => handleSelectCustomPattern(cp)}
                    className={`w-full p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between text-left touch-manipulation active:scale-98 ${
                      isActive
                        ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 shadow-sm ring-2 ring-emerald-500/30'
                        : 'border-slate-200/90 dark:border-slate-800 bg-card hover:border-primary-400'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black shrink-0 ${
                          isActive
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <CalendarCheck className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-extrabold text-xs block truncate text-slate-900 dark:text-slate-100">
                          {cp.name}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {cp.cycleLength || cp.days.length} Günlük Döngü
                        </span>
                      </div>
                    </div>
                    {isActive ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 animate-in zoom-in-75 duration-150" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sheet Footer: Manage / Create Patterns Shortcut */}
        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/patterns');
            }}
            className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors py-1.5 px-2.5 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Tüm Düzenleri Yönet & Yeni Ekle</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-black text-xs transition-all active:scale-95 shadow-sm cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default QuickTeamSelectorSheet;
