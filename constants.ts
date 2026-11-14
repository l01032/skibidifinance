import type { TxType } from '../types';

export interface Category {
  name: string;
  color: string;
}

export const EXPENSE_CATEGORIES: Category[] = [
  { name: 'Comida', color: '#f59e0b' },
  { name: 'Transporte', color: '#38bdf8' },
  { name: 'Vivienda', color: '#a78bfa' },
  { name: 'Servicios', color: '#2dd4bf' },
  { name: 'Salud', color: '#fb7185' },
  { name: 'Entretenimiento', color: '#f472b6' },
  { name: 'Educación', color: '#818cf8' },
  { name: 'Compras', color: '#fb923c' },
  { name: 'Suscripciones', color: '#94a3b8' },
  { name: 'Otros', color: '#64748b' },
];

export const INCOME_CATEGORIES: Category[] = [
  { name: 'Salario', color: '#22c55e' },
  { name: 'Freelance', color: '#34d399' },
  { name: 'Ventas', color: '#4ade80' },
  { name: 'Inversiones', color: '#86efac' },
  { name: 'Regalos', color: '#a3e635' },
  { name: 'Otros', color: '#64748b' },
];

export const categoriesFor = (t: TxType) => (t === 'ingreso' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES);

export const categoryColor = (name: string) =>
  [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].find((c) => c.name === name)?.color ?? '#64748b';
