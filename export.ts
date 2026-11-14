import type { AppData, Transaction } from '../types';
import { todayStr } from './format';

export function download(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const cell = (v: string) => {
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function toCSV(txs: Transaction[]) {
  const rows = [...txs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => [t.date, t.type, cell(t.category), cell(t.description), t.amount.toFixed(2)].join(','));
  return ['Fecha,Tipo,Categoría,Descripción,Monto', ...rows].join('\r\n');
}

export const exportCSV = (d: AppData) =>
  download(`movimientos-${todayStr()}.csv`, '﻿' + toCSV(d.transactions), 'text/csv;charset=utf-8');

export const exportJSON = (d: AppData) =>
  download(
    `respaldo-finanzas-${todayStr()}.json`,
    JSON.stringify({ ...d, exportedAt: new Date().toISOString() }, null, 2),
    'application/json',
  );

export const readFileText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
