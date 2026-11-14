import type { AppData, Budget, Contribution, Goal, Transaction } from '../types';
import { isValidDate, round2, uid } from './format';

export const STORAGE_KEY = 'finanzas:v1';

export const defaultData = (): AppData => ({
  version: 1,
  transactions: [],
  budgets: [],
  goals: [],
  settings: { initialBalance: 0, alertThreshold: 80, theme: 'dark' },
  isDemo: false,
});

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const pos = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 && v < 1e12 ? round2(v) : null);
const ident = (v: unknown) => (typeof v === 'string' && v ? v.slice(0, 64) : uid());
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Valida y limpia datos externos (localStorage o respaldos). Devuelve null si no parecen un respaldo. */
export function sanitize(raw: unknown): AppData | null {
  if (!isObj(raw) || !Array.isArray(raw.transactions)) return null;
  const base = defaultData();

  const transactions: Transaction[] = [];
  for (const r of arr(raw.transactions)) {
    if (!isObj(r)) continue;
    const amount = pos(r.amount);
    const category = str(r.category, 40);
    if ((r.type !== 'ingreso' && r.type !== 'gasto') || amount === null || !category || typeof r.date !== 'string' || !isValidDate(r.date)) continue;
    transactions.push({ id: ident(r.id), type: r.type, amount, category, description: str(r.description, 80), date: r.date });
  }

  const budgets: Budget[] = [];
  for (const r of arr(raw.budgets)) {
    if (!isObj(r)) continue;
    const limit = pos(r.limit);
    const category = str(r.category, 40);
    if (limit === null || !category || budgets.some((b) => b.category === category)) continue;
    budgets.push({ id: ident(r.id), category, limit });
  }

  const goals: Goal[] = [];
  for (const r of arr(raw.goals)) {
    if (!isObj(r)) continue;
    const target = pos(r.target);
    const name = str(r.name, 60);
    if (target === null || !name) continue;
    const contributions: Contribution[] = [];
    for (const c of arr(r.contributions)) {
      if (!isObj(c)) continue;
      const amount = pos(c.amount);
      if (amount === null || typeof c.date !== 'string' || !isValidDate(c.date)) continue;
      contributions.push({ id: ident(c.id), amount, date: c.date, note: str(c.note, 80) });
    }
    const deadline = typeof r.deadline === 'string' && isValidDate(r.deadline) ? r.deadline : '';
    goals.push({ id: ident(r.id), name, target, deadline, contributions });
  }

  const s = isObj(raw.settings) ? raw.settings : {};
  const threshold = typeof s.alertThreshold === 'number' && s.alertThreshold >= 50 && s.alertThreshold <= 100 ? Math.round(s.alertThreshold) : 80;
  return {
    version: 1,
    transactions,
    budgets,
    goals,
    settings: {
      initialBalance: typeof s.initialBalance === 'number' && Number.isFinite(s.initialBalance) ? round2(s.initialBalance) : base.settings.initialBalance,
      alertThreshold: threshold,
      theme: s.theme === 'light' ? 'light' : 'dark',
    },
    isDemo: raw.isDemo === true,
  };
}

export function load(): AppData {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return (s && sanitize(JSON.parse(s))) || defaultData();
  } catch {
    return defaultData();
  }
}

export function save(d: AppData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    return true;
  } catch {
    return false;
  }
}
