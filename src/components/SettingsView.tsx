import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  UserCheck,
  Trash2,
  DollarSign,
  Activity,
  Download,
  Upload,
  RotateCcw,
  Building,
  Save,
  ShieldCheck,
  Cloud,
  CloudCheck,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Wifi,
  Copy,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  Database,
} from 'lucide-react';
import { dbService } from '../services/db';
import { ConfirmationModal } from './ConfirmationModal';
import { formatRupiah } from '../utils/formatters';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    refreshData,
    showToast,
    syncLocalToCloud,
    pullCloudToLocal,
    testFirestoreConnection,
    getDiagnostics,
  } = useApp();

  // Local state for editing settings
  const [clinicName, setClinicName] = useState(settings.clinicInfo?.name || 'B Fisio Care');
  const [clinicAddress, setClinicAddress] = useState(settings.clinicInfo?.address || 'Jakarta, Indonesia');
  const [clinicPhone, setClinicPhone] = useState(settings.clinicInfo?.phone || '0812-3456-7890');
  const [defaultTherapist, setDefaultTherapist] = useState(settings.defaultTherapist || 'Bintang');
  const [therapists, setTherapists] = useState<string[]>(settings.therapists || ['Bintang']);
  const [newTherapistName, setNewTherapistName] = useState('');

  const [priceHomeCare, setPriceHomeCare] = useState<number>(settings.defaultPricing?.therapyPriceHomeCare || 200000);
  const [priceClinic, setPriceClinic] = useState<number>(settings.defaultPricing?.therapyPriceClinic || 150000);
  const [defaultTransport, setDefaultTransport] = useState<number>(settings.defaultPricing?.defaultTransport || 35000);

  const [interventions, setInterventions] = useState<string[]>(
    settings.availableInterventions || [
      'IR',
      'TENS',
      'US',
      'Massage',
      'Stretching',
      'Strengthening Exercise',
      'PNF',
      'Bobath',
      'AROM',
      'PROM',
      'Tapping',
      'Breathing Exercise',
      'Core Exercise',
      'Kompres Es',
    ]
  );
  const [newInterventionName, setNewInterventionName] = useState('');

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Cloud Diagnostics state
  const [diag, setDiag] = useState<{
    isCloud: boolean;
    projectId: string;
    cloudPatients: number;
    cloudVisits: number;
    cloudAppointments: number;
    localPatients: number;
    localVisits: number;
    localAppointments: number;
  } | null>(null);
  const [isTestingPing, setIsTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState<{ success: boolean; message: string; latencyMs: number } | null>(null);
  const [isSyncingToCloud, setIsSyncingToCloud] = useState(false);
  const [isPullingFromCloud, setIsPullingFromCloud] = useState(false);
  const [showVercelGuide, setShowVercelGuide] = useState(false);
  const [copiedVercelEnv, setCopiedVercelEnv] = useState(false);

  // Fetch diagnostics on mount
  useEffect(() => {
    let isMounted = true;
    getDiagnostics().then((res) => {
      if (isMounted) setDiag(res);
    });
    return () => {
      isMounted = false;
    };
  }, [getDiagnostics]);

  const handleTestConnection = async () => {
    setIsTestingPing(true);
    setPingResult(null);
    try {
      const res = await testFirestoreConnection();
      setPingResult(res);
      if (res.success) {
        showToast('success', res.message, 'Koneksi Sukses');
        const freshDiag = await getDiagnostics();
        setDiag(freshDiag);
      } else {
        showToast('error', res.message, 'Koneksi Terhambat');
      }
    } catch (e: any) {
      setPingResult({ success: false, message: e.message || 'Gagal terhubung', latencyMs: 0 });
      showToast('error', 'Koneksi ke Firestore gagal.', 'Error');
    } finally {
      setIsTestingPing(false);
    }
  };

  const handleSyncToCloud = async () => {
    setIsSyncingToCloud(true);
    try {
      const res = await syncLocalToCloud();
      showToast(
        'success',
        `Berhasil menyinkronkan data ke Firebase Firestore (${res.syncedPatients} pasien, ${res.syncedVisits} kunjungan, ${res.syncedAppointments} jadwal).`,
        'Sinkronisasi Berhasil'
      );
      const freshDiag = await getDiagnostics();
      setDiag(freshDiag);
    } catch (e: any) {
      showToast('error', e.message || 'Gagal mengirim data ke Firestore.', 'Gagal Sinkronisasi');
    } finally {
      setIsSyncingToCloud(false);
    }
  };

  const handlePullFromCloud = async () => {
    setIsPullingFromCloud(true);
    try {
      const res = await pullCloudToLocal();
      showToast(
        'success',
        `Berhasil mengunduh data dari Firebase Firestore (${res.patientsCount} pasien, ${res.visitsCount} kunjungan, ${res.appointmentsCount} jadwal).`,
        'Unduh Cloud Selesai'
      );
      const freshDiag = await getDiagnostics();
      setDiag(freshDiag);
    } catch (e: any) {
      showToast('error', e.message || 'Gagal menarik data dari Firestore.', 'Gagal Sinkronisasi');
    } finally {
      setIsPullingFromCloud(false);
    }
  };

  const vercelEnvSnippet = `# Kredensial Firebase untuk Vercel (Project Settings -> Environment Variables)
VITE_FIREBASE_API_KEY=AIzaSyBoMi0RhuX8JN6Vh21Z9LSuml2lKIAEvS8
VITE_FIREBASE_AUTH_DOMAIN=b-fisio-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=b-fisio-app
VITE_FIREBASE_STORAGE_BUCKET=b-fisio-app.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=55085958555
VITE_FIREBASE_APP_ID=1:55085958555:web:9bf6cfee439db2073b0d3e
VITE_FIREBASE_DATABASE_ID=(default)`;

  const handleCopyVercelEnv = () => {
    navigator.clipboard.writeText(vercelEnvSnippet);
    setCopiedVercelEnv(true);
    showToast('success', 'Variabel lingkungan Vercel disalin ke papan klip!', 'Tersalin');
    setTimeout(() => setCopiedVercelEnv(false), 2500);
  };

  // Add Therapist
  const handleAddTherapist = () => {
    if (!newTherapistName.trim()) return;
    const name = newTherapistName.trim();
    if (!therapists.includes(name)) {
      setTherapists([...therapists, name]);
    }
    setNewTherapistName('');
  };

  // Remove Therapist
  const handleRemoveTherapist = (name: string) => {
    if (therapists.length <= 1) {
      showToast('warning', 'Minimal harus ada 1 fisioterapis terdaftar.', 'Peringatan');
      return;
    }
    setTherapists(therapists.filter((t) => t !== name));
    if (defaultTherapist === name) {
      setDefaultTherapist(therapists[0]);
    }
  };

  // Add Intervention
  const handleAddIntervention = () => {
    if (!newInterventionName.trim()) return;
    const name = newInterventionName.trim();
    if (!interventions.includes(name)) {
      setInterventions([...interventions, name]);
    }
    setNewInterventionName('');
  };

  // Remove Intervention
  const handleRemoveIntervention = (name: string) => {
    setInterventions(interventions.filter((i) => i !== name));
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSettings({
        clinicName,
        clinicAddress,
        clinicPhone,
        defaultTherapist,
        therapists,
        availableInterventions: interventions,
        defaultPricing: {
          therapyPriceHomeCare: priceHomeCare,
          therapyPriceClinic: priceClinic,
          defaultTransport,
        },
      });
      showToast('success', 'Pengaturan aplikasi dan tarif berhasil disimpan.', 'Tersimpan');
    } catch {
      showToast('error', 'Gagal menyimpan pengaturan.', 'Error');
    } finally {
      setIsSaving(false);
    }
  };

  // Backup Data to JSON
  const handleExportBackup = async () => {
    try {
      const jsonStr = await dbService.exportBackup();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BFisio_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('success', 'File backup database berhasil diunduh.', 'Backup Selesai');
    } catch {
      showToast('error', 'Gagal mengekspor file backup.', 'Error');
    }
  };

  // Restore Data from JSON
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const res = await dbService.restoreBackup(content);
        if (!res.success) {
          throw new Error(res.message || 'Format file backup tidak valid');
        }

        await refreshData();
        showToast('success', `Database berhasil dipulihkan (${res.patientsCount} pasien, ${res.visitsCount} kunjungan).`, 'Restore Sukses');
      } catch (err) {
        showToast('error', 'File backup tidak valid atau rusak.', 'Gagal Restore');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Reset / Kosongkan Data Pasien
  const handleResetDemo = async () => {
    try {
      await dbService.clearAllPatientData();
      await refreshData();
      showToast('success', 'Seluruh data pasien berhasil dikosongkan (0 Pasien).', 'Data Dikosongkan');
    } catch {
      showToast('error', 'Gagal mengosongkan data pasien.', 'Error');
    } finally {
      setIsResetConfirmOpen(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: Profil Klinik & Praktik Mandiri */}
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              1. Identitas Praktik Mandiri / Klinik Fisioterapi
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama Layanan / Klinik
              </label>
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="Contoh: B Fisio Care"
                className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                No. Telepon / Hotline
              </label>
              <input
                type="text"
                value={clinicPhone}
                onChange={(e) => setClinicPhone(e.target.value)}
                placeholder="Contoh: 0812-3456-7890"
                className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Alamat / Wilayah Operasional
              </label>
              <input
                type="text"
                value={clinicAddress}
                onChange={(e) => setClinicAddress(e.target.value)}
                placeholder="Contoh: Jakarta & Sekitarnya"
                className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Manajemen Fisioterapis */}
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              2. Manajemen Fisioterapis
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fisioterapis Utama (Default saat input kunjungan)
              </label>
              <select
                value={defaultTherapist}
                onChange={(e) => setDefaultTherapist(e.target.value)}
                className="w-full sm:w-72 px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-semibold"
              >
                {therapists.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Daftar Fisioterapis Terdaftar
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {therapists.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                  >
                    <span>{t}</span>
                    {t === defaultTherapist && <span className="text-[10px] text-blue-600 font-bold">(Utama)</span>}
                    {therapists.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTherapist(t)}
                        className="text-slate-400 hover:text-rose-500 ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 max-w-md">
                <input
                  type="text"
                  value={newTherapistName}
                  onChange={(e) => setNewTherapistName(e.target.value)}
                  placeholder="Nama fisioterapis baru..."
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAddTherapist}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl"
                >
                  + Tambah Terapis
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Tarif Dasar & Biaya Transport */}
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              3. Tarif Dasar Tindakan & Transportasi
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tarif Sesi Home Care (Rp)
              </label>
              <input
                type="number"
                min="0"
                step="5000"
                value={priceHomeCare}
                onChange={(e) => setPriceHomeCare(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tarif Sesi Klinik (Rp)
              </label>
              <input
                type="number"
                min="0"
                step="5000"
                value={priceClinic}
                onChange={(e) => setPriceClinic(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Biaya Transport Default Home Care (Rp)
              </label>
              <input
                type="number"
                min="0"
                step="5000"
                value={defaultTransport}
                onChange={(e) => setDefaultTransport(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Daftar Intervensi Fisioterapi */}
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-600" />
              4. Master Intervensi Fisioterapi
            </h3>
          </div>

          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {interventions.map((inv) => (
                <span
                  key={inv}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                >
                  <span>{inv}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveIntervention(inv)}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2 max-w-md">
              <input
                type="text"
                value={newInterventionName}
                onChange={(e) => setNewInterventionName(e.target.value)}
                placeholder="Nama intervensi baru..."
                className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddIntervention}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl"
              >
                + Tambah Intervensi
              </button>
            </div>
          </div>
        </div>

        {/* Save Settings Action Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 rounded-xl transition-all shadow-md shadow-blue-900/20"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}</span>
          </button>
        </div>
      </form>

      {/* Section 5: Sinkronisasi Cloud Firebase & Status Vercel */}
      <div className="bg-white dark:bg-[#0F172A] border border-blue-200 dark:border-blue-900/60 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              5. Sinkronisasi Data Firebase Cloud & Status Vercel
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Pantau keterhubungan ke Google Firebase Firestore dan samakan data antara perangkat lokal & server Vercel.
            </p>
          </div>

          {/* Connection Status Badge */}
          <div className="flex items-center gap-2">
            {diag?.isCloud ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Firebase Online ({diag.projectId})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <CloudOff className="w-3.5 h-3.5" />
                Mode Lokal (Offline)
              </span>
            )}

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTestingPing}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-full transition-all active:scale-95"
            >
              <Wifi className={`w-3.5 h-3.5 ${isTestingPing ? 'animate-spin' : ''}`} />
              <span>{isTestingPing ? 'Menguji...' : 'Uji Koneksi'}</span>
            </button>
          </div>
        </div>

        {/* Latency & Connection Result Notice */}
        {pingResult && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
              pingResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/80'
                : 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800/80'
            }`}
          >
            <div className="flex items-center gap-2">
              {pingResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <span>{pingResult.message}</span>
            </div>
            {pingResult.latencyMs > 0 && (
              <span className="font-mono font-semibold px-2 py-0.5 rounded bg-white/60 dark:bg-black/20">
                {pingResult.latencyMs} ms
              </span>
            )}
          </div>
        )}

        {/* Matrix Comparison: Cloud vs Local Storage */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Card 1: Pasien */}
          <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
              <span>Data Pasien</span>
              <Database className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">
                  {diag?.cloudPatients !== undefined ? diag.cloudPatients : '—'}
                </div>
                <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">di Firebase Cloud</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {diag?.localPatients !== undefined ? diag.localPatients : '—'}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">di Browser Ini</div>
              </div>
            </div>
          </div>

          {/* Card 2: Kunjungan */}
          <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
              <span>Rekam Medis (Visits)</span>
              <Activity className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">
                  {diag?.cloudVisits !== undefined ? diag.cloudVisits : '—'}
                </div>
                <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">di Firebase Cloud</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {diag?.localVisits !== undefined ? diag.localVisits : '—'}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">di Browser Ini</div>
              </div>
            </div>
          </div>

          {/* Card 3: Jadwal Kalender */}
          <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
              <span>Jadwal Kalender</span>
              <Server className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">
                  {diag?.cloudAppointments !== undefined ? diag.cloudAppointments : '—'}
                </div>
                <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">di Firebase Cloud</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {diag?.localAppointments !== undefined ? diag.localAppointments : '—'}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">di Browser Ini</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sync Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
          {/* Push to Cloud */}
          <button
            type="button"
            onClick={handleSyncToCloud}
            disabled={isSyncingToCloud}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-50 rounded-xl transition-all shadow-sm"
          >
            <Upload className={`w-4 h-4 ${isSyncingToCloud ? 'animate-bounce' : ''}`} />
            <span>{isSyncingToCloud ? 'Mengunggah ke Firebase...' : 'Kirim / Unggah Data Lokal ke Firebase'}</span>
          </button>

          {/* Pull from Cloud */}
          <button
            type="button"
            onClick={handlePullFromCloud}
            disabled={isPullingFromCloud}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 disabled:opacity-50 border border-slate-200 dark:border-slate-700 rounded-xl transition-all"
          >
            <Download className={`w-4 h-4 ${isPullingFromCloud ? 'animate-bounce' : ''}`} />
            <span>{isPullingFromCloud ? 'Mengunduh dari Firebase...' : 'Tarik Data dari Firebase ke Browser Ini'}</span>
          </button>
        </div>

        {/* Vercel Environment Variables Helper (Collapsible) */}
        <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3">
          <button
            type="button"
            onClick={() => setShowVercelGuide(!showVercelGuide)}
            className="flex items-center justify-between w-full text-left text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 py-1"
          >
            <span className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              Panduan Kredensial Firebase untuk Vercel Deployment
            </span>
            {showVercelGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showVercelGuide && (
            <div className="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs space-y-3 animate-in fade-in duration-150">
              <p className="text-slate-600 dark:text-slate-300">
                Aplikasi ini sudah menyertakan konfigurasi bawaan. Namun jika di dashboard Vercel Anda memerlukan pengaturan variabel lingkungan (Environment Variables), masukkan variabel berikut pada menu{' '}
                <strong className="text-slate-900 dark:text-white">Project Settings &rarr; Environment Variables</strong>:
              </p>

              <div className="relative">
                <pre className="p-3 rounded-lg bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto leading-relaxed">
                  {vercelEnvSnippet}
                </pre>
                <button
                  type="button"
                  onClick={handleCopyVercelEnv}
                  className="absolute top-2 right-2 inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedVercelEnv ? 'Disalin!' : 'Salin Semua'}</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Setelah menambahkan variabel di Vercel, lakukan <strong>Redeploy</strong> pada deployment terakhir agar variabel aktif.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 6: Backup & Restore & Security */}
      <div className="bg-white dark:bg-[#0B132B]/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            6. Cadangkan & Pulihkan Database (Backup & Restore)
          </h3>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Data pasien dan rekam medis tersimpan secara aman di Google Firebase Firestore serta dicadangkan di peramban lokal.
          Unduh cadangan secara berkala untuk menjaga keamanan data.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {/* Backup */}
          <button
            onClick={handleExportBackup}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs transition-all"
          >
            <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Unduh Cadangan (Backup JSON)</span>
          </button>

          {/* Restore */}
          <label className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs cursor-pointer transition-all">
            <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Pulihkan Database (Restore JSON)</span>
            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
          </label>

          {/* Reset / Kosongkan Data Pasien */}
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 active:scale-95 rounded-xl transition-all ml-auto"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Kosongkan Seluruh Data Pasien (0 Pasien)</span>
          </button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <ConfirmationModal
        isOpen={isResetConfirmOpen}
        title="Kosongkan Seluruh Data Pasien"
        message="Apakah Anda yakin ingin mengosongkan seluruh data pasien dan riwayat kunjungan menjadi 0 pasien? Tindakan ini akan menghapus seluruh data rekam medis pasien."
        confirmLabel="Ya, Kosongkan Semua (0 Pasien)"
        cancelLabel="Batal"
        isDanger={true}
        onConfirm={handleResetDemo}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
};
