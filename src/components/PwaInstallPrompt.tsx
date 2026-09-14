import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  CheckCircle2,
  X,
  Smartphone,
  Sparkles,
  AlertCircle,
  Copy,
  Check,
  Apple,
} from 'lucide-react';
import { usePwa } from '../utils/pwa';
import { hapticTap, hapticSuccess } from '../utils/haptics';

// Apple SF Symbol: Native Share Icon
const AppleShareIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

// Apple SF Symbol: Add to Home Screen Icon
const AppleAddToHomeScreenIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

export const PwaInstallPrompt: React.FC = () => {
  const {
    isStandalone,
    isInstalled,
    canInstallAndroid,
    isApple,
    isInAppBrowser: inApp,
    isInstallGuideOpen,
    closeGuide,
    promptInstall,
  } = usePwa();

  const [activeTab, setActiveTab] = useState<'apple' | 'android'>(
    isApple ? 'apple' : 'android'
  );
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSuccessLocal, setIsSuccessLocal] = useState(false);

  const handleInstallClick = async () => {
    hapticTap();
    const success = await promptInstall();
    if (success) {
      setIsSuccessLocal(true);
      setTimeout(() => closeGuide(), 2000);
    }
  };

  const handleCopyLink = async () => {
    hapticTap();
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      hapticSuccess();
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <AnimatePresence>
      {isInstallGuideOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => closeGuide()}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 touch-none"
          />

          {/* Dialog Container */}
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pt-[calc(var(--sat)+1rem)] pb-[calc(var(--sab)+0.75rem)] px-3 sm:px-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 35, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-2xl pointer-events-auto max-h-[calc(100dvh-var(--sat)-var(--sab)-2rem)] overflow-y-auto pb-5"
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
                  onClick={() => closeGuide()}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tab Selector (Apple vs Android) */}
              {!(isStandalone || isInstalled || isSuccessLocal) && (
                <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mt-3.5">
                  <button
                    type="button"
                    onClick={() => {
                      hapticTap();
                      setActiveTab('apple');
                    }}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeTab === 'apple'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                  >
                    <Apple className="w-3.5 h-3.5" />
                    <span>Apple (iPhone / iPad)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      hapticTap();
                      setActiveTab('android');
                    }}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeTab === 'android'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Android / Diğer</span>
                  </button>
                </div>
              )}

              {/* Content */}
              <div className="py-4 space-y-4">
                {isStandalone || isInstalled || isSuccessLocal ? (
                  <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2.5">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                    <h4 className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
                      Uygulama Cihazınızda Zaten Yüklü!
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Shift Assist'i ana ekranınızdan tek dokunuşla tam ekran, internetsiz ve en yüksek performansla kullanabilirsiniz.
                    </p>
                  </div>
                ) : activeTab === 'apple' ? (
                  /* iOS Apple Safari Guide */
                  <div className="space-y-3.5">
                    {/* In-App Browser Warning for Apple devices */}
                    {inApp && (
                      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-200 space-y-2">
                        <div className="flex items-start space-x-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-extrabold block">
                              Safari ile Açmanız Gerekiyor
                            </span>
                            <span className="text-[11px] opacity-90 block mt-0.5">
                              İçinde bulunduğunuz uygulama içi tarayıcı (Instagram/WhatsApp vb.) ana ekrana eklemeyi engeller.
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="w-full py-1.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                        >
                          {copiedLink ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Bağlantı Kopyalandı! Safari'ye Yapıştırın</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Bağlantıyı Kopyala</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 text-xs text-slate-700 dark:text-slate-300 flex items-start space-x-2.5">
                      <Sparkles className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <span>
                        iPhone veya iPad'inizde <strong>Safari</strong> ile 3 basit adımda ana ekrana ekleyerek gerçek bir App Store uygulaması gibi tam ekran kullanın:
                      </span>
                    </div>

                    <ol className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                      {/* Step 1 */}
                      <li className="flex items-start space-x-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <AppleShareIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              1. Paylaş Simgesine Dokunun
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Safari'nin en altında ortada yer alan <strong>Paylaş</strong> simgesine dokunun. (iPad'de sağ üsttedir).
                          </p>
                        </div>
                      </li>

                      {/* Step 2 */}
                      <li className="flex items-start space-x-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <AppleAddToHomeScreenIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            2. "Ana Ekrana Ekle"yi Seçin
                          </span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Açılan menüyü aşağı kaydırıp <strong>"Ana Ekrana Ekle"</strong> seçeneğine dokunun.
                          </p>
                        </div>
                      </li>

                      {/* Step 3 */}
                      <li className="flex items-start space-x-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              3. "Ekle" Butonuna Basın
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-black">
                              Ekle
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Sağ üst köşedeki mavi <strong>"Ekle"</strong> butonuna dokunun. Shift Assist hemen ana ekranınıza yerleşir.
                          </p>
                        </div>
                      </li>
                    </ol>

                    <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/50 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span>Safari dışındaki tarayıcılar (Chrome iOS vb.) için bağlantıyı kopyalayın:</span>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0 ml-2"
                      >
                        {copiedLink ? 'Kopyalandı!' : 'Linki Kopyala'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Android & Chromium Guide */
                  <div className="space-y-3">
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
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
                      <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">
                          Chrome / Samsung İnternet ile Yükleme:
                        </span>
                        <p className="text-[11.5px] leading-relaxed">
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
                onClick={() => closeGuide()}
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
