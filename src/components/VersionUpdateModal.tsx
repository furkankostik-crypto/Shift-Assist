import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  ArrowUpCircle,
  WifiOff,
  AlertTriangle,
  Layers,
  Cpu,
  Clock,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useUpdateCheck } from '../utils/useUpdateCheck';
import {
  APP_NAME,
  APP_VERSION,
  APP_BUILD_DATE,
  formatLastCheckedTime,
  getRuntimeEnvironment,
} from '../utils/version';
import { hapticTap } from '../utils/haptics';

export const VersionUpdateModal: React.FC = () => {
  const isOpen = useAppStore((state) => state.isUpdateModalOpen);
  const setIsOpen = useAppStore((state) => state.setIsUpdateModalOpen);

  const {
    status,
    currentVersion,
    latestVersion,
    lastCheckedTime,
    newFeatures,
    errorMessage,
    checkForUpdates,
    applyUpdate,
  } = useUpdateCheck();

  const env = getRuntimeEnvironment();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  // When opened, if never checked or idle, auto trigger check once
  useEffect(() => {
    if (isOpen && status === 'idle') {
      checkForUpdates(false);
    }
  }, [isOpen, status, checkForUpdates]);

  const handleManualCheck = () => {
    hapticTap();
    checkForUpdates(true);
  };

  const handleApplyUpdate = () => {
    hapticTap();
    applyUpdate();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 350 }}
            className="relative w-full max-w-md bg-card dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-3xl shadow-2xl overflow-hidden z-10 my-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="version-modal-title"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-primary-500/25">
                  <RefreshCw className={`w-5 h-5 ${status === 'checking' ? 'animate-spin' : ''}`} />
                </div>
                <div className="min-w-0">
                  <h2 id="version-modal-title" className="text-base font-black text-slate-900 dark:text-slate-100 truncate">
                    {APP_NAME} Güncelleme
                  </h2>
                  <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 truncate">
                    Sürüm Yönetimi ve Durum Merkezi
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 max-h-[calc(85dvh-6rem)] overflow-y-auto">
              {/* Dynamic Status Banner */}
              {status === 'checking' && (
                <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300 flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 animate-spin">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black">Güncellemeler Denetleniyor...</div>
                    <div className="text-[10px] text-blue-600/80 dark:text-blue-300/80 mt-0.5">
                      Sunucu ve çevrimdışı önbellekler kontrol ediliyor.
                    </div>
                  </div>
                </div>
              )}

              {status === 'update-available' && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-primary-500/15 to-emerald-500/15 border-2 border-amber-500/40 text-slate-900 dark:text-white space-y-3 shadow-md shadow-amber-500/10">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-primary-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                      <ArrowUpCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black flex items-center space-x-1.5 text-amber-800 dark:text-amber-300">
                        <span>Yeni Sürüm Yayında!</span>
                        <span className="px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-900 dark:text-amber-200 text-[10px] font-black">
                          v{latestVersion}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                        Uygulamanın daha yeni bir sürümü kullanıma hazır. Hemen güncelleyerek yenilikleri deneyimleyin!
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyUpdate}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-primary-600 to-indigo-600 hover:opacity-95 active:scale-[0.98] text-white font-black text-xs flex items-center justify-center space-x-2 shadow-lg shadow-primary-500/25 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-200" />
                    <span>Şimdi Güncelle ve Yeniden Başlat</span>
                  </button>
                </div>
              )}

              {status === 'up-to-date' && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-300 flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black">Uygulamanız Güncel</div>
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                      En son kararlı sürümü (v{currentVersion}) kullanıyorsunuz. Her şey yolunda!
                    </div>
                  </div>
                </div>
              )}

              {status === 'offline' && (
                <div className="p-3.5 rounded-2xl bg-slate-500/10 border border-slate-500/20 text-slate-700 dark:text-slate-300 flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-500 text-white flex items-center justify-center shrink-0">
                    <WifiOff className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black">Çevrimdışı Çalışma Modu</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      İnternet bağlantısı tespit edilemedi. Çevrimdışı önbellekten kesintisiz çalışıyorsunuz.
                    </div>
                  </div>
                </div>
              )}

              {status === 'error' && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black">Denetleme Yapılamadı</div>
                    <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">
                      {errorMessage || 'Sunucuya bağlanırken bir hata meydana geldi.'}
                    </div>
                  </div>
                </div>
              )}

              {/* Version & Environment Details Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <div className="flex items-center space-x-1.5 text-slate-400 dark:text-slate-500 mb-1">
                    <Layers className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Mevcut Sürüm</span>
                  </div>
                  <div className="text-sm font-black text-slate-800 dark:text-slate-100">
                    v{APP_VERSION}
                  </div>
                  <div className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Yayın: {APP_BUILD_DATE}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <div className="flex items-center space-x-1.5 text-slate-400 dark:text-slate-500 mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Son Kontrol</span>
                  </div>
                  <div className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                    {formatLastCheckedTime(lastCheckedTime)}
                  </div>
                  <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                    {status === 'checking' ? 'Sorgulanıyor...' : 'Otomatik takip'}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 col-span-2">
                  <div className="flex items-center space-x-1.5 text-slate-400 dark:text-slate-500 mb-1">
                    <Cpu className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Çalışma Ortamı & Çevrimdışı</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {env.modeLabel}
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      Çevrimdışı Hazır
                    </span>
                  </div>
                </div>
              </div>

              {/* What's New / Sürüm Yenilikleri */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-black text-slate-800 dark:text-slate-200">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Bu Sürümde Neler Yeni?</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                    v{APP_VERSION}
                  </span>
                </div>

                <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                  {newFeatures.map((item, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 shrink-0" />
                      <span className="leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 sm:p-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/30 flex items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-colors cursor-pointer"
              >
                Kapat
              </button>

              <button
                type="button"
                onClick={handleManualCheck}
                disabled={status === 'checking'}
                className="flex-1 py-2.5 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-primary-500/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${status === 'checking' ? 'animate-spin' : ''}`} />
                <span>{status === 'checking' ? 'Denetleniyor...' : 'Güncellemeleri Şimdi Denetle'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default VersionUpdateModal;
