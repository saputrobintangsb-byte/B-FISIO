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

function cleanForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => cleanForFirestore(item)) as unknown as T;
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj as Record<string, any>)) {
    if (value !== undefined) {
      result[key] = cleanForFirestore(value);
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

// Clean initial state: 0 patients
const SEED_PATIENTS: Patient[] = [];
const SEED_VISITS: TherapyVisit[] = [];

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

  // Initializer: ensure default settings exist and remove any sample patient data
  async init(): Promise<void> {
    if (isFirebaseReady && db) {
      try {
        // Ensure default settings exist in Firestore
        const sDoc = await getDoc(doc(db, 'settings', 'app_settings'));
        if (!sDoc.exists()) {
          await setDoc(doc(db, 'settings', 'app_settings'), cleanForFirestore({ id: 'app_settings', ...DEFAULT_SETTINGS }));
        }

        // Clean out any legacy seed sample patients from Firestore
        const pSnap = await getDocs(collection(db, 'patients'));
        const seedPatientDocs = pSnap.docs.filter((d) => d.id.startsWith('p-seed-'));
        if (seedPatientDocs.length > 0) {
          const batch = writeBatch(db);
          for (const d of seedPatientDocs) {
            batch.delete(d.ref);
          }
          await batch.commit();
        }

        // Clean out any legacy seed sample visits from Firestore
        const vSnap = await getDocs(collection(db, 'visits'));
        const seedVisitDocs = vSnap.docs.filter((d) => d.id.startsWith('v-seed-') || d.data().patientId?.startsWith('p-seed-'));
        if (seedVisitDocs.length > 0) {
          const batch = writeBatch(db);
          for (const d of seedVisitDocs) {
            batch.delete(d.ref);
          }
          await batch.commit();
        }
      } catch (err) {
        console.warn('Firestore initial check/cleanup error:', err);
      }
    }

    try {
      const localDb = await this.getDB();
      const tx = localDb.transaction(['patients', 'visits', 'settings'], 'readwrite');
      const pStore = tx.objectStore('patients');
      const vStore = tx.objectStore('visits');
      const sStore = tx.objectStore('settings');

      // Ensure settings exist in IndexedDB
      const sReq = sStore.get('app_settings');
      sReq.onsuccess = () => {
        if (!sReq.result) {
          sStore.put({ id: 'app_settings', ...DEFAULT_SETTINGS });
        }
      };

      // Remove any legacy seed patients from IndexedDB
      const pReq = pStore.getAll();
      pReq.onsuccess = () => {
        const pts = pReq.result || [];
        for (const p of pts) {
          if (p.id?.startsWith('p-seed-')) {
            pStore.delete(p.id);
          }
        }
      };

      // Remove any legacy seed visits from IndexedDB
      const vReq = vStore.getAll();
      vReq.onsuccess = () => {
        const vsts = vReq.result || [];
        for (const v of vsts) {
          if (v.id?.startsWith('v-seed-') || v.patientId?.startsWith('p-seed-')) {
            vStore.delete(v.id);
          }
        }
      };
    } catch (e) {
      console.warn('IndexedDB check/cleanup error:', e);
    }

    // Clean LocalStorage fallback
    try {
      const rawPts = localStorage.getItem('bfisio_patients');
      if (rawPts) {
        const pts = JSON.parse(rawPts);
        const filtered = pts.filter((p: any) => !p.id?.startsWith('p-seed-'));
        localStorage.setItem('bfisio_patients', JSON.stringify(filtered));
      } else {
        localStorage.setItem('bfisio_patients', JSON.stringify([]));
      }

      const rawVisits = localStorage.getItem('bfisio_visits');
      if (rawVisits) {
        const vsts = JSON.parse(rawVisits);
        const filtered = vsts.filter((v: any) => !v.id?.startsWith('v-seed-') && !v.patientId?.startsWith('p-seed-'));
        localStorage.setItem('bfisio_visits', JSON.stringify(filtered));
      } else {
        localStorage.setItem('bfisio_visits', JSON.stringify([]));
      }

      if (!localStorage.getItem('bfisio_settings')) {
        localStorage.setItem('bfisio_settings', JSON.stringify(DEFAULT_SETTINGS));
      }
    } catch (e) {
      console.warn('LocalStorage cleanup error:', e);
    }
  }

  async seedDataToFirestore(): Promise<void> {
    // No-op: Zero sample patient mode
    return;
  }

  async seedData(): Promise<void> {
    // No-op: Zero sample patient mode
    return;
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

  // Clear all patient and visit data (0 patients)
  async clearAllPatientData(): Promise<void> {
    if (isFirebaseReady && db) {
      try {
        const pSnap = await getDocs(collection(db, 'patients'));
        const vSnap = await getDocs(collection(db, 'visits'));

        const batch = writeBatch(db);
        pSnap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
        vSnap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
        await batch.commit();
      } catch (err) {
        console.error('Error clearing Firestore patients/visits:', err);
      }
    }

    try {
      const localDb = await this.getDB();
      const tx = localDb.transaction(['patients', 'visits'], 'readwrite');
      tx.objectStore('patients').clear();
      tx.objectStore('visits').clear();
    } catch (err) {
      console.warn('IndexedDB clear error:', err);
    }

    try {
      localStorage.setItem('bfisio_patients', JSON.stringify([]));
      localStorage.setItem('bfisio_visits', JSON.stringify([]));
    } catch (err) {
      console.warn('LocalStorage clear error:', err);
    }
  }

  // Reset to empty database (0 patients)
  async resetToDemo(): Promise<void> {
    await this.clearAllPatientData();
  }
}

export const dbService = new DatabaseService();
