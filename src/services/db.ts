import { Patient, TherapyVisit, AppSettings, DashboardStats, Appointment, AppointmentStatus } from '../types';
import { getTodayDateString } from '../utils/formatters';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
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
const DB_VERSION = 3;

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

        if (!localDb.objectStoreNames.contains('appointments')) {
          const apptStore = localDb.createObjectStore('appointments', { keyPath: 'id' });
          apptStore.createIndex('date', 'date', { unique: false });
          apptStore.createIndex('patientId', 'patientId', { unique: false });
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
      projectId: firebaseConfig?.projectId || 'b-fisio-app',
      databaseId: firebaseConfig?.firestoreDatabaseId,
    };
  }

  // Helper to validate whether a patient record is valid and not a corrupt/blank bug record
  isValidPatient(p: any): boolean {
    if (!p || typeof p !== 'object') return false;
    if (!p.id || typeof p.id !== 'string') return false;
    if (p.id.startsWith('p-seed-')) return false;

    const name = (p.fullName || '').trim();
    const mrn = (p.mrn || '').trim();

    // If both name and MRN are empty/blank, it's 100% a corrupted bug record
    if (!name && !mrn) return false;

    // A valid patient in clinical records must have a meaningful name
    if (
      !name ||
      name === '-' ||
      name.toLowerCase() === 'undefined' ||
      name.toLowerCase() === 'null' ||
      name.toLowerCase() === 'tanpa nama' ||
      name.toLowerCase() === 'cek' ||
      p.id === 'p-1789714326846-gv3v4q'
    ) {
      return false;
    }

    return true;
  }

  // --- Local Storage & IndexedDB Helpers ---
  async getLocalPatients(): Promise<Patient[]> {
    try {
      const localDb = await this.getDB();
      return new Promise((resolve) => {
        const tx = localDb.transaction('patients', 'readonly');
        const store = tx.objectStore('patients');
        const req = store.getAll();
        req.onsuccess = () => {
          const list = (req.result as Patient[]) || [];
          const filtered = list.filter((p) => this.isValidPatient(p));
          filtered.sort((a, b) => (b.lastVisitDate || b.createdAt || '').localeCompare(a.lastVisitDate || a.createdAt || ''));
          resolve(filtered);
        };
        req.onerror = () => resolve([]);
      });
    } catch {
      const raw = localStorage.getItem('bfisio_patients');
      const list: Patient[] = raw ? JSON.parse(raw) : [];
      const filtered = list.filter((p) => this.isValidPatient(p));
      filtered.sort((a, b) => (b.lastVisitDate || b.createdAt || '').localeCompare(a.lastVisitDate || a.createdAt || ''));
      return filtered;
    }
  }

  async cacheLocalPatients(list: Patient[]): Promise<void> {
    try {
      localStorage.setItem('bfisio_patients', JSON.stringify(list));
    } catch {}
    try {
      const localDb = await this.getDB();
      const tx = localDb.transaction('patients', 'readwrite');
      const store = tx.objectStore('patients');
      for (const p of list) {
        store.put(p);
      }
    } catch (e) {
      console.warn('cacheLocalPatients error:', e);
    }
  }

  async getLocalVisits(): Promise<TherapyVisit[]> {
    try {
      const localDb = await this.getDB();
      return new Promise((resolve) => {
        const tx = localDb.transaction('visits', 'readonly');
        const store = tx.objectStore('visits');
        const req = store.getAll();
        req.onsuccess = () => {
          const list = (req.result as TherapyVisit[]) || [];
          const filtered = list.filter((v) => !v.id?.startsWith('v-seed-') && !v.patientId?.startsWith('p-seed-'));
          filtered.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.visitNumber || 0) - (a.visitNumber || 0));
          resolve(filtered);
        };
        req.onerror = () => resolve([]);
      });
    } catch {
      const raw = localStorage.getItem('bfisio_visits');
      const list: TherapyVisit[] = raw ? JSON.parse(raw) : [];
      const filtered = list.filter((v) => !v.id?.startsWith('v-seed-') && !v.patientId?.startsWith('p-seed-'));
      filtered.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.visitNumber || 0) - (a.visitNumber || 0));
      return filtered;
    }
  }

  async cacheLocalVisits(list: TherapyVisit[]): Promise<void> {
    try {
      localStorage.setItem('bfisio_visits', JSON.stringify(list));
    } catch {}
    try {
      const localDb = await this.getDB();
      const tx = localDb.transaction('visits', 'readwrite');
      const store = tx.objectStore('visits');
      for (const v of list) {
        store.put(v);
      }
    } catch (e) {
      console.warn('cacheLocalVisits error:', e);
    }
  }

  async getLocalAppointments(): Promise<Appointment[]> {
    try {
      const localDb = await this.getDB();
      return new Promise((resolve) => {
        const tx = localDb.transaction('appointments', 'readonly');
        const store = tx.objectStore('appointments');
        const req = store.getAll();
        req.onsuccess = () => {
          const list = (req.result as Appointment[]) || [];
          list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (a.time || '').localeCompare(b.time || ''));
          resolve(list);
        };
        req.onerror = () => resolve([]);
      });
    } catch {
      const raw = localStorage.getItem('bfisio_appointments');
      const list: Appointment[] = raw ? JSON.parse(raw) : [];
      list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (a.time || '').localeCompare(b.time || ''));
      return list;
    }
  }

  async cacheLocalAppointments(list: Appointment[]): Promise<void> {
    try {
      localStorage.setItem('bfisio_appointments', JSON.stringify(list));
    } catch {}
    try {
      const localDb = await this.getDB();
      const tx = localDb.transaction('appointments', 'readwrite');
      const store = tx.objectStore('appointments');
      for (const a of list) {
        store.put(a);
      }
    } catch (e) {
      console.warn('cacheLocalAppointments error:', e);
    }
  }

  // Purge any corrupted, empty, or blank bug patients (without name or without MRN) from all storages
  async purgeInvalidPatients(): Promise<{ deletedCount: number }> {
    let deletedCount = 0;
    const deletedPatientIds = new Set<string>();

    // 1. Purge from Firestore
    if (isFirebaseReady && db) {
      try {
        const pSnap = await getDocs(collection(db, 'patients'));
        const invalidDocs = pSnap.docs.filter((d) => {
          const data = d.data() as Partial<Patient>;
          return !this.isValidPatient(data) || !d.id || d.id.startsWith('p-seed-');
        });

        if (invalidDocs.length > 0) {
          const batch = writeBatch(db);
          for (const docItem of invalidDocs) {
            deletedPatientIds.add(docItem.id);
            batch.delete(docItem.ref);
            deletedCount++;
          }

          // Delete any visits linked to invalid patient IDs or orphaned visits
          const vSnap = await getDocs(collection(db, 'visits'));
          for (const vDoc of vSnap.docs) {
            const vData = vDoc.data() as Partial<TherapyVisit>;
            if (!vData.patientId || deletedPatientIds.has(vData.patientId) || vDoc.id?.startsWith('v-seed-')) {
              batch.delete(vDoc.ref);
            }
          }

          await batch.commit();
          console.log(`[Firebase Cleanup] Berhasil menghapus ${deletedCount} data pasien bug/tanpa identitas dari Firestore.`);
        }
      } catch (err) {
        console.error('Error purging invalid patients from Firestore:', err);
      }
    }

    // 2. Purge from local IndexedDB
    try {
      const localDb = await this.getDB();
      const tx = localDb.transaction(['patients', 'visits'], 'readwrite');
      const pStore = tx.objectStore('patients');
      const vStore = tx.objectStore('visits');

      const pReq = pStore.getAll();
      pReq.onsuccess = () => {
        const pts = pReq.result || [];
        for (const p of pts) {
          if (!this.isValidPatient(p)) {
            deletedPatientIds.add(p.id);
            pStore.delete(p.id);
            deletedCount++;
          }
        }
      };

      const vReq = vStore.getAll();
      vReq.onsuccess = () => {
        const vsts = vReq.result || [];
        for (const v of vsts) {
          if (!v.patientId || deletedPatientIds.has(v.patientId) || v.id?.startsWith('v-seed-')) {
            vStore.delete(v.id);
          }
        }
      };
    } catch (err) {
      console.warn('Error purging invalid patients from IndexedDB:', err);
    }

    // 3. Purge from localStorage
    try {
      const rawPts = localStorage.getItem('bfisio_patients');
      if (rawPts) {
        const pts = JSON.parse(rawPts);
        if (Array.isArray(pts)) {
          const valid = pts.filter((p) => this.isValidPatient(p));
          localStorage.setItem('bfisio_patients', JSON.stringify(valid));
        }
      }

      const rawVisits = localStorage.getItem('bfisio_visits');
      if (rawVisits) {
        const vsts = JSON.parse(rawVisits);
        if (Array.isArray(vsts)) {
          const validVisits = vsts.filter((v) => v.patientId && !deletedPatientIds.has(v.patientId));
          localStorage.setItem('bfisio_visits', JSON.stringify(validVisits));
        }
      }
    } catch (err) {
      console.warn('Error purging invalid patients from localStorage:', err);
    }

    return { deletedCount };
  }

  // Initializer: smart bi-directional synchronization between local and Firestore
  async init(): Promise<void> {
    // Automatically purge any bug/invalid patient data first
    await this.purgeInvalidPatients();

    // 1. If Firebase is ready, ensure default settings & synchronize data
    if (isFirebaseReady && db) {
      try {
        // Ensure default settings exist in Firestore
        const sDoc = await getDoc(doc(db, 'settings', 'app_settings'));
        if (!sDoc.exists()) {
          await setDoc(doc(db, 'settings', 'app_settings'), cleanForFirestore({ id: 'app_settings', ...DEFAULT_SETTINGS }));
        }

        // Clean out any legacy seed sample patients from Firestore
        const pSnap = await getDocs(collection(db, 'patients'));
        const seedPatientDocs = pSnap.docs.filter((d) => d.id?.startsWith('p-seed-'));
        if (seedPatientDocs.length > 0) {
          const batch = writeBatch(db);
          for (const d of seedPatientDocs) {
            batch.delete(d.ref);
          }
          await batch.commit();
        }

        // Clean out any legacy seed sample visits from Firestore
        const vSnap = await getDocs(collection(db, 'visits'));
        const seedVisitDocs = vSnap.docs.filter((d) => d.id?.startsWith('v-seed-') || d.data()?.patientId?.startsWith('p-seed-'));
        if (seedVisitDocs.length > 0) {
          const batch = writeBatch(db);
          for (const d of seedVisitDocs) {
            batch.delete(d.ref);
          }
          await batch.commit();
        }

        // Fetch cloud appointments from settings/appointments and optionally collection 'appointments'
        let validCloudAppts: Appointment[] = [];
        try {
          const apptsDocSnap = await getDoc(doc(db, 'settings', 'appointments'));
          if (apptsDocSnap.exists() && Array.isArray(apptsDocSnap.data()?.list)) {
            validCloudAppts = apptsDocSnap.data()?.list as Appointment[];
          }
        } catch (e) {
          console.warn('Could not read settings/appointments during init:', e);
        }

        try {
          const aSnap = await getDocs(collection(db, 'appointments'));
          if (!aSnap.empty) {
            const existingIds = new Set(validCloudAppts.map((a) => a.id));
            aSnap.forEach((d) => {
              const item = d.data() as Appointment;
              if (item?.id && !existingIds.has(item.id)) {
                validCloudAppts.push(item);
              }
            });
          }
        } catch {
          // Top-level appointments collection might be restricted by legacy Firestore rules
        }

        // Smart Startup Sync: Upload any local items that don't exist in Firestore
        const localPatients = await this.getLocalPatients();
        const localVisits = await this.getLocalVisits();
        const localAppts = await this.getLocalAppointments();

        const cloudPatientIds = new Set(pSnap.docs.map((d) => d.id));
        const cloudVisitIds = new Set(vSnap.docs.map((d) => d.id));
        const cloudApptIds = new Set(validCloudAppts.filter(a => a?.id).map((a) => a.id));

        const unsyncedPatients = localPatients.filter((p) => p?.id && !cloudPatientIds.has(p.id) && !p.id?.startsWith('p-seed-'));
        const unsyncedVisits = localVisits.filter((v) => v?.id && !cloudVisitIds.has(v.id) && !v.id?.startsWith('v-seed-'));
        const unsyncedAppts = localAppts.filter((a) => a?.id && !cloudApptIds.has(a.id));

        if (unsyncedPatients.length > 0 || unsyncedVisits.length > 0) {
          console.log(`[Firebase Sync] Auto-uploading unsynced patients/visits to Firestore`);
          const syncBatch = writeBatch(db);
          for (const p of unsyncedPatients) {
            syncBatch.set(doc(db, 'patients', p.id), cleanForFirestore(p));
          }
          for (const v of unsyncedVisits) {
            syncBatch.set(doc(db, 'visits', v.id), cleanForFirestore(v));
          }
          await syncBatch.commit();
        }

        if (unsyncedAppts.length > 0) {
          console.log(`[Firebase Sync] Auto-uploading ${unsyncedAppts.length} unsynced appointments to Firestore`);
          const mergedAppts = [...validCloudAppts, ...unsyncedAppts];
          try {
            await setDoc(doc(db, 'settings', 'appointments'), {
              list: cleanForFirestore(mergedAppts),
              totalCount: mergedAppts.length,
              updatedAt: new Date().toISOString(),
            });
            for (const a of unsyncedAppts) {
              await setDoc(doc(db, 'settings', a.id), cleanForFirestore(a));
              try {
                await setDoc(doc(db, 'appointments', a.id), cleanForFirestore(a));
              } catch {
                // ignore
              }
            }
            validCloudAppts = mergedAppts;
          } catch (syncErr) {
            console.warn('Initial appointments sync warning:', syncErr);
          }
        }

        // Cache all cloud data locally so local storage is ready for offline
        const validCloudPatients = pSnap.docs
          .map((d) => d.data() as Patient)
          .filter((p) => !p.id?.startsWith('p-seed-'));
        const validCloudVisits = vSnap.docs
          .map((d) => d.data() as TherapyVisit)
          .filter((v) => !v.id?.startsWith('v-seed-') && !v.patientId?.startsWith('p-seed-'));

        if (validCloudPatients.length > 0) {
          await this.cacheLocalPatients(validCloudPatients);
        }
        if (validCloudVisits.length > 0) {
          await this.cacheLocalVisits(validCloudVisits);
        }
        if (validCloudAppts.length > 0) {
          await this.cacheLocalAppointments(validCloudAppts);
        }
      } catch (err) {
        console.warn('Firestore initial check/sync error:', err);
      }
    }

    try {
      const localDb = await this.getDB();
      const tx = localDb.transaction(['patients', 'visits', 'appointments', 'settings'], 'readwrite');
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
          if (p?.id?.startsWith('p-seed-')) {
            pStore.delete(p.id);
          }
        }
      };

      // Remove any legacy seed visits from IndexedDB
      const vReq = vStore.getAll();
      vReq.onsuccess = () => {
        const vsts = vReq.result || [];
        for (const v of vsts) {
          if (v?.id?.startsWith('v-seed-') || v?.patientId?.startsWith('p-seed-')) {
            if (v?.id) vStore.delete(v.id);
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
        const filtered = Array.isArray(pts) ? pts.filter((p: any) => !p?.id?.startsWith('p-seed-')) : [];
        localStorage.setItem('bfisio_patients', JSON.stringify(filtered));
      }

      const rawVisits = localStorage.getItem('bfisio_visits');
      if (rawVisits) {
        const vsts = JSON.parse(rawVisits);
        const filtered = Array.isArray(vsts) ? vsts.filter((v: any) => !v?.id?.startsWith('v-seed-') && !v?.patientId?.startsWith('p-seed-')) : [];
        localStorage.setItem('bfisio_visits', JSON.stringify(filtered));
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
            const data = docSnap.data() as Patient;
            if (this.isValidPatient(data)) {
              list.push(data);
            }
          });
          list.sort((a, b) => (b.lastVisitDate || b.createdAt || '').localeCompare(a.lastVisitDate || a.createdAt || ''));
          this.cacheLocalPatients(list);
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
            const data = docSnap.data() as TherapyVisit;
            if (!data.id?.startsWith('v-seed-') && !data.patientId?.startsWith('p-seed-')) {
              list.push(data);
            }
          });
          list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.visitNumber || 0) - (a.visitNumber || 0));
          this.cacheLocalVisits(list);
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

  // Real-time listener for appointments (Jadwal Pasien)
  subscribeAppointments(callback: (appointments: Appointment[]) => void): () => void {
    if (isFirebaseReady && db) {
      try {
        // 1. Primary real-time listener on doc(db, 'settings', 'appointments')
        const unsubSettings = onSnapshot(
          doc(db, 'settings', 'appointments'),
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              const list: Appointment[] = Array.isArray(data?.list) ? data.list : [];
              list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (a.time || '').localeCompare(b.time || ''));
              this.cacheLocalAppointments(list);
              callback(list);
            }
          },
          (err) => {
            console.warn('Firestore subscribeAppointments settings error:', err);
          }
        );

        // 2. Secondary listener on collection(db, 'appointments') if permitted
        let unsubCollection = () => {};
        try {
          unsubCollection = onSnapshot(
            collection(db, 'appointments'),
            (snapshot) => {
              if (!snapshot.empty) {
                const list: Appointment[] = [];
                snapshot.forEach((docSnap) => {
                  list.push(docSnap.data() as Appointment);
                });
                list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (a.time || '').localeCompare(b.time || ''));
                this.cacheLocalAppointments(list);
                callback(list);
              }
            },
            () => {
              // Gracefully handle if collection permissions are not active
            }
          );
        } catch {
          // ignore
        }

        return () => {
          unsubSettings();
          unsubCollection();
        };
      } catch (err) {
        console.warn('Error creating Firestore appointments subscription:', err);
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
          const p = docSnap.data() as Patient;
          if (this.isValidPatient(p)) {
            list.push(p);
          } else {
            // Delete invalid corrupted doc asynchronously
            deleteDoc(docSnap.ref).catch(() => {});
          }
        });
        list.sort((a, b) => (b.lastVisitDate || b.createdAt || '').localeCompare(a.lastVisitDate || a.createdAt || ''));
        if (list.length > 0) {
          await this.cacheLocalPatients(list);
          return list;
        } else {
          // If Firestore is empty, check if we have local unsynced patients
          const localList = await this.getLocalPatients();
          if (localList.length > 0) {
            this.syncLocalToCloud().catch((err) => console.warn('Background sync error:', err));
            return localList;
          }
          return [];
        }
      } catch (err) {
        console.warn('Firestore getAllPatients error, reading local:', err);
      }
    }

    return this.getLocalPatients();
  }

  async getPatientById(id: string): Promise<Patient | null> {
    if (isFirebaseReady && db) {
      try {
        const docSnap = await getDoc(doc(db, 'patients', id));
        if (docSnap.exists()) {
          const p = docSnap.data() as Patient;
          return this.isValidPatient(p) ? p : null;
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
        req.onsuccess = () => {
          const p = req.result as Patient;
          resolve(this.isValidPatient(p) ? p : null);
        };
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
      (p.fullName || '').toLowerCase().includes(q) ||
      (p.mrn || '').toLowerCase().includes(q) ||
      (p.phone || '').includes(q) ||
      (p.diagnosis || '').toLowerCase().includes(q) ||
      (p.address || '').toLowerCase().includes(q)
    );
  }

  // Duplicate patient detection
  async checkDuplicatePatient(fullName: string, phone: string, excludeId?: string): Promise<Patient | null> {
    const patients = await this.getAllPatients();
    const cleanName = (fullName || '').toLowerCase().trim();
    const cleanPhone = (phone || '').replace(/\D/g, '');

    for (const p of patients) {
      if (excludeId && p.id === excludeId) continue;
      
      const pCleanName = (p.fullName || '').toLowerCase().trim();
      const pCleanPhone = (p.phone || '').replace(/\D/g, '');

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
      if (p && typeof p.mrn === 'string') {
        const match = p.mrn.match(/RM-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNumber) maxNumber = num;
        }
      }
    }
    const nextNumber = maxNumber + 1;
    return `RM-${String(nextNumber).padStart(5, '0')}`;
  }

  async savePatient(patient: Patient): Promise<Patient> {
    const cleanName = (patient.fullName || '').trim();
    if (!cleanName || cleanName === '-' || cleanName.toLowerCase() === 'undefined' || cleanName.toLowerCase() === 'null' || cleanName.toLowerCase() === 'tanpa nama') {
      throw new Error('Nama pasien wajib diisi.');
    }

    const finalPatient: Patient = {
      ...patient,
      fullName: cleanName,
      id: patient.id || `p-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      mrn: patient.mrn?.trim() || (await this.generateMRN()),
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
          const v = docSnap.data() as TherapyVisit;
          if (!v.id?.startsWith('v-seed-') && !v.patientId?.startsWith('p-seed-')) {
            list.push(v);
          }
        });
        list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.visitNumber || 0) - (a.visitNumber || 0));
        if (list.length > 0) {
          await this.cacheLocalVisits(list);
          return list;
        } else {
          const localList = await this.getLocalVisits();
          if (localList.length > 0) {
            this.syncLocalToCloud().catch((err) => console.warn('Background sync visits error:', err));
            return localList;
          }
          return [];
        }
      } catch (err) {
        console.warn('Firestore getAllVisits error, reading local:', err);
      }
    }

    return this.getLocalVisits();
  }

  async getVisitsByPatient(patientId: string): Promise<TherapyVisit[]> {
    const visits = await this.getAllVisits();
    return visits
      .filter(v => v.patientId === patientId)
      .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.visitNumber || 0) - (b.visitNumber || 0));
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
    visits.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

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

  // APPOINTMENTS (JADWAL PASIEN)
  async getAllAppointments(): Promise<Appointment[]> {
    if (isFirebaseReady && db) {
      try {
        let cloudList: Appointment[] = [];

        // 1. Fetch from Firestore settings/appointments master document
        try {
          const docSnap = await getDoc(doc(db, 'settings', 'appointments'));
          if (docSnap.exists() && Array.isArray(docSnap.data()?.list)) {
            cloudList = docSnap.data()?.list as Appointment[];
          }
        } catch (e) {
          console.warn('Firestore getDoc settings/appointments warning:', e);
        }

        // 2. Try top-level appointments collection if permitted
        try {
          const snap = await getDocs(collection(db, 'appointments'));
          if (!snap.empty) {
            const existingIds = new Set(cloudList.map((a) => a.id));
            snap.forEach((d) => {
              const a = d.data() as Appointment;
              if (!existingIds.has(a.id)) {
                cloudList.push(a);
              }
            });
          }
        } catch {
          // Top-level appointments collection might be restricted, fallback to settings/appointments
        }

        // 3. Smart reconciliation: Check if there are local appointments not yet in Firestore
        const localList = await this.getLocalAppointments();
        const cloudIds = new Set(cloudList.map((a) => a.id));
        const unsynced = localList.filter((a) => !cloudIds.has(a.id));

        if (unsynced.length > 0) {
          console.log(`[Firestore Sync] Auto-uploading ${unsynced.length} unsynced local appointments to Firestore`);
          cloudList = [...cloudList, ...unsynced];
          try {
            await setDoc(doc(db, 'settings', 'appointments'), {
              list: cleanForFirestore(cloudList),
              totalCount: cloudList.length,
              updatedAt: new Date().toISOString(),
            });
            for (const a of unsynced) {
              await setDoc(doc(db, 'settings', a.id), cleanForFirestore(a));
              try {
                await setDoc(doc(db, 'appointments', a.id), cleanForFirestore(a));
              } catch {
                // ignore
              }
            }
          } catch (syncErr) {
            console.warn('Auto sync appointments error:', syncErr);
          }
        }

        cloudList.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (a.time || '').localeCompare(b.time || ''));
        await this.cacheLocalAppointments(cloudList);
        return cloudList;
      } catch (err) {
        console.warn('Firestore getAllAppointments error, reading local:', err);
      }
    }

    return this.getLocalAppointments();
  }

  async getAppointmentsByDate(date: string): Promise<Appointment[]> {
    const all = await this.getAllAppointments();
    return all.filter((a) => a.date === date);
  }

  // Dedicated sync method for schedules
  async syncAppointmentsToCloud(): Promise<{ success: boolean; syncedCount: number; totalCount: number }> {
    const local = await this.getLocalAppointments();
    if (!isFirebaseReady || !db) {
      return { success: false, syncedCount: 0, totalCount: local.length };
    }

    try {
      // 1. Update master document in settings/appointments
      await setDoc(doc(db, 'settings', 'appointments'), {
        list: cleanForFirestore(local),
        totalCount: local.length,
        updatedAt: new Date().toISOString(),
        syncedAt: new Date().toISOString(),
      });

      // 2. Save each appointment as individual document in settings
      for (const a of local) {
        await setDoc(doc(db, 'settings', a.id), cleanForFirestore(a));
        try {
          await setDoc(doc(db, 'appointments', a.id), cleanForFirestore(a));
        } catch {
          // ignore
        }
      }

      return {
        success: true,
        syncedCount: local.length,
        totalCount: local.length,
      };
    } catch (err) {
      console.error('syncAppointmentsToCloud error:', err);
      throw err;
    }
  }

  async saveAppointment(appt: Partial<Appointment> & { patientId: string; patientName: string; mrn: string; date: string; time: string }): Promise<Appointment> {
    const finalAppt: Appointment = {
      id: appt.id || `appt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      patientId: appt.patientId,
      patientName: appt.patientName,
      mrn: appt.mrn,
      patientPhone: appt.patientPhone || '',
      date: appt.date,
      time: appt.time,
      endTime: appt.endTime || '',
      durationMinutes: appt.durationMinutes || 60,
      location: appt.location || 'Klinik',
      therapist: appt.therapist || 'Bintang',
      status: appt.status || 'Dijadwalkan',
      complaintOrService: appt.complaintOrService || '',
      notes: appt.notes || '',
      createdAt: appt.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Write to Firebase Firestore immediately
    if (isFirebaseReady && db) {
      try {
        // A. Update individual appointment document in settings collection (e.g. settings/appt-...)
        await setDoc(doc(db, 'settings', finalAppt.id), cleanForFirestore(finalAppt));

        // B. Update master appointments document in settings collection (settings/appointments)
        let currentList: Appointment[] = [];
        try {
          const docSnap = await getDoc(doc(db, 'settings', 'appointments'));
          if (docSnap.exists() && Array.isArray(docSnap.data()?.list)) {
            currentList = docSnap.data()?.list as Appointment[];
          }
        } catch {
          currentList = await this.getLocalAppointments();
        }

        const idx = currentList.findIndex((a) => a.id === finalAppt.id);
        if (idx >= 0) {
          currentList[idx] = finalAppt;
        } else {
          currentList.push(finalAppt);
        }

        await setDoc(doc(db, 'settings', 'appointments'), {
          list: cleanForFirestore(currentList),
          totalCount: currentList.length,
          updatedAt: new Date().toISOString(),
        });

        // C. Also update patient's document in Firestore with upcoming appointment details
        if (finalAppt.patientId) {
          try {
            const pDocRef = doc(db, 'patients', finalAppt.patientId);
            const pSnap = await getDoc(pDocRef);
            if (pSnap.exists()) {
              const patientAppts = currentList.filter((a) => a.patientId === finalAppt.patientId);
              await updateDoc(pDocRef, {
                nextAppointmentDate: finalAppt.date,
                nextAppointmentTime: finalAppt.time,
                scheduledAppointmentsCount: patientAppts.length,
                updatedAt: new Date().toISOString(),
              });
            }
          } catch (pErr) {
            console.warn('Update patient appointment reference warning:', pErr);
          }
        }

        // D. Also attempt top-level appointments collection if permitted
        try {
          await setDoc(doc(db, 'appointments', finalAppt.id), cleanForFirestore(finalAppt));
        } catch {
          // Top-level write might be restricted by legacy Firestore rules, already stored in settings/appointments
        }
      } catch (err) {
        console.error('Firestore saveAppointment error:', err);
      }
    }

    // 2. Write to local IndexedDB
    try {
      const localDb = await this.getDB();
      const tx = localDb.transaction('appointments', 'readwrite');
      const store = tx.objectStore('appointments');
      store.put(finalAppt);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (idbErr) {
      console.warn('IndexedDB saveAppointment warning:', idbErr);
    }

    // 3. Always maintain localStorage backup for instant read/offline
    try {
      const raw = localStorage.getItem('bfisio_appointments');
      const list: Appointment[] = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex((a) => a.id === finalAppt.id);
      if (idx >= 0) {
        list[idx] = finalAppt;
      } else {
        list.push(finalAppt);
      }
      localStorage.setItem('bfisio_appointments', JSON.stringify(list));
    } catch (lsErr) {
      console.warn('LocalStorage saveAppointment warning:', lsErr);
    }

    return finalAppt;
  }

  async deleteAppointment(id: string): Promise<void> {
    // 1. Delete from Firestore
    if (isFirebaseReady && db) {
      try {
        // Delete individual doc in settings
        await deleteDoc(doc(db, 'settings', id));

        // Update settings/appointments master list
        const docSnap = await getDoc(doc(db, 'settings', 'appointments'));
        if (docSnap.exists() && Array.isArray(docSnap.data()?.list)) {
          const currentList = (docSnap.data()?.list as Appointment[]).filter((a) => a.id !== id);
          await setDoc(doc(db, 'settings', 'appointments'), {
            list: cleanForFirestore(currentList),
            totalCount: currentList.length,
            updatedAt: new Date().toISOString(),
          });
        }

        // Try deleting from top-level appointments collection
        try {
          await deleteDoc(doc(db, 'appointments', id));
        } catch {
          // ignore
        }
      } catch (err) {
        console.warn('Firestore deleteAppointment warning:', err);
      }
    }

    // 2. Delete from local IndexedDB
    try {
      const localDb = await this.getDB();
      const tx = localDb.transaction('appointments', 'readwrite');
      const store = tx.objectStore('appointments');
      store.delete(id);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (idbErr) {
      console.warn('IndexedDB deleteAppointment warning:', idbErr);
    }

    // 3. Delete from localStorage
    try {
      const raw = localStorage.getItem('bfisio_appointments');
      if (raw) {
        const list: Appointment[] = JSON.parse(raw);
        const filtered = list.filter((a) => a.id !== id);
        localStorage.setItem('bfisio_appointments', JSON.stringify(filtered));
      }
    } catch (lsErr) {
      console.warn('LocalStorage deleteAppointment warning:', lsErr);
    }
  }

  async updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<void> {
    const list = await this.getAllAppointments();
    const appt = list.find((a) => a.id === id);
    if (!appt) return;
    await this.saveAppointment({ ...appt, status });
  }

  // Clear all appointments from calendar (0 scheduled patients)
  async clearAllAppointments(): Promise<void> {
    // 1. Delete all appointments from Firestore
    if (isFirebaseReady && db) {
      try {
        await setDoc(doc(db, 'settings', 'appointments'), {
          list: [],
          totalCount: 0,
          updatedAt: new Date().toISOString(),
        });

        // Also delete any settings documents starting with appt-
        const sSnap = await getDocs(collection(db, 'settings'));
        for (const d of sSnap.docs) {
          if (d?.id?.startsWith('appt-')) {
            await deleteDoc(d.ref);
          }
        }

        try {
          const aSnap = await getDocs(collection(db, 'appointments'));
          if (!aSnap.empty) {
            const batch = writeBatch(db);
            aSnap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
            await batch.commit();
          }
        } catch {
          // ignore
        }
      } catch (err) {
        console.warn('Firestore clearAllAppointments error:', err);
      }
    }

    // 2. Clear from IndexedDB
    try {
      const localDb = await this.getDB();
      const tx = localDb.transaction('appointments', 'readwrite');
      tx.objectStore('appointments').clear();
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('IndexedDB clear appointments error:', err);
    }

    // 3. Clear from LocalStorage fallback
    try {
      localStorage.setItem('bfisio_appointments', JSON.stringify([]));
    } catch (err) {
      console.warn('LocalStorage clear appointments error:', err);
    }
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
      if (!v) continue;
      const vDate = typeof v.date === 'string' ? v.date : '';
      if (vDate === today) {
        if (v.patientId) todayPatientIds.add(v.patientId);
        if (v.payment) {
          todayRevenue += (v.payment.paidAmount || (v.payment.status === 'Lunas' ? v.payment.total : 0));
        }
      }

      if (vDate && vDate.startsWith(currentMonth)) {
        if (v.payment) {
          thisMonthRevenue += (v.payment.paidAmount || (v.payment.status === 'Lunas' ? v.payment.total : 0));
        }
      }

      if (v.location === 'Home Care') {
        homeCareVisits++;
      } else {
        clinicVisits++;
      }

      if (v.payment) {
        if (v.payment.status === 'Belum Lunas' || (v.payment.status === 'DP' && (v.payment.remainingBalance || 0) > 0)) {
          unpaidTransactions++;
        }

        outstandingBalanceTotal += (v.payment.remainingBalance || 0);
        therapyRevenueTotal += (v.payment.therapyPrice || 0);
        transportRevenueTotal += (v.payment.transport || 0);
      }
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
    const appointments = await this.getAllAppointments();
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
        appointments,
        settings,
      },
    };

    return JSON.stringify(backupData, null, 2);
  }

  async restoreBackup(jsonString: string): Promise<{ success: boolean; patientsCount: number; visitsCount: number; appointmentsCount?: number; message?: string }> {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.data || !Array.isArray(parsed.data.patients) || !Array.isArray(parsed.data.visits)) {
        return { success: false, patientsCount: 0, visitsCount: 0, message: 'Format file backup tidak valid.' };
      }

      const patients: Patient[] = parsed.data.patients;
      const visits: TherapyVisit[] = parsed.data.visits;
      const appointments: Appointment[] = Array.isArray(parsed.data.appointments) ? parsed.data.appointments : [];
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
          batch.set(doc(db, 'settings', 'appointments'), {
            list: cleanForFirestore(appointments),
            totalCount: appointments.length,
            updatedAt: new Date().toISOString(),
          });
          await batch.commit();

          for (const a of appointments) {
            try {
              await setDoc(doc(db, 'settings', a.id), cleanForFirestore(a));
              try {
                await setDoc(doc(db, 'appointments', a.id), cleanForFirestore(a));
              } catch {
                // ignore
              }
            } catch {
              // ignore
            }
          }
        } catch (err) {
          console.error('Firestore restore error:', err);
        }
      }

      // Clear & write local
      try {
        const localDb = await this.getDB();
        const tx = localDb.transaction(['patients', 'visits', 'appointments', 'settings'], 'readwrite');
        tx.objectStore('patients').clear();
        tx.objectStore('visits').clear();
        tx.objectStore('appointments').clear();

        for (const p of patients) {
          tx.objectStore('patients').put(p);
        }
        for (const v of visits) {
          tx.objectStore('visits').put(v);
        }
        for (const a of appointments) {
          tx.objectStore('appointments').put(a);
        }
        tx.objectStore('settings').put({ id: 'app_settings', ...settings });

        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch {
        localStorage.setItem('bfisio_patients', JSON.stringify(patients));
        localStorage.setItem('bfisio_visits', JSON.stringify(visits));
        localStorage.setItem('bfisio_appointments', JSON.stringify(appointments));
        localStorage.setItem('bfisio_settings', JSON.stringify(settings));
      }

      return {
        success: true,
        patientsCount: patients.length,
        visitsCount: visits.length,
        appointmentsCount: appointments.length,
      };
    } catch (e) {
      return { success: false, patientsCount: 0, visitsCount: 0, message: (e as Error).message };
    }
  }

  // Force sync local storage & IndexedDB to Firestore
  async syncLocalToCloud(): Promise<{ success: boolean; syncedPatients: number; syncedVisits: number; syncedAppointments: number }> {
    if (!isFirebaseReady || !db) {
      throw new Error('Firebase Firestore belum terhubung.');
    }
    const patients = (await this.getLocalPatients()).filter((p) => !p.id?.startsWith('p-seed-'));
    const visits = (await this.getLocalVisits()).filter((v) => !v.id?.startsWith('v-seed-') && !v.patientId?.startsWith('p-seed-'));
    const appointments = await this.getLocalAppointments();
    const settings = await this.getSettings();

    const batch = writeBatch(db);
    for (const p of patients) {
      batch.set(doc(db, 'patients', p.id), cleanForFirestore(p));
    }
    for (const v of visits) {
      batch.set(doc(db, 'visits', v.id), cleanForFirestore(v));
    }
    batch.set(doc(db, 'settings', 'app_settings'), cleanForFirestore({ id: 'app_settings', ...settings }));
    batch.set(doc(db, 'settings', 'appointments'), {
      list: cleanForFirestore(appointments),
      totalCount: appointments.length,
      updatedAt: new Date().toISOString(),
    });
    await batch.commit();

    // Also write individual appointment documents into settings and collection if permitted
    for (const a of appointments) {
      try {
        await setDoc(doc(db, 'settings', a.id), cleanForFirestore(a));
        try {
          await setDoc(doc(db, 'appointments', a.id), cleanForFirestore(a));
        } catch {
          // ignore
        }
      } catch (err) {
        console.warn('Sync individual appointment error:', a.id, err);
      }
    }

    return {
      success: true,
      syncedPatients: patients.length,
      syncedVisits: visits.length,
      syncedAppointments: appointments.length,
    };
  }

  // Force pull from Firestore to update local storage & IndexedDB
  async pullCloudToLocal(): Promise<{ success: boolean; patientsCount: number; visitsCount: number; appointmentsCount: number }> {
    if (!isFirebaseReady || !db) {
      throw new Error('Firebase Firestore belum terhubung.');
    }
    const pSnap = await getDocs(collection(db, 'patients'));
    const vSnap = await getDocs(collection(db, 'visits'));

    let cloudAppointments: Appointment[] = [];
    try {
      const apptDoc = await getDoc(doc(db, 'settings', 'appointments'));
      if (apptDoc.exists() && Array.isArray(apptDoc.data()?.list)) {
        cloudAppointments = apptDoc.data()?.list as Appointment[];
      }
    } catch (e) {
      console.warn('pullCloudToLocal read settings/appointments:', e);
    }

    try {
      const aSnap = await getDocs(collection(db, 'appointments'));
      const topAppts = aSnap.docs.map((d) => d.data() as Appointment);
      if (topAppts.length > 0) {
        const idSet = new Set(cloudAppointments.map((a) => a.id));
        for (const a of topAppts) {
          if (!idSet.has(a.id)) cloudAppointments.push(a);
        }
      }
    } catch {
      // ignore
    }

    const cloudPatients: Patient[] = [];
    pSnap.forEach((d) => {
      const p = d.data() as Patient;
      if (!p.id?.startsWith('p-seed-')) cloudPatients.push(p);
    });

    const cloudVisits: TherapyVisit[] = [];
    vSnap.forEach((d) => {
      const v = d.data() as TherapyVisit;
      if (!v.id?.startsWith('v-seed-') && !v.patientId?.startsWith('p-seed-')) cloudVisits.push(v);
    });

    cloudPatients.sort((a, b) => (b.lastVisitDate || b.createdAt || '').localeCompare(a.lastVisitDate || a.createdAt || ''));
    cloudVisits.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.visitNumber || 0) - (a.visitNumber || 0));
    cloudAppointments.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (a.time || '').localeCompare(b.time || ''));

    await this.cacheLocalPatients(cloudPatients);
    await this.cacheLocalVisits(cloudVisits);
    await this.cacheLocalAppointments(cloudAppointments);

    return {
      success: true,
      patientsCount: cloudPatients.length,
      visitsCount: cloudVisits.length,
      appointmentsCount: cloudAppointments.length,
    };
  }

  // Test live connection to Firestore (read + write test)
  async testFirestoreConnection(): Promise<{ success: boolean; message: string; latencyMs: number }> {
    if (!isFirebaseReady || !db) {
      return {
        success: false,
        message: 'Firebase belum terkonfigurasi di browser ini atau kredensial belum terbaca.',
        latencyMs: 0,
      };
    }
    const start = performance.now();
    try {
      const testRef = doc(db, 'settings', 'live_sync_ping');
      await setDoc(testRef, { lastPing: new Date().toISOString(), platform: 'Vercel / Web' });
      await getDoc(testRef);
      const latencyMs = Math.round(performance.now() - start);
      return {
        success: true,
        message: `Koneksi Firestore aktif & responsif (${latencyMs} ms). Project: ${firebaseConfig?.projectId || 'b-fisio-app'}`,
        latencyMs,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Gagal mengakses Firestore: ${err.message || err.code || 'Izin ditolak atau jaringan terputus'}`,
        latencyMs: 0,
      };
    }
  }

  // Diagnostic status comparing Cloud vs Local data
  async getDiagnostics(): Promise<{
    isCloud: boolean;
    projectId: string;
    cloudPatients: number;
    cloudVisits: number;
    cloudAppointments: number;
    localPatients: number;
    localVisits: number;
    localAppointments: number;
  }> {
    const localPatients = (await this.getLocalPatients()).filter((p) => !p?.id?.startsWith('p-seed-'));
    const localVisits = (await this.getLocalVisits()).filter((v) => !v?.id?.startsWith('v-seed-'));
    const localAppointments = await this.getLocalAppointments();

    let cloudPatients = 0;
    let cloudVisits = 0;
    let cloudAppointments = 0;

    if (isFirebaseReady && db) {
      try {
        const pSnap = await getDocs(collection(db, 'patients'));
        cloudPatients = pSnap.docs.filter((d) => !d?.id?.startsWith('p-seed-')).length;
        const vSnap = await getDocs(collection(db, 'visits'));
        cloudVisits = vSnap.docs.filter((d) => !d?.id?.startsWith('v-seed-') && !d.data()?.patientId?.startsWith('p-seed-')).length;
        
        try {
          const apptDoc = await getDoc(doc(db, 'settings', 'appointments'));
          if (apptDoc.exists() && Array.isArray(apptDoc.data()?.list)) {
            cloudAppointments = apptDoc.data()?.list.length || 0;
          }
        } catch {
          // ignore
        }

        if (cloudAppointments === 0) {
          try {
            const aSnap = await getDocs(collection(db, 'appointments'));
            cloudAppointments = aSnap.size;
          } catch {
            // ignore
          }
        }
      } catch (e) {
        console.warn('Diagnostics cloud fetch error:', e);
      }
    }

    return {
      isCloud: isFirebaseReady && !!db,
      projectId: firebaseConfig?.projectId || 'b-fisio-app',
      cloudPatients,
      cloudVisits,
      cloudAppointments,
      localPatients: localPatients.length,
      localVisits: localVisits.length,
      localAppointments: localAppointments.length,
    };
  }

  // Clear all patient, visit, and appointment data (0 patients)
  async clearAllPatientData(): Promise<void> {
    if (isFirebaseReady && db) {
      try {
        const pSnap = await getDocs(collection(db, 'patients'));
        const vSnap = await getDocs(collection(db, 'visits'));

        const batch = writeBatch(db);
        pSnap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
        vSnap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
        batch.set(doc(db, 'settings', 'appointments'), {
          list: [],
          totalCount: 0,
          updatedAt: new Date().toISOString(),
        });
        await batch.commit();

        // Clear settings appointment docs
        const sSnap = await getDocs(collection(db, 'settings'));
        for (const d of sSnap.docs) {
          if (d?.id?.startsWith('appt-')) {
            await deleteDoc(d.ref);
          }
        }

        try {
          const aSnap = await getDocs(collection(db, 'appointments'));
          if (!aSnap.empty) {
            const aBatch = writeBatch(db);
            aSnap.docs.forEach((docSnap) => aBatch.delete(docSnap.ref));
            await aBatch.commit();
          }
        } catch {
          // ignore
        }
      } catch (err) {
        console.error('Error clearing Firestore patients/visits/appointments:', err);
      }
    }

    try {
      const localDb = await this.getDB();
      const tx = localDb.transaction(['patients', 'visits', 'appointments'], 'readwrite');
      tx.objectStore('patients').clear();
      tx.objectStore('visits').clear();
      tx.objectStore('appointments').clear();
    } catch (err) {
      console.warn('IndexedDB clear error:', err);
    }

    try {
      localStorage.setItem('bfisio_patients', JSON.stringify([]));
      localStorage.setItem('bfisio_visits', JSON.stringify([]));
      localStorage.setItem('bfisio_appointments', JSON.stringify([]));
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
