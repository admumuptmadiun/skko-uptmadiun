import React from 'react';
import {
  Menu,
  PanelLeftClose,
  PanelLeft,
  Calendar,
  Download,
  RotateCcw,
  TrendingUp,
  LayoutDashboard,
  FileEdit,
  Edit3,
  FileSpreadsheet,
  TableProperties,
  Target,
  Calculator,
  FileText
} from 'lucide-react';
import { ActiveTab } from '../types';
import { useApp } from '../context/AppContext';
import { MONTH_NAMES, formatRupiahShort, formatPercent } from '../utils/formatters';
import { exportFullReportToExcel } from '../utils/excelExporter';

interface TopBarProps {
  activeTab: ActiveTab;
  onToggleMobileSidebar: () => void;
  isSidebarCollapsed: boolean;
  onToggleCollapse: () => void;
}

const TAB_TITLES: Record<ActiveTab, { title: string; subtitle: string; icon: React.FC<{ className?: string }> }> = {
  dashboard: {
    title: 'Dashboard Utama',
    subtitle: 'Ringkasan eksekutif anggaran & realisasi per pos beban',
    icon: LayoutDashboard,
  },
  budget_input: {
    title: 'Input & Alokasi Anggaran',
    subtitle: 'Manajemen alokasi SKKO / RKAP tahunan & rincian per bulan',
    icon: FileEdit,
  },
  realization_input: {
    title: 'Input Realisasi Manual',
    subtitle: 'Pencatatan realisasi bulanan langsung per kode akun GL',
    icon: Edit3,
  },
  realization_import: {
    title: 'Import Realisasi Excel / CSV',
    subtitle: 'Sinkronisasi data otomatis dari berkas SAP FBL3N atau template spreadsheet',
    icon: FileSpreadsheet,
  },
  matrix: {
    title: 'Matriks Monitoring Bulanan',
    subtitle: 'Tabel komparasi alokasi vs realisasi per akun GL s.d. cut-off',
    icon: TableProperties,
  },
  performance: {
    title: 'Indikator Kinerja & Evaluasi',
    subtitle: 'Monitoring target kinerja persentase serapan indikator & pos',
    icon: Target,
  },
  prognosa: {
    title: 'Prognosa & Alih Daya (TAD)',
    subtitle: 'Estimasi serapan s/d akhir tahun & rincian belanja alih daya',
    icon: Calculator,
  },
  reports: {
    title: 'Laporan & Ringkasan Eksekutif',
    subtitle: 'Format laporan siap cetak, ringkasan per pos, dan export data',
    icon: FileText,
  },
};

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onToggleMobileSidebar,
  isSidebarCollapsed,
  onToggleCollapse,
}) => {
  const {
    budgetItems,
    indicators,
    additionalTransactions,
    selectedYear,
    selectedMonth,
    setSelectedYear,
    setSelectedMonth,
    resetToDefault,
  } = useApp();

  const totalBudget = budgetItems
    .filter((i) => !i.isGroupHeader)
    .reduce((sum, item) => sum + (item.budgetAnnual || 0), 0);

  const totalRealizationYTD = budgetItems
    .filter((i) => !i.isGroupHeader)
    .reduce((sum, item) => {
      let itemYTD = 0;
      for (let m = 0; m <= selectedMonth; m++) {
        itemYTD += item.realizationMonthly?.[m] || 0;
      }
      return sum + itemYTD;
    }, 0);

  const absorptionRate = totalBudget > 0 ? (totalRealizationYTD / totalBudget) * 100 : 0;

  const handleExport = () => {
    exportFullReportToExcel(
      budgetItems,
      indicators,
      additionalTransactions,
      selectedYear,
      selectedMonth + 1
    );
  };

  const currentTabInfo = TAB_TITLES[activeTab] || TAB_TITLES.dashboard;
  const TabIcon = currentTabInfo.icon;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
      <div className="w-full px-4 sm:px-6 py-2.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left Side: Toggle buttons & Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile hamburger menu button */}
          <button
            type="button"
            id="btn-mobile-sidebar-toggle"
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 focus:outline-none cursor-pointer"
            aria-label="Buka menu navigasi"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop collapse toggle */}
          <button
            type="button"
            id="btn-desktop-sidebar-toggle"
            onClick={onToggleCollapse}
            className="hidden md:flex p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            title={isSidebarCollapsed ? 'Buka menu samping' : 'Ciutkan menu samping'}
            aria-label="Toggle menu samping"
          >
            {isSidebarCollapsed ? (
              <PanelLeft className="w-4 h-4 text-blue-600" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>

          {/* Page Title & Breadcrumb */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-blue-50 text-blue-600 border border-blue-100">
                <TabIcon className="w-4 h-4" />
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight truncate">
                {currentTabInfo.title}
              </h1>
            </div>
            <p className="text-xs text-slate-500 truncate hidden sm:block">
              {currentTabInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Right Side: Global Filters & Controls */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0 self-end md:self-auto">
          {/* Period Selectors */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs shadow-2xs">
            {/* Year Selector */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-slate-400 font-medium">Th:</span>
              <select
                id="select-topbar-year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-white text-slate-800 font-semibold rounded px-1.5 py-0.5 border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs cursor-pointer"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
              </select>
            </div>

            <div className="h-4 w-px bg-slate-200" />

            {/* Month Cut-off Selector */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 text-slate-600">
              <span className="text-slate-400 font-medium">Cut-off:</span>
              <select
                id="select-topbar-month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-white text-slate-800 font-semibold rounded px-1.5 py-0.5 border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs cursor-pointer"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={idx} value={idx}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Metrics Chip */}
          <div className="hidden lg:flex items-center gap-2.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] leading-tight">
                Realisasi YTD
              </span>
              <span className="font-bold text-slate-800">
                {formatRupiahShort(totalRealizationYTD)}
              </span>
            </div>
            <div className="h-5 w-px bg-slate-200" />
            <div>
              <span className="text-slate-400 block text-[10px] leading-tight">
                Serapan
              </span>
              <span
                className={`font-bold flex items-center gap-0.5 ${
                  absorptionRate > 95 ? 'text-amber-600' : 'text-emerald-600'
                }`}
              >
                <TrendingUp className="w-3 h-3" />
                {formatPercent(absorptionRate, 1)}
              </span>
            </div>
          </div>

          {/* Export Excel Button */}
          <button
            type="button"
            id="btn-export-excel-top"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer"
            title="Export seluruh data pemantauan ke file Excel (.xlsx)"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>

          {/* Reset Data Button */}
          <button
            type="button"
            id="btn-reset-data-top"
            onClick={() => {
              if (confirm('Reset seluruh data anggaran dan realisasi ke nilai awal default?')) {
                resetToDefault();
              }
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-xs font-medium border border-slate-300 transition-colors cursor-pointer"
            title="Reset data ke awal"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden xl:inline">Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
};
