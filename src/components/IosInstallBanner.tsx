import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, HelpCircle, ArrowDown } from 'lucide-react';
import { usePwa } from '../utils/pwa';
import { hapticTap } from '../utils/haptics';

const DISMISS_STORAGE_KEY = 'shift_assist_ios_banner_dismissed';
const DISMISS_DURATION_DAYS = 5;

export const IosInstallBanner: React.FC = () => {
  const { isApple, isStandalone, isInstalled, openGuide, isInAppBrowser } = usePwa();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show on Apple devices when NOT installed and NOT standalone
    if (!isApple || isStandalone || isInstalled) {
      setIsVisible(false);
      return;
    }

    try {
      const dismissedTime = localStorage.getItem(DISMISS_STORAGE_KEY);
      if (dismissedTime) {
        const diffDays =
          (Date.now() - parseInt(dismissedTime, 10)) / (1000 * 60 * 60 * 24);
        if (diffDays < DISMISS_DURATION_DAYS) {
          setIsVisible(false);
          return;
        }
      }
    } catch {}

    // Slight delay so the page loads smoothly before the prompt pops up
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [isApple, isStandalone, isInstalled]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticTap();
    setIsVisible(false);
    try {
      localStorage.setItem(DISMISS_STORAGE_KEY, Date.now().toString());
    } catch {}
  };

  const handleOpenGuide = () => {
    hapticTap();
    openGuide();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <aside aria-label="iPhone Yükleme Bildirimi" className="fixed bottom-3 sm:bottom-4 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-md z-40 pointer-events-none pb-[env(safe-area-inset-bottom,0px)]">
          <motion.div
            initial={{ opacity: 0, y: 35, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="pointer-events-auto relative p-3.5 sm:p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-blue-500/30 dark:border-blue-500/20 shadow-2xl shadow-blue-500/10 text-slate-900 dark:text-slate-100"
          >
            {/* Top Close Button */}
            <button
              onClick={handleDismiss}
              className="absolute top-2.5 right-2.5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Kapat"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-start space-x-3 pr-6">
              {/* iOS App Icon Mockup */}
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/25">
                <span className="text-base font-black tracking-tighter">SA</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1.5">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                    Shift Assist'i iPhone'a Ekleyin
                  </h4>
                  <span className="px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold shrink-0">
                    iOS
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {isInAppBrowser ? (
                    <span>
                      Uygulama içi tarayıcıdasınız. Yüklemek için sağ üstten <strong>Safari'de Aç</strong> seçin.
                    </span>
                  ) : (
                    <span>
                      Safari alt menüsündeki <strong>Paylaş</strong> simgesine dokunup <strong>"Ana Ekrana Ekle"</strong> yapın.
                    </span>
                  )}
                </p>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 mt-2.5">
                  <button
                    type="button"
                    onClick={handleOpenGuide}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold shadow-xs shadow-blue-500/20 transition-all cursor-pointer active:scale-95"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Görsel Rehberi Aç</span>
                    <ChevronRight className="w-3 h-3 ml-0.5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    Daha Sonra
                  </button>
                </div>
              </div>
            </div>

            {/* Bouncing Arrow pointer pointing toward Safari bottom bar on iPhone */}
            {!isInAppBrowser && (
              <div className="hidden sm:hidden xs:flex flex-col items-center justify-center pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/80">
                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                  <span>Alttaki Safari Paylaş menüsünü kullanın</span>
                  <motion.div
                    animate={{ y: [0, 4, 0] }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                  >
                    <ArrowDown className="w-3 h-3 text-blue-500" />
                  </motion.div>
                </span>
              </div>
            )}
          </motion.div>
        </aside>
      )}
    </AnimatePresence>
  );
};

export default IosInstallBanner;
