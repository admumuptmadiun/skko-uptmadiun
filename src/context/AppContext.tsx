import React, { createContext, useContext, useState, useEffect } from 'react';
import { BudgetItem, IndicatorTarget, AdditionalTransaction, ImportLog, PosType } from '../types';
import { DEFAULT_BUDGET_ITEMS, DEFAULT_INDICATORS, DEFAULT_ADDITIONAL_TRANSACTIONS } from '../data/defaultBudgetData';
import { recalculateBudgetSubtotals } from '../utils/budgetCalculations';

interface AppContextType {
  budgetItems: BudgetItem[];
  indicators: IndicatorTarget[];
  additionalTransactions: AdditionalTransaction[];
  importLogs: ImportLog[];
  selectedYear: number;
  selectedMonth: number; // 0 for Jan, 7 for Aug, 11 for Dec
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: number) => void;
  
  // Budget operations
  addBudgetItem: (item: Omit<BudgetItem, 'id'>) => void;
  updateBudgetItem: (id: string, updated: Partial<BudgetItem>) => void;
  deleteBudgetItem: (id: string) => void;
  deleteMultipleBudgetItems: (ids: string[]) => void;
  updateMonthlyBudget: (id: string, monthIndex: number, amount: number) => void;
  distributeAnnualBudget: (id: string, annualAmount: number) => void;
  resetAllValuesToZero: () => void;
  
  // Realization operations
  updateRealization: (id: string, monthIndex: number, amount: number) => void;
  updateAccountMonthlyRealization: (id: string, monthlyValues: number[]) => void;
  updateBatchRealizations: (updates: { id: string; monthIndex: number; amount: number }[]) => void;
  updateBatchAccountRealizations: (updates: { id: string; monthlyValues: number[] }[]) => void;
  importRealizationData: (importedItems: Partial<BudgetItem>[], fileName: string, targetMonth?: number) => { success: boolean; message: string; matched: number };
  
  // Indicator operations
  updateIndicator: (id: string, updated: Partial<IndicatorTarget>) => void;
  
  // Additional transactions
  addAdditionalTransaction: (tx: Omit<AdditionalTransaction, 'id'>) => void;
  updateAdditionalTransaction: (id: string, updated: Partial<AdditionalTransaction>) => void;
  deleteAdditionalTransaction: (id: string) => void;
  
  // System operations
  resetToDefault: () => void;
  exportDataJSON: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_BUDGET = 'madiun_anggaran_items_v5';
