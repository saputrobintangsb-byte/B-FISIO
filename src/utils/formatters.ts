import * as XLSX from 'xlsx';
import { Patient, TherapyVisit } from '../types';

export function formatRupiah(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const INDONESIAN_DAYS = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
];

export function formatDateIndonesian(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = d.getDate();
    const month = INDONESIAN_MONTHS[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateString;
  }
}

export function formatDateShort(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
}

export function formatDayDate(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const dayName = INDONESIAN_DAYS[d.getDay()];
    const day = d.getDate();
    const month = INDONESIAN_MONTHS[d.getMonth()];
    const year = d.getFullYear();
    return `${dayName}, ${day} ${month} ${year}`;
  } catch {
    return dateString;
  }
}

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateAge(dobString: string): number {
  if (!dobString) return 0;
  try {
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return Math.max(0, age);
  } catch {
    return 0;
  }
}

/**
 * Asian WHO BMI Calculation & Classification
 * Formula: IMT = Berat Badan (kg) ÷ (Tinggi Badan (m) × Tinggi Badan (m))
 * 
 * Standar Asia:
 * - IMT < 18,5 → Berat Badan Kurang
 * - IMT 18,5–22,9 → Normal / Ideal
 * - IMT 23,0–24,9 → Overweight
 * - IMT ≥ 25,0 → Obesitas
 */
export interface BmiResult {
  bmi: number | null;
  bmiFormatted: string;
  category: 'Berat Badan Kurang' | 'Normal / Ideal' | 'Overweight' | 'Obesitas' | '';
  colorClass: string;
  badgeBg: string;
  description: string;
}

export function calculateAsianBMI(
  weightKg: number | string | undefined | null,
  heightCm: number | string | undefined | null
): BmiResult {
  const w = typeof weightKg === 'string' ? parseFloat(weightKg) : weightKg;
  const h = typeof heightCm === 'string' ? parseFloat(heightCm) : heightCm;

  if (!w || !h || isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
    return {
      bmi: null,
      bmiFormatted: '-',
      category: '',
      colorClass: 'text-slate-400',
      badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
      description: 'Masukkan Berat Badan dan Tinggi Badan untuk menghitung IMT otomatis.',
    };
  }

  const heightMeter = h / 100;
  const rawBmi = w / (heightMeter * heightMeter);
  const roundedBmi = Math.round(rawBmi * 10) / 10;

  if (roundedBmi < 18.5) {
    return {
      bmi: roundedBmi,
      bmiFormatted: roundedBmi.toFixed(1),
      category: 'Berat Badan Kurang',
      colorClass: 'text-sky-600 dark:text-sky-400',
      badgeBg: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800',
      description: 'IMT < 18.5 (Berat Badan Kurang / Underweight)',
    };
  } else if (roundedBmi <= 22.9) {
    return {
      bmi: roundedBmi,
      bmiFormatted: roundedBmi.toFixed(1),
      category: 'Normal / Ideal',
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
      description: 'IMT 18.5 – 22.9 (Normal / Ideal)',
    };
  } else if (roundedBmi <= 24.9) {
    return {
      bmi: roundedBmi,
      bmiFormatted: roundedBmi.toFixed(1),
      category: 'Overweight',
      colorClass: 'text-amber-600 dark:text-amber-400',
      badgeBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
      description: 'IMT 23.0 – 24.9 (Overweight / Kelebihan Berat Badan)',
    };
  } else {
    return {
      bmi: roundedBmi,
      bmiFormatted: roundedBmi.toFixed(1),
      category: 'Obesitas',
      colorClass: 'text-rose-600 dark:text-rose-400',
      badgeBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
      description: 'IMT ≥ 25.0 (Obesitas)',
    };
  }
}

