import { BudgetItem } from '../types';

/**
 * Mendapatkan semua akun anggaran (non-header) yang berada di bawah suatu sub-total / header
 */
export function getChildAccountsForHeader(
  header: BudgetItem, 
  items: BudgetItem[], 
  headerIndex?: number
): BudgetItem[] {
  if (!header.isGroupHeader) return [];

  const idx = headerIndex !== undefined && headerIndex >= 0 
    ? headerIndex 
    : items.findIndex(it => it.id === header.id);

  const isGrandTotal = 
    header.code === 'CODE_1' || 
    header.name.toLowerCase().includes('beban usaha') || 
    (header.level === 0 && !header.category && header.name.toLowerCase().includes('total'));

  if (isGrandTotal) {
    return items.filter(it => !it.isGroupHeader);
  }

  if (header.level === 0) {
    return items.filter(it => !it.isGroupHeader && it.posType === header.posType);
  }

  // Untuk sub-total level 1 (atau level lain)
  if (idx !== -1) {
    const sequentialChildren: BudgetItem[] = [];
    for (let j = idx + 1; j < items.length; j++) {
      const nextItem = items[j];
      // Berhenti jika bertemu header lain pada level yang sama atau lebih tinggi
      if (nextItem.isGroupHeader && nextItem.level <= header.level) {
        break;
      }
      if (!nextItem.isGroupHeader) {
        sequentialChildren.push(nextItem);
      }
    }

    if (sequentialChildren.length > 0) {
      return sequentialChildren;
    }
  }

  // Fallback jika tidak ditemukan secara sekuensial: cocokkan berdasarkan category dan posType
  if (header.category) {
    return items.filter(it => 
      !it.isGroupHeader && 
      it.posType === header.posType && 
      it.category.trim().toLowerCase() === header.category.trim().toLowerCase()
    );
  }

  return [];
}

/**
 * Menghitung ulang seluruh nilai sub-total dan header pada daftar anggaran
 * sehingga nilainya berasal dari penjumlahan akun-akun anggaran di bawahnya.
 */
export function recalculateBudgetSubtotals(items: BudgetItem[]): BudgetItem[] {
  // Pastikan seluruh akun reguler (non-header) memiliki nilai pagu tahunan yang terkunci persis sama dengan total 12 bulan
  const normalizedItems = items.map(item => {
    if (!item.isGroupHeader) {
      const monthlySum = (item.budgetMonthly || []).reduce((sum, m) => sum + (Number(m) || 0), 0);
      return {
        ...item,
        budgetAnnual: monthlySum
      };
    }
    return item;
  });

  return normalizedItems.map((item, idx) => {
    if (!item.isGroupHeader) {
      return item;
    }

    const childAccounts = getChildAccountsForHeader(item, normalizedItems, idx);

    // Penjumlahan pagu anggaran tahunan dari seluruh akun anak
    const budgetAnnual = childAccounts.reduce((sum, child) => sum + (child.budgetAnnual || 0), 0);

    // Penjumlahan alokasi bulanan (12 bulan)
    const budgetMonthly = Array(12).fill(0).map((_, m) => 
      childAccounts.reduce((sum, child) => sum + (child.budgetMonthly?.[m] || 0), 0)
    );

    // Penjumlahan realisasi bulanan (12 bulan)
    const realizationMonthly = Array(12).fill(0).map((_, m) => 
      childAccounts.reduce((sum, child) => sum + (Number(child.realizationMonthly?.[m]) || 0), 0)
    );

    return {
      ...item,
      budgetAnnual,
      budgetMonthly,
      realizationMonthly
    };
  });
}
