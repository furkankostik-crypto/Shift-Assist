import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Check,
  Sparkles,
  RotateCcw,
  Trash2,
  FileText,
  Plus,
  Minus,
  LayoutGrid,
  Calendar,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import {
  db,
  type ShiftPattern,
  type ShiftDay,
  type ShiftType,
} from '../db/db';
import { SetPatternStartDateModal } from './SetPatternStartDateModal';
import { ShiftIcon } from '../utils/shiftIcons';

interface PatternBuilderProps {
  initialPattern?: ShiftPattern | null;
  onCancel: () => void;
  onSave: () => void;
}

export const PatternBuilder = ({
  initialPattern,
  onCancel,
  onSave,
}: PatternBuilderProps) => {
  const { t } = useTranslation();

  // Shift types sorted by order
  const shiftTypes = useLiveQuery(async () => {
    const list = await db.shiftTypes.toArray();
    return list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, []);

  const [name, setName] = useState(initialPattern?.name || '');
  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);
  const [isStartDateModalOpen, setIsStartDateModalOpen] = useState(false);
  const [activeStartDate, setActiveStartDate] = useState<string | undefined>(undefined);

  // Active pattern start date if editing
  useLiveQuery(async () => {
    if (initialPattern) {
      const active = await db.activePatterns
        .where('patternId')
        .equals(initialPattern.id)
        .first();
      if (active?.startDate) {
        setActiveStartDate(active.startDate);
      }
    }
  }, [initialPattern]);

  // Initial shift sequence
  const [days, setDays] = useState<ShiftDay[]>(() => {
    if (initialPattern && initialPattern.days.length > 0) {
      return initialPattern.days.map((d) => ({
        ...d,
        id: d.id || crypto.randomUUID(),
      }));
    }
    return [];
  });

  // Custom column layout override (null = auto calculated from cycle length)
  const [customColumns, setCustomColumns] = useState<number | null>(
    initialPattern?.columns || null
  );
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  // Helper to create ShiftDay from ShiftType
  const createShiftDay = (st: ShiftType, dayIndex: number): ShiftDay => ({
    id: crypto.randomUUID(),
    dayIndex,
    shiftTypeId: st.id,
    type: st.type,
    name: st.name,
    startTime: st.startTime,
    endTime: st.endTime,
    color: st.color,
    icon: st.icon,
  });

  // Default fallback shift type
  const fallbackShiftType: ShiftType = useMemo(() => {
    if (shiftTypes && shiftTypes.length > 0) return shiftTypes[0];
    return {
      id: 'st-work',
      name: 'Sabah',
      startTime: '08:00',
      endTime: '16:00',
      type: 'WORK',
      color: '#3b82f6',
    };
  }, [shiftTypes]);

  // Reorder days via drag-and-drop
  const handleMoveDay = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    setDays((prev) => {
      if (toIndex >= prev.length) return prev;
      const updated = [...prev];
      const [movedItem] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, movedItem);
      return updated.map((d, i) => ({ ...d, dayIndex: i + 1 }));
    });
  };

  // Adjust cycle length directly (adds or removes days)
  const handleSetCycleLength = (targetLength: number) => {
    const validTarget = Math.max(0, Math.min(365, targetLength));
    if (validTarget === days.length) return;

    setDays((prev) => {
      if (validTarget === 0) return [];
      if (validTarget < prev.length) {
        return prev.slice(0, validTarget).map((d, i) => ({ ...d, dayIndex: i + 1 }));
      }

      // Expanding days: repeat sequence pattern or fill with last/fallback
      const diff = validTarget - prev.length;
      const nextDays = [...prev];

      for (let i = 0; i < diff; i++) {
        const nextIdx = nextDays.length;
        if (prev.length > 0) {
          // Loop existing pattern smoothly
          const sourceDay = prev[i % prev.length];
          nextDays.push({
            ...sourceDay,
            id: crypto.randomUUID(),
            dayIndex: nextIdx + 1,
          });
        } else {
          nextDays.push(createShiftDay(fallbackShiftType, nextIdx + 1));
        }
      }

      return nextDays;
    });
  };

  // Increment cycle days (+1)
  const handleIncrementDay = () => {
    handleSetCycleLength(days.length === 0 ? 1 : days.length + 1);
  };

  // Decrement cycle days (-1)
  const handleDecrementDay = () => {
    if (days.length <= 1) {
      setDays([]);
      return;
    }
    handleSetCycleLength(days.length - 1);
  };

  // Append a shift type to sequence
  const handleAppendShift = (st: ShiftType) => {
    setDays((prev) => [...prev, createShiftDay(st, prev.length + 1)]);
  };

  // Remove a specific day
  const handleRemoveDay = (index: number) => {
    setDays((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((d, i) => ({ ...d, dayIndex: i + 1 }));
    });
  };

  // Change a day's shift type
  const handleChangeDayType = (index: number, st: ShiftType) => {
    setDays((prev) => {
      const next = [...prev];
      next[index] = {
        ...createShiftDay(st, index + 1),
        id: next[index].id || crypto.randomUUID(),
      };
      return next;
    });
  };

  // Remove last day (Undo/Back)
  const handlePopLastDay = () => {
    if (days.length === 0) return;
    handleRemoveDay(days.length - 1);
  };

  // Compute automatic columns per row based on cycle day count
  const autoColumns = useMemo(() => {
    const len = days.length;
    if (len <= 1) return 1;
    if (len <= 8) return len; // 2, 3, 4, 5, 6, 7, 8: 1 full cycle per row
    if (len % 7 === 0) return 7; // Weekly flow (14, 21, 28, 35...)
    if (len % 6 === 0) return 6; // 6-day flow (12, 18, 24, 30, 36...)
    if (len % 5 === 0) return 5; // 5-day flow (10, 15, 20, 25...)
    if (len % 8 === 0) return 8; // 8-day flow (16, 24, 32...)
    if (len % 4 === 0) return 4; // 4-day flow (12, 16, 20...)
    // For other cycle sizes (e.g. 38 days) default to 7 (standard calendar week layout)
    return 7;
  }, [days.length]);

  const effectiveColumns = customColumns ?? autoColumns;

  // Quick Preset Templates
  const handleApplyTemplate = (templateKey: string) => {
    if (!shiftTypes || shiftTypes.length === 0) return;

    const findType = (pred: (st: ShiftType) => boolean, fallback: ShiftType) =>
      shiftTypes.find(pred) || fallback;

    const morning = findType(
      (s) =>
        s.name.toLowerCase().includes('sabah') ||
        s.name.toLowerCase().includes('gündüz'),
      shiftTypes[0]
    );
    const afternoon = findType(
      (s) =>
        s.name.toLowerCase().includes('akşam') ||
        s.name.toLowerCase().includes('öğle'),
      shiftTypes[1] || shiftTypes[0]
    );
    const night = findType(
      (s) => s.name.toLowerCase().includes('gece'),
      shiftTypes[2] || shiftTypes[0]
    );
    const off = findType(
      (s) =>
        s.type === 'REST' ||
        s.name.toLowerCase().includes('off') ||
        s.name.toLowerCase().includes('istirahat'),
      shiftTypes.find((s) => s.type === 'REST') || shiftTypes[0]
    );
    const h24 = findType(
      (s) => s.name.includes('24') || s.name.toLowerCase().includes('nöbet'),
      morning
    );

    let templateDays: ShiftType[] = [];
    let templateName = '';

    switch (templateKey) {
      case '2g-2g-2o':
        templateName = '2 Gündüz 2 Gece 2 Off';
        templateDays = [morning, morning, night, night, off, off];
        break;
      case '4w-2o':
        templateName = '4 Çalış 2 İzin';
        templateDays = [morning, morning, morning, morning, off, off];
        break;
      case '24-48':
        templateName = '24 / 48 Saat';
        templateDays = [h24, off, off];
        break;
      case '3-shift':
        templateName = '3 Vardiya (S-A-G-Off)';
        templateDays = [morning, afternoon, night, off];
        break;
      case '1g-1g-2o':
        templateName = '1 Gündüz 1 Gece 2 Off';
        templateDays = [morning, night, off, off];
        break;
      case '6w-1o':
        templateName = '6 Çalış 1 İzin';
        templateDays = [morning, morning, morning, morning, morning, morning, off];
        break;
      default:
        break;
    }

    if (templateDays.length > 0) {
      if (!name || name.trim() === '' || name.includes('Gündüz') || name.includes('Çalış')) {
        setName(templateName);
      }
      setDays(templateDays.map((st, i) => createShiftDay(st, i + 1)));
      setCustomColumns(null); // Reset to auto columns for template
    }
  };

  // Stats
  const stats = useMemo(() => {
    const total = days.length;
    const work = days.filter((d) => d.type === 'WORK').length;
    const rest = days.filter((d) => d.type === 'REST').length;
    return { total, work, rest };
  }, [days]);

  // Trigger Save and open Start Date dialog
  const handleInitiateSave = () => {
    if (!name.trim()) {
      alert('Lütfen vardiya düzenine bir isim verin.');
      return;
    }

    if (days.length === 0) {
      alert('Lütfen düzen için en az 1 vardiya günü ekleyin.');
      return;
    }

    // Open the start date modal
    setIsStartDateModalOpen(true);
  };

  // Save pattern to db
  const savePatternToDb = async (): Promise<string> => {
    const patternId = initialPattern?.id || crypto.randomUUID();

    const patternData: ShiftPattern = {
      id: patternId,
      name: name.trim(),
      cycleLength: days.length,
      days,
      columns: customColumns ?? autoColumns,
      createdAt: initialPattern?.createdAt || new Date().toISOString(),
    };

    if (initialPattern) {
      await db.patterns.put(patternData);
    } else {
      await db.patterns.add(patternData);
    }

    return patternId;
  };

  // Save and apply to calendar with selected start date
  const handleApplyStartDate = async (chosenStartDate: string) => {
    const patternId = await savePatternToDb();

    // Set as active pattern with chosen start date
    await db.activePatterns.clear();
    await db.activePatterns.add({
      id: crypto.randomUUID(),
      patternId: patternId,
      startDate: chosenStartDate,
    });

    setIsStartDateModalOpen(false);
    onSave();
  };

  // Save only without setting/changing active pattern
  const handleSaveWithoutApplying = async () => {
    await savePatternToDb();
    setIsStartDateModalOpen(false);
    onSave();
  };

  return (
    <div className="space-y-3.5 animate-in fade-in duration-200">
      {/* 1. Header Toolbar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
            {initialPattern ? t('edit_pattern') : t('add_pattern')}
          </h2>
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1.5 mt-0.5">
            {stats.total > 0 ? (
              <>
                <span className="font-bold text-primary-600 dark:text-primary-400">
                  {stats.total} Günlük Döngü
                </span>
                <span>•</span>
                <span>{stats.work} Çalışma</span>
                <span>•</span>
                <span>{stats.rest} İzin</span>
              </>
            ) : (
              <span>Döngü gün sayısını ve vardiya sırasını belirleyin</span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleInitiateSave}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-xs transition-all active:scale-95 flex items-center space-x-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{t('save')}</span>
          </button>
        </div>
      </div>

      {/* 2. Full-Width Clean Pattern Name Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <FileText className="w-4 h-4 text-primary-500/80" />
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Düzen Adı (Örn: 2 Gündüz 2 Gece 2 Off, 4+2, 24/48, 38 Günlük...)"
          className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm font-semibold rounded-2xl bg-card border border-slate-200 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-2xs placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all"
        />
      </div>

      {/* 3. Cycle Day Selector & Stepper Controls (Gün Seçimi, Arttırma / Azaltma) */}
      <div className="bg-card p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/90 shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* Label and Stepper */}
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-xl bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 flex items-center justify-center font-extrabold shrink-0">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                <span>Döngü Gün Sayısı</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-bold">
                  {days.length} Gün
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Döngü süresini belirleyin veya arttırıp azaltın
              </p>
            </div>
          </div>

          {/* Stepper (+ / -) and Direct Input */}
          <div className="flex items-center space-x-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleDecrementDay}
              disabled={days.length <= 0}
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer shadow-2xs"
              title="Günü Azalt (-1)"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <div className="relative flex items-center">
              <input
                type="number"
                min="0"
                max="365"
                value={days.length === 0 ? '' : days.length}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (isNaN(val)) {
                    setDays([]);
                  } else {
                    handleSetCycleLength(val);
                  }
                }}
                placeholder="0"
                className="w-16 h-8 text-center text-xs font-black rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-mono"
              />
              <span className="absolute right-1 text-[9px] font-bold text-slate-400 pointer-events-none pr-1">
                Gün
              </span>
            </div>

            <button
              type="button"
              onClick={handleIncrementDay}
              className="w-8 h-8 rounded-xl bg-primary-600 hover:bg-primary-700 active:scale-95 text-white transition-all flex items-center justify-center cursor-pointer shadow-2xs font-bold"
              title="Günü Arttır (+1)"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Day Presets */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 scrollbar-none pt-0.5 border-t border-slate-100 dark:border-slate-800/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 shrink-0 mr-1">
            Hızlı Gün:
          </span>
          {[2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 21, 28, 38].map((presetCount) => {
            const isCurrent = days.length === presetCount;
            return (
              <button
                key={presetCount}
                type="button"
                onClick={() => handleSetCycleLength(presetCount)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isCurrent
                    ? 'bg-primary-600 text-white shadow-xs scale-102 ring-2 ring-primary-500/30'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40 dark:hover:text-primary-400 border border-slate-200/80 dark:border-slate-700/80'
                }`}
              >
                {presetCount} Gün
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Quick Templates Chips */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 shrink-0 flex items-center space-x-1 mr-0.5">
          <Sparkles className="w-2.5 h-2.5 text-amber-500" />
          <span>Şablon:</span>
        </span>
        {[
          { id: '2g-2g-2o', label: '2G 2G 2O (6G)' },
          { id: '4w-2o', label: '4+2 (6G)' },
          { id: '24-48', label: '24/48 (3G)' },
          { id: '3-shift', label: '3 Vardiya (4G)' },
          { id: '1g-1g-2o', label: '1G 1G 2O (4G)' },
          { id: '6w-1o', label: '6+1 (7G)' },
        ].map((tmpl) => (
          <button
            key={tmpl.id}
            type="button"
            onClick={() => handleApplyTemplate(tmpl.id)}
            className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40 dark:hover:text-primary-400 border border-slate-200/80 dark:border-slate-700/80 font-bold whitespace-nowrap text-[11px] transition-colors shrink-0 cursor-pointer"
          >
            {tmpl.label}
          </button>
        ))}
      </div>

      {/* 5. Tap-to-Add Shift Types Palette (Square Format) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300">
            Vardiya Seç / Ekle:
          </span>
          {days.length > 0 && (
            <div className="flex items-center space-x-2 text-[11px]">
              <button
                type="button"
                onClick={handlePopLastDay}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center space-x-0.5 cursor-pointer font-medium"
                title="Son eklenen günü sil"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Geri Al</span>
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <button
                type="button"
                onClick={() => setDays([])}
                className="text-red-500 hover:text-red-600 font-medium cursor-pointer"
              >
                Temizle
              </button>
            </div>
          )}
        </div>

        {/* Square Addition Buttons */}
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {shiftTypes?.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => handleAppendShift(st)}
              className="flex flex-col items-center justify-between p-2 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.03] active:scale-95 transition-all text-center group cursor-pointer aspect-square text-white border border-black/10 dark:border-white/10 select-none min-h-[60px]"
              style={{
                backgroundColor: st.color,
              }}
            >
              <div className="w-full flex items-center justify-between px-0.5 text-white/80 leading-none">
                <ShiftIcon icon={st.icon} type={st.type} name={st.name} className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold">+</span>
              </div>

              <div className="my-auto w-full px-0.5">
                <div className="font-black text-xs sm:text-sm text-white truncate drop-shadow-2xs">
                  {st.name}
                </div>
              </div>

              <div className="text-[8px] sm:text-[9px] font-bold text-white/80 font-mono truncate w-full">
                {st.type === 'WORK'
                  ? `${st.startTime.slice(0, 5)}-${st.endTime.slice(0, 5)}`
                  : 'İstirahat'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 6. Sequence Days with Dynamic Per-Row Card Layout */}
      <div className="space-y-2 pt-1">
        {/* Header with Card Count per Row Adjustment */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-slate-800 dark:text-slate-200">
              Döngü Sıralaması
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300">
              {days.length} Gün
            </span>
          </div>

          {/* Cards per Row / Grid Columns Selector */}
          {days.length > 0 && (
            <div className="flex items-center space-x-1.5 self-start sm:self-auto bg-slate-100/90 dark:bg-slate-800/80 px-2 py-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-[11px]">
              <LayoutGrid className="w-3.5 h-3.5 text-primary-500 shrink-0" />
              <span className="font-bold text-slate-600 dark:text-slate-300 shrink-0">
                Satırda:
              </span>

              <button
                type="button"
                onClick={() => setCustomColumns(null)}
                className={`px-2 py-0.5 rounded-lg font-bold text-[10px] transition-all cursor-pointer ${
                  customColumns === null
                    ? 'bg-primary-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title={`Döngü gün sayısına (${days.length}) göre otomatik: ${autoColumns} kart`}
              >
                Oto ({autoColumns})
              </button>

              {[4, 5, 6, 7, 8].map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setCustomColumns(col)}
                  className={`px-1.5 py-0.5 rounded-lg font-extrabold text-[10px] transition-all cursor-pointer ${
                    customColumns === col
                      ? 'bg-primary-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                  }`}
                >
                  {col}
                </button>
              ))}
            </div>
          )}
        </div>

        {days.length === 0 ? (
          <div className="py-8 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-2 bg-slate-50/50 dark:bg-slate-900/30">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Döngü henüz boş.
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Yukarıdaki <strong>Döngü Gün Sayısı</strong> butonlarından bir gün seçebilir veya vardiya butonlarına basarak sırayla ekleyebilirsiniz.
            </p>
          </div>
        ) : (
          <div className="max-h-[calc(100vh-280px)] min-h-[140px] overflow-y-auto pr-0.5 scrollbar-thin">
            {/* Dynamic Sized Grid based on selected cycle / per-row setting */}
            <div
              className="grid gap-1 sm:gap-1.5 pb-2 transition-all"
              style={{
                gridTemplateColumns: `repeat(${effectiveColumns}, minmax(0, 1fr))`,
              }}
            >
              <AnimatePresence mode="popLayout">
                {days.map((day, idx) => {
                  const isSelected = selectedDayIdx === idx;
                  return (
                    <motion.div
                      key={day.id || `${day.shiftTypeId}-${idx}`}
                      layout
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ duration: 0.12 }}
                      draggable
                      onDragStart={(e: any) => {
                        setDraggedIdx(idx);
                        if (e.dataTransfer) {
                          e.dataTransfer.effectAllowed = 'move';
                        }
                      }}
                      onDragOver={(e: any) => {
                        e.preventDefault();
                        if (e.dataTransfer) {
                          e.dataTransfer.dropEffect = 'move';
                        }
                      }}
                      onDragEnter={() => {
                        if (draggedIdx !== null && draggedIdx !== idx) {
                          handleMoveDay(draggedIdx, idx);
                          setDraggedIdx(idx);
                        }
                      }}
                      onDragEnd={() => setDraggedIdx(null)}
                      onClick={() =>
                        setSelectedDayIdx(selectedDayIdx === idx ? null : idx)
                      }
                      className={`rounded-xl p-1 shadow-sm hover:shadow-md transition-all relative flex flex-col justify-between cursor-pointer select-none aspect-square min-h-[42px] sm:min-h-[50px] text-white ${
                        draggedIdx === idx
                          ? 'opacity-40 scale-95 ring-2 ring-white/60'
                          : isSelected
                          ? 'scale-105 ring-3 ring-white shadow-xl z-20'
                          : 'hover:scale-[1.03] border border-black/10 dark:border-white/10'
                      }`}
                      style={{
                        backgroundColor: day.color,
                      }}
                    >
                      {/* Top: Day # and Icon */}
                      <div className="flex items-center justify-between w-full leading-none">
                        <span className="text-[9px] sm:text-[10px] font-black text-white/90">
                          {idx + 1}
                        </span>

                        <ShiftIcon
                          icon={day.icon}
                          type={day.type}
                          name={day.name}
                          className="w-3 h-3 text-white/80 shrink-0"
                        />
                      </div>

                      {/* Center: Shift Name */}
                      <div className="my-auto w-full text-center px-0.5">
                        <div className="font-black text-[10px] sm:text-xs text-white truncate leading-tight drop-shadow-2xs">
                          {day.name}
                        </div>
                      </div>

                      {/* Bottom: Subtext (Time or Off) */}
                      <div className="w-full text-center leading-none pb-0.5">
                        <span className="text-[8px] sm:text-[9px] font-bold text-white/85 font-mono truncate block">
                          {day.type === 'WORK' && day.startTime
                            ? day.startTime.slice(0, 5)
                            : 'İzin'}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Floating Dropdown / Popover Menu for Selected Day */}
      <AnimatePresence>
        {selectedDayIdx !== null && days[selectedDayIdx] && (
          <>
            {/* Backdrop to close on tap outside */}
            <div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-2xs animate-in fade-in duration-150"
              onClick={() => setSelectedDayIdx(null)}
            />

            {/* Dropdown Menu Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.15 }}
              className="fixed z-50 bottom-[calc(1.25rem+var(--sab))] left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-84 bg-card dark:bg-slate-900 rounded-3xl p-4 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3.5 max-h-[calc(100dvh-var(--sat)-var(--sab)-3rem)] overflow-y-auto"
            >
              {/* Header: Day # and current name */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full shadow-xs"
                    style={{ backgroundColor: days[selectedDayIdx].color }}
                  />
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                      {selectedDayIdx + 1}. Gün: {days[selectedDayIdx].name}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Değiştirmek istediğiniz vardiyayı seçin
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDayIdx(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Square Shift Type Selection Cards */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Vardiyayı Değiştir:
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {shiftTypes?.map((st) => {
                    const isCurrent =
                      days[selectedDayIdx].shiftTypeId === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          handleChangeDayType(selectedDayIdx, st);
                          setSelectedDayIdx(null);
                        }}
                        className={`flex flex-col items-center justify-between p-1.5 rounded-2xl shadow-sm hover:scale-[1.04] active:scale-95 transition-all text-center cursor-pointer aspect-square text-white select-none ${
                          isCurrent
                            ? 'ring-3 ring-primary-500 ring-offset-2 ring-offset-card'
                            : 'hover:opacity-90'
                        }`}
                        style={{
                          backgroundColor: st.color,
                        }}
                      >
                        <div className="w-full flex items-center justify-between h-3.5">
                          <ShiftIcon
                            icon={st.icon}
                            type={st.type}
                            name={st.name}
                            className="w-3 h-3 text-white/90"
                          />
                          {isCurrent && <Check className="w-3 h-3 text-white" />}
                        </div>

                        <div className="font-black text-xs text-white truncate w-full px-0.5 leading-tight">
                          {st.name}
                        </div>

                        <div className="text-[8px] font-bold text-white/80 font-mono truncate w-full pb-0.5">
                          {st.type === 'WORK'
                            ? st.startTime.slice(0, 5)
                            : 'İzin'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Action: Günü Sil */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    handleRemoveDay(selectedDayIdx);
                    setSelectedDayIdx(null);
                  }}
                  className="w-full py-2.5 px-3 rounded-2xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                  <span>Günü Sil</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Start Date Selection Modal (Opened after Save) */}
      <SetPatternStartDateModal
        isOpen={isStartDateModalOpen}
        pattern={{ name: name.trim(), days }}
        initialDate={activeStartDate}
        onClose={() => setIsStartDateModalOpen(false)}
        onApply={handleApplyStartDate}
        onSaveWithoutApplying={handleSaveWithoutApplying}
      />
    </div>
  );
};
