import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  ArrowRight, 
  RefreshCw, 
  FileText, 
  History, 
  Eye, 
  Check, 
  HelpCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';
import { BudgetItem } from '../types';
import { formatRupiah, formatRupiahShort, MONTH_NAMES, parseNumberString } from '../utils/formatters';

export const RealizationImportView: React.FC = () => {
  const { 
    budgetItems, 
    importRealizationData, 
    importLogs, 
    selectedYear, 
    selectedMonth 
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [previewMatchedItems, setPreviewMatchedItems] = useState<{
    matched: BudgetItem[];
    unmatched: any[];
    totalAmount: number;
  } | null>(null);

  const [importTargetOption, setImportTargetOption] = useState<'all' | 'specific'>('all');
  const [targetSpecificMonth, setTargetSpecificMonth] = useState<number>(selectedMonth);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string; count: number } | null>(null);

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    // 1. Sheet Realisasi 12 Bulan
    const headers = [
      'KODE GL',
      'URAIAN AKUN',
      'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
      'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOPEMBER', 'DESEMBER'
    ];

    const sampleRows = budgetItems.slice(0, 15).map(item => {
      return [
        item.code,
        item.name,
        ...(item.realizationMonthly || Array(12).fill(0))
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'REALISASI');

    // Also add a simplified monthly template sheet
    const simpleHeaders = ['KODE_GL', 'NAMA_AKUN', 'BULAN_ANGKA (1-12)', 'REALISASI', 'KETERANGAN'];
    const simpleSampleRows = [
      ['6105100110', 'Pay For Person (P1)', 8, 4597194944, 'Realisasi Agustus'],
      ['6105200100', 'Beban Tunjangan Cuti tahunan', 8, 2480944510, 'Realisasi Agustus'],
      ['6106100100', 'Beban pemakaian mate - transformator', 8, 125000000, 'Realisasi Agustus'],
      ['6106200700', 'Beban jasa borong Gardu Induk', 8, 3650000000, 'Realisasi Agustus'],
      ['6107200800', 'Listrik, Gas dan Air', 8, 46000000, 'Realisasi Agustus'],
      ['6107201100', 'Bahan Makanan & Konsumsi', 8, 37075110, 'Realisasi Agustus'],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet([simpleHeaders, ...simpleSampleRows]);
    XLSX.utils.book_append_sheet(wb, ws2, 'FORMAT_BULANAN_SIMPEL');

    XLSX.writeFile(wb, `Template_Import_Realisasi_Anggaran_${selectedYear}.xlsx`);
  };

  const processFile = async (file: File) => {
    setIsLoading(true);
    setImportResult(null);
    setSelectedFile(file);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      
      // Look for sheet named REALISASI, KINERJA, or first sheet
      let sheetName = wb.SheetNames.find(s => s.toUpperCase().includes('REALISASI')) || wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      if (rawRows.length === 0) {
        alert('File excel kosong.');
        setIsLoading(false);
        return;
      }

      const itemsToMatch: Partial<BudgetItem>[] = [];
      let totalAmount = 0;

      // Check header in first 5 rows
      let headerRowIndex = 0;
      for (let r = 0; r < Math.min(5, rawRows.length); r++) {
        const rowStr = rawRows[r].join(' ').toUpperCase();
        if (rowStr.includes('KODE') || rowStr.includes('URAIAN') || rowStr.includes('REALISASI') || rowStr.includes('ACCOUNT')) {
          headerRowIndex = r;
          break;
        }
      }

      const headers = rawRows[headerRowIndex] || [];
      const isSimpleFormat = headers.some((h: any) => String(h).toUpperCase().includes('BULAN_ANGKA') || String(h).toUpperCase().includes('BULAN'));

      if (isSimpleFormat) {
        // Simple format parser: col 0 = kode, col 1 = nama, col 2 = bulan (1-12), col 3 = nilai
        for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!row || row.length === 0 || !row[0]) continue;

          const code = String(row[0] || '').trim();
          const name = String(row[1] || '').trim();
          const monthNum = parseInt(row[2]) || (selectedMonth + 1);
          const monthIdx = Math.max(0, Math.min(11, monthNum - 1));
          const val = parseNumberString(row[3]);

          const realArr = Array(12).fill(0);
          realArr[monthIdx] = val;

          totalAmount += val;

          itemsToMatch.push({
            code,
            name,
            realizationMonthly: realArr
          });
        }
      } else {
        // Matrix format parser (12 months or legacy 24 columns)
        for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!row || row.length === 0) continue;

          const col0 = String(row[0] || '').trim();
          const col1 = String(row[1] || '').trim();
          
          if (!col0 && !col1) continue;

          let code = '';
          let name = col0;

          // Check if col0 is numeric code
          const codeMatch = col0.match(/^([0-9]{8,12})\s*(.*)$/);
          if (codeMatch) {
            code = codeMatch[1];
            name = codeMatch[2] || col0;
          } else if (col1 && !isNaN(Number(col0)) && col0.length >= 8) {
            code = col0;
            name = col1;
          }

          const realArr = Array(12).fill(0);
          let numColOffset = codeMatch ? 1 : (col1 ? 2 : 1);

          // Check if file has legacy 24 columns (Tunai + Non-Tunai)
          if (row.length >= numColOffset + 24) {
            for (let m = 0; m < 12; m++) {
              const t = parseNumberString(row[numColOffset + m]);
              const nt = parseNumberString(row[numColOffset + 12 + m]);
              realArr[m] = t + nt;
              totalAmount += (t + nt);
            }
          } else {
            // Standard 12-month columns
            for (let m = 0; m < 12; m++) {
              const val = parseNumberString(row[numColOffset + m]);
              realArr[m] = val;
              totalAmount += val;
            }
          }

          itemsToMatch.push({
            code,
            name,
            realizationMonthly: realArr
          });
        }
      }

      setParsedData(itemsToMatch);

      // Analyze matches against current budget database
      const matched: BudgetItem[] = [];
      const unmatched: any[] = [];

      itemsToMatch.forEach(item => {
        const found = budgetItems.find(b => {
          if (item.code && b.code && item.code === b.code) return true;
          if (item.name && b.name && item.name.toLowerCase().trim() === b.name.toLowerCase().trim()) return true;
          return false;
        });

        if (found) {
          matched.push(found);
        } else {
          unmatched.push(item);
        }
      });

      setPreviewMatchedItems({
        matched,
        unmatched,
        totalAmount
      });

    } catch (err: any) {
      console.error('Error processing Excel:', err);
      alert('Gagal membaca file Excel: ' + (err.message || 'Format tidak valid.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleApplyImport = () => {
    if (!parsedData || !selectedFile) return;

    const targetMonthParam = importTargetOption === 'specific' ? targetSpecificMonth : undefined;
    const res = importRealizationData(parsedData, selectedFile.name, targetMonthParam);
    
    setImportResult({
      success: res.success,
      message: res.message,
      count: res.matched
    });

    setParsedData(null);
    setPreviewMatchedItems(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Import Data Realisasi (Excel / CSV)</h1>
            <p className="text-xs text-slate-500">
              Sinkronisasi data realisasi SAP, kas, dan mutasi bank dari file Excel spreadsheet
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 flex items-center gap-2 transition-colors self-start md:self-auto cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Unduh Template Excel (.xlsx)</span>
        </button>
      </div>

      {/* Success / Warning Message Banner */}
      {importResult && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
          importResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          {importResult.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="text-xs">
            <h4 className="font-bold">{importResult.success ? 'Import Realisasi Berhasil' : 'Peringatan Import'}</h4>
            <p className="mt-0.5 text-slate-600">{importResult.message}</p>
          </div>
        </div>
      )}

      {/* Upload Zone & Instructions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Dropzone */}
        <div className="lg:col-span-2 space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all bg-white cursor-pointer ${
              dragActive 
                ? 'border-blue-500 bg-blue-50/50' 
                : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <FileSpreadsheet className="w-7 h-7" />
            </div>

            <h3 className="font-bold text-base text-slate-800">
              Pilih file Excel atau Seret & Letakkan di sini
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Mendukung format Microsoft Excel (.xlsx, .xls) dan CSV. 
              Sistem akan otomatis mengenali kolom kode akun GL dan nilai realisasi bulanan.
            </p>

            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200">
                Pilih File Excel
              </span>
            </div>

            {selectedFile && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl inline-flex items-center gap-2 text-xs text-blue-900 font-semibold">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
          </div>

          {/* Import Scope Configuration */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
              Opsi Penempatan Data Import
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label 
                className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                  importTargetOption === 'all'
                    ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-500'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => setImportTargetOption('all')}
              >
                <input 
                  type="radio" 
                  name="scope" 
                  checked={importTargetOption === 'all'} 
                  onChange={() => setImportTargetOption('all')}
                  className="mt-0.5 text-blue-600"
                />
                <div>
                  <span className="font-bold text-slate-900 block">Semua Bulan (Januari - Desember)</span>
                  <span className="text-slate-500 text-[11px]">
                    Timpa seluruh data realisasi dari kolom Jan s/d Des pada file Excel.
                  </span>
                </div>
              </label>

              <label 
                className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                  importTargetOption === 'specific'
                    ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-500'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => setImportTargetOption('specific')}
              >
                <input 
                  type="radio" 
                  name="scope" 
                  checked={importTargetOption === 'specific'} 
                  onChange={() => setImportTargetOption('specific')}
                  className="mt-0.5 text-blue-600"
                />
                <div className="flex-1">
                  <span className="font-bold text-slate-900 block">Hanya Bulan Tertentu</span>
                  <span className="text-slate-500 text-[11px] block mb-2">
                    Hanya update realisasi untuk 1 bulan cut-off.
                  </span>
                  {importTargetOption === 'specific' && (
                    <select
                      value={targetSpecificMonth}
                      onChange={(e) => setTargetSpecificMonth(Number(e.target.value))}
                      className="w-full px-2 py-1 bg-white border border-blue-400 rounded text-xs font-semibold text-blue-900 focus:outline-none"
                    >
                      {MONTH_NAMES.map((m, idx) => (
                        <option key={idx} value={idx}>{m}</option>
                      ))}
                    </select>
                  )}
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Help Box */}
        <div className="space-y-4">
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
              <HelpCircle className="w-4 h-4" />
              <span>Panduan Format Data Excel</span>
            </div>
            <h4 className="font-bold text-sm">Struktur Data Yang Dikenali:</h4>
            
            <ul className="text-xs text-slate-300 space-y-2 list-disc pl-4">
              <li>
                <strong>Model Sheet Realisasi:</strong> Kolom 1 (Uraian / Kode Akun), Kolom 2-13 (Realisasi Jan-Des).
              </li>
              <li>
                <strong>Format Bulanan Simpel:</strong> Kolom <code className="text-blue-300 font-mono">KODE_GL</code>, <code className="text-blue-300 font-mono">BULAN_ANGKA</code>, <code className="text-blue-300 font-mono">REALISASI</code>.
              </li>
              <li>
                Sistem otomatis mencocokkan nomor kode GL 10 digit (contoh: <code>6105100110</code>) atau kesamaan nama akun.
              </li>
            </ul>

            <div className="pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Contoh Format Lengkap</span>
              </button>
            </div>
          </div>

          {/* Quick status summary */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 text-xs space-y-2">
            <span className="font-bold text-slate-700 block">Status Database Anggaran Saat Ini:</span>
            <div className="flex justify-between text-slate-600">
              <span>Total Akun Anggaran:</span>
              <strong className="text-slate-900">{budgetItems.length} Akun</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Tahun Anggaran Aktif:</span>
              <strong className="text-blue-600 font-mono">{selectedYear}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* PREVIEW IMPORT MODAL / SECTION */}
      {previewMatchedItems && (
        <div className="bg-white rounded-2xl border-2 border-blue-500 p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Pratinjau Hasil Pembacaan Excel ({selectedFile?.name})
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Periksa kesesuaian akun sebelum menerapkan data realisasi ke sistem
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setParsedData(null);
                  setPreviewMatchedItems(null);
                  setSelectedFile(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={handleApplyImport}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Terapkan Import Realisasi ({previewMatchedItems.matched.length} Akun)</span>
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
              <span className="text-emerald-700 font-medium block">Akun Cocok (Tervalidasi)</span>
              <span className="text-xl font-extrabold text-emerald-900 mt-1 block">
                {previewMatchedItems.matched.length} Akun
              </span>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs">
              <span className="text-amber-700 font-medium block">Akun Baru / Tidak Ditemukan</span>
              <span className="text-xl font-extrabold text-amber-900 mt-1 block">
                {previewMatchedItems.unmatched.length} Baris
              </span>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs">
              <span className="text-blue-700 font-medium block">Total Nilai Realisasi Dibaca</span>
              <span className="text-xl font-extrabold text-blue-900 font-mono mt-1 block">
                {formatRupiahShort(previewMatchedItems.totalAmount)}
              </span>
            </div>
          </div>

          {/* Matched Preview Table */}
          <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">No</th>
                  <th className="py-2.5 px-3 w-32">Kode GL</th>
                  <th className="py-2.5 px-3">Nama Akun Anggaran</th>
                  <th className="py-2.5 px-3 w-28">POS</th>
                  <th className="py-2.5 px-3 text-center w-28">Status Cocok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewMatchedItems.matched.slice(0, 30).map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="py-2 px-3 font-mono font-semibold text-slate-900">{item.code}</td>
                    <td className="py-2 px-3 font-medium text-slate-800">{item.name}</td>
                    <td className="py-2 px-3 text-slate-600">{item.posType}</td>
                    <td className="py-2 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <Check className="w-3 h-3" /> Cocok
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-sm text-slate-900">Riwayat Import & Sinkronisasi Excel</h3>
          </div>
          <span className="text-xs text-slate-500">{importLogs.length} Aktivitas Tersimpan</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4 min-w-[200px]">Nama File</th>
                <th className="py-3 px-4 w-36">Waktu Import</th>
                <th className="py-3 px-4 text-center w-28">Baris Cocok</th>
                <th className="py-3 px-4 text-right min-w-[150px]">Total Realisasi</th>
                <th className="py-3 px-4 min-w-[220px]">Keterangan</th>
                <th className="py-3 px-4 text-center w-24">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {importLogs.map((log, idx) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 text-center text-slate-400">{idx + 1}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{log.fileName}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {new Date(log.importedAt).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-slate-800">
                    {log.rowsMatched} / {log.rowsProcessed}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    {formatRupiah(log.totalAmountImported)}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{log.message}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {log.status === 'success' ? 'BERHASIL' : 'SEBAGIAN'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
