import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Calendar,
  MapPin,
  Stethoscope,
  Activity,
  DollarSign,
  FileText,
  User,
  Plus,
  Check,
  Search,
  Sparkles,
  Info
} from 'lucide-react';
import { TherapyVisit, Patient, TherapyLocation, PaymentStatus, SoapNote, PaymentRecord } from '../types';
import { getTodayDateString, formatRupiah } from '../utils/formatters';
import { dbService } from '../services/db';

const STANDARD_INTERVENTIONS = [
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
];

export const AddEditVisitModal: React.FC = () => {
  const {
    isVisitModalOpen,
    closeVisitModal,
    editingVisit,
    preselectedPatientForVisit,
    patients,
    settings,
    refreshData,
    showToast,
    viewPatientProfile,
  } = useApp();

  const isEdit = !!editingVisit;

  // Selected patient state
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // Visit Info State
  const [visitDate, setVisitDate] = useState(getTodayDateString());
  const [visitNumber, setVisitNumber] = useState<number>(1);
  const [location, setLocation] = useState<TherapyLocation>('Home Care');
  const [therapist, setTherapist] = useState<string>(settings.defaultTherapist || 'Bintang');
  const [customTherapist, setCustomTherapist] = useState('');

  // Interventions State
  const [selectedInterventions, setSelectedInterventions] = useState<string[]>(['IR', 'TENS', 'Stretching']);
  const [customInterventionInput, setCustomInterventionInput] = useState('');
  const [customInterventionsList, setCustomInterventionsList] = useState<string[]>([]);

  // SOAP State
  const [soap, setSoap] = useState<SoapNote>({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
  });

  // Payment State
  const [therapyPrice, setTherapyPrice] = useState<number>(200000);
  const [transport, setTransport] = useState<number>(35000);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Lunas');
  const [paidAmount, setPaidAmount] = useState<number>(235000);
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate Total & Remaining automatically
  const totalAmount = useMemo(() => {
    if (paymentStatus === 'Gratis') return 0;
    const t = Math.max(0, (therapyPrice || 0) + (transport || 0) - (discount || 0));
    return t;
  }, [therapyPrice, transport, discount, paymentStatus]);

  const remainingBalance = useMemo(() => {
    if (paymentStatus === 'Lunas' || paymentStatus === 'Gratis') return 0;
    if (paymentStatus === 'Belum Lunas') return totalAmount;
    // For DP
    return Math.max(0, totalAmount - (paidAmount || 0));
  }, [totalAmount, paidAmount, paymentStatus]);

  // Initial load / reset
  useEffect(() => {
    if (editingVisit) {
      const p = patients.find((pat) => pat.id === editingVisit.patientId) || null;
      setSelectedPatient(p);
      setVisitDate(editingVisit.date);
      setVisitNumber(editingVisit.visitNumber);
      setLocation(editingVisit.location);
      setTherapist(editingVisit.therapist);
      setSelectedInterventions(editingVisit.interventions || []);
      setCustomInterventionsList(editingVisit.customInterventions || []);
      setSoap(editingVisit.soap || { subjective: '', objective: '', assessment: '', plan: '' });
      setTherapyPrice(editingVisit.payment.therapyPrice || 0);
      setTransport(editingVisit.payment.transport || 0);
      setDiscount(editingVisit.payment.discount || 0);
      setPaymentStatus(editingVisit.payment.status || 'Lunas');
      setPaidAmount(editingVisit.payment.paidAmount || 0);
      setPaymentNotes(editingVisit.payment.notes || '');
    } else {
      const p = preselectedPatientForVisit || (patients.length > 0 ? patients[0] : null);
      setSelectedPatient(p);
      setVisitDate(getTodayDateString());
      setLocation('Home Care');
      setTherapist(settings.defaultTherapist || 'Bintang');
      setSelectedInterventions(['IR', 'TENS', 'Massage', 'Stretching']);
      setCustomInterventionsList([]);
      setSoap({
        subjective: p ? `Keluhan utama: ${p.mainComplaint || p.diagnosis}` : '',
        objective: '',
        assessment: p ? `Diagnosa: ${p.diagnosis}` : '',
        plan: 'IR 15 mnt, TENS 15 mnt, gentle stretching, edukasi home exercise.',
      });

      const defPrice = settings.defaultPricing?.therapyPriceHomeCare ?? 200000;
      const defTrans = settings.defaultPricing?.defaultTransport ?? 35000;
      setTherapyPrice(defPrice);
      setTransport(defTrans);
      setDiscount(0);
      setPaymentStatus('Lunas');
      setPaidAmount(defPrice + defTrans);
      setPaymentNotes('');
    }
  }, [editingVisit, preselectedPatientForVisit, isVisitModalOpen, settings, patients]);

  // Update visit number when patient or date changes
  useEffect(() => {
    if (selectedPatient && visitDate && !isEdit) {
      dbService.calculateNextVisitNumber(selectedPatient.id, visitDate).then((nextNum) => {
        setVisitNumber(nextNum);
      });
    }
  }, [selectedPatient, visitDate, isEdit]);

  // Update pricing when location changes (only for new visits)
  const handleLocationChange = (newLoc: TherapyLocation) => {
    setLocation(newLoc);
    if (!isEdit) {
      if (newLoc === 'Home Care') {
        const p = settings.defaultPricing?.therapyPriceHomeCare ?? 200000;
        const t = settings.defaultPricing?.defaultTransport ?? 35000;
        setTherapyPrice(p);
        setTransport(t);
        if (paymentStatus === 'Lunas') {
          setPaidAmount(p + t - discount);
        }
      } else {
        const p = settings.defaultPricing?.therapyPriceClinic ?? 150000;
        setTherapyPrice(p);
        setTransport(0);
        if (paymentStatus === 'Lunas') {
          setPaidAmount(p - discount);
        }
      }
    }
  };

  // Toggle intervention checkbox
  const toggleIntervention = (item: string) => {
    if (selectedInterventions.includes(item)) {
      setSelectedInterventions(selectedInterventions.filter((i) => i !== item));
    } else {
      setSelectedInterventions([...selectedInterventions, item]);
    }
  };

  // Add custom intervention
  const handleAddCustomIntervention = () => {
    if (!customInterventionInput.trim()) return;
    const clean = customInterventionInput.trim();
    if (!customInterventionsList.includes(clean) && !selectedInterventions.includes(clean)) {
      setCustomInterventionsList([...customInterventionsList, clean]);
      setSelectedInterventions([...selectedInterventions, clean]);
    }
    setCustomInterventionInput('');
  };

  // Search filtered patients for dropdown
  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return patients.slice(0, 5);
    const q = patientSearch.toLowerCase();
    return patients.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.mrn.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.diagnosis.toLowerCase().includes(q)
    );
  }, [patients, patientSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatient) {
      showToast('warning', 'Pilih pasien terlebih dahulu.', 'Validasi Gagal');
      return;
    }

    setIsSubmitting(true);

    try {
      const finalPayment: PaymentRecord = {
        therapyPrice: therapyPrice || 0,
        transport: transport || 0,
        discount: discount || 0,
        total: totalAmount,
        status: paymentStatus,
        paidAmount: paymentStatus === 'Lunas' ? totalAmount : paymentStatus === 'Gratis' ? 0 : paidAmount || 0,
        remainingBalance: remainingBalance,
        notes: paymentNotes.trim(),
      };

      const finalTherapistName = therapist === 'Lainnya' ? customTherapist.trim() || 'Bintang' : therapist;

      const visitData: TherapyVisit = {
        id: editingVisit?.id || '',
        patientId: selectedPatient.id,
        patientName: selectedPatient.fullName,
        mrn: selectedPatient.mrn,
        visitNumber: visitNumber || 1,
        date: visitDate,
        location,
        therapist: finalTherapistName,
        interventions: selectedInterventions,
        customInterventions: customInterventionsList,
        soap,
        payment: finalPayment,
        createdAt: editingVisit?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await dbService.saveVisit(visitData);
      await refreshData();

      showToast(
        'success',
        `Catatan sesi Kunjungan ke-${visitData.visitNumber} untuk ${selectedPatient.fullName} berhasil disimpan.`,
        isEdit ? 'Kunjungan Diperbarui' : 'Kunjungan Tersimpan'
      );

      closeVisitModal();
      viewPatientProfile(selectedPatient.id);
    } catch {
      showToast('error', 'Gagal menyimpan catatan kunjungan terapi.', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVisitModalOpen) return null;

  const allAvailableInterventions = Array.from(
    new Set([...STANDARD_INTERVENTIONS, ...(settings.availableInterventions || []), ...customInterventionsList])
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="add-edit-visit-modal"
        className="w-full max-w-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0B132B]/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {isEdit ? `Edit Sesi Terapi - Kunjungan ke-${visitNumber}` : 'Catat Kunjungan Terapi Baru'}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold font-mono">
                  Kunjungan ke-{visitNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dokumentasi tindakan medis fisioterapi, catatan SOAP, dan administrasi biaya
              </p>
            </div>
          </div>
          <button
            onClick={closeVisitModal}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
          {/* Section 1: Data Pasien Selection */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              1. Data Pasien
            </h4>

            {selectedPatient ? (
              <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {selectedPatient.fullName}
                    </span>
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                      {selectedPatient.mrn}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    <strong>Diagnosa:</strong> {selectedPatient.diagnosis || 'Tanpa diagnosa'} • {selectedPatient.phone}
                  </p>
                </div>

                {!isEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPatient(null);
                      setShowPatientDropdown(true);
                    }}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline px-2 py-1"
                  >
                    Ganti Pasien
                  </button>
                )}
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setShowPatientDropdown(true);
                    }}
                    onFocus={() => setShowPatientDropdown(true)}
                    placeholder="Ketik untuk mencari pasien berdasarkan Nama / No. RM / Telepon..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {showPatientDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-[#0F172A] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-40 max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredPatients.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPatient(p);
                          setShowPatientDropdown(false);
                          setPatientSearch('');
                        }}
                        className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-slate-900 dark:text-white">
                            {p.fullName}
                          </span>
                          <span className="text-xs font-mono font-medium text-blue-600 dark:text-blue-400">
                            {p.mrn}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{p.diagnosis}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Informasi Terapi (Date, Location, Therapist, Visit No) */}
          <div className="pt-2">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              2. Informasi Kunjungan
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Tanggal Terapi (Date Picker - not restricted) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Terapi <span className="text-rose-500">*</span>
                </label>
                <input
                  id="visit-input-date"
                  type="date"
                  required
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Lokasi Terapi (Home Care / Klinik) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lokasi Terapi
                </label>
                <select
                  id="visit-input-location"
                  value={location}
                  onChange={(e) => handleLocationChange(e.target.value as TherapyLocation)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="Home Care">Home Care</option>
                  <option value="Klinik">Klinik</option>
                </select>
              </div>

              {/* Fisioterapis */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Fisioterapis
                </label>
                <select
                  id="visit-input-therapist"
                  value={therapist}
                  onChange={(e) => setTherapist(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {(settings.therapists || ['Bintang']).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  <option value="Lainnya">+ Terapis Lainnya</option>
                </select>
              </div>

              {/* Nomor Kunjungan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kunjungan Ke-
                </label>
                <input
                  id="visit-input-number"
                  type="number"
                  min="1"
                  value={visitNumber}
                  onChange={(e) => setVisitNumber(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 text-sm font-semibold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {therapist === 'Lainnya' && (
                <div className="sm:col-span-2 lg:col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Terapis Tambahan
                  </label>
                  <input
                    type="text"
                    value={customTherapist}
                    onChange={(e) => setCustomTherapist(e.target.value)}
                    placeholder="Masukkan nama fisioterapis..."
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Intervensi Fisioterapi (Multi-select Checkboxes) */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                3. Intervensi Fisioterapi
              </h4>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                {selectedInterventions.length} dipilih
              </span>
            </div>

            {/* Checkboxes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {allAvailableInterventions.map((inv) => {
                const isSelected = selectedInterventions.includes(inv);
                return (
                  <button
                    type="button"
                    key={inv}
                    onClick={() => toggleIntervention(inv)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border text-left transition-all ${
                      isSelected
                        ? 'bg-[#0B132B] dark:bg-blue-600 text-white border-transparent shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : 'border border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="truncate">{inv}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Intervention Input */}
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={customInterventionInput}
                onChange={(e) => setCustomInterventionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomIntervention();
                  }
                }}
                placeholder="+ Tambah Intervensi Lainnya..."
                className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddCustomIntervention}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                + Tambah
              </button>
            </div>
          </div>

          {/* Section 4: SOAP Documentation */}
          <div className="pt-2 space-y-3">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              4. Catatan SOAP Rekam Medis
            </h4>

            {/* S - Subjective */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-blue-600 text-white flex items-center justify-center text-[10px]">
                    S
                  </span>
                  Subjective (Keluhan & Riwayat Pasien)
                </label>
              </div>
              <textarea
                id="soap-subjective"
                rows={2}
                value={soap.subjective}
                onChange={(e) => setSoap({ ...soap, subjective: e.target.value })}
                placeholder="Contoh: Pasien mengeluh nyeri punggung bawah menjalar ke tungkai kanan, VAS 6/10..."
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* O - Objective */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                    O
                  </span>
                  Objective (Pemeriksaan Fisik, ROM, MMT, Tes Spesifik)
                </label>
              </div>
              <textarea
                id="soap-objective"
                rows={2}
                value={soap.objective}
                onChange={(e) => setSoap({ ...soap, objective: e.target.value })}
                placeholder="Contoh: SLR (+) 45°, Spasme m. erector spinae, ROM fleksi lumbal terbatas..."
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* A - Assessment */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-purple-600 text-white flex items-center justify-center text-[10px]">
                    A
                  </span>
                  Assessment (Diagnosa & Problematika Fisioterapi)
                </label>
              </div>
              <textarea
                id="soap-assessment"
                rows={2}
                value={soap.assessment}
                onChange={(e) => setSoap({ ...soap, assessment: e.target.value })}
                placeholder="Contoh: Impairment nyeri dan keterbatasan gerak lumbal e.c. HNP L4-L5 radikulopati..."
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* P - Plan */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                    P
                  </span>
                  Plan (Rencana Tindakan, Frekuensi, Edukasi Home Exercise)
                </label>
              </div>
              <textarea
                id="soap-plan"
                rows={2}
                value={soap.plan}
                onChange={(e) => setSoap({ ...soap, plan: e.target.value })}
                placeholder="Contoh: IR lumbal 15 mnt, TENS 15 mnt, piriformis stretching, pelvic tilt, edukasi postur..."
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Section 5: Pembayaran (Dynamic Calculation) */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              5. Pembayaran & Administrasi Biaya
            </h4>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Harga Terapi */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tarif Tindakan Terapi (Rp)
                  </label>
                  <input
                    id="payment-input-price"
                    type="number"
                    min="0"
                    step="5000"
                    value={therapyPrice || ''}
                    onChange={(e) => setTherapyPrice(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-medium"
                  />
                </div>

                {/* Transport */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Biaya Transport (Rp)
                  </label>
                  <input
                    id="payment-input-transport"
                    type="number"
                    min="0"
                    step="5000"
                    value={transport || ''}
                    onChange={(e) => setTransport(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-medium"
                  />
                </div>

                {/* Diskon */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Potongan / Diskon (Rp)
                  </label>
                  <input
                    id="payment-input-discount"
                    type="number"
                    min="0"
                    step="5000"
                    value={discount || ''}
                    onChange={(e) => setDiscount(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-medium"
                  />
                </div>
              </div>

              {/* Total Otomatis & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-2 border-t border-slate-200 dark:border-slate-700/60">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5">
                    Total Otomatis (Tarif + Transport - Diskon)
                  </span>
                  <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                    {formatRupiah(totalAmount)}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status Pembayaran
                  </label>
                  <select
                    id="payment-input-status"
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                    className="w-full px-3 py-2 text-sm font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Lunas">Lunas</option>
                    <option value="Belum Lunas">Belum Lunas</option>
                    <option value="DP">DP (Uang Muka / Parsial)</option>
                    <option value="Gratis">Gratis (Free Sesi)</option>
                  </select>
                </div>
              </div>

              {/* Conditional for DP (Down Payment) */}
              {paymentStatus === 'DP' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60">
                  <div>
                    <label className="block text-xs font-semibold text-amber-900 dark:text-amber-200 mb-1">
                      Jumlah Dibayar (DP) (Rp)
                    </label>
                    <input
                      id="payment-input-paid-amount"
                      type="number"
                      min="0"
                      max={totalAmount}
                      value={paidAmount || ''}
                      onChange={(e) => setPaidAmount(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-800 text-slate-900 dark:text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-amber-900 dark:text-amber-200 mb-1">
                      Sisa Pembayaran (Otomatis)
                    </span>
                    <div className="text-base font-bold text-rose-600 dark:text-rose-400 py-1.5">
                      {formatRupiah(remainingBalance)}
                    </div>
                  </div>
                </div>
              )}

              {/* Catatan Pembayaran */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Pembayaran (Metode transfer, bank, cash, dll.)
                </label>
                <input
                  id="payment-input-notes"
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Contoh: Transfer BCA an. Bambang, Tunai di tempat, QRIS"
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              onClick={closeVisitModal}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              id="visit-btn-submit"
              className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-[#0B132B] dark:bg-blue-600 hover:bg-[#1C2541] dark:hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-slate-950/20 disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan Sesi' : 'Simpan Kunjungan Terapi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
