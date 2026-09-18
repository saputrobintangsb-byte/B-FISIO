import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Calendar,
  Activity,
  PlusCircle,
  Edit2,
  Printer,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Tag,
  Stethoscope,
  TrendingUp,
  CreditCard,
  HeartPulse,
  Scale,
  Thermometer,
  Wind,
  Layers,
  Eye,
  X,
  FileSpreadsheet,
  Download,
  HardDrive,
  ExternalLink,
  Link as LinkIcon
} from 'lucide-react';
import { formatDateIndonesian, formatDayDate, formatRupiah, calculateAsianBMI } from '../utils/formatters';
import { TherapyVisit, SupportingDocument } from '../types';
import { dbService } from '../services/db';
import { ConfirmationModal } from './ConfirmationModal';

export const PatientProfileView: React.FC = () => {
  const {
    selectedPatientId,
    patients,
    visits,
    appointments,
    openAddAppointmentModal,
    setActiveView,
    openEditPatientModal,
    openAddVisitModal,
    openEditVisitModal,
    openPrintModal,
    refreshData,
    showToast,
  } = useApp();

  const [expandedVisitIds, setExpandedVisitIds] = useState<string[]>([]);
  const [deleteVisitTarget, setDeleteVisitTarget] = useState<TherapyVisit | null>(null);
  const [deletePatientConfirm, setDeletePatientConfirm] = useState(false);
  const [activePreviewDoc, setActivePreviewDoc] = useState<SupportingDocument | null>(null);

  // Quick Supporting Document State
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [newDocUrl, setNewDocUrl] = useState('');
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocNotes, setNewDocNotes] = useState('');
  const [isSavingDoc, setIsSavingDoc] = useState(false);

  // Find active patient
  const patient = useMemo(() => {
    return patients.find((p) => p.id === selectedPatientId) || null;
  }, [patients, selectedPatientId]);

  // Find patient's visits sorted chronologically descending
  const patientVisits = useMemo(() => {
    if (!selectedPatientId) return [];
    return visits
      .filter((v) => v.patientId === selectedPatientId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.visitNumber - a.visitNumber);
  }, [visits, selectedPatientId]);

  // Calculate BMI info
  const bmiInfo = useMemo(() => {
    if (!patient?.vitalSigns) return null;
    return calculateAsianBMI(patient.vitalSigns.weight, patient.vitalSigns.height);
  }, [patient]);

  // Expand latest visit by default
  useEffect(() => {
    if (patientVisits.length > 0 && expandedVisitIds.length === 0) {
      setExpandedVisitIds([patientVisits[0].id]);
    }
  }, [patientVisits]);

  if (!patient) {
    return (
      <div className="py-20 text-center space-y-4">
        <User className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
        <h3 className="text-base font-bold text-slate-800 dark:text-white">Pasien tidak ditemukan</h3>
        <button
          onClick={() => setActiveView('patients')}
          className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl"
        >
          Kembali ke Daftar Pasien
        </button>
      </div>
    );
  }

  const toggleExpand = (id: string) => {
    if (expandedVisitIds.includes(id)) {
      setExpandedVisitIds(expandedVisitIds.filter((vId) => vId !== id));
    } else {
      setExpandedVisitIds([...expandedVisitIds, id]);
    }
  };

  const handleDeleteVisit = async () => {
    if (!deleteVisitTarget) return;
    try {
      await dbService.deleteVisit(deleteVisitTarget.id, deleteVisitTarget.patientId);
      await refreshData();
      showToast('success', `Kunjungan ke-${deleteVisitTarget.visitNumber} berhasil dihapus.`, 'Kunjungan Dihapus');
    } catch {
      showToast('error', 'Gagal menghapus kunjungan.', 'Error');
    } finally {
      setDeleteVisitTarget(null);
    }
  };

  const handleDeletePatient = async () => {
    try {
      await dbService.deletePatient(patient.id);
      await refreshData();
      showToast('success', `Pasien ${patient.fullName} berhasil dihapus.`, 'Pasien Dihapus');
      setActiveView('patients');
    } catch {
      showToast('error', 'Gagal menghapus data pasien.', 'Error');
    }
  };

  const handleSaveNewDoc = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newDocUrl.trim()) {
      showToast('warning', 'Masukkan URL / link Google Drive terlebih dahulu.', 'Link Kosong');
      return;
    }

    let formattedUrl = newDocUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const newDocItem: SupportingDocument = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title: newDocTitle.trim() || 'Data Penunjang Google Drive',
      url: formattedUrl,
      notes: newDocNotes.trim(),
      addedAt: new Date().toISOString(),
    };

    setIsSavingDoc(true);
    try {
      const updatedDocs = [...(patient.supportingDocs || []), newDocItem];
      const updatedPatient = {
        ...patient,
        supportingDocs: updatedDocs,
        updatedAt: new Date().toISOString(),
      };
      await dbService.savePatient(updatedPatient);
      await refreshData();
      setNewDocUrl('');
      setNewDocTitle('');
      setNewDocNotes('');
      setIsAddingDoc(false);
      showToast('success', 'Link data penunjang Google Drive berhasil disimpan.', 'Data Tersimpan');
    } catch (err) {
      showToast('error', 'Gagal menyimpan link data penunjang.', 'Error');
    } finally {
      setIsSavingDoc(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      const updatedDocs = (patient.supportingDocs || []).filter((d) => d.id !== docId);
      const updatedPatient = {
        ...patient,
        supportingDocs: updatedDocs,
        updatedAt: new Date().toISOString(),
      };
      await dbService.savePatient(updatedPatient);
      await refreshData();
      showToast('success', 'Link data penunjang berhasil dihapus.', 'Tautan Dihapus');
    } catch (err) {
      showToast('error', 'Gagal menghapus link data penunjang.', 'Error');
    }
  };

  const hasTTV = !!(
    patient.vitalSigns?.bloodPressure ||
    patient.vitalSigns?.heartRate ||
    patient.vitalSigns?.respiratoryRate ||
    patient.vitalSigns?.spo2 ||
    patient.vitalSigns?.temperature ||
    patient.vitalSigns?.height ||
    patient.vitalSigns?.weight ||
    patient.vitalSigns?.bmi
  );

  const hasICF = !!(
    patient.bodyFunction ||
    patient.bodyStructure ||
    patient.activityLimitation ||
    patient.participationRestriction ||
    patient.personalFactor ||
    patient.environmentalFactor
  );

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Top Navigation & Actions Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => setActiveView('patients')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Pasien</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-print-profile"
            onClick={() => openPrintModal(patient)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Cetak Rekam Medis</span>
          </button>
          <button
            id="btn-edit-profile"
            onClick={() => openEditPatientModal(patient)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors shadow-xs"
          >
            <Edit2 className="w-4 h-4 text-slate-500" />
            <span>Edit Pasien</span>
          </button>
          <button
            id="btn-schedule-patient-profile"
            onClick={() => openAddAppointmentModal(undefined, undefined, patient.id)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 rounded-xl transition-colors shadow-xs"
          >
            <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>+ Jadwalkan Terapi</span>
          </button>
          <button
            id="btn-add-visit-profile"
            onClick={() => openAddVisitModal(patient)}
            className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#001F3F] dark:bg-blue-600 hover:bg-[#001730] dark:hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-slate-950/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Kunjungan Baru</span>
          </button>
          <button
            id="btn-delete-profile"
            onClick={() => setDeletePatientConfirm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl transition-colors shadow-xs"
            title="Hapus Pasien"
          >
            <Trash2 className="w-4 h-4" />
            <span>Hapus Pasien</span>
          </button>
        </div>
      </div>

      {/* Patient Hero Header Card */}
      <div className="bg-[#001F3F] rounded-2xl p-6 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl font-extrabold shadow-lg shadow-blue-600/30 ring-2 ring-white/10 shrink-0">
              {patient.fullName.charAt(0)}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  {patient.fullName}
                </h2>
                <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 font-mono text-xs font-bold border border-blue-400/30">
                  {patient.mrn}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-slate-200">
                  {patient.age} Tahun ({patient.gender === 'L' ? 'Laki-laki' : 'Perempuan'})
                </span>
              </div>

              <p className="text-sm text-blue-200 font-medium mt-1">
                {patient.diagnosis || 'Tanpa diagnosa medis terdaftar'}
              </p>

              <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 text-xs text-slate-300 mt-3">
                <span className="flex items-center gap-1.5 shrink-0">
                  <Phone className="w-3.5 h-3.5 text-blue-400" />
                  <a href={`https://wa.me/${patient.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="hover:underline">
                    {patient.phone}
                  </a>
                </span>
                <span className="hidden sm:inline text-slate-500">•</span>
                <span className="flex items-start gap-1.5 min-w-0 max-w-full">
                  <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <span className="break-words whitespace-normal text-slate-200 leading-relaxed max-w-2xl">
                    {patient.address || 'Alamat belum dicatat'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex items-center gap-3 self-start md:self-auto border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
            <div className="text-center px-4 py-2 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[11px] text-slate-300 uppercase tracking-wider block font-semibold">
                Total Terapi
              </span>
              <span className="text-2xl font-extrabold text-white font-mono">
                {patient.totalVisits} <span className="text-xs font-normal text-slate-300">Kali</span>
              </span>
            </div>

            <div className="text-center px-4 py-2 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[11px] text-slate-300 uppercase tracking-wider block font-semibold">
                Sisa Tagihan
              </span>
              <span
                className={`text-xl font-bold font-mono ${
                  patient.outstandingBalance > 0 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {formatRupiah(patient.outstandingBalance)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Symmetrical Grid: Left (Clinical, TTV, ICF, Docs) + Right (Timeline & SOAP) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (1/3): Patient Clinical, TTV, ICF Domains & Supporting Documents */}
        <div className="space-y-6">
          
          {/* Card 1: Tanda-Tanda Vital (TTV) & Antropometri (IMT) */}
          <div className="bg-white dark:bg-[#001F3F]/40 dark:backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                Tanda-Tanda Vital (TTV)
              </h3>
              {bmiInfo && bmiInfo.category && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${bmiInfo.badgeBg}`}>
                  {bmiInfo.category}
                </span>
              )}
            </div>

            {hasTTV ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                      Tekanan Darah
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                      {patient.vitalSigns?.bloodPressure || '-'} <span className="text-[10px] font-normal text-slate-400">mmHg</span>
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                      Nadi / Heart Rate
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                      {patient.vitalSigns?.heartRate || '-'} <span className="text-[10px] font-normal text-slate-400">x/mnt</span>
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                      Pernafasan (RR)
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                      {patient.vitalSigns?.respiratoryRate || '-'} <span className="text-[10px] font-normal text-slate-400">x/mnt</span>
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                      SpO2 / Suhu
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                      {patient.vitalSigns?.spo2 ? `${patient.vitalSigns.spo2}%` : '-'} / {patient.vitalSigns?.temperature ? `${patient.vitalSigns.temperature}°C` : '-'}
                    </span>
                  </div>
                </div>

                {/* TB, BB, and IMT Section */}
                <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-blue-900 dark:text-blue-300 uppercase tracking-wider block font-semibold">
                      Antropometri
                    </span>
                    <p className="text-xs text-blue-950 dark:text-blue-200 font-medium">
                      TB: <strong>{patient.vitalSigns?.height || '-'} cm</strong> | BB: <strong>{patient.vitalSigns?.weight || '-'} kg</strong>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-blue-900 dark:text-blue-300 uppercase tracking-wider block font-semibold">
                      Indeks Massa Tubuh (IMT)
                    </span>
                    <span className="text-base font-extrabold text-[#001F3F] dark:text-blue-300 font-mono">
                      {bmiInfo?.bmiFormatted || '-'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Data tanda-tanda vital belum dicatat.</p>
            )}
          </div>

          {/* Card 2: Anamnesis & Informasi Klinis (RPS, Diagnosa, Keluhan) */}
          <div className="bg-white dark:bg-[#001F3F]/40 dark:backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Anamnesis & Keluhan
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium mb-0.5">Diagnosa Medis / Fisioterapi</span>
                <p className="font-semibold text-slate-900 dark:text-white leading-relaxed">
                  {patient.diagnosis || '-'}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block font-medium mb-0.5">Keluhan Utama</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  {patient.mainComplaint || '-'}
                </p>
              </div>

              {patient.currentMedicalHistory && (
                <div>
                  <span className="text-slate-400 block font-medium mb-0.5">Riwayat Penyakit Sekarang (RPS)</span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-blue-50/40 dark:bg-slate-900/60 p-2.5 rounded-xl border border-blue-100/60 dark:border-slate-800">
                    {patient.currentMedicalHistory}
                  </p>
                </div>
              )}

              {patient.additionalNotes && (
                <div>
                  <span className="text-slate-400 block font-medium mb-0.5">Catatan Tambahan & Riwayat Lain</span>
                  <p className="text-slate-600 dark:text-slate-400 italic">
                    {patient.additionalNotes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: 6 Domain ICF (International Classification of Functioning) */}
          <div className="bg-white dark:bg-[#001F3F]/40 dark:backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Kerangka ICF Fisioterapi
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">6 Domain</span>
            </div>

            {hasICF ? (
              <div className="space-y-2.5 text-xs">
                {patient.bodyFunction && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-[#001F3F] dark:text-blue-300 uppercase tracking-wider block mb-0.5">
                      1. Body Function (Fungsi Tubuh)
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {patient.bodyFunction}
                    </p>
                  </div>
                )}

                {patient.bodyStructure && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-[#001F3F] dark:text-blue-300 uppercase tracking-wider block mb-0.5">
                      2. Body Structure (Struktur Tubuh)
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {patient.bodyStructure}
                    </p>
                  </div>
                )}

                {patient.activityLimitation && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-[#001F3F] dark:text-blue-300 uppercase tracking-wider block mb-0.5">
                      3. Activity Limitation (Keterbatasan Aktivitas)
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {patient.activityLimitation}
                    </p>
                  </div>
                )}

                {patient.participationRestriction && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-[#001F3F] dark:text-blue-300 uppercase tracking-wider block mb-0.5">
                      4. Participation Restriction (Restriksi Partisipasi)
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {patient.participationRestriction}
                    </p>
                  </div>
                )}

                {patient.personalFactor && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-[#001F3F] dark:text-blue-300 uppercase tracking-wider block mb-0.5">
                      5. Personal Factor (Faktor Personal)
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {patient.personalFactor}
                    </p>
                  </div>
                )}

                {patient.environmentalFactor && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-[#001F3F] dark:text-blue-300 uppercase tracking-wider block mb-0.5">
                      6. Environmental Factor (Faktor Lingkungan)
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {patient.environmentalFactor}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Domain ICF belum dilengkapi.</p>
            )}
          </div>

          {/* Card 4: Data Penunjang (Link Google Drive / Berkas Lab) */}
          <div className="bg-white dark:bg-[#001F3F]/40 dark:backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Data Penunjang (Google Drive)
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  ({patient.supportingDocs?.length || 0})
                </span>
              </div>
              
              <button
                type="button"
                onClick={() => setIsAddingDoc(!isAddingDoc)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{isAddingDoc ? 'Tutup Form' : '+ Tambah Link'}</span>
              </button>
            </div>

            {/* Quick Add Form inside Profile */}
            {isAddingDoc && (
              <form
                onSubmit={handleSaveNewDoc}
                className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/80 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-3"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  <LinkIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Tambah Link Google Drive Baru</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    URL / Link Google Drive <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    value={newDocUrl}
                    onChange={(e) => setNewDocUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/... atau https://drive.google.com/drive/folders/..."
                    className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Keterangan / Judul Dokumen
                    </label>
                    <input
                      type="text"
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      placeholder="Contoh: Hasil MRI Lumbal, Rontgen X-Ray"
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Catatan / Hasil Ekspertise Dokter
                    </label>
                    <input
                      type="text"
                      value={newDocNotes}
                      onChange={(e) => setNewDocNotes(e.target.value)}
                      placeholder="Contoh: Tampak penyempitan diskus L4-L5"
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingDoc(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingDoc}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                  >
                    {isSavingDoc ? 'Menyimpan...' : 'Simpan Link'}
                  </button>
                </div>
              </form>
            )}

            {patient.supportingDocs && patient.supportingDocs.length > 0 ? (
              <div className="space-y-3">
                {patient.supportingDocs.map((doc, idx) => {
                  const hasDataUrl = !!doc.dataUrl;

                  return (
                    <div
                      key={doc.id || idx}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800 mt-0.5">
                            <HardDrive className="w-4 h-4" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-slate-400">
                                Berkas #{idx + 1}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                                Google Drive
                              </span>
                            </div>

                            <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                              {doc.title || doc.name || 'Dokumen Google Drive'}
                            </h4>

                            {doc.notes && (
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                                <strong>Hasil / Catatan:</strong> {doc.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {doc.url ? (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#001F3F] dark:bg-blue-600 hover:bg-[#001730] dark:hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold transition-all shadow-xs"
                            >
                              <span>Buka di Drive</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : hasDataUrl ? (
                            <button
                              type="button"
                              onClick={() => setActivePreviewDoc(doc)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-white rounded-lg text-[11px] font-semibold transition-all"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Lihat Berkas</span>
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Hapus Link Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Display URL text for reference */}
                      {doc.url && (
                        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate max-w-[80%] hover:text-blue-500 underline"
                          >
                            {doc.url}
                          </a>
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-sans font-medium">Tersimpan di Cloud</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Belum ada tautan data penunjang Google Drive yang disimpan. Klik &quot;+ Tambah Link&quot; di atas untuk menambahkan.</p>
            )}
          </div>

          {/* Card 5: Ringkasan Finansial */}
          <div className="bg-white dark:bg-[#001F3F]/40 dark:backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Ringkasan Finansial
              </h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Total Biaya Akumulasi:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {formatRupiah(patient.totalSpending)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Total Terbayar:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatRupiah(Math.max(0, patient.totalSpending - patient.outstandingBalance))}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Sisa Tagihan / DP:</span>
                <span
                  className={`font-bold font-mono text-sm ${
                    patient.outstandingBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'
                  }`}
                >
                  {formatRupiah(patient.outstandingBalance)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (2/3): Vertical Therapy Timeline & Detailed SOAP Notes */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-[#001F3F]/40 dark:backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800/80">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Riwayat & Kronologi Kunjungan Terapi
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {patientVisits.length} sesi terapi tercatat dalam timeline rekam medis
                </p>
              </div>

              <button
                onClick={() => openAddVisitModal(patient)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-xl transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Kunjungan Baru</span>
              </button>
            </div>

            {patientVisits.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Belum ada sesi terapi yang tercatat
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  Catat kunjungan terapi pertama untuk memulai timeline rekam medis dan SOAP pasien ini.
                </p>
                <button
                  onClick={() => openAddVisitModal(patient)}
                  className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-[#001F3F] dark:bg-blue-600 hover:bg-[#001730] dark:hover:bg-blue-700 rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-xs"
                >
                  <PlusCircle className="w-4 h-4" /> Catat Kunjungan Pertama
                </button>
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {patientVisits.map((visit) => {
                  const isExpanded = expandedVisitIds.includes(visit.id);
                  const isLunas = visit.payment.status === 'Lunas';
                  const isDP = visit.payment.status === 'DP';

                  return (
                    <div key={visit.id} className="relative group">
                      {/* Timeline Node Icon */}
                      <div className="absolute -left-[30px] top-4 w-4 h-4 rounded-full bg-white dark:bg-[#001F3F] border-2 border-blue-600 dark:border-blue-500 ring-4 ring-white dark:ring-[#001F3F] flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      </div>

                      {/* Timeline Card */}
                      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#001F3F]/30 hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-3.5">
                        {/* Card Header: Date, Visit No, Therapist, Location */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900 dark:text-white">
                                {formatDateIndonesian(visit.date)}
                              </span>
                              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono">
                                Ke {visit.visitNumber}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                              <span>Fisioterapis: <strong className="text-slate-700 dark:text-slate-300">{visit.therapist}</strong></span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {visit.location}
                              </span>
                            </div>
                          </div>

                          {/* Payment badge & Actions */}
                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <div className="text-right">
                              <span className="text-xs font-bold text-slate-900 dark:text-white font-mono block">
                                {formatRupiah(visit.payment.total)}
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                  isLunas
                                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                                    : isDP
                                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                                    : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                                }`}
                              >
                                {visit.payment.status}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 ml-2 border-l border-slate-200 dark:border-slate-800 pl-2">
                              <button
                                onClick={() => openEditVisitModal(visit)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                                title="Edit Sesi"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteVisitTarget(visit)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                                title="Hapus Sesi"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Interventions Pills */}
                        {visit.interventions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {visit.interventions.map((inv) => (
                              <span
                                key={inv}
                                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                              >
                                {inv}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Collapsible SOAP Details */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => toggleExpand(visit.id)}
                            className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 py-1"
                          >
                            <span className="flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5" />
                              Catatan SOAP Rekam Medis
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>

                          {isExpanded && (
                            <div className="mt-2.5 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2.5 animate-in fade-in duration-150">
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
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 italic">
                                  Catatan Biaya: {visit.payment.notes}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox / Preview Modal for Supporting Documents */}
      {activePreviewDoc && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 flex flex-col w-full shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 text-white">
              <div>
                <h4 className="text-sm font-bold">{activePreviewDoc.title || activePreviewDoc.name}</h4>
                <p className="text-[11px] text-slate-400">{activePreviewDoc.notes || activePreviewDoc.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={activePreviewDoc.dataUrl}
                  download={activePreviewDoc.name}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title="Unduh Berkas"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setActivePreviewDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto flex items-center justify-center bg-black/40">
              <img
                src={activePreviewDoc.dataUrl}
                alt={activePreviewDoc.title}
                className="max-h-[75vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Visit Confirmation */}
      <ConfirmationModal
        isOpen={!!deleteVisitTarget}
        title="Hapus Catatan Kunjungan"
        message={`Apakah Anda yakin ingin menghapus catatan Sesi Kunjungan ke-${deleteVisitTarget?.visitNumber} pada tanggal ${deleteVisitTarget?.date}? Riwayat SOAP dan biaya akan dihapus.`}
        confirmLabel="Hapus Kunjungan"
        cancelLabel="Batal"
        isDanger={true}
        onConfirm={handleDeleteVisit}
        onCancel={() => setDeleteVisitTarget(null)}
      />

      {/* Delete Patient Confirmation */}
      <ConfirmationModal
        isOpen={deletePatientConfirm}
        title="Hapus Data Pasien"
        message={`Apakah Anda yakin ingin menghapus seluruh data pasien ${patient.fullName} (${patient.mrn}) beserta seluruh riwayat ${patient.totalVisits} kunjungan terapinya?`}
        confirmLabel="Hapus Pasien"
        cancelLabel="Batal"
        isDanger={true}
        onConfirm={handleDeletePatient}
        onCancel={() => setDeletePatientConfirm(false)}
      />
    </div>
  );
};
