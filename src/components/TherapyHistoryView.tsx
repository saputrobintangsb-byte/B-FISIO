import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Search,
  Filter,
  Calendar,
  MapPin,
  Stethoscope,
  Activity,
  FileText,
  DollarSign,
  Edit2,
  Trash2,
  Eye,
  PlusCircle,
  Download,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  X,
  Clock
} from 'lucide-react';
import { TherapyVisit, PaymentStatus } from '../types';
import { formatDateIndonesian, formatDateShort, formatRupiah, exportToExcel } from '../utils/formatters';
import { ConfirmationModal } from './ConfirmationModal';
import { dbService } from '../services/db';

export const TherapyHistoryView: React.FC = () => {
  const {
    visits,
    patients,
    viewPatientProfile,
    openAddVisitModal,
    openEditVisitModal,
    settings,
    refreshData,
    showToast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState<'all' | 'Home Care' | 'Klinik'>('all');
  const [filterTherapist, setFilterTherapist] = useState('all');
  const [filterPayment, setFilterPayment] = useState<'all' | PaymentStatus>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');
  const [expandedVisitIds, setExpandedVisitIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<TherapyVisit | null>(null);

  // Filtered visits
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          v.patientName.toLowerCase().includes(q) ||
          v.mrn.toLowerCase().includes(q) ||
          v.therapist.toLowerCase().includes(q) ||
          v.interventions.some((i) => i.toLowerCase().includes(q)) ||
          v.soap.subjective.toLowerCase().includes(q) ||
          v.soap.assessment.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (filterLocation !== 'all' && v.location !== filterLocation) return false;
      if (filterTherapist !== 'all' && v.therapist !== filterTherapist) return false;
      if (filterPayment !== 'all' && v.payment.status !== filterPayment) return false;
      if (startDate && v.date < startDate) return false;
      if (endDate && v.date > endDate) return false;

      return true;
    });
  }, [visits, searchQuery, filterLocation, filterTherapist, filterPayment, startDate, endDate]);

  const toggleExpand = (id: string) => {
    if (expandedVisitIds.includes(id)) {
      setExpandedVisitIds(expandedVisitIds.filter((vId) => vId !== id));
    } else {
      setExpandedVisitIds([...expandedVisitIds, id]);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await dbService.deleteVisit(deleteTarget.id, deleteTarget.patientId);
      await refreshData();
      showToast('success', `Kunjungan ${deleteTarget.patientName} (${deleteTarget.date}) berhasil dihapus.`, 'Dihapus');
    } catch {
      showToast('error', 'Gagal menghapus kunjungan.', 'Error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleExport = () => {
    exportToExcel(patients, filteredVisits, 'BFisio_Riwayat_Terapi');
    showToast('success', 'Riwayat terapi berhasil diekspor ke Excel.', 'Ekspor Selesai');
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterLocation('all');
    setFilterTherapist('all');
    setFilterPayment('all');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters =
    searchQuery || filterLocation !== 'all' || filterTherapist !== 'all' || filterPayment !== 'all' || startDate || endDate;

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Filter and Action Header */}
      <div className="bg-white dark:bg-[#001F3F]/30 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="history-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama pasien, No. RM, intervensi, catatan SOAP..."
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

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider transition-all ${
                  viewMode === 'timeline'
                    ? 'bg-[#001F3F] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider transition-all ${
                  viewMode === 'table'
                    ? 'bg-[#001F3F] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Tabel
              </button>
            </div>

            <button
              id="history-btn-export"
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#001F3F] dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors shadow-xs uppercase tracking-wide"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Ekspor Excel</span>
            </button>

            <button
              id="history-btn-add-visit"
              onClick={() => openAddVisitModal(null)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#001F3F] dark:bg-blue-600 hover:bg-[#001730] dark:hover:bg-blue-700 rounded-lg uppercase tracking-wide shadow-xs transition-all active:scale-98"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Tambah Kunjungan</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs">
          {/* Start & End Date */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Dari:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border-none text-slate-700 dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-[#001F3F]"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sampai:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border-none text-slate-700 dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-[#001F3F]"
            />
          </div>

          {/* Location */}
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

          {/* Therapist */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Terapis:</span>
            <select
              value={filterTherapist}
              onChange={(e) => setFilterTherapist(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border-none text-slate-700 dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-[#001F3F]"
            >
              <option value="all">Semua Terapis</option>
              {(settings.therapists || ['Bintang']).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Status */}
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
              <option value="DP">DP</option>
              <option value="Gratis">Gratis</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-bold ml-auto"
            >
              <X className="w-3.5 h-3.5" /> Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Main Content: Timeline View or Table View */}
      {filteredVisits.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
          <Clock className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-900 dark:text-white">
            Tidak ada riwayat terapi ditemukan
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {hasActiveFilters ? 'Coba sesuaikan kata kunci atau rentang tanggal filter Anda.' : 'Belum ada catatan kunjungan terapi.'}
          </p>
          <button
            onClick={() => openAddVisitModal(null)}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors inline-flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" /> Catat Kunjungan Baru
          </button>
        </div>
      ) : viewMode === 'timeline' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Menampilkan {filteredVisits.length} Sesi Terapi
            </span>
          </div>

          <div className="space-y-4">
            {filteredVisits.map((visit) => {
              const isExpanded = expandedVisitIds.includes(visit.id);
              const isLunas = visit.payment.status === 'Lunas';
              const isDP = visit.payment.status === 'DP';
              const isBelumLunas = visit.payment.status === 'Belum Lunas';

              return (
                <div
                  key={visit.id}
                  className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Patient Name & Visit details */}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => viewPatientProfile(visit.patientId)}
                          className="font-bold text-sm sm:text-base text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                        >
                          {visit.patientName}
                        </button>
                        <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400">
                          {visit.mrn}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono">
                          Kunjungan ke-{visit.visitNumber}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                          <Calendar className="w-3.5 h-3.5 text-blue-500" />
                          {formatDateIndonesian(visit.date)}
                        </span>
                        <span>•</span>
                        <span>Fisioterapis: <strong className="text-slate-700 dark:text-slate-300">{visit.therapist}</strong></span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {visit.location}
                        </span>
                      </div>
                    </div>

                    {/* Right: Payment details & Action buttons */}
                    <div className="flex items-center gap-3 self-start sm:self-auto border-t sm:border-t-0 pt-2 sm:pt-0">
                      <div className="text-left sm:text-right">
                        <span className="text-xs text-slate-400 block sm:inline mr-1">Total:</span>
                        <span className="font-bold font-mono text-sm text-slate-900 dark:text-white">
                          {formatRupiah(visit.payment.total)}
                        </span>
                        <div className="mt-0.5">
                          <span
                            className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded ${
                              isLunas
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                : isDP
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {visit.payment.status} {isDP && `(Sisa: ${formatRupiah(visit.payment.remainingBalance)})`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-slate-800">
                        <button
                          onClick={() => viewPatientProfile(visit.patientId)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Buka Profil Pasien"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditVisitModal(visit)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Sesi"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(visit)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                          title="Hapus Sesi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Interventions */}
                  {visit.interventions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {visit.interventions.map((inv) => (
                        <span
                          key={inv}
                          className="text-[11px] font-semibold px-2.5 py-0.8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                        >
                          {inv}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* SOAP dropdown */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => toggleExpand(visit.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>Catatan SOAP Rekam Medis</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 text-xs space-y-2.5 animate-in fade-in duration-150">
                        {visit.soap.subjective && (
                          <div>
                            <span className="font-bold text-blue-600 dark:text-blue-400">S (Subjective):</span>
                            <p className="text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed whitespace-pre-line">
                              {visit.soap.subjective}
                            </p>
                          </div>
                        )}
                        {visit.soap.objective && (
                          <div>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">O (Objective):</span>
                            <p className="text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed whitespace-pre-line">
                              {visit.soap.objective}
                            </p>
                          </div>
                        )}
                        {visit.soap.assessment && (
                          <div>
                            <span className="font-bold text-purple-600 dark:text-purple-400">A (Assessment):</span>
                            <p className="text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed whitespace-pre-line">
                              {visit.soap.assessment}
                            </p>
                          </div>
                        )}
                        {visit.soap.plan && (
                          <div>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">P (Plan):</span>
                            <p className="text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed whitespace-pre-line">
                              {visit.soap.plan}
                            </p>
                          </div>
                        )}
                        {visit.payment.notes && (
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 italic">
                            Catatan Administrasi: {visit.payment.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Table View */
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#0B132B]/50 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Tanggal</th>
                <th className="py-3.5 px-3">No. RM</th>
                <th className="py-3.5 px-4">Nama Pasien</th>
                <th className="py-3.5 px-2 text-center">Ke-</th>
                <th className="py-3.5 px-3">Lokasi</th>
                <th className="py-3.5 px-3">Terapis</th>
                <th className="py-3.5 px-4">Intervensi</th>
                <th className="py-3.5 px-3">Total Biaya</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredVisits.map((v) => (
                <tr
                  key={v.id}
                  onClick={() => viewPatientProfile(v.patientId)}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                    {formatDateShort(v.date)}
                  </td>
                  <td className="py-3 px-3 font-mono font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
                    {v.mrn}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                    {v.patientName}
                  </td>
                  <td className="py-3 px-2 text-center font-bold text-slate-700 dark:text-slate-300">
                    {v.visitNumber}
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {v.location}
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {v.therapist}
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-xs truncate" title={v.interventions.join(', ')}>
                    {v.interventions.join(', ')}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                    {formatRupiah(v.payment.total)}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                      {v.payment.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditVisitModal(v)}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                        title="Edit Sesi"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(v)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Hapus Sesi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Hapus Catatan Kunjungan"
        message={`Apakah Anda yakin ingin menghapus catatan kunjungan tanggal ${deleteTarget?.date} untuk pasien ${deleteTarget?.patientName}?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        isDanger={true}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
