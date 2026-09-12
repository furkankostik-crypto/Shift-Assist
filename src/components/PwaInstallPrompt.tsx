import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Share2,
  PlusSquare,
  CheckCircle2,
  X,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { hapticSuccess, hapticTap } from '../utils/haptics';

// Global state for PWA install prompt
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

export function getDeferredPrompt() {
  return deferredPrompt;
}

export function isAppStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((window.navigator as unknown as { standalone?: boolean }).standalone)
  );
}

export function isAppleDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)
  );
}

// Global hook to open install modal
let globalOpenModal: (() => void) | null = null;

export function openPwaInstallGuide(): void {
  if (globalOpenModal) {
    globalOpenModal();
  }
}

export const PwaInstallPrompt: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [canInstallAndroid, setCanInstallAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isApple, setIsApple] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    setIsStandalone(isAppStandalone());
    setIsApple(isAppleDevice());

    globalOpenModal = () => {
      hapticTap();
      setIsOpen(true);
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      setCanInstallAndroid(true);
      listeners.forEach((l) => l());
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      deferredPrompt = null;
      setCanInstallAndroid(false);
      setIsStandalone(true);
      setIsSuccess(true);
      hapticSuccess();
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      globalOpenModal = null;
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    hapticTap();
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      hapticSuccess();
      setIsSuccess(true);
      deferredPrompt = null;
      setCanInstallAndroid(false);
      setTimeout(() => setIsOpen(false), 2500);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 touch-none"
          />

          {/* Dialog Container */}
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="w-full max-w-md bg-card dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-2xl pointer-events-auto max-h-[90vh] overflow-y-auto pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                      Uygulamayı Telefona Yükle
                    </h3>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Shift Assist Mobil Deneyimi
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="py-4 space-y-4">
                {isStandalone || isSuccess ? (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <h4 className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
                      Uygulama Cihazınızda Yüklü!
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Shift Assist'i ana ekranınızdan tek dokunuşla tam ekran ve internetsiz olarak kullanabilirsiniz.
                    </p>
                  </div>
                ) : isApple ? (
                  /* iOS Apple Safari Guide */
                  <div className="space-y-3.5">
                    <div className="p-3 rounded-2xl bg-primary-50 dark:bg-primary-950/40 border border-primary-100 dark:border-primary-900 text-xs text-slate-700 dark:text-slate-300 flex items-start space-x-2.5">
                      <Sparkles className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                      <span>
                        iPhone veya iPad'inizde <strong>Safari</strong> ile ana ekrana ekleyerek gerçek bir iOS uygulaması gibi tam ekran kullanabilirsiniz:
                      </span>
                    </div>

                    <ol className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                      <li className="flex items-center space-x-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <Share2 className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <span className="font-bold text-slate-900 dark:text-slate-100">1. Paylaş Simgesi:</span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Safari'nin altındaki <strong>Paylaş</strong> (kare içinden yukarı ok) simgesine dokunun.
                          </p>
                        </div>
                      </li>

                      <li className="flex items-center space-x-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <PlusSquare className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <span className="font-bold text-slate-900 dark:text-slate-100">2. Ana Ekrana Ekle:</span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Açılan sayfada aşağı kaydırıp <strong>"Ana Ekrana Ekle"</strong> seçeneğini seçin.
                          </p>
                        </div>
                      </li>

                      <li className="flex items-center space-x-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <span className="font-bold text-slate-900 dark:text-slate-100">3. Tamamlayın:</span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Sağ üst köşedeki <strong>"Ekle"</strong> butonuna dokunun.
                          </p>
                        </div>
                      </li>
                    </ol>
                  </div>
                ) : (
                  /* Android & Chromium Guide */
                  <div className="space-y-3">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Uygulamayı Android telefonunuza yükleyerek çevrimdışı çalışma, tam ekran görünüm ve anında bildirim alma gibi mobil avantajlardan yararlanın.
                    </p>

                    {canInstallAndroid ? (
                      <button
                        type="button"
                        onClick={handleInstallClick}
                        className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-md shadow-primary-500/25 flex items-center justify-center space-x-2 transition-all active:scale-[0.98] cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Ana Ekrana Yükle (Tek Tıkla)</span>
                      </button>
                    ) : (
                      <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">
                          Chrome / Samsung İnternet ile Yükleme:
                        </span>
                        <p className="text-[11.5px]">
                          Tarayıcınızın sağ üstündeki <strong>üç nokta (⋮)</strong> menüsüne dokunun ve <strong>"Uygulamayı Yükle"</strong> veya <strong>"Ana Ekrana Ekle"</strong> seçeneğine basın.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Kapat
              </button>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PwaInstallPrompt;
