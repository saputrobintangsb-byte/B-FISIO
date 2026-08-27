import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  BarChart2,
  TrendingUp,
  DollarSign,
  Calendar,
  Home,
  Building2,
  FileSpreadsheet,
  Download,
  Filter,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Users
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { formatDateShort, formatRupiah, exportToExcel, exportToCSV } from '../utils/formatters';

export const ReportsView: React.FC = () => {
  const { visits, patients, settings, showToast } = useApp();

  // Date range presets
  const [filterPreset, setFilterPreset] = useState<'today' | 'thisWeek' | 'thisMonth' | 'custom' | 'all'>('thisMonth');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterLocation, setFilterLocation] = useState<'all' | 'Home Care' | 'Klinik'>('all');
  const [filterTherapist, setFilterTherapist] = useState('all');

  // Compute actual date bounds based on preset
  const { computedStart, computedEnd } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (filterPreset === 'today') {
      return { computedStart: todayStr, computedEnd: todayStr };
    }

    if (filterPreset === 'thisWeek') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(now.setDate(diff));
      const mondayStr = monday.toISOString().split('T')[0];
      return { computedStart: mondayStr, computedEnd: todayStr };
    }

    if (filterPreset === 'thisMonth') {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      return { computedStart: `${year}-${month}-01`, computedEnd: `${year}-${month}-31` };
    }

    if (filterPreset === 'custom') {
      return { computedStart: startDate, computedEnd: endDate };
    }

    // All
    return { computedStart: '', computedEnd: '' };
  }, [filterPreset, startDate, endDate]);

  // Filtered visits
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      if (computedStart && v.date < computedStart) return false;
      if (computedEnd && v.date > computedEnd) return false;
      if (filterLocation !== 'all' && v.location !== filterLocation) return false;
      if (filterTherapist !== 'all' && v.therapist !== filterTherapist) return false;
      return true;
    });
  }, [visits, computedStart, computedEnd, filterLocation, filterTherapist]);

  // Report Metrics
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let homeCareCount = 0;
    let clinicCount = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    let dpCount = 0;
    let gratisCount = 0;

    const interventionCounts: Record<string, number> = {};
    const therapistStats: Record<string, { visits: number; revenue: number }> = {};

    filteredVisits.forEach((v) => {
      totalRevenue += v.payment.total || 0;
      totalPaid += v.payment.paidAmount || 0;
      totalOutstanding += v.payment.remainingBalance || 0;

      if (v.location === 'Home Care') homeCareCount++;
      else clinicCount++;

      if (v.payment.status === 'Lunas') paidCount++;
      else if (v.payment.status === 'Belum Lunas') unpaidCount++;
      else if (v.payment.status === 'DP') dpCount++;
      else if (v.payment.status === 'Gratis') gratisCount++;

      // Interventions
      v.interventions.forEach((inv) => {
        interventionCounts[inv] = (interventionCounts[inv] || 0) + 1;
      });

      // Therapist
      const t = v.therapist || 'Bintang';
      if (!therapistStats[t]) therapistStats[t] = { visits: 0, revenue: 0 };
      therapistStats[t].visits++;
      therapistStats[t].revenue += v.payment.total || 0;
    });

    const topInterventions = Object.entries(interventionCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const therapistArray = Object.entries(therapistStats).map(([name, stat]) => ({
      name,
      visits: stat.visits,
      revenue: stat.revenue,
    }));

    return {
      totalVisits: filteredVisits.length,
      totalRevenue,
      totalPaid,
      totalOutstanding,
      homeCareCount,
      clinicCount,
      paidCount,
      unpaidCount,
      dpCount,
      gratisCount,
      topInterventions,
      therapistArray,
    };
  }, [filteredVisits]);

  // Chart data: location pie
  const locationPieData = useMemo(() => {
    return [
      { name: 'Home Care', value: metrics.homeCareCount, color: '#3B82F6' },
      { name: 'Klinik', value: metrics.clinicCount, color: '#10B981' },
    ].filter((d) => d.value > 0);
  }, [metrics]);

  const handleExportExcel = () => {
    exportToExcel(patients, filteredVisits, 'BFisio_Laporan_Keuangan_Terapi');
    showToast('success', 'Laporan lengkap berhasil diekspor ke Excel.', 'Ekspor Selesai');
  };

  const handleExportCSV = () => {
    exportToCSV(filteredVisits, 'BFisio_Laporan_Kunjungan');
    showToast('success', 'Laporan kunjungan berhasil diekspor ke CSV.', 'Ekspor Selesai');
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Filters & Export Header */}
      <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-base text-slate-900 dark:text-white">
              Laporan & Analitik Fisioterapi
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evaluasi kinerja kunjungan fisioterapi, intervensi terbanyak, dan laporan keuangan
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Ekspor Excel</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors shadow-xs"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Ekspor CSV</span>
            </button>
          </div>
        </div>

        {/* Date Presets and Custom Selectors */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setFilterPreset('today')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                filterPreset === 'today'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setFilterPreset('thisWeek')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                filterPreset === 'thisWeek'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Minggu Ini
            </button>
            <button
              onClick={() => setFilterPreset('thisMonth')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                filterPreset === 'thisMonth'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => setFilterPreset('custom')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                filterPreset === 'custom'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Rentang Kustom
            </button>
            <button
              onClick={() => setFilterPreset('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                filterPreset === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Semua Waktu
            </button>
          </div>

          {filterPreset === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
              />
              <span className="text-slate-400">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
              />
            </div>
          )}

          {/* Location & Therapist Filters */}
          <div className="flex items-center gap-1.5 ml-auto">
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-medium"
            >
              <option value="all">Semua Lokasi</option>
              <option value="Home Care">Home Care</option>
              <option value="Klinik">Klinik</option>
            </select>

            <select
              value={filterTherapist}
              onChange={(e) => setFilterTherapist(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-medium"
            >
              <option value="all">Semua Terapis</option>
              {(settings.therapists || ['Bintang']).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Metrics Row (Symmetrical 4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Pendapatan */}
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pendapatan</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-mono mt-2">
            {formatRupiah(metrics.totalRevenue)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
            <span>Terbayar: {formatRupiah(metrics.totalPaid)}</span>
          </div>
        </div>

        {/* Card 2: Sisa Tagihan (Outstanding) */}
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sisa Tagihan / DP</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono mt-2">
            {formatRupiah(metrics.totalOutstanding)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {metrics.unpaidCount} Belum Lunas • {metrics.dpCount} DP
          </div>
        </div>

        {/* Card 3: Total Sesi Terapi */}
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Kunjungan</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <Stethoscope className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-mono mt-2">
            {metrics.totalVisits} <span className="text-xs font-normal text-slate-400">Sesi</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {metrics.paidCount} Lunas • {metrics.gratisCount} Gratis
          </div>
        </div>

        {/* Card 4: Distribusi Lokasi */}
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Home Care vs Klinik</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
              <Home className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-2">
            {metrics.homeCareCount} HC / {metrics.clinicCount} Klinik
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {metrics.totalVisits > 0
              ? `${Math.round((metrics.homeCareCount / metrics.totalVisits) * 100)}% Home Care`
              : '0%'}
          </div>
        </div>
      </div>

      {/* Symmetrical Charts Grid: Top Interventions & Therapist Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Chart: Top Interventions */}
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-blue-600" />
            Intervensi Fisioterapi Terbanyak Digunakan
          </h3>

          {metrics.topInterventions.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              Belum ada data intervensi pada periode ini
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.topInterventions} layout="vertical" margin={{ left: 30, right: 20, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#FFF',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`${value} kali`, 'Penggunaan']}
                  />
                  <Bar dataKey="count" fill="#3B82F6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Right Chart: Therapist Performance Breakdown */}
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            Kinerja Fisioterapis (Sesi & Pendapatan)
          </h3>

          {metrics.therapistArray.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              Belum ada data terapis pada periode ini
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {metrics.therapistArray.map((t) => (
                <div
                  key={t.name}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{t.name}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                      {t.visits} Sesi Terapi ({metrics.totalVisits > 0 ? Math.round((t.visits / metrics.totalVisits) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {formatRupiah(t.revenue)}
                    </span>
                    <span className="text-[11px] text-emerald-600 block">Total Omset</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
