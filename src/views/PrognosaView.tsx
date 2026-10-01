import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Briefcase, 
  Wrench, 
  Building, 
  Car,
  ToggleLeft,
  ToggleRight,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AdditionalTransaction, PosType } from '../types';
import { 
  formatRupiah, 
  formatRupiahShort, 
  formatPercent, 
  MONTH_NAMES 
} from '../utils/formatters';

export const PrognosaView: React.FC = () => {
  const { 
    budgetItems, 
    additionalTransactions, 
    addAdditionalTransaction, 
    updateAdditionalTransaction, 
    deleteAdditionalTransaction,
    selectedYear, 
    selectedMonth 
  } = useApp();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AdditionalTransaction | null>(null);
  const [filterPos, setFilterPos] = useState<string>('ALL');

  const [formData, setFormData] = useState<{
    name: string;
    posType: PosType;
    category: string;
    amount: number;
    notes: string;
  }>({
    name: '',
    posType: 'Pos 53',
    category: 'Tenaga Alih Daya',
    amount: 50000000,
    notes: ''
  });

  // Calculate Prognosa figures
  const prognosaSummary = useMemo(() => {
    const nonHeaders = budgetItems.filter(i => !i.isGroupHeader);

    let totalPaguAnnual = 0;
    let totalRealMTD = 0;
    let remainingBudgetMonthly = 0;

    // Sum realization up to selected month, plus remaining budget for future months
    nonHeaders.forEach(item => {
      totalPaguAnnual += item.budgetAnnual || 0;
      for (let m = 0; m <= selectedMonth; m++) {
        totalRealMTD += (item.realizationMonthly?.[m] || 0);
      }
      for (let m = selectedMonth + 1; m < 12; m++) {
        remainingBudgetMonthly += (item.budgetMonthly[m] || 0);
      }
    });

    const activeAdditional = additionalTransactions.filter(t => t.isActive);
    const totalAdditional = activeAdditional.reduce((s, t) => s + (t.amount || 0), 0);

    // Total Prognosa = Realisasi MTD + Tambahan Transaksi + Estimasi Sisa Bulan
    const totalPrognosa = totalRealMTD + totalAdditional + remainingBudgetMonthly;
    const deviasiVsPagu = totalPaguAnnual - totalPrognosa;
    const optimasiPct = totalPaguAnnual > 0 ? (totalPrognosa / totalPaguAnnual) * 100 : 0;

    // Per POS Breakdown
    const posList: PosType[] = ['Pos 53', 'Pos 54', 'Beban Sewa', 'Pos 52', 'Pos 72'];
    const byPos = posList.map(pos => {
      const pItems = nonHeaders.filter(i => i.posType === pos || (pos === 'Beban Sewa' && i.posType === 'Sewa Non AHG'));
      let pAnnual = 0;
      let pRealMTD = 0;
      let pEstFuture = 0;

      pItems.forEach(i => {
        pAnnual += i.budgetAnnual || 0;
        for (let m = 0; m <= selectedMonth; m++) {
          pRealMTD += (i.realizationMonthly?.[m] || 0);
        }
        for (let m = selectedMonth + 1; m < 12; m++) {
          pEstFuture += (i.budgetMonthly[m] || 0);
        }
      });

      const pAdd = activeAdditional.filter(t => t.posType === pos || (pos === 'Beban Sewa' && t.posType === 'Sewa Non AHG')).reduce((s, t) => s + t.amount, 0);
      const pProg = pRealMTD + pAdd + pEstFuture;
      const pDev = pAnnual - pProg;

      return {
        pos,
        annual: pAnnual,
        realMTD: pRealMTD,
        additional: pAdd,
        future: pEstFuture,
        prognosa: pProg,
        deviasi: pDev,
        percentage: pAnnual > 0 ? (pProg / pAnnual) * 100 : 0
      };
    });

    return {
      totalPaguAnnual,
      totalRealMTD,
      totalAdditional,
      remainingBudgetMonthly,
      totalPrognosa,
      deviasiVsPagu,
      optimasiPct,
      byPos
    };
  }, [budgetItems, additionalTransactions, selectedMonth]);

  const filteredTransactions = useMemo(() => {
    if (filterPos === 'ALL') return additionalTransactions;
    return additionalTransactions.filter(t => t.posType === filterPos);
  }, [additionalTransactions, filterPos]);

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    addAdditionalTransaction({
      name: formData.name.trim(),
      posType: formData.posType,
      category: formData.category,
      amount: formData.amount,
      month: selectedMonth,
      year: selectedYear,
      notes: formData.notes,
      isActive: true
    });

    setIsAddModalOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    updateAdditionalTransaction(editingItem.id, editingItem);
    setEditingItem(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* View Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Prognosa Akhir Tahun & Tambahan Transaksi</h1>
            <p className="text-xs text-slate-500">
              Perhitungan estimasi penyerapan anggaran tahunan mencakup alih daya, jasa borong, dan komitmen beban
            </p>
          </div>
        </div>

        <button type="button"
          onClick={() => {
            setFormData({
              name: '',
              posType: 'Pos 53',
              category: 'Tenaga Alih Daya',
              amount: 50000000,
              notes: ''
            });
            setIsAddModalOpen(true);
          }}
          className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Komitmen Transaksi</span>
        </button>
      </div>

      {/* Prognosa KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pagu Anggaran ({selectedYear})</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {formatRupiahShort(prognosaSummary.totalPaguAnnual)}
          </div>
          <span className="text-xs text-slate-400 mt-1 block font-mono">
            {formatRupiah(prognosaSummary.totalPaguAnnual)}
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Realisasi SAP s/d {MONTH_NAMES[selectedMonth]}</span>
          <div className="text-2xl font-extrabold text-blue-600 mt-2">
            {formatRupiahShort(prognosaSummary.totalRealMTD)}
          </div>
          <span className="text-xs text-slate-400 mt-1 block font-mono">
            {formatRupiah(prognosaSummary.totalRealMTD)}
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tambahan Komitmen Transaksi</span>
          <div className="text-2xl font-extrabold text-rose-600 mt-2">
            +{formatRupiahShort(prognosaSummary.totalAdditional)}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            {additionalTransactions.filter(t => t.isActive).length} item komitmen aktif
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estimasi Prognosa Akhir Tahun</span>
          <div className="text-2xl font-extrabold text-indigo-600 mt-2">
            {formatRupiahShort(prognosaSummary.totalPrognosa)}
          </div>
          <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-100">
            <span className="text-slate-500">Estimasi Sisa Pagu:</span>
            <span className={`font-bold ${prognosaSummary.deviasiVsPagu >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatRupiahShort(prognosaSummary.deviasiVsPagu)}
            </span>
          </div>
        </div>
      </div>

      {/* POS Prognosa Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-bold text-sm text-slate-900">Rincian Prognosa Realisasi per Kelompok POS</h3>
          <p className="text-xs text-slate-500">Kalkulasi: Realisasi s/d Bulan Ini + Komitmen Tambahan + Rencana Sisa Bulan</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 font-mono">
            <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4 font-sans">Kelompok POS</th>
                <th className="py-3 px-4 text-right">Pagu SKKO ({selectedYear})</th>
                <th className="py-3 px-4 text-right">Real s/d {MONTH_NAMES[selectedMonth]}</th>
                <th className="py-3 px-4 text-right text-rose-300">Tambahan Transaksi</th>
                <th className="py-3 px-4 text-right text-slate-300">Est. Sisa Bln</th>
                <th className="py-3 px-4 text-right bg-slate-800 text-white">Total Prognosa</th>
                <th className="py-3 px-4 text-right text-emerald-300">Selisih vs Pagu</th>
                <th className="py-3 px-4 text-center font-sans">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {prognosaSummary.byPos.map((pos) => (
                <tr key={pos.pos} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900 font-sans">{pos.pos}</td>
                  <td className="py-3 px-4 text-right font-semibold">{formatRupiah(pos.annual)}</td>
                  <td className="py-3 px-4 text-right text-blue-600">{formatRupiah(pos.realMTD)}</td>
                  <td className="py-3 px-4 text-right text-rose-600 font-bold">+{formatRupiah(pos.additional)}</td>
                  <td className="py-3 px-4 text-right text-slate-500">{formatRupiah(pos.future)}</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900 bg-slate-50">{formatRupiah(pos.prognosa)}</td>
                  <td className={`py-3 px-4 text-right font-bold ${pos.deviasi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatRupiah(pos.deviasi)}
                  </td>
                  <td className="py-3 px-4 text-center font-sans">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      pos.percentage <= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {formatPercent(pos.percentage)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* List of Additional Transactions / Commitments */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Daftar Komitmen Tambahan Transaksi & Alih Daya</h3>
            <p className="text-xs text-slate-500">Biaya yang sudah terjadi atau terikat kontrak namun belum terbit SPJ/SAP</p>
          </div>

          {/* Filter POS */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {['ALL', 'Pos 53', 'Pos 54', 'Sewa Non AHG'].map(p => (
              <button type="button"
                key={p}
                onClick={() => setFilterPos(p)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  filterPos === p
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p === 'ALL' ? 'Semua' : p}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4 min-w-[220px]">Uraian Transaksi / Alih Daya</th>
                <th className="py-3 px-4 w-28">POS</th>
                <th className="py-3 px-4 w-36">Kategori</th>
                <th className="py-3 px-4 text-right min-w-[150px]">Nominal (Rp)</th>
                <th className="py-3 px-4 text-center w-24">Status Aktif</th>
                <th className="py-3 px-4 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Belum ada transaksi tambahan untuk filter ini.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t, idx) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-center text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{t.name}</div>
                      {t.notes && <div className="text-[10px] text-slate-400 font-normal">{t.notes}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {t.posType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{t.category}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(t.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button type="button"
                        onClick={() => updateAdditionalTransaction(t.id, { isActive: !t.isActive })}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${
                          t.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {t.isActive ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button type="button"
                          onClick={() => setEditingItem(JSON.parse(JSON.stringify(t)))}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button type="button"
                          onClick={() => {
                            if (confirm(`Hapus tambahan transaksi "${t.name}"?`)) {
                              deleteAdditionalTransaction(t.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Tambah Transaksi */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <Plus className="w-5 h-5 text-blue-600" />
                <h3>Tambah Komitmen Transaksi Baru</h3>
              </div>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Uraian Transaksi / Komitmen</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Security Outsourcing Bulan Depan"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kelompok POS</label>
                  <select
                    value={formData.posType}
                    onChange={(e) => setFormData({ ...formData, posType: e.target.value as PosType })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Pos 53">Pos 53 - Pemeliharaan</option>
                    <option value="Pos 54">Pos 54 - Administrasi & Umum</option>
                    <option value="Sewa Non AHG">Sewa Non AHG</option>
                    <option value="Pos 52">Pos 52 - Kepegawaian</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategori</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-[11px] text-blue-600 font-mono mt-0.5 block">
                  {formatRupiah(formData.amount)}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Keterangan / Dasar Kontrak</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Transaksi */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <h3>Edit Komitmen Transaksi</h3>
              </div>
              <button type="button" onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Uraian Transaksi / Komitmen</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Security Outsourcing Bulan Depan"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kelompok POS</label>
                  <select
                    value={editingItem.posType}
                    onChange={(e) => setEditingItem({ ...editingItem, posType: e.target.value as PosType })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Pos 53">Pos 53 - Pemeliharaan</option>
                    <option value="Pos 54">Pos 54 - Administrasi & Umum</option>
                    <option value="Sewa Non AHG">Sewa Non AHG</option>
                    <option value="Pos 52">Pos 52 - Kepegawaian</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategori</label>
                  <input
                    type="text"
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editingItem.amount}
                  onChange={(e) => setEditingItem({ ...editingItem, amount: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-[11px] text-blue-600 font-mono mt-0.5 block">
                  {formatRupiah(editingItem.amount)}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Keterangan / Dasar Kontrak</label>
                <textarea
                  rows={2}
                  value={editingItem.notes || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm"
                >
                  Perbarui Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
