import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check, Clock, Briefcase, Coffee, Sparkles, Lock } from 'lucide-react';
import { db, type ShiftType, getFixedShiftInfo } from '../db/db';
import {
  SHIFT_ICONS,
  ShiftIcon,
  resolveShiftIconName,
  type ShiftIconCategory,
} from '../utils/shiftIcons';

interface ShiftTypeModalProps {
  shiftType?: ShiftType | null;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#3b82f6', // Mavi
  '#6366f1', // İndigo
  '#8b5cf6', // Mor
  '#a855f7', // Menekşe
  '#ec4899', // Pembe
  '#f43f5e', // Mercan / Kırmızı
  '#e11d48', // Gül Kurusu / Koyu Kırmızı
  '#f97316', // Turuncu
  '#f59e0b', // Kehribar / Sarı
  '#10b981', // Zümrüt Yeşili
  '#14b8a6', // Turkuaz
  '#06b6d4', // Camgöbeği
  '#64748b', // Grafit Gri
];

export const ShiftTypeModal = ({ shiftType, onClose }: ShiftTypeModalProps) => {
  const { t, i18n } = useTranslation();
  const isEditing = !!shiftType;
  const isSystemType = Boolean(shiftType?.isSystem);
  const fixedInfo = getFixedShiftInfo(shiftType);
  const isFixedShift = !!fixedInfo;
  const isFixedWorkShift = fixedInfo?.fixedType === 'WORK';
  const isDefaultWorkShift = isFixedWorkShift;
  const isEn = i18n.language?.startsWith('en');

  const [name, setName] = useState(shiftType?.name || '');
  const [type, setType] = useState<'WORK' | 'REST'>(
    fixedInfo ? fixedInfo.fixedType : (shiftType?.type || 'WORK')
  );
  const [startTime, setStartTime] = useState(
    fixedInfo?.fixedHours?.startTime ?? (shiftType?.startTime || '08:00')
  );
  const [endTime, setEndTime] = useState(
    fixedInfo?.fixedHours?.endTime ?? (shiftType?.endTime || '16:00')
  );
  const [color, setColor] = useState(
    shiftType?.color || (isSystemType ? '#f59e0b' : '#3b82f6')
  );
  const [icon, setIcon] = useState(
    shiftType?.icon ||
      resolveShiftIconName(
        undefined,
        fixedInfo ? fixedInfo.fixedType : (shiftType?.type || 'WORK'),
        shiftType?.name
      )
  );
  const [iconCategory, setIconCategory] = useState<ShiftIconCategory>(
    isSystemType
      ? (shiftType?.systemCategory === 'HOLIDAY' ? 'holiday' : 'rest')
      : isFixedShift && fixedInfo.fixedType === 'REST'
      ? 'rest'
      : isFixedShift && fixedInfo.fixedType === 'WORK'
      ? 'work'
      : 'all'
  );

  const handleTypeChange = (newType: 'WORK' | 'REST') => {
    if (isFixedShift) return;
    setType(newType);
    if (newType === 'WORK') {
      if (!startTime) setStartTime('08:00');
      if (!endTime) setEndTime('16:00');
      if (icon === 'Coffee' || icon === 'Bed' || icon === 'Palmtree' || icon === 'Home') {
        setIcon('Sun');
      }
    } else {
      if (icon === 'Sun' || icon === 'Briefcase' || icon === 'Sunset' || icon === 'Moon' || icon === 'Clock') {
        setIcon('Coffee');
      }
    }
  };

  const filteredIcons = SHIFT_ICONS.filter(
    (item) => iconCategory === 'all' || item.category === iconCategory
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert(isEn ? 'Please provide a shift name.' : 'Lütfen vardiya tipine bir isim verin.');
      return;
    }

    const finalType = isSystemType
      ? 'REST'
      : fixedInfo
      ? fixedInfo.fixedType
      : type;

    const finalStartTime =
      !isSystemType && finalType === 'WORK'
        ? (fixedInfo?.fixedHours?.startTime || startTime)
        : '';
    const finalEndTime =
      !isSystemType && finalType === 'WORK'
        ? (fixedInfo?.fixedHours?.endTime || endTime)
        : '';

    const finalIcon = icon || resolveShiftIconName(undefined, finalType, name.trim());

    if (isEditing && shiftType) {
      await db.shiftTypes.update(shiftType.id, {
        name: name.trim(),
        type: finalType,
        startTime: finalStartTime,
        endTime: finalEndTime,
        color,
        icon: finalIcon,
        isFixed: isFixedShift || shiftType.isFixed,
      });
    } else {
      const count = await db.shiftTypes.count();
      await db.shiftTypes.add({
        id: crypto.randomUUID(),
        name: name.trim(),
        type: finalType,
        startTime: finalStartTime,
        endTime: finalEndTime,
        color,
        icon: finalIcon,
        isDefault: false,
        isFixed: false,
        order: count,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
              {isSystemType
                ? isEn
                  ? 'Customize System Type'
                  : 'Sistem Tipini Özelleştir'
                : isEditing
                ? t('edit_shift_type')
                : t('add_shift_type')}
            </h2>
            {isSystemType ? (
              <span className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
                ⭐ {isEn ? 'System Shift Type (Protected)' : 'Sistem Vardiya Tipi (Silinemez)'}
              </span>
            ) : isFixedShift ? (
              <span className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
                🔒 {isEn ? 'Default Fixed Shift Type (Protected)' : 'Varsayılan Sabit Vardiya Tipi (Korumalı)'}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* System Type Info Banner */}
        {isSystemType && (
          <div className="mb-4 p-3 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-300 dark:border-amber-700/60 rounded-2xl flex items-center space-x-2.5 text-xs text-amber-900 dark:text-amber-200">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="min-w-0">
              <span className="font-black">
                {shiftType?.systemCategory === 'VACATION' ? '🌴 Yıllık İzin' : '🎉 Resmi Tatil'}:
              </span>{' '}
              {isEn
                ? 'This type is used directly across the Calendar and Leave Planner. Changes take effect immediately.'
                : 'Bu tip takvim ve izin planlayıcı üzerinde kullanılır. Yapılan renk ve simge değişiklikleri tüm uygulamaya anında yansır.'}
            </div>
          </div>
        )}

        {/* Fixed Shift Type Info Banner */}
        {isFixedShift && !isSystemType && (
          <div className="mb-4 p-3 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 dark:border-amber-700/60 rounded-2xl flex items-center space-x-2.5 text-xs text-amber-900 dark:text-amber-200">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="min-w-0">
              <span className="font-black">{shiftType?.name}:</span>{' '}
              {isEn
                ? 'This default shift type has a fixed category and hours. You can customize its color and icon.'
                : 'Bu varsayılan vardiya tipi için tür ve saatler sabittir. Renk ve simgeyi dilediğiniz gibi özelleştirebilirsiniz.'}
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Shift Name */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">
              {t('shift_name')} *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Sabah, Akşam, 12s Nöbet, Off, Yıllık İzin"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500 font-medium text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Work / Rest Type Selection (Only for regular shift types) */}
          {!isSystemType ? (
            <div>
              <label className="block text-xs sm:text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">
                <div className="flex items-center space-x-1.5">
                  <span>{t('shift_type')}</span>
                  {isFixedShift && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-500 font-bold bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                      (Sabit)
                    </span>
                  )}
                </div>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={isFixedShift}
                  onClick={() => !isFixedShift && handleTypeChange('WORK')}
                  className={`flex items-center justify-center space-x-2 py-2.5 px-3.5 rounded-xl border font-semibold text-sm transition-all ${
                    isFixedShift ? 'cursor-not-allowed' : 'cursor-pointer'
                  } ${
                    type === 'WORK'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 shadow-xs'
                      : isFixedShift
                      ? 'border-slate-200 dark:border-slate-800 opacity-40 text-slate-400 dark:text-slate-600 bg-slate-50/50 dark:bg-slate-900/30'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  <span>{t('work')}</span>
                </button>

                <button
                  type="button"
                  disabled={isFixedShift}
                  onClick={() => !isFixedShift && handleTypeChange('REST')}
                  className={`flex items-center justify-center space-x-2 py-2.5 px-3.5 rounded-xl border font-semibold text-sm transition-all ${
                    isFixedShift ? 'cursor-not-allowed' : 'cursor-pointer'
                  } ${
                    type === 'REST'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : isFixedShift
                      ? 'border-slate-200 dark:border-slate-800 opacity-40 text-slate-400 dark:text-slate-600 bg-slate-50/50 dark:bg-slate-900/30'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Coffee className="w-4 h-4" />
                  <span>{t('rest')}</span>
                </button>
              </div>
              {isFixedShift && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>
                    {isEn
                      ? 'This default shift type has a fixed category and cannot be modified.'
                      : 'Bu varsayılan vardiya için tür seçimi (Çalışma / İstirahat) sabittir.'}
                  </span>
                </p>
              )}
            </div>
          ) : null}

          {/* Time Range (Only for Regular Work Shifts) */}
          {!isSystemType ? (
            type === 'WORK' ? (
              <div>
                <label className="block text-xs sm:text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary-500" />
                    <span>{t('time_range')}</span>
                    {isDefaultWorkShift && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-500 font-bold bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                        (Sabit)
                      </span>
                    )}
                  </div>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-0.5">{t('start_time')}</span>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      disabled={isDefaultWorkShift}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-0.5">{t('end_time')}</span>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      disabled={isDefaultWorkShift}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-xs text-emerald-700 dark:text-emerald-300 flex items-center space-x-2">
                <Coffee className="w-4 h-4 shrink-0" />
                <span>{t('all_day_rest_note')}</span>
              </div>
            )
          ) : null}

          {/* Icon Selector (Simge Seçimi) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                {t('select_icon')}
              </label>
              {/* Category Filter Pills */}
              <div className="flex items-center space-x-1 text-[11px]">
                {(
                  [
                    { id: 'all', label: t('icon_category_all') },
                    { id: 'time', label: t('icon_category_time') },
                    { id: 'work', label: t('icon_category_work') },
                    { id: 'rest', label: t('icon_category_rest') },
                    { id: 'holiday', label: isEn ? 'Holiday & Special' : 'Tatil & Özel' },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setIconCategory(cat.id)}
                    className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                      iconCategory === cat.id
                        ? 'bg-primary-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Icon Grid */}
            <div className="grid grid-cols-7 sm:grid-cols-8 gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/80 max-h-36 overflow-y-auto scrollbar-thin">
              {filteredIcons.map((item) => {
                const IconComp = item.icon;
                const isSelected = icon === item.id;
                const tooltip = isEn ? item.nameEn : item.name;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIcon(item.id)}
                    title={tooltip}
                    className={`h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'bg-primary-600 text-white shadow-xs scale-105 ring-2 ring-primary-500 ring-offset-2 ring-offset-card'
                        : 'hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:scale-105'
                    }`}
                  >
                    <IconComp className="w-5 h-5 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Picker (Renk Seçimi) */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
              {t('color')}
            </label>
            <div className="flex flex-wrap gap-2.5 items-center">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                    color === c
                      ? 'scale-115 ring-2 ring-primary-500 ring-offset-2 ring-offset-card'
                      : 'hover:scale-110 opacity-90 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                </button>
              ))}

              {/* Custom Color Input */}
              <div className="relative flex items-center">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 rounded-full border-0 cursor-pointer p-0 opacity-0 absolute inset-0"
                />
                <div
                  className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-xs font-bold text-slate-500"
                  style={{
                    backgroundColor: !PRESET_COLORS.includes(color) ? color : undefined,
                  }}
                >
                  {!PRESET_COLORS.includes(color) ? (
                    <Check className="w-4 h-4 text-white drop-shadow-md" />
                  ) : (
                    '+'
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Preview Badge */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('preview')}:
            </span>
            <div
              className="px-3 py-1 rounded-full text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm"
              style={{ backgroundColor: color }}
            >
              <ShiftIcon icon={icon} type={isSystemType ? 'REST' : type} name={name} className="w-4 h-4" />
              <span>{name || (isSystemType ? 'Örnek Tip' : 'Örnek Vardiya')}</span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center space-x-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm shadow-md transition-transform active:scale-95 cursor-pointer"
            >
              {t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
