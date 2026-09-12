import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, addDays } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { Calendar, Check, X, Sparkles, Clock, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ShiftPattern, ShiftDay } from '../db/db';

interface SetPatternStartDateModalProps {
  isOpen: boolean;
  pattern: ShiftPattern | { name: string; days: ShiftDay[] } | null;
  initialDate?: string;
  onClose: () => void;
  onApply: (startDate: string) => void | Promise<void>;
  onSaveWithoutApplying?: () => void | Promise<void>;
}

export const SetPatternStartDateModal = ({
  isOpen,
  pattern,
  initialDate,
  onClose,
  onApply,
  onSaveWithoutApplying,
}: SetPatternStartDateModalProps) => {
  const { i18n } = useTranslation();
  const dateLocale = i18n.language.startsWith('tr') ? tr : enUS;

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState<string>(
    initialDate || todayStr
  );

  if (!isOpen || !pattern) return null;

  const firstDay = pattern.days?.[0];

  // Quick Preset Dates
  const today = new Date();
  const tomorrow = addDays(today, 1);
  
  // Calculate upcoming Monday
  const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  let mondayOffset = (1 + 7 - dayOfWeek) % 7; // days until next Monday (0 if today is Monday)
  if (mondayOffset === 0) {
    mondayOffset = 7; // If today is Monday, next Monday is in 7 days
  }
  let mondayDate = addDays(today, mondayOffset);
  let mondayLabel = 'Pazartesi';
  
  // If tomorrow is already Monday (e.g. today is Sunday), jump to the following Monday for the 3rd preset
  if (format(mondayDate, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd')) {
    mondayDate = addDays(mondayDate, 7);
    mondayLabel = 'Gelecek Pzt';
  } else if (mondayOffset === 7) {
    mondayLabel = 'Gelecek Pzt';
  }

  const quickDates = [
    { id: 'today', label: 'Bugün', date: format(today, 'yyyy-MM-dd'), desc: format(today, 'd MMM', { locale: dateLocale }) },
    { id: 'tomorrow', label: 'Yarın', date: format(tomorrow, 'yyyy-MM-dd'), desc: format(tomorrow, 'd MMM', { locale: dateLocale }) },
    { id: 'next-monday', label: mondayLabel, date: format(mondayDate, 'yyyy-MM-dd'), desc: format(mondayDate, 'd MMM', { locale: dateLocale }) },
  ];

  const parsedSelectedDate = new Date(`${selectedDate}T00:00:00`);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Dialog Content */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="bg-card dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl relative z-10 space-y-4"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-primary-50 dark:bg-primary-950/50 flex items-center justify-center text-primary-600 dark:text-primary-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Takvime Başlama Tarihi
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Düzenin 1. günü hangi tarihte başlayacak?
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Pattern Info & 1st Day Preview Badge */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                {pattern.name}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                {pattern.days.length} Günlük Döngü
              </span>
            </div>

            {firstDay && (
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  1. Gün Başlangıç Vardiyası:
                </span>
                <div
                  className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-bold shadow-2xs"
                  style={{
                    backgroundColor: `${firstDay.color}20`,
                    color: firstDay.color,
                    border: `1px solid ${firstDay.color}40`,
                  }}
                >
                  <span>{firstDay.name}</span>
                  {firstDay.type === 'WORK' && firstDay.startTime && (
                    <span className="text-[10px] opacity-80 font-mono">
                      ({firstDay.startTime.slice(0, 5)})
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Date Presets */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Hızlı Seçim</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {quickDates.map((item) => {
                const isSelected = selectedDate === item.date;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedDate(item.date)}
                    className={`py-2 px-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50/70 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 ring-2 ring-primary-500/20 shadow-xs'
                        : 'border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-xs font-extrabold">{item.label}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{item.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Date Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              veya Özel Tarih Seçin
            </label>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-card border border-slate-200 dark:border-slate-700/80 font-bold text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-2xs cursor-pointer"
              />
            </div>
            
            {/* Formatted Date Hint */}
            {!isNaN(parsedSelectedDate.getTime()) && (
              <div className="text-[11px] text-primary-600 dark:text-primary-400 font-medium px-1 flex items-center space-x-1">
                <Clock className="w-3 h-3 shrink-0" />
                <span>
                  {format(parsedSelectedDate, 'd MMMM yyyy, EEEE', { locale: dateLocale })} gününden itibaren takvimde başlayacak.
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => onApply(selectedDate)}
              className="w-full py-3 px-4 rounded-2xl bg-primary-600 hover:bg-primary-700 active:scale-98 text-white font-extrabold text-xs shadow-md shadow-primary-500/25 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Takvime Uygula ve Başlat</span>
            </button>

            {onSaveWithoutApplying && (
              <button
                type="button"
                onClick={onSaveWithoutApplying}
                className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <span>Sadece Düzeni Kaydet (Daha Sonra Uygula)</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
