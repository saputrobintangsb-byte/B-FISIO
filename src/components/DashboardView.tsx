import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Users2,
  CalendarCheck2,
  Activity,
  AlertCircle,
  Home,
  Building2,
  DollarSign,
  TrendingUp,
  UserPlus2,
  PlusCircle,
  ChevronRight,
  Clock,
  MapPin,
  CheckCircle2,
  Calendar,
  FileText,
  Wallet,
  Receipt,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { formatRupiah, formatDateIndonesian, formatDateShort, getTodayDateString, INDONESIAN_MONTHS } from '../utils/formatters';

export const DashboardView: React.FC = () => {
  const {
    stats,
    patients,
    visits,
    viewPatientProfile,
    openAddPatientModal,
    openAddVisitModal,
    setActiveView,
    settings,
  } = useApp();

  const today = getTodayDateString();

  // Filter today's visits
  const todayVisits = useMemo(() => {
    return visits.filter((v) => v.date === today);
  }, [visits, today]);

  // Recent patients (latest 5)
  const recentPatients = useMemo(() => {
    return [...patients].slice(0, 5);
  }, [patients]);

  // Monthly stats for chart (Past 6 months)
  const monthlyChartData = useMemo(() => {
    const monthsData: { monthKey: string; label: string; visitsCount: number; revenue: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthNum = d.getMonth();
      const monthKey = `${year}-${String(monthNum + 1).padStart(2, '0')}`;
      const label = `${INDONESIAN_MONTHS[monthNum].slice(0, 3)} ${year}`;

      let visitsCount = 0;
      let revenue = 0;

      for (const v of visits) {
        if (v.date.startsWith(monthKey)) {
          visitsCount++;
          revenue += (v.payment.paidAmount || (v.payment.status === 'Lunas' ? v.payment.total : 0));
        }
      }

      monthsData.push({ monthKey, label, visitsCount, revenue });
    }

    return monthsData;
  }, [visits]);

  // Max visits for bar normalization
  const maxMonthlyVisits = useMemo(() => {
    const max = Math.max(...monthlyChartData.map((m) => m.visitsCount), 1);
    return max;
  }, [monthlyChartData]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* QUICK ACTIONS BANNER - PROMINENT TAMBAH PASIEN & CATAT KUNJUNGAN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tambah Pasien Card */}
        <div
          id="dashboard-card-add-patient"
          onClick={openAddPatientModal}
          className="group relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 dark:from-blue-700 dark:via-blue-800 dark:to-indigo-950 p-5 rounded-2xl shadow-md hover:shadow-xl text-white cursor-pointer transition-all duration-300 transform active:scale-[0.98] border border-blue-500/30"
        >
          {/* Subtle background decoration */}
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
          
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-white/15 backdrop-blur-md text-white border border-white/20 shadow-inner group-hover:bg-white group-hover:text-blue-700 transition-all duration-300">
                <UserPlus2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                    + Tambah Pasien Baru
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30 backdrop-blur-xs">
                    RME
                  </span>
                </div>
                <p className="text-xs text-blue-100/90 mt-0.5 font-medium leading-snug">
                  Daftarkan pasien baru, data identitas, kontak & riwayat medis awal.
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center justify-center w-9 h-9 rounded-xl bg-white/15 group-hover:bg-white group-hover:text-blue-700 text-white transition-all shadow-xs shrink-0">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Catat Kunjungan Card */}
        <div
          id="dashboard-card-add-visit"
          onClick={() => openAddVisitModal(null)}
          className="group relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 dark:from-emerald-700 dark:via-teal-800 dark:to-[#0B132B] p-5 rounded-2xl shadow-md hover:shadow-xl text-white cursor-pointer transition-all duration-300 transform active:scale-[0.98] border border-emerald-500/30"
        >
          {/* Subtle background decoration */}
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-white/15 backdrop-blur-md text-white border border-white/20 shadow-inner group-hover:bg-white group-hover:text-emerald-700 transition-all duration-300">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                    + Catat Kunjungan Terapi
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30 backdrop-blur-xs">
                    SOAP
                  </span>
                </div>
                <p className="text-xs text-emerald-100/90 mt-0.5 font-medium leading-snug">
                  Input sesi SOAP, intervensi modalitas fisioterapi & pembayaran.
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center justify-center w-9 h-9 rounded-xl bg-white/15 group-hover:bg-white group-hover:text-emerald-700 text-white transition-all shadow-xs shrink-0">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* STATS GRID - 4 ELEGANT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Pasien */}
        <div className="bg-white dark:bg-[#0B132B]/80 p-5 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total Pasien</p>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Users2 className="w-4.5 h-4.5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{stats?.totalPatients || 0}</p>
          <div className="mt-2.5 flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            <TrendingUp className="w-3.5 h-3.5 mr-1" />
            <span>Terdaftar di rekam medis</span>
          </div>
        </div>

        {/* 2. Kunjungan Hari Ini */}
        <div className="bg-white dark:bg-[#0B132B]/80 p-5 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Sesi Hari Ini</p>
            <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400">
              <CalendarCheck2 className="w-4.5 h-4.5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{stats?.patientsToday || 0}</p>
          <div className="mt-2.5 flex items-center text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>{stats?.clinicVisits || 0} Klinik · {stats?.homeCareVisits || 0} Home Care</span>
          </div>
        </div>

        {/* 3. Revenue Bulan Ini */}
        <div className="bg-white dark:bg-[#0B132B]/80 p-5 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Pendapatan Bulan Ini</p>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Wallet className="w-4.5 h-4.5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {formatRupiah(stats?.thisMonthRevenue || 0)}
          </p>
          <div className="mt-2.5 flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            <TrendingUp className="w-3.5 h-3.5 mr-1" />
            <span>Hari ini: {formatRupiah(stats?.todayRevenue || 0)}</span>
          </div>
        </div>

        {/* 4. Piutang Berjalan / Outstanding */}
        <div className="bg-gradient-to-br from-[#001730] to-[#0A2244] dark:from-[#060D1E] dark:to-[#0F1D38] p-5 border border-blue-900/30 rounded-2xl shadow-md text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-cyan-300 uppercase tracking-widest">Piutang Berjalan</p>
            <div className="p-2 rounded-xl bg-white/10 text-cyan-300">
              <Receipt className="w-4.5 h-4.5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            {formatRupiah(stats?.outstandingBalanceTotal || 0)}
          </p>
          <div className="mt-2.5 flex items-center text-xs text-cyan-200/80 font-medium">
            <span>{stats?.unpaidTransactions || 0} Tagihan Belum Lunas</span>
          </div>
        </div>
      </div>

      {/* MONTHLY CHART & VOLUME SECTION */}
      <div className="bg-white dark:bg-[#001F3F]/30 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="font-bold text-base text-[#001F3F] dark:text-white uppercase tracking-wider text-sm">
              Volume Kunjungan & Pendapatan Bulanan
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Statistik 6 bulan terakhir aktivitas tindakan fisioterapi
            </p>
          </div>
          <button
            onClick={() => setActiveView('reports')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 self-start sm:self-auto uppercase tracking-wide"
          >
            Lihat Semua Laporan <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Responsive Bar Chart */}
        <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-48 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          {monthlyChartData.map((item) => {
            const heightPercent = Math.max(8, Math.round((item.visitsCount / maxMonthlyVisits) * 100));
            return (
              <div key={item.monthKey} className="flex flex-col items-center h-full justify-end group">
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  {item.visitsCount} Sesi
                </div>
                <div className="w-full max-w-[48px] bg-slate-100 dark:bg-slate-800 rounded-t overflow-hidden flex flex-col justify-end h-32">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full bg-[#001F3F] dark:bg-blue-500 group-hover:bg-blue-600 transition-all rounded-t relative"
                    title={`${item.label}: ${item.visitsCount} Sesi (${formatRupiah(item.revenue)})`}
                  />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mt-2 text-center truncate w-full">
                  {item.label}
                </span>
                <span className="text-[9px] text-slate-400 truncate w-full text-center hidden sm:block">
                  {formatRupiah(item.revenue)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* BOTTOM SECTION: TABLE + RIGHT INFO COLUMN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TABLE AREA: AKTIVITAS TERAPI TERBARU (Col Span 2) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#001F3F]/30 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs flex flex-col justify-between">
          <div>
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#001F3F] dark:text-white uppercase tracking-wider">
                Aktivitas Terapi Terbaru
              </h3>
              <button
                onClick={() => setActiveView('therapy-history')}
                className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
              >
                Lihat Semua
              </button>
            </div>

            {visits.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Belum ada data kunjungan terapi tercatat.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/80 text-[10px] uppercase font-bold text-slate-400">
                    <tr>
                      <th className="px-6 py-3">Pasien</th>
                      <th className="px-6 py-3">Diagnosa</th>
                      <th className="px-6 py-3">Terapis</th>
                      <th className="px-6 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                    {visits.slice(0, 5).map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-3.5">
                          <p className="font-bold text-[#001F3F] dark:text-white text-sm">{v.patientName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{v.mrn} · {formatDateShort(v.date)}</p>
                        </td>
                        <td className="px-6 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                          {v.interventions?.slice(0, 2).join(', ') || '-'}
                        </td>
                        <td className="px-6 py-3.5 text-xs text-slate-600 dark:text-slate-300 italic">
                          {v.therapist}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <span
                            className={`px-2.5 py-1 text-[10px] font-bold rounded uppercase tracking-wide inline-block ${
                              v.payment.status === 'Lunas'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : v.payment.status === 'DP'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {v.payment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
            <span className="text-xs text-slate-400">
              Total {visits.length} sesi terapi tersimpan
            </span>
            <button
              onClick={() => openAddVisitModal(null)}
              className="text-xs font-bold text-[#001F3F] dark:text-blue-400 uppercase tracking-wide hover:underline"
            >
              + Tambah Sesi Terapi
            </button>
          </div>
        </div>

        {/* RIGHT INFO COLUMN */}
        <div className="flex flex-col gap-4">
          {/* Lokasi Kunjungan Progress Bar */}
          <div className="bg-white dark:bg-[#001F3F]/30 p-5 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
              Lokasi Kunjungan
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1 font-bold text-slate-800 dark:text-slate-200">
                  <span>Klinik Utama</span>
                  <span>
                    {stats?.totalTherapyVisits ? Math.round(((stats.clinicVisits || 0) / stats.totalTherapyVisits) * 100) : 0}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    style={{
                      width: `${stats?.totalTherapyVisits ? Math.round(((stats.clinicVisits || 0) / stats.totalTherapyVisits) * 100) : 0}%`,
                    }}
                    className="h-full bg-[#001F3F] dark:bg-blue-500 rounded-full transition-all"
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1 font-bold text-slate-800 dark:text-slate-200">
                  <span>Home Care</span>
                  <span>
                    {stats?.totalTherapyVisits ? Math.round(((stats.homeCareVisits || 0) / stats.totalTherapyVisits) * 100) : 0}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    style={{
                      width: `${stats?.totalTherapyVisits ? Math.round(((stats.homeCareVisits || 0) / stats.totalTherapyVisits) * 100) : 0}%`,
                    }}
                    className="h-full bg-blue-400 rounded-full transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Intervensi Terpopuler Pills */}
          <div className="bg-white dark:bg-[#001F3F]/30 p-5 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                Intervensi Terpopuler
              </h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-[#001F3F] text-white text-[10px] font-bold rounded-full">
                  IR
                </span>
                <span className="px-3 py-1 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-full border border-slate-200 dark:border-slate-700">
                  TENS
                </span>
                <span className="px-3 py-1 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-full border border-slate-200 dark:border-slate-700">
                  Massage
                </span>
                <span className="px-3 py-1 bg-[#001F3F] text-white text-[10px] font-bold rounded-full">
                  PNF
                </span>
                <span className="px-3 py-1 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-full border border-slate-200 dark:border-slate-700">
                  Bobath
                </span>
                <span className="px-3 py-1 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-full border border-slate-200 dark:border-slate-700">
                  Stretching
                </span>
                <span className="px-3 py-1 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-full border border-slate-200 dark:border-slate-700">
                  Strengthening
                </span>
              </div>
            </div>

            {/* Tip box */}
            <div className="mt-5 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">
                Tip Klinis:
              </p>
              <p className="text-xs italic text-[#001F3F] dark:text-blue-300 mt-1">
                Pastikan SOAP dicatat segera setelah terapi selesai untuk keakuratan data medis.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
