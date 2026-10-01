import React, { useState, useMemo, useEffect } from 'react';
import { 
  DollarSign, 
  Save, 
  Search, 
  Filter, 
  RotateCcw, 
  Copy, 
  Check, 
  AlertCircle, 
  Calendar, 
  Edit3, 
  Table, 
  Layers, 
  TrendingUp, 
  CheckCircle2, 
  PlusCircle, 
  Maximize2, 
  ArrowRight,
  Info,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BudgetItem, PosType } from '../types';
import { 
  formatRupiah, 
  formatRupiahShort, 
  formatPercent, 
  MONTH_NAMES, 
  MONTH_SHORT_NAMES, 
  parseNumberString 
} from '../utils/formatters';

type ViewMode = 'single_month' | 'full_matrix' | 'quick_form';

export const RealizationInputView: React.FC = () => {
  const { 
    budgetItems, 
    updateRealization, 
    updateAccountMonthlyRealization,
    updateBatchRealizations,
    updateBatchAccountRealizations,
    selectedYear, 
    selectedMonth, 
    setSelectedMonth 
  } = useApp();

  const [activeMode, setActiveMode] = useState<ViewMode>('single_month');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosFilter, setSelectedPosFilter] = useState<string>('ALL');
  
  // Local buffer for single month inputs: { [itemId]: number }
  const [localMonthValues, setLocalMonthValues] = useState<{ [itemId: string]: number }>({});
  // Local buffer for full matrix inputs: { [itemId]: number[] }
  const [localMatrixValues, setLocalMatrixValues] = useState<{ [itemId: string]: number[] }>({});
  
  // Track modified items
  const [dirtyItemIds, setDirtyItemIds] = useState<Set<string>>(new Set());
  
  // Toast notification
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info' | 'warning'; text: string } | null>(null);

  // Modal 12 Month state
  const [modalItem, setModalItem] = useState<BudgetItem | null>(null);
  const [modalMonthlyValues, setModalMonthlyValues] = useState<number[]>(Array(12).fill(0));

  // Quick Form State
  const [quickFormAccountId, setQuickFormAccountId] = useState<string>('');
  const [quickFormMonth, setQuickFormMonth] = useState<number>(selectedMonth);
  const [quickFormAmount, setQuickFormAmount] = useState<string>('');
  const [quickFormMode, setQuickFormMode] = useState<'replace' | 'add'>('replace');
  const [quickFormNote, setQuickFormNote] = useState<string>('');

  const POS_FILTER_OPTIONS: { id: string; label: string }[] = [
    { id: 'ALL', label: 'Semua Kelompok Pos' },
    { id: 'Pos 52', label: 'Pos 52 (Kepegawaian)' },
    { id: 'Pos 53', label: 'Pos 53 (Pemeliharaan)' },
    { id: 'Pos 54', label: 'Pos 54 (Administrasi & Umum)' },
    { id: 'Beban Sewa', label: 'Beban Sewa' },
    { id: 'Pos 72', label: 'Pos 72 (Pensiun)' },
    { id: 'Lainnya', label: 'Lainnya / Beban Usaha' },
  ];

  // Initialize/sync local state from budgetItems
  useEffect(() => {
    const monthMap: { [id: string]: number } = {};
    const matrixMap: { [id: string]: number[] } = {};

    budgetItems.forEach(item => {
      if (!item.isGroupHeader) {
        const monthly = item.realizationMonthly || Array(12).fill(0);
        monthMap[item.id] = monthly[selectedMonth] || 0;
        matrixMap[item.id] = [...monthly];
      }
    });

    setLocalMonthValues(monthMap);
    setLocalMatrixValues(matrixMap);
    setDirtyItemIds(new Set());
  }, [budgetItems, selectedMonth]);

  // Set default quick form account when available
  useEffect(() => {
    if (!quickFormAccountId) {
      const firstDetail = budgetItems.find(i => !i.isGroupHeader);
      if (firstDetail) {
        setQuickFormAccountId(firstDetail.id);
      }
    }
  }, [budgetItems, quickFormAccountId]);

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Filtered Detail Items
  const filteredDetailItems = useMemo(() => {
    return budgetItems.filter(item => {
      if (item.isGroupHeader) return false;
      if (selectedPosFilter !== 'ALL') {
        if (selectedPosFilter === 'Beban Sewa') {
          if (item.posType !== 'Beban Sewa' && item.posType !== 'Sewa Non AHG') return false;
        } else if (item.posType !== selectedPosFilter) {
          return false;
        }
      }
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase();
        return (
          item.code.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [budgetItems, selectedPosFilter, searchTerm]);

  // Summary Metrics for the filtered items in the active month
  const summaryMetrics = useMemo(() => {
    let totalPagu = 0;
    let totalTargetMonth = 0;
    let totalTargetYTD = 0;
    let totalRealizationMonth = 0;
    let totalRealizationYTD = 0;
    let filledCount = 0;

    filteredDetailItems.forEach(item => {
      totalPagu += item.budgetAnnual || 0;
      totalTargetMonth += item.budgetMonthly?.[selectedMonth] || 0;
      
      for (let m = 0; m <= selectedMonth; m++) {
        totalTargetYTD += item.budgetMonthly?.[m] || 0;
      }

      // Use local value for active month if modified, otherwise from state
      const currentMonthVal = localMonthValues[item.id] !== undefined 
        ? localMonthValues[item.id] 
        : (item.realizationMonthly?.[selectedMonth] || 0);

      if (currentMonthVal > 0) filledCount++;
      totalRealizationMonth += currentMonthVal;

      for (let m = 0; m < selectedMonth; m++) {
        totalRealizationYTD += item.realizationMonthly?.[m] || 0;
      }
      totalRealizationYTD += currentMonthVal;
    });

    const sisaPagu = totalPagu - totalRealizationYTD;
    const penyerapanPaguPct = totalPagu > 0 ? (totalRealizationYTD / totalPagu) * 100 : 0;
    const penyerapanTargetPct = totalTargetYTD > 0 ? (totalRealizationYTD / totalTargetYTD) * 100 : 0;

    return {
      totalPagu,
      totalTargetMonth,
      totalTargetYTD,
      totalRealizationMonth,
      totalRealizationYTD,
      sisaPagu,
      penyerapanPaguPct,
      penyerapanTargetPct,
      filledCount,
      totalCount: filteredDetailItems.length
    };
  }, [filteredDetailItems, selectedMonth, localMonthValues]);

  // Handle single month input change
  const handleSingleMonthInputChange = (itemId: string, rawVal: string) => {
    const num = parseNumberString(rawVal);
    setLocalMonthValues(prev => ({
      ...prev,
      [itemId]: num
    }));
    setDirtyItemIds(prev => new Set(prev).add(itemId));
  };

  // Handle single matrix input change
  const handleMatrixInputChange = (itemId: string, monthIdx: number, rawVal: string) => {
    const num = parseNumberString(rawVal);
    setLocalMatrixValues(prev => {
      const current = prev[itemId] ? [...prev[itemId]] : Array(12).fill(0);
      current[monthIdx] = num;
      return {
        ...prev,
        [itemId]: current
      };
    });
    setDirtyItemIds(prev => new Set(prev).add(itemId));
  };

  // Save Single Item (Single Month Mode)
  const handleSaveSingleItem = (item: BudgetItem) => {
    const val = localMonthValues[item.id] !== undefined 
      ? localMonthValues[item.id] 
      : (item.realizationMonthly?.[selectedMonth] || 0);
    
    updateRealization(item.id, selectedMonth, val);
    
    setDirtyItemIds(prev => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });

    showToast(`Realisasi ${item.name} (${MONTH_NAMES[selectedMonth]}) berhasil disimpan.`);
  };

  // Save All Changes (Batch Save for Single Month Mode)
  const handleSaveAllSingleMonth = () => {
    const updates: { id: string; monthIndex: number; amount: number }[] = [];
    
    dirtyItemIds.forEach(id => {
      if (localMonthValues[id] !== undefined) {
        updates.push({
          id,
          monthIndex: selectedMonth,
          amount: localMonthValues[id]
        });
      }
    });

    if (updates.length === 0) {
      showToast('Tidak ada perubahan yang perlu disimpan.', 'info');
      return;
    }

    updateBatchRealizations(updates);
    setDirtyItemIds(new Set());
    showToast(`Berhasil menyimpan ${updates.length} nilai realisasi untuk ${MONTH_NAMES[selectedMonth]} ${selectedYear}.`);
  };

  // Save All Changes (Batch Save for Full Matrix Mode)
  const handleSaveAllMatrix = () => {
    const updates: { id: string; monthlyValues: number[] }[] = [];
    
    dirtyItemIds.forEach(id => {
      if (localMatrixValues[id]) {
        updates.push({
          id,
          monthlyValues: localMatrixValues[id]
        });
      }
    });

    if (updates.length === 0) {
      showToast('Tidak ada perubahan matriks yang perlu disimpan.', 'info');
      return;
    }

    updateBatchAccountRealizations(updates);
    setDirtyItemIds(new Set());
    showToast(`Berhasil menyimpan matriks 12 bulan untuk ${updates.length} akun.`);
  };

  // Quick Action: Copy Target to Realization for this Month
  const handleCopyTargetToRealization = (onlyEmpty: boolean = false) => {
    const newLocal = { ...localMonthValues };
    let count = 0;

    filteredDetailItems.forEach(item => {
      const targetVal = item.budgetMonthly?.[selectedMonth] || 0;
      const currentVal = newLocal[item.id] || 0;

      if (!onlyEmpty || currentVal === 0) {
        if (targetVal > 0) {
          newLocal[item.id] = targetVal;
          dirtyItemIds.add(item.id);
          count++;
        }
      }
    });

    setLocalMonthValues(newLocal);
    setDirtyItemIds(new Set(dirtyItemIds));
    showToast(`Menyalin target anggaran ke realisasi untuk ${count} akun. Klik "Simpan Semua" untuk menyimpan.`);
  };

  // Quick Action: Reset Active Month to Rp 0
  const handleResetActiveMonthToZero = () => {
    if (!confirm(`Reset seluruh realisasi bulan ${MONTH_NAMES[selectedMonth]} ${selectedYear} ke Rp 0 untuk ${filteredDetailItems.length} akun yang difilter?`)) {
      return;
    }

    const newLocal = { ...localMonthValues };
    filteredDetailItems.forEach(item => {
      newLocal[item.id] = 0;
      dirtyItemIds.add(item.id);
    });

    setLocalMonthValues(newLocal);
    setDirtyItemIds(new Set(dirtyItemIds));
    showToast(`Realisasi bulan ${MONTH_NAMES[selectedMonth]} diset ke Rp 0. Klik "Simpan Semua" untuk menerapkan.`);
  };

  // Open 12-Month Modal
  const handleOpen12MonthModal = (item: BudgetItem) => {
    setModalItem(item);
    const existing = item.realizationMonthly || Array(12).fill(0);
    setModalMonthlyValues([...existing]);
  };

  // Save 12-Month Modal
  const handleSave12MonthModal = () => {
    if (!modalItem) return;
    updateAccountMonthlyRealization(modalItem.id, modalMonthlyValues);
    
    // update local state
    setLocalMonthValues(prev => ({
      ...prev,
      [modalItem.id]: modalMonthlyValues[selectedMonth] || 0
    }));
    setLocalMatrixValues(prev => ({
      ...prev,
      [modalItem.id]: [...modalMonthlyValues]
    }));

    showToast(`Realisasi 12 bulan untuk ${modalItem.name} berhasil disimpan.`);
    setModalItem(null);
  };

  // Quick Form Submit
  const handleQuickFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickFormAccountId) {
      alert('Pilih akun GL terlebih dahulu.');
      return;
    }

    const amount = parseNumberString(quickFormAmount);
    if (isNaN(amount)) {
      alert('Nominal realisasi tidak valid.');
      return;
    }

    const targetAccount = budgetItems.find(i => i.id === quickFormAccountId);
    if (!targetAccount) return;

    let finalAmount = amount;
    if (quickFormMode === 'add') {
      const currentVal = targetAccount.realizationMonthly?.[quickFormMonth] || 0;
      finalAmount = currentVal + amount;
    }

    updateRealization(quickFormAccountId, quickFormMonth, finalAmount);
    
    // Update local state if it matches current view
    if (quickFormMonth === selectedMonth) {
      setLocalMonthValues(prev => ({
        ...prev,
        [quickFormAccountId]: finalAmount
      }));
    }

    showToast(
      `Realisasi ${targetAccount.name} (${MONTH_NAMES[quickFormMonth]}) berhasil ${quickFormMode === 'add' ? 'ditambahkan' : 'diupdate'}: ${formatRupiah(finalAmount)}`
    );

    setQuickFormAmount('');
    setQuickFormNote('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium transition-all transform animate-in slide-in-from-bottom duration-300 ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-900/95 text-emerald-100 border-emerald-700' 
            : toastMessage.type === 'warning' 
            ? 'bg-amber-900/95 text-amber-100 border-amber-700' 
            : 'bg-slate-900/95 text-slate-100 border-slate-700'
        }`}>
          {toastMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toastMessage.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />}
          {toastMessage.type === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Banner & Mode Switcher */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
              <Edit3 className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Input Realisasi Anggaran Manual
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Tahun {selectedYear}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Entri dan perbarui nilai realisasi belanja akun GL secara langsung per bulan, matriks tahunan, atau transaksi cepat.
          </p>
        </div>

        {/* View Mode Buttons */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start md:self-auto">
          <button
            type="button"
            id="btn-mode-single-month"
            onClick={() => setActiveMode('single_month')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeMode === 'single_month'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Entri Per Bulan</span>
          </button>

          <button
            type="button"
            id="btn-mode-full-matrix"
            onClick={() => setActiveMode('full_matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeMode === 'full_matrix'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Matriks 12 Bulan</span>
          </button>

          <button
            type="button"
            id="btn-mode-quick-form"
            onClick={() => setActiveMode('quick_form')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeMode === 'quick_form'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Form Transaksi Cepat</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-medium text-slate-400 block">Pagu Anggaran ({selectedYear})</span>
          <span className="text-sm sm:text-base font-bold text-slate-900 font-mono">
            {formatRupiahShort(summaryMetrics.totalPagu)}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-medium text-slate-400 block">
            Target {MONTH_SHORT_NAMES[selectedMonth]}
          </span>
          <span className="text-sm sm:text-base font-bold text-slate-700 font-mono">
            {formatRupiahShort(summaryMetrics.totalTargetMonth)}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-blue-100 bg-blue-50/20 shadow-xs">
          <span className="text-[11px] font-medium text-blue-600 block">
            Realisasi {MONTH_SHORT_NAMES[selectedMonth]}
          </span>
          <span className="text-sm sm:text-base font-bold text-blue-700 font-mono">
            {formatRupiahShort(summaryMetrics.totalRealizationMonth)}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/20 shadow-xs">
          <span className="text-[11px] font-medium text-emerald-600 block">
            Realisasi s/d {MONTH_SHORT_NAMES[selectedMonth]}
          </span>
          <span className="text-sm sm:text-base font-bold text-emerald-700 font-mono">
            {formatRupiahShort(summaryMetrics.totalRealizationYTD)}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-medium text-slate-400 block">Sisa Pagu Anggaran</span>
          <span className={`text-sm sm:text-base font-bold font-mono ${
            summaryMetrics.sisaPagu < 0 ? 'text-rose-600' : 'text-slate-800'
          }`}>
            {formatRupiahShort(summaryMetrics.sisaPagu)}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-medium text-slate-400 block">% Serap Total Pagu</span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm sm:text-base font-bold text-indigo-600">
              {formatPercent(summaryMetrics.penyerapanPaguPct, 1)}
            </span>
            <span className="text-[10px] text-slate-400 font-normal">
              ({summaryMetrics.filledCount}/{summaryMetrics.totalCount} terisi)
            </span>
          </div>
        </div>
      </div>

      {/* MODE 1: ENTRI PER BULAN (FAST SINGLE MONTH ENTRY) */}
      {activeMode === 'single_month' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Select Month */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
                <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-slate-500 font-medium">Bulan Realisasi:</span>
                <select
                  id="select-active-input-month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx} value={idx}>
                      {name} ({idx + 1})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter POS */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <select
                  id="select-pos-filter"
                  value={selectedPosFilter}
                  onChange={(e) => setSelectedPosFilter(e.target.value)}
                  className="bg-transparent text-slate-700 focus:outline-none cursor-pointer font-medium"
                >
                  {POS_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Box */}
              <div className="relative min-w-[200px] flex-1 sm:flex-none">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  id="input-search-realization"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari akun GL / uraian..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Quick Actions & Batch Save */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                id="btn-copy-target-month"
                onClick={() => handleCopyTargetToRealization(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                title="Salin nilai target bulan ini ke kolom realisasi"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Salin dari Target</span>
              </button>

              <button
                type="button"
                id="btn-reset-month-zero"
                onClick={handleResetActiveMonthToZero}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-medium transition-colors cursor-pointer"
                title="Kosongkan nilai realisasi bulan ini (Rp 0)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Rp 0</span>
              </button>

              <button
                type="button"
                id="btn-save-all-single-month"
                onClick={handleSaveAllSingleMonth}
                disabled={dirtyItemIds.size === 0}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer ${
                  dirtyItemIds.size > 0
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Semua</span>
                {dirtyItemIds.size > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-blue-700 text-white rounded-full text-[10px]">
                    {dirtyItemIds.size}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Single Month Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-slate-200 border-b border-slate-800">
                    <th className="py-3 px-3 w-10 text-center">No</th>
                    <th className="py-3 px-3 w-28">Kode GL</th>
                    <th className="py-3 px-3 min-w-[220px]">Uraian Akun Anggaran</th>
                    <th className="py-3 px-3 w-24">POS</th>
                    <th className="py-3 px-3 text-right">Pagu Tahunan</th>
                    <th className="py-3 px-3 text-right">Target {MONTH_SHORT_NAMES[selectedMonth]}</th>
                    <th className="py-3 px-3 text-right text-slate-400">Realisasi s/d M-1</th>
                    <th className="py-3 px-3 text-right bg-blue-950 text-blue-200 min-w-[180px]">
                      Realisasi {MONTH_NAMES[selectedMonth]} (Rp)
                    </th>
                    <th className="py-3 px-3 text-right text-emerald-300">Total s/d {MONTH_SHORT_NAMES[selectedMonth]}</th>
                    <th className="py-3 px-3 text-right text-amber-300">Sisa Pagu</th>
                    <th className="py-3 px-3 text-center w-20">% Serap</th>
                    <th className="py-3 px-3 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDetailItems.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-8 text-center text-slate-400">
                        Tidak ada akun anggaran yang cocok dengan filter atau pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredDetailItems.map((item, idx) => {
                      const currentMonthInput = localMonthValues[item.id] !== undefined
                        ? localMonthValues[item.id]
                        : (item.realizationMonthly?.[selectedMonth] || 0);

                      let prevMonthsReal = 0;
                      for (let m = 0; m < selectedMonth; m++) {
                        prevMonthsReal += item.realizationMonthly?.[m] || 0;
                      }

                      const newTotalYTD = prevMonthsReal + currentMonthInput;
                      const newSisa = (item.budgetAnnual || 0) - newTotalYTD;
                      const newSerapPct = (item.budgetAnnual || 0) > 0 ? (newTotalYTD / item.budgetAnnual) * 100 : 0;
                      const isDirty = dirtyItemIds.has(item.id);
                      const targetThisMonth = item.budgetMonthly?.[selectedMonth] || 0;

                      return (
                        <tr 
                          key={item.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isDirty ? 'bg-amber-50/40' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{item.code}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-slate-900">{item.name}</div>
                            <div className="text-[10px] text-slate-400">{item.category}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {item.posType}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700">
                            {formatRupiah(item.budgetAnnual)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                            {formatRupiah(targetThisMonth)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                            {formatRupiah(prevMonthsReal)}
                          </td>

                          {/* Editable Cell */}
                          <td className="py-2 px-3 bg-blue-50/30">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                id={`input-real-${item.id}`}
                                value={currentMonthInput ? currentMonthInput.toLocaleString('id-ID') : ''}
                                onChange={(e) => handleSingleMonthInputChange(item.id, e.target.value)}
                                placeholder="0"
                                className="w-full text-right py-1 px-2 text-xs font-mono font-bold bg-white border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-900"
                              />
                              {targetThisMonth > 0 && currentMonthInput === 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleSingleMonthInputChange(item.id, String(targetThisMonth))}
                                  title="Salin nilai target bulan ini"
                                  className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer shrink-0"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {formatRupiah(newTotalYTD)}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-mono font-medium ${
                            newSisa < 0 ? 'text-rose-600 font-bold' : 'text-slate-700'
                          }`}>
                            {formatRupiah(newSisa)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-medium">
                            <span className={`px-1.5 py-0.5 rounded text-[11px] ${
                              newSerapPct > 100 
                                ? 'bg-rose-100 text-rose-800 font-bold' 
                                : newSerapPct >= 80 
                                ? 'bg-emerald-100 text-emerald-800 font-semibold' 
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {formatPercent(newSerapPct, 1)}
                            </span>
                          </td>

                          {/* Row Actions */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {isDirty && (
                                <button
                                  type="button"
                                  onClick={() => handleSaveSingleItem(item)}
                                  title="Simpan baris ini"
                                  className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpen12MonthModal(item)}
                                title="Buka editor matriks 12 bulan akun ini"
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 transition-colors cursor-pointer"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: MATRIKS REALISASI 12 BULAN LENGKAP */}
      {activeMode === 'full_matrix' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Filter POS */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <select
                  id="select-matrix-pos-filter"
                  value={selectedPosFilter}
                  onChange={(e) => setSelectedPosFilter(e.target.value)}
                  className="bg-transparent text-slate-700 focus:outline-none cursor-pointer font-medium"
                >
                  {POS_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Box */}
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  id="input-matrix-search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari akun GL / uraian..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Batch Save Matrix */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-save-all-matrix"
                onClick={handleSaveAllMatrix}
                disabled={dirtyItemIds.size === 0}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer ${
                  dirtyItemIds.size > 0
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Matriks 12 Bulan</span>
                {dirtyItemIds.size > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-blue-700 text-white rounded-full text-[10px]">
                    {dirtyItemIds.size}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Full 12 Month Matrix Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-slate-200 border-b border-slate-800">
                    <th className="py-3 px-3 w-10 text-center sticky left-0 bg-slate-900 z-10">No</th>
                    <th className="py-3 px-3 w-28 sticky left-10 bg-slate-900 z-10">Kode GL</th>
                    <th className="py-3 px-3 min-w-[200px] sticky left-38 bg-slate-900 z-10">Uraian Akun</th>
                    <th className="py-3 px-3 text-right">Pagu 1 Thn</th>
                    {MONTH_SHORT_NAMES.map((m, idx) => (
                      <th 
                        key={m} 
                        className={`py-3 px-2 text-right min-w-[110px] ${
                          idx === selectedMonth ? 'bg-blue-900 text-amber-300 font-bold' : ''
                        }`}
                      >
                        {m}
                      </th>
                    ))}
                    <th className="py-3 px-3 text-right bg-slate-800 text-white min-w-[130px]">Total Realisasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDetailItems.map((item, idx) => {
                    const matrixVals = localMatrixValues[item.id] || item.realizationMonthly || Array(12).fill(0);
                    const totalAnnualReal = matrixVals.reduce((a, b) => a + (b || 0), 0);
                    const isDirty = dirtyItemIds.has(item.id);

                    return (
                      <tr 
                        key={item.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isDirty ? 'bg-amber-50/40' : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-center text-slate-400 font-mono sticky left-0 bg-white z-10">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono font-semibold text-slate-800 sticky left-10 bg-white z-10">{item.code}</td>
                        <td className="py-2 px-3 sticky left-38 bg-white z-10">
                          <div className="font-medium text-slate-900 truncate max-w-[200px]" title={item.name}>
                            {item.name}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-slate-700">
                          {formatRupiahShort(item.budgetAnnual)}
                        </td>

                        {/* 12 Month Input Cells */}
                        {MONTH_SHORT_NAMES.map((_, mIdx) => {
                          const val = matrixVals[mIdx] || 0;
                          return (
                            <td 
                              key={mIdx} 
                              className={`py-1 px-1.5 text-right ${
                                mIdx === selectedMonth ? 'bg-blue-50/40' : ''
                              }`}
                            >
                              <input
                                type="text"
                                value={val ? val.toLocaleString('id-ID') : ''}
                                onChange={(e) => handleMatrixInputChange(item.id, mIdx, e.target.value)}
                                placeholder="0"
                                className="w-full text-right py-1 px-1.5 text-[11px] font-mono bg-white border border-slate-200 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                          );
                        })}

                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 bg-slate-50">
                          {formatRupiah(totalAnnualReal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: FORM TRANSAKSI CEPAT PER AKUN */}
      {activeMode === 'quick_form' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Card */}
          <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-blue-600" />
                <span>Entri Transaksi Realisasi</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Pilih akun GL, tentukan bulan realisasi, dan masukkan nominal belanja.
              </p>
            </div>

            <form onSubmit={handleQuickFormSubmit} className="space-y-4">
              {/* Account Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Akun Anggaran / GL <span className="text-rose-500">*</span>
                </label>
                <select
                  id="select-quick-account"
                  value={quickFormAccountId}
                  onChange={(e) => setQuickFormAccountId(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-slate-50 focus:outline-none focus:border-blue-500 focus:bg-white font-mono"
                  required
                >
                  {budgetItems
                    .filter(i => !i.isGroupHeader)
                    .map(item => (
                      <option key={item.id} value={item.id}>
                        {item.code} - {item.name} ({item.posType})
                      </option>
                    ))}
                </select>
              </div>

              {/* Month Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bulan Realisasi <span className="text-rose-500">*</span>
                </label>
                <select
                  id="select-quick-month"
                  value={quickFormMonth}
                  onChange={(e) => setQuickFormMonth(Number(e.target.value))}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-slate-50 focus:outline-none focus:border-blue-500 focus:bg-white font-medium"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx} value={idx}>
                      {name} {selectedYear}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mode: Replace or Add */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Metode Input Nominal
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickFormMode('replace')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      quickFormMode === 'replace'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Ganti Nilai (Set)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickFormMode('add')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      quickFormMode === 'add'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    + Tambahkan (Add)
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nominal Realisasi (Rp) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    id="input-quick-amount"
                    value={quickFormAmount}
                    onChange={(e) => {
                      const num = parseNumberString(e.target.value);
                      setQuickFormAmount(num ? num.toLocaleString('id-ID') : e.target.value);
                    }}
                    placeholder="0"
                    className="w-full text-xs font-mono font-bold pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan / No. SPJ / Transaksi (Opsional)
                </label>
                <input
                  type="text"
                  value={quickFormNote}
                  onChange={(e) => setQuickFormNote(e.target.value)}
                  placeholder="Contoh: Realisasi SPJ Pelaksanaan Pemeliharaan..."
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="btn-submit-quick-form"
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Realisasi Transaksi</span>
              </button>
            </form>
          </div>

          {/* Account Detail Preview Card */}
          <div className="lg:col-span-2 space-y-4">
            {quickFormAccountId && (() => {
              const selectedAcc = budgetItems.find(i => i.id === quickFormAccountId);
              if (!selectedAcc) return null;

              const monthlyReal = selectedAcc.realizationMonthly || Array(12).fill(0);
              const monthlyTgt = selectedAcc.budgetMonthly || Array(12).fill(0);
              const totalReal = monthlyReal.reduce((a, b) => a + b, 0);
              const sisa = selectedAcc.budgetAnnual - totalReal;
              const pct = selectedAcc.budgetAnnual > 0 ? (totalReal / selectedAcc.budgetAnnual) * 100 : 0;

              return (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {selectedAcc.code}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">{selectedAcc.name}</h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{selectedAcc.category} &bull; {selectedAcc.posType}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block">Pagu Anggaran Tahunan</span>
                      <span className="font-bold text-sm text-slate-900 font-mono">{formatRupiah(selectedAcc.budgetAnnual)}</span>
                    </div>
                  </div>

                  {/* Summary Stat Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <span className="text-slate-400 block text-[11px]">Total Realisasi (1 Tahun)</span>
                      <span className="font-bold text-emerald-700 font-mono text-sm">{formatRupiah(totalReal)}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <span className="text-slate-400 block text-[11px]">Sisa Pagu Anggaran</span>
                      <span className={`font-bold font-mono text-sm ${sisa < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                        {formatRupiah(sisa)}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <span className="text-slate-400 block text-[11px]">% Penyerapan Pagu</span>
                      <span className="font-bold text-indigo-600 text-sm">{formatPercent(pct, 1)}</span>
                    </div>
                  </div>

                  {/* 12 Months Breakdown Card */}
                  <div>
                    <h5 className="text-xs font-bold text-slate-700 mb-2">Historis Realisasi 12 Bulan</h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                      {MONTH_NAMES.map((name, mIdx) => {
                        const tgt = monthlyTgt[mIdx] || 0;
                        const r = monthlyReal[mIdx] || 0;
                        const isCurrentSelected = mIdx === quickFormMonth;

                        return (
                          <div 
                            key={mIdx}
                            className={`p-2.5 rounded-xl border text-xs transition-all ${
                              isCurrentSelected 
                                ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400' 
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="font-semibold text-slate-700">{name}</span>
                              {isCurrentSelected && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-600 text-white">
                                  Aktif
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">Target: {formatRupiahShort(tgt)}</div>
                            <div className="font-bold font-mono text-blue-700 text-xs mt-0.5">
                              {r > 0 ? formatRupiahShort(r) : '-'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL 12 BULAN PER AKUN */}
      {modalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                    {modalItem.code}
                  </span>
                  <h3 className="font-bold text-base text-slate-900">{modalItem.name}</h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {modalItem.category} &bull; Pagu Tahunan: <span className="font-bold text-slate-700">{formatRupiah(modalItem.budgetAnnual)}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Quick Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium">Aksi Cepat:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const tgts = modalItem.budgetMonthly || Array(12).fill(0);
                    setModalMonthlyValues([...tgts]);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium cursor-pointer"
                >
                  Salin dari Target Bulanan
                </button>
                <button
                  type="button"
                  onClick={() => setModalMonthlyValues(Array(12).fill(0))}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-medium cursor-pointer"
                >
                  Kosongkan (0)
                </button>
              </div>
            </div>

            {/* 12 Months Input Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[50vh] overflow-y-auto p-1">
              {MONTH_NAMES.map((name, mIdx) => {
                const targetVal = modalItem.budgetMonthly?.[mIdx] || 0;
                const currentVal = modalMonthlyValues[mIdx] || 0;

                return (
                  <div key={mIdx} className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200 text-xs">
                    <div className="flex items-center justify-between text-slate-600 font-semibold mb-1">
                      <span>{name}</span>
                      <span className="text-[10px] text-slate-400">Tgt: {formatRupiahShort(targetVal)}</span>
                    </div>
                    <input
                      type="text"
                      value={currentVal ? currentVal.toLocaleString('id-ID') : ''}
                      onChange={(e) => {
                        const num = parseNumberString(e.target.value);
                        const next = [...modalMonthlyValues];
                        next[mIdx] = num;
                        setModalMonthlyValues(next);
                      }}
                      placeholder="0"
                      className="w-full text-right py-1 px-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500"
                    />
                  </div>
                );
              })}
            </div>

            {/* Modal Footer Summary & Save */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div>
                <span className="text-[11px] text-slate-400 block">Total Realisasi 1 Tahun</span>
                <span className="font-bold text-sm font-mono text-blue-700">
                  {formatRupiah(modalMonthlyValues.reduce((a, b) => a + (b || 0), 0))}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSave12MonthModal}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
