export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const MONTH_SHORT_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'
];

export function formatRupiah(value: number | undefined | null, showPrefix: boolean = true): string {
  if (value === undefined || value === null || isNaN(value)) {
    return showPrefix ? 'Rp 0' : '0';
  }
  
  const isNegative = value < 0;
  const absValue = Math.abs(Math.round(value));
  
  const formatted = absValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  if (isNegative) {
    return showPrefix ? `-Rp ${formatted}` : `-${formatted}`;
  }
  return showPrefix ? `Rp ${formatted}` : formatted;
}

export function formatRupiahShort(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return 'Rp 0';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (abs >= 1_000_000_000_000) {
    return `${sign}Rp ${(abs / 1_000_000_000_000).toFixed(2).replace('.', ',')} T`;
  }
  if (abs >= 1_000_000_000) {
    return `${sign}Rp ${(abs / 1_000_000_000).toFixed(2).replace('.', ',')} M`;
  }
  if (abs >= 1_000_000) {
    return `${sign}Rp ${(abs / 1_000_000).toFixed(1).replace('.', ',')} Jt`;
  }
  if (abs >= 1_000) {
    return `${sign}Rp ${(abs / 1_000).toFixed(0).replace('.', ',')} Rb`;
  }
  return `${sign}Rp ${abs.toLocaleString('id-ID')}`;
}

export function formatPercent(value: number | undefined | null, decimals: number = 2): string {
  if (value === undefined || value === null || isNaN(value)) return '0,00%';
  return `${value.toFixed(decimals).replace('.', ',')}%`;
}

export function parseNumberString(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  
  let s = String(val).trim();
  if (s === '-' || s === '' || s === ' -   ') return 0;
  
  let isNegative = false;
  if (s.startsWith('(') && s.endsWith(')')) {
    isNegative = true;
    s = s.slice(1, -1);
  } else if (s.startsWith('-') || s.startsWith('- ')) {
    isNegative = true;
    s = s.replace(/^-\s*/, '');
  }

  // Remove currency, spaces, quotes, percent
  s = s.replace(/Rp|\$|EUR|["'%\s]/gi, '');

  // Handle Indonesian thousand separator (dots) and decimal commas or vice versa
  if (s.includes('.') && s.includes(',')) {
    // Standard ID: 1.234.567,89 -> remove dots, replace comma with dot
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // Standard US: 1,234,567.89 -> remove commas
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    // If comma only: "1,234" vs "1234,56"
    const parts = s.split(',');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      s = s.replace(/,/g, '');
    } else {
      s = s.replace(',', '.');
    }
  } else if (s.includes('.')) {
    // If multiple dots, they are thousand separators
    const parts = s.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      s = s.replace(/\./g, '');
    }
  }

  const num = parseFloat(s);
  if (isNaN(num)) return 0;
  return isNegative ? -num : num;
}
