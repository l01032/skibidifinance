import type { AppData, Contribution, Theme, Transaction } from '../types';
import { addMonths, currentMonth, daysInMonth, round2, todayStr, uid } from './format';
import { defaultData } from './storage';

/** Datos de ejemplo generados al vuelo (determinísticos) sobre los últimos 6 meses. */
export function buildDemo(theme: Theme = 'dark'): AppData {
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const between = (a: number, b: number) => Math.round(a + rnd() * (b - a));
  const today = todayStr();
  const cur = currentMonth();
  const dateOf = (key: string, day: number) => `${key}-${String(Math.min(day, daysInMonth(key))).padStart(2, '0')}`;

  const transactions: Transaction[] = [];
  const tx = (key: string, day: number, type: Transaction['type'], category: string, description: string, amount: number) => {
    const date = dateOf(key, day);
    if (date <= today) transactions.push({ id: uid(), type, amount: round2(amount), category, description, date });
  };

  for (let i = 5; i >= 0; i--) {
    const k = addMonths(cur, -i);
    tx(k, 1, 'ingreso', 'Salario', 'Quincena', 12500);
    tx(k, 15, 'ingreso', 'Salario', 'Quincena', 12500);
    if (rnd() > 0.5) tx(k, between(5, 25), 'ingreso', 'Freelance', 'Proyecto freelance', between(1500, 4000));
    tx(k, 1, 'gasto', 'Vivienda', 'Renta', 6500);
    tx(k, 8, 'gasto', 'Servicios', 'Internet', 499);
    tx(k, 12, 'gasto', 'Servicios', 'Luz', between(380, 700));
    tx(k, 20, 'gasto', 'Servicios', 'Agua y gas', between(250, 450));
    tx(k, 5, 'gasto', 'Suscripciones', 'Netflix', 219);
    tx(k, 9, 'gasto', 'Suscripciones', 'Spotify', 129);
    for (let w = 0; w < 4; w++) tx(k, 3 + w * 7, 'gasto', 'Comida', 'Supermercado', between(650, 1400));
    for (let n = 0; n < 4; n++) tx(k, between(2, 28), 'gasto', 'Comida', 'Restaurante', between(140, 480));
    for (let n = 0; n < 2; n++) tx(k, between(2, 28), 'gasto', 'Transporte', 'Gasolina', between(450, 700));
    for (let n = 0; n < 3; n++) tx(k, between(2, 28), 'gasto', 'Transporte', 'Uber', between(70, 220));
    for (let n = 0; n < 2; n++) tx(k, between(2, 28), 'gasto', 'Entretenimiento', n ? 'Salida con amigos' : 'Cine', between(150, 600));
    tx(k, between(2, 28), 'gasto', 'Compras', 'Ropa', between(300, 1400));
    if (rnd() > 0.5) tx(k, between(2, 28), 'gasto', 'Salud', 'Farmacia', between(150, 500));
  }

  const contribs = (amount: number, day: number, months: number, note: string): Contribution[] =>
    Array.from({ length: months }, (_, i) => dateOf(addMonths(cur, -(months - 1 - i)), day))
      .filter((date) => date <= today)
      .map((date) => ({ id: uid(), amount, date, note }));

  const base = defaultData();
  return {
    ...base,
    transactions,
    budgets: [
      { id: uid(), category: 'Comida', limit: 5500 },
      { id: uid(), category: 'Transporte', limit: 1800 },
      { id: uid(), category: 'Entretenimiento', limit: 1200 },
      { id: uid(), category: 'Suscripciones', limit: 400 },
      { id: uid(), category: 'Compras', limit: 1500 },
      { id: uid(), category: 'Servicios', limit: 1500 },
    ],
    goals: [
      { id: uid(), name: 'Fondo de emergencia', target: 60000, deadline: '', contributions: contribs(2000, 16, 6, 'Aportación mensual') },
      {
        id: uid(),
        name: 'Vacaciones en Oaxaca',
        target: 15000,
        deadline: `${addMonths(cur, 6)}-15`,
        contributions: contribs(1000, 17, 3, 'Ahorro para el viaje'),
      },
    ],
    settings: { initialBalance: 5000, alertThreshold: 80, theme },
    isDemo: true,
  };
}
