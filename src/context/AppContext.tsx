import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Patient,
  TherapyVisit,
  AppSettings,
  ToastNotification,
  ActiveView,
  DashboardStats,
  ThemeMode,
  Appointment,
  AppointmentStatus,
} from '../types';
import { dbService } from '../services/db';

interface AppContextType {
  // Navigation & View
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  selectedPatientId: string | null;
  setSelectedPatientId: (id: string | null) => void;
  viewPatientProfile: (patientId: string) => void;

  // Data
  patients: Patient[];
  visits: TherapyVisit[];
  appointments: Appointment[];
  settings: AppSettings;
  stats: DashboardStats | null;
  isLoading: boolean;
  refreshData: () => Promise<void>;

  // Theme
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;

  // Toast
  toasts: ToastNotification[];
  showToast: (type: 'success' | 'error' | 'info' | 'warning', message: string, title?: string) => void;
  dismissToast: (id: string) => void;

  // Modals
  isPatientModalOpen: boolean;
  editingPatient: Patient | null;
  openAddPatientModal: () => void;
  openEditPatientModal: (patient: Patient) => void;
  closePatientModal: () => void;

  isVisitModalOpen: boolean;
  editingVisit: TherapyVisit | null;
  preselectedPatientForVisit: Patient | null;
  openAddVisitModal: (patient?: Patient | null) => void;
  openEditVisitModal: (visit: TherapyVisit) => void;
  closeVisitModal: () => void;

  // Appointment Modal
  isAppointmentModalOpen: boolean;
  editingAppointment: Appointment | null;
  preselectedDateForAppointment: string | null;
  preselectedTimeForAppointment: string | null;
  preselectedPatientIdForAppointment: string | null;
  openAddAppointmentModal: (date?: string, time?: string, patientId?: string) => void;
  openEditAppointmentModal: (appt: Appointment) => void;
  closeAppointmentModal: () => void;
  saveAppointment: (appt: Partial<Appointment> & { patientId: string; patientName: string; mrn: string; date: string; time: string }) => Promise<Appointment>;
  deleteAppointment: (id: string) => Promise<void>;
  updateAppointmentStatus: (id: string, status: AppointmentStatus) => Promise<void>;
  clearAllAppointments: () => Promise<void>;
  syncAppointmentsToCloud: () => Promise<{ success: boolean; syncedCount: number; totalCount: number }>;

  isPrintModalOpen: boolean;
  printPatient: Patient | null;
  openPrintModal: (patient: Patient) => void;
  closePrintModal: () => void;

  // Settings
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;

  // Cloud Sync & Diagnostics
  syncLocalToCloud: () => Promise<{ success: boolean; syncedPatients: number; syncedVisits: number; syncedAppointments: number }>;
  pullCloudToLocal: () => Promise<{ success: boolean; patientsCount: number; visitsCount: number; appointmentsCount: number }>;
  testFirestoreConnection: () => Promise<{ success: boolean; message: string; latencyMs: number }>;
  getDiagnostics: () => Promise<{
    isCloud: boolean;
    projectId: string;
    cloudPatients: number;
    cloudVisits: number;
    cloudAppointments: number;
    localPatients: number;
    localVisits: number;
    localAppointments: number;
  }>;

  // Global Search
  globalSearch: string;
  setGlobalSearch: (q: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [visits, setVisits] = useState<TherapyVisit[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [settings, setSettingsState] = useState<AppSettings>({
    defaultTherapist: 'Bintang',
    therapists: ['Bintang', 'Nurul', 'Dimas', 'Sarah'],
    availableInterventions: [],
    defaultPricing: { therapyPriceHomeCare: 200000, therapyPriceClinic: 150000, defaultTransport: 35000 },
    theme: 'system',
    clinicInfo: {
      name: 'B Fisio Clinic & Home Care',
      tagline: 'Layanan Fisioterapi Profesional & Terpercaya',
      address: 'Jl. Pemuda No. 45, Jakarta Pusat',
      phone: '0812-3456-7890',
      strNumber: 'STR.Fisio.2024.08912',
    },
  });
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Theme
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('bfisio_theme') as ThemeMode;
    return saved || 'system';
  });

  // Toasts
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Modals
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<TherapyVisit | null>(null);
  const [preselectedPatientForVisit, setPreselectedPatientForVisit] = useState<Patient | null>(null);

  // Appointment Modal
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [preselectedDateForAppointment, setPreselectedDateForAppointment] = useState<string | null>(null);
  const [preselectedTimeForAppointment, setPreselectedTimeForAppointment] = useState<string | null>(null);
  const [preselectedPatientIdForAppointment, setPreselectedPatientIdForAppointment] = useState<string | null>(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printPatient, setPrintPatient] = useState<Patient | null>(null);

