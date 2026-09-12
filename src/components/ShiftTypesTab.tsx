import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Trash2,
  Clock,
  Sparkles,
  GripVertical,
  Lock,
  ArrowUpDown,
  Check,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Reorder, useDragControls } from 'framer-motion';
import { db, type ShiftType, ensureDefaultShiftTypes, isFixedShiftType } from '../db/db';
import { ShiftTypeModal } from './ShiftTypeModal';
import { ShiftIcon } from '../utils/shiftIcons';

interface ShiftTypeItemRowProps {
  st: ShiftType;
  isReorderMode: boolean;
  onEdit: (st: ShiftType) => void;
  onDelete: (st: ShiftType) => void;
  t: any;
}

const ShiftTypeItemRow = ({
  st,
  isReorderMode,
  onEdit,
  onDelete,
  t,
}: ShiftTypeItemRowProps) => {
  const dragControls = useDragControls();
  const [isDragging, setIsDragging] = useState(false);
  const dragOccurred = useRef(false);

  const handleDragStart = (e: React.PointerEvent) => {
    // Sadece birincil dokunuş / tıklama
    if (e.button !== 0) return;
    dragOccurred.current = true;
    setIsDragging(true);

    // Titreşim geribildirimi
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(35);
      } catch (_) {}
    }

    dragControls.start(e);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    // Sürükleme bırakıldığında kartın onClick'inin tetiklenmesini engellemek için kısa bir bekleme
    setTimeout(() => {
      dragOccurred.current = false;
    }, 150);

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(25);
      } catch (_) {}
    }
  };

  const handleCardClick = () => {
    // Sürükleme yapıldıysa düzenleme modalı açılmasın
    if (dragOccurred.current || isDragging) return;
    onEdit(st);
  };

  return (
    <Reorder.Item
      value={st}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={handleDragEnd}
      onClick={handleCardClick}
      layout
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 24,
        mass: 0.6,
      }}
      whileDrag={{
        scale: 1.03,
        boxShadow:
          '0 25px 35px -5px rgba(0, 0, 0, 0.28), 0 10px 15px -5px rgba(0, 0, 0, 0.15)',
        zIndex: 100,
      }}
      className={`p-2.5 sm:p-3 rounded-2xl border flex items-center justify-between relative overflow-hidden select-none transition-all duration-150 cursor-pointer active:scale-[0.99] max-w-full min-w-0 ${
        isDragging
          ? 'ring-2 ring-primary-500 shadow-2xl bg-card border-primary-500 cursor-grabbing'
          : isReorderMode
          ? 'bg-card border-primary-300/80 dark:border-primary-800/80 shadow-xs hover:border-primary-400'
          : st.isSystem
          ? 'bg-card border-amber-300/70 dark:border-amber-700/60 hover:border-amber-500 shadow-xs'
          : 'bg-card border-slate-200/80 dark:border-slate-800 hover:border-primary-300 dark:hover:border-primary-700 shadow-xs'
      }`}
    >
      {/* Sol Renk Çizgisi */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 pointer-events-none"
        style={{ backgroundColor: st.color }}
      />

      <div className="flex items-center space-x-2 sm:space-x-2.5 pl-1.5 min-w-0 flex-1">
        {/* Özel Dokunmatik Sürükleme Tutamacı (Touch Handle) */}
        <div
          onPointerDown={handleDragStart}
          onClick={(e) => e.stopPropagation()}
          style={{ touchAction: 'none' }}
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing transition-all ${
            isReorderMode
              ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800 shadow-xs'
              : 'text-slate-300 dark:text-slate-600 hover:text-primary-500 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
          title="Tutup sürükleyerek sırasını değiştirin"
        >
          <GripVertical className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>

        {/* Vardiya İkonu */}
        <div
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm shrink-0"
          style={{ backgroundColor: st.color }}
        >
          <ShiftIcon
            icon={st.icon}
            type={st.type}
            name={st.name}
            className="w-4 h-4 sm:w-5 sm:h-5"
          />
        </div>

        {/* Bilgi Metinleri */}
        <div className="min-w-0 flex-1 pr-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
              {st.name}
            </h3>
            {isDragging ? (
              <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-bold tracking-wider shrink-0 bg-primary-500 text-white animate-pulse">
                📌 Taşınıyor
              </span>
            ) : st.isSystem ? (
              <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-bold tracking-wider shrink-0 bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/80">
                ⭐ Sistem
              </span>
            ) : isFixedShiftType(st) ? (
              <span
                className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 flex items-center gap-1 border border-slate-200/80 dark:border-slate-700"
                style={{
                  backgroundColor: `${st.color}15`,
                  color: st.color,
                }}
              >
                <span>{st.type === 'WORK' ? t('work') : t('rest')}</span>
                <span className="text-[8.5px] opacity-75 font-bold tracking-normal normal-case">(Sabit)</span>
              </span>
            ) : (
              <span
                className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0"
                style={{
                  backgroundColor: `${st.color}15`,
                  color: st.color,
                }}
              >
                {st.type === 'WORK' ? t('work') : t('rest')}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1.5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 min-w-0">
            {st.systemCategory === 'VACATION' ? (
              <span className="text-amber-700 dark:text-amber-400 font-semibold truncate">
                Yıllık İzin & Blok İzin
              </span>
            ) : st.systemCategory === 'HOLIDAY' ? (
              <span className="text-rose-700 dark:text-rose-400 font-semibold truncate">
                Resmi Tatil & Bayram
              </span>
            ) : st.type === 'WORK' && st.startTime ? (
              <>
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">
                  {st.startTime} - {st.endTime}
                </span>
              </>
            ) : (
              <span className="truncate">Tüm Gün İstirahat</span>
            )}
          </div>
        </div>
      </div>

      {/* Sağ Taraf: Silme / Kilit Butonu (Karta dokunarak düzenleme açılır) */}
      <div
        className="flex items-center shrink-0 ml-1 sm:ml-2"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {st.isSystem || isFixedShiftType(st) ? (
          <span
            className="p-2 text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-40"
            title={
              st.isSystem
                ? 'Sistem vardiya tipi silinemez'
                : 'Varsayılan sabit vardiya tipi silinemez'
            }
          >
            <Lock className="w-4 h-4" />
          </span>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(st);
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer touch-manipulation active:scale-95"
            title={t('delete')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </Reorder.Item>
  );
};

export const ShiftTypesTab = () => {
  const { t } = useTranslation();
  const shiftTypesFromDb = useLiveQuery(async () => {
    const list = await db.shiftTypes.toArray();
    return list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, []);

  const [items, setItems] = useState<ShiftType[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<ShiftType | null>(null);
  const [isReorderMode, setIsReorderMode] = useState(false);

  // Sync DB list to local state
  useEffect(() => {
    if (shiftTypesFromDb) {
      const sorted = [...shiftTypesFromDb].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      );
      setItems(sorted);
    }
  }, [shiftTypesFromDb]);

  const handleReorder = async (newOrder: ShiftType[]) => {
    setItems(newOrder);
    // Persist new order into Dexie DB
    await db.transaction('rw', db.shiftTypes, async () => {
      for (let i = 0; i < newOrder.length; i++) {
        await db.shiftTypes.update(newOrder[i].id, { order: i });
      }
    });
  };

  const handleEdit = (st: ShiftType) => {
    setEditingType(st);
    setModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingType(null);
    setModalOpen(true);
  };

  const handleDelete = async (st: ShiftType) => {
    if (st.isSystem || isFixedShiftType(st)) {
      alert(
        st.isSystem
          ? t('system_type_cannot_delete', 'Sistem vardiya tipleri silinemez.')
          : t('default_fixed_cannot_delete', 'Varsayılan sabit vardiya tipleri (Sabah, Öğle, Gece, Off, Rapor) silinemez.')
      );
      return;
    }
    if (confirm(`"${st.name}" vardiya tipini silmek istediğinize emin misiniz?`)) {
      await db.shiftTypes.delete(st.id);
    }
  };

  const handleRestoreDefaults = async () => {
    if (confirm('Varsayılan vardiya tipleri geri yüklensin mi?')) {
      await db.shiftTypes.clear();
      await ensureDefaultShiftTypes();
    }
  };

  return (
    <div className="space-y-3.5 animate-in fade-in duration-300 w-full max-w-full overflow-x-hidden min-w-0">
      {/* Üst Eylem ve Başlık Çubuğu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {t('shift_types')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('shift_types_desc')}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {/* Sıralama Modu Geçiş Butonu */}
          <button
            type="button"
            onClick={() => setIsReorderMode(!isReorderMode)}
            className={`font-semibold text-xs px-3 py-2 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer touch-manipulation active:scale-95 ${
              isReorderMode
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-400/50'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80'
            }`}
          >
            {isReorderMode ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Bitti</span>
              </>
            ) : (
              <>
                <ArrowUpDown className="w-3.5 h-3.5 text-primary-500" />
                <span>Sırala</span>
              </>
            )}
          </button>

          {/* Yeni Tip Ekle Butonu */}
          <button
            type="button"
            onClick={handleAddNew}
            className="bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-transform active:scale-95 flex items-center space-x-1.5 cursor-pointer shrink-0 touch-manipulation"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Ekle</span>
          </button>
        </div>
      </div>

      {/* Sıralama Modu Bilgilendirme Rozeti */}
      {isReorderMode && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-2.5 sm:p-3 rounded-2xl flex items-center justify-between gap-2 animate-in fade-in duration-200">
          <div className="flex items-center space-x-2 text-xs text-emerald-800 dark:text-emerald-200 font-medium min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <span className="truncate">Sol tutamaçtan tutup kartların sırasını değiştirebilirsiniz.</span>
          </div>
          <button
            type="button"
            onClick={() => setIsReorderMode(false)}
            className="text-xs font-bold text-emerald-700 dark:text-emerald-300 underline shrink-0 cursor-pointer ml-1"
          >
            Tamamla
          </button>
        </div>
      )}

      {shiftTypesFromDb === undefined ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 sm:p-10 text-center bg-card rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed">
          <div className="bg-primary-50 dark:bg-primary-900/20 p-3.5 rounded-full mb-3 text-primary-500">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
            {t('no_shift_types_yet')}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-4 max-w-[280px]">
            {t('no_shift_types_desc')}
          </p>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleRestoreDefaults}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              {t('restore_defaults')}
            </button>
            <button
              type="button"
              onClick={handleAddNew}
              className="bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-transform active:scale-95 flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Ekle</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* İpucu ve Sayı Şeridi */}
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 px-3 py-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center space-x-1.5 min-w-0">
              <GripVertical className="w-3.5 h-3.5 text-primary-500 shrink-0" />
              <span className="truncate">
                {isReorderMode
                  ? 'Sol tutamaçtan tutup yukarı/aşağı sürükleyin'
                  : 'Düzenlemek için dokunun, taşımak için tutamacı sürükleyin'}
              </span>
            </div>
            <span className="text-[11px] font-bold shrink-0 bg-slate-200/70 dark:bg-slate-700/70 px-2 py-0.5 rounded-full">
              {t('types_count', { count: items.length })}
            </span>
          </div>

          {/* Sürükle ve Bırak Grubu */}
          <Reorder.Group
            axis="y"
            values={items}
            onReorder={handleReorder}
            className="space-y-2.5 pb-6 sm:pb-10"
          >
            {items.map((st) => (
              <ShiftTypeItemRow
                key={st.id}
                st={st}
                isReorderMode={isReorderMode}
                onEdit={handleEdit}
                onDelete={handleDelete}
                t={t}
              />
            ))}
          </Reorder.Group>

          {/* Mobil Alt Navigasyon İçin Güvenli Boşluk */}
          <div className="h-16 md:hidden pointer-events-none" aria-hidden="true" />
        </div>
      )}

      {modalOpen && (
        <ShiftTypeModal
          shiftType={editingType}
          onClose={() => {
            setModalOpen(false);
            setEditingType(null);
          }}
        />
      )}
    </div>
  );
};



