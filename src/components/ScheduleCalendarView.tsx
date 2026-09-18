import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Appointment, AppointmentStatus, TherapyLocation } from '../types';
import {
  formatDayDate,
  formatDateIndonesian,
  getTodayDateString,
  INDONESIAN_DAYS,
  INDONESIAN_MONTHS,
} from '../utils/formatters';
import { HOURLY_TIME_SLOTS } from './AddEditAppointmentModal';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  User,
  Home,
  Building2,
  Phone,
  CheckCircle2,
  Clock4,
  XCircle,
  AlertCircle,
  Edit2,
  Trash2,
  ExternalLink,
  MessageCircle,
  FileText,
  Filter,
  UserPlus,
  Search,
} from 'lucide-react';

export const ScheduleCalendarView: React.FC = () => {
  const {
    appointments,
    patients,
    settings,
    openAddAppointmentModal,
    openEditAppointmentModal,
    deleteAppointment,
    updateAppointmentStatus,
    openAddVisitModal,
    viewPatientProfile,
    openAddPatientModal,
  } = useApp();

  const todayStr = getTodayDateString();
  const today = new Date();

  // Calendar navigation state
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0 - 11
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Filters
  const [filterTherapist, setFilterTherapist] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active view tab: 'calendar' (Calendar + Day Timeline) vs 'all-list' (List View)
  const [activeTab, setActiveTab] = useState<'calendar' | 'all-list'>('calendar');

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    const d = new Date();
    setCurrentYear(d.getFullYear());
    setCurrentMonth(d.getMonth());
    setSelectedDate(todayStr);
  };

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      if (filterTherapist !== 'all' && appt.therapist !== filterTherapist) return false;
      if (filterLocation !== 'all' && appt.location !== filterLocation) return false;
      if (filterStatus !== 'all' && appt.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = appt.patientName.toLowerCase().includes(q);
        const matchMrn = appt.mrn.toLowerCase().includes(q);
        const matchService = (appt.complaintOrService || '').toLowerCase().includes(q);
        if (!matchName && !matchMrn && !matchService) return false;
      }
      return true;
    });
  }, [appointments, filterTherapist, filterLocation, filterStatus, searchQuery]);

  // Appointments grouped by date for fast calendar lookup
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const appt of filteredAppointments) {
      const existing = map.get(appt.date) || [];
      existing.push(appt);
      // sort by time
      existing.sort((a, b) => a.time.localeCompare(b.time));
      map.set(appt.date, existing);
    }
    return map;
  }, [filteredAppointments]);

  // Appointments for the currently selected date
  const appointmentsOnSelectedDate = useMemo(() => {
    const list = appointmentsByDate.get(selectedDate) || [];
    return [...list].sort((a, b) => a.time.localeCompare(b.time));
  }, [appointmentsByDate, selectedDate]);

  // Calendar grid calculations
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // In JS: 0 is Sunday, 1 is Monday ... 6 is Saturday
    // We want Monday as day 0 in our grid
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday becomes index 6

    const daysInMonth = lastDayOfMonth.getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: {
      dateString: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      appointments: Appointment[];
    }[] = [];

    // Previous month filler days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dNum = daysInPrevMonth - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
      days.push({
        dateString: dStr,
        dayNumber: dNum,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDate,
        appointments: appointmentsByDate.get(dStr) || [],
      });
    }

    // Current month days
    for (let dNum = 1; dNum <= daysInMonth; dNum++) {
      const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
      days.push({
        dateString: dStr,
        dayNumber: dNum,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDate,
        appointments: appointmentsByDate.get(dStr) || [],
      });
    }

    // Next month filler days to complete grid (multiples of 7)
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let dNum = 1; dNum <= remaining; dNum++) {
        const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
        const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
        const dStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
        days.push({
          dateString: dStr,
          dayNumber: dNum,
          isCurrentMonth: false,
          isToday: dStr === todayStr,
          isSelected: dStr === selectedDate,
          appointments: appointmentsByDate.get(dStr) || [],
        });
      }
    }

    return days;
  }, [currentYear, currentMonth, selectedDate, todayStr, appointmentsByDate]);

  // Daily statistics
  const stats = useMemo(() => {
    const todayAppts = appointments.filter((a) => a.date === todayStr);
    const selectedDateAppts = appointments.filter((a) => a.date === selectedDate);
    const totalMonth = appointments.filter((a) => {
      const parts = a.date.split('-');
      return Number(parts[0]) === currentYear && Number(parts[1]) === currentMonth + 1;
    });

    return {
      todayTotal: todayAppts.length,
      todayConfirmed: todayAppts.filter((a) => a.status === 'Terkonfirmasi').length,
      todayCompleted: todayAppts.filter((a) => a.status === 'Selesai').length,
      selectedTotal: selectedDateAppts.length,
      selectedConfirmed: selectedDateAppts.filter((a) => a.status === 'Terkonfirmasi').length,
      monthTotal: totalMonth.length,
    };
  }, [appointments, todayStr, selectedDate, currentYear, currentMonth]);

  // Helper to open WhatsApp reminder
  const sendWhatsAppReminder = (appt: Appointment) => {
    if (!appt.patientPhone) return;
    const cleanPhone = appt.patientPhone.replace(/\D/g, '');
    let formattedPhone = cleanPhone;
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.slice(1);
    }

    const message = encodeURIComponent(
      `Halo Bapak/Ibu ${appt.patientName},\n\n` +
      `Kami dari ${settings.clinicInfo.name} ingin mengonfirmasi jadwal sesi fisioterapi Anda:\n` +
      `📅 Hari/Tanggal: ${formatDayDate(appt.date)}\n` +
      `⏰ Waktu: ${appt.time} WIB (${appt.durationMinutes} menit)\n` +
      `📍 Layanan/Lokasi: ${appt.location} ${appt.complaintOrService ? `(${appt.complaintOrService})` : ''}\n` +
      `👨‍⚕️ Fisioterapis: Ftr. ${appt.therapist}\n\n` +
      `Mohon konfirmasikan kehadiran Anda. Terima kasih!\n\n` +
      `Salam sehat,\n${settings.clinicInfo.name}`
    );

    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
  };

  // Helper for status badge styling
  const renderStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'Terkonfirmasi':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            Terkonfirmasi
          </span>
        );
      case 'Selesai':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
            Selesai
          </span>
        );
      case 'Batal':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <XCircle className="w-3 h-3" />
            Batal
          </span>
        );
      case 'Dijadwalkan':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <Clock4 className="w-3 h-3" />
            Dijadwalkan
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <CalendarDays className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Jadwal & Kalender Pasien
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Penjadwalan sesi fisioterapi pasien pada setiap tanggal (slot jam tersedia: 06:00 s/d 21:00)
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            id="btn-add-schedule"
            onClick={() => openAddAppointmentModal(selectedDate, '08:00')}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Buat Jadwal Pasien
          </button>
        </div>
      </div>

      {/* Zero patient banner notice if 0 patients */}
      {patients.length === 0 && (
        <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/80 dark:bg-blue-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-blue-900 dark:text-blue-200">
                Data pasien saat ini masih 0 (belum ada pasien terdaftar).
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300/90 mt-0.5">
                Untuk menjadwalkan sesi pada tanggal & jam tertentu, Anda dapat mendaftarkan pasien terlebih dahulu.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openAddPatientModal}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all shrink-0 flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            + Daftarkan Pasien Pertama
          </button>
        </div>
      )}

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0C1425] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Jadwal Hari Ini</span>
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.todayTotal}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">pasien</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0C1425] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Terkonfirmasi</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.todayConfirmed}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">siap terapi</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0C1425] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Tanggal Terpilih</span>
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <CalendarIcon className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.selectedTotal}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {selectedDate === todayStr ? '(Hari ini)' : formatDateIndonesian(selectedDate)}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0C1425] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Bulan Ini</span>
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <CalendarDays className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.monthTotal}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">sesi terapi</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Filter, Search, and View Switcher */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#0C1425] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'calendar'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Kalender & Jam (06:00 - 21:00)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('all-list')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'all-list'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Daftar Semua Jadwal ({filteredAppointments.length})
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Search */}
            <div className="relative min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari pasien / RM / terapi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Terapis filter */}
            <select
              value={filterTherapist}
              onChange={(e) => setFilterTherapist(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold focus:outline-none"
            >
              <option value="all">Semua Terapis</option>
              {settings.therapists.map((t) => (
                <option key={t} value={t}>Ftr. {t}</option>
              ))}
            </select>

            {/* Lokasi filter */}
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold focus:outline-none"
            >
              <option value="all">Semua Lokasi</option>
              <option value="Klinik">Klinik</option>
              <option value="Home Care">Home Care</option>
            </select>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold focus:outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="Dijadwalkan">Dijadwalkan</option>
              <option value="Terkonfirmasi">Terkonfirmasi</option>
              <option value="Selesai">Selesai</option>
              <option value="Batal">Batal</option>
            </select>
          </div>
        </div>
      </div>

      {activeTab === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Calendar Month Grid (Left/Main Column) */}
          <div className="lg:col-span-7 bg-white dark:bg-[#0C1425] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-4 sm:p-5">
            {/* Month Header Navigation */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {INDONESIAN_MONTHS[currentMonth]} {currentYear}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                  {calendarDays.filter((d) => d.isCurrentMonth && d.appointments.length > 0).length} Hari Terisi
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleJumpToToday}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                  title="Bulan Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                  title="Bulan Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Days of Week Header (Senin s/d Minggu) */}
            <div className="grid grid-cols-7 gap-1 mb-2 text-center">
              {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((dayName, idx) => (
                <div
                  key={dayName}
                  className={`text-[11px] font-black uppercase tracking-wider py-1.5 rounded-md ${
                    idx >= 5
                      ? 'text-rose-500 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {dayName}
                </div>
              ))}
            </div>

            {/* Calendar Date Cells Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((day) => {
                const isSelected = day.dateString === selectedDate;
                const hasAppts = day.appointments.length > 0;

                return (
                  <button
                    key={day.dateString}
                    type="button"
                    onClick={() => setSelectedDate(day.dateString)}
                    className={`min-h-[72px] sm:min-h-[88px] p-1.5 rounded-xl border text-left flex flex-col justify-between transition-all relative group cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/60 dark:bg-blue-950/30'
                        : day.isToday
                        ? 'border-amber-400 bg-amber-50/30 dark:bg-amber-950/20 dark:border-amber-700'
                        : day.isCurrentMonth
                        ? 'border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 hover:border-slate-400 dark:hover:border-slate-600'
                        : 'border-slate-100 dark:border-slate-900 bg-slate-50/40 dark:bg-slate-950/30 opacity-45'
                    }`}
                  >
                    {/* Top: Day number & Badge */}
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs font-black inline-flex items-center justify-center w-6 h-6 rounded-lg ${
                          day.isToday
                            ? 'bg-amber-500 text-white shadow-sm'
                            : isSelected
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {day.dayNumber}
                      </span>

                      {hasAppts && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {day.appointments.length}
                        </span>
                      )}
                    </div>

                    {/* Middle: Patient preview pills */}
                    <div className="w-full space-y-1 my-1 overflow-hidden">
                      {day.appointments.slice(0, 2).map((a) => (
                        <div
                          key={a.id}
                          className={`px-1 py-0.5 rounded text-[9px] font-semibold truncate flex items-center gap-1 ${
                            a.location === 'Home Care'
                              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                          title={`${a.time} - ${a.patientName} (${a.location})`}
                        >
                          <span className="font-mono">{a.time}</span>
                          <span className="truncate">{a.patientName}</span>
                        </div>
                      ))}
                      {day.appointments.length > 2 && (
                        <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400 pl-0.5">
                          +{day.appointments.length - 2} lagi
                        </div>
                      )}
                    </div>

                    {/* Bottom: subtle hint on hover */}
                    <div className="text-[9px] text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                      Lihat Jam →
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Calendar Legend */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                  Hari Ini
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  Klinik
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                  Home Care
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                Klik tanggal untuk melihat & menjadwalkan jam 06:00 - 21:00
              </span>
            </div>
          </div>

          {/* Daily Hourly Timeline 06:00 - 21:00 (Right Column) */}
          <div className="lg:col-span-5 bg-white dark:bg-[#0C1425] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            {/* Timeline Header */}
            <div className="p-4 bg-slate-50/80 dark:bg-[#070D18]/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Jadwal Pasien: {formatDayDate(selectedDate)}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Slot Tersedia: Jam 06:00 pagi - 21:00 malam ({appointmentsOnSelectedDate.length} pasien terjadwal)
                </p>
              </div>

              <button
                type="button"
                onClick={() => openAddAppointmentModal(selectedDate, '08:00')}
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1"
                title="Tambah jadwal pada tanggal ini"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah
              </button>
            </div>

            {/* Hourly Slot List (06:00 to 21:00) */}
            <div className="p-3 sm:p-4 space-y-2 max-h-[750px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
              {HOURLY_TIME_SLOTS.map((hour) => {
                // Find appointments starting in this hour (e.g. 08:00 or 08:30)
                const hourPrefix = hour.split(':')[0];
                const matchingAppts = appointmentsOnSelectedDate.filter((a) => {
                  const aHour = a.time.split(':')[0];
                  return aHour === hourPrefix;
                });

                const isSlotBooked = matchingAppts.length > 0;

                return (
                  <div key={hour} className="pt-2 first:pt-0">
                    <div className="flex items-start gap-3">
                      {/* Hour label */}
                      <div className="w-14 shrink-0 text-right pt-1">
                        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                          {hour}
                        </span>
                        <div className="text-[10px] text-slate-400">WIB</div>
                      </div>

                      {/* Slot Content */}
                      <div className="flex-1">
                        {isSlotBooked ? (
                          <div className="space-y-2">
                            {matchingAppts.map((appt) => (
                              <div
                                key={appt.id}
                                className={`p-3 rounded-xl border transition-all ${
                                  appt.status === 'Batal'
                                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 opacity-75'
                                    : appt.status === 'Selesai'
                                    ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
                                    : 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40 shadow-xs'
                                }`}
                              >
                                {/* Patient Name & Location */}
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => viewPatientProfile(appt.patientId)}
                                        className="font-bold text-sm text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 hover:underline text-left"
                                      >
                                        {appt.patientName}
                                      </button>
                                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                                        {appt.mrn}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                                      {appt.complaintOrService || 'Sesi Fisioterapi Rutin'}
                                    </p>
                                  </div>

                                  <div className="flex flex-col items-end gap-1 shrink-0">
                                    {renderStatusBadge(appt.status)}
                                    <span
                                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                        appt.location === 'Home Care'
                                          ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                                          : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                      }`}
                                    >
                                      {appt.location === 'Home Care' ? (
                                        <Home className="w-3 h-3" />
                                      ) : (
                                        <Building2 className="w-3 h-3" />
                                      )}
                                      {appt.location}
                                    </span>
                                  </div>
                                </div>

                                {/* Detail row */}
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-500 dark:text-slate-400">
                                  <span className="font-mono text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {appt.time} {appt.endTime ? `- ${appt.endTime}` : ''} ({appt.durationMinutes}m)
                                  </span>
                                  <span>•</span>
                                  <span>Ftr. {appt.therapist}</span>
                                  {appt.patientPhone && (
                                    <>
                                      <span>•</span>
                                      <span className="flex items-center gap-1">
                                        <Phone className="w-3 h-3" />
                                        {appt.patientPhone}
                                      </span>
                                    </>
                                  )}
                                </div>

                                {appt.notes && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-1.5 bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                                    Catatan: {appt.notes}
                                  </p>
                                )}

                                {/* Action Bar */}
                                <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60">
                                  {/* Quick status change */}
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-slate-400 font-bold">Ubah:</span>
                                    {appt.status !== 'Terkonfirmasi' && appt.status !== 'Selesai' && (
                                      <button
                                        type="button"
                                        onClick={() => updateAppointmentStatus(appt.id, 'Terkonfirmasi')}
                                        className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold transition-colors"
                                      >
                                        Konfirmasi
                                      </button>
                                    )}
                                    {appt.status !== 'Selesai' && (
                                      <button
                                        type="button"
                                        onClick={() => updateAppointmentStatus(appt.id, 'Selesai')}
                                        className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 font-bold transition-colors"
                                      >
                                        Selesai
                                      </button>
                                    )}
                                    {appt.status !== 'Batal' && (
                                      <button
                                        type="button"
                                        onClick={() => updateAppointmentStatus(appt.id, 'Batal')}
                                        className="text-[10px] px-2 py-0.5 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 font-bold transition-colors"
                                      >
                                        Batal
                                      </button>
                                    )}
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center gap-1.5">
                                    {appt.patientPhone && (
                                      <button
                                        type="button"
                                        onClick={() => sendWhatsAppReminder(appt)}
                                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
                                        title="Kirim Konfirmasi / Pengingat WhatsApp"
                                      >
                                        <MessageCircle className="w-3.5 h-3.5" />
                                      </button>
                                    )}

                                    {/* Create Visit SOAP button */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const foundPt = patients.find((p) => p.id === appt.patientId);
                                        openAddVisitModal(foundPt || null);
                                      }}
                                      className="px-2 py-1 text-[11px] font-bold rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors flex items-center gap-1"
                                      title="Input SOAP Rekam Terapi Kunjungan"
                                    >
                                      <FileText className="w-3 h-3" />
                                      Input SOAP
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => openEditAppointmentModal(appt)}
                                      className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                      title="Edit Jadwal"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (confirm(`Hapus jadwal untuk pasien ${appt.patientName}?`)) {
                                          deleteAppointment(appt.id);
                                        }
                                      }}
                                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                                      title="Hapus Jadwal"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          /* Empty Slot Row with direct add button */
                          <button
                            type="button"
                            onClick={() => openAddAppointmentModal(selectedDate, hour)}
                            className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 bg-slate-50/40 hover:bg-blue-50/30 dark:bg-slate-900/20 dark:hover:bg-blue-950/20 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all flex items-center justify-between text-xs group cursor-pointer"
                          >
                            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                              Slot Tersedia ({hour})
                            </span>
                            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              <Plus className="w-3 h-3" />
                              Jadwalkan Pasien
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* List View (Daftar Semua Jadwal) */
        <div className="bg-white dark:bg-[#0C1425] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/80 dark:bg-[#070D18]/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Semua Jadwal Terdaftar ({filteredAppointments.length})
            </h3>
            <button
              type="button"
              onClick={() => openAddAppointmentModal(selectedDate, '08:00')}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              + Jadwal Baru
            </button>
          </div>

          {filteredAppointments.length === 0 ? (
            <div className="p-12 text-center">
              <CalendarIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Belum Ada Jadwal Pasien
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                Gunakan tombol "+ Buat Jadwal Pasien" untuk menentukan tanggal dan jam sesi (06:00 - 21:00) bagi pasien Anda.
              </p>
              <button
                type="button"
                onClick={() => openAddAppointmentModal(selectedDate, '08:00')}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Tambah Jadwal Sekarang
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Tanggal & Jam</th>
                    <th className="py-3 px-4">Pasien</th>
                    <th className="py-3 px-4">Layanan / Keluhan</th>
                    <th className="py-3 px-4">Lokasi & Terapis</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredAppointments.map((appt) => (
                    <tr key={appt.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {formatDayDate(appt.date)}
                        </div>
                        <div className="font-mono text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                          {appt.time} {appt.endTime ? `- ${appt.endTime}` : ''} ({appt.durationMinutes}m)
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => viewPatientProfile(appt.patientId)}
                          className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                        >
                          {appt.patientName}
                        </button>
                        <div className="font-mono text-[10px] text-slate-400">
                          {appt.mrn} {appt.patientPhone ? `• ${appt.patientPhone}` : ''}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {appt.complaintOrService || 'Fisioterapi'}
                        </span>
                        {appt.notes && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">
                            {appt.notes}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              appt.location === 'Home Care'
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            }`}
                          >
                            {appt.location}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">
                            Ftr. {appt.therapist}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {renderStatusBadge(appt.status)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {appt.patientPhone && (
                            <button
                              type="button"
                              onClick={() => sendWhatsAppReminder(appt)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition-colors"
                              title="Kirim WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const foundPt = patients.find((p) => p.id === appt.patientId);
                              openAddVisitModal(foundPt || null);
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors"
                            title="Input SOAP Kunjungan"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditAppointmentModal(appt)}
                            className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Hapus jadwal ${appt.patientName}?`)) {
                                deleteAppointment(appt.id);
                              }
                            }}
                            className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
