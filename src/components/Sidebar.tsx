import React from 'react';
import {
  Building2,
  LayoutDashboard,
  FileEdit,
  Edit3,
  FileSpreadsheet,
  TableProperties,
  Target,
  Calculator,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  TrendingUp,
  Layers,
  Database
} from 'lucide-react';
import { ActiveTab } from '../types';
import { useApp } from '../context/AppContext';
import { MONTH_NAMES, formatPercent, formatRupiahShort } from '../utils/formatters';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

interface NavGroup {
  groupTitle: string;
  items: {
    id: ActiveTab;
    label: string;
    description: string;
    icon: React.FC<{ className?: string }>;
    badge?: string;
    badgeColor?: string;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isMobileOpen,
  setIsMobileOpen,
  isCollapsed,
  setIsCollapsed,
}) => {
  const { budgetItems, selectedMonth } = useApp();

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
  const totalAccountCount = budgetItems.filter((i) => !i.isGroupHeader).length;

  const navGroups: NavGroup[] = [
    {
      groupTitle: 'Menu Utama',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard Utama',
          description: 'Ringkasan & visualisasi kinerja anggaran',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      groupTitle: 'Manajemen Data Anggaran',
      items: [
        {
          id: 'budget_input',
          label: 'Input & Edit Anggaran',
          description: 'Kelola alokasi SKKO/RKAP 12 bulan',
          icon: FileEdit,
          badge: `${totalAccountCount} Akun`,
          badgeColor: 'bg-blue-900/60 text-blue-300 border border-blue-700/50',
        },
        {
          id: 'realization_input',
          label: 'Input Realisasi Manual',
          description: 'Pencatatan realisasi bulanan langsung',
          icon: Edit3,
          badge: 'Manual',
          badgeColor: 'bg-amber-900/50 text-amber-300 border border-amber-700/50',
        },
        {
          id: 'realization_import',
          label: 'Import Excel / CSV',
          description: 'Sinkronisasi berkas laporan SAP FBL3N',
          icon: FileSpreadsheet,
          badge: 'Excel',
          badgeColor: 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50',
        },
      ],
    },
    {
      groupTitle: 'Monitoring & Analisis',
      items: [
        {
          id: 'matrix',
          label: 'Matriks Monitoring',
          description: 'Tabel komparasi alokasi vs realisasi',
          icon: TableProperties,
        },
        {
          id: 'performance',
          label: 'Indikator & Kinerja',
          description: 'KPI persentase & evaluasi pos beban',
          icon: Target,
        },
        {
          id: 'prognosa',
          label: 'Prognosa & Alih Daya',
          description: 'Prognosa s/d akhir tahun & outsourcing',
          icon: Calculator,
        },
      ],
    },
    {
      groupTitle: 'Pelaporan',
      items: [
        {
          id: 'reports',
          label: 'Laporan & Ringkasan',
          description: 'Cetak & ringkasan eksekutif',
          icon: FileText,
        },
      ],
    },
  ];

  const handleSelectTab = (id: ActiveTab) => {
    setActiveTab(id);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs transition-opacity md:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="vertical-sidebar"
        className={`fixed md:sticky top-0 left-0 z-50 h-screen flex flex-col bg-slate-900 border-r border-slate-800 text-white transition-all duration-300 ease-in-out shrink-0 select-none ${
          /* Width based on desktop collapsed state */
          isCollapsed ? 'md:w-20' : 'md:w-64 lg:w-72'
        } ${
          /* Mobile open/close transition */
          isMobileOpen ? 'translate-x-0 w-72 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header / Brand Area */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/90 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0 font-bold">
              <Building2 className="w-5 h-5" />
            </div>

            {(!isCollapsed || isMobileOpen) && (
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm tracking-tight text-white truncate">
                    Monev Anggaran
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 shrink-0">
                    SAP
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  SKKO & RKAP Bulanan
                </p>
              </div>
            )}
          </div>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
            aria-label="Tutup menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {/* Group Label (Hidden when collapsed on desktop) */}
              {(!isCollapsed || isMobileOpen) && (
                <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group.groupTitle}
                </div>
              )}

              {/* Items */}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      id={`sidebar-nav-${item.id}`}
                      onClick={() => handleSelectTab(item.id)}
                      title={isCollapsed && !isMobileOpen ? item.label : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left font-medium transition-all group relative cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                      } ${isCollapsed && !isMobileOpen ? 'justify-center px-2' : ''}`}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <span className="absolute left-0 top-2 bottom-2 w-1 bg-white rounded-r-full" />
                      )}

                      <Icon
                        className={`shrink-0 transition-transform duration-200 ${
                          isCollapsed && !isMobileOpen ? 'w-5 h-5' : 'w-4 h-4'
                        } ${
                          isActive
                            ? 'text-white'
                            : 'text-slate-400 group-hover:text-blue-300 group-hover:scale-105'
                        }`}
                      />

                      {(!isCollapsed || isMobileOpen) && (
                        <div className="flex-1 min-w-0 flex items-center justify-between gap-1.5">
                          <span className={`text-xs truncate ${isActive ? 'font-semibold' : ''}`}>
                            {item.label}
                          </span>
                          {item.badge && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                                isActive
                                  ? 'bg-blue-700/90 text-blue-100 border border-blue-500/40'
                                  : item.badgeColor || 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Quick KPI Widget (Visible when expanded) */}
        {(!isCollapsed || isMobileOpen) && (
          <div className="p-3 mx-3 mb-3 rounded-xl bg-slate-800/90 border border-slate-700/70 text-xs shrink-0">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-slate-400 font-medium">
                Serapan s/d {MONTH_NAMES[selectedMonth]}
              </span>
              <span
                className={`font-bold flex items-center gap-1 ${
                  absorptionRate > 95 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                <TrendingUp className="w-3 h-3" />
                {formatPercent(absorptionRate, 1)}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-700/80 rounded-full h-1.5 overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  absorptionRate > 95 ? 'bg-amber-400' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(absorptionRate, 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Realisasi YTD:</span>
              <span className="text-white font-semibold">
                {formatRupiahShort(totalRealizationYTD)}
              </span>
            </div>
          </div>
        )}

        {/* Sidebar Footer with Collapse Toggle on Desktop */}
        <div className="p-3 border-t border-slate-800/90 flex items-center justify-between shrink-0 bg-slate-950/60">
          {(!isCollapsed || isMobileOpen) ? (
            <>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                <span className="truncate">Sistem Aktif & Terhubung</span>
              </div>
              <button
                type="button"
                id="btn-collapse-sidebar"
                onClick={() => setIsCollapsed(true)}
                className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Sembunyikan menu samping"
                aria-label="Ciutkan Sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              id="btn-expand-sidebar"
              onClick={() => setIsCollapsed(false)}
              className="hidden md:flex w-full justify-center p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Buka menu samping"
              aria-label="Perluas Sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
