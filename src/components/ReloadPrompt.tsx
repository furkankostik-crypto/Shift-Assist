import { useRegisterSW } from 'virtual:pwa-register/react';
import { X } from 'lucide-react';

function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // eslint-disable-next-line prefer-template
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:bottom-4 md:w-96 z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-card border border-primary-200 dark:border-primary-900 shadow-xl rounded-2xl p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-primary-500"></div>
        
        <button onClick={close} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <X className="w-5 h-5" />
        </button>
        
        <div className="pr-6">
          <h3 className="font-bold text-lg mb-1">
            {offlineReady ? 'Çevrimdışı Çalışmaya Hazır' : 'Yeni Sürüm Mevcut!'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            {offlineReady
              ? 'Uygulama artık internet olmadan da tamamen kullanılabilir.'
              : 'Uygulamanın yeni bir sürümü var. Güncellemek için tıklayın.'}
          </p>
          
          {needRefresh && (
            <button
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 rounded-xl transition-colors"
              onClick={() => updateServiceWorker(true)}
            >
              Uygulamayı Güncelle
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReloadPrompt;
