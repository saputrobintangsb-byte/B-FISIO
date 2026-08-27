import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Patient,
  TherapyVisit,
  AppSettings,
  ToastNotification,
  ActiveView,
  DashboardStats,
  ThemeMode,
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

  isPrintModalOpen: boolean;
  printPatient: Patient | null;
  openPrintModal: (patient: Patient) => void;
  closePrintModal: () => void;

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
    } else {
      root.classList.remove('dark');
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
      const [pts, vsts, stt, st] = await Promise.all([
        dbService.getAllPatients(),
        dbService.getAllVisits(),
        dbService.getSettings(),
        dbService.getDashboardStats(),
      ]);
      setPatients(pts);
      setVisits(vsts);
      setSettingsState(stt);
      setStats(st);
    } catch (e) {
      console.error('Failed to refresh data:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await dbService.init();
      await refreshData();
      setIsLoading(false);
    };
    init();
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

  const openPrintModal = useCallback((patient: Patient) => {
    setPrintPatient(patient);
    setIsPrintModalOpen(true);
  }, []);

  const closePrintModal = useCallback(() => {
    setIsPrintModalOpen(false);
    setPrintPatient(null);
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
        isPrintModalOpen,
        printPatient,
        openPrintModal,
        closePrintModal,
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
