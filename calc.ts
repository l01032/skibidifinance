import type { AppData, Goal, Transaction, TxType } from '../types';
import { addMonths, currentMonth, fmtMoney, fmtPct, monthKey, monthLabel, round2 } from './format';

export const byDateDesc = (a: Transaction, b: Transaction) => b.date.localeCompare(a.date);

export const sumBy = (txs: Transaction[], type: TxType) =>
  round2(txs.reduce((s, t) => (t.type === type ? s + t.amount : s), 0));

export const inMonth = (txs: Transaction[], key: string, upToDay?: number) =>
  txs.filter((t) => monthKey(t.date) === key && (upToDay === undefined || Number(t.date.slice(8)) <= upToDay));

export interface Totals {
  income: number;
  expense: number;
  net: number;
  rate: number;
}

export const totalsFor = (txs: Transaction[], key: string, upToDay?: number): Totals => {
  const m = inMonth(txs, key, upToDay);
  const income = sumBy(m, 'ingreso');
  const expense = sumBy(m, 'gasto');
  const net = round2(income - expense);
  return { income, expense, net, rate: income > 0 ? (net / income) * 100 : 0 };
};

/** Lista de `n` meses terminando en `end` (inclusive), del más antiguo al más reciente. */
export const monthRange = (end: string, n: number) => Array.from({ length: n }, (_, i) => addMonths(end, i - (n - 1)));

export const byCategory = (txs: Transaction[], type: TxType = 'gasto') => {
  const map = new Map<string, number>();
  for (const t of txs) if (t.type === type) map.set(t.category, round2((map.get(t.category) ?? 0) + t.amount));
  return [...map].map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
};

export const goalSaved = (g: Goal) => round2(g.contributions.reduce((s, c) => s + c.amount, 0));
export const totalSaved = (goals: Goal[]) => round2(goals.reduce((s, g) => s + goalSaved(g), 0));

/** Dinero disponible = saldo inicial + ingresos − gastos − aportado a metas (hasta `upTo`, inclusive). */
export const availableUpTo = (d: AppData, upTo?: string) => {
  const tx = upTo ? d.transactions.filter((t) => t.date <= upTo) : d.transactions;
  const saved = d.goals.reduce(
    (s, g) => s + g.contributions.reduce((x, c) => (!upTo || c.date <= upTo ? x + c.amount : x), 0),
    0,
  );
  return round2(d.settings.initialBalance + sumBy(tx, 'ingreso') - sumBy(tx, 'gasto') - saved);
};
export const available = (d: AppData) => availableUpTo(d);
export const availableAtMonthEnd = (d: AppData, key: string) => availableUpTo(d, `${key}-31`);

export type BudgetLevel = 'ok' | 'warn' | 'over';
export const budgetStatus = (spent: number, limit: number, threshold: number) => {
  const pct = limit > 0 ? (spent / limit) * 100 : 0;
  const level: BudgetLevel = pct >= 100 ? 'over' : pct >= threshold ? 'warn' : 'ok';
  return { pct, remaining: round2(limit - spent), level };
};

/** Variación porcentual; null si no hay base de comparación. */
/** Si `key` es el mes en curso, el mes anterior se corta al mismo día para comparar periodos equivalentes. */
export const prevTotals = (txs: Transaction[], key: string) => {
  const partial = key === currentMonth();
  return { totals: totalsFor(txs, addMonths(key, -1), partial ? new Date().getDate() : undefined), partial };
};

export const delta = (cur: number, prev: number) =>
  prev === 0 ? (cur === 0 ? 0 : null) : ((cur - prev) / Math.abs(prev)) * 100;

export const futureValue = (initial: number, monthly: number, annualPct: number, months: number) => {
  const r = annualPct / 100 / 12;
  if (r === 0) return initial + monthly * months;
  const g = Math.pow(1 + r, months);
  return initial * g + monthly * ((g - 1) / r);
};

export const requiredMonthly = (target: number, current: number, annualPct: number, months: number) => {
  if (months <= 0) return Math.max(target - current, 0);
  const r = annualPct / 100 / 12;
  const g = Math.pow(1 + r, months);
  const remaining = target - current * g;
  if (remaining <= 0) return 0;
  return r === 0 ? remaining / months : (remaining * r) / (g - 1);
};

/** Promedio de los últimos 3 meses cerrados que tengan movimientos. */
export const averageNet = (d: AppData, ref = currentMonth()) => {
  const keys = monthRange(addMonths(ref, -1), 3).filter((k) => inMonth(d.transactions, k).length > 0);
  if (!keys.length) return null;
  const t = keys.map((k) => totalsFor(d.transactions, k));
  const avg = (f: (x: Totals) => number) => t.reduce((s, x) => s + f(x), 0) / keys.length;
  return { months: keys.length, income: avg((x) => x.income), expense: avg((x) => x.expense), net: avg((x) => x.net) };
};

export function buildSummary(d: AppData, key: string): string[] {
  const tx = d.transactions;
  const cur = totalsFor(tx, key);
  if (cur.income === 0 && cur.expense === 0) {
    return [`Todavía no hay movimientos en ${monthLabel(key).toLowerCase()}.`];
  }
  const out: string[] = [];
  if (cur.income === 0) out.push('Hay gastos, pero ningún ingreso registrado este mes.');
  else if (cur.net < 0) out.push(`Gastaste ${fmtMoney(-cur.net)} más de lo que ingresaste este mes.`);
  else if (cur.rate >= 20) out.push(`Ahorraste ${fmtPct(cur.rate)} de tus ingresos: vas por buen camino (la referencia común es 20%).`);
  else out.push(`Ahorraste ${fmtPct(cur.rate)} de tus ingresos. Una meta habitual es llegar al 20%.`);

  const cats = byCategory(inMonth(tx, key), 'gasto');
  if (cats.length) {
    out.push(`Tu mayor gasto es ${cats[0].category}: ${fmtMoney(cats[0].total)} (${fmtPct((cats[0].total / cur.expense) * 100)} de tus gastos).`);
  }

  const { totals: prev, partial } = prevTotals(tx, key);
  if (prev.expense > 0 && cur.expense > 0) {
    const dl = delta(cur.expense, prev.expense) ?? 0;
    out.push(`Tus gastos ${dl >= 0 ? 'subieron' : 'bajaron'} ${fmtPct(Math.abs(dl))} frente ${partial ? 'al mismo periodo del mes anterior' : 'al mes anterior'}.`);
  }

  const spent = new Map(cats.map((c) => [c.category, c.total]));
  const st = d.budgets.map((b) => ({ b, ...budgetStatus(spent.get(b.category) ?? 0, b.limit, d.settings.alertThreshold) }));
  const over = st.filter((x) => x.level === 'over').map((x) => x.b.category);
  const warn = st.filter((x) => x.level === 'warn').map((x) => x.b.category);
  if (over.length) out.push(`Superaste el presupuesto de ${over.join(', ')}.`);
  if (warn.length) out.push(`Estás cerca del límite en ${warn.join(', ')}.`);
  return out;
}
