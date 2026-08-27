import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Settings as SettingsIcon,
  UserCheck,
  Plus,
  Trash2,
  DollarSign,
  Activity,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Building,
  Save,
  ShieldCheck,
  Cloud,
  CloudCheck,
  RefreshCw,
  Database,
  Copy,
  Check,
  Key,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { dbService } from '../services/db';
import { ConfirmationModal } from './ConfirmationModal';
import { formatRupiah } from '../utils/formatters';
import { firebaseConfig } from '../firebaseConfig';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, refreshData, showToast } = useApp();

  // Local state for editing settings
  const [clinicName, setClinicName] = useState(settings.clinicName || 'B Fisio Care');
  const [clinicAddress, setClinicAddress] = useState(settings.clinicAddress || 'Jakarta, Indonesia');
  const [clinicPhone, setClinicPhone] = useState(settings.clinicPhone || '0812-3456-7890');
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

  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [showConfigDetails, setShowConfigDetails] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const cloudStatus = dbService.getCloudStatus();

  // Copy helper
  const handleCopyFirebaseConfig = (textToCopy: string, label: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedKey(label);
    showToast('success', `${label} berhasil disalin ke clipboard!`, 'Tersalin');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Manual Sync to Firebase Firestore
  const handleSyncCloud = async () => {
    setIsSyncingCloud(true);
    try {
      const res = await dbService.syncLocalToCloud();
      await refreshData();
      showToast('success', `Berhasil sinkronisasi ${res.syncedPatients} pasien & ${res.syncedVisits} riwayat kunjungan ke Google Firebase Firestore.`, 'Sinkronisasi Cloud Sukses');
    } catch (err) {
      showToast('error', (err as Error).message || 'Gagal melakukan sinkronisasi ke Firebase.', 'Gagal Sinkronisasi');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Reset to Demo
  const handleResetDemo = async () => {
    try {
      await dbService.resetToDemo();
      await refreshData();
      showToast('success', 'Data aplikasi berhasil direset ke data awal.', 'Reset Sukses');
    } catch {
      showToast('error', 'Gagal mereset data.', 'Error');
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
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#0B132B] dark:bg-blue-600 hover:bg-[#1C2541] dark:hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-slate-950/20"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}</span>
          </button>
        </div>
      </form>

      {/* Section 5: Google Firebase Cloud Database Status & Realtime Sync */}
      <div className="bg-gradient-to-br from-amber-500/10 via-white to-blue-500/5 dark:from-amber-950/20 dark:via-[#0F172A] dark:to-blue-950/10 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/60 dark:border-amber-900/30 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                5. Google Firebase Firestore Console
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <CloudCheck className="w-3 h-3" /> Terhubung Cloud
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Database aplikasi otomatis tersimpan dan tersinkronisasi ke Google Firebase Console secara real-time.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isSyncingCloud}
            onClick={handleSyncCloud}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 active:scale-95 rounded-xl transition-all shadow-sm shadow-amber-900/10 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
            <span>{isSyncingCloud ? 'Menyinkronkan...' : 'Sinkronisasi ke Cloud'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Firebase Project ID</span>
            <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
              {cloudStatus.projectId}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Status Koneksi Database</span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Aktif & Real-time (Firestore)
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Mode Penyimpanan</span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5 block">
              Hybrid Cloud + Offline Cache
            </span>
          </div>
        </div>

        {/* Detailed Firebase Config Object (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId) */}
        <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/30">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowConfigDetails(!showConfigDetails)}
              className="inline-flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-amber-200 transition-colors"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Detail Konfigurasi Kredensial Firebase (JSON / Object)</span>
              {showConfigDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => handleCopyFirebaseConfig(JSON.stringify(firebaseConfig, null, 2), 'Semua Konfigurasi Firebase')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 transition-all active:scale-95"
            >
              {copiedKey === 'Semua Konfigurasi Firebase' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Objek Konfigurasi</span>
                </>
              )}
            </button>
          </div>

          {showConfigDetails && (
            <div className="mt-3 space-y-3">
              {/* Individual parameter list with 1-click copy */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                {[
                  { label: 'apiKey', value: firebaseConfig.apiKey },
                  { label: 'authDomain', value: firebaseConfig.authDomain },
                  { label: 'projectId', value: firebaseConfig.projectId },
                  { label: 'storageBucket', value: firebaseConfig.storageBucket },
                  { label: 'messagingSenderId', value: firebaseConfig.messagingSenderId },
                  { label: 'appId', value: firebaseConfig.appId },
                  { label: 'firestoreDatabaseId', value: firebaseConfig.firestoreDatabaseId || '(default)' }
                ].map((item) => (
                  <div
                    key={item.label}
                    className="p-2.5 rounded-lg bg-slate-900 text-slate-200 border border-slate-800 flex items-center justify-between gap-2 overflow-hidden"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-amber-400 font-bold block">{item.label}</span>
                      <span className="text-xs truncate block text-slate-300 font-mono select-all">
                        {item.value}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyFirebaseConfig(item.value, item.label)}
                      className="p-1.5 text-slate-400 hover:text-amber-300 rounded hover:bg-slate-800 transition-colors shrink-0"
                      title={`Salin ${item.label}`}
                    >
                      {copiedKey === item.label ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>

              {/* Code Snippet */}
              <div className="p-3.5 rounded-xl bg-slate-950 text-slate-100 border border-slate-800 font-mono text-xs overflow-x-auto relative">
                <pre className="text-[11px] leading-relaxed">
{`const firebaseConfig = {
  apiKey: "${firebaseConfig.apiKey}",
  authDomain: "${firebaseConfig.authDomain}",
  projectId: "${firebaseConfig.projectId}",
  storageBucket: "${firebaseConfig.storageBucket}",
  messagingSenderId: "${firebaseConfig.messagingSenderId}",
  appId: "${firebaseConfig.appId}"
};`}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 6: Backup & Restore & Security */}
      <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
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
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Unduh Cadangan (Backup JSON)</span>
          </button>

          {/* Restore */}
          <label className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs cursor-pointer">
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Pulihkan Database (Restore JSON)</span>
            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
          </label>

          {/* Reset Demo */}
          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition-colors ml-auto"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset ke Data Demo Awal</span>
          </button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <ConfirmationModal
        isOpen={isResetConfirmOpen}
        title="Reset Data ke Awal"
        message="Apakah Anda yakin ingin mereset seluruh database aplikasi ke data demo awal? Semua perubahan dan data pasien yang Anda buat akan ditimpa."
        confirmLabel="Ya, Reset Database"
        cancelLabel="Batal"
        isDanger={true}
        onConfirm={handleResetDemo}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
};
