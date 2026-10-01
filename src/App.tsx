import React, { useState, useEffect } from 'react';
import { AppProvider } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardView } from './views/DashboardView';
import { BudgetInputView } from './views/BudgetInputView';
import { RealizationInputView } from './views/RealizationInputView';
import { RealizationImportView } from './views/RealizationImportView';
import { MatrixView } from './views/MatrixView';
import { PerformanceView } from './views/PerformanceView';
import { PrognosaView } from './views/PrognosaView';
import { ReportsView } from './views/ReportsView';
import { ActiveTab } from './types';

function MainApp() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('monev_sidebar_collapsed');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('monev_sidebar_collapsed', JSON.stringify(isSidebarCollapsed));
    } catch {
      // Ignore storage errors
    }
  }, [isSidebarCollapsed]);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onNavigateTab={setActiveTab} />;
      case 'budget_input':
        return <BudgetInputView />;
      case 'realization_input':
        return <RealizationInputView />;
      case 'realization_import':
        return <RealizationImportView />;
      case 'matrix':
        return <MatrixView />;
      case 'performance':
        return <PerformanceView />;
      case 'prognosa':
        return <PrognosaView />;
      case 'reports':
        return <ReportsView />;
      default:
        return <DashboardView onNavigateTab={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900 antialiased selection:bg-blue-600 selection:text-white overflow-hidden">
      {/* Vertical Sidebar on the Left */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />

      {/* Main Content Area (Right Side) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Navbar */}
        <TopBar
          activeTab={activeTab}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        />

        {/* Dynamic Content View */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {renderActiveView()}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-3.5 text-center text-xs text-slate-500 print:hidden mt-auto">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-slate-700">Monev Anggaran & Realisasi SAP</span>
              <span>— Berdasarkan Model Google Sheet & SKKO / RKAP</span>
            </div>
            <p className="text-slate-400">
              Menu Vertikal Samping Aktif • Penyimpanan lokal & Sinkronisasi Excel
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
