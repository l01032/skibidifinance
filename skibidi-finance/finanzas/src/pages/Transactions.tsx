import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { useUI } from '../uiState';
import type { Transaction, TxType } from '../types';
import { Card, Empty, Icon, Segmented, useConfirm } from '../components/ui';
import TxRow from '../components/TxRow';
import { byDateDesc, sumBy } from '../lib/calc';
import { fmtMoney, monthKey, monthLabel, relativeDate } from '../lib/format';

const PAGE = 50;

export default function Transactions() {
  const { data, actions } = useStore();
  const { openTxForm, toast } = useUI();
  const [confirm, confirmNode] = useConfirm();
  const [q, setQ] = useState('');
  const [type, setType] = useState<'todos' | TxType>('todos');
  const [cat, setCat] = useState('todas');
  const [mon, setMon] = useState('todos');
  const [limit, setLimit] = useState(PAGE);
  const { transactions } = data;

  const months = useMemo(() => [...new Set(transactions.map((t) => monthKey(t.date)))].sort().reverse(), [transactions]);
  const cats = useMemo(() => [...new Set(transactions.map((t) => t.category))].sort(), [transactions]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return transactions
      .filter(
        (t) =>
          (type === 'todos' || t.type === type) &&
          (cat === 'todas' || t.category === cat) &&
          (mon === 'todos' || monthKey(t.date) === mon) &&
          (!s || t.description.toLowerCase().includes(s) || t.category.toLowerCase().includes(s) || String(t.amount).includes(s)),
      )
      .sort(byDateDesc);
  }, [transactions, q, type, cat, mon]);

  const groups = useMemo(() => {
    const out: { date: string; items: Transaction[] }[] = [];
    for (const t of filtered.slice(0, limit)) {
      const g = out[out.length - 1];
      if (g && g.date === t.date) g.items.push(t);
      else out.push({ date: t.date, items: [t] });
    }
    return out;
  }, [filtered, limit]);

  const clearFilters = () => {
    setQ('');
    setType('todos');
    setCat('todas');
    setMon('todos');
    setLimit(PAGE);
  };
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setLimit(PAGE);
  };

  const onDelete = async (t: Transaction) => {
    const ok = await confirm({
      title: 'Eliminar movimiento',
      message: `¿Eliminar "${t.description || t.category}" por ${fmtMoney(t.amount)}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
    });
    if (ok) {
      actions.deleteTx(t.id);
      toast('Movimiento eliminado');
    }
  };

  if (!transactions.length) {
    return (
      <Card>
        <Empty icon="list" title="Sin movimientos" text="Aquí aparecerán tus ingresos y gastos para que puedas buscarlos, editarlos y filtrarlos.">
          <button className="btn-primary mt-5" onClick={() => openTxForm()}>
            <Icon name="plus" />
            Registrar el primero
          </button>
        </Empty>
      </Card>
    );
  }

  const income = sumBy(filtered, 'ingreso');
  const expense = sumBy(filtered, 'gasto');

  return (
    <div className="space-y-4">
      <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className="input pl-9"
            placeholder="Buscar por descripción, categoría o monto"
            value={q}
            onChange={(e) => reset(setQ)(e.target.value)}
            aria-label="Buscar movimientos"
          />
        </div>
        <Segmented
          value={type}
          onChange={reset(setType)}
          options={[
            { value: 'todos', label: 'Todos' },
            { value: 'ingreso', label: 'Ingresos' },
            { value: 'gasto', label: 'Gastos' },
          ]}
        />
        <select className="input lg:w-44" value={cat} onChange={(e) => reset(setCat)(e.target.value)} aria-label="Categoría">
          <option value="todas">Todas las categorías</option>
          {cats.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select className="input lg:w-44" value={mon} onChange={(e) => reset(setMon)(e.target.value)} aria-label="Mes">
          <option value="todos">Todos los meses</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-sm text-muted">
        <span>
          {filtered.length} {filtered.length === 1 ? 'movimiento' : 'movimientos'}
        </span>
        <span className="tabular-nums">
          <span className="text-accent">+{fmtMoney(income)}</span> · <span className="text-fg">−{fmtMoney(expense)}</span>
        </span>
      </div>

      {!filtered.length ? (
        <Card>
          <Empty icon="search" title="Sin resultados" text="Ningún movimiento coincide con los filtros actuales.">
            <button className="btn-ghost mt-4" onClick={clearFilters}>
              Limpiar filtros
            </button>
          </Empty>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <Card key={g.date} className="px-4 pb-1 pt-3">
              <h3 className="text-xs font-medium text-muted">{relativeDate(g.date)}</h3>
              <ul className="divide-y divide-line">
                {g.items.map((t) => (
                  <TxRow key={t.id} tx={t} onEdit={(x) => openTxForm({ tx: x })} onDelete={onDelete} />
                ))}
              </ul>
            </Card>
          ))}
          {filtered.length > limit && (
            <div className="text-center">
              <button className="btn-ghost" onClick={() => setLimit((l) => l + PAGE)}>
                Mostrar más ({filtered.length - limit} restantes)
              </button>
            </div>
          )}
        </div>
      )}
      {confirmNode}
    </div>
  );
}
