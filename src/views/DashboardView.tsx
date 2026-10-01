import React, { useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PieChart as PieChartIcon, 
  AlertCircle, 
  CheckCircle2, 
  ArrowUpRight, 
  Activity, 
  Briefcase, 
  Wrench, 
  Building, 
  Car, 
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area 
} from 'recharts';
import { useApp } from '../context/AppContext';
import { formatRupiah, formatRupiahShort, formatPercent, MONTH_SHORT_NAMES, MONTH_NAMES } from '../utils/formatters';
import { PosType } from '../types';

interface DashboardViewProps {
  onNavigateTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateTab }) => {
  const { 
    budgetItems, 
    indicators, 
    additionalTransactions, 
    selectedYear, 
    selectedMonth,
    setSelectedMonth 
  } = useApp();

  // Summary computations
  const summary = useMemo(() => {
    // Only non-header or account level items to avoid double counting
    const accountItems = budgetItems.filter(i => !i.isGroupHeader);

    let totalAnnualBudget = 0;
    let totalTargetMonthToDate = 0;
    let totalRealMonthToDate = 0;
    let totalRealAnnual = 0;

    // Monthly aggregation array (0..11)
    const monthlyBudgetTrend = Array(12).fill(0);
    const monthlyTotalRealTrend = Array(12).fill(0);

    accountItems.forEach(item => {
      totalAnnualBudget += (item.budgetAnnual || 0);

      for (let m = 0; m < 12; m++) {
        const bMonth = item.budgetMonthly[m] || 0;
        const totMonth = item.realizationMonthly?.[m] || 0;

        monthlyBudgetTrend[m] += bMonth;
        monthlyTotalRealTrend[m] += totMonth;

        totalRealAnnual += totMonth;

        if (m <= selectedMonth) {
          totalTargetMonthToDate += bMonth;
          totalRealMonthToDate += totMonth;
        }
      }
    });

    const sisaAnggaran = totalAnnualBudget - totalRealMonthToDate;
    const penyerapanPct = totalAnnualBudget > 0 ? (totalRealMonthToDate / totalAnnualBudget) * 100 : 0;
    const penyerapanVsTargetMonth = totalTargetMonthToDate > 0 ? (totalRealMonthToDate / totalTargetMonthToDate) * 100 : 0;

    // By POS breakdown
    const posList: PosType[] = ['Pos 52', 'Pos 53', 'Pos 54', 'Beban Sewa', 'Pos 72'];
    
    const posBreakdown = posList.map(pos => {
      const pItems = accountItems.filter(i => i.posType === pos || (pos === 'Beban Sewa' && i.posType === 'Sewa Non AHG'));
      let pAnnual = 0;
      let pRealMTD = 0;
      let pTargetMTD = 0;

      pItems.forEach(item => {
        pAnnual += (item.budgetAnnual || 0);
        for (let m = 0; m <= selectedMonth; m++) {
          pRealMTD += (item.realizationMonthly?.[m] || 0);
          pTargetMTD += (item.budgetMonthly?.[m] || 0);
        }
      });

      const pSisa = pAnnual - pRealMTD;
      const pPct = pAnnual > 0 ? (pRealMTD / pAnnual) * 100 : 0;

      return {
        pos,
        name: pos === 'Pos 52' ? 'Beban Kepegawaian (Pos 52)' :
              pos === 'Pos 53' ? 'Beban Pemeliharaan (Pos 53)' :
              pos === 'Pos 54' ? 'Biaya Administrasi & Umum (Pos 54)' :
              (pos === 'Beban Sewa' || pos === 'Sewa Non AHG') ? 'Beban Sewa' :
              'Beban Pensiun (Pos 72)',
        annual: pAnnual,
        targetMTD: pTargetMTD,
        realMTD: pRealMTD,
        sisa: pSisa,
        percentage: pPct,
        count: pItems.length
      };
    });

    // Chart data for monthly trend
    let cumTarget = 0;
    let cumReal = 0;
    const trendChartData = MONTH_SHORT_NAMES.map((name, idx) => {
      cumTarget += monthlyBudgetTrend[idx];
      cumReal += monthlyTotalRealTrend[idx];
      return {
        month: name,
        anggaran: monthlyBudgetTrend[idx],
        realisasi: monthlyTotalRealTrend[idx],
        cumTarget,
        cumReal,
        isCurrentMonth: idx === selectedMonth
      };
    });

    return {
      totalAnnualBudget,
      totalTargetMonthToDate,
      totalRealMonthToDate,
      sisaAnggaran,
      penyerapanPct,
      penyerapanVsTargetMonth,
      posBreakdown,
      trendChartData
    };
  }, [budgetItems, selectedMonth]);

  // Tambahan Transaksi summary
  const additionalSum = useMemo(() => {
    const active = additionalTransactions.filter(t => t.isActive);
    const total = active.reduce((sum, t) => sum + (t.amount || 0), 0);
    const byPos = {
      pos53: active.filter(t => t.posType === 'Pos 53').reduce((s, t) => s + t.amount, 0),
      pos54: active.filter(t => t.posType === 'Pos 54').reduce((s, t) => s + t.amount, 0),
      sewa: active.filter(t => t.posType === 'Beban Sewa' || t.posType === 'Sewa Non AHG').reduce((s, t) => s + t.amount, 0)
    };
    return { total, byPos, count: active.length };
  }, [additionalTransactions]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  const pieData = summary.posBreakdown
    .filter(p => p.realMTD > 0)
    .map(p => ({
      name: p.pos,
      value: p.realMTD
    }));

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner with Period Control */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-blue-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30 mb-2">
              <Activity className="w-3.5 h-3.5" />
              <span>Monitoring Realisasi Anggaran Operasional</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Dashboard Kinerja Realisasi Anggaran {selectedYear}
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Pemantauan terintegrasi antara pagu SKKO, realisasi penyerapan anggaran, 
              serta komitmen alih daya hingga periode <span className="font-semibold text-blue-300">{MONTH_NAMES[selectedMonth]} {selectedYear}</span>.
            </p>
          </div>

          {/* Month selector chips */}
          <div className="bg-slate-800/90 backdrop-blur p-3 rounded-xl border border-slate-700/80 shadow-lg">
            <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center justify-between">
              <span>Cut-off Pemantauan:</span>
              <span className="text-blue-400 font-bold">s/d {MONTH_NAMES[selectedMonth]}</span>
            </div>
            <div className="grid grid-cols-6 gap-1 sm:grid-cols-12">
              {MONTH_SHORT_NAMES.map((m, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setSelectedMonth(idx)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                    selectedMonth === idx
                      ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30 ring-2 ring-blue-300'
                      : idx <= selectedMonth
                      ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                      : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pagu Anggaran Tahunan */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pagu Anggaran (SKKO)</span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900">
              {formatRupiahShort(summary.totalAnnualBudget)}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-mono">
              {formatRupiah(summary.totalAnnualBudget)}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Target s/d {MONTH_NAMES[selectedMonth]}:</span>
            <span className="font-semibold text-slate-800">{formatRupiahShort(summary.totalTargetMonthToDate)}</span>
          </div>
        </div>

        {/* Card 2: Realisasi Anggaran s/d Bulan Ini */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Realisasi (s/d {MONTH_NAMES[selectedMonth]})</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-emerald-600">
              {formatRupiahShort(summary.totalRealMonthToDate)}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-mono">
              {formatRupiah(summary.totalRealMonthToDate)}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">% Capaian Target: <strong className="text-slate-700">{formatPercent(summary.penyerapanVsTargetMonth)}</strong></span>
            <span className="text-slate-500">Sisa Pagu: <strong className="text-slate-700">{formatRupiahShort(summary.sisaAnggaran)}</strong></span>
          </div>
        </div>

        {/* Card 3: Persentase Penyerapan */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">% Penyerapan Anggaran</span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <div className="text-3xl font-extrabold text-indigo-600">
              {formatPercent(summary.penyerapanPct)}
            </div>
            <span className="text-xs font-medium text-slate-500">dari Pagu Tahunan</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 h-2.5 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, summary.penyerapanPct)}%` }}
            />
          </div>
          <div className="mt-3 pt-2 text-xs flex items-center justify-between text-slate-500">
            <span>Vs Target s/d {MONTH_SHORT_NAMES[selectedMonth]}:</span>
            <span className="font-semibold text-slate-700">{formatPercent(summary.penyerapanVsTargetMonth)}</span>
          </div>
        </div>

        {/* Card 4: Sisa Pagu Anggaran */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sisa Pagu Anggaran</span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-amber-600">
              {formatRupiahShort(summary.sisaAnggaran)}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-mono">
              {formatRupiah(summary.sisaAnggaran)}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Komitmen Tambahan:</span>
            <span className="font-semibold text-rose-600">+{formatRupiahShort(additionalSum.total)}</span>
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Tren Realisasi Bulanan vs Anggaran</h3>
              <p className="text-xs text-slate-500">Perbandingan realisasi bulanan terhadap rencana anggaran {selectedYear}</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-600">
              Jan - Des {selectedYear}
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.trendChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis 
                  tickFormatter={(v) => `${(v / 1_000_000_000).toFixed(0)}M`} 
                  tick={{ fontSize: 11 }}
                />
                <Tooltip 
                  formatter={(value: any) => [formatRupiah(value), '']}
                  contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="anggaran" name="Target Anggaran" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="realisasi" name="Realisasi Anggaran" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdown Komposisi Beban */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-base text-slate-900">Komposisi Realisasi POS</h3>
              <PieChartIcon className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-xs text-slate-500 mb-4">Porsi penyerapan dana per kelompok beban s/d {MONTH_NAMES[selectedMonth]}</p>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => [formatRupiah(val), 'Porsi']}
                    contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Mini Legend List */}
          <div className="space-y-2 mt-2 pt-3 border-t border-slate-100 text-xs">
            {summary.posBreakdown.map((pos, idx) => (
              <div key={pos.pos} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="font-medium text-slate-700 truncate max-w-[140px]">{pos.pos}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900">{formatRupiahShort(pos.realMTD)}</span>
                  <span className="text-slate-400 ml-1.5">({formatPercent(summary.totalRealMonthToDate > 0 ? (pos.realMTD / summary.totalRealMonthToDate) * 100 : 0, 1)})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* POS Details Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-lg text-slate-900">Rincian Realisasi per Kelompok POS</h3>
            <p className="text-xs text-slate-500">Status penyerapan anggaran pada Pos 52, Pos 53, Pos 54, Beban Sewa & Pos 72</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('matrix')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
          >
            Lihat Matriks Lengkap <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {summary.posBreakdown.map((pos, idx) => {
            const getIcon = (posCode: PosType) => {
              switch (posCode) {
                case 'Pos 52': return Briefcase;
                case 'Pos 53': return Wrench;
                case 'Pos 54': return Building;
                case 'Beban Sewa':
                case 'Sewa Non AHG': return Car;
                default: return ShieldCheck;
              }
            };
            const Icon = getIcon(pos.pos);

            return (
              <div 
                key={pos.pos}
                className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:border-blue-300 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{pos.name}</h4>
                      <span className="text-[11px] text-slate-400">{pos.count} Akun Anggaran</span>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    pos.percentage > 90 ? 'bg-amber-100 text-amber-700' :
                    pos.percentage > 70 ? 'bg-emerald-100 text-emerald-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {formatPercent(pos.percentage, 1)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block">Pagu Anggaran</span>
                    <span className="font-bold text-slate-800">{formatRupiahShort(pos.annual)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Target s/d {MONTH_SHORT_NAMES[selectedMonth]}</span>
                    <span className="font-semibold text-slate-700">{formatRupiahShort(pos.targetMTD)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Realisasi s/d {MONTH_SHORT_NAMES[selectedMonth]}</span>
                    <span className="font-bold text-emerald-600">{formatRupiahShort(pos.realMTD)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Sisa Pagu</span>
                    <span className="font-bold text-amber-600">{formatRupiahShort(pos.sisa)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">% Penyerapan</span>
                    <span className="font-bold text-slate-800">{formatPercent(pos.percentage, 1)}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full rounded-full" 
                    style={{ width: `${Math.min(100, pos.percentage)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Indikator Kinerja & Optimalisasi Card Section */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">Indikator Kinerja Utama (Optimalisasi Biaya)</h3>
            <p className="text-xs text-slate-500">Pencapaian target indikator efisiensi dan optimalisasi per pos s/d {MONTH_NAMES[selectedMonth]}</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('performance')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            Lihat Analisis Indikator <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {indicators.map((ind) => {
            const currentPct = ind.monthlyPercentage[selectedMonth] || 0;
            const currentReal = ind.monthlyRealization[selectedMonth] || 0;
            const currentTarget = ind.monthlyTarget[selectedMonth] || 0;

            const isOptimal = currentPct > 0 && currentPct <= 100;
            const isExceeded = currentPct > 100;

            return (
              <div key={ind.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 truncate">{ind.name}</span>
                  {isOptimal ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Optimal
                    </span>
                  ) : isExceeded ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      <AlertCircle className="w-3 h-3" /> Over
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                      N/A
                    </span>
                  )}
                </div>

                <div className="flex items-baseline justify-between mt-2">
                  <div className="text-2xl font-extrabold text-slate-900">
                    {formatPercent(currentPct)}
                  </div>
                  <span className="text-xs text-slate-500">Target: 100%</span>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/60 text-[11px] space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Realisasi:</span>
                    <span className="font-semibold">{formatRupiahShort(currentReal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Target SKKO:</span>
                    <span className="font-semibold">{formatRupiahShort(currentTarget)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
