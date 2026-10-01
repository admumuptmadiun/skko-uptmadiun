import React, { useState, useEffect } from 'react';
import { X, Save, Building2, Lock, Trash2 } from 'lucide-react';
import { BudgetItem, PosType } from '../types';
import { MONTH_SHORT_NAMES, formatRupiah, formatRupiahShort } from '../utils/formatters';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: BudgetItem) => void;
  onDelete?: (id: string) => void;
  initialItem?: BudgetItem | null;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialItem
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [posType, setPosType] = useState<PosType>('Pos 53');
  const [category, setCategory] = useState('');
  const [budgetMonthly, setBudgetMonthly] = useState<number[]>(Array(12).fill(0));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setShowDeleteConfirm(false);
    if (initialItem) {
      setCode(initialItem.code || '');
      setName(initialItem.name || '');
      setPosType(initialItem.posType || 'Pos 53');
      setCategory(initialItem.category || '');
      setBudgetMonthly(initialItem.budgetMonthly || Array(12).fill(0));
    } else {
      setCode('');
      setName('');
      setPosType('Pos 53');
      setCategory('Beban Pemeliharaan Peralatan');
      setBudgetMonthly(Array(12).fill(0));
    }
  }, [initialItem, isOpen]);

  if (!isOpen) return null;

  const monthlySum = budgetMonthly.reduce((a, b) => a + (Number(b) || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const posMap: Record<PosType, string> = {
      'Pos 52': 'Pos 52 Beban Kepegawaian',
      'Pos 53': 'Pos 53 Beban Pemeliharaan',
      'Pos 54': 'Pos 54 Biaya Administrasi dan Umum',
      'Beban Sewa': 'Beban Sewa',
      'Sewa Non AHG': 'Beban Sewa',
      'Pos 72': 'Pos 72 Beban Imbalan Pasca Kerja',
      'Lainnya': 'Pos Lainnya'
    };

    const item: BudgetItem = {
      id: initialItem?.id || `acc_${Date.now()}`,
      code: code.trim() || `53${Math.floor(10000000 + Math.random() * 90000000)}`,
      name: name.trim(),
      pos: posMap[posType] || 'Pos 53 Beban Pemeliharaan',
      posType,
      category: category.trim() || posType,
      budgetAnnual: monthlySum,
      budgetMonthly: budgetMonthly.length === 12 ? budgetMonthly : Array(12).fill(0),
      realizationMonthly: initialItem?.realizationMonthly || Array(12).fill(0),
      isGroupHeader: initialItem?.isGroupHeader || false,
      level: initialItem?.level !== undefined ? initialItem.level : 2,
      updatedAt: new Date().toISOString()
    };

    onSave(item);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {initialItem ? 'Edit Akun Anggaran' : 'Tambah Akun Anggaran Baru'}
              </h3>
              <p className="text-xs text-slate-300">Input parameter akun dan isi alokasi anggaran bulanan secara manual</p>
            </div>
          </div>
          <button type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kode Akun (GL Code):</label>
              <input
                type="text"
                placeholder="e.g. 5311010001"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Pos Anggaran:</label>
              <select
                value={posType}
                onChange={(e) => setPosType(e.target.value as PosType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
              >
                <option value="Pos 52">Pos 52 (Beban Kepegawaian)</option>
                <option value="Pos 53">Pos 53 (Beban Pemeliharaan)</option>
                <option value="Pos 54">Pos 54 (Biaya Administrasi & Umum)</option>
                <option value="Beban Sewa">Beban Sewa</option>
                <option value="Pos 72">Pos 72 (Beban Pensiun/Imbalan)</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nama / Uraian Akun Anggaran:</label>
            <input
              type="text"
              required
              placeholder="e.g. Pemeliharaan Instalasi Gardu Hubung, ATK, Listrik..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Sub Kategori / Pengelompokan:</label>
            <input
              type="text"
              placeholder="e.g. Pemeliharaan Distribusi, Pelayanan Pelanggan..."
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Plafon Anggaran Tahunan (Terkunci):</span>
                <span className="text-blue-600 font-normal">(Otomatis dari 12 Bulan)</span>
              </label>
              <span className={`font-mono font-bold text-sm ${monthlySum < 0 ? 'text-rose-600' : 'text-blue-700'}`}>
                {formatRupiah(monthlySum)}
              </span>
            </div>
            <input
              type="number"
              disabled
              value={monthlySum}
              className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-sm text-right text-slate-700 cursor-not-allowed"
            />
          </div>

          {/* Monthly grid */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-700">Rencana Alokasi Bulanan (Jan - Des) — Isi Manual:</span>
              <span className="text-slate-500">
                Total 12 Bulan: <strong className={`font-mono ${monthlySum < 0 ? 'text-rose-600 font-bold' : 'text-slate-800'}`}>{formatRupiahShort(monthlySum)}</strong>
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {MONTH_SHORT_NAMES.map((m, idx) => (
                <div key={idx} className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                  <span className="text-[10px] font-bold text-slate-500 block mb-0.5">{m}</span>
                  <input
                    type="number"
                    value={budgetMonthly[idx] !== undefined && budgetMonthly[idx] !== null ? budgetMonthly[idx] : ''}
                    onChange={(e) => {
                      const updated = [...budgetMonthly];
                      updated[idx] = Number(e.target.value) || 0;
                      setBudgetMonthly(updated);
                    }}
                    className={`w-full px-1 py-1 bg-white border rounded text-right font-mono text-[11px] focus:outline-none focus:border-blue-500 ${
                      (budgetMonthly[idx] || 0) < 0 ? 'border-rose-300 text-rose-600 font-bold' : 'border-slate-300'
                    }`}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Delete confirmation banner inside modal */}
          {showDeleteConfirm && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="text-rose-800">
                <strong>Konfirmasi Hapus:</strong> Anda yakin ingin menghapus akun <strong>{code} - {name}</strong>?
              </div>
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (initialItem && onDelete) {
                      onDelete(initialItem.id);
                      onClose();
                    }
                  }}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold shadow-sm"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-2">
            <div>
              {initialItem && onDelete && !showDeleteConfirm && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 hover:border-rose-300 text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus Akun Ini</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Akun Anggaran</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
