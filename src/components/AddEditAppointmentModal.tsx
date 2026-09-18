import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { dbService } from '../services/db';
import { Appointment, AppointmentStatus, TherapyLocation } from '../types';
import { getTodayDateString } from '../utils/formatters';
import {
  X,
  Calendar,
  Clock,
  User,
  Home,
  Building2,
  Stethoscope,
  FileText,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  Search,
} from 'lucide-react';

// Time slots from 06:00 to 21:00
export const AVAILABLE_TIME_SLOTS = [
  '06:00', '06:30',
  '07:00', '07:30',
  '08:00', '08:30',
  '09:00', '09:30',
  '10:00', '10:30',
  '11:00', '11:30',
  '12:00', '12:30',
  '13:00', '13:30',
  '14:00', '14:30',
  '15:00', '15:30',
  '16:00', '16:30',
  '17:00', '17:30',
  '18:00', '18:30',
  '19:00', '19:30',
  '20:00', '20:30',
  '21:00'
];

export const HOURLY_TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00'
];

const COMMON_SERVICES = [
  'Fisioterapi Stroke & Neurologi',
  'Fisioterapi Nyeri Punggung Bawah (LBP)',
  'Fisioterapi Frozen Shoulder',
  'Fisioterapi Osteoarthritis Lutut (OA Knee)',
  'Fisioterapi Pasca Operasi / Fraktur',
  'Fisioterapi Cervical Root Syndrome (CRS)',
  'Latihan Mobilisasi & Penguatan',
  'Rehabilitasi Geriatri / Lansia'
];

