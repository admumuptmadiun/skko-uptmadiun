import React, { useMemo } from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Calendar, 
  Layers,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { 
  formatRupiah, 
  formatRupiahShort, 
  formatPercent, 
  MONTH_NAMES, 
  MONTH_SHORT_NAMES 
} from '../utils/formatters';
import { PosType } from '../types';

export const ReportsView: React.FC = () => {
  const { 
    budgetItems, 
    indicators, 
    additionalTransactions, 
    selectedYear, 
    selectedMonth 
  } = useApp();

  const reportData = useMemo(() => {
    const nonHeaders = budgetItems.filter(i => !i.isGroupHeader);

    let totalPagu = 0;
    let targetMTD = 0;
    let totalRealMTD = 0;

    nonHeaders.forEach(item => {
      totalPagu += item.budgetAnnual || 0;
      for (let m = 0; m <= selectedMonth; m++) {
        const r = item.realizationMonthly?.[m] || 0;
        const b = item.budgetMonthly[m] || 0;

        targetMTD += b;
        totalRealMTD += r;
      }
    });

    const sisaPagu = totalPagu - totalRealMTD;
    const penyerapanPct = totalPagu > 0 ? (totalRealMTD / totalPagu) * 100 : 0;

    const posList: PosType[] = ['Pos 52', 'Pos 53', 'Pos 54', 'Sewa Non AHG', 'Pos 72'];
    const posRows = posList.map(pos => {
      const pItems = nonHeaders.filter(i => i.posType === pos);
      let pPagu = 0;
      let pTargetMTD = 0;
      let pRealMTD = 0;

      pItems.forEach(i => {
        pPagu += i.budgetAnnual || 0;
        for (let m = 0; m <= selectedMonth; m++) {
          pTargetMTD += (i.budgetMonthly[m] || 0);
          pRealMTD += (i.realizationMonthly?.[m] || 0);
        }
      });

      const pSisa = pPagu - pRealMTD;
      const pPct = pPagu > 0 ? (pRealMTD / pPagu) * 100 : 0;

      return {
        pos,
        name: pos === 'Pos 52' ? 'Beban Kepegawaian' :
              pos === 'Pos 53' ? 'Beban Pemeliharaan' :
              pos === 'Pos 54' ? 'Biaya Administrasi & Umum' :
              pos === 'Sewa Non AHG' ? 'Beban Sewa Non AHG' :
              'Beban Pensiun',
        pagu: pPagu,
        targetMTD: pTargetMTD,
        realMTD: pRealMTD,
        sisa: pSisa,
        percentage: pPct
      };
    });

    return {
      totalPagu,
      targetMTD,
      totalRealMTD,
      sisaPagu,
      penyerapanPct,
      posRows
    };
  }, [budgetItems, selectedMonth]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Action Bar */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Laporan Eksekutif Realisasi Anggaran</h1>
            <p className="text-xs text-slate-500">
              Format cetak resmi untuk laporan manajerial dan rapat koordinasi realisasi anggaran
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm transition-all self-start sm:self-auto cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak / Simpan PDF</span>
        </button>
      </div>

      {/* Printable Document Container */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-lg p-8 sm:p-12 max-w-4xl mx-auto text-slate-900 print:border-none print:shadow-none print:p-0">
        {/* Memo Header */}
        <div className="border-b-2 border-slate-900 pb-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xl">
                PLN
              </div>
              <div>
                <h2 className="font-extrabold text-lg uppercase tracking-tight">LAPORAN PEMANTAUAN REALISASI ANGGARAN</h2>
                <p className="text-xs text-slate-600 font-medium">Model Monitoring Anggaran & Realisasi SAP/SKKO</p>
              </div>
            </div>

            <div className="text-right text-xs text-slate-600">
              <div className="font-bold text-slate-900">Periode Pelaporan:</div>
              <div>s/d {MONTH_NAMES[selectedMonth]} {selectedYear}</div>
              <div className="text-[11px] text-slate-400 mt-1">Dicetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase">Pagu SKKO ({selectedYear})</span>
            <span className="text-lg font-extrabold text-slate-900 font-mono mt-1 block">
              {formatRupiah(reportData.totalPagu)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
            <span className="text-[11px] font-semibold text-blue-700 block uppercase">Realisasi s/d {MONTH_NAMES[selectedMonth]}</span>
            <span className="text-lg font-extrabold text-blue-900 font-mono mt-1 block">
              {formatRupiah(reportData.totalRealMTD)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="text-[11px] font-semibold text-emerald-700 block uppercase">% Penyerapan Anggaran</span>
            <span className="text-lg font-extrabold text-emerald-900 mt-1 block">
              {formatPercent(reportData.penyerapanPct)}
            </span>
          </div>
        </div>

        {/* Section 1: Ringkasan Realisasi per Kelompok POS */}
        <div className="mb-8">
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 mb-3 border-l-4 border-blue-600 pl-2">
            1. Ringkasan Realisasi per Kelompok Beban (POS)
          </h3>

          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-700 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Kelompok POS</th>
                <th className="py-2.5 px-3 text-right">Pagu Tahunan</th>
                <th className="py-2.5 px-3 text-right">Target s/d Bln</th>
                <th className="py-2.5 px-3 text-right">Realisasi s/d Bln</th>
                <th className="py-2.5 px-3 text-right">Sisa Pagu</th>
                <th className="py-2.5 px-3 text-center">% Serap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {reportData.posRows.map((pos) => (
                <tr key={pos.pos}>
                  <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">{pos.name} ({pos.pos})</td>
                  <td className="py-2.5 px-3 text-right">{formatRupiah(pos.pagu)}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600">{formatRupiah(pos.targetMTD)}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatRupiah(pos.realMTD)}</td>
                  <td className="py-2.5 px-3 text-right text-slate-700">{formatRupiah(pos.sisa)}</td>
                  <td className="py-2.5 px-3 text-center font-sans font-bold">{formatPercent(pos.percentage)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-900 text-white font-bold text-xs font-mono">
              <tr>
                <td className="py-2.5 px-3 font-sans">TOTAL KESELURUHAN</td>
                <td className="py-2.5 px-3 text-right">{formatRupiah(reportData.totalPagu)}</td>
                <td className="py-2.5 px-3 text-right">{formatRupiah(reportData.targetMTD)}</td>
                <td className="py-2.5 px-3 text-right">{formatRupiah(reportData.totalRealMTD)}</td>
                <td className="py-2.5 px-3 text-right">{formatRupiah(reportData.sisaPagu)}</td>
                <td className="py-2.5 px-3 text-center font-sans">{formatPercent(reportData.penyerapanPct)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Section 2: Indikator Kinerja & Optimalisasi Biaya */}
        <div className="mb-8">
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 mb-3 border-l-4 border-emerald-600 pl-2">
            2. Capaian Indikator Kinerja & Optimalisasi Biaya
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {indicators.map((ind) => {
              const pct = ind.monthlyPercentage[selectedMonth] || 0;
              const isOptimal = pct <= 100 && pct > 0;

              return (
                <div key={ind.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">{ind.name}</span>
                    <span className="text-[11px] text-slate-500">Target: {ind.targetRule}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold font-mono text-slate-900 block">
                      {formatPercent(pct)}
                    </span>
                    <span className={`text-[10px] font-bold ${isOptimal ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {isOptimal ? 'OPTIMAL' : 'OVERBUDGET'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Signature Block */}
        <div className="pt-8 border-t border-slate-300 mt-12">
          <div className="grid grid-cols-2 text-center text-xs text-slate-700">
            <div>
              <p className="font-medium text-slate-500 mb-16">Disiapkan Oleh,<br />Asisten Manajer Keuangan & Anggaran</p>
              <p className="font-bold text-slate-900 underline">( _________________________ )</p>
            </div>
            <div>
              <p className="font-medium text-slate-500 mb-16">Disetujui Oleh,<br />Manager Unit Pelaksana</p>
              <p className="font-bold text-slate-900 underline">( _________________________ )</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