// Generate Excel file
export function exportToExcel(
  patients: Patient[],
  visits: TherapyVisit[],
  filename: string = 'BFisio_Data_Export'
) {
  const wb = XLSX.utils.book_new();

  // Patients Sheet
  const patientData = patients.map((p, idx) => ({
    'No': idx + 1,
    'No. Rekam Medis': p.mrn,
    'Nama Lengkap': p.fullName,
    'L/P': p.gender === 'L' ? 'Laki-laki' : 'Perempuan',
    'Usia': p.age,
    'No. Telepon/WA': p.phone,
    'Alamat': p.address,
    'Diagnosa Medis/Fisio': p.diagnosis,
    'Keluhan Utama': p.mainComplaint,
    'Riwayat Penyakit Sekarang (RPS)': p.currentMedicalHistory || '-',
    'TD (mmHg)': p.vitalSigns?.bloodPressure || '-',
    'Nadi (bpm)': p.vitalSigns?.heartRate || '-',
    'RR (x/mnt)': p.vitalSigns?.respiratoryRate || '-',
    'SpO2 (%)': p.vitalSigns?.spo2 || '-',
    'Suhu (°C)': p.vitalSigns?.temperature || '-',
    'TB (cm)': p.vitalSigns?.height || '-',
    'BB (kg)': p.vitalSigns?.weight || '-',
    'IMT': p.vitalSigns?.bmi ?? '-',
    'Klasifikasi IMT': p.vitalSigns?.bmiCategory || '-',
    '1. Body Function': p.bodyFunction || '-',
    '2. Body Structure': p.bodyStructure || '-',
    '3. Activity Limitation': p.activityLimitation || '-',
    '4. Participation Restriction': p.participationRestriction || '-',
    '5. Personal Factor': p.personalFactor || '-',
    '6. Environmental Factor': p.environmentalFactor || '-',
    'Data Penunjang': p.supportingDocs?.map(d => `${d.title || 'Dokumen'}${d.url ? ` (${d.url})` : ''}`).join('; ') || '-',
    'Total Kunjungan': p.totalVisits,
    'Terapi Terakhir': p.lastVisitDate ? formatDateShort(p.lastVisitDate) : '-',
    'Lokasi Terakhir': p.lastLocation || '-',
    'Fisioterapis': p.lastTherapist || '-',
    'Total Pengeluaran (Rp)': p.totalSpending,
    'Sisa Tagihan / DP (Rp)': p.outstandingBalance,
    'Status Pembayaran': p.lastPaymentStatus || 'Lunas',
  }));
  const wsPatients = XLSX.utils.json_to_sheet(patientData);
  XLSX.utils.book_append_sheet(wb, wsPatients, 'Data Pasien');

  // Therapy Visits Sheet
  const visitData = visits.map((v, idx) => ({
    'No': idx + 1,
    'Tanggal': v.date,
    'No. RM': v.mrn,
    'Nama Pasien': v.patientName,
    'Kunjungan Ke': v.visitNumber,
    'Lokasi': v.location,
    'Fisioterapis': v.therapist,
    'Intervensi': v.interventions.join(', ') + (v.customInterventions?.length ? `, ${v.customInterventions.join(', ')}` : ''),
    'SOAP - Subjective': v.soap.subjective,
    'SOAP - Objective': v.soap.objective,
    'SOAP - Assessment': v.soap.assessment,
    'SOAP - Plan': v.soap.plan,
    'Tarif Terapi (Rp)': v.payment.therapyPrice,
    'Biaya Transport (Rp)': v.payment.transport,
    'Diskon (Rp)': v.payment.discount,
    'Total Biaya (Rp)': v.payment.total,
    'Status Bayar': v.payment.status,
    'Jumlah Dibayar (Rp)': v.payment.paidAmount,
    'Sisa Tagihan (Rp)': v.payment.remainingBalance,
    'Catatan Bayar': v.payment.notes || '',
  }));
  const wsVisits = XLSX.utils.json_to_sheet(visitData);
  XLSX.utils.book_append_sheet(wb, wsVisits, 'Riwayat Kunjungan');

  XLSX.writeFile(wb, `${filename}_${getTodayDateString()}.xlsx`);
}

// Generate CSV string
export function exportToCSV(patients: Patient[], filename: string = 'BFisio_Pasien') {
  const headers = [
    'No. RM',
    'Nama Lengkap',
    'Jenis Kelamin',
    'Usia',
    'No. HP',
    'Alamat',
    'Diagnosa',
    'Keluhan Utama',
    'Total Kunjungan',
    'Terapi Terakhir',
    'Total Biaya',
    'Sisa Tagihan',
    'Status'
  ];

  const rows = patients.map(p => [
    `"${p.mrn || '-'}"`,
    `"${(p.fullName || 'Tanpa Nama').replace(/"/g, '""')}"`,
    p.gender === 'L' ? 'Laki-laki' : 'Perempuan',
    p.age,
    `"${p.phone}"`,
    `"${(p.address || '').replace(/"/g, '""')}"`,
    `"${(p.diagnosis || '').replace(/"/g, '""')}"`,
    `"${(p.mainComplaint || '').replace(/"/g, '""')}"`,
    p.totalVisits,
    p.lastVisitDate || '',
    p.totalSpending,
    p.outstandingBalance,
    p.lastPaymentStatus || 'Lunas'
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${getTodayDateString()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
