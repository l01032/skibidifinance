import { useMemo, useState, type FormEvent } from 'react';
import { useStore } from '../store';
import { useUI } from '../uiState';
import type { Budget } from '../types';
import { Card, Empty, Field, Icon, Modal, MoneyInput, Progress, cx, useConfirm } from '../components/ui';
import { EXPENSE_CATEGORIES, categoryColor } from '../lib/constants';
import { budgetStatus, byCategory, inMonth } from '../lib/calc';
import { fmtMoney, fmtPct, parseAmount, round2, uid } from '../lib/format';

function BudgetForm({ budget, preset, onClose }: { budget?: Budget; preset?: string; onClose: () => void }) {
  const { data, actions } = useStore();
  const { toast } = useUI();
  const free = EXPENSE_CATEGORIES.map((c) => c.name).filter(
    (n) => n === budget?.category || !data.budgets.some((b) => b.category === n),
  );
  const [category, setCategory] = useState(budget?.category ?? (preset && free.includes(preset) ? preset : free[0] ?? ''));
  const [limit, setLimit] = useState(budget ? String(budget.limit) : '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = parseAmount(limit);
    const err: Record<string, string> = {};
    if (!category) err.category = 'Elige una categoría.';
    if (!limit.trim()) err.limit = 'Escribe el límite mensual.';
    else if (Number.isNaN(n) || n <= 0) err.limit = 'Monto inválido: usa solo números, con hasta 2 decimales.';
    setErrors(err);
    if (Object.keys(err).length) return;
    actions.saveBudget({ id: budget?.id ?? uid(), category, limit: n });
    toast(budget ? 'Presupuesto actualizado' : 'Presupuesto creado');
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={budget ? 'Editar presupuesto' : 'Nuevo presupuesto'}>
      {!free.length ? (
        <p className="text-sm text-muted">Ya tienes un presupuesto para todas las categorías.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Categoría" error={errors.category}>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)} disabled={!!budget}>
              {free.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Límite mensual (MXN)" error={errors.limit}>
            <MoneyInput value={limit} onChange={(e) => setLimit(e.target.value)} autoFocus />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Guardar
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

const LABEL = { ok: 'En rango', warn: 'Cerca del límite', over: 'Superado' } as const;
const CHIP = { ok: 'bg-accent/15 text-accent', warn: 'bg-warn/15 text-warn', over: 'bg-danger/15 text-danger' } as const;

export default function Budgets() {
  const { data, actions } = useStore();
  const { month, toast } = useUI();
  const [confirm, confirmNode] = useConfirm();
  const [form, setForm] = useState<{ budget?: Budget; preset?: string } | null>(null);
  const th = data.settings.alertThreshold;

  const spentMap = useMemo(
    () => new Map(byCategory(inMonth(data.transactions, month), 'gasto').map((c) => [c.category, c.total])),
    [data.transactions, month],
  );
  const rows = data.budgets
    .map((b) => {
      const spent = spentMap.get(b.category) ?? 0;
      return { b, spent, ...budgetStatus(spent, b.limit, th) };
    })
    .sort((a, b) => b.pct - a.pct);
  const unbudgeted = [...spentMap].filter(([c]) => !data.budgets.some((b) => b.category === c));
  const totalLimit = round2(rows.reduce((s, r) => s + r.b.limit, 0));
  const totalSpent = round2(rows.reduce((s, r) => s + r.spent, 0));
  const flagged = rows.filter((r) => r.level !== 'ok');

  const onDelete = async (b: Budget) => {
    if (
      await confirm({
        title: 'Eliminar presupuesto',
        message: `¿Eliminar el presupuesto de ${b.category}? Tus movimientos no se borran.`,
        confirmText: 'Eliminar',
      })
    ) {
      actions.deleteBudget(b.id);
      toast('Presupuesto eliminado');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs text-muted">
          Avisarme al llegar a
          <select
            className="input !w-auto py-1.5"
            value={th}
            onChange={(e) => actions.setSettings({ alertThreshold: Number(e.target.value) })}
          >
            {[60, 70, 80, 90].map((v) => (
              <option key={v} value={v}>
                {v}%
              </option>
            ))}
          </select>
        </label>
        <button className="btn-primary" onClick={() => setForm({})}>
          <Icon name="plus" />
          Nuevo presupuesto
        </button>
      </div>

      {flagged.length > 0 && (
        <div className="flex gap-3 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm" role="alert">
          <Icon name="alert" className="mt-0.5 text-warn" />
          <p>
            {flagged.map((r, i) => (
              <span key={r.b.id}>
                {i > 0 && ', '}
                <strong>{r.b.category}</strong> ({r.level === 'over' ? 'superado' : fmtPct(r.pct)})
              </span>
            ))}
            {flagged.length === 1 ? ' requiere' : ' requieren'} tu atención este mes.
          </p>
        </div>
      )}

      {!rows.length ? (
        <Card>
          <Empty
            icon="target"
            title="Sin presupuestos"
            text="Define cuánto quieres gastar como máximo en cada categoría y te avisaremos cuando te acerques al límite."
          >
            <button className="btn-primary mt-5" onClick={() => setForm({})}>
              <Icon name="plus" />
              Crear mi primer presupuesto
            </button>
          </Empty>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Presupuestado', fmtMoney(totalLimit), ''],
              ['Gastado en estas categorías', fmtMoney(totalSpent), ''],
              ['Restante', fmtMoney(totalLimit - totalSpent), totalLimit - totalSpent < 0 ? 'text-danger' : 'text-accent'],
            ].map(([l, v, tone]) => (
              <Card key={l} className="p-4">
                <p className="text-xs text-muted">{l}</p>
                <p className={cx('mt-1 text-xl font-semibold tabular-nums', tone)}>{v}</p>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((r) => (
              <Card key={r.b.id} className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: categoryColor(r.b.category) }} />
                    <h3 className="truncate font-medium">{r.b.category}</h3>
                    <span className={cx('rounded-full px-2 py-0.5 text-[11px] font-medium', CHIP[r.level])}>{LABEL[r.level]}</span>
                  </div>
                  <div className="flex shrink-0">
                    <button className="btn-icon" onClick={() => setForm({ budget: r.b })} aria-label={`Editar presupuesto de ${r.b.category}`}>
                      <Icon name="edit" />
                    </button>
                    <button className="btn-icon hover:text-danger" onClick={() => onDelete(r.b)} aria-label={`Eliminar presupuesto de ${r.b.category}`}>
                      <Icon name="trash" />
                    </button>
                  </div>
                </div>
                <p className="mt-4 text-sm tabular-nums">
                  <span className="text-lg font-semibold">{fmtMoney(r.spent)}</span>
                  <span className="text-muted"> de {fmtMoney(r.b.limit)}</span>
                </p>
                <Progress className="mt-3" pct={r.pct} level={r.level} />
                <div className="mt-2 flex justify-between text-xs text-muted">
                  <span>{fmtPct(r.pct)} usado</span>
                  <span className={r.level === 'over' ? 'text-danger' : ''}>
                    {r.level === 'over' ? `Excediste por ${fmtMoney(-r.remaining)}` : `Te quedan ${fmtMoney(r.remaining)}`}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {unbudgeted.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-1 font-medium">Gastos sin presupuesto este mes</h2>
          <ul className="divide-y divide-line">
            {unbudgeted.map(([c, v]) => (
              <li key={c} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: categoryColor(c) }} />
                  {c}
                </span>
                <span className="flex items-center gap-3">
                  <span className="tabular-nums">{fmtMoney(v)}</span>
                  {EXPENSE_CATEGORIES.some((x) => x.name === c) && (
                    <button className="btn-ghost py-1 text-xs" onClick={() => setForm({ preset: c })}>
                      Fijar límite
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {form && <BudgetForm budget={form.budget} preset={form.preset} onClose={() => setForm(null)} />}
      {confirmNode}
    </div>
  );
}
