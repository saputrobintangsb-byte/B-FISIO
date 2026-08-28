import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  Users2,
  CalendarCheck2,
  BarChart3,
  SlidersHorizontal,
  HardDriveDownload,
  Sun,
  Moon,
  Laptop,
  X,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { ActiveView } from '../types';
import { AppLogo } from './AppLogo';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { activeView, setActiveView, theme, setTheme, showToast } = useApp();

  const navItems: { id: ActiveView; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4.5 h-4.5" /> },
    { id: 'patients', label: 'Daftar Pasien', icon: <Users2 className="w-4.5 h-4.5" /> },
    { id: 'therapy-history', label: 'Riwayat Terapi', icon: <CalendarCheck2 className="w-4.5 h-4.5" /> },
    { id: 'reports', label: 'Laporan & Analitik', icon: <BarChart3 className="w-4.5 h-4.5" /> },
    { id: 'settings', label: 'Pengaturan', icon: <SlidersHorizontal className="w-4.5 h-4.5" /> },
  ];

  const handleNavClick = (viewId: ActiveView) => {
    setActiveView(viewId);
    setMobileOpen(false);
  };

  const handleQuickBackup = async () => {
    try {
      const { dbService } = await import('../services/db');
      const backupJson = await dbService.exportBackup();
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BFisio_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('success', 'Backup database lokal berhasil diunduh.', 'Backup Selesai');
    } catch {
      showToast('error', 'Gagal membuat file backup.', 'Error');
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#001730] dark:bg-[#060B18] text-white justify-between p-5 border-r border-slate-200/10 dark:border-slate-800/80 select-none transition-colors">
      {/* Brand Header */}
      <div>
        <div className="flex items-center justify-between mb-7 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            {/* Custom App Logo from uploaded artwork */}
            <div className="relative w-10 h-10 rounded-full p-0.5 shadow-md shadow-blue-500/20 flex items-center justify-center shrink-0">
              <AppLogo className="w-9 h-9" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-extrabold tracking-tight text-white leading-none">
                  B FISIO
                </h1>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              </div>
              <p className="text-[10px] text-cyan-300 font-bold tracking-wider mt-1">
                "RME FISIOTERAPI"
              </p>
            </div>
          </div>

          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            title="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          <div className="px-2 pb-2 text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center justify-between">
            <span>Menu Utama</span>
            <Sparkles className="w-3 h-3 text-cyan-400/60" />
          </div>

          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-95 group ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-900/30 font-bold'
                    : 'text-slate-300 hover:bg-white/8 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-cyan-300'} transition-colors`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                    isActive ? 'bg-white/20 text-white' : 'bg-blue-500/20 text-cyan-300 border border-blue-400/30'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-5 px-2 pb-2 text-[10px] font-bold text-white/40 uppercase tracking-widest">
            Alat & Utilitas
          </div>

          <button
            id="btn-quick-backup"
            onClick={handleQuickBackup}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/8 hover:text-white active:scale-95 transition-all group"
          >
            <HardDriveDownload className="w-4.5 h-4.5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
            <span>Cadangkan Data (JSON)</span>
          </button>
        </nav>
      </div>

      {/* Footer: Theme Toggle & Author Signature */}
      <div className="space-y-3 pt-4 border-t border-white/10">
        {/* Elegant Theme Switcher Bar */}
        <div>
          <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider block px-1 mb-1.5">
            Tema Tampilan
          </span>
          <div className="flex bg-black/40 dark:bg-black/60 rounded-xl p-1 border border-white/10">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex-1 py-1.5 px-2 text-[11px] rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all duration-150 active:scale-95 ${
                theme === 'light'
                  ? 'bg-white text-slate-900 shadow-sm font-bold scale-[1.02]'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Aktifkan Mode Terang"
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Terang</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex-1 py-1.5 px-2 text-[11px] rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all duration-150 active:scale-95 ${
                theme === 'dark'
                  ? 'bg-blue-600 text-white shadow-sm font-bold scale-[1.02]'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Aktifkan Mode Gelap"
            >
              <Moon className="w-3.5 h-3.5 text-blue-200" />
              <span>Gelap</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`flex-1 py-1.5 px-2 text-[11px] rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all duration-150 active:scale-95 ${
                theme === 'system'
                  ? 'bg-white/20 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Otomatis Ikuti Sistem Perangkat"
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Auto</span>
            </button>
          </div>
        </div>

        {/* Signature: by saputrobintang (font-barlow, smaller size, bottom-left) */}
        <div className="pt-2 text-left pb-0.5 px-0.5">
          <p className="font-barlow text-[11px] font-medium text-slate-400/80 hover:text-slate-300 tracking-wider select-none lowercase transition-colors">
            by saputrobintang
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-64 h-screen fixed left-0 top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-4/5 max-w-xs h-full z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

