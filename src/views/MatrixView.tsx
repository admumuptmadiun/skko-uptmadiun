import React, { useState, useMemo } from 'react';
import { 
  TableProperties, 
  Download, 
  Search, 
  Filter, 
  Layers, 
  TrendingUp, 
  Eye, 
  SlidersHorizontal,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';
import { BudgetItem, PosType } from '../types';
import { 
  formatRupiah, 
  formatRupiahShort, 
  formatPercent, 
  MONTH_NAMES, 
  MONTH_SHORT_NAMES 
} from '../utils/formatters';

type MatrixMode = 'summary_mtd' | 'monthly_realization' | 'monthly_target_vs_real';

export const MatrixView: React.FC = () => {
  const { 
    budgetItems, 
    selectedYear, 
    selectedMonth, 
    setSelectedMonth 
  } = useApp();

  const [matrixMode, setMatrixMode] = useState<MatrixMode>('summary_mtd');
  const [selectedPos, setSelectedPos] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() => {
    return budgetItems.filter(item => {
      if (selectedPos !== 'ALL') {
        if (selectedPos === 'Beban Sewa') {
          if (item.posType !== 'Beban Sewa' && item.posType !== 'Sewa Non AHG') return false;
        } else if (item.posType !== selectedPos) {
          return false;
        }
      }
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase();
        return item.name.toLowerCase().includes(q) || 
               item.code.toLowerCase().includes(q) ||
               item.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [budgetItems, selectedPos, searchTerm]);

  // Aggregate totals
  const totals = useMemo(() => {
    const activeItems = filteredItems.filter(i => !i.isGroupHeader);
    
    let totalAnnual = 0;
    let targetMTD = 0;
    let realMTD = 0;

    const monthlyRealizationTotals = Array(12).fill(0);
    const monthlyBudgetTotals = Array(12).fill(0);

    activeItems.forEach(item => {
      totalAnnual += (item.budgetAnnual || 0);

      for (let m = 0; m < 12; m++) {
        const r = item.realizationMonthly?.[m] || 0;
        const b = item.budgetMonthly?.[m] || 0;

        monthlyRealizationTotals[m] += r;
        monthlyBudgetTotals[m] += b;

        if (m <= selectedMonth) {
          targetMTD += b;
          realMTD += r;
        }
      }
    });

    const sisaPagu = totalAnnual - realMTD;
    const penyerapanPct = totalAnnual > 0 ? (realMTD / totalAnnual) * 100 : 0;
    const penyerapanVsTarget = targetMTD > 0 ? (realMTD / targetMTD) * 100 : 0;

    return {
      totalAnnual,
      targetMTD,
      realMTD,
      sisaPagu,
      penyerapanPct,
      penyerapanVsTarget,
      monthlyRealizationTotals,
      monthlyBudgetTotals
    };
  }, [filteredItems, selectedMonth]);

  // Export Matrix to Excel
  const handleExportExcel = () => {
    let wsData: any[][] = [];

    if (matrixMode === 'summary_mtd') {
      wsData.push([
        `MATRIKS REALISASI ANGGARAN S/D ${MONTH_NAMES[selectedMonth].toUpperCase()} ${selectedYear}`,
        '', '', '', '', '', '', ''
      ]);
      wsData.push([
        'NO', 'KODE GL', 'URAIAN AKUN', 'KELOMPOK POS', 
        `PAGU ANGGARAN ${selectedYear}`, 
        `TARGET S/D ${MONTH_SHORT_NAMES[selectedMonth]}`, 
        `REALISASI S/D ${MONTH_SHORT_NAMES[selectedMonth]}`, 
        `SISA PAGU`, `% PENYERAPAN`
      ]);

      filteredItems.forEach((item, idx) => {
        let rMTD = 0;
        let bMTD = 0;
        for (let m = 0; m <= selectedMonth; m++) {
          rMTD += item.realizationMonthly?.[m] || 0;
          bMTD += item.budgetMonthly?.[m] || 0;
        }
        const sisa = item.budgetAnnual - rMTD;
        const pct = item.budgetAnnual > 0 ? (rMTD / item.budgetAnnual) * 100 : 0;

        wsData.push([
          idx + 1,
          item.code,
          item.name,
          item.posType,
          item.budgetAnnual,
          bMTD,
          rMTD,
          sisa,
          `${pct.toFixed(2)}%`
        ]);
      });
    } else if (matrixMode === 'monthly_realization') {
      wsData.push([`RINCIAN REALISASI BULANAN ${selectedYear}`]);
      wsData.push([
        'NO', 'KODE GL', 'URAIAN AKUN',
        ...MONTH_SHORT_NAMES.map(m => `REALISASI ${m}`),
        'TOTAL REALISASI'
      ]);

      filteredItems.forEach((item, idx) => {
        const monthly = item.realizationMonthly || Array(12).fill(0);
        const tot = monthly.reduce((a, b) => a + (b || 0), 0);
        wsData.push([
          idx + 1,
          item.code,
          item.name,
          ...monthly,
          tot
        ]);
      });
    } else {
      wsData.push([`KOMPARASI TARGET VS REALISASI BULANAN ${selectedYear}`]);
      const headerRow = ['NO', 'KODE GL', 'URAIAN AKUN'];
      MONTH_SHORT_NAMES.forEach(m => {
        headerRow.push(`TARGET ${m}`, `REALISASI ${m}`);
      });
      headerRow.push('TOTAL REALISASI');
      wsData.push(headerRow);

      filteredItems.forEach((item, idx) => {
        const row: any[] = [idx + 1, item.code, item.name];
        let totReal = 0;
        for (let m = 0; m < 12; m++) {
          const tgt = item.budgetMonthly?.[m] || 0;
          const rel = item.realizationMonthly?.[m] || 0;
          totReal += rel;
          row.push(tgt, rel);
        }
        row.push(totReal);
        wsData.push(row);
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Matriks_Realisasi');
    XLSX.writeFile(wb, `Matriks_Realisasi_Anggaran_${MONTH_NAMES[selectedMonth]}_${selectedYear}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* View Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <TableProperties className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Matriks Pemantauan Realisasi Anggaran</h1>
            <p className="text-xs text-slate-500">
              Tabel matriks komprehensif data anggaran dan realisasi berbasis Google Sheet
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportExcel}
          className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-2 transition-colors self-start md:self-auto shadow-sm cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export Matriks ke Excel (.xlsx)</span>
        </button>
      </div>

      {/* Control & View Mode Selectors */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setMatrixMode('summary_mtd')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                matrixMode === 'summary_mtd'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Matriks Akumulasi (s/d {MONTH_NAMES[selectedMonth]})
            </button>
            <button
              type="button"
              onClick={() => setMatrixMode('monthly_realization')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                matrixMode === 'monthly_realization'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rincian Realisasi Bulanan (12 Bulan)
            </button>
            <button
              type="button"
              onClick={() => setMatrixMode('monthly_target_vs_real')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                matrixMode === 'monthly_target_vs_real'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Komparasi Target vs Realisasi Bulanan
            </button>
          </div>

          {/* Cut-off Month selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Cut-off Bulan:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={idx} value={idx}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari akun anggaran..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* POS Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {['ALL', 'Pos 52', 'Pos 53', 'Pos 54', 'Beban Sewa', 'Pos 72'].map(p => (
              <button
                type="button"
                key={p}
                onClick={() => setSelectedPos(p)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedPos === p
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p === 'ALL' ? 'Semua Pos' : p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-xs">
          <span className="text-slate-400 block text-[11px]">Total Pagu Anggaran</span>
          <span className="font-bold text-slate-900 text-sm font-mono">{formatRupiahShort(totals.totalAnnual)}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-xs">
          <span className="text-slate-400 block text-[11px]">Target s/d {MONTH_SHORT_NAMES[selectedMonth]}</span>
          <span className="font-bold text-slate-800 text-sm font-mono">{formatRupiahShort(totals.targetMTD)}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-xs">
          <span className="text-slate-400 block text-[11px]">Realisasi s/d {MONTH_SHORT_NAMES[selectedMonth]}</span>
          <span className="font-bold text-blue-600 text-sm font-mono">{formatRupiahShort(totals.realMTD)}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-xs">
          <span className="text-slate-400 block text-[11px]">Sisa Pagu Anggaran</span>
          <span className="font-bold text-amber-600 text-sm font-mono">{formatRupiahShort(totals.sisaPagu)}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-xs">
          <span className="text-slate-400 block text-[11px]">% Penyerapan Anggaran</span>
          <span className="font-bold text-indigo-600 text-sm">{formatPercent(totals.penyerapanPct)}</span>
        </div>
      </div>

      {/* Main Table Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[650px]">
          <table className="w-full text-left text-xs text-slate-700 whitespace-nowrap">
            <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold sticky top-0 z-20 shadow-md">
              {matrixMode === 'summary_mtd' && (
                <tr>
                  <th className="py-3 px-3 w-10 text-center">No</th>
                  <th className="py-3 px-3 w-28">Kode GL</th>
                  <th className="py-3 px-3 min-w-[240px]">Uraian Akun Anggaran</th>
                  <th className="py-3 px-3 w-24">POS</th>
                  <th className="py-3 px-3 text-right">Pagu SKKO ({selectedYear})</th>
                  <th className="py-3 px-3 text-right">Target s/d {MONTH_SHORT_NAMES[selectedMonth]}</th>
                  <th className="py-3 px-3 text-right text-blue-300">Realisasi s/d {MONTH_SHORT_NAMES[selectedMonth]}</th>
                  <th className="py-3 px-3 text-right text-amber-300">Sisa Pagu</th>
                  <th className="py-3 px-3 text-center w-24">% Serap</th>
                </tr>
              )}

              {matrixMode === 'monthly_realization' && (
                <>
                  <tr>
                    <th rowSpan={2} className="py-3 px-3 w-10 text-center border-r border-slate-800">No</th>
                    <th rowSpan={2} className="py-3 px-3 w-28 border-r border-slate-800">Kode GL</th>
                    <th rowSpan={2} className="py-3 px-3 min-w-[240px] border-r border-slate-800">Uraian Akun</th>
                    <th colSpan={12} className="py-2 px-3 text-center bg-blue-900 border-r border-slate-800 text-blue-200">
                      Realisasi Bulanan ({selectedYear})
                    </th>
                    <th rowSpan={2} className="py-3 px-3 text-right bg-slate-800">Total 1 Tahun</th>
                  </tr>
                  <tr>
                    {MONTH_SHORT_NAMES.map((m, idx) => (
                      <th 
                        key={`r-${m}`} 
                        className={`py-2 px-2 text-right text-[9px] font-mono ${
                          idx === selectedMonth ? 'bg-blue-800 text-amber-200' : 'bg-blue-950 text-blue-200'
                        }`}
                      >
                        {m}
                      </th>
                    ))}
                  </tr>
                </>
              )}

              {matrixMode === 'monthly_target_vs_real' && (
                <>
                  <tr>
                    <th rowSpan={2} className="py-3 px-3 w-10 text-center border-r border-slate-800">No</th>
                    <th rowSpan={2} className="py-3 px-3 w-28 border-r border-slate-800">Kode GL</th>
                    <th rowSpan={2} className="py-3 px-3 min-w-[240px] border-r border-slate-800">Uraian Akun</th>
                    {MONTH_SHORT_NAMES.map((m, idx) => (
                      <th 
                        key={m} 
                        colSpan={2} 
                        className={`py-2 px-3 text-center border-r border-slate-800 ${
                          idx === selectedMonth ? 'bg-indigo-900 text-indigo-200' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {m} {idx === selectedMonth ? '(Cut-off)' : ''}
                      </th>
                    ))}
                    <th rowSpan={2} className="py-3 px-3 text-right bg-slate-800">Total Real</th>
                  </tr>
                  <tr>
                    {MONTH_SHORT_NAMES.map(m => (
                      <React.Fragment key={`sub-${m}`}>
                        <th className="py-1.5 px-2 text-right text-[9px] bg-slate-900 text-slate-400 font-mono">Tgt</th>
                        <th className="py-1.5 px-2 text-right text-[9px] bg-slate-950 text-emerald-300 font-mono border-r border-slate-800">Real</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </>
              )}
            </thead>

            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredItems.map((item, idx) => {
                const isHeader = item.isGroupHeader;

                // Computations
                let rMTD = 0;
                let bMTD = 0;
                let rTotalAnnual = 0;

                for (let m = 0; m < 12; m++) {
                  const r = item.realizationMonthly?.[m] || 0;
                  const b = item.budgetMonthly?.[m] || 0;
                  rTotalAnnual += r;

                  if (m <= selectedMonth) {
                    rMTD += r;
                    bMTD += b;
                  }
                }

                const sisaPagu = item.budgetAnnual - rMTD;
                const serapPct = item.budgetAnnual > 0 ? (rMTD / item.budgetAnnual) * 100 : 0;

                if (isHeader) {
                  return (
                    <tr key={item.id} className="bg-slate-100 font-bold text-slate-900">
                      <td className="py-2.5 px-3 text-center text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-3">{item.code || '-'}</td>
                      <td className="py-2.5 px-3 uppercase tracking-wider font-sans" colSpan={matrixMode === 'summary_mtd' ? 2 : 1}>
                        {item.name}
                      </td>
                      {matrixMode === 'summary_mtd' && (
                        <>
                          <td className="py-2.5 px-3 text-right">{formatRupiah(item.budgetAnnual)}</td>
                          <td className="py-2.5 px-3 text-right">{formatRupiah(bMTD)}</td>
                          <td className="py-2.5 px-3 text-right text-blue-600">{formatRupiah(rMTD)}</td>
                          <td className="py-2.5 px-3 text-right text-amber-700">{formatRupiah(sisaPagu)}</td>
                          <td className="py-2.5 px-3 text-center">{formatPercent(serapPct)}</td>
                        </>
                      )}
                      {matrixMode === 'monthly_realization' && (
                        <td colSpan={13} className="py-2.5 px-3 text-center text-slate-500">
                          [Sub-Total Header Group]
                        </td>
                      )}
                      {matrixMode === 'monthly_target_vs_real' && (
                        <td colSpan={25} className="py-2.5 px-3 text-center text-slate-500">
                          [Sub-Total Header Group]
                        </td>
                      )}
                    </tr>
                  );
                }

                return (
                  <tr key={item.id} className="hover:bg-blue-50/40 transition-colors text-xs">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-sans">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">{item.code}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 font-sans">
                      <span className="truncate max-w-xs block" title={item.name}>{item.name}</span>
                    </td>

                    {matrixMode === 'summary_mtd' && (
                      <>
                        <td className="py-2.5 px-3 font-sans">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {item.posType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-800 font-semibold">{formatRupiah(item.budgetAnnual)}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600">{formatRupiah(bMTD)}</td>
                        <td className="py-2.5 px-3 text-right text-blue-600 font-bold">{formatRupiah(rMTD)}</td>
                        <td className={`py-2.5 px-3 text-right font-semibold ${sisaPagu < 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                          {formatRupiah(sisaPagu)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-sans">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            serapPct > 100 ? 'bg-rose-100 text-rose-700' :
                            serapPct > 70 ? 'bg-emerald-100 text-emerald-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {formatPercent(serapPct)}
                          </span>
                        </td>
                      </>
                    )}

                    {matrixMode === 'monthly_realization' && (
                      <>
                        {(item.realizationMonthly || Array(12).fill(0)).map((val, mIdx) => (
                          <td 
                            key={`r-${mIdx}`} 
                            className={`py-2 px-2 text-right text-[11px] ${
                              val > 0 ? 'text-blue-700 font-medium' : 'text-slate-300'
                            } ${mIdx === selectedMonth ? 'bg-blue-50/70 font-bold' : ''}`}
                          >
                            {val > 0 ? formatRupiahShort(val) : '-'}
                          </td>
                        ))}
                        <td className="py-2 px-3 text-right font-bold text-slate-900 bg-slate-50">
                          {formatRupiah(rTotalAnnual)}
                        </td>
                      </>
                    )}

                    {matrixMode === 'monthly_target_vs_real' && (
                      <>
                        {MONTH_SHORT_NAMES.map((_, mIdx) => {
                          const tgt = item.budgetMonthly?.[mIdx] || 0;
                          const r = item.realizationMonthly?.[mIdx] || 0;
                          return (
                            <React.Fragment key={`m-${mIdx}`}>
                              <td className="py-2 px-2 text-right text-[10px] text-slate-400">
                                {tgt > 0 ? formatRupiahShort(tgt) : '-'}
                              </td>
                              <td className={`py-2 px-2 text-right text-[10px] font-semibold border-r border-slate-100 ${
                                r > 0 ? 'text-emerald-700' : 'text-slate-300'
                              } ${mIdx === selectedMonth ? 'bg-indigo-50/60 font-bold' : ''}`}>
                                {r > 0 ? formatRupiahShort(r) : '-'}
                              </td>
                            </React.Fragment>
                          );
                        })}
                        <td className="py-2 px-3 text-right font-bold text-slate-900 bg-slate-50">
                          {formatRupiah(rTotalAnnual)}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>

            {/* Total Footer Row */}
            <tfoot className="bg-slate-900 text-white font-bold text-xs sticky bottom-0 z-20">
              <tr>
                <td className="py-3 px-3 text-center" colSpan={matrixMode === 'summary_mtd' ? 4 : 3}>
                  GRAND TOTAL
                </td>
                {matrixMode === 'summary_mtd' && (
                  <>
                    <td className="py-3 px-3 text-right font-mono">{formatRupiah(totals.totalAnnual)}</td>
                    <td className="py-3 px-3 text-right font-mono">{formatRupiah(totals.targetMTD)}</td>
                    <td className="py-3 px-3 text-right font-mono text-blue-300">{formatRupiah(totals.realMTD)}</td>
                    <td className="py-3 px-3 text-right font-mono text-amber-300">{formatRupiah(totals.sisaPagu)}</td>
                    <td className="py-3 px-3 text-center font-sans">{formatPercent(totals.penyerapanPct)}</td>
                  </>
                )}

                {matrixMode === 'monthly_realization' && (
                  <>
                    {totals.monthlyRealizationTotals.map((val, idx) => (
                      <td 
                        key={`tot-r-${idx}`} 
                        className={`py-3 px-2 text-right text-[10px] font-mono ${
                          idx === selectedMonth ? 'text-amber-300 font-bold bg-slate-800' : 'text-blue-200'
                        }`}
                      >
                        {formatRupiahShort(val)}
                      </td>
                    ))}
                    <td className="py-3 px-3 text-right font-mono bg-slate-800 text-white">
                      {formatRupiah(totals.monthlyRealizationTotals.reduce((a, b) => a + b, 0))}
                    </td>
                  </>
                )}

                {matrixMode === 'monthly_target_vs_real' && (
                  <>
                    {MONTH_SHORT_NAMES.map((_, idx) => (
                      <React.Fragment key={`tot-m-${idx}`}>
                        <td className="py-3 px-2 text-right text-[9px] font-mono text-slate-300">
                          {formatRupiahShort(totals.monthlyBudgetTotals[idx])}
                        </td>
                        <td className="py-3 px-2 text-right text-[9px] font-mono text-emerald-300 border-r border-slate-800">
                          {formatRupiahShort(totals.monthlyRealizationTotals[idx])}
                        </td>
                      </React.Fragment>
                    ))}
                    <td className="py-3 px-3 text-right font-mono bg-slate-800 text-white">
                      {formatRupiah(totals.monthlyRealizationTotals.reduce((a, b) => a + b, 0))}
                    </td>
                  </>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
