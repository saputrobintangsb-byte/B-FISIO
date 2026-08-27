import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Users,
  CalendarCheck,
  Activity,
  AlertCircle,
  Home,
  Building2,
  DollarSign,
  TrendingUp,
  UserPlus,
  PlusCircle,
  ChevronRight,
  Clock,
  MapPin,
  CheckCircle2,
  Calendar,
  FileText
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
      {/* STATS GRID - 4 GEOMETRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Pasien */}
        <div className="bg-white dark:bg-[#001F3F]/30 p-5 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Pasien</p>
          <p className="text-2xl sm:text-3xl font-bold text-[#001F3F] dark:text-white">{stats?.totalPatients || 0}</p>
          <div className="mt-3 flex items-center text-[10px] text-emerald-600 font-bold">
            <TrendingUp className="w-3.5 h-3.5 mr-1" />
            Terdaftar di database klinis
          </div>
        </div>

        {/* 2. Kunjungan Hari Ini */}
        <div className="bg-white dark:bg-[#001F3F]/30 p-5 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Kunjungan Hari Ini</p>
          <p className="text-2xl sm:text-3xl font-bold text-[#001F3F] dark:text-white">{stats?.patientsToday || 0}</p>
          <div className="mt-3 flex items-center text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
            {stats?.clinicVisits || 0} Klinik · {stats?.homeCareVisits || 0} Home Care
          </div>
        </div>

        {/* 3. Revenue Bulan Ini */}
        <div className="bg-white dark:bg-[#001F3F]/30 p-5 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Revenue Bulan Ini</p>
          <p className="text-2xl sm:text-3xl font-bold text-[#001F3F] dark:text-white">
            {formatRupiah(stats?.thisMonthRevenue || 0)}
          </p>
          <div className="mt-3 flex items-center text-[10px] text-emerald-600 font-bold">
            <TrendingUp className="w-3.5 h-3.5 mr-1" />
            Hari ini: {formatRupiah(stats?.todayRevenue || 0)}
          </div>
        </div>

        {/* 4. Piutang Berjalan / Outstanding Highlight Card */}
        <div className="bg-[#001F3F] p-5 border border-[#001F3F] rounded-xl shadow-md text-white">
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">Piutang Berjalan</p>
          <p className="text-2xl sm:text-3xl font-bold text-white">
            {formatRupiah(stats?.outstandingBalanceTotal || 0)}
          </p>
          <div className="mt-3 flex items-center text-[10px] text-white/70 font-semibold">
            {stats?.unpaidTransactions || 0} Transaksi Belum Lunas
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
