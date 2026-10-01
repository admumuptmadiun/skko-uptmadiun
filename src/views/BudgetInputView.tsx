import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Check, 
  SlidersHorizontal, 
  DollarSign, 
  ArrowDownUp,
  FileSpreadsheet,
  AlertCircle,
  AlertTriangle,
  Lock,
  RotateCcw,
  CheckSquare,
  Square,
  MinusSquare
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BudgetItem, PosType } from '../types';
import { formatRupiah, formatRupiahShort, MONTH_NAMES, MONTH_SHORT_NAMES } from '../utils/formatters';
import { getChildAccountsForHeader } from '../utils/budgetCalculations';

export const BudgetInputView: React.FC = () => {
  const { 
    budgetItems, 
    addBudgetItem, 
    updateBudgetItem, 
    deleteBudgetItem, 
    deleteMultipleBudgetItems,
    resetAllValuesToZero,
    selectedYear 
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosFilter, setSelectedPosFilter] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);

  // Selection state for multi-delete and bulk actions
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Modals for confirmation
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<BudgetItem | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isResetZeroModalOpen, setIsResetZeroModalOpen] = useState(false);

  // Bulk adjustment state (%)
  const [isBulkAdjustOpen, setIsBulkAdjustOpen] = useState(false);
  const [bulkPercent, setBulkPercent] = useState<number>(5);
  const [bulkTargetPos, setBulkTargetPos] = useState<string>('ALL');

  // New item form state
  const [formData, setFormData] = useState<{
    code: string;
    name: string;
    posType: PosType;
    category: string;
    monthlyValues: number[];
    notes: string;
  }>({
    code: '',
    name: '',
    posType: 'Pos 53',
    category: 'Beban Pemeliharaan',
    monthlyValues: Array(12).fill(0),
    notes: ''
  });

  const POS_OPTIONS: { type: PosType; label: string; defaultCategory: string }[] = [
    { type: 'Pos 52', label: 'Pos 52 - Beban Kepegawaian', defaultCategory: 'Beban Kepegawaian dalam Bentuk Kompensasi' },
    { type: 'Pos 53', label: 'Pos 53 - Beban Pemeliharaan', defaultCategory: 'Pemakaian material' },
    { type: 'Pos 54', label: 'Pos 54 - Biaya Administrasi dan Umum', defaultCategory: 'Biaya Administrasi dan Umum' },
    { type: 'Beban Sewa', label: 'Beban Sewa', defaultCategory: 'Beban Sewa' },
    { type: 'Pos 72', label: 'Pos 72 - Beban Pensiun', defaultCategory: 'Beban Pensiun' },
    { type: 'Lainnya', label: 'Lainnya / Beban Usaha', defaultCategory: 'Beban Usaha Lainnya' }
  ];

  // Filtered items
  const filteredItems = useMemo(() => {
    return budgetItems.filter(item => {
      if (selectedPosFilter !== 'ALL') {
        if (selectedPosFilter === 'Beban Sewa') {
          if (item.posType !== 'Beban Sewa' && item.posType !== 'Sewa Non AHG') return false;
        } else if (item.posType !== selectedPosFilter) {
          return false;
        }
      }
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchName = item.name.toLowerCase().includes(query);
        const matchCode = item.code.toLowerCase().includes(query);
        const matchCat = item.category.toLowerCase().includes(query);
        return matchName || matchCode || matchCat;
      }
      return true;
    });
  }, [budgetItems, selectedPosFilter, searchTerm]);

  // Detail (non-header) items currently visible
  const visibleDetailItems = useMemo(() => {
    return filteredItems.filter(item => !item.isGroupHeader);
  }, [filteredItems]);

  // Aggregate totals
  const totalFilteredBudget = useMemo(() => {
    return filteredItems
      .filter(i => !i.isGroupHeader)
      .reduce((sum, item) => sum + (item.budgetAnnual || 0), 0);
  }, [filteredItems]);

  // Checkbox selection helpers
  const allVisibleSelected = visibleDetailItems.length > 0 && visibleDetailItems.every(i => selectedItemIds.includes(i.id));
  const someVisibleSelected不易 = visibleDetailItems.some(i => selectedItemIds.includes(i.id)) && !allVisibleSelected;

  const handleToggleSelect = (id不易: string) => {
    setSelectedItemIds(prev => 
      prev.includes(id不易) ? prev.filter(x => x !== id不易) : [...prev, id不易]
    );
  };

  const handleToggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(visibleDetailItems.map(i => i.id));
      setSelectedItemIds(prev => prev.filter(id => !visibleIds.has(id)));
    } else {
      const visibleIds = visibleDetailItems.map(i => i.id);
      setSelectedItemIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleOpenAdd = () => {
    setFormData({
      code: '',
      name: '',
      posType: 'Pos 53',
      category: 'Beban Pemeliharaan',
      monthlyValues: Array(12).fill(0),
      notes: ''
    });
    setIsAddModalOpen(true);
  };

  const handleSaveNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Mohon isi nama / uraian anggaran');
      return;
    }

    const totalAnnual = formData.monthlyValues.reduce((a, b) => a + (Number(b) || 0), 0);

    addBudgetItem({
      code: formData.code.trim() || `ACC_${Date.now().toString().slice(-6)}`,
      name: formData.name.trim(),
      pos: POS_OPTIONS.find(p => p.type === formData.posType)?.label || formData.posType,
      posType: formData.posType,
      category: formData.category.trim() || 'Umum',
      isGroupHeader: false,
      level: 2,
      budgetAnnual: totalAnnual,
      budgetMonthly: formData.monthlyValues,
      realizationMonthly: Array(12).fill(0),
      notes: formData.notes
    });

    setIsAddModalOpen(false);
  };

  const handleOpenEdit不易 = (item: BudgetItem) => {
    setEditingItem(JSON.parse(JSON.stringify(item)));
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    // Recalculate annual from manual monthly values
    const totalMonth = editingItem.budgetMonthly.reduce((a, b) => a + (Number(b) || 0), 0);
    const finalAnnual = editingItem.isGroupHeader ? editingItem.budgetAnnual : totalMonth;

    updateBudgetItem(editingItem.id, {
      code: editingItem.code,
      name: editingItem.name,
      posType: editingItem.posType,
      category: editingItem.category,
      budgetAnnual: finalAnnual,
      budgetMonthly: editingItem.budgetMonthly,
      notes: editingItem.notes
    });

    setEditingItem(null);
  };

  const handleConfirmSingleDelete = () => {
    if (!deleteConfirmTarget) return;
    deleteBudgetItem(deleteConfirmTarget.id);
    setSelectedItemIds(prev => prev.filter(id => id !== deleteConfirmTarget.id));
    setDeleteConfirmTarget(null);
  };

  const handleConfirmBulkDelete = () => {
    if (selectedItemIds.length === 0) return;
    deleteMultipleBudgetItems(selectedItemIds);
    setSelectedItemIds([]);
    setIsBulkDeleteModalOpen(false);
  };

  const handleBulkZeroSelected = () => {
    if (selectedItemIds.length === 0) return;
    selectedItemIds.forEach(id => {
      updateBudgetItem(id, {
        budgetAnnual: 0,
        budgetMonthly: Array(12).fill(0)
      });
    });
    alert(`Berhasil mengosongkan nilai alokasi anggaran untuk ${selectedItemIds.length} akun terpilih.`);
  };

  const handleConfirmResetAllToZero = () => {
    resetAllValuesToZero();
    setIsResetZeroModalOpen(false);
  };

  const handleBulkAdjust = (increase: boolean) => {
    const factor = 1 + (increase ? bulkPercent : -bulkPercent) / 100;
    
    budgetItems.forEach(item => {
      if (item.isGroupHeader) return;
      if (bulkTargetPos !== 'ALL' && item.posType !== bulkTargetPos) return;

      const newMonthly = item.budgetMonthly.map(m => Math.round(m * factor));
      const newAnnual加以 = newMonthly.reduce((a, b) => a + b, 0);
      updateBudgetItem(item.id, { budgetAnnual: newAnnual加以, budgetMonthly: newMonthly });
    });

    setIsBulkAdjustOpen(false);
    alert(`Berhasil menyesuaikan alokasi bulanan & pagu anggaran untuk ${bulkTargetPos} sebesar ${increase ? '+' : '-'}${bulkPercent}%`);
  };

  const newFormAnnualTotal = formData.monthlyValues.reduce((a, b) => a + (Number(b) || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Manajemen & Input Data Anggaran (SKKO)</h1>
              <p className="text-xs text-slate-500">Input alokasi bulanan manual, kelola/hapus akun anggaran, dan monitoring pagu tahunan</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Reset All Values to Zero */}
          <button type="button"
            onClick={() => setIsResetZeroModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Kosongkan seluruh nilai anggaran dan realisasi menjadi Rp 0"
          >
            <RotateCcw className="w-4 h-4 text-rose-600" />
            <span>Reset Semua Nilai ke 0</span>
          </button>

          <button type="button"
            onClick={() => setIsBulkAdjustOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            <span>Penyesuaian Masal (%)</span>
          </button>

          <button type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Akun Anggaran</span>
          </button>
        </div>
      </div>

      {/* Floating / Multi-Select Action Bar */}
      {selectedItemIds.length > 0 && (
        <div className="bg-slate-900 text-white rounded-xl p-3.5 px-5 shadow-lg border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs text-white">
              {selectedItemIds.length}
            </span>
            <span className="text-xs font-medium text-slate-200">
              <strong className="text-white font-bold">{selectedItemIds.length}</strong> akun anggaran terpilih
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleBulkZeroSelected}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
            >
              Kosongkan Nilai (Rp 0)
            </button>
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus {selectedItemIds.length} Akun</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedItemIds([])}
              className="px-2.5 py-1.5 text-slate-400 hover:text-white text-xs"
            >
              Batal Pilih
            </button>
          </div>
        </div>
      )}

      {/* Filter and Control Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari kode akun, nama, atau sub-pos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
            {searchTerm && (
              <button type="button" 
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* POS Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            <button type="button"
              onClick={() => setSelectedPosFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedPosFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua POS ({budgetItems.length})
            </button>
            {POS_OPTIONS.map(pos => (
              <button type="button"
                key={pos.type}
                onClick={() => setSelectedPosFilter(pos.type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedPosFilter === pos.type
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {pos.type}
              </button>
            ))}
          </div>
        </div>

        {/* Stats strip */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Menampilkan <strong className="text-slate-800">{filteredItems.length}</strong> akun anggaran</span>
          <span>Total Pagu Filter: <strong className="text-blue-600 font-mono text-sm">{formatRupiah(totalFilteredBudget)}</strong></span>
        </div>
      </div>

      {/* Main Budget Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-900 text-white uppercase tracking-wider text-[11px] font-semibold sticky top-0">
              <tr>
                <th className="py-3.5 px-3 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleToggleSelectAllVisible}
                    className="text-slate-300 hover:text-white p-0.5 rounded cursor-pointer"
                    title={allVisibleSelected ? 'Batalkan pilihan semua' : 'Pilih semua akun rincian'}
                  >
                    {allVisibleSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-400" />
                    ) : someVisibleSelected不易 ? (
                      <MinusSquare className="w-4 h-4 text-blue-300" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-3 w-10 text-center">No</th>
                <th className="py-3.5 px-4 w-32">Kode GL</th>
                <th className="py-3.5 px-4 min-w-[220px]">Uraian Akun Anggaran</th>
                <th className="py-3.5 px-4 w-28">Kelompok Pos</th>
                <th className="py-3.5 px-4 text-right min-w-[160px]">
                  <div className="flex items-center justify-end gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>Pagu Tahunan ({selectedYear})</span>
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center min-w-[200px]">Alokasi Bulanan (Jan - Des)</th>
                <th className="py-3.5 px-4 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    Tidak ada akun anggaran yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const isHeader = item.isGroupHeader;
                  const isSelected = selectedItemIds.includes(item.id);

                  if (isHeader) {
                    const childAccounts = getChildAccountsForHeader(item, budgetItems);
                    const isPosLevel = item.level === 0;

                    return (
                      <tr 
                        key={item.id} 
                        className={`font-bold transition-colors ${
                          isPosLevel 
                            ? 'bg-slate-200/90 text-slate-900 border-y-2 border-slate-300' 
                            : 'bg-slate-100/90 text-slate-800 border-y border-slate-200'
                        }`}
                      >
                        <td className="py-3 px-3 text-center">
                          {/* Headers are not selectable */}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-500">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-600">
                          {item.code || '-'}
                        </td>
                        <td className="py-3 px-4" colSpan={2}>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
                              isPosLevel 
                                ? 'bg-slate-800 text-white' 
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}>
                              ∑ Sub-Total
                            </span>
                            <span className="uppercase tracking-wide font-bold">{item.name}</span>
                            <span className="text-[10px] font-normal text-slate-500">
                              ({childAccounts.length} akun dibawahnya)
                            </span>
                          </div>
                        </td>
                        <td className={`py-3 px-4 text-right font-mono font-black ${item.budgetAnnual < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                          <div 
                            className="inline-flex items-center justify-end gap-1"
                            title="Nilai sub-total terkunci: dihitung otomatis dari akumulasi alokasi akun di bawahnya"
                          >
                            <Lock className="w-3 h-3 text-slate-400" />
                            <span>{formatRupiah(item.budgetAnnual)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span 
                            className="inline-block text-[10px] font-mono font-semibold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded border border-slate-300/50" 
                            title="Akumulasi alokasi bulanan seluruh akun di bawah sub-total ini"
                          >
                            ∑ Alokasi: {formatRupiahShort(item.budgetAnnual)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button type="button"
                              onClick={() => handleOpenEdit不易(item)}
                              title="Lihat / Edit Uraian Header Sub-Total"
                              className="p-1 text-slate-500 hover:text-blue-600 rounded transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button type="button"
                              onClick={() => setDeleteConfirmTarget(item)}
                              title="Hapus Header Sub-Total ini"
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  const allocatedSum = item.budgetMonthly.reduce((a, b) => a + (Number(b) || 0), 0);

                  return (
                    <tr 
                      key={item.id} 
                      className={`transition-colors group ${
                        isSelected ? 'bg-blue-50/70 hover:bg-blue-50' : 'hover:bg-blue-50/40'
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelect(item.id)}
                          className="text-slate-400 hover:text-blue-600 p-0.5 rounded cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-600 text-xs">
                        {item.code}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        <div className="truncate max-w-sm" title={item.name}>{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{item.category}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {item.posType}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-bold ${item.budgetAnnual < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                        <div 
                          onClick={() => handleOpenEdit不易(item)}
                          className="cursor-pointer inline-flex items-center justify-end gap-1.5 group/val hover:text-blue-600"
                          title="Pagu tahunan terkunci: nilai berasal dari total 12 bulan alokasi. Klik untuk ubah alokasi bulanan."
                        >
                          <Lock className="w-3 h-3 text-slate-300 group-hover/val:text-blue-500" />
                          <span className="group-hover/val:underline">{formatRupiah(item.budgetAnnual)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button type="button"
                          onClick={() => handleOpenEdit不易(item)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-medium text-slate-700 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 rounded-md border border-slate-200 transition-colors cursor-pointer"
                          title="Klik untuk input alokasi bulanan secara manual (12 Bulan)"
                        >
                          <span>Total 12 Bln: {formatRupiahShort(allocatedSum)}</span>
                          <Edit2 className="w-3 h-3 text-slate-400 hover:text-blue-600" />
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button type="button"
                            onClick={() => handleOpenEdit不易(item)}
                            title="Edit Rincian Akun & Alokasi Bulanan"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button type="button"
                            onClick={() => setDeleteConfirmTarget(item)}
                            title="Hapus Akun Anggaran ini"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* MODAL: Tambah Akun Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="sticky top-0 bg-slate-900 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base">Tambah Akun Anggaran Baru</h3>
              </div>
              <button type="button" 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewItem} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode Akun GL (10 Digit)</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 6106200700"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kelompok POS</label>
                  <select
                    value={formData.posType}
                    onChange={(e) => {
                      const pos = e.target.value as PosType;
                      const opt = POS_OPTIONS.find(p => p.type === pos);
                      setFormData({ 
                        ...formData, 
                        posType: pos,
                        category: opt?.defaultCategory || formData.category
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {POS_OPTIONS.map(p => (
                      <option key={p.type} value={p.type}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Uraian / Nama Akun Anggaran</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Beban Pemeliharaan Gardu Induk & Trafo"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sub-Kategori</label>
                  <input
                    type="text"
                    placeholder="Contoh: Jasa Borong"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Total Pagu Anggaran Tahunan: <span className="text-blue-600 font-normal">(Terhitung Otomatis dari 12 Bulan)</span>
                  </label>
                  <input
                    type="number"
                    disabled
                    value={newFormAnnualTotal}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-slate-800 text-right cursor-not-allowed"
                  />
                  <span className={`text-[11px] font-mono mt-0.5 block ${newFormAnnualTotal < 0 ? 'text-rose-600 font-bold' : 'text-blue-600'}`}>
                    {formatRupiah(newFormAnnualTotal)}
                  </span>
                </div>
              </div>

              {/* Monthly breakdown */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-slate-800">
                    Alokasi Anggaran Bulanan (Januari - Desember) — <span className="text-blue-600 font-normal">Isi Manual per Bulan</span>
                  </label>
                  <span className="text-slate-500 text-xs">
                    Total 12 Bulan: <strong className="font-mono text-slate-800">{formatRupiahShort(newFormAnnualTotal)}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {MONTH_SHORT_NAMES.map((m, idx) => (
                    <div key={idx}>
                      <span className="text-[10px] font-bold text-slate-600 block mb-0.5">{m}</span>
                      <input
                        type="number"
                        value={formData.monthlyValues[idx] || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          const newM = [...formData.monthlyValues];
                          newM[idx] = val;
                          setFormData({ 
                            ...formData, 
                            monthlyValues: newM
                          });
                        }}
                        className={`w-full px-2 py-1.5 border rounded font-mono text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-right ${
                          (formData.monthlyValues[idx] || 0) < 0 ? 'border-rose-300 text-rose-600 font-bold' : 'border-slate-300'
                        }`}
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan / Keterangan</label>
                <textarea
                  rows={2}
                  placeholder="Catatan justifikasi atau penyesuaian..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button type="button" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button type="submit"
                  className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer">
                  Simpan Akun Anggaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Akun Anggaran */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="sticky top-0 bg-slate-900 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base">Edit Data Anggaran Akun</h3>
              </div>
              <button type="button" 
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              {editingItem.isGroupHeader && (
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold text-xs block mb-0.5 text-blue-950">
                      Baris Sub-Total / Kelompok Anggaran
                    </strong>
                    <p className="text-[11px] leading-relaxed text-blue-800">
                      Nilai pagu tahunan dan alokasi bulanan pada baris sub-total ini dihitung secara otomatis dari akumulasi akun-akun rincian di bawahnya. Anda dapat mengedit kode akun dan nama uraian.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode Akun GL</label>
                  <input
                    type="text"
                    value={editingItem.code}
                    onChange={(e) => setEditingItem({ ...editingItem, code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kelompok POS</label>
                  <select
                    value={editingItem.posType}
                    onChange={(e) => setEditingItem({ ...editingItem, posType: e.target.value as PosType })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {POS_OPTIONS.map(p => (
                      <option key={p.type} value={p.type}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Uraian / Nama Akun Anggaran</label>
                <input
                  type="text"
                  required
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sub-Kategori</label>
                  <input
                    type="text"
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Pagu Anggaran Tahunan (Rp) {editingItem.isGroupHeader ? <span className="text-blue-600 font-normal">(Otomatis dari Akun Rincian)</span> : <span className="text-blue-600 font-normal">(Otomatis dari Total 12 Bulan)</span>}
                  </label>
                  <input
                    type="number"
                    disabled
                    value={editingItem.isGroupHeader ? editingItem.budgetAnnual : editingItem.budgetMonthly.reduce((a, b) => a + (Number(b) || 0), 0)}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-slate-800 text-right cursor-not-allowed"
                  />
                  <span className={`text-[11px] font-mono mt-0.5 block ${editingItem.budgetAnnual < 0 ? 'text-rose-600 font-bold' : 'text-blue-600'}`}>
                    {formatRupiah(editingItem.isGroupHeader ? editingItem.budgetAnnual : editingItem.budgetMonthly.reduce((a, b) => a + (Number(b) || 0), 0))}
                  </span>
                </div>
              </div>

              {/* Monthly breakdown */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-slate-800">
                    Alokasi Anggaran Bulanan (Januari - Desember) {editingItem.isGroupHeader ? <span className="text-blue-600 font-normal text-xs">(Otomatis dari Akun Rincian)</span> : <span className="text-blue-600 font-normal text-xs">— Isi Manual per Bulan</span>}
                  </label>
                  {!editingItem.isGroupHeader && (
                    <span className="text-slate-500 text-xs">
                      Total 12 Bulan: <strong className="font-mono text-slate-800">{formatRupiahShort(editingItem.budgetMonthly.reduce((a, b) => a + (Number(b) || 0), 0))}</strong>
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {MONTH_SHORT_NAMES.map((m, idx) => (
                    <div key={idx}>
                      <span className="text-[10px] font-bold text-slate-600 block mb-0.5">{m}</span>
                      <input
                        type="number"
                        disabled={editingItem.isGroupHeader}
                        value={editingItem.budgetMonthly[idx] || 0}
                        onChange={(e) => {
                          const val不易 = Number(e.target.value) || 0;
                          const newM = [...editingItem.budgetMonthly];
                          newM[idx] = val不易;
                          const newAnnual = newM.reduce((a, b) => a + b, 0);
                          setEditingItem({ 
                            ...editingItem, 
                            budgetMonthly: newM,
                            budgetAnnual: newAnnual
                          });
                        }}
                        className={`w-full px-2 py-1.5 border rounded font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500 text-right ${
                          editingItem.isGroupHeader
                            ? 'bg-slate-100/80 border-slate-200 text-slate-600 cursor-not-allowed'
                            : (editingItem.budgetMonthly[idx] || 0) < 0 
                              ? 'border-rose-300 text-rose-600 font-bold bg-white' 
                              : 'border-slate-300 bg-white'
                        }`}
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan</label>
                <textarea
                  rows={2}
                  value={editingItem.notes || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Modal Footer with Delete option */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const toDelete = editingItem;
                    setEditingItem(null);
                    setDeleteConfirmTarget(toDelete);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 hover:border-rose-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus Akun Ini</span>
                </button>

                <div className="flex items-center gap-2">
                  <button type="button" 
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Batal
                  </button>
                  <button type="submit"
                    className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer">
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Konfirmasi Hapus Akun Tunggal */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Konfirmasi Hapus Akun Anggaran</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Anda akan menghapus akun anggaran berikut dari sistem:
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Kode GL:</span>
                <span className="font-mono font-bold text-slate-800">{deleteConfirmTarget.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Akun:</span>
                <span className="font-semibold text-slate-800 text-right max-w-[200px] truncate">{deleteConfirmTarget.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kelompok:</span>
                <span className="font-medium text-slate-700">{deleteConfirmTarget.posType}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500">Pagu Tahunan:</span>
                <span className="font-mono font-bold text-blue-600">{formatRupiah(deleteConfirmTarget.budgetAnnual)}</span>
              </div>
            </div>

            <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 leading-relaxed">
              <strong>Catatan:</strong> Setelah akun dihapus, total pagu pada sub-total dan POS terkait akan dihitung ulang secara otomatis.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleDelete}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Akun</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Konfirmasi Hapus Masal (Multi Delete) */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Hapus {selectedItemIds.length} Akun Terpilih?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Seluruh akun yang dicentang akan dihapus secara permanen dari daftar anggaran.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 space-y-1">
              <p className="font-bold">Jumlah akun yang akan dihapus: {selectedItemIds.length} akun</p>
              <p className="text-[11px] text-rose-700">
                Akumulasi pagu tahunan dan subtotal seluruh POS akan disesuaikan kembali secara otomatis.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus {selectedItemIds.length} Akun</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Konfirmasi Reset Semua Nilai ke Nol (Rp 0) */}
      {isResetZeroModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-amber-100 text-amber-700 rounded-xl shrink-0">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Reset Semua Nilai Anggaran ke Rp 0</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Atur semua nilai pagu tahunan, alokasi bulanan (12 bulan), dan realisasi menjadi <strong>Rp 0</strong>.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-medium">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Struktur dan daftar akun anggaran tetap dipertahankan.</span>
              </div>
              <div className="flex items-center gap-2 text-blue-700 font-medium">
                <Check className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Semua 12 bulan alokasi & realisasi disetel menjadi 0.</span>
              </div>
              <div className="flex items-center gap-2 text-amber-700 font-medium">
                <Check className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Siap diisikan data anggaran baru sesuai kebutuhan.</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsResetZeroModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmResetAllToZero}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Ya, Reset Semua Nilai ke 0</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Penyesuaian Masal (%) */}
      {isBulkAdjustOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <SlidersHorizontal className="w-5 h-5 text-blue-600" />
                <h3>Penyesuaian Anggaran Masal (%)</h3>
              </div>
              <button type="button" 
                onClick={() => setIsBulkAdjustOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Sesuaikan seluruh alokasi bulanan dan pagu anggaran secara serentak berdasarkan persentase kenaikan atau efisiensi penghematan.
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Kelompok POS</label>
                <select
                  value={bulkTargetPos}
                  onChange={(e) => setBulkTargetPos(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="ALL">Semua POS Anggaran</option>
                  {POS_OPTIONS.map(p => (
                    <option key={p.type} value={p.type}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Besaran Persentase (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={bulkPercent}
                    onChange={(e) => setBulkPercent(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <span className="font-bold text-slate-600">%</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-2">
                <button type="button" 
                  onClick={() => handleBulkAdjust(false)}
                  className="px-3 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold rounded-lg border border-rose-200 cursor-pointer"
                >
                  Efisiensi (-{bulkPercent}%)
                </button>
                <button type="button" 
                  onClick={() => handleBulkAdjust(true)}
                  className="px-3 py-2.5 bg-blue-600 text-white hover:bg-blue-700 font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  Kenaikan (+{bulkPercent}%)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
