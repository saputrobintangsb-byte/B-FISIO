import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Search,
  UserPlus,
  PlusCircle,
  Menu,
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
  Calendar,
  X,
  Phone
} from 'lucide-react';
import { formatDateShort } from '../utils/formatters';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const {
    activeView,
    theme,
    setTheme,
    patients,
    viewPatientProfile,
    openAddPatientModal,
    openAddVisitModal,
    settings,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Get Page Title and Description based on activeView
  const getPageInfo = () => {
    switch (activeView) {
      case 'dashboard':
        return {
          title: 'Dashboard Fisioterapi',
          subtitle: 'Ringkasan aktivitas klinis, rekam medis, dan pendapatan harian.',
        };
      case 'patients':
        return {
          title: 'Daftar Pasien',
          subtitle: 'Kelola seluruh riwayat rekam medis, kontak, dan status terapi pasien.',
        };
      case 'patient-profile':
        return {
          title: 'Profil Pasien & Rekam Medis',
          subtitle: 'Informasi lengkap pasien, timeline kunjungan terapi, catatan SOAP, dan pembayaran.',
        };
      case 'therapy-history':
        return {
          title: 'Riwayat Kunjungan Terapi',
          subtitle: 'Log kronologis seluruh sesi tindakan fisioterapi, intervensi, dan SOAP.',
        };
      case 'reports':
        return {
          title: 'Laporan & Analitik',
          subtitle: 'Statistik pendapatan, frekuensi tindakan intervensi, dan ekspor data klinis.',
        };
      case 'settings':
        return {
          title: 'Pengaturan Aplikasi',
          subtitle: 'Konfigurasi terapis, tarif tindakan standar, data klinik, dan cadangan database.',
        };
      default:
        return {
          title: 'B Fisio App',
          subtitle: 'Sistem Manajemen Terapi Fisioterapi Profesional',
        };
    }
  };

  const { title, subtitle } = getPageInfo();

  // Search filtering
  const matchingPatients = searchQuery.trim()
    ? patients
        .filter(
          (p) =>
            p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.phone.includes(searchQuery) ||
            p.diagnosis.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 6)
    : [];

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPatient = (patientId: string) => {
    viewPatientProfile(patientId);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  return (
    <header className="sticky top-0 z-20 bg-white dark:bg-[#001F3F] border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Hamburger + Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-lg sm:text-xl font-bold text-[#001F3F] dark:text-white tracking-tight leading-tight">
              {title}
            </h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right: Search + Theme Toggle + Quick Actions */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Quick Search with rounded-full pill */}
          <div ref={searchRef} className="relative flex-1 sm:w-60 md:w-72">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="header-global-search"
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => setShowSearchResults(true)}
                placeholder="Cari Pasien / RM / Diagnosa..."
                className="w-full pl-9 pr-8 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 border-none text-xs sm:text-sm text-[#0F172A] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#001F3F] dark:focus:ring-blue-400 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Live Search Suggestions Dropdown */}
            {showSearchResults && searchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#001F3F] rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
                <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                  Hasil Pencarian ({matchingPatients.length})
                </div>
                {matchingPatients.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Tidak ditemukan pasien dengan kata kunci "{searchQuery}"
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {matchingPatients.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectPatient(p.id)}
                        className="p-3 hover:bg-slate-50 dark:hover:bg-white/10 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-[#001F3F] dark:text-white">
                            {p.fullName}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[#001F3F] dark:text-blue-300 font-bold">
                            {p.mrn}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 truncate mt-0.5">
                          {p.diagnosis || 'Tanpa diagnosa'}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 uppercase font-semibold mt-1">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {p.phone}
                          </span>
                          <span>•</span>
                          <span>{p.totalVisits} Kunjungan</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Action Button: Tambah Pasien */}
          <button
            id="header-btn-add-patient"
            onClick={openAddPatientModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-[#001F3F] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 uppercase tracking-wide transition-all shadow-xs"
          >
            <UserPlus className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Tambah Pasien</span>
          </button>

          {/* Quick Action Button: Tambah Kunjungan (Navy Geometric) */}
          <button
            id="header-btn-add-visit"
            onClick={() => openAddVisitModal(null)}
            className="bg-[#001F3F] dark:bg-blue-600 hover:bg-[#001730] dark:hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 shadow-xs transition-all active:scale-98"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Kunjungan</span>
          </button>
        </div>
      </div>
    </header>
  );
};
