import * as XLSX from 'xlsx';
import { BudgetItem, IndicatorTarget, AdditionalTransaction } from '../types';
import { MONTH_NAMES, MONTH_SHORT_NAMES } from './formatters';

export function exportFullReportToExcel(
  budgetItems: BudgetItem[],
  indicators: IndicatorTarget[],
  additionalTransactions: AdditionalTransaction[],
  year: number = 2026,
  monthCutoff: number = 8 // 1-12
): void {
  const workbook = XLSX.utils.book_new();

  // 1. Sheet: MATRIKS REALISASI
  const matrixHeaders = [
    'URAIAN',
    ...MONTH_SHORT_NAMES.map(m => `REALISASI ${m.toUpperCase()}`),
    ...MONTH_SHORT_NAMES.map(m => `AKUMULASI ${m.toUpperCase()}`),
    'TOTAL REALISASI TAHUNAN',
    'ANGGARAN TAHUNAN',
    'SISA PAGU',
    '% SERAPAN'
  ];

  const matrixData: any[][] = [matrixHeaders];

  budgetItems.forEach(item => {
    const label = item.code && !item.code.startsWith('CODE_') && !item.code.startsWith('POS')
      ? `${item.code} ${item.name}`
      : item.name;

    const monthlyVals = item.realizationMonthly || Array(12).fill(0);
    const totalReal = monthlyVals.reduce((a, b) => a + (Number(b) || 0), 0);
    const sisa = item.budgetAnnual - totalReal;
    const percent = item.budgetAnnual > 0 ? (totalReal / item.budgetAnnual) * 100 : 0;

    // Cumulative monthly total
    let runningTotal = 0;
    const akumulasi = monthlyVals.map((r) => {
      runningTotal += (Number(r) || 0);
      return runningTotal;
    });

    matrixData.push([
      label,
      ...monthlyVals,
      ...akumulasi,
      totalReal,
      item.budgetAnnual,
      sisa,
      `${percent.toFixed(2)}%`
    ]);
  });

  const matrixSheet = XLSX.utils.aoa_to_sheet(matrixData);
  XLSX.utils.book_append_sheet(workbook, matrixSheet, 'MATRIKS_REALISASI');

  // 2. Sheet: INDIKATOR KINERJA
  const indicatorHeaders = [
    'NO',
    'JENIS INDIKATOR KINERJA',
    'SATUAN',
    'POS ANGGARAN',
    ...MONTH_SHORT_NAMES,
    'TARGET TAHUNAN',
    'REALISASI YTD',
    '% CAPAIAN'
  ];

  const indicatorData: any[][] = [indicatorHeaders];

  indicators.forEach((ind, idx) => {
    const ytdTarget = ind.monthlyTarget[monthCutoff - 1] || 0;
    const ytdReal = ind.monthlyRealization[monthCutoff - 1] || 0;
    const ytdPercent = ind.monthlyPercentage[monthCutoff - 1] || 0;

    indicatorData.push([
      idx + 1,
      ind.name,
      ind.unit,
      ind.pos,
      ...ind.monthlyPercentage.map(p => `${p.toFixed(2)}%`),
      ind.targetAnnual,
      ytdReal,
      `${ytdPercent.toFixed(2)}%`
    ]);
  });

  const indSheet = XLSX.utils.aoa_to_sheet(indicatorData);
  XLSX.utils.book_append_sheet(workbook, indSheet, 'INDIKATOR_KINERJA');

  // 3. Sheet: PROGNOSA & ALIH DAYA
  const prognosaHeaders = [
    'KATEGORI',
    'URAIAN PEKERJAAN / TRANSAKSI',
    'POS ANGGARAN',
    'BULAN',
    'NILAI TAMBAHAN (RP)',
    'KETERANGAN',
    'STATUS'
  ];

  const prognosaData: any[][] = [prognosaHeaders];

  additionalTransactions.forEach(t => {
    prognosaData.push([
      t.category,
      t.name,
      t.posName,
      MONTH_NAMES[t.month - 1],
      t.amount,
      t.note || '-',
      t.isActive ? 'Aktif' : 'Non-Aktif'
    ]);
  });

  const prognosaSheet = XLSX.utils.aoa_to_sheet(prognosaData);
  XLSX.utils.book_append_sheet(workbook, prognosaSheet, 'TAMBAHAN_TRANSAKSI');

  const filename = `Laporan_Pemantauan_Realisasi_Anggaran_${year}_Cutoff_M${monthCutoff}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
