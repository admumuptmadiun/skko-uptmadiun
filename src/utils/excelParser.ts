import * as XLSX from 'xlsx';
import { BudgetItem } from '../types';
import { parseNumberString, MONTH_NAMES } from './formatters';

export interface ParsedRealizationRow {
  rowIndex: number;
  code: string;
  name: string;
  matchedItemId?: string;
  matchedItemName?: string;
  realization: number[]; // 12 months
  total: number;
  status: 'matched' | 'unmatched' | 'header';
}

export interface ParseResult {
  sheetNames: string[];
  selectedSheet: string;
  totalRows: number;
  matchedCount: number;
  unmatchedCount: number;
  parsedRows: ParsedRealizationRow[];
  headers: string[];
}

export async function parseUploadedExcel(
  file: File,
  existingItems: BudgetItem[],
  targetSheetName?: string
): Promise<ParseResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  
  const sheetNames = workbook.SheetNames;
  const sheetNameToUse = targetSheetName && sheetNames.includes(targetSheetName)
    ? targetSheetName
    : sheetNames.find(s => s.toUpperCase().includes('REALISASI')) || sheetNames[0];
      
  const worksheet = workbook.Sheets[sheetNameToUse];
  const rawJson: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (rawJson.length === 0) {
    throw new Error('Lembar kerja Excel kosong');
  }

  // Detect header row and format
  const headers = (rawJson[0] || []).map((h: any) => String(h || '').trim());
  
  // Find which row starts the data
  let startRowIndex = 1;
  if (rawJson.length > 1) {
    const row1First = String(rawJson[1]?.[0] || '').trim();
    // if row 1 is subheader e.g. "1", "2", "3" or empty
    if (!row1First || /^[0-9]+$/.test(row1First) || row1First.toLowerCase().includes('bulan')) {
      startRowIndex = 2;
    }
  }

  const parsedRows: ParsedRealizationRow[] = [];
  let matchedCount = 0;
  let unmatchedCount = 0;

  for (let i = startRowIndex; i < rawJson.length; i++) {
    const row = rawJson[i];
    if (!row || row.length === 0) continue;

    const firstCol = String(row[0] || '').trim();
    if (!firstCol) continue;

    // Check if this row is an account code + name
    const codeMatch = firstCol.match(/^([0-9]{10})\s*(.*)$/);
    const code = codeMatch ? codeMatch[1] : '';
    const name = codeMatch ? codeMatch[2].trim() : firstCol;

    const isHeaderOnly = !codeMatch && (
      firstCol.toLowerCase().startsWith('pos ') ||
      firstCol.toLowerCase().startsWith('beban usaha') ||
      firstCol.toLowerCase().startsWith('beban kepegawaian') ||
      firstCol.toLowerCase().startsWith('pemakaian material') ||
      firstCol.toLowerCase().startsWith('jasa borong') ||
      firstCol.toLowerCase().startsWith('beban sewa')
    );

    // Extract monthly values
    const realization = Array(12).fill(0);

    // Check if we have 24+ columns (Old template compatibility: Tunai + NonTunai)
    if (row.length >= 25) {
      for (let m = 0; m < 12; m++) {
        const t = parseNumberString(row[m + 1]);
        const nt = parseNumberString(row[m + 13]);
        realization[m] = t + nt;
      }
    } else if (row.length >= 13) {
      // 12 monthly columns (Jan - Des)
      for (let m = 0; m < 12; m++) {
        realization[m] = parseNumberString(row[m + 1]);
      }
    } else if (row.length >= 4) {
      // Format simpel: col 0 = kode, col 1 = nama, col 2 = pos, col 3 = bulan (1-12), col 4 = nilai
      const mIdx = Math.max(0, Math.min(11, parseInt(String(row[3]), 10) - 1));
      const val = parseNumberString(row[4] || row[1]);
      if (!isNaN(mIdx)) {
        realization[mIdx] = val;
      }
    } else if (row.length >= 2) {
      // Short format: col 0 = akun/kode, col 1 = realisasi (assigned to month 0 or current)
      realization[0] = parseNumberString(row[1]);
    }

    const total = realization.reduce((a, b) => a + b, 0);

    // Match against existing budget items
    let matchedItem: BudgetItem | undefined;
    if (code) {
      matchedItem = existingItems.find(it => it.code === code);
    }
    if (!matchedItem) {
      const cleanTargetName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      matchedItem = existingItems.find(it => {
        const cleanExisting = it.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanExisting === cleanTargetName || (cleanTargetName.length > 5 && cleanExisting.includes(cleanTargetName));
      });
    }

    const status: 'matched' | 'unmatched' | 'header' = isHeaderOnly
      ? 'header'
      : matchedItem
        ? 'matched'
        : 'unmatched';

    if (status === 'matched') matchedCount++;
    if (status === 'unmatched') unmatchedCount++;

    parsedRows.push({
      rowIndex: i + 1,
      code: code || matchedItem?.code || '',
      name: name,
      matchedItemId: matchedItem?.id,
      matchedItemName: matchedItem ? `${matchedItem.code ? matchedItem.code + ' ' : ''}${matchedItem.name}` : undefined,
      realization,
      total,
      status
    });
  }

  return {
    sheetNames,
    selectedSheet: sheetNameToUse,
    totalRows: parsedRows.length,
    matchedCount,
    unmatchedCount,
    parsedRows,
    headers
  };
}

export function generateTemplateExcel(budgetItems: BudgetItem[]): void {
  const header1 = [
    'URAIAN',
    'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
    'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOPEMBER', 'DESEMBER'
  ];

  const header2 = [
    '',
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'
  ];

  const dataRows: any[][] = [header1, header2];

  budgetItems.forEach(item => {
    const label = item.code && !item.code.startsWith('CODE_') && !item.code.startsWith('POS') 
      ? `${item.code} ${item.name}` 
      : item.name;

    const row = [
      label,
      ...(item.realizationMonthly || Array(12).fill(0))
    ];
    dataRows.push(row);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(dataRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'REALISASI');

  // Also add a simplified tab
  const simpleHeaders = ['KODE AKUN', 'NAMA AKUN', 'POS ANGGARAN', 'BULAN (1-12)', 'REALISASI (RP)'];
  const simpleRows: any[][] = [simpleHeaders];
  
  budgetItems.filter(it => !it.isGroupHeader).slice(0, 15).forEach((item) => {
    simpleRows.push([
      item.code,
      item.name,
      item.pos,
      8, // Bulan Agustus
      item.realizationMonthly?.[7] || 0
    ]);
  });
  
  const simpleWorksheet = XLSX.utils.aoa_to_sheet(simpleRows);
  XLSX.utils.book_append_sheet(workbook, simpleWorksheet, 'FORMAT_SIMPEL');

  XLSX.writeFile(workbook, 'Template_Import_Realisasi_Anggaran.xlsx');
}
