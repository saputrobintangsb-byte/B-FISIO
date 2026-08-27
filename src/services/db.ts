import { Patient, TherapyVisit, AppSettings, DashboardStats } from '../types';
import { getTodayDateString } from '../utils/formatters';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db, isFirebaseReady, firebaseConfig } from './firebase';

function cleanForFirestore<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  const result: any = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object') {
        result[key] = cleanForFirestore(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result as T;
}

const DB_NAME = 'BFisioAppDB';
const DB_VERSION = 1;

const DEFAULT_INTERVENTIONS = [
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

const DEFAULT_SETTINGS: AppSettings = {
  defaultTherapist: 'Bintang',
  therapists: ['Bintang', 'Nurul', 'Dimas', 'Sarah'],
  availableInterventions: DEFAULT_INTERVENTIONS,
  defaultPricing: {
    therapyPriceHomeCare: 200000,
    therapyPriceClinic: 150000,
    defaultTransport: 35000,
  },
  theme: 'system',
  clinicInfo: {
    name: 'B Fisio Clinic & Home Care',
    tagline: 'Layanan Fisioterapi Profesional & Terpercaya',
    address: 'Jl. Pemuda No. 45, Jakarta Pusat',
    phone: '0812-3456-7890',
    strNumber: 'STR.Fisio.2024.08912',
  },
};

// Seed sample patient data for realistic first-time experience
const SEED_PATIENTS: Patient[] = [
  {
    id: 'p-seed-1',
    mrn: 'RM-00001',
    fullName: 'Bambang Supriyanto',
    dob: '1974-05-12',
    age: 52,
    gender: 'L',
    phone: '081289123456',
    address: 'Jl. Mawar No. 14, Tebet, Jakarta Selatan',
    diagnosis: 'Low Back Pain e.c. Hernia Nukleus Pulposus (HNP L4-L5)',
    mainComplaint: 'Nyeri punggung bawah menjalar ke tungkai kanan, VAS 7/10',
    currentMedicalHistory: 'Nyeri dirasakan memberat sejak 3 minggu lalu setelah mengangkat galon air. Nyeri bertambah tajam saat duduk lama di depan laptop dan berkurang saat berbaring lurus.',
    bodyFunction: 'Nyeri gerak fleksi lumbal VAS 7/10, spasme m. erector spinae dan m. piriformis dextra, hipomobilitas segmen lumbal bawah L4-L5.',
    bodyStructure: 'Diskus intervertebralis L4-L5, facet joint lumbal, radiks saraf ischiadicus segmen dextra.',
    activityLimitation: 'Keterbatasan saat duduk tegak > 30 menit, kesulitan membungkuk saat wudhu / memakai celana, gangguan transfer dari duduk ke berdiri.',
    participationRestriction: 'Tidak dapat bekerja lembur di kantor, terganggu saat mengemudi mobil harian, sholat terpaksa menggunakan kursi.',
    personalFactor: 'Pria usia 52 tahun, pekerjaan software engineer dengan gaya hidup sedentari, motivasi kesembuhan tinggi.',
    environmentalFactor: 'Kursi kerja di kantor non-ergonomis, kamar tidur berada di lantai 2 perlu menaiki tangga.',
    vitalSigns: {
      bloodPressure: '125/80',
      heartRate: 76,
      respiratoryRate: 18,
      spo2: 98,
      temperature: 36.5,
      height: 175,
      weight: 75,
      bmi: 24.5,
      bmiCategory: 'Overweight',
    },
    supportingDocs: [
      {
        id: 'doc-seed-1',
        title: 'Hasil MRI Lumbal L4-L5',
        url: 'https://drive.google.com/file/d/1aB2c3D4e5F6g7H8i9J0kLmNoPqRsTuVw/view?usp=sharing',
        notes: 'Kesan: Protusio diskus intervertebralis L4-L5 menekan thecal sac kanan',
        addedAt: '2026-08-01T08:30:00.000Z',
      },
      {
        id: 'doc-seed-2',
        title: 'Foto Rontgen Vertebra Lumbosakral AP/Lat',
        url: 'https://drive.google.com/file/d/1XyZ9876543210AbCdEfGhIjKlMnOpQrS/view?usp=sharing',
        notes: 'Alignment lordotik berkurang (spasmus paravertebral), penyempitan disk space L4-L5',
        addedAt: '2026-08-01T08:45:00.000Z',
      }
    ],
    additionalNotes: 'Pasien pekerja kantoran, duduk lama > 8 jam/hari',
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: '2026-08-25T10:00:00.000Z',
    totalVisits: 3,
    lastVisitDate: '2026-08-25',
    lastLocation: 'Home Care',
    lastTherapist: 'Bintang',
    totalSpending: 705000,
    outstandingBalance: 0,
    lastPaymentStatus: 'Lunas',
  },
  {
    id: 'p-seed-2',
    mrn: 'RM-00002',
    fullName: 'Siti Rahmawati',
    dob: '1968-11-20',
    age: 57,
    gender: 'P',
    phone: '081399887766',
    address: 'Jl. Kenanga No. 8, Rawamangun, Jakarta Timur',
    diagnosis: 'Frozen Shoulder Sinistra (Adhesive Capsulitis)',
    mainComplaint: 'Bahu kiri kaku, nyeri saat mengangkat tangan dan menyisir rambut',
    currentMedicalHistory: 'Keluhan kaku dan nyeri bahu kiri dirasakan sejak 1 bulan lalu tanpa riwayat trauma. Nyeri sering terasa menusuk pada malam hari terutama saat tidur miring ke sisi kiri.',
    bodyFunction: 'Keterbatasan ROM aktif dan pasif glenohumeral (fleksi 100°, abduksi 85°, eksorotasi 20°), nyeri end-feel capsular VAS 6/10.',
    bodyStructure: 'Kapsul artikular sendi glenohumeral sinistra, bursa subacromial, m. rotator cuff.',
    activityLimitation: 'Kesulitan menyisir rambut, mengenakan bra, memakai baju kaos, dan meraih dompet di saku belakang.',
    participationRestriction: 'Terganggu saat berbelanja di pasar swalayan dan tidak dapat mengikuti senam lansia mingguan.',
    personalFactor: 'Wanita usia 57 tahun, ibu rumah tangga, ada riwayat diabetes melitus tipe 2 terkontrol.',
    environmentalFactor: 'Lemari dapur posisinya tinggi sehingga sulit dijangkau dengan tangan kiri.',
    vitalSigns: {
      bloodPressure: '130/85',
      heartRate: 82,
      respiratoryRate: 20,
      spo2: 97,
      temperature: 36.6,
      height: 155,
      weight: 52,
      bmi: 21.6,
      bmiCategory: 'Normal / Ideal',
    },
    additionalNotes: 'Ada riwayat DM terkontrol',
    createdAt: '2026-08-05T09:00:00.000Z',
    updatedAt: '2026-08-26T14:30:00.000Z',
    totalVisits: 4,
    lastVisitDate: '2026-08-26',
    lastLocation: 'Klinik',
    lastTherapist: 'Bintang',
    totalSpending: 600000,
    outstandingBalance: 150000,
    lastPaymentStatus: 'DP',
  },
  {
    id: 'p-seed-3',
    mrn: 'RM-00003',
    fullName: 'Hendro Wijaya',
    dob: '1959-03-15',
    age: 67,
    gender: 'L',
    phone: '08176543210',
    address: 'Jl. Cempaka Putih Tengah No. 22',
    diagnosis: 'Post Stroke Non-Hemoragik Fase Recovery (Hemiparese Dextra)',
    mainComplaint: 'Kelemahan anggota gerak kanan, gangguan pola jalan dan transfer',
    currentMedicalHistory: 'Pasien mengalami stroke non-hemoragik 2 bulan lalu. Sempat dirawat inap di RS selama 10 hari, saat ini menjalani program pemulihan fisioterapi home care.',
    bodyFunction: 'Penurunan kekuatan otot ekstremitas superior dan inferior dextra (MMT 3/5), spastisitas fleksor siku MAS 1+, gangguan keseimbangan dinamis.',
    bodyStructure: 'Hemisfer serebri sinistra (traktus kortikospinalis), sendi ankle & shoulder dextra.',
    activityLimitation: 'Keterbatasan ambulasi mandiri, butuh bantuan alat bantu quadripod cane dan pendamping saat berjalan > 15 meter.',
    participationRestriction: 'Belum mampu menghadiri pertemuan keluarga besar atau rekreasi luar rumah secara mandiri.',
    personalFactor: 'Pria usia 67 tahun, pensiunan PNS, sangat bersemangat dan kooperatif dengan latihan.',
    environmentalFactor: 'Rumah lantai 1 tanpa undakan, toilet sudah dipasangi pegangan tangan (grab bar) oleh keluarga.',
    vitalSigns: {
      bloodPressure: '135/85',
      heartRate: 78,
      respiratoryRate: 19,
      spo2: 99,
      temperature: 36.4,
      height: 168,
      weight: 64,
      bmi: 22.7,
      bmiCategory: 'Normal / Ideal',
    },
    additionalNotes: 'Onset stroke 2 bulan lalu, tensi rutin dipantau',
    createdAt: '2026-08-10T10:00:00.000Z',
    updatedAt: '2026-08-27T09:00:00.000Z',
    totalVisits: 5,
    lastVisitDate: '2026-08-27',
    lastLocation: 'Home Care',
    lastTherapist: 'Bintang',
    totalSpending: 1175000,
    outstandingBalance: 0,
    lastPaymentStatus: 'Lunas',
  },
  {
    id: 'p-seed-4',
    mrn: 'RM-00004',
    fullName: 'Dewi Lestari',
    dob: '1995-08-04',
    age: 31,
    gender: 'P',
    phone: '085712345678',
    address: 'Apartemen Menteng Square Tower A, Lt 12',
    diagnosis: 'Post Rekonstruksi ACL Dextra (Week 6 Post-Op)',
    mainComplaint: 'Defisit ekstensi penuh lutut kanan, atrofi m. quadriceps',
    currentMedicalHistory: 'Cedera ligamen ACL dialami saat bermain bulutangkis 3 bulan lalu. Tindakan rekonstruksi arthroskopi dilakukan 6 minggu lalu, saat ini fase penguatan dan pemulihan fungsional.',
    bodyFunction: 'Defisit ekstensi lutut kanan 5°, ROM fleksi 85°, kelemahan otot quadriceps (MMT 3/5), efusi intraartikular minimal.',
    bodyStructure: 'Graft ACL dextra (hamstring tendon autograft), patella dan sendi tibiofemoralis dextra.',
    activityLimitation: 'Kesulitan menuruni tangga dan belum diizinkan berlari / melompat (cutting movement).',
    participationRestriction: 'Belum dapat kembali berkompetisi bulutangkis komunitas.',
    personalFactor: 'Wanita usia 31 tahun, atlet amatir, disiplin tinggi terhadap home program.',
    environmentalFactor: 'Akses lift apartemen lancar, memiliki fasilitas gym di gedung untuk latihan beban.',
    vitalSigns: {
      bloodPressure: '110/70',
      heartRate: 68,
      respiratoryRate: 16,
      spo2: 99,
      temperature: 36.5,
      height: 165,
      weight: 54,
      bmi: 19.8,
      bmiCategory: 'Normal / Ideal',
    },
    additionalNotes: 'Atlet bulutangkis amatir, target return to sport',
    createdAt: '2026-08-15T11:00:00.000Z',
    updatedAt: '2026-08-24T16:00:00.000Z',
    totalVisits: 2,
    lastVisitDate: '2026-08-24',
    lastLocation: 'Klinik',
    lastTherapist: 'Dimas',
    totalSpending: 300000,
    outstandingBalance: 0,
    lastPaymentStatus: 'Lunas',
  },
  {
    id: 'p-seed-5',
    mrn: 'RM-00005',
    fullName: 'Agus Pratama',
    dob: '1988-02-14',
    age: 38,
    gender: 'L',
    phone: '087812987654',
    address: 'Jl. Danau Sunter Barat No. 5',
    diagnosis: 'Cervical Root Syndrome / Radikulopati Servikal C5-C6',
    mainComplaint: 'Nyeri leher menjalar ke bahu dan lengan kanan, kesemutan di ibu jari',
    currentMedicalHistory: 'Nyeri leher kanan menusuk dan kesemutan muncul mendadak 5 hari lalu setelah bekerja lembur menatap monitor laptop dengan posisi menunduk lama.',
    bodyFunction: 'Spurling test positif dextra, spasme m. upper trapezius dan m. levator scapulae dextra, ROM rotasi servikal dextra terbatas nyeri VAS 7/10.',
    bodyStructure: 'Foramen intervertebralis servikal C5-C6 dextra, diskus servikalis, radiks saraf C6.',
    activityLimitation: 'Sulit menoleh ke kanan saat mengemudi kendaraan bermotor, nyeri saat menunduk menatap ponsel.',
    participationRestriction: 'Terganggu fokus kerja pemrograman komputer dan terhambat saat mengendarai mobil.',
    personalFactor: 'Pria usia 38 tahun, software engineer, kebiasaan postur forward head posture.',
    environmentalFactor: 'Posisi monitor laptop terlalu rendah, belum memakai stand laptop eksternal.',
    vitalSigns: {
      bloodPressure: '120/80',
      heartRate: 75,
      respiratoryRate: 18,
      spo2: 98,
      temperature: 36.6,
      height: 172,
      weight: 80,
      bmi: 27.0,
      bmiCategory: 'Obesitas',
    },
    additionalNotes: 'Pekerjaan IT software engineer',
    createdAt: '2026-08-18T13:00:00.000Z',
    updatedAt: '2026-08-27T10:30:00.000Z',
    totalVisits: 1,
    lastVisitDate: '2026-08-27',
    lastLocation: 'Home Care',
    lastTherapist: 'Bintang',
    totalSpending: 235000,
    outstandingBalance: 0,
    lastPaymentStatus: 'Lunas',
  }
];

const SEED_VISITS: TherapyVisit[] = [
  // Bambang Supriyanto visits
  {
    id: 'v-seed-1',
    patientId: 'p-seed-1',
    patientName: 'Bambang Supriyanto',
    mrn: 'RM-00001',
    visitNumber: 1,
    date: '2026-08-01',
    location: 'Home Care',
    therapist: 'Bintang',
    interventions: ['IR', 'TENS', 'Massage', 'Stretching'],
    soap: {
      subjective: 'Pasien mengeluh nyeri punggung bawah sejak 2 minggu lalu. Nyeri tajam menjalar ke paha dan betis kanan. VAS diam 3/10, VAS gerak 7/10.',
      objective: 'SLR test (+) 45° dextra. Spasme m. erector spinae lumbal, m. piriformis (+). ROM fleksi lumbal terbatas nyeri.',
      assessment: 'Impairment nyeri dan keterbatasan gerak lumbal e.c. HNP L4-L5 susp radikulopati.',
      plan: 'IR lumbal 15 mnt, TENS konvensional 15 mnt, myofascial release gluteal & piriformis, gentle hamstring & piriformis stretching. Edukasi postur duduk.',
    },
    payment: {
      therapyPrice: 200000,
      transport: 35000,
      discount: 0,
      total: 235000,
      status: 'Lunas',
      paidAmount: 235000,
      remainingBalance: 0,
      notes: 'Transfer BCA',
    },
    createdAt: '2026-08-01T08:30:00.000Z',
    updatedAt: '2026-08-01T08:30:00.000Z',
  },
  {
    id: 'v-seed-2',
    patientId: 'p-seed-1',
    patientName: 'Bambang Supriyanto',
    mrn: 'RM-00001',
    visitNumber: 2,
    date: '2026-08-12',
    location: 'Home Care',
    therapist: 'Bintang',
    interventions: ['IR', 'TENS', 'Massage', 'Stretching', 'Core Exercise'],
    soap: {
      subjective: 'Nyeri berkurang, VAS diam 1/10, VAS gerak 4/10. Penjalaran ke betis sudah minimal. Duduk 1 jam terasa jauh lebih nyaman.',
      objective: 'SLR test (+) 65° dextra. Spasme lumbal menurun. Mobilitas lumbal membaik.',
      assessment: 'Progres positif, penurunan intensitas nyeri dan peningkatan toleransi aktivitas duduk.',
      plan: 'Lanjutkan IR + TENS, latihan stabilisasi core (pelvic tilt, bird-dog ringan, bridging), peregangan lower extremity.',
    },
    payment: {
      therapyPrice: 200000,
      transport: 35000,
      discount: 0,
      total: 235000,
      status: 'Lunas',
      paidAmount: 235000,
      remainingBalance: 0,
      notes: 'Tunai',
    },
    createdAt: '2026-08-12T09:00:00.000Z',
    updatedAt: '2026-08-12T09:00:00.000Z',
  },
  {
    id: 'v-seed-3',
    patientId: 'p-seed-1',
    patientName: 'Bambang Supriyanto',
    mrn: 'RM-00001',
    visitNumber: 3,
    date: '2026-08-25',
    location: 'Home Care',
    therapist: 'Bintang',
    interventions: ['TENS', 'Massage', 'Stretching', 'Strengthening Exercise', 'Core Exercise'],
    soap: {
      subjective: 'Pasien merasa jauh lebih bugar. Nyeri menjalar sudah hilang total. Hanya pegal ringan setelah lembur.',
      objective: 'SLR (-) 80°. ROM lumbal full, MMT core 4/5. Kekuatan otot gluteus membaik.',
      assessment: 'Pemulihan fungsional tercapai > 80%. Stabilitas lumbopelvic stabil.',
      plan: 'Program penguatan fungsional lanjut, dead-bug exercise, plank modifikasi, home exercise maintenance 3x seminggu.',
    },
    payment: {
      therapyPrice: 200000,
      transport: 35000,
      discount: 0,
      total: 235000,
      status: 'Lunas',
      paidAmount: 235000,
      remainingBalance: 0,
      notes: 'QRIS',
    },
    createdAt: '2026-08-25T10:00:00.000Z',
    updatedAt: '2026-08-25T10:00:00.000Z',
  },

  // Siti Rahmawati visits
  {
    id: 'v-seed-4',
    patientId: 'p-seed-2',
    patientName: 'Siti Rahmawati',
    mrn: 'RM-00002',
    visitNumber: 1,
    date: '2026-08-05',
    location: 'Klinik',
    therapist: 'Bintang',
    interventions: ['IR', 'US', 'Massage', 'PROM', 'Stretching'],
    soap: {
      subjective: 'Nyeri dan kaku bahu kiri sejak 1 bulan, makin berat saat tidur miring ke kiri. VAS 6/10.',
      objective: 'Kapsular pattern (+). ROM fleksi bahu kiri 100°, abduksi 85°, eksorotasi 20°. End-feel firm capsular.',
      assessment: 'Adhesive Capsulitis Sinistra fase freezing/frozen.',
      plan: 'IR 15 mnt, US kontinuitas 1.5 W/cm2 pada anterior & posterior kapsul, mobilisasi sendi glenohumeral grade II-III, codman pendulum exercise, finger ladder.',
    },
    payment: {
      therapyPrice: 150000,
      transport: 0,
      discount: 0,
      total: 150000,
      status: 'Lunas',
      paidAmount: 150000,
      remainingBalance: 0,
    },
    createdAt: '2026-08-05T09:30:00.000Z',
    updatedAt: '2026-08-05T09:30:00.000Z',
  },
  {
    id: 'v-seed-5',
    patientId: 'p-seed-2',
    patientName: 'Siti Rahmawati',
    mrn: 'RM-00002',
    visitNumber: 2,
    date: '2026-08-12',
    location: 'Klinik',
    therapist: 'Bintang',
    interventions: ['IR', 'US', 'PROM', 'AROM', 'Stretching'],
    soap: {
      subjective: 'Nyeri malam hari berkurang, sudah bisa tidur lebih nyenyak.',
      objective: 'ROM fleksi 115°, abduksi 100°, eksorotasi 30°. Nyeri akhir gerak VAS 4/10.',
      assessment: 'Peningkatan ROM bertahap dan penurunan nyeri istirahat.',
      plan: 'Lanjutkan US & mobilisasi glenohumeral, latihan active assisted tongkat, peregangan kapsul posterior.',
    },
    payment: {
      therapyPrice: 150000,
      transport: 0,
      discount: 0,
      total: 150000,
      status: 'Lunas',
      paidAmount: 150000,
      remainingBalance: 0,
    },
    createdAt: '2026-08-12T10:00:00.000Z',
    updatedAt: '2026-08-12T10:00:00.000Z',
  },
  {
    id: 'v-seed-6',
    patientId: 'p-seed-2',
    patientName: 'Siti Rahmawati',
    mrn: 'RM-00002',
    visitNumber: 3,
    date: '2026-08-19',
    location: 'Klinik',
    therapist: 'Bintang',
    interventions: ['US', 'Massage', 'PROM', 'AROM', 'Strengthening Exercise'],
    soap: {
      subjective: 'Pasien sudah bisa mengenakan baju sendiri tanpa bantuan signifikan.',
      objective: 'ROM fleksi 135°, abduksi 125°, eksorotasi 45°. Kekuatan rotator cuff 3+/5.',
      assessment: 'Fase thawing, mobilitas fungsional membaik nyata.',
      plan: 'US bicipital & subscapular, perbaikan scapulohumeral rhythm, latihan theraband ringan rotasi eksterna.',
    },
    payment: {
      therapyPrice: 150000,
      transport: 0,
      discount: 0,
      total: 150000,
      status: 'Lunas',
      paidAmount: 150000,
      remainingBalance: 0,
    },
    createdAt: '2026-08-19T10:30:00.000Z',
    updatedAt: '2026-08-19T10:30:00.000Z',
  },
  {
    id: 'v-seed-7',
    patientId: 'p-seed-2',
    patientName: 'Siti Rahmawati',
    mrn: 'RM-00002',
    visitNumber: 4,
    date: '2026-08-26',
    location: 'Klinik',
    therapist: 'Bintang',
    interventions: ['US', 'Massage', 'PNF', 'Strengthening Exercise'],
    soap: {
      subjective: 'Keluhan kaku jauh berkurang, mampu menyisir rambut dan meraih benda di atas lemari.',
      objective: 'ROM fleksi 160°, abduksi 150°, eksorotasi 65°. Scapular dyskinesis minimal.',
      assessment: 'Target mobilitas fungsional tercapai > 90%.',
      plan: 'PNF pattern D2 fleksi-abduksi-eksorotasi, strengthening rotator cuff & periscapular, edukasi postur.',
    },
    payment: {
      therapyPrice: 150000,
      transport: 0,
      discount: 0,
      total: 150000,
      status: 'DP',
      paidAmount: 0,
      remainingBalance: 150000,
      notes: 'DP Kunjungan paket, sisa diselesaikan minggu depan',
    },
    createdAt: '2026-08-26T14:30:00.000Z',
    updatedAt: '2026-08-26T14:30:00.000Z',
  },

  // Hendro Wijaya (Stroke) visits
  {
    id: 'v-seed-8',
    patientId: 'p-seed-3',
    patientName: 'Hendro Wijaya',
    mrn: 'RM-00003',
    visitNumber: 1,
    date: '2026-08-10',
    location: 'Home Care',
    therapist: 'Bintang',
    interventions: ['Bobath', 'PNF', 'PROM', 'AROM', 'Breathing Exercise'],
    soap: {
      subjective: 'Keluarga menyatakan pasien kesulitan berdiri dari kursi roda dan tangan kanan lemah.',
      objective: 'BBS (Berg Balance Scale) 22/56. MMT extremitas superior dextra 2/5, inferior 3/5. Spastisitas m. biceps MAS 1+.',
      assessment: 'Hemiparese dextra e.c. Stroke Non-Hemoragik dengan gangguan transfer & keseimbangan duduk-ke-berdiri.',
      plan: 'Pendekatan Bobath (inhibisi spastisitas, fasilitasi weight bearing kanan), latihan sit-to-stand terkontrol, edukasi keluarga positioning di tempat tidur.',
    },
    payment: {
      therapyPrice: 200000,
      transport: 35000,
      discount: 0,
      total: 235000,
      status: 'Lunas',
      paidAmount: 235000,
      remainingBalance: 0,
    },
    createdAt: '2026-08-10T10:30:00.000Z',
    updatedAt: '2026-08-10T10:30:00.000Z',
  },
  {
    id: 'v-seed-9',
    patientId: 'p-seed-3',
    patientName: 'Hendro Wijaya',
    mrn: 'RM-00003',
    visitNumber: 2,
    date: '2026-08-14',
    location: 'Home Care',
    therapist: 'Bintang',
    interventions: ['Bobath', 'PNF', 'Strengthening Exercise', 'Core Exercise'],
    soap: {
      subjective: 'Pasien mulai bisa menumpu berat badan di kaki kanan saat mandi didampingi.',
      objective: 'Kontrol trunk statis dan dinamis membaik. MMT tungkai kanan 3+/5.',
      assessment: 'Peningkatan kontrol postural dan motorik ekstremitas bawah.',
      plan: 'Latihan stepping forward/backward, weight shift latihan berdiri di paralel bar/kursi, stimulasi dorsofleksi ankle kanan.',
    },
    payment: {
      therapyPrice: 200000,
      transport: 35000,
      discount: 0,
      total: 235000,
      status: 'Lunas',
      paidAmount: 235000,
      remainingBalance: 0,
    },
    createdAt: '2026-08-14T11:00:00.000Z',
    updatedAt: '2026-08-14T11:00:00.000Z',
  },
  {
    id: 'v-seed-10',
    patientId: 'p-seed-3',
    patientName: 'Hendro Wijaya',
    mrn: 'RM-00003',
    visitNumber: 3,
    date: '2026-08-18',
    location: 'Home Care',
    therapist: 'Bintang',
    interventions: ['Bobath', 'PNF', 'Strengthening Exercise', 'AROM'],
    soap: {
      subjective: 'Pasien mulai latihan jalan di dalam rumah dengan quadripod cane (tongkat kaki 4).',
      objective: 'Pola jalan hemiplegik berkurang, hip circumduction minimal. BBS 34/56.',
      assessment: 'Peningkatan kemandirian ambulasi dengan alat bantu.',
      plan: 'Gait training koreksi fase stance kanan, stimulasi grasping & releasing tangan kanan, PNF arm pattern.',
    },
    payment: {
      therapyPrice: 200000,
      transport: 35000,
      discount: 0,
      total: 235000,
      status: 'Lunas',
      paidAmount: 235000,
      remainingBalance: 0,
    },
    createdAt: '2026-08-18T10:00:00.000Z',
    updatedAt: '2026-08-18T10:00:00.000Z',
  },
  {
    id: 'v-seed-11',
    patientId: 'p-seed-3',
    patientName: 'Hendro Wijaya',
    mrn: 'RM-00003',
    visitNumber: 4,
    date: '2026-08-22',
    location: 'Home Care',
    therapist: 'Bintang',
    interventions: ['Bobath', 'PNF', 'Strengthening Exercise', 'Tapping'],
    soap: {
      subjective: 'Pasien jalan 20 meter mandiri diawasi keluarga. Koordinasi lengan kanan mulai aktif.',
      objective: 'MMT deltoid & biceps 3+/5, hand grip 3/5. Keseimbangan dinamis meningkat.',
      assessment: 'Progres pemulihan motorik tahap IV Brunnstrom.',
      plan: 'Kinesio taping stabilisasi bahu kanan, fine motor training, rintangan jalan kecil untuk stepping control.',
    },
    payment: {
      therapyPrice: 200000,
      transport: 35000,
      discount: 0,
      total: 235000,
      status: 'Lunas',
      paidAmount: 235000,
      remainingBalance: 0,
    },
    createdAt: '2026-08-22T10:30:00.000Z',
    updatedAt: '2026-08-22T10:30:00.000Z',
  },
  {
    id: 'v-seed-12',
    patientId: 'p-seed-3',
    patientName: 'Hendro Wijaya',
    mrn: 'RM-00003',
    visitNumber: 5,
    date: '2026-08-27',
    location: 'Home Care',
    therapist: 'Bintang',
    interventions: ['Bobath', 'PNF', 'Strengthening Exercise', 'Breathing Exercise'],
    soap: {
      subjective: 'Pasien merasa semangat, sudah dapat berjalan ke teras rumah sendiri.',
      objective: 'BBS 42/56. Pola transfer mandiri. Fleksi elbow dan ekstensi wrist aktif.',
      assessment: 'Fungsi ambulasi mandiri dan aktivitas hidup harian (ADL) membaik signifikan.',
      plan: 'Latihan naik-turun tangga satu step dengan rail, task-oriented functional training, home exercise rutin.',
    },
    payment: {
      therapyPrice: 200000,
      transport: 35000,
      discount: 0,
      total: 235000,
      status: 'Lunas',
      paidAmount: 235000,
      remainingBalance: 0,
    },
    createdAt: '2026-08-27T09:00:00.000Z',
    updatedAt: '2026-08-27T09:00:00.000Z',
  },

  // Dewi Lestari (ACL Post-Op)
  {
    id: 'v-seed-13',
    patientId: 'p-seed-4',
    patientName: 'Dewi Lestari',
    mrn: 'RM-00004',
    visitNumber: 1,
    date: '2026-08-15',
    location: 'Klinik',
    therapist: 'Dimas',
    interventions: ['TENS', 'US', 'Strengthening Exercise', 'PROM', 'Kompres Es'],
    soap: {
      subjective: 'Post operasi ACL 4 minggu lalu. Masih ada bengkak ringan, lutut kaku saat ditekuk.',
      objective: 'ROM lutut fleksi 85°, ekstensi -5° (defisit 5°). Lingkar sendi +1 cm vs sisi sehat. MMT quad 3/5.',
      assessment: 'Post Op ACL Reconstruction Hamstring Autograft fase II.',
      plan: 'Cryotherapy + TENS, patellar mobilization superior/inferior, prone hang untuk ekstensi penuh, heel slides, SLR quad set.',
    },
    payment: {
      therapyPrice: 150000,
      transport: 0,
      discount: 0,
      total: 150000,
      status: 'Lunas',
      paidAmount: 150000,
      remainingBalance: 0,
    },
    createdAt: '2026-08-15T11:30:00.000Z',
    updatedAt: '2026-08-15T11:30:00.000Z',
  },
  {
    id: 'v-seed-14',
    patientId: 'p-seed-4',
    patientName: 'Dewi Lestari',
    mrn: 'RM-00004',
    visitNumber: 2,
    date: '2026-08-24',
    location: 'Klinik',
    therapist: 'Dimas',
    interventions: ['TENS', 'Strengthening Exercise', 'AROM', 'Kompres Es'],
    soap: {
      subjective: 'Bengkak hilang, fleksi sudah terasa lebih leluasa.',
      objective: 'ROM fleksi 115°, ekstensi 0° (simetris). Quad lag (-). MMT quad 4/5.',
      assessment: 'Ekstensi penuh tercapai, kontrol quadriceps baik.',
      plan: 'Stationary bike tanpa resistensi 10 mnt, closed kinetic chain (leg press beban ringan, wall squat 45°), proprioceptive balance board.',
    },
    payment: {
      therapyPrice: 150000,
      transport: 0,
      discount: 0,
      total: 150000,
      status: 'Lunas',
      paidAmount: 150000,
      remainingBalance: 0,
    },
    createdAt: '2026-08-24T16:00:00.000Z',
    updatedAt: '2026-08-24T16:00:00.000Z',
  },

  // Agus Pratama (Cervical)
  {
    id: 'v-seed-15',
    patientId: 'p-seed-5',
    patientName: 'Agus Pratama',
    mrn: 'RM-00005',
    visitNumber: 1,
    date: '2026-08-27',
    location: 'Home Care',
    therapist: 'Bintang',
    interventions: ['IR', 'TENS', 'Massage', 'Stretching', 'Tapping'],
    soap: {
      subjective: 'Nyeri leher kanan menusuk menjalar ke bahu dan ibu jari sejak 5 hari lalu. Sulit menoleh ke kanan saat berkendara. VAS 7/10.',
      objective: 'Spurling test (+) dextra, Distraction test (+) meredakan nyeri. Spasme berat m. upper trapezius & levator scapulae dextra. ROM rotasi servikal dextra 30°.',
      assessment: 'Cervical Root Syndrome C5-C6 dextra susp disc protrusion.',
      plan: 'IR servikal posterior 15 mnt, TENS servikobrakialis 15 mnt, deep friction massage trapezius, gentle manual traction servikal, chin-tuck exercise, kinesio tape decompressive.',
    },
    payment: {
      therapyPrice: 200000,
      transport: 35000,
      discount: 0,
      total: 235000,
      status: 'Lunas',
      paidAmount: 235000,
      remainingBalance: 0,
      notes: 'Transfer Bank Jago',
    },
    createdAt: '2026-08-27T10:30:00.000Z',
    updatedAt: '2026-08-27T10:30:00.000Z',
  }
];

class DatabaseService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported in this browser'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const localDb = (event.target as IDBOpenDBRequest).result;
        if (!localDb.objectStoreNames.contains('patients')) {
          const patientStore = localDb.createObjectStore('patients', { keyPath: 'id' });
          patientStore.createIndex('mrn', 'mrn', { unique: true });
          patientStore.createIndex('fullName', 'fullName', { unique: false });
          patientStore.createIndex('phone', 'phone', { unique: false });
        }

        if (!localDb.objectStoreNames.contains('visits')) {
          const visitStore = localDb.createObjectStore('visits', { keyPath: 'id' });
          visitStore.createIndex('patientId', 'patientId', { unique: false });
          visitStore.createIndex('date', 'date', { unique: false });
        }

        if (!localDb.objectStoreNames.contains('settings')) {
          localDb.createObjectStore('settings', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        console.error('IndexedDB open error:', event);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });

    return this.dbPromise;
  }

  // Check cloud connection status
  getCloudStatus(): { isCloud: boolean; projectId: string; databaseId?: string } {
    return {
      isCloud: isFirebaseReady && !!db,
      projectId: firebaseConfig?.projectId || 'Local',
      databaseId: firebaseConfig?.firestoreDatabaseId,
    };
  }

  // Initializer: check Firestore first, seed if empty
  async init(): Promise<void> {
    if (isFirebaseReady && db) {
      try {
        const snap = await getDocs(collection(db, 'patients'));
        if (snap.empty) {
          console.log('Firebase Firestore is connected and empty. Seeding initial data...');
          await this.seedDataToFirestore();
        }
        return;
      } catch (err) {
        console.warn('Firestore initial check error, checking local fallback:', err);
      }
    }

    try {
      const localDb = await this.getDB();
      const patients = await this.getAllPatients();
      if (patients.length === 0) {
        await this.seedData();
      }
    } catch (e) {
      console.warn('Using LocalStorage fallback for B Fisio App:', e);
      if (!localStorage.getItem('bfisio_patients')) {
        localStorage.setItem('bfisio_patients', JSON.stringify(SEED_PATIENTS));
        localStorage.setItem('bfisio_visits', JSON.stringify(SEED_VISITS));
        localStorage.setItem('bfisio_settings', JSON.stringify(DEFAULT_SETTINGS));
      }
    }
  }

  async seedDataToFirestore(): Promise<void> {
    if (!isFirebaseReady || !db) return;
    try {
      const batch = writeBatch(db);
      for (const p of SEED_PATIENTS) {
        const pRef = doc(db, 'patients', p.id);
        batch.set(pRef, cleanForFirestore(p));
      }
      for (const v of SEED_VISITS) {
        const vRef = doc(db, 'visits', v.id);
        batch.set(vRef, cleanForFirestore(v));
      }
      const sRef = doc(db, 'settings', 'app_settings');
      batch.set(sRef, cleanForFirestore({ id: 'app_settings', ...DEFAULT_SETTINGS }));
      await batch.commit();
      console.log('Firebase Firestore seeded successfully!');
    } catch (e) {
      console.error('Error seeding Firebase Firestore:', e);
    }
  }

  async seedData(): Promise<void> {
    if (isFirebaseReady && db) {
      await this.seedDataToFirestore();
    }
    try {
      const localDb = await this.getDB();
      const tx = localDb.transaction(['patients', 'visits', 'settings'], 'readwrite');
      const pStore = tx.objectStore('patients');
      const vStore = tx.objectStore('visits');
      const sStore = tx.objectStore('settings');

      for (const p of SEED_PATIENTS) {
        pStore.put(p);
      }
      for (const v of SEED_VISITS) {
        vStore.put(v);
      }
      sStore.put({ id: 'app_settings', ...DEFAULT_SETTINGS });

      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      localStorage.setItem('bfisio_patients', JSON.stringify(SEED_PATIENTS));
      localStorage.setItem('bfisio_visits', JSON.stringify(SEED_VISITS));
      localStorage.setItem('bfisio_settings', JSON.stringify(DEFAULT_SETTINGS));
    }
  }

  // Real-time listener for patients
  subscribePatients(callback: (patients: Patient[]) => void): () => void {
    if (isFirebaseReady && db) {
      try {
        const unsub = onSnapshot(collection(db, 'patients'), (snapshot) => {
          const list: Patient[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as Patient);
          });
          list.sort((a, b) => (b.lastVisitDate || b.createdAt).localeCompare(a.lastVisitDate || a.createdAt));
          callback(list);
        }, (err) => {
          console.warn('Firestore subscribePatients snapshot error:', err);
        });
        return unsub;
      } catch (err) {
        console.warn('Error creating Firestore patient subscription:', err);
      }
    }
    return () => {};
  }

  // Real-time listener for visits
  subscribeVisits(callback: (visits: TherapyVisit[]) => void): () => void {
    if (isFirebaseReady && db) {
      try {
        const unsub = onSnapshot(collection(db, 'visits'), (snapshot) => {
          const list: TherapyVisit[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as TherapyVisit);
          });
          list.sort((a, b) => b.date.localeCompare(a.date) || b.visitNumber - a.visitNumber);
          callback(list);
        }, (err) => {
          console.warn('Firestore subscribeVisits snapshot error:', err);
        });
        return unsub;
      } catch (err) {
        console.warn('Error creating Firestore visits subscription:', err);
      }
    }
    return () => {};
  }

  // PATIENTS
  async getAllPatients(): Promise<Patient[]> {
    if (isFirebaseReady && db) {
      try {
        const snap = await getDocs(collection(db, 'patients'));
        const list: Patient[] = [];
        snap.forEach((docSnap) => {
          list.push(docSnap.data() as Patient);
        });
        list.sort((a, b) => (b.lastVisitDate || b.createdAt).localeCompare(a.lastVisitDate || a.createdAt));
        try {
          localStorage.setItem('bfisio_patients', JSON.stringify(list));
        } catch {}
        return list;
      } catch (err) {
        console.warn('Firestore getAllPatients error, reading local:', err);
      }
    }

    try {
      const localDb = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = localDb.transaction('patients', 'readonly');
        const store = tx.objectStore('patients');
        const req = store.getAll();
        req.onsuccess = () => {
          const list = req.result as Patient[];
          list.sort((a, b) => (b.lastVisitDate || b.createdAt).localeCompare(a.lastVisitDate || a.createdAt));
          resolve(list);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      const raw = localStorage.getItem('bfisio_patients');
      const list: Patient[] = raw ? JSON.parse(raw) : [];
      list.sort((a, b) => (b.lastVisitDate || b.createdAt).localeCompare(a.lastVisitDate || a.createdAt));
      return list;
    }
  }

  async getPatientById(id: string): Promise<Patient | null> {
    if (isFirebaseReady && db) {
      try {
        const docSnap = await getDoc(doc(db, 'patients', id));
        if (docSnap.exists()) {
          return docSnap.data() as Patient;
        }
      } catch (err) {
        console.warn('Firestore getPatientById error:', err);
      }
    }

    try {
      const localDb = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = localDb.transaction('patients', 'readonly');
        const store = tx.objectStore('patients');
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      const patients = await this.getAllPatients();
      return patients.find(p => p.id === id) || null;
    }
  }

  async searchPatients(queryStr: string): Promise<Patient[]> {
    const list = await this.getAllPatients();
    if (!queryStr || !queryStr.trim()) return list;
    const q = queryStr.toLowerCase().trim();
    return list.filter(p => 
      p.fullName.toLowerCase().includes(q) ||
      p.mrn.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.diagnosis.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q)
    );
  }

  // Duplicate patient detection
  async checkDuplicatePatient(fullName: string, phone: string, excludeId?: string): Promise<Patient | null> {
    const patients = await this.getAllPatients();
    const cleanName = fullName.toLowerCase().trim();
    const cleanPhone = phone.replace(/\D/g, '');

    for (const p of patients) {
      if (excludeId && p.id === excludeId) continue;
      
      const pCleanName = p.fullName.toLowerCase().trim();
      const pCleanPhone = p.phone.replace(/\D/g, '');

      // Check exact phone match or close name match
      if (cleanPhone && pCleanPhone && cleanPhone === pCleanPhone) {
        return p;
      }
      if (cleanName && pCleanName === cleanName) {
        return p;
      }
    }
    return null;
  }

  // Generate Unique sequential Medical Record Number (RM-00001, RM-00002...)
  async generateMRN(): Promise<string> {
    const patients = await this.getAllPatients();
    let maxNumber = 0;
    for (const p of patients) {
      const match = p.mrn.match(/RM-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    }
    const nextNumber = maxNumber + 1;
    return `RM-${String(nextNumber).padStart(5, '0')}`;
  }

  async savePatient(patient: Patient): Promise<Patient> {
    const finalPatient: Patient = {
      ...patient,
      id: patient.id || `p-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      mrn: patient.mrn || (await this.generateMRN()),
      createdAt: patient.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalVisits: patient.totalVisits ?? 0,
      totalSpending: patient.totalSpending ?? 0,
      outstandingBalance: patient.outstandingBalance ?? 0,
    };

    // 1. Write to Firebase Firestore
    if (isFirebaseReady && db) {
      try {
        await setDoc(doc(db, 'patients', finalPatient.id), cleanForFirestore(finalPatient));
      } catch (err) {
        console.error('Firestore savePatient error:', err);
      }
    }

    // 2. Write to local IndexedDB & localStorage
    try {
      const localDb = await this.getDB();
      const tx = localDb.transaction('patients', 'readwrite');
      const store = tx.objectStore('patients');
      store.put(finalPatient);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      const patients = await this.getAllPatients();
      const idx = patients.findIndex(p => p.id === finalPatient.id);
      if (idx >= 0) {
        patients[idx] = finalPatient;
      } else {
        patients.push(finalPatient);
      }
      localStorage.setItem('bfisio_patients', JSON.stringify(patients));
    }

    return finalPatient;
  }

  async deletePatient(id: string): Promise<void> {
    // 1. Delete from Firestore
    if (isFirebaseReady && db) {
      try {
        await deleteDoc(doc(db, 'patients', id));
        const visitsSnap = await getDocs(collection(db, 'visits'));
        const batch = writeBatch(db);
        visitsSnap.forEach((vDoc) => {
          const vData = vDoc.data() as TherapyVisit;
          if (vData.patientId === id) {
            batch.delete(doc(db, 'visits', vDoc.id));
          }
        });
        await batch.commit();
      } catch (err) {
        console.error('Firestore deletePatient error:', err);
      }
    }

    // 2. Delete from local IndexedDB
    try {
      const localDb = await this.getDB();
      const tx = localDb.transaction(['patients', 'visits'], 'readwrite');
      const pStore = tx.objectStore('patients');
      const vStore = tx.objectStore('visits');

      pStore.delete(id);

      // Delete associated visits
      const vReq = vStore.getAll();
      vReq.onsuccess = () => {
        const visits = vReq.result as TherapyVisit[];
        for (const v of visits) {
          if (v.patientId === id) {
            vStore.delete(v.id);
          }
        }
      };

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      let patients = await this.getAllPatients();
      patients = patients.filter(p => p.id !== id);
      localStorage.setItem('bfisio_patients', JSON.stringify(patients));

      let visits = await this.getAllVisits();
      visits = visits.filter(v => v.patientId !== id);
      localStorage.setItem('bfisio_visits', JSON.stringify(visits));
    }
  }

  // VISITS
  async getAllVisits(): Promise<TherapyVisit[]> {
    if (isFirebaseReady && db) {
      try {
        const snap = await getDocs(collection(db, 'visits'));
        const list: TherapyVisit[] = [];
        snap.forEach((docSnap) => {
          list.push(docSnap.data() as TherapyVisit);
        });
        list.sort((a, b) => b.date.localeCompare(a.date) || b.visitNumber - a.visitNumber);
        try {
          localStorage.setItem('bfisio_visits', JSON.stringify(list));
        } catch {}
        return list;
      } catch (err) {
        console.warn('Firestore getAllVisits error, reading local:', err);
      }
    }

    try {
      const localDb = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = localDb.transaction('visits', 'readonly');
        const store = tx.objectStore('visits');
        const req = store.getAll();
        req.onsuccess = () => {
          const list = req.result as TherapyVisit[];
          list.sort((a, b) => b.date.localeCompare(a.date) || b.visitNumber - a.visitNumber);
          resolve(list);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      const raw = localStorage.getItem('bfisio_visits');
      const list: TherapyVisit[] = raw ? JSON.parse(raw) : [];
      list.sort((a, b) => b.date.localeCompare(a.date) || b.visitNumber - a.visitNumber);
      return list;
    }
  }

  async getVisitsByPatient(patientId: string): Promise<TherapyVisit[]> {
    const visits = await this.getAllVisits();
    return visits
      .filter(v => v.patientId === patientId)
      .sort((a, b) => a.date.localeCompare(b.date) || a.visitNumber - b.visitNumber);
  }

  // Calculate visit number for a given patient chronologically
  async calculateNextVisitNumber(patientId: string, visitDate: string, excludeVisitId?: string): Promise<number> {
    const visits = await this.getVisitsByPatient(patientId);
    const existing = visits.filter(v => v.id !== excludeVisitId);
    if (existing.length === 0) return 1;

    // Count how many visits happen on or before this date
    const beforeOrSame = existing.filter(v => v.date <= visitDate);
    return beforeOrSame.length + 1;
  }

  async saveVisit(visit: TherapyVisit): Promise<TherapyVisit> {
    const finalVisit: TherapyVisit = {
      ...visit,
      id: visit.id || `v-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: visit.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Write to Firebase Firestore
    if (isFirebaseReady && db) {
      try {
        await setDoc(doc(db, 'visits', finalVisit.id), cleanForFirestore(finalVisit));
      } catch (err) {
        console.error('Firestore saveVisit error:', err);
      }
    }

    // 2. Write to local IndexedDB
    try {
      const localDb = await this.getDB();
      const tx = localDb.transaction('visits', 'readwrite');
      const store = tx.objectStore('visits');
      store.put(finalVisit);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      const visits = await this.getAllVisits();
      const idx = visits.findIndex(v => v.id === finalVisit.id);
      if (idx >= 0) {
        visits[idx] = finalVisit;
      } else {
        visits.push(finalVisit);
      }
      localStorage.setItem('bfisio_visits', JSON.stringify(visits));
    }

    // Auto synchronize patient statistics
    await this.syncPatientStats(finalVisit.patientId);

    return finalVisit;
  }

  async deleteVisit(visitId: string, patientId: string): Promise<void> {
    // 1. Delete from Firestore
    if (isFirebaseReady && db) {
      try {
        await deleteDoc(doc(db, 'visits', visitId));
      } catch (err) {
        console.error('Firestore deleteVisit error:', err);
      }
    }

    // 2. Delete from local IndexedDB
    try {
      const localDb = await this.getDB();
      const tx = localDb.transaction('visits', 'readwrite');
      const store = tx.objectStore('visits');
      store.delete(visitId);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      let visits = await this.getAllVisits();
      visits = visits.filter(v => v.id !== visitId);
      localStorage.setItem('bfisio_visits', JSON.stringify(visits));
    }

    // Auto synchronize patient statistics
    await this.syncPatientStats(patientId);
  }

  // Recalculate and update patient's total visits, last date, spending, balance
  async syncPatientStats(patientId: string): Promise<void> {
    const patient = await this.getPatientById(patientId);
    if (!patient) return;

    const visits = await this.getVisitsByPatient(patientId);
    // Sort visits chronologically
    visits.sort((a, b) => a.date.localeCompare(b.date));

    // Fix visit numbers in sequence
    for (let i = 0; i < visits.length; i++) {
      if (visits[i].visitNumber !== i + 1) {
        visits[i].visitNumber = i + 1;
        // Save updated visit number to Firestore and local
        if (isFirebaseReady && db) {
          try {
            await setDoc(doc(db, 'visits', visits[i].id), cleanForFirestore(visits[i]));
          } catch {}
        }
        try {
          const localDb = await this.getDB();
          const tx = localDb.transaction('visits', 'readwrite');
          tx.objectStore('visits').put(visits[i]);
        } catch {
          // handled in memory/fallback
        }
      }
    }

    const totalVisits = visits.length;
    let totalSpending = 0;
    let outstandingBalance = 0;
    let lastVisitDate = patient.createdAt.slice(0, 10);
    let lastLocation = patient.lastLocation;
    let lastTherapist = patient.lastTherapist;
    let lastPaymentStatus = patient.lastPaymentStatus || 'Lunas';

    if (visits.length > 0) {
      const latestVisit = visits[visits.length - 1];
      lastVisitDate = latestVisit.date;
      lastLocation = latestVisit.location;
      lastTherapist = latestVisit.therapist;
      lastPaymentStatus = latestVisit.payment.status;

      for (const v of visits) {
        totalSpending += (v.payment.total || 0);
        outstandingBalance += (v.payment.remainingBalance || 0);
      }
    }

    patient.totalVisits = totalVisits;
    patient.lastVisitDate = visits.length > 0 ? lastVisitDate : undefined;
    patient.lastLocation = lastLocation;
    patient.lastTherapist = lastTherapist;
    patient.totalSpending = totalSpending;
    patient.outstandingBalance = outstandingBalance;
    patient.lastPaymentStatus = lastPaymentStatus;
    patient.updatedAt = new Date().toISOString();

    await this.savePatient(patient);
  }

  // SETTINGS
  async getSettings(): Promise<AppSettings> {
    if (isFirebaseReady && db) {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'app_settings'));
        if (docSnap.exists()) {
          const cloudSettings = docSnap.data() as AppSettings;
          return { ...DEFAULT_SETTINGS, ...cloudSettings };
        }
      } catch (err) {
        console.warn('Firestore getSettings error, reading local:', err);
      }
    }

    try {
      const localDb = await this.getDB();
      return new Promise((resolve) => {
        const tx = localDb.transaction('settings', 'readonly');
        const store = tx.objectStore('settings');
        const req = store.get('app_settings');
        req.onsuccess = () => {
          if (req.result) {
            resolve({ ...DEFAULT_SETTINGS, ...req.result });
          } else {
            resolve(DEFAULT_SETTINGS);
          }
        };
        req.onerror = () => resolve(DEFAULT_SETTINGS);
      });
    } catch {
      const raw = localStorage.getItem('bfisio_settings');
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.getSettings();
    const updated: AppSettings = { ...current, ...settings };

    if (isFirebaseReady && db) {
      try {
        await setDoc(doc(db, 'settings', 'app_settings'), cleanForFirestore({ id: 'app_settings', ...updated }));
      } catch (err) {
        console.error('Firestore saveSettings error:', err);
      }
    }

    try {
      const localDb = await this.getDB();
      const tx = localDb.transaction('settings', 'readwrite');
      tx.objectStore('settings').put({ id: 'app_settings', ...updated });
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      localStorage.setItem('bfisio_settings', JSON.stringify(updated));
    }
    return updated;
  }

  // DASHBOARD STATS
  async getDashboardStats(): Promise<DashboardStats> {
    const patients = await this.getAllPatients();
    const visits = await this.getAllVisits();
    const today = getTodayDateString();
    const currentMonth = today.slice(0, 7); // "YYYY-MM"

    const totalPatients = patients.length;
    const totalTherapyVisits = visits.length;

    let patientsTodayCount = 0;
    const todayPatientIds = new Set<string>();

    let homeCareVisits = 0;
    let clinicVisits = 0;
    let unpaidTransactions = 0;
    let todayRevenue = 0;
    let thisMonthRevenue = 0;
    let outstandingBalanceTotal = 0;
    let therapyRevenueTotal = 0;
    let transportRevenueTotal = 0;

    for (const v of visits) {
      if (v.date === today) {
        todayPatientIds.add(v.patientId);
        todayRevenue += (v.payment.paidAmount || (v.payment.status === 'Lunas' ? v.payment.total : 0));
      }

      if (v.date.startsWith(currentMonth)) {
        thisMonthRevenue += (v.payment.paidAmount || (v.payment.status === 'Lunas' ? v.payment.total : 0));
      }

      if (v.location === 'Home Care') {
        homeCareVisits++;
      } else {
        clinicVisits++;
      }

      if (v.payment.status === 'Belum Lunas' || (v.payment.status === 'DP' && v.payment.remainingBalance > 0)) {
        unpaidTransactions++;
      }

      outstandingBalanceTotal += (v.payment.remainingBalance || 0);
      therapyRevenueTotal += (v.payment.therapyPrice || 0);
      transportRevenueTotal += (v.payment.transport || 0);
    }

    patientsTodayCount = todayPatientIds.size;

    return {
      totalPatients,
      patientsToday: patientsTodayCount,
      totalTherapyVisits,
      homeCareVisits,
      clinicVisits,
      unpaidTransactions,
      todayRevenue,
      thisMonthRevenue,
      outstandingBalanceTotal,
      therapyRevenueTotal,
      transportRevenueTotal,
    };
  }

  // BACKUP & RESTORE
  async exportBackup(): Promise<string> {
    const patients = await this.getAllPatients();
    const visits = await this.getAllVisits();
    const settings = await this.getSettings();

    const backupData = {
      app: 'B Fisio App',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      firestoreConnected: isFirebaseReady && !!db,
      firebaseProjectId: firebaseConfig?.projectId,
      data: {
        patients,
        visits,
        settings,
      },
    };

    return JSON.stringify(backupData, null, 2);
  }

  async restoreBackup(jsonString: string): Promise<{ success: boolean; patientsCount: number; visitsCount: number; message?: string }> {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.data || !Array.isArray(parsed.data.patients) || !Array.isArray(parsed.data.visits)) {
        return { success: false, patientsCount: 0, visitsCount: 0, message: 'Format file backup tidak valid.' };
      }

      const patients: Patient[] = parsed.data.patients;
      const visits: TherapyVisit[] = parsed.data.visits;
      const settings: AppSettings = parsed.data.settings || DEFAULT_SETTINGS;

      // Restore to Firebase Firestore
      if (isFirebaseReady && db) {
        try {
          const batch = writeBatch(db);
          for (const p of patients) {
            batch.set(doc(db, 'patients', p.id), cleanForFirestore(p));
          }
          for (const v of visits) {
            batch.set(doc(db, 'visits', v.id), cleanForFirestore(v));
          }
          batch.set(doc(db, 'settings', 'app_settings'), cleanForFirestore({ id: 'app_settings', ...settings }));
          await batch.commit();
        } catch (err) {
          console.error('Firestore restore error:', err);
        }
      }

      // Clear & write local
      try {
        const localDb = await this.getDB();
        const tx = localDb.transaction(['patients', 'visits', 'settings'], 'readwrite');
        tx.objectStore('patients').clear();
        tx.objectStore('visits').clear();

        for (const p of patients) {
          tx.objectStore('patients').put(p);
        }
        for (const v of visits) {
          tx.objectStore('visits').put(v);
        }
        tx.objectStore('settings').put({ id: 'app_settings', ...settings });

        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch {
        localStorage.setItem('bfisio_patients', JSON.stringify(patients));
        localStorage.setItem('bfisio_visits', JSON.stringify(visits));
        localStorage.setItem('bfisio_settings', JSON.stringify(settings));
      }

      return {
        success: true,
        patientsCount: patients.length,
        visitsCount: visits.length,
      };
    } catch (e) {
      return { success: false, patientsCount: 0, visitsCount: 0, message: (e as Error).message };
    }
  }

  // Force sync local to Firestore
  async syncLocalToCloud(): Promise<{ success: boolean; syncedPatients: number; syncedVisits: number }> {
    if (!isFirebaseReady || !db) {
      throw new Error('Firebase Firestore belum terhubung.');
    }
    const patients = await this.getAllPatients();
    const visits = await this.getAllVisits();
    const settings = await this.getSettings();

    const batch = writeBatch(db);
    for (const p of patients) {
      batch.set(doc(db, 'patients', p.id), cleanForFirestore(p));
    }
    for (const v of visits) {
      batch.set(doc(db, 'visits', v.id), cleanForFirestore(v));
    }
    batch.set(doc(db, 'settings', 'app_settings'), cleanForFirestore({ id: 'app_settings', ...settings }));
    await batch.commit();

    return {
      success: true,
      syncedPatients: patients.length,
      syncedVisits: visits.length,
    };
  }

  // Reset demo
  async resetToDemo(): Promise<void> {
    if (isFirebaseReady && db) {
      await this.seedDataToFirestore();
    }
    try {
      const localDb = await this.getDB();
      const tx = localDb.transaction(['patients', 'visits', 'settings'], 'readwrite');
      tx.objectStore('patients').clear();
      tx.objectStore('visits').clear();
      for (const p of SEED_PATIENTS) {
        tx.objectStore('patients').put(p);
      }
      for (const v of SEED_VISITS) {
        tx.objectStore('visits').put(v);
      }
      tx.objectStore('settings').put({ id: 'app_settings', ...DEFAULT_SETTINGS });
    } catch {
      localStorage.setItem('bfisio_patients', JSON.stringify(SEED_PATIENTS));
      localStorage.setItem('bfisio_visits', JSON.stringify(SEED_VISITS));
      localStorage.setItem('bfisio_settings', JSON.stringify(DEFAULT_SETTINGS));
    }
  }
}

export const dbService = new DatabaseService();
