import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  CalendarDays,
  Palmtree,
  List,
  Settings,
  ChevronRight,
  Sparkles,
  Cloud,
  LogIn,
  LogOut,
  RefreshCw,
  Download,
  User as UserIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { usePwa } from '../utils/pwa';
import { hapticTap } from '../utils/haptics';

interface NavItemData {
  to: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  badge?: string;
}

export const FloatingNavMenu: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const isDayDetailOpen = useAppStore((state) => state.isDayDetailOpen);
  const setIsSetupModalOpen = useAppStore((state) => state.setIsSetupModalOpen);
  const {
    user,
    openAuthModal,
    logout,
    syncNow,
    restoreNow,
    syncStatus,
    lastSyncedAt,
  } = useAuthStore();

  const { isInstalled, isStandalone, isApple, openGuide } = usePwa();
  const shouldShowInstallButton = !isInstalled && !isStandalone;

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Close menu on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const navItems: NavItemData[] = [
    {
      to: '/',
      label: t('calendar', 'Takvim'),
      description: 'Aylık vardiya ve gün detayları',
      icon: <CalendarDays className="w-5 h-5" />,
      iconBg: 'bg-blue-500/10 dark:bg-blue-500/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      to: '/leave-planner',
      label: t('leave_planner', 'İzin Planı'),
      description: 'Akıllı izin & tatil fırsatları',
      icon: <Palmtree className="w-5 h-5" />,
      iconBg: 'bg-amber-500/10 dark:bg-amber-500/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
      badge: 'Fırsatlar',
    },
    {
      to: '/patterns',
      label: t('patterns', 'Vardiyalar'),
      description: 'Ekip düzeni ve vardiya tipleri',
      icon: <List className="w-5 h-5" />,
      iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      to: '/settings',
      label: t('settings', 'Ayarlar'),
      description: 'Görünüm, tema ve tercihler',
      icon: <Settings className="w-5 h-5" />,
      iconBg: 'bg-purple-500/10 dark:bg-purple-500/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
  ];

  // Auto-hide the trigger button on Calendar page if the bottom day detail card is active
  const isCalendarPage = location.pathname === '/';
  const shouldHideTrigger = isCalendarPage && isDayDetailOpen && !isOpen;

  return (
    <>
      {/* Backdrop for open state */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs z-40 touch-none"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Floating Speed-Dial Cards Container */}
      <div
        ref={menuRef}
        className="fixed right-3.5 sm:right-6 bottom-[calc(0.75rem+var(--sab))] z-40 flex flex-col items-end pointer-events-none select-none"
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 16 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="mb-3 w-[275px] sm:w-[300px] max-h-[calc(100dvh-var(--sat)-var(--sab)-5.5rem)] overflow-y-auto bg-card/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 rounded-3xl shadow-2xl p-2.5 pointer-events-auto"
            >
              {/* Menu Header / Mini Banner */}
              <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between mb-2">
                <div className="flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary-500" />
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Menü
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                  {location.pathname === '/' ? 'Takvim Aktif' : 'Vardiya Takvimi'}
                </span>
              </div>

              {/* User Account / Cloud Sync Card */}
              {user ? (
                <div className="p-2.5 mb-2 rounded-2xl bg-slate-100/75 dark:bg-slate-800/75 border border-slate-200/80 dark:border-slate-700/80">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || 'Profil'}
                          className="w-8 h-8 rounded-xl object-cover ring-2 ring-emerald-500/40 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <UserIcon className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {user.displayName || 'Vardiya Hesabım'}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {user.email}
                        </div>
                      </div>
                    </div>
                    <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      Aktif
                    </span>
                  </div>

                  {/* Sync status text */}
                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 px-0.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate">
                      {syncStatus === 'syncing'
                        ? 'Bulutla eşitleniyor...'
                        : lastSyncedAt
                        ? `Son eşitleme: ${lastSyncedAt}`
                        : 'Bulut senkronizasyonu aktif'}
                    </span>
                  </div>

                  {/* Quick Actions Bar */}
                  <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => syncNow()}
                        disabled={syncStatus === 'syncing'}
                        className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 font-bold hover:bg-primary-100 dark:hover:bg-primary-900/60 transition-colors disabled:opacity-50 cursor-pointer text-[10px]"
                        title="Verileri buluta eşitle"
                      >
                        <RefreshCw className={`w-3 h-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                        <span>{syncStatus === 'syncing' ? 'Eşitleniyor' : 'Eşitle'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Buluttaki son yedek bu cihaza yüklensin mi?')) {
                            restoreNow();
                          }
                        }}
                        disabled={syncStatus === 'syncing'}
                        className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-200/70 dark:bg-slate-700/70 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer text-[10px]"
                        title="Buluttaki yedeği geri yükle"
                      >
                        <Download className="w-3 h-3" />
                        <span>Geri Yükle</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Oturumu kapatmak istediğinize emin misiniz?')) {
                          logout();
                        }
                      }}
                      className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold transition-colors cursor-pointer text-[10px]"
                      title="Oturumu kapat"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Çıkış</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 mb-2 rounded-2xl bg-gradient-to-br from-primary-500/10 via-primary-500/5 to-transparent border border-primary-500/20">
                  <div className="flex items-center space-x-2.5 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-primary-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Cloud className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black text-slate-800 dark:text-slate-100 leading-tight">
                        Bulut Hesabı
                      </div>
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        Vardiyalarınızı güvenle yedekleyin
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      openAuthModal('login');
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-primary-600 hover:bg-primary-700 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Giriş Yap / Kayıt Ol</span>
                  </button>
                </div>
              )}

              {/* Navigation Items List */}
              <div className="space-y-1">
                {navItems.map((item, idx) => {
                  const isActive = location.pathname === item.to;
                  return (
                    <motion.div
                      key={item.to}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.035, duration: 0.18 }}
                    >
                      <NavLink
                        to={item.to}
                        onClick={() => setIsOpen(false)}
                        className={`group flex items-center justify-between p-2.5 rounded-2xl transition-all ${
                          isActive
                            ? 'bg-primary-500/10 dark:bg-primary-500/15 text-primary-600 dark:text-primary-400 font-bold shadow-2xs'
                            : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                              isActive ? 'bg-primary-500 text-white shadow-xs' : `${item.iconBg} ${item.iconColor}`
                            }`}
                          >
                            {item.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-xs font-extrabold truncate">
                                {item.label}
                              </span>
                              {item.badge && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        <ChevronRight
                          className={`w-4 h-4 shrink-0 transition-transform ${
                            isActive
                              ? 'text-primary-500 translate-x-0.5'
                              : 'text-slate-300 dark:text-slate-600 group-hover:translate-x-0.5 group-hover:text-slate-500'
                          }`}
                        />
                      </NavLink>
                    </motion.div>
                  );
                })}
              </div>

              {/* Quick Triggers (PWA Install & Setup Wizard) */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 mt-2 space-y-1">
                {shouldShowInstallButton && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      openGuide();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-2xl bg-gradient-to-r from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/40 dark:to-purple-950/40 hover:opacity-90 text-indigo-700 dark:text-indigo-300 transition-all cursor-pointer text-xs font-bold"
                  >
                    <div className="flex items-center space-x-2">
                      <Download className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span>{isApple ? "iPhone'a Yükle" : "Telefona Yükle"}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setIsSetupModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-2xl bg-primary-50/60 dark:bg-primary-950/30 hover:bg-primary-100/70 dark:hover:bg-primary-900/40 text-primary-700 dark:text-primary-300 transition-all cursor-pointer text-xs font-bold"
                >
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-primary-500 shrink-0" />
                    <span>Kurulum Sihirbazı</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Action Button (FAB) Trigger */}
        <div
          className={`pointer-events-auto transition-all duration-300 ${
            shouldHideTrigger
              ? 'opacity-0 translate-y-4 pointer-events-none scale-90'
              : 'opacity-100 translate-y-0 scale-100'
          }`}
        >
          <button
            onClick={() => {
              hapticTap();
              setIsOpen(!isOpen);
            }}
            aria-expanded={isOpen}
            aria-label={isOpen ? 'Menüyü Kapat' : 'Menüyü Aç'}
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl border transition-all duration-200 active:scale-90 cursor-pointer touch-manipulation group ${
              isOpen
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-700 dark:border-slate-300 rotate-90'
                : 'bg-slate-900/90 dark:bg-slate-800/95 text-white hover:bg-slate-800 dark:hover:bg-slate-700 border-white/20 dark:border-slate-700/80 backdrop-blur-md shadow-primary-500/10'
            }`}
          >
            {isOpen ? (
              <X className="w-5 h-5 transition-transform" />
            ) : (
              <div className="relative">
                <Menu className="w-5 h-5 transition-transform group-hover:scale-110" />
                {user ? (
                  <span
                    className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900 dark:ring-slate-800 shadow-xs"
                    title="Bulut Hesabı Aktif"
                  />
                ) : (
                  location.pathname !== '/' && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary-400 animate-pulse ring-2 ring-slate-900" />
                  )
                )}
              </div>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default FloatingNavMenu;
