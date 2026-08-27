export type Gender = 'L' | 'P';

export type TherapyLocation = 'Home Care' | 'Klinik';

export type PaymentStatus = 'Lunas' | 'Belum Lunas' | 'DP' | 'Gratis';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface SoapNote {
  subjective: string; // Keluhan subyektif pasien, nyeri (VAS), rasa baal, riwayat
  objective: string;   // Pemeriksaan fisik, ROM, MMT, tes spesifik, postur
  assessment: string;  // Diagnosa fisioterapi, problematika fisioterapi
  plan: string;        // Rencana terapi, frekuensi, edukasi, home program
}

export interface PaymentRecord {
  therapyPrice: number;
  transport: number;
  discount: number;
  total: number;
  status: PaymentStatus;
  paidAmount: number;
  remainingBalance: number;
  notes?: string;
}

export interface VitalSigns {
  bloodPressure?: string; // Tekanan Darah (e.g. "120/80 mmHg")
  heartRate?: string | number; // Nadi / Heart Rate (bpm)
  respiratoryRate?: string | number; // Respiratory Rate / RR (x/menit)
  spo2?: string | number; // Saturasi Oksigen SpO2 (%)
  temperature?: string | number; // Suhu Tubuh (°C)
  height?: string | number; // Tinggi Badan (cm)
  weight?: string | number; // Berat Badan (kg)
  bmi?: number; // Indeks Massa Tubuh (IMT)
  bmiCategory?: 'Berat Badan Kurang' | 'Normal / Ideal' | 'Overweight' | 'Obesitas' | '';
}

export interface SupportingDocument {
  id: string;
  title: string; // Keterangan dokumen (e.g., "Hasil MRI Lumbal L4-L5", "Foto Rontgen AP/Lat")
  url: string; // Link Google Drive atau tautan dokumen eksternal
  notes?: string; // Catatan interpretasi klinis / ekspertise
  addedAt?: string; // ISO string
  // Optional backward compatibility fields
  name?: string;
  fileType?: string;
  fileSize?: number;
  dataUrl?: string;
  uploadedAt?: string;
}

export interface Patient {
  id: string;
  mrn: string; // e.g. "RM-00001"
  fullName: string;
  dob: string; // YYYY-MM-DD
  age: number;
  gender: Gender;
  phone: string;
  address: string;
  diagnosis: string;
  mainComplaint: string;
  currentMedicalHistory?: string; // Riwayat Penyakit Sekarang (RPS)

  // 6 Domain ICF (International Classification of Functioning, Disability and Health)
  bodyFunction?: string; // 1. Body Function (Fungsi Tubuh / Fisiologis)
  bodyStructure?: string; // 2. Body Structure (Struktur Tubuh / Anatomi)
  activityLimitation?: string; // 3. Activity Limitation (Keterbatasan Aktivitas)
  participationRestriction?: string; // 4. Participation Restriction (Restriksi Partisipasi)
  personalFactor?: string; // 5. Personal Factor (Faktor Personal / Individu)
  environmentalFactor?: string; // 6. Environmental Factor (Faktor Lingkungan)

  // TTV (Tanda-Tanda Vital & Antropometri)
  vitalSigns?: VitalSigns;

  // Data Penunjang (Upload file rontgen, MRI, lab, dsb)
  supportingDocs?: SupportingDocument[];

  additionalNotes?: string;
  createdAt: string; // ISO date string
  updatedAt: string;
  // Computed & synchronized fields
  totalVisits: number;
  lastVisitDate?: string;
  lastLocation?: TherapyLocation;
  lastTherapist?: string;
  totalSpending: number;
  outstandingBalance: number;
  lastPaymentStatus?: PaymentStatus;
}

export interface TherapyVisit {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  visitNumber: number; // 1, 2, 3...
  date: string; // YYYY-MM-DD
  location: TherapyLocation;
  therapist: string; // e.g. "Bintang"
  interventions: string[]; // e.g. ["IR", "TENS", "Massage", "Stretching"]
  customInterventions?: string[];
  soap: SoapNote;
  payment: PaymentRecord;
  createdAt: string;
  updatedAt: string;
}

export interface Therapist {
  id: string;
  name: string;
  phone?: string;
  isDefault?: boolean;
  active: boolean;
}

export interface AppSettings {
  defaultTherapist: string;
  therapists: string[];
  availableInterventions: string[];
  defaultPricing: {
    therapyPriceHomeCare: number;
    therapyPriceClinic: number;
    defaultTransport: number;
  };
  theme: ThemeMode;
  clinicInfo: {
    name: string;
    tagline: string;
    address: string;
    phone: string;
    strNumber?: string;
  };
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
  duration?: number;
}

export type ActiveView = 
  | 'dashboard'
  | 'patients'
  | 'patient-profile'
  | 'therapy-history'
  | 'reports'
  | 'settings'
  | 'add-patient';

export interface DashboardStats {
  totalPatients: number;
  patientsToday: number;
  totalTherapyVisits: number;
  homeCareVisits: number;
  clinicVisits: number;
  unpaidTransactions: number;
  todayRevenue: number;
  thisMonthRevenue: number;
  outstandingBalanceTotal: number;
  therapyRevenueTotal: number;
  transportRevenueTotal: number;
}

export interface PatientFilterOptions {
  searchQuery: string;
  location: 'all' | 'Home Care' | 'Klinik';
  therapist: string;
  paymentStatus: 'all' | PaymentStatus;
  sortBy: 'newestDate' | 'name' | 'mrn' | 'totalVisits';
  startDate?: string;
  endDate?: string;
}

export interface ReportFilterOptions {
  startDate: string;
  endDate: string;
  therapist: string;
  location: 'all' | 'Home Care' | 'Klinik';
}