  // Global search
  const [globalSearch, setGlobalSearch] = useState('');

  // Toast helper
  const showToast = useCallback((type: 'success' | 'error' | 'info' | 'warning', message: string, title?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newToast: ToastNotification = { id, type, message, title, duration: 4000 };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Theme management effect
  const applyTheme = useCallback((mode: ThemeMode) => {
    const root = document.documentElement;
    const isDark =
      mode === 'dark' ||
      (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
      document.body.classList.add('dark');
      document.body.classList.remove('light');
      const themeMeta = document.querySelector('meta[name="theme-color"]');
      if (themeMeta) themeMeta.setAttribute('content', '#070D18');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      document.body.classList.remove('dark');
      document.body.classList.add('light');
      const themeMeta = document.querySelector('meta[name="theme-color"]');
      if (themeMeta) themeMeta.setAttribute('content', '#001F3F');
    }
  }, []);

  const setTheme = useCallback(
    (mode: ThemeMode) => {
      setThemeState(mode);
      localStorage.setItem('bfisio_theme', mode);
      applyTheme(mode);
      dbService.saveSettings({ theme: mode }).catch(() => {});
    },
    [applyTheme]
  );

  useEffect(() => {
    applyTheme(theme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyTheme]);

  // Refresh data
  const refreshData = useCallback(async () => {
    try {
      const [pts, vsts, appts, stt, st] = await Promise.all([
        dbService.getAllPatients(),
        dbService.getAllVisits(),
        dbService.getAllAppointments(),
        dbService.getSettings(),
        dbService.getDashboardStats(),
      ]);
      setPatients(pts);
      setVisits(vsts);
      setAppointments(appts);
      setSettingsState(stt);
      setStats(st);
    } catch (e) {
      console.error('Failed to refresh data:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load & real-time subscriptions
  useEffect(() => {
    let unsubPatients: () => void = () => {};
    let unsubVisits: () => void = () => {};
    let unsubAppts: () => void = () => {};

    const init = async () => {
      setIsLoading(true);
      await dbService.init();
      await refreshData();
      setIsLoading(false);

      unsubPatients = dbService.subscribePatients((cloudPatients) => {
        setPatients(cloudPatients);
      });
      unsubVisits = dbService.subscribeVisits((cloudVisits) => {
        setVisits(cloudVisits);
      });
      unsubAppts = dbService.subscribeAppointments((cloudAppts) => {
        setAppointments(cloudAppts);
      });
    };
    init();

    return () => {
      unsubPatients();
      unsubVisits();
      unsubAppts();
    };
  }, [refreshData]);

  // Navigation helpers
  const viewPatientProfile = useCallback((patientId: string) => {
    setSelectedPatientId(patientId);
    setActiveView('patient-profile');
  }, []);

  const openAddPatientModal = useCallback(() => {
    setEditingPatient(null);
    setIsPatientModalOpen(true);
  }, []);

  const openEditPatientModal = useCallback((patient: Patient) => {
    setEditingPatient(patient);
    setIsPatientModalOpen(true);
  }, []);

  const closePatientModal = useCallback(() => {
    setIsPatientModalOpen(false);
    setEditingPatient(null);
  }, []);

  const openAddVisitModal = useCallback((patient?: Patient | null) => {
    setEditingVisit(null);
    setPreselectedPatientForVisit(patient || null);
    setIsVisitModalOpen(true);
  }, []);

  const openEditVisitModal = useCallback((visit: TherapyVisit) => {
    setEditingVisit(visit);
    setPreselectedPatientForVisit(null);
    setIsVisitModalOpen(true);
  }, []);

  const closeVisitModal = useCallback(() => {
    setIsVisitModalOpen(false);
    setEditingVisit(null);
    setPreselectedPatientForVisit(null);
  }, []);

  // Appointment Modal Helpers
  const openAddAppointmentModal = useCallback((date?: string, time?: string, patientId?: string) => {
    setEditingAppointment(null);
    setPreselectedDateForAppointment(date || null);
    setPreselectedTimeForAppointment(time || null);
    setPreselectedPatientIdForAppointment(patientId || null);
    setIsAppointmentModalOpen(true);
  }, []);

  const openEditAppointmentModal = useCallback((appt: Appointment) => {
    setEditingAppointment(appt);
    setPreselectedDateForAppointment(null);
    setPreselectedTimeForAppointment(null);
    setPreselectedPatientIdForAppointment(null);
    setIsAppointmentModalOpen(true);
  }, []);

  const closeAppointmentModal = useCallback(() => {
    setIsAppointmentModalOpen(false);
    setEditingAppointment(null);
    setPreselectedDateForAppointment(null);
    setPreselectedTimeForAppointment(null);
    setPreselectedPatientIdForAppointment(null);
  }, []);

  const saveAppointment = useCallback(
    async (appt: Partial<Appointment> & { patientId: string; patientName: string; mrn: string; date: string; time: string }) => {
      const saved = await dbService.saveAppointment(appt);
      setAppointments((prev) => {
        const idx = prev.findIndex((a) => a.id === saved.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = saved;
          return copy.sort((a, b) => b.date.localeCompare(a.date) || a.time.localeCompare(b.time));
        }
        return [saved, ...prev].sort((a, b) => b.date.localeCompare(a.date) || a.time.localeCompare(b.time));
      });
      await refreshData();
      return saved;
    },
    [refreshData]
  );

  const deleteAppointment = useCallback(async (id: string) => {
    try {
      await dbService.deleteAppointment(id);
      await refreshData();
      showToast('success', 'Jadwal pasien berhasil dihapus.', 'Jadwal Dihapus');
    } catch {
      showToast('error', 'Gagal menghapus jadwal pasien.', 'Error');
    }
  }, [refreshData, showToast]);

  const updateAppointmentStatus = useCallback(async (id: string, status: AppointmentStatus) => {
    try {
      await dbService.updateAppointmentStatus(id, status);
      await refreshData();
      showToast('success', `Status jadwal diubah menjadi ${status}.`, 'Status Diperbarui');
    } catch {
      showToast('error', 'Gagal memperbarui status jadwal.', 'Error');
    }
  }, [refreshData, showToast]);

  const clearAllAppointments = useCallback(async () => {
    try {
      await dbService.clearAllAppointments();
      await refreshData();
      showToast('success', 'Semua jadwal pasien di kalender berhasil dihapus.', 'Kalender Bersih');
    } catch {
      showToast('error', 'Gagal membersihkan jadwal kalender.', 'Error');
    }
  }, [refreshData, showToast]);

  const openPrintModal = useCallback((patient: Patient) => {
    setPrintPatient(patient);
    setIsPrintModalOpen(true);
  }, []);

  const closePrintModal = useCallback(() => {
    setIsPrintModalOpen(false);
    setPrintPatient(null);
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    const updated = await dbService.saveSettings(newSettings);
    setSettingsState(updated);
  }, []);

  const syncLocalToCloud = useCallback(async () => {
    const res = await dbService.syncLocalToCloud();
    await refreshData();
    return res;
  }, [refreshData]);

  const syncAppointmentsToCloud = useCallback(async () => {
    const res = await dbService.syncAppointmentsToCloud();
    await refreshData();
    return res;
  }, [refreshData]);

  const pullCloudToLocal = useCallback(async () => {
    const res = await dbService.pullCloudToLocal();
    await refreshData();
    return res;
  }, [refreshData]);

  const testFirestoreConnection = useCallback(async () => {
    return await dbService.testFirestoreConnection();
  }, []);

  const getDiagnostics = useCallback(async () => {
    return await dbService.getDiagnostics();
  }, []);

  return (
    <AppContext.Provider
      value={{
        activeView,
        setActiveView,
        selectedPatientId,
        setSelectedPatientId,
        viewPatientProfile,
        patients,
        visits,
        appointments,
        settings,
        stats,
        isLoading,
        refreshData,
        theme,
        setTheme,
        toasts,
        showToast,
        dismissToast,
        isPatientModalOpen,
        editingPatient,
        openAddPatientModal,
        openEditPatientModal,
        closePatientModal,
        isVisitModalOpen,
        editingVisit,
        preselectedPatientForVisit,
        openAddVisitModal,
        openEditVisitModal,
        closeVisitModal,
        isAppointmentModalOpen,
        editingAppointment,
        preselectedDateForAppointment,
        preselectedTimeForAppointment,
        preselectedPatientIdForAppointment,
        openAddAppointmentModal,
        openEditAppointmentModal,
        closeAppointmentModal,
        saveAppointment,
        deleteAppointment,
        updateAppointmentStatus,
        clearAllAppointments,
        syncAppointmentsToCloud,
        isPrintModalOpen,
        printPatient,
        openPrintModal,
        closePrintModal,
        updateSettings,
        syncLocalToCloud,
        pullCloudToLocal,
        testFirestoreConnection,
        getDiagnostics,
        globalSearch,
        setGlobalSearch,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