export const AddEditAppointmentModal: React.FC = () => {
  const {
    isAppointmentModalOpen,
    editingAppointment,
    preselectedDateForAppointment,
    preselectedTimeForAppointment,
    preselectedPatientIdForAppointment,
    closeAppointmentModal,
    openAddPatientModal,
    saveAppointment,
    patients,
    appointments,
    settings,
    refreshData,
    showToast,
  } = useApp();

  const [patientId, setPatientId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [time, setTime] = useState('08:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [location, setLocation] = useState<TherapyLocation>('Klinik');
  const [therapist, setTherapist] = useState('Bintang');
  const [status, setStatus] = useState<AppointmentStatus>('Dijadwalkan');
  const [complaintOrService, setComplaintOrService] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync form when modal opens or edit target changes
  useEffect(() => {
    if (!isAppointmentModalOpen) return;

    if (editingAppointment) {
      setPatientId(editingAppointment.patientId);
      setDate(editingAppointment.date);
      setTime(editingAppointment.time);
      setDurationMinutes(editingAppointment.durationMinutes || 60);
      setLocation(editingAppointment.location);
      setTherapist(editingAppointment.therapist || settings.defaultTherapist || 'Bintang');
      setStatus(editingAppointment.status);
      setComplaintOrService(editingAppointment.complaintOrService || '');
      setNotes(editingAppointment.notes || '');
      setPatientSearch('');
    } else {
      // New appointment
      const initialDate = preselectedDateForAppointment || getTodayDateString();
      const initialTime = preselectedTimeForAppointment || '08:00';
      const initialPatientId = preselectedPatientIdForAppointment || (patients.length > 0 ? patients[0].id : '');

      setDate(initialDate);
      setTime(initialTime);
      setDurationMinutes(60);
      setPatientId(initialPatientId);
      setTherapist(settings.defaultTherapist || 'Bintang');
      setStatus('Dijadwalkan');
      setPatientSearch('');

      // If preselected patient exists, fill diagnosis / complaint
      if (initialPatientId) {
        const found = patients.find((p) => p.id === initialPatientId);
        if (found) {
          setComplaintOrService(found.mainComplaint || found.diagnosis || '');
          if (found.lastLocation) setLocation(found.lastLocation);
          if (found.lastTherapist) setTherapist(found.lastTherapist);
        }
      } else {
        setLocation('Klinik');
        setComplaintOrService('');
      }
      setNotes('');
    }
  }, [
    isAppointmentModalOpen,
    editingAppointment,
    preselectedDateForAppointment,
    preselectedTimeForAppointment,
    preselectedPatientIdForAppointment,
    patients,
    settings,
  ]);

  // Selected patient object
  const selectedPatient = useMemo(() => {
    return patients.find((p) => p.id === patientId) || null;
  }, [patients, patientId]);

  // Filtered patients for searchable select
  const filteredPatients = useMemo(() => {
    const validPatients = patients.filter((p) => p && (p.fullName?.trim() || p.mrn?.trim()));
    if (!patientSearch.trim()) return validPatients;
    const q = patientSearch.toLowerCase();
    return validPatients.filter(
      (p) =>
        (p.fullName || '').toLowerCase().includes(q) ||
        (p.mrn || '').toLowerCase().includes(q) ||
        (p.phone || '').includes(q)
    );
  }, [patients, patientSearch]);

  // Check which slots are already booked on the selected date
  const bookedTimesOnDate = useMemo(() => {
    return appointments
      .filter((a) => a.date === date && a.status !== 'Batal' && (!editingAppointment || a.id !== editingAppointment.id))
      .map((a) => ({ time: a.time, patientName: a.patientName, therapist: a.therapist }));
  }, [appointments, date, editingAppointment]);

  // Compute calculated end time
  const calculatedEndTime = useMemo(() => {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '';
    const totalMin = h * 60 + m + durationMinutes;
    const endH = Math.floor(totalMin / 60);
    const endM = totalMin % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  }, [time, durationMinutes]);

  if (!isAppointmentModalOpen) return null;

  const handlePatientChange = (newPatientId: string) => {
    setPatientId(newPatientId);
    const found = patients.find((p) => p.id === newPatientId);
    if (found) {
      if (!complaintOrService) {
        setComplaintOrService(found.mainComplaint || found.diagnosis || '');
      }
      if (found.lastLocation) {
        setLocation(found.lastLocation);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientId || !selectedPatient) {
      showToast('warning', 'Silakan pilih pasien yang sudah terdaftar terlebih dahulu.', 'Pasien Belum Dipilih');
      return;
    }

    if (!date) {
      showToast('warning', 'Silakan pilih tanggal jadwal.', 'Tanggal Wajib');
      return;
    }

    if (!time) {
      showToast('warning', 'Silakan pilih jam jadwal antara 06:00 - 21:00.', 'Jam Wajib');
      return;
    }

    setIsSubmitting(true);
    try {
      const apptData: Partial<Appointment> & {
        patientId: string;
        patientName: string;
        mrn: string;
        date: string;
        time: string;
      } = {
        id: editingAppointment ? editingAppointment.id : undefined,
        patientId: selectedPatient.id,
        patientName: selectedPatient.fullName,
        mrn: selectedPatient.mrn,
        patientPhone: selectedPatient.phone || '',
        date,
        time,
        endTime: calculatedEndTime,
        durationMinutes,
        location,
        therapist,
        status,
        complaintOrService: complaintOrService.trim(),
        notes: notes.trim(),
        createdAt: editingAppointment ? editingAppointment.createdAt : new Date().toISOString(),
      };

      await saveAppointment(apptData);
      showToast(
        'success',
        `Jadwal pasien ${selectedPatient.fullName} (${date} pukul ${time}) berhasil disimpan & disinkronkan ke database.`,
        editingAppointment ? 'Jadwal Diperbarui' : 'Jadwal Ditambahkan'
      );
      closeAppointmentModal();
    } catch (err) {
      console.error('Save appointment error:', err);
      showToast('error', 'Gagal menyimpan jadwal pasien.', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0C1425] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#070D18]/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingAppointment ? 'Edit Jadwal Pasien' : 'Penjadwalan Pasien Baru'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Atur jadwal sesi fisioterapi pasien (jam 06:00 s/d 21:00)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeAppointmentModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Patient Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-500" />
                Pilih Nama Pasien Terdaftar <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  closeAppointmentModal();
                  openAddPatientModal();
                }}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                + Daftarkan Pasien Baru
              </button>
            </div>

            {patients.length === 0 ? (
              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-300">
                    Belum ada pasien yang terdaftar di sistem.
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400/90 mt-0.5">
                    Silakan daftarkan pasien terlebih dahulu untuk dapat memilih nama pasien pada jadwal terapi.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      closeAppointmentModal();
                      openAddPatientModal();
                    }}
                    className="mt-2.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors inline-flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Daftarkan Pasien Sekarang
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Search / Filter for patients */}
                {patients.length > 5 && (
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari pasien berdasarkan nama, No. RM, atau nomor telepon..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                )}

                {/* Patient Dropdown / Radio list */}
                <select
                  id="appointment-patient-select"
                  value={patientId}
                  onChange={(e) => handlePatientChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                >
                  <option value="">-- Pilih Pasien Terdaftar ({filteredPatients.length} Pasien) --</option>
                  {filteredPatients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.mrn} - {p.fullName} ({p.gender === 'L' ? 'Laki-laki' : 'Perempuan'}, {p.age} th) {p.diagnosis ? `• ${p.diagnosis}` : ''}
                    </option>
                  ))}
                </select>

                {/* Selected patient info preview */}
                {selectedPatient && (
                  <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{selectedPatient.fullName}</span>
                        <span className="font-mono text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold">
                          {selectedPatient.mrn}
                        </span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400">
                        {selectedPatient.phone ? `HP: ${selectedPatient.phone}` : 'No HP belum diisi'} • {selectedPatient.address || 'Alamat -'}
                      </p>
                      {selectedPatient.diagnosis && (
                        <p className="text-blue-700 dark:text-blue-300 font-medium">
                          Diagnosa: {selectedPatient.diagnosis}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Date & Time (06:00 - 21:00) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tanggal */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Tanggal Jadwal <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
            </div>

            {/* Jam Tersedia (06:00 s/d 21:00) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Jam Mulai (06:00 - 21:00) <span className="text-rose-500">*</span></span>
                {calculatedEndTime && (
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                    Selesai: {calculatedEndTime}
                  </span>
                )}
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                  required
                >
                  {AVAILABLE_TIME_SLOTS.map((slot) => {
                    const booked = bookedTimesOnDate.find((b) => b.time === slot);
                    return (
                      <option key={slot} value={slot}>
                        {slot} {booked ? `(Terisi: ${booked.patientName})` : '(Tersedia)'}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Conflict warning if booked */}
              {bookedTimesOnDate.some((b) => b.time === time) && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Jam {time} sudah ada jadwal lain ({bookedTimesOnDate.find((b) => b.time === time)?.patientName}). Pastikan tidak bertabrakan.
                </p>
              )}
            </div>
          </div>

          {/* Quick Hourly Chips from 06:00 to 21:00 */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Pilihan Cepat Jam Tersedia (06:00 - 21:00):
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/50">
              {HOURLY_TIME_SLOTS.map((slot) => {
                const isSelected = time === slot;
                const isBooked = bookedTimesOnDate.some((b) => b.time === slot);
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setTime(slot)}
                    className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isBooked
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-blue-400'
                    }`}
                  >
                    {slot}
                    {isBooked && ' •'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration, Location, Therapist */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Duration */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Durasi Sesi
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value={30}>30 Menit</option>
                <option value={45}>45 Menit</option>
                <option value={60}>60 Menit (1 Jam)</option>
                <option value={90}>90 Menit (1.5 Jam)</option>
                <option value={120}>120 Menit (2 Jam)</option>
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Lokasi Terapi
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setLocation('Klinik')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    location === 'Klinik'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Klinik
                </button>
                <button
                  type="button"
                  onClick={() => setLocation('Home Care')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    location === 'Home Care'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Home className="w-3.5 h-3.5" />
                  Home Care
                </button>
              </div>
            </div>

            {/* Therapist */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Fisioterapis
              </label>
              <select
                value={therapist}
                onChange={(e) => setTherapist(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {settings.therapists.map((t) => (
                  <option key={t} value={t}>
                    Ftr. {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Jadwal */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Status Jadwal
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['Dijadwalkan', 'Terkonfirmasi', 'Selesai', 'Batal'] as AppointmentStatus[]).map((st) => {
                const isSelected = status === st;
                let colorClasses = '';
                if (st === 'Dijadwalkan') {
                  colorClasses = isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900';
                } else if (st === 'Terkonfirmasi') {
                  colorClasses = isSelected
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900';
                } else if (st === 'Selesai') {
                  colorClasses = isSelected
                    ? 'bg-slate-700 dark:bg-slate-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
                } else {
                  colorClasses = isSelected
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900';
                }

                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatus(st)}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all active:scale-95 ${colorClasses}`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Layanan / Keluhan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-blue-500" />
              Layanan Fisioterapi / Keluhan
            </label>
            <input
              type="text"
              value={complaintOrService}
              onChange={(e) => setComplaintOrService(e.target.value)}
              placeholder="Contoh: Fisioterapi Stroke, Nyeri Punggung Bawah (LBP), Frozen Shoulder..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {/* Suggestion Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {COMMON_SERVICES.slice(0, 4).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setComplaintOrService(s)}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/40 dark:hover:text-blue-300 transition-colors"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>

          {/* Catatan Tambahan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Catatan Khusus (Alamat, Permintaan Keluarga, Peralatan yg Dibawa)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan tambahan seperti patokan rumah, permintaan keluarga, atau alat yang harus dipersiapkan..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeAppointmentModal}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || patients.length === 0}
              className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Menyimpan...' : editingAppointment ? 'Simpan Perubahan Jadwal' : 'Jadwalkan Pasien'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
