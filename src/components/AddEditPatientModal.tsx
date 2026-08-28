import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  User,
  Calendar,
  Phone,
  MapPin,
  FileText,
  Activity,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  PlusCircle,
  Hash,
  HeartPulse,
  Scale,
  Thermometer,
  Wind,
  Trash2,
  Info,
  Layers,
  HelpCircle,
  FileSpreadsheet,
  Stethoscope,
  Link as LinkIcon,
  ExternalLink,
  Plus,
  HardDrive
} from 'lucide-react';
import { Patient, Gender, VitalSigns, SupportingDocument } from '../types';
import { calculateAge, getTodayDateString, calculateAsianBMI } from '../utils/formatters';
import { dbService } from '../services/db';
import { VasPainScale, getVasInterpretation } from './VasPainScale';

export const AddEditPatientModal: React.FC = () => {
  const {
    isPatientModalOpen,
    closePatientModal,
    editingPatient,
    refreshData,
    showToast,
    viewPatientProfile,
    openAddVisitModal,
    patients,
  } = useApp();

  const isEdit = !!editingPatient;

  // Demographics State
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [age, setAge] = useState<number>(0);
  const [gender, setGender] = useState<Gender>('L');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [mrn, setMrn] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // TTV (Tanda-Tanda Vital & Antropometri) State
  const [bloodPressure, setBloodPressure] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [respiratoryRate, setRespiratoryRate] = useState('');
  const [spo2, setSpo2] = useState('');
  const [temperature, setTemperature] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  // Clinical & Anamnesis State
  const [diagnosis, setDiagnosis] = useState('');
  const [mainComplaint, setMainComplaint] = useState('');
  const [vasScore, setVasScore] = useState<number>(0);
  const [currentMedicalHistory, setCurrentMedicalHistory] = useState(''); // Riwayat Penyakit Sekarang (RPS)
  const [additionalNotes, setAdditionalNotes] = useState('');

  // 6 Domains of ICF (International Classification of Functioning)
  const [bodyFunction, setBodyFunction] = useState('');
  const [bodyStructure, setBodyStructure] = useState('');
  const [activityLimitation, setActivityLimitation] = useState('');
  const [participationRestriction, setParticipationRestriction] = useState('');
  const [personalFactor, setPersonalFactor] = useState('');
  const [environmentalFactor, setEnvironmentalFactor] = useState('');

  // Data Penunjang (Supporting Documents via Google Drive Link)
  const [supportingDocs, setSupportingDocs] = useState<SupportingDocument[]>([]);
  const [newDocUrl, setNewDocUrl] = useState('');
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocNotes, setNewDocNotes] = useState('');

  // Duplicate detection state
  const [duplicateWarning, setDuplicateWarning] = useState<Patient | null>(null);

  // Calculate BMI live
  const bmiInfo = useMemo(() => {
    return calculateAsianBMI(weight, height);
  }, [weight, height]);

  // Initialize form when opened or editingPatient changes
  useEffect(() => {
    if (editingPatient) {
      setFullName(editingPatient.fullName || '');
      setDob(editingPatient.dob || '');
      setAge(editingPatient.age || 0);
      setGender(editingPatient.gender || 'L');
      setPhone(editingPatient.phone || '');
      setAddress(editingPatient.address || '');
      setMrn(editingPatient.mrn || '');
      
      // TTV
      setBloodPressure(editingPatient.vitalSigns?.bloodPressure || '');
      setHeartRate(editingPatient.vitalSigns?.heartRate ? String(editingPatient.vitalSigns.heartRate) : '');
      setRespiratoryRate(editingPatient.vitalSigns?.respiratoryRate ? String(editingPatient.vitalSigns.respiratoryRate) : '');
      setSpo2(editingPatient.vitalSigns?.spo2 ? String(editingPatient.vitalSigns.spo2) : '');
      setTemperature(editingPatient.vitalSigns?.temperature ? String(editingPatient.vitalSigns.temperature) : '');
      setHeight(editingPatient.vitalSigns?.height ? String(editingPatient.vitalSigns.height) : '');
      setWeight(editingPatient.vitalSigns?.weight ? String(editingPatient.vitalSigns.weight) : '');

      // Clinical & ICF
      setDiagnosis(editingPatient.diagnosis || '');
      setMainComplaint(editingPatient.mainComplaint || '');
      setVasScore(typeof editingPatient.vasScore === 'number' ? editingPatient.vasScore : 0);
      setCurrentMedicalHistory(editingPatient.currentMedicalHistory || '');
      setAdditionalNotes(editingPatient.additionalNotes || '');

      setBodyFunction(editingPatient.bodyFunction || '');
      setBodyStructure(editingPatient.bodyStructure || '');
      setActivityLimitation(editingPatient.activityLimitation || '');
      setParticipationRestriction(editingPatient.participationRestriction || '');
      setPersonalFactor(editingPatient.personalFactor || '');
      setEnvironmentalFactor(editingPatient.environmentalFactor || '');

      // Supporting Docs
      setSupportingDocs(editingPatient.supportingDocs || []);
      setNewDocUrl('');
      setNewDocTitle('');
      setNewDocNotes('');
      setDuplicateWarning(null);
    } else {
      setFullName('');
      setDob('');
      setAge(0);
      setGender('L');
      setPhone('');
      setAddress('');

      // TTV
      setBloodPressure('');
      setHeartRate('');
      setRespiratoryRate('');
      setSpo2('');
      setTemperature('');
      setHeight('');
      setWeight('');

      // Clinical & ICF
      setDiagnosis('');
      setMainComplaint('');
      setVasScore(0);
      setCurrentMedicalHistory('');
      setAdditionalNotes('');

      setBodyFunction('');
      setBodyStructure('');
      setActivityLimitation('');
      setParticipationRestriction('');
      setPersonalFactor('');
      setEnvironmentalFactor('');

      setSupportingDocs([]);
      setNewDocUrl('');
      setNewDocTitle('');
      setNewDocNotes('');
      setDuplicateWarning(null);

      // Generate next MRN
      dbService.generateMRN().then((newMrn) => setMrn(newMrn));
    }
  }, [editingPatient, isPatientModalOpen]);

  // Auto calculate age when DOB changes
  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDob(val);
    if (val) {
      const computedAge = calculateAge(val);
      setAge(computedAge);
    }
  };

  // Real-time duplicate check while typing (only for new patient registration)
  useEffect(() => {
    if (isEdit || (!fullName.trim() && !phone.trim())) {
      setDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      const match = await dbService.checkDuplicatePatient(fullName, phone);
      setDuplicateWarning(match);
    }, 250);

    return () => clearTimeout(timer);
  }, [fullName, phone, isEdit]);

  // Add Google Drive Link for Data Penunjang
  const handleAddGoogleDriveDoc = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!newDocUrl.trim()) {
      showToast('warning', 'Masukkan URL / link Google Drive terlebih dahulu.', 'Link Belum Diisi');
      return;
    }

    let formattedUrl = newDocUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const newDoc: SupportingDocument = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title: newDocTitle.trim() || 'Data Penunjang Google Drive',
      url: formattedUrl,
      notes: newDocNotes.trim(),
      addedAt: new Date().toISOString(),
    };

    setSupportingDocs((prev) => [...prev, newDoc]);
    setNewDocUrl('');
    setNewDocTitle('');
    setNewDocNotes('');
    showToast('success', 'Link Google Drive berhasil ditambahkan ke daftar.', 'Tautan Tersimpan');
  };

  const handleUpdateDocTitle = (id: string, title: string) => {
    setSupportingDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, title } : d))
    );
  };

  const handleUpdateDocUrl = (id: string, url: string) => {
    setSupportingDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, url } : d))
    );
  };

  const handleUpdateDocNotes = (id: string, notes: string) => {
    setSupportingDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, notes } : d))
    );
  };

  const handleRemoveDoc = (id: string) => {
    setSupportingDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      showToast('warning', 'Nama lengkap pasien wajib diisi.', 'Validasi Gagal');
      return;
    }

    if (!phone.trim()) {
      showToast('warning', 'Nomor telepon/WhatsApp wajib diisi.', 'Validasi Gagal');
      return;
    }

    setIsSubmitting(true);

    try {
      const vitalSignsData: VitalSigns = {
        bloodPressure: bloodPressure.trim(),
        heartRate: heartRate.trim(),
        respiratoryRate: respiratoryRate.trim(),
        spo2: spo2.trim(),
        temperature: temperature.trim(),
        height: height.trim(),
        weight: weight.trim(),
        bmi: bmiInfo.bmi ?? undefined,
        bmiCategory: bmiInfo.category || undefined,
      };

      const patientData: Patient = {
        id: editingPatient?.id || '',
        mrn: mrn.trim() || (await dbService.generateMRN()),
        fullName: fullName.trim(),
        dob: dob || '',
        age: age || 0,
        gender,
        phone: phone.trim(),
        address: address.trim(),
        
        // Clinical Anamnesis
        diagnosis: diagnosis.trim(),
        mainComplaint: mainComplaint.trim(),
        vasScore,
        vasCategory: getVasInterpretation(vasScore).category,
        currentMedicalHistory: currentMedicalHistory.trim(),
        additionalNotes: additionalNotes.trim(),

        // 6 Domains ICF
        bodyFunction: bodyFunction.trim(),
        bodyStructure: bodyStructure.trim(),
        activityLimitation: activityLimitation.trim(),
        participationRestriction: participationRestriction.trim(),
        personalFactor: personalFactor.trim(),
        environmentalFactor: environmentalFactor.trim(),

        // TTV
        vitalSigns: vitalSignsData,

        // Data Penunjang
        supportingDocs,

        createdAt: editingPatient?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalVisits: editingPatient?.totalVisits || 0,
        lastVisitDate: editingPatient?.lastVisitDate,
        lastLocation: editingPatient?.lastLocation,
        lastTherapist: editingPatient?.lastTherapist,
        totalSpending: editingPatient?.totalSpending || 0,
        outstandingBalance: editingPatient?.outstandingBalance || 0,
        lastPaymentStatus: editingPatient?.lastPaymentStatus,
      };

      const savedPatient = await dbService.savePatient(patientData);
      await refreshData();

      showToast(
        'success',
        isEdit
          ? `Data pasien ${savedPatient.fullName} berhasil diperbarui.`
          : `Pasien baru ${savedPatient.fullName} (${savedPatient.mrn}) berhasil didaftarkan.`,
        isEdit ? 'Update Berhasil' : 'Pasien Tersimpan'
      );

      closePatientModal();
      viewPatientProfile(savedPatient.id);
    } catch (err) {
      showToast('error', 'Terjadi kesalahan saat menyimpan data pasien.', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isPatientModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="add-edit-patient-modal"
        className="w-full max-w-3xl bg-white dark:bg-[#001F3F]/40 dark:backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-4 sm:my-6 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-[#001F3F] text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold">
              <User className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-wide">
                {isEdit ? 'Edit Rekam Medis Pasien' : 'Registrasi Pasien Baru & Anamnesis Fisioterapi'}
              </h3>
              <p className="text-xs text-blue-200">
                {isEdit
                  ? `Memperbarui data klinis & rekam medis ${editingPatient?.mrn}`
                  : 'Pencatatan Demografi, TTV, ICF Framework, dan Data Penunjang'}
              </p>
            </div>
          </div>
          <button
            onClick={closePatientModal}
            className="p-1.5 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Patient Detection Banner */}
        {duplicateWarning && !isEdit && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Pasien Serupa Ditemukan!
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-300/90 mt-0.5">
                  <strong>{duplicateWarning.fullName}</strong> ({duplicateWarning.mrn}) sudah terdaftar dengan no. telepon {duplicateWarning.phone}.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  closePatientModal();
                  viewPatientProfile(duplicateWarning.id);
                }}
                className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white bg-[#001F3F] hover:bg-[#001730] rounded-lg transition-colors flex items-center justify-center gap-1 shadow-xs"
              >
                Buka Profil <ArrowRight className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => {
                  closePatientModal();
                  openAddVisitModal(duplicateWarning);
                }}
                className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-100 bg-amber-200/80 dark:bg-amber-900/60 hover:bg-amber-300 rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <PlusCircle className="w-3 h-3" /> + Kunjungan
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-800 dark:text-slate-100">
          
          {/* ============================================================ */}
          {/* SECTION 1: DATA PASIEN & DEMOGRAFI */}
          {/* ============================================================ */}
          <div className="bg-white dark:bg-slate-900/60 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h4 className="text-xs font-bold text-[#001F3F] dark:text-blue-300 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                1. Data Pasien & Demografi
              </h4>
              <span className="text-[10px] text-slate-400 font-medium">* Wajib diisi</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap Pasien <span className="text-rose-500">*</span>
                </label>
                <input
                  id="patient-input-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Bambang Supriyanto"
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#001F3F] dark:focus:ring-blue-400"
                />
              </div>

              {/* No. HP / WhatsApp */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  No. Telepon / WhatsApp <span className="text-rose-500">*</span>
                </label>
                <input
                  id="patient-input-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contoh: 081289123456"
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#001F3F] dark:focus:ring-blue-400"
                />
              </div>

              {/* Tanggal Lahir */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Lahir
                </label>
                <input
                  id="patient-input-dob"
                  type="date"
                  value={dob}
                  onChange={handleDobChange}
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#001F3F] dark:focus:ring-blue-400"
                />
              </div>

              {/* Usia & Jenis Kelamin */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Usia (Tahun)
                  </label>
                  <input
                    id="patient-input-age"
                    type="number"
                    min="0"
                    max="130"
                    value={age || ''}
                    onChange={(e) => setAge(parseInt(e.target.value, 10) || 0)}
                    placeholder="Usia"
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#001F3F] dark:focus:ring-blue-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    id="patient-input-gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#001F3F] dark:focus:ring-blue-400 font-medium"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              {/* No. Rekam Medis (RM) */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor Rekam Medis (Otomatis)
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="patient-input-mrn"
                    type="text"
                    value={mrn}
                    onChange={(e) => setMrn(e.target.value)}
                    placeholder="RM-00001"
                    className="w-full pl-10 pr-3.5 py-2 text-sm font-mono rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#001F3F] dark:text-blue-400 font-bold focus:outline-none focus:ring-2 focus:ring-[#001F3F]"
                  />
                </div>
              </div>

              {/* Alamat Pasien */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Lengkap / Lokasi Kunjungan Home Care
                </label>
                <input
                  id="patient-input-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Contoh: Jl. Mawar No. 14, Tebet, Jakarta Selatan"
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#001F3F] dark:focus:ring-blue-400"
                />
              </div>
            </div>
          </div>


          {/* ============================================================ */}
          {/* SECTION 2: TANDA-TANDA VITAL (TTV) & ANTROPOMETRI (IMT OTOMATIS) */}
          {/* ============================================================ */}
          <div className="bg-white dark:bg-slate-900/60 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h4 className="text-xs font-bold text-[#001F3F] dark:text-blue-300 uppercase tracking-wider flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                2. Tanda-Tanda Vital (TTV) & Antropometri
              </h4>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                IMT Otomatis Terhitung
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Tekanan Darah (TD) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tekanan Darah (TD)
                </label>
                <div className="relative">
                  <input
                    id="patient-input-ttv-td"
                    type="text"
                    value={bloodPressure}
                    onChange={(e) => setBloodPressure(e.target.value)}
                    placeholder="120/80"
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#001F3F]"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-sans pointer-events-none">
                    mmHg
                  </span>
                </div>
              </div>

              {/* Nadi / Heart Rate */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Frekuensi Nadi
                </label>
                <div className="relative">
                  <input
                    id="patient-input-ttv-nadi"
                    type="number"
                    value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value)}
                    placeholder="80"
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#001F3F]"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-sans pointer-events-none">
                    x/mnt
                  </span>
                </div>
              </div>

              {/* Respiratory Rate (RR) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pernafasan (RR)
                </label>
                <div className="relative">
                  <input
                    id="patient-input-ttv-rr"
                    type="number"
                    value={respiratoryRate}
                    onChange={(e) => setRespiratoryRate(e.target.value)}
                    placeholder="20"
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#001F3F]"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-sans pointer-events-none">
                    x/mnt
                  </span>
                </div>
              </div>

              {/* SpO2 */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Saturasi SpO2
                </label>
                <div className="relative">
                  <input
                    id="patient-input-ttv-spo2"
                    type="number"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                    placeholder="98"
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#001F3F]"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-sans pointer-events-none">
                    %
                  </span>
                </div>
              </div>

              {/* Suhu */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Suhu Tubuh
                </label>
                <div className="relative">
                  <input
                    id="patient-input-ttv-suhu"
                    type="number"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    placeholder="36.5"
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#001F3F]"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-sans pointer-events-none">
                    °C
                  </span>
                </div>
              </div>

              {/* Tinggi Badan (TB) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tinggi Badan (TB)
                </label>
                <div className="relative">
                  <input
                    id="patient-input-ttv-tb"
                    type="number"
                    step="0.5"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="175"
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#001F3F]"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-sans pointer-events-none">
                    cm
                  </span>
                </div>
              </div>

              {/* Berat Badan (BB) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Berat Badan (BB)
                </label>
                <div className="relative">
                  <input
                    id="patient-input-ttv-bb"
                    type="number"
                    step="0.5"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="75"
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#001F3F]"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-sans pointer-events-none">
                    kg
                  </span>
                </div>
              </div>

              {/* IMT Auto Box */}
              <div className="flex flex-col justify-end">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  IMT (Indeks Massa Tubuh)
                </label>
                <div className="h-[34px] px-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                    {bmiInfo.bmiFormatted}
                  </span>
                  {bmiInfo.category && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${bmiInfo.badgeBg}`}>
                      {bmiInfo.category}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* IMT Formula & Asian Classification Info Bar */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                <Info className="w-3.5 h-3.5 text-blue-500" />
                <span>Rumus Otomatis: IMT = BB (kg) ÷ (TB (m) × TB (m))</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] pt-1 text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  <span>&lt; 18.5: <strong>BB Kurang</strong></span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>18.5 – 22.9: <strong>Normal / Ideal</strong></span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>23.0 – 24.9: <strong>Overweight</strong></span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span>≥ 25.0: <strong>Obesitas</strong></span>
                </div>
              </div>
            </div>
          </div>


          {/* ============================================================ */}
          {/* SECTION 3: INFORMASI KLINIS, ANAMNESIS & KERANGKA ICF */}
          {/* ============================================================ */}
          <div className="bg-white dark:bg-slate-900/60 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h4 className="text-xs font-bold text-[#001F3F] dark:text-blue-300 uppercase tracking-wider flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                3. Informasi Klinis & Fisioterapi (Kerangka ICF)
              </h4>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                WHO-ICF Standard Assessment
              </span>
            </div>

            {/* Diagnosa Medis/Fisioterapi */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Diagnosa Medis / Diagnosa Fisioterapi
              </label>
              <input
                id="patient-input-diagnosis"
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Contoh: Low Back Pain e.c. HNP L4-L5 / Frozen Shoulder / Post Stroke"
                className="w-full px-3.5 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#001F3F] dark:focus:ring-blue-400"
              />
            </div>

            {/* Keluhan Utama */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Keluhan Utama Pasien
              </label>
              <textarea
                id="patient-input-main-complaint"
                rows={2}
                value={mainComplaint}
                onChange={(e) => setMainComplaint(e.target.value)}
                placeholder="Contoh: Nyeri punggung bawah menjalar ke tungkai kanan, VAS 7/10 saat rukuk/membungkuk..."
                className="w-full px-3.5 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#001F3F] dark:focus:ring-blue-400 resize-none"
              />
            </div>

            {/* Riwayat Penyakit Sekarang (RPS) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Riwayat Penyakit Sekarang (RPS)</span>
                <span className="text-[10px] text-slate-400 font-normal">Kronologi, onset, sifat nyeri, faktor memperberat/meredakan</span>
              </label>
              <textarea
                id="patient-input-current-medical-history"
                rows={2}
                value={currentMedicalHistory}
                onChange={(e) => setCurrentMedicalHistory(e.target.value)}
                placeholder="Contoh: Nyeri dirasakan sejak 3 minggu lalu setelah mengangkat galon air. Nyeri bertambah saat batuk/bersin dan membaik saat berbaring telentang..."
                className="w-full px-3.5 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#001F3F] dark:focus:ring-blue-400 resize-none"
              />
            </div>

            {/* Pemeriksaan Derajat Nyeri (VAS) */}
            <div>
              <VasPainScale
                value={vasScore}
                onChange={(val) => setVasScore(val)}
                label="Pemeriksaan Derajat Nyeri Pasien (VAS - Visual Analog Scale)"
              />
            </div>

            {/* 6 ICF Domains Grid */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  6. ICF (International Classification of Functioning)
                </h5>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* 1. Body Function */}
                <div className="p-3 rounded-lg bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-1">
                  <label className="block text-xs font-bold text-[#001F3F] dark:text-blue-300">
                    1. Body Function (Fungsi Tubuh)
                  </label>
                  <p className="text-[10px] text-slate-400">
                    Nyeri, kekuatan otot (MMT), ROM sendi, tonus, sensibilitas, refleks, postur
                  </p>
                  <textarea
                    id="patient-input-body-function"
                    rows={2}
                    value={bodyFunction}
                    onChange={(e) => setBodyFunction(e.target.value)}
                    placeholder="Contoh: Nyeri gerak fleksi lumbal VAS 6/10, spasme m. erector spinae, MMT ekstensor lumbal 3+/5..."
                    className="w-full px-3 py-1.5 text-xs rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#001F3F] resize-none"
                  />
                </div>

                {/* 2. Body Structure */}
                <div className="p-3 rounded-lg bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-1">
                  <label className="block text-xs font-bold text-[#001F3F] dark:text-blue-300">
                    2. Body Structure (Struktur Tubuh)
                  </label>
                  <p className="text-[10px] text-slate-400">
                    Anatomi struktur tulang, sendi artikular, diskus vertebra, ligamen, saraf, otot
                  </p>
                  <textarea
                    id="patient-input-body-structure"
                    rows={2}
                    value={bodyStructure}
                    onChange={(e) => setBodyStructure(e.target.value)}
                    placeholder="Contoh: Diskus intervertebralis L4-L5, radiks saraf ischiadicus dextra, facet joint lumbal..."
                    className="w-full px-3 py-1.5 text-xs rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#001F3F] resize-none"
                  />
                </div>

                {/* 3. Activity Limitation */}
                <div className="p-3 rounded-lg bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-1">
                  <label className="block text-xs font-bold text-[#001F3F] dark:text-blue-300">
                    3. Activity Limitation (Keterbatasan Aktivitas)
                  </label>
                  <p className="text-[10px] text-slate-400">
                    Keterbatasan berjalan, bangun dari tidur, duduk &gt; 30 mnt, rukuk/sujud, menyisir
                  </p>
                  <textarea
                    id="patient-input-activity-limitation"
                    rows={2}
                    value={activityLimitation}
                    onChange={(e) => setActivityLimitation(e.target.value)}
                    placeholder="Contoh: Sulit berdiri tegak setelah duduk lama, kesulitan saat membungkuk memakai celana/sepatu..."
                    className="w-full px-3 py-1.5 text-xs rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#001F3F] resize-none"
                  />
                </div>

                {/* 4. Participation Restriction */}
                <div className="p-3 rounded-lg bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-1">
                  <label className="block text-xs font-bold text-[#001F3F] dark:text-blue-300">
                    4. Participation Restriction (Restriksi Partisipasi)
                  </label>
                  <p className="text-[10px] text-slate-400">
                    Hambatan dalam bekerja, mengemudi jarak jauh, ibadah berjamaah, hobi/olahraga
                  </p>
                  <textarea
                    id="patient-input-participation-restriction"
                    rows={2}
                    value={participationRestriction}
                    onChange={(e) => setParticipationRestriction(e.target.value)}
                    placeholder="Contoh: Belum bisa kembali bekerja di kantor, tidak bisa bermain bulutangkis, sholat terpaksa duduk..."
                    className="w-full px-3 py-1.5 text-xs rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#001F3F] resize-none"
                  />
                </div>

                {/* 5. Personal Factor */}
                <div className="p-3 rounded-lg bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-1">
                  <label className="block text-xs font-bold text-[#001F3F] dark:text-blue-300">
                    5. Personal Factor (Faktor Personal)
                  </label>
                  <p className="text-[10px] text-slate-400">
                    Kebiasaan gaya hidup sedentari, motivasi sembuh tinggi, riwayat olahraga, usia
                  </p>
                  <textarea
                    id="patient-input-personal-factor"
                    rows={2}
                    value={personalFactor}
                    onChange={(e) => setPersonalFactor(e.target.value)}
                    placeholder="Contoh: Pekerja kantoran duduk > 8 jam/hari, jarang berolahraga, motivasi latihan mandiri tinggi..."
                    className="w-full px-3 py-1.5 text-xs rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#001F3F] resize-none"
                  />
                </div>

                {/* 6. Environmental Factor */}
                <div className="p-3 rounded-lg bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-1">
                  <label className="block text-xs font-bold text-[#001F3F] dark:text-blue-300">
                    6. Environmental Factor (Faktor Lingkungan)
                  </label>
                  <p className="text-[10px] text-slate-400">
                    Kondisi rumah (tangga/toilet jongkok), ergonomi kursi kerja, dukungan keluarga
                  </p>
                  <textarea
                    id="patient-input-environmental-factor"
                    rows={2}
                    value={environmentalFactor}
                    onChange={(e) => setEnvironmentalFactor(e.target.value)}
                    placeholder="Contoh: Kamar tidur di lantai 2 perlu naik 15 anak tangga, kursi kerja tanpa lumbar support..."
                    className="w-full px-3 py-1.5 text-xs rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#001F3F] resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Catatan Tambahan / Riwayat Penyakit Dahulu & Penyerta */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Catatan Tambahan / Riwayat Penyakit Dahulu & Penyerta (Opsional)
              </label>
              <input
                id="patient-input-additional-notes"
                type="text"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Contoh: Riwayat hipertensi terkontrol, tidak ada riwayat patah tulang, alergi plester..."
                className="w-full px-3.5 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#001F3F] dark:focus:ring-blue-400"
              />
            </div>
          </div>


          {/* ============================================================ */}
          {/* SECTION 4: DATA PENUNJANG (LINK GOOGLE DRIVE, KETERANGAN & CATATAN) */}
          {/* ============================================================ */}
          <div className="bg-white dark:bg-slate-900/60 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h4 className="text-xs font-bold text-[#001F3F] dark:text-blue-300 uppercase tracking-wider flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                4. Data Penunjang (Link Google Drive)
              </h4>
              <span className="text-[10px] text-slate-500 font-mono">
                {supportingDocs.length} Link Tersimpan
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Tambahkan tautan/link berkas dari <strong>Google Drive</strong> (seperti foto Rontgen X-Ray, hasil MRI, CT-Scan, USG, atau PDF hasil lab). Berkas dapat diakses langsung tanpa membebani penyimpanan perangkat.
            </p>

            {/* Google Drive Link Input Box */}
            <div className="p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                <LinkIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Input Link Google Drive Baru</span>
              </div>

              {/* URL Input */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  URL / Link Google Drive <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <HardDrive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <input
                    type="url"
                    value={newDocUrl}
                    onChange={(e) => setNewDocUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/... atau https://drive.google.com/drive/folders/..."
                    className="w-full pl-9 pr-3.5 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Title Input */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Keterangan / Judul Dokumen
                  </label>
                  <input
                    type="text"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    placeholder="Contoh: Hasil MRI Lumbal L4-L5, Rontgen Bahu Kiri"
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Notes Input */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Catatan / Hasil Ekspertise Dokter (Opsional)
                  </label>
                  <input
                    type="text"
                    value={newDocNotes}
                    onChange={(e) => setNewDocNotes(e.target.value)}
                    placeholder="Contoh: Tampak penyempitan diskus intervertebralis L4-L5"
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Add Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddGoogleDriveDoc}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Link Google Drive
                </button>
              </div>
            </div>

            {/* List of Added Google Drive Links */}
            {supportingDocs.length > 0 ? (
              <div className="space-y-2.5 pt-2">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Daftar Berkas Google Drive ({supportingDocs.length}):
                </span>

                {supportingDocs.map((doc, idx) => (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/80 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800 mt-0.5">
                          <HardDrive className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-mono text-slate-400">
                            Berkas #{idx + 1}
                          </span>
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {doc.title || 'Dokumen Google Drive'}
                          </h5>
                          
                          {/* Clickable Drive Link */}
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline mt-0.5 truncate max-w-full font-mono"
                          >
                            <span className="truncate">{doc.url}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveDoc(doc.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0"
                        title="Hapus Link Ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Inline edit inputs for Title & Notes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-xs">
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                          Edit Keterangan / Judul
                        </label>
                        <input
                          type="text"
                          value={doc.title}
                          onChange={(e) => handleUpdateDocTitle(doc.id, e.target.value)}
                          placeholder="Judul / Keterangan Dokumen"
                          className="w-full px-2.5 py-1 text-xs rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                          Edit Catatan / Hasil Ekspertise
                        </label>
                        <input
                          type="text"
                          value={doc.notes || ''}
                          onChange={(e) => handleUpdateDocNotes(doc.id, e.target.value)}
                          placeholder="Catatan / Ekspertise Dokter"
                          className="w-full px-2.5 py-1 text-xs rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                Belum ada tautan Google Drive yang ditambahkan. Gunakan formulir di atas untuk menambahkan link berkas Rontgen / MRI / Lab.
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={closePatientModal}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              id="patient-btn-submit"
              className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-[#001F3F] dark:bg-blue-600 hover:bg-[#001730] dark:hover:bg-blue-700 rounded-lg transition-all shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Daftarkan Pasien'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
