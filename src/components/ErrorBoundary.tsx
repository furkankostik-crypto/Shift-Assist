import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetAndReload = () => {
    if (window.confirm('Önbellek temizlenip uygulama yeniden başlatılsın mı?')) {
      try {
        localStorage.removeItem('vardiya-settings');
        sessionStorage.clear();
      } catch (e) {
        console.error('Failed to clear storage:', e);
      }
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center shadow-lg">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Bir Sorun Oluştu
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                Uygulama beklenmedik bir hatayla karşılaştı. Sayfayı yenileyerek veya önbelleği temizleyerek devam edebilirsiniz.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left bg-slate-950/80 rounded-xl p-3 border border-slate-800 text-xs font-mono text-rose-300/80 overflow-x-auto max-h-28">
                {this.state.error.message || 'Bilinmeyen Hata'}
              </div>
            )}

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-98 shadow-md shadow-primary-600/20"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Sayfayı Yenile</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetAndReload}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-semibold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-98 border border-slate-700/60"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Önbelleği Temizle ve Başlat</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
