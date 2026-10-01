import React from 'react';
import { 
  Building2, 
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
import { useApp } from '../context/AppContext';
import { MONTH_NAMES, formatRupiahShort, formatPercent } from '../utils/formatters';
import { exportFullReportToExcel } from '../utils/excelExporter';
import { ActiveTab } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const { 
    budgetItems, 
    indicators, 
    additionalTransactions, 
    selectedYear, 
    selectedMonth, 
    setSelectedYear, 
    setSelectedMonth, 
    resetToDefault 
  } = useApp();

  const totalBudget = budgetItems
    .filter(i => !i.isGroupHeader)
    .reduce((sum, item) => sum + (item.budgetAnnual || 0), 0);

  const totalRealizationYTD = budgetItems
    .filter(i => !i.isGroupHeader)
    .reduce((sum, item) => {
      let itemYTD = 0;
      for (let m = 0; m <= selectedMonth; m++) {
        itemYTD += (item.realizationMonthly?.[m] || 0);
      }
      return sum + itemYTD;
    }, 0);

  const absorptionRate = totalBudget > 0 ? (totalRealizationYTD / totalBudget) * 100 : 0;

  const handleExport = () => {
    exportFullReportToExcel(budgetItems, indicators, additionalTransactions, selectedYear, selectedMonth + 1);
  };

  const navItems: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }>; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard Utama', icon: LayoutDashboard },
    { id: 'budget_input', label: 'Input & Edit Anggaran', icon: FileEdit, badge: `${budgetItems.filter(i => !i.isGroupHeader).length}` },
    { id: 'realization_input', label: 'Input Realisasi Manual', icon: Edit3, badge: 'Manual' },
    { id: 'realization_import', label: 'Import Excel', icon: FileSpreadsheet, badge: 'Excel / CSV' },
    { id: 'matrix', label: 'Matriks Monitoring', icon: TableProperties },
    { id: 'performance', label: 'Indikator & Kinerja', icon: Target },
    { id: 'prognosa', label: 'Prognosa & Alih Daya', icon: Calculator },
    { id: 'reports', label: 'Laporan & Ringkasan', icon: FileText }
  ];

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      {/* Top Banner Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Brand & Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0 font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  Pemantauan Realisasi Anggaran
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  SKKO / RKAP
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Dashboard Monitoring, Input Anggaran Manual & Import Realisasi Excel
              </p>
            </div>
          </div>

          {/* Quick Metrics & Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Period Filters */}
            <div className="flex items-center bg-slate-800/90 border border-slate-700/80 rounded-lg p-1 text-xs">
              <div className="flex items-center gap-1.5 px-2 py-1 text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-slate-400">Tahun:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-slate-900 text-white font-semibold rounded px-2 py-0.5 border border-slate-700 focus:outline-none focus:border-blue-500 text-xs cursor-pointer"
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                  <option value={2024}>2024</option>
                </select>
              </div>

              <div className="h-4 w-px bg-slate-700" />

              <div className="flex items-center gap-1.5 px-2 py-1 text-slate-300">
                <span className="text-slate-400">Cut-off s.d.:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-slate-900 text-white font-semibold rounded px-2 py-0.5 border border-slate-700 focus:outline-none focus:border-blue-500 text-xs cursor-pointer"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx} value={idx}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Summary Pill */}
            <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/70 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Realisasi s/d {MONTH_NAMES[selectedMonth]}</span>
                <span className="font-bold text-white">{formatRupiahShort(totalRealizationYTD)}</span>
              </div>
              <div className="h-5 w-px bg-slate-700" />
              <div>
                <span className="text-slate-400 block text-[10px]">Serapan YTD</span>
                <span className={`font-bold flex items-center gap-1 ${
                  absorptionRate > 95 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  <TrendingUp className="w-3 h-3" />
                  {formatPercent(absorptionRate, 1)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-export-header-excel"
                onClick={handleExport}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                title="Export seluruh data pemantauan ke file Excel (.xlsx)"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Export Excel</span>
              </button>

              <button
                type="button"
                id="btn-reset-header-data"
                onClick={() => {
                  if (confirm('Reset seluruh data anggaran dan realisasi ke nilai awal (Rp 0)?')) {
                    resetToDefault();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                title="Reset seluruh data anggaran dan realisasi ke nilai awal (Rp 0)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Reset Data</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Bar */}
      <div className="bg-slate-950/80 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center space-x-1 overflow-x-auto py-1.5 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                type="button"
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                    isActive ? 'bg-blue-700 text-blue-100' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
