import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  History,
  BarChart3,
  Settings,
  Activity,
  HardDriveDownload,
  Sun,
  Moon,
  Laptop,
  X,
  Stethoscope
} from 'lucide-react';
import { ActiveView } from '../types';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { activeView, setActiveView, openAddPatientModal, theme, setTheme, settings, showToast } = useApp();

  const navItems: { id: ActiveView | 'quick-add'; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5 opacity-80" /> },
    { id: 'patients', label: 'Daftar Pasien', icon: <Users className="w-5 h-5 opacity-80" /> },
    { id: 'add-patient', label: 'Tambah Pasien', icon: <UserPlus className="w-5 h-5 opacity-80" /> },
    { id: 'therapy-history', label: 'Riwayat Terapi', icon: <History className="w-5 h-5 opacity-80" /> },
    { id: 'reports', label: 'Laporan', icon: <BarChart3 className="w-5 h-5 opacity-80" /> },
    { id: 'settings', label: 'Pengaturan', icon: <Settings className="w-5 h-5 opacity-80" /> },
  ];

  const handleNavClick = (viewId: ActiveView | 'quick-add') => {
    if (viewId === 'add-patient') {
      openAddPatientModal();
    } else {
      setActiveView(viewId as ActiveView);
    }
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
    <div className="flex flex-col h-full bg-[#001F3F] text-white justify-between p-6 border-r border-slate-200/20 select-none">
      {/* Brand Header */}
      <div>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center shadow-xs">
              <div className="w-4 h-4 bg-[#001F3F]"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white leading-none">B FISIO APP</h1>
              <p className="text-[10px] text-white/50 uppercase tracking-widest font-semibold mt-1">
                Sistem Fisioterapi
              </p>
            </div>
          </div>

          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1.5">
          <div className="px-2 pb-2 text-[10px] font-bold text-white/40 uppercase tracking-widest">
            Menu Navigasi
          </div>

          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-white/15 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.id === 'add-patient' && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/20 text-white">
                    + Baru
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-4 px-2 pb-2 text-[10px] font-bold text-white/40 uppercase tracking-widest">
            Alat Cepat
          </div>

          <button
            id="btn-quick-backup"
            onClick={handleQuickBackup}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-all"
          >
            <HardDriveDownload className="w-5 h-5 opacity-70" />
            <span>Backup Data JSON</span>
          </button>
        </nav>
      </div>

      {/* Footer: Theme Toggle & Therapist Profile */}
      <div className="space-y-4 pt-4">
        {/* Geometric Theme Switcher */}
        <div className="flex bg-black/25 rounded-lg p-1">
          <button
            onClick={() => setTheme('light')}
            className={`flex-1 py-1.5 text-xs rounded font-semibold transition-all ${
              theme === 'light'
                ? 'bg-white text-[#001F3F] shadow-xs'
                : 'text-white/70 hover:text-white'
            }`}
          >
            ☀️ Light
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`flex-1 py-1.5 text-xs rounded font-semibold transition-all ${
              theme === 'dark'
                ? 'bg-white/20 text-white shadow-xs'
                : 'text-white/70 hover:text-white'
            }`}
          >
            🌙 Dark
          </button>
          <button
            onClick={() => setTheme('system')}
            className={`flex-1 py-1.5 text-xs rounded font-semibold transition-all ${
              theme === 'system'
                ? 'bg-white/20 text-white shadow-xs'
                : 'text-white/70 hover:text-white'
            }`}
          >
            💻 Auto
          </button>
        </div>

        {/* Therapist Profile Footer */}
        <div
          onClick={() => setActiveView('settings')}
          className="pt-4 border-t border-white/10 flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 rounded-full bg-slate-400 border border-white/20 flex items-center justify-center font-bold text-xs text-[#001F3F]">
            {settings.defaultTherapist?.charAt(0) || 'B'}
          </div>
          <div className="text-xs">
            <p className="font-bold text-white">{settings.defaultTherapist || 'Bintang'}</p>
            <p className="text-white/50 uppercase tracking-widest text-[9px] font-semibold">
              Senior Therapist
            </p>
          </div>
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
