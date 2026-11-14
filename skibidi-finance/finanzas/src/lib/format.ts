const pad = (n: number) => String(n).padStart(2, '0');

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const compact = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const dateFmt = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
const longDateFmt = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const fmtMoney = (n: number) => money.format(Object.is(n, -0) || Math.abs(n) < 0.005 ? 0 : n);
export const fmtCompact = (n: number) => compact.format(n);
export const fmtPct = (n: number, digits = 0) => `${n.toFixed(digits)}%`;

export const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const todayStr = () => toDateStr(new Date());
export const isValidDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && toDateStr(parseDate(s)) === s;
export const fmtDate = (s: string) => dateFmt.format(parseDate(s));

export const relativeDate = (s: string) => {
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (s === toDateStr(today)) return 'Hoy';
  if (s === toDateStr(yesterday)) return 'Ayer';
  return cap(longDateFmt.format(parseDate(s)));
};

export const currentMonth = () => todayStr().slice(0, 7);
export const monthKey = (s: string) => s.slice(0, 7);
export const addMonths = (key: string, n: number) => {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
export const daysInMonth = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
};
export const monthLabel = (key: string, style: 'long' | 'short' = 'long') => {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  const opts: Intl.DateTimeFormatOptions = style === 'long' ? { month: 'long', year: 'numeric' } : { month: 'short' };
  return cap(new Intl.DateTimeFormat('es-MX', opts).format(d).replace('.', ''));
};

/** Monto escrito por el usuario: acepta "1,234.50" o "$ 1234". Devuelve NaN si es inválido. */
export const parseAmount = (raw: string) => {
  const clean = raw.replace(/[\s$,]/g, '');
  return /^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(clean) ? Number(clean) : NaN;
};

/** Número tolerante para calculadoras (0 si no se puede leer). */
export const toNum = (s: string) => {
  const n = parseFloat(s.replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
