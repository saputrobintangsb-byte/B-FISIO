import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { PatientListView } from './components/PatientListView';
import { PatientProfileView } from './components/PatientProfileView';
import { TherapyHistoryView } from './components/TherapyHistoryView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { AddEditPatientModal } from './components/AddEditPatientModal';
import { AddEditVisitModal } from './components/AddEditVisitModal';
import { PrintMedicalRecordModal } from './components/PrintMedicalRecordModal';
import { ToastContainer } from './components/ToastContainer';

const MainLayout: React.FC = () => {
  const { activeView } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] dark:bg-[#060B18] text-[#0F172A] dark:text-slate-100 font-sans overflow-hidden transition-colors">
      {/* Sidebar for Navigation */}
      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden lg:pl-64">
        {/* Top Header */}
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          {activeView === 'dashboard' && <DashboardView />}
          {activeView === 'patients' && <PatientListView />}
          {activeView === 'patient-profile' && <PatientProfileView />}
          {activeView === 'therapy-history' && <TherapyHistoryView />}
          {activeView === 'reports' && <ReportsView />}
          {activeView === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Global Modals & Dialogs */}
      <AddEditPatientModal />
      <AddEditVisitModal />
      <PrintMedicalRecordModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