const STORAGE_KEY_INDICATORS = 'madiun_anggaran_indicators_v5';
const STORAGE_KEY_TRANSACTIONS = 'madiun_anggaran_transactions_v5';
const STORAGE_KEY_LOGS = 'madiun_anggaran_logs_v5';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>(() => {
    // Clear old versions if present
    try {
      localStorage.removeItem('madiun_anggaran_items_v2');
      localStorage.removeItem('madiun_anggaran_indicators_v2');
      localStorage.removeItem('madiun_anggaran_transactions_v2');
      localStorage.removeItem('madiun_anggaran_logs_v2');
      localStorage.removeItem('madiun_anggaran_items_v3');
      localStorage.removeItem('madiun_anggaran_indicators_v3');
    } catch (e) {
      // ignore
    }

    const saved = localStorage.getItem(STORAGE_KEY_BUDGET) || localStorage.getItem('madiun_anggaran_items_v4');
    if (saved) {
      try {
        const parsed: any[] = JSON.parse(saved);
        // Normalize and migrate old Sewa items to new Beban Sewa structure
        const normalized = parsed
          .filter(item => item.code !== 'CODE_75' && item.code !== 'CODE_76' && item.code !== 'CODE_77') // remove old empty duplicate header placeholders
          .map(item => {
            let posType = item.posType;
            let name = item.name;
            let pos = item.pos;
            let category = item.category;

            if (posType === 'Sewa Non AHG') {
              posType = 'Beban Sewa';
            }

            if (item.code === 'CODE_74' || item.name === 'Beban Sewa AHG' || (item.isGroupHeader && (item.name === 'Beban Sewa Non AHG' || item.pos === 'Beban Sewa Non AHG'))) {
              name = 'Beban Sewa';
              pos = 'Beban Sewa';
              posType = 'Beban Sewa';
              category = 'Beban Sewa';
            } else if (item.code === '6101310001') {
              name = 'Beban Sewa Non AHG';
              pos = 'Beban Sewa';
              posType = 'Beban Sewa';
              category = 'Beban Sewa';
            } else if (item.code === '6101310002') {
              name = 'Beban Sewa Pembangkit & Non Pembangkit Anak Prshn';
              pos = 'Beban Sewa';
              posType = 'Beban Sewa';
              category = 'Beban Sewa';
            }

            return {
              ...item,
              name,
              pos,
              posType,
              category,
              realizationMonthly: item.realizationMonthly || item.realizationTunai?.map((t: number, idx: number) => (t || 0) + (item.realizationNonTunai?.[idx] || 0)) || Array(12).fill(0)
            };
          });

        // Ensure sub accounts 6101310001 and 6101310002 exist
        const has6101310001 = normalized.some(i => i.code === '6101310001');
        const has6101310002 = normalized.some(i => i.code === '6101310002');
        
        if (!has6101310001 || !has6101310002) {
          const headerIdx = normalized.findIndex(i => i.name === 'Beban Sewa' || i.posType === 'Beban Sewa');
          if (headerIdx !== -1) {
            const newSubItems: BudgetItem[] = [];
            if (!has6101310001) {
              newSubItems.push({
                id: `item_sewa_6101310001`,
                code: '6101310001',
                name: 'Beban Sewa Non AHG',
                pos: 'Beban Sewa',
                posType: 'Beban Sewa',
                category: 'Beban Sewa',
                isGroupHeader: false,
                level: 2,
                budgetAnnual: 0,
                budgetMonthly: Array(12).fill(0),
                realizationMonthly: Array(12).fill(0)
              });
            }
            if (!has6101310002) {
              newSubItems.push({
                id: `item_sewa_6101310002`,
                code: '6101310002',
                name: 'Beban Sewa Pembangkit & Non Pembangkit Anak Prshn',
                pos: 'Beban Sewa',
                posType: 'Beban Sewa',
                category: 'Beban Sewa',
                isGroupHeader: false,
                level: 2,
                budgetAnnual: 0,
                budgetMonthly: Array(12).fill(0),
                realizationMonthly: Array(12).fill(0)
              });
            }
            normalized.splice(headerIdx + 1, 0, ...newSubItems);
          }
        }

        return recalculateBudgetSubtotals(normalized);
      } catch (e) {
        console.error('Failed to parse saved budget data', e);
      }
    }
    return recalculateBudgetSubtotals(DEFAULT_BUDGET_ITEMS);
  });

  const [indicators, setIndicators] = useState<IndicatorTarget[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_INDICATORS) || localStorage.getItem('madiun_anggaran_indicators_v4');
    if (saved) {
      try {
        const parsed: IndicatorTarget[] = JSON.parse(saved);
        return parsed.map(ind => {
          if (ind.posType === 'Sewa Non AHG' || ind.id === 'ind_sewa_non_ahg') {
            return {
              ...ind,
              id: 'ind_beban_sewa',
              code: 'BEBAN_SEWA',
              name: 'Realisasi Beban Sewa',
              pos: 'Beban Sewa',
              posType: 'Beban Sewa',
              description: 'Realisasi penyerapan anggaran Beban Sewa Non AHG & Sewa Pembangkit/Non Pembangkit Anak Perusahaan'
            };
          }
          return ind;
        });
      } catch (e) {
        console.error('Failed to parse saved indicators', e);
      }
    }
    return DEFAULT_INDICATORS;
  });

  const [additionalTransactions, setAdditionalTransactions] = useState<AdditionalTransaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_TRANSACTIONS) || localStorage.getItem('madiun_anggaran_transactions_v4');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved transactions', e);
      }
    }
    return DEFAULT_ADDITIONAL_TRANSACTIONS;
  });

  const [importLogs, setImportLogs] = useState<ImportLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LOGS) || localStorage.getItem('madiun_anggaran_logs_v4');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved logs', e);
      }
    }
    return [];
  });

  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(7); // Default to August (0-indexed = 7)

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_BUDGET, JSON.stringify(budgetItems));
  }, [budgetItems]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_INDICATORS, JSON.stringify(indicators));
  }, [indicators]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(additionalTransactions));
  }, [additionalTransactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(importLogs));
  }, [importLogs]);

  // Recalculate indicators dynamically when budget or realization changes
  useEffect(() => {
    // Dynamically calculate indicators for Pos 53, 54, 52, Beban Sewa
    const pos53Items = budgetItems.filter(i => i.posType === 'Pos 53' && !i.isGroupHeader);
    const pos54Items = budgetItems.filter(i => i.posType === 'Pos 54' && !i.isGroupHeader);
    const pos52Items = budgetItems.filter(i => i.posType === 'Pos 52' && !i.isGroupHeader);
    const sewaItems = budgetItems.filter(i => (i.posType === 'Beban Sewa' || i.posType === 'Sewa Non AHG') && !i.isGroupHeader);

    const calcCumulative = (items: BudgetItem[]) => {
      const monthlyReal: number[] = Array(12).fill(0);
      for (let m = 0; m < 12; m++) {
        let sumMonth = 0;
        items.forEach(item => {
          sumMonth += (item.realizationMonthly?.[m] || 0);
        });
        if (m === 0) {
          monthlyReal[m] = sumMonth;
        } else {
          monthlyReal[m] = monthlyReal[m - 1] + sumMonth;
        }
      }
      return monthlyReal;
    };

    const real53 = calcCumulative(pos53Items);
    const real54 = calcCumulative(pos54Items);
    const real52 = calcCumulative(pos52Items);
    const realSewa = calcCumulative(sewaItems);

    setIndicators(prev => prev.map(ind => {
      let realVals = ind.monthlyRealization;
      if (ind.posType === 'Pos 53' && real53.some(v => v > 0)) realVals = real53;
      if (ind.posType === 'Pos 54' && real54.some(v => v > 0)) realVals = real54;
      if (ind.posType === 'Pos 52' && real52.some(v => v > 0)) realVals = real52;
      if ((ind.posType === 'Beban Sewa' || ind.posType === 'Sewa Non AHG') && realSewa.some(v => v > 0)) realVals = realSewa;

      const pcts = ind.monthlyTarget.map((target, idx) => {
        if (!target || target === 0) return realVals[idx] > 0 ? 100 : 0;
        return (realVals[idx] / target) * 100;
      });

      return {
        ...ind,
        monthlyRealization: realVals,
        monthlyPercentage: pcts
      };
    }));
  }, [budgetItems]);

  const addBudgetItem = (item: Omit<BudgetItem, 'id'>) => {
    const newItem: BudgetItem = {
      ...item,
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      updatedAt: new Date().toISOString()
    };
    
    setBudgetItems(prev => {
      // Find optimal insertion index so child account is placed right under its subtotal/category
      let insertIndex = -1;

      // 1. Look for the last item with the same posType and category
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].posType === newItem.posType && prev[i].category === newItem.category) {
          insertIndex = i + 1;
          break;
        }
      }

      // 2. If no exact category match, find the last item with the same posType
      if (insertIndex === -1) {
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].posType === newItem.posType) {
            insertIndex = i + 1;
            break;
          }
        }
      }

      let updatedList: BudgetItem[];
      if (insertIndex !== -1 && insertIndex <= prev.length) {
        updatedList = [...prev.slice(0, insertIndex), newItem, ...prev.slice(insertIndex)];
      } else {
        updatedList = [...prev, newItem];
      }

      return recalculateBudgetSubtotals(updatedList);
    });
  };

  const updateBudgetItem = (id: string, updated: Partial<BudgetItem>) => {
    setBudgetItems(prev => {
      const next = prev.map(item => {
        if (item.id === id) {
          return {
            ...item,
            ...updated,
            updatedAt: new Date().toISOString()
          };
        }
        return item;
      });
      return recalculateBudgetSubtotals(next);
    });
  };

  const deleteBudgetItem = (id: string) => {
    setBudgetItems(prev => {
      const next = prev.filter(item => item.id !== id);
      return recalculateBudgetSubtotals(next);
    });
  };

  const deleteMultipleBudgetItems = (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    const setIds = new Set(ids);
    setBudgetItems(prev => {
      const next = prev.filter(item => !setIds.has(item.id));
      return recalculateBudgetSubtotals(next);
    });
  };

  const resetAllValuesToZero = () => {
    setBudgetItems(prev => {
      const zeroed = prev.map(item => ({
        ...item,
        budgetAnnual: 0,
        budgetMonthly: Array(12).fill(0),
        realizationMonthly: Array(12).fill(0),
        updatedAt: new Date().toISOString()
      }));
      return recalculateBudgetSubtotals(zeroed);
    });

    setIndicators(prev => prev.map(ind => ({
      ...ind,
      targetAnnual: 0,
      monthlyTarget: Array(12).fill(0),
      monthlyRealization: Array(12).fill(0),
      monthlyPercentage: Array(12).fill(0)
    })));

    setAdditionalTransactions([]);
  };

  const updateMonthlyBudget = (id: string, monthIndex: number, amount: number) => {
    setBudgetItems(prev => {
      const next = prev.map(item => {
        if (item.id === id) {
          const newMonthly = [...item.budgetMonthly];
          newMonthly[monthIndex] = amount;
          const newAnnual = newMonthly.reduce((a, b) => a + b, 0);
          return {
            ...item,
            budgetMonthly: newMonthly,
            budgetAnnual: newAnnual,
            updatedAt: new Date().toISOString()
          };
        }
        return item;
      });
      return recalculateBudgetSubtotals(next);
    });
  };

  const distributeAnnualBudget = (id: string, annualAmount: number) => {
    const amount = annualAmount;
    const slice = Math.floor(amount / 12);
    const monthly = Array(12).fill(slice);
    monthly[11] = amount - (slice * 11);

    setBudgetItems(prev => {
      const next = prev.map(item => {
        if (item.id === id) {
          return {
            ...item,
            budgetAnnual: amount,
            budgetMonthly: monthly,
            updatedAt: new Date().toISOString()
          };
        }
        return item;
      });
      return recalculateBudgetSubtotals(next);
    });
  };

  const updateRealization = (id: string, monthIndex: number, amount: number) => {
    setBudgetItems(prev => {
      const next = prev.map(item => {
        if (item.id === id) {
          const newMonthly = [...(item.realizationMonthly || Array(12).fill(0))];
          newMonthly[monthIndex] = amount;
          return {
            ...item,
            realizationMonthly: newMonthly,
            updatedAt: new Date().toISOString()
          };
        }
        return item;
      });
      return recalculateBudgetSubtotals(next);
    });
  };

  const updateAccountMonthlyRealization = (id: string, monthlyValues: number[]) => {
    setBudgetItems(prev => {
      const next = prev.map(item => {
        if (item.id === id) {
          return {
            ...item,
            realizationMonthly: [...monthlyValues],
            updatedAt: new Date().toISOString()
          };
        }
        return item;
      });
      return recalculateBudgetSubtotals(next);
    });
  };

  const updateBatchRealizations = (updates: { id: string; monthIndex: number; amount: number }[]) => {
    if (!updates || updates.length === 0) return;
    const updateMap = new Map<string, { monthIndex: number; amount: number }[]>();
    updates.forEach(u => {
      const list = updateMap.get(u.id) || [];
      list.push({ monthIndex: u.monthIndex, amount: u.amount });
      updateMap.set(u.id, list);
    });

    setBudgetItems(prev => {
      const next = prev.map(item => {
        const itemUpdates = updateMap.get(item.id);
        if (itemUpdates) {
          const newMonthly = [...(item.realizationMonthly || Array(12).fill(0))];
          itemUpdates.forEach(up => {
            newMonthly[up.monthIndex] = up.amount;
          });
          return {
            ...item,
            realizationMonthly: newMonthly,
            updatedAt: new Date().toISOString()
          };
        }
        return item;
      });
      return recalculateBudgetSubtotals(next);
    });
  };

  const updateBatchAccountRealizations = (updates: { id: string; monthlyValues: number[] }[]) => {
    if (!updates || updates.length === 0) return;
    const map = new Map<string, number[]>();
    updates.forEach(u => map.set(u.id, u.monthlyValues));

    setBudgetItems(prev => {
      const next = prev.map(item => {
        const newVals = map.get(item.id);
        if (newVals) {
          return {
            ...item,
            realizationMonthly: [...newVals],
            updatedAt: new Date().toISOString()
          };
        }
        return item;
      });
      return recalculateBudgetSubtotals(next);
    });
  };

  const importRealizationData = (
    importedItems: Partial<BudgetItem>[],
    fileName: string,
    targetMonth?: number
  ) => {
    let matchedCount = 0;
    let totalImported = 0;

    const updated = budgetItems.map(existing => {
      // Try to match by exact code or name match
      const matched = importedItems.find(imp => {
        if (imp.code && existing.code && imp.code === existing.code) return true;
        if (imp.name && existing.name && imp.name.toLowerCase().trim() === existing.name.toLowerCase().trim()) return true;
        return false;
      });

      if (matched) {
        matchedCount++;
        const newMonthly = [...(existing.realizationMonthly || Array(12).fill(0))];

        if (targetMonth !== undefined && targetMonth >= 0 && targetMonth < 12) {
          if (matched.realizationMonthly && matched.realizationMonthly[targetMonth] !== undefined) {
            const val = Number(matched.realizationMonthly[targetMonth]) || 0;
            newMonthly[targetMonth] = val;
            totalImported += val;
          } else if ((matched as any).realizationTunai || (matched as any).realizationNonTunai) {
            const t = Number((matched as any).realizationTunai?.[targetMonth]) || 0;
            const nt = Number((matched as any).realizationNonTunai?.[targetMonth]) || 0;
            newMonthly[targetMonth] = t + nt;
            totalImported += (t + nt);
          }
        } else {
          // Replace all months if provided
          if (matched.realizationMonthly) {
            matched.realizationMonthly.forEach((v, idx) => {
              if (v !== undefined) {
                const val = Number(v) || 0;
                newMonthly[idx] = val;
                totalImported += val;
              }
            });
          } else if ((matched as any).realizationTunai || (matched as any).realizationNonTunai) {
            for (let m = 0; m < 12; m++) {
              const t = Number((matched as any).realizationTunai?.[m]) || 0;
              const nt = Number((matched as any).realizationNonTunai?.[m]) || 0;
              newMonthly[m] = t + nt;
              totalImported += (t + nt);
            }
          }
        }

        return {
          ...existing,
          realizationMonthly: newMonthly,
          updatedAt: new Date().toISOString()
        };
      }
      return existing;
    });

    setBudgetItems(recalculateBudgetSubtotals(updated));

    const log: ImportLog = {
      id: `log_${Date.now()}`,
      fileName,
      fileSize: 1024 * 50,
      importedAt: new Date().toISOString(),
      rowsProcessed: importedItems.length,
      rowsMatched: matchedCount,
      totalAmountImported: totalImported,
      status: matchedCount > 0 ? 'success' : 'warning',
      message: `Berhasil memproses ${importedItems.length} baris, mencocokkan ${matchedCount} akun anggaran.`
    };

    setImportLogs(prev => [log, ...prev]);

    return {
      success: matchedCount > 0,
      message: `Berhasil mengupdate ${matchedCount} akun anggaran dari total ${importedItems.length} baris import.`,
      matched: matchedCount
    };
  };

  const updateIndicator = (id: string, updated: Partial<IndicatorTarget>) => {
    setIndicators(prev => prev.map(ind => ind.id === id ? { ...ind, ...updated } : ind));
  };

  const addAdditionalTransaction = (tx: Omit<AdditionalTransaction, 'id'>) => {
    const newTx: AdditionalTransaction = {
      ...tx,
      id: `add_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`
    };
    setAdditionalTransactions(prev => [...prev, newTx]);
  };

  const updateAdditionalTransaction = (id: string, updated: Partial<AdditionalTransaction>) => {
    setAdditionalTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, ...updated } : tx));
  };

  const deleteAdditionalTransaction = (id: string) => {
    setAdditionalTransactions(prev => prev.filter(tx => tx.id !== id));
  };

  const resetToDefault = () => {
    localStorage.removeItem(STORAGE_KEY_BUDGET);
    localStorage.removeItem(STORAGE_KEY_INDICATORS);
    localStorage.removeItem(STORAGE_KEY_TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEY_LOGS);
    setBudgetItems(recalculateBudgetSubtotals(DEFAULT_BUDGET_ITEMS));
    setIndicators(DEFAULT_INDICATORS);
    setAdditionalTransactions(DEFAULT_ADDITIONAL_TRANSACTIONS);
    setSelectedMonth(7);
  };

  const exportDataJSON = () => {
    const data = {
      year: selectedYear,
      budgetItems,
      indicators,
      additionalTransactions,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Data_Pemantauan_Anggaran_${selectedYear}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppContext.Provider
      value={{
        budgetItems,
        indicators,
        additionalTransactions,
        importLogs,
        selectedYear,
        selectedMonth,
        setSelectedYear,
        setSelectedMonth,
        addBudgetItem,
        updateBudgetItem,
        deleteBudgetItem,
        deleteMultipleBudgetItems,
        updateMonthlyBudget,
        distributeAnnualBudget,
        resetAllValuesToZero,
        updateRealization,
        updateAccountMonthlyRealization,
        updateBatchRealizations,
        updateBatchAccountRealizations,
        importRealizationData,
        updateIndicator,
        addAdditionalTransaction,
        updateAdditionalTransaction,
        deleteAdditionalTransaction,
        resetToDefault,
        exportDataJSON
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
