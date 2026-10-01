import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Edit3, 
  Save, 
  X, 
  HelpCircle, 
  Activity,
  Layers,
  Percent
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid, 
  ReferenceLine,
  BarChart,
  Bar
} from 'recharts';
import { useApp } from '../context/AppContext';
import { IndicatorTarget } from '../types';
import { 
  formatRupiah, 
  formatRupiahShort, 
  formatPercent, 
  MONTH_NAMES, 
  MONTH_SHORT_NAMES 
} from '../utils/formatters';

export const PerformanceView: React.FC = () => {
  const { 
    indicators, 
    updateIndicator, 
    selectedYear, 
    selectedMonth, 
    setSelectedMonth 
  } = useApp();

  const [editingIndicator, setEditingIndicator] = useState<IndicatorTarget | null>(null);

  const handleSaveIndicator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIndicator) return;

    // Recalculate monthly percentages
    const pct = editingIndicator.monthlyTarget.map((tgt, i) => {
      const real = editingIndicator.monthlyRealization[i] || 0;
      return tgt > 0 ? (real / tgt) * 100 : 0;
    });

    updateIndicator(editingIndicator.id, {
      ...editingIndicator,
      monthlyPercentage: pct
    });

    setEditingIndicator(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Indikator Kinerja & Optimalisasi Biaya</h1>
            <p className="text-xs text-slate-500">
              Evaluasi target optimalisasi per pos beban operasional (Pos 53, Pos 54, Pos 52, dan Sewa Non AHG)
            </p>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="text-xs font-semibold text-slate-500">Bulan Penilaian:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MONTH_NAMES.map((m, idx) => (
              <option key={idx} value={idx}>{m} {selectedYear}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Indicators Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {indicators.map((ind) => {
          const currentPct = ind.monthlyPercentage[selectedMonth] || 0;
          const currentReal = ind.monthlyRealization[selectedMonth] || 0;
          const currentTarget = ind.monthlyTarget[selectedMonth] || 0;
          const selisih = currentTarget - currentReal;

          const isOptimal = currentPct > 0 && currentPct <= 100;
          const isWarning = currentPct > 95 && currentPct <= 100;
          const isOver = currentPct > 100;

          // Chart data for this indicator
          const chartData = MONTH_SHORT_NAMES.map((m, idx) => ({
            month: m,
            persen: Number((ind.monthlyPercentage[idx] || 0).toFixed(1)),
            realisasi: ind.monthlyRealization[idx] || 0,
            target: ind.monthlyTarget[idx] || 0
          }));

          return (
            <div key={ind.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {ind.code}
                    </span>
                    <h3 className="font-bold text-base text-slate-900">{ind.name}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Target Maksimal: {ind.targetRule}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button type="button"
                    onClick={() => setEditingIndicator(JSON.parse(JSON.stringify(ind)))}
                    className="p-1 text-slate-400 hover:text-blue-600 rounded"
                    title="Edit Target & Realisasi Indikator"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                    isOver ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                    isWarning ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                    isOptimal ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {isOver ? (
                      <><AlertCircle className="w-3.5 h-3.5" /> Overbudget</>
                    ) : isOptimal ? (
                      <><CheckCircle2 className="w-3.5 h-3.5" /> Optimal</>
                    ) : (
                      'N/A'
                    )}
                  </span>
                </div>
              </div>

              {/* Big KPI Numbers */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">Realisasi s/d Bln</span>
                  <span className="text-sm font-bold text-slate-900 font-mono mt-0.5 block">
                    {formatRupiahShort(currentReal)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">Target SKKO</span>
                  <span className="text-sm font-bold text-slate-900 font-mono mt-0.5 block">
                    {formatRupiahShort(currentTarget)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">Pencapaian (%)</span>
                  <span className={`text-base font-extrabold mt-0.5 block ${
                    isOver ? 'text-rose-600' : 'text-emerald-600'
                  }`}>
                    {formatPercent(currentPct)}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Realisasi vs Target SKKO:</span>
                  <span className="font-semibold text-slate-700">
                    {selisih >= 0 ? `Hemat ${formatRupiahShort(selisih)}` : `Over ${formatRupiahShort(Math.abs(selisih))}`}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOver ? 'bg-rose-500' : currentPct > 90 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, currentPct)}%` }}
                  />
                </div>
              </div>

              {/* Mini Trend Line Chart */}
              <div className="h-44 pt-2">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Tren Pencapaian Indikator Jan - Des (%):
                </span>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 120]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip 
                      formatter={(val: any) => [`${val}%`, 'Pencapaian']}
                      contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', fontSize: '11px' }}
                    />
                    <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Target 100%', fill: '#ef4444', fontSize: 10 }} />
                    <Line 
                      type="monotone" 
                      dataKey="persen" 
                      stroke="#4f46e5" 
                      strokeWidth={2.5} 
                      dot={{ r: 3, fill: '#4f46e5' }} 
                      activeDot={{ r: 5 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: Edit Indikator Target */}
      {editingIndicator && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="sticky top-0 bg-slate-900 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base">Edit Target & Nilai Indikator {editingIndicator.name}</h3>
              </div>
              <button type="button" 
                onClick={() => setEditingIndicator(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveIndicator} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Indikator</label>
                  <input
                    type="text"
                    value={editingIndicator.name}
                    onChange={(e) => setEditingIndicator({ ...editingIndicator, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ketentuan Target</label>
                  <input
                    type="text"
                    value={editingIndicator.targetRule}
                    onChange={(e) => setEditingIndicator({ ...editingIndicator, targetRule: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Monthly target & Realization tables */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <label className="font-bold text-slate-800 block">Target SKKO Bulanan (Rp)</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {MONTH_SHORT_NAMES.map((m, idx) => (
                    <div key={`tgt-${idx}`}>
                      <span className="text-[10px] text-slate-500 block mb-0.5">{m}</span>
                      <input
                        type="number"
                        min="0"
                        value={editingIndicator.monthlyTarget[idx] || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          const newTgt = [...editingIndicator.monthlyTarget];
                          newTgt[idx] = val;
                          setEditingIndicator({ ...editingIndicator, monthlyTarget: newTgt });
                        }}
                        className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-[11px] bg-white focus:outline-none"
                      />
                    </div>
                  ))}
                </div>

                <label className="font-bold text-slate-800 block pt-2">Realisasi Bulanan (Rp)</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {MONTH_SHORT_NAMES.map((m, idx) => (
                    <div key={`real-${idx}`}>
                      <span className="text-[10px] text-slate-500 block mb-0.5">{m}</span>
                      <input
                        type="number"
                        min="0"
                        value={editingIndicator.monthlyRealization[idx] || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          const newReal = [...editingIndicator.monthlyRealization];
                          newReal[idx] = val;
                          setEditingIndicator({ ...editingIndicator, monthlyRealization: newReal });
                        }}
                        className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-[11px] bg-white focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingIndicator(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  Simpan Indikator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
