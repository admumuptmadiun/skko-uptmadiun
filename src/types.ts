export type PosType = 
  | 'Pos 52' // Beban Kepegawaian
  | 'Pos 53' // Beban Pemeliharaan
  | 'Pos 54' // Biaya Administrasi dan Umum
  | 'Beban Sewa' // Beban Sewa
  | 'Pos 72' // Beban Pensiun
  | 'Lainnya'
  | 'Sewa Non AHG'; // Legacy alias

export interface MonthlyValues {
  [monthIndex: number]: number; // 0 for Jan, 11 for Des
}

export interface BudgetItem {
  id: string;
  code: string; // e.g. "6105100110" or "POS52"
  name: string; // e.g. "Pay For Person (P1)"
  pos: string; // "Pos 52 Beban Kepegawaian", "Pos 53 Beban Pemeliharaan", etc.
  posType: PosType;
  category: string; // e.g. "Beban Kepegawaian dalam Bentuk Kompensasi"
  isGroupHeader: boolean;
  level: number; // 0 for Pos/Total, 1 for Subcategory, 2 for Akun GL
  budgetAnnual: number;
  budgetMonthly: number[]; // 12 elements (Jan to Des)
  realizationMonthly: number[]; // 12 elements (Jan to Des)
  notes?: string;
  updatedAt?: string;
}

export interface IndicatorTarget {
  id: string;
  code: string;
  name: string;
  pos: string;
  posType: PosType;
  unit: string;
  monthlyTarget: number[]; // 12 elements
  monthlyRealization: number[]; // 12 elements
  monthlyPercentage: number[]; // 12 elements
  targetAnnual: number;
  description?: string;
}

export interface AdditionalTransaction {
  id: string;
  posType: PosType;
  posName: string;
  category: string; // "PEKERJAAN ALIH DAYA", "TAGIHAN NON RAB", "RINCIAN PEKERJAAN", "SEWA NON AHG"
  name: string; // e.g. "Security Tahap I", "Cleaning Service", "Fixcost Driver"
  month: number; // 1-12
  amount: number;
  note?: string;
  isActive: boolean;
}

export interface ImportLog {
  id: string;
  fileName: string;
  fileSize: number;
  importedAt: string;
  rowsProcessed: number;
  rowsMatched: number;
  totalAmountImported: number;
  status: 'success' | 'warning' | 'error';
  message: string;
}

export type ActiveTab = 
  | 'dashboard'
  | 'budget_input'
  | 'realization_input'
  | 'realization_import'
  | 'matrix'
  | 'performance'
  | 'prognosa'
  | 'reports';
