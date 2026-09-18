import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Search,
  Filter,
  UserPlus,
  Eye,
  Edit2,
  PlusCircle,
  Trash2,
  Download,
  FileSpreadsheet,
  Calendar,
  Phone,
  MapPin,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpDown,
  MoreVertical,
  X
} from 'lucide-react';
import { Patient, PaymentStatus } from '../types';
import { formatDateIndonesian, formatDateShort, formatRupiah, exportToExcel, exportToCSV } from '../utils/formatters';
import { ConfirmationModal } from './ConfirmationModal';
import { dbService } from '../services/db';

export const PatientListView: React.FC = () => {
  const {
    patients,
    visits,
    viewPatientProfile,
    openAddPatientModal,
    openEditPatientModal,
    openAddVisitModal,
    refreshData,
    showToast,
    settings,
  } = useApp();

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState<'all' | 'Home Care' | 'Klinik'>('all');
  const [filterTherapist, setFilterTherapist] = useState('all');
  const [filterPayment, setFilterPayment] = useState<'all' | PaymentStatus>('all');
  const [sortBy, setSortBy] = useState<'newestDate' | 'name' | 'mrn' | 'totalVisits'>('newestDate');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);

  // Available therapists from settings
  const therapistsList = settings.therapists || ['Bintang'];

  // Filtered and Sorted Patients
  const filteredPatients = useMemo(() => {
    return patients
      .filter((p) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const match =
            p.fullName.toLowerCase().includes(q) ||
            p.mrn.toLowerCase().includes(q) ||
            p.phone.includes(q) ||
            p.diagnosis.toLowerCase().includes(q) ||
            p.address.toLowerCase().includes(q);
          if (!match) return false;
        }

        // Location filter
        if (filterLocation !== 'all') {
          if (p.lastLocation !== filterLocation) return false;
        }

        // Therapist filter
        if (filterTherapist !== 'all') {
          if (p.lastTherapist !== filterTherapist) return false;
        }

        // Payment status filter
        if (filterPayment !== 'all') {
          if (filterPayment === 'Lunas' && p.lastPaymentStatus !== 'Lunas') return false;
          if (filterPayment === 'Belum Lunas' && p.lastPaymentStatus !== 'Belum Lunas') return false;
          if (filterPayment === 'DP' && p.lastPaymentStatus !== 'DP') return false;
          if (filterPayment === 'Gratis' && p.lastPaymentStatus !== 'Gratis') return false;
        }

        // Date range filter
        if (startDate && p.lastVisitDate && p.lastVisitDate < startDate) return false;
        if (endDate && p.lastVisitDate && p.lastVisitDate > endDate) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newestDate') {
          return (b.lastVisitDate || b.createdAt || '').localeCompare(a.lastVisitDate || a.createdAt || '');
        }
        if (sortBy === 'name') {
          return (a.fullName || '').localeCompare(b.fullName || '');
        }
        if (sortBy === 'mrn') {
          return (a.mrn || '').localeCompare(b.mrn || '');
        }
        if (sortBy === 'totalVisits') {
          return (b.totalVisits || 0) - (a.totalVisits || 0);
        }
        return 0;
      });
  }, [patients, searchQuery, filterLocation, filterTherapist, filterPayment, sortBy, startDate, endDate]);

  const handleDeletePatient = async () => {
    if (!deleteTarget) return;
    try {
      await dbService.deletePatient(deleteTarget.id);
      await refreshData();
      showToast('success', `Data pasien ${deleteTarget.fullName} dan riwayat terapi berhasil dihapus.`, 'Pasien Dihapus');
    } catch {
      showToast('error', 'Gagal menghapus data pasien.', 'Error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleExportExcel = () => {
    exportToExcel(filteredPatients, visits, 'BFisio_Daftar_Pasien');
    showToast('success', 'File Excel daftar pasien berhasil diunduh.', 'Ekspor Selesai');
  };

  const handleExportCSV = () => {
    exportToCSV(filteredPatients, 'BFisio_Daftar_Pasien');
    showToast('success', 'File CSV daftar pasien berhasil diunduh.', 'Ekspor Selesai');
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterLocation('all');
    setFilterTherapist('all');
    setFilterPayment('all');
    setStartDate('');
    setEndDate('');
    setSortBy('newestDate');
  };

  const hasActiveFilters =
    searchQuery ||
    filterLocation !== 'all' ||
    filterTherapist !== 'all' ||
    filterPayment !== 'all' ||
    startDate ||
    endDate;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Controls: Search, Filters, and Add Button */}
      <div className="bg-white dark:bg-[#001F3F]/30 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="patient-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan Nama Pasien, No. RM, Telepon, atau Diagnosa..."
              className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm rounded-full bg-slate-100 dark:bg-slate-900 border-none text-[#0F172A] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#001F3F] dark:focus:ring-blue-400 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <button
              id="btn-export-excel"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#001F3F] dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors shadow-xs uppercase tracking-wide"
              title="Unduh Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Excel</span>
            </button>
            <button
              id="btn-export-csv"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#001F3F] dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors shadow-xs uppercase tracking-wide"
              title="Unduh CSV"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>CSV</span>
            </button>
            <button
              id="btn-tambah-pasien-view"
              onClick={openAddPatientModal}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#001F3F] dark:bg-blue-600 hover:bg-[#001730] dark:hover:bg-blue-700 rounded-lg uppercase tracking-wide shadow-xs transition-all active:scale-98"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Tambah Pasien</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs">
          {/* Location filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Lokasi:</span>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value as any)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border-none text-slate-700 dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-[#001F3F]"
            >
              <option value="all">Semua Lokasi</option>
              <option value="Home Care">Home Care</option>
              <option value="Klinik">Klinik</option>
            </select>
          </div>

          {/* Therapist filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Terapis:</span>
            <select
              value={filterTherapist}
              onChange={(e) => setFilterTherapist(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border-none text-slate-700 dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-[#001F3F]"
            >
              <option value="all">Semua Terapis</option>
              {therapistsList.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Status filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Status:</span>
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value as any)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border-none text-slate-700 dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-[#001F3F]"
            >
              <option value="all">Semua Status</option>
              <option value="Lunas">Lunas</option>
              <option value="Belum Lunas">Belum Lunas</option>
              <option value="DP">DP (Parsial)</option>
              <option value="Gratis">Gratis</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" /> Urutkan:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border-none text-slate-700 dark:text-slate-200 font-bold focus:outline-none focus:ring-1 focus:ring-[#001F3F]"
            >
              <option value="newestDate">Terapi Terbaru</option>
              <option value="name">Nama Pasien (A-Z)</option>
              <option value="mrn">No. Rekam Medis (RM)</option>
              <option value="totalVisits">Total Kunjungan Terbanyak</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-bold"
            >
              <X className="w-3.5 h-3.5" /> Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Patient Table (Desktop) & Cards (Mobile) */}
      <div className="bg-white dark:bg-[#001F3F]/30 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        {/* Table Header Summary */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-[#001F3F] dark:text-white uppercase tracking-wider">
              Data Pasien
            </h3>
            <span className="px-2.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[#001F3F] dark:text-slate-300 text-xs font-bold font-mono">
              {filteredPatients.length} Pasien
            </span>
          </div>
        </div>

        {filteredPatients.length === 0 ? (
          <div className="py-16 text-center">
            <Search className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-[#001F3F] dark:text-white">
              Tidak ada data pasien yang cocok
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {hasActiveFilters
                ? 'Coba ubah kata kunci pencarian atau bersihkan filter pencarian Anda.'
                : 'Belum ada data pasien tersimpan. Klik tombol Tambah Pasien untuk mendaftarkan pasien pertama.'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={resetFilters}
                className="mt-4 px-4 py-2 text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Bersihkan Filter
              </button>
            ) : (
              <button
                onClick={openAddPatientModal}
                className="mt-4 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white bg-[#001F3F] hover:bg-[#001730] rounded-lg transition-colors"
              >
                + Tambah Pasien Sekarang
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Responsive Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-4">Nama Pasien</th>
                    <th className="py-3 px-3">No. RM</th>
                    <th className="py-3 px-3">No. HP</th>
                    <th className="py-3 px-2">Usia / L/P</th>
                    <th className="py-3 px-4">Diagnosa</th>
                    <th className="py-3 px-3">Lokasi</th>
                    <th className="py-3 px-3">Terapis</th>
                    <th className="py-3 px-3 text-center">Kunjungan</th>
                    <th className="py-3 px-3">Terapi Terakhir</th>
                    <th className="py-3 px-3">Status Bayar</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {filteredPatients.map((p) => {
                    const isLunas = p.lastPaymentStatus === 'Lunas';
                    const isDP = p.lastPaymentStatus === 'DP';
                    const isBelumLunas = p.lastPaymentStatus === 'Belum Lunas';

                    return (
                      <tr
                        key={p.id}
                        onClick={() => viewPatientProfile(p.id)}
                        className="hover:bg-slate-50/80 dark:hover:bg-white/5 cursor-pointer transition-colors group"
                      >
                        <td className="py-3 px-4 font-bold text-[#001F3F] dark:text-white">
                          <span>{p.fullName}</span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-xs text-[#001F3F] dark:text-blue-300">
                          {p.mrn}
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {p.phone}
                        </td>
                        <td className="py-3 px-2 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {p.age} th ({p.gender})
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300 max-w-xs truncate" title={p.diagnosis}>
                          {p.diagnosis || '-'}
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {p.lastLocation || 'Klinik'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap italic">
                          {p.lastTherapist || 'Bintang'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold text-xs text-slate-800 dark:text-slate-200">
                            {p.totalVisits}x
                          </span>
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {p.lastVisitDate ? formatDateShort(p.lastVisitDate) : '-'}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${
                              isLunas
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                : isDP
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                : isBelumLunas
                                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {p.lastPaymentStatus || 'Lunas'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => viewPatientProfile(p.id)}
                              className="p-1.5 text-slate-400 hover:text-[#001F3F] dark:hover:text-blue-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Lihat Profil Pasien"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEditPatientModal(p)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Edit Data Pasien"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openAddVisitModal(p)}
                              className="p-1.5 text-slate-400 hover:text-[#001F3F] dark:hover:text-blue-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Tambah Kunjungan Terapi"
                            >
                              <PlusCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(p)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                              title="Hapus Pasien"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List Transformation */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPatients.map((p) => (
                <div
                  key={p.id}
                  onClick={() => viewPatientProfile(p.id)}
                  className="p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {p.fullName}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
                          {p.mrn}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {p.age} th ({p.gender === 'L' ? 'Laki-laki' : 'Perempuan'})
                        </span>
                      </div>
                    </div>

                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {p.totalVisits} Kunjungan
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                    <strong className="text-slate-900 dark:text-slate-100">Diagnosa:</strong> {p.diagnosis || '-'}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {p.phone}
                    </span>
                    <span>Terakhir: {p.lastVisitDate ? formatDateShort(p.lastVisitDate) : '-'}</span>
                  </div>

                  {/* Actions for mobile */}
                  <div className="flex items-center justify-end gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openAddVisitModal(p)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Kunjungan
                    </button>
                    <button
                      onClick={() => openEditPatientModal(p)}
                      className="p-1.5 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(p)}
                      className="p-1.5 text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-lg"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Delete Patient Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Hapus Data Pasien"
        message={`Apakah Anda yakin ingin menghapus pasien "${deleteTarget?.fullName}" (${deleteTarget?.mrn})? Seluruh riwayat kunjungan terapi, catatan SOAP, dan riwayat pembayaran pasien ini juga akan dihapus secara permanen.`}
        confirmLabel="Hapus Pasien"
        cancelLabel="Batal"
        isDanger={true}
        onConfirm={handleDeletePatient}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
