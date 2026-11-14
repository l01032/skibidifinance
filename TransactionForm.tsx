import { useMemo, useState, type FormEvent } from 'react';
import type { Transaction, TxType } from '../types';
import { categoriesFor } from '../lib/constants';
import { fmtMoney, isValidDate, monthKey, parseAmount, round2, todayStr, uid } from '../lib/format';
import { useStore } from '../store';
import { useUI } from '../uiState';
import { Field, Modal, MoneyInput, cx } from './ui';

export default function TransactionForm({
  tx,
  initialType,
  onClose,
}: {
  tx?: Transaction;
  initialType?: TxType;
  onClose: () => void;
}) {
  const { data, actions } = useStore();
  const { toast } = useUI();
  const [type, setType] = useState<TxType>(tx?.type ?? initialType ?? 'gasto');
  const [amount, setAmount] = useState(tx ? String(tx.amount) : '');
  const [category, setCategory] = useState(tx?.category ?? categoriesFor(tx?.type ?? initialType ?? 'gasto')[0].name);
  const [description, setDescription] = useState(tx?.description ?? '');
  const [date, setDate] = useState(tx?.date ?? todayStr());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const options = useMemo(() => {
    const base = categoriesFor(type).map((c) => c.name);
    return category && !base.includes(category) ? [category, ...base] : base;
  }, [type, category]);

  const changeType = (t: TxType) => {
    setType(t);
    const names = categoriesFor(t).map((c) => c.name);
    if (!names.includes(category)) setCategory(names[0]);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = parseAmount(amount);
    const err: Record<string, string> = {};
    if (!amount.trim()) err.amount = 'Escribe un monto.';
    else if (Number.isNaN(n) || n <= 0) err.amount = 'Monto inválido: usa solo números, con hasta 2 decimales.';
    else if (n > 999_999_999) err.amount = 'El monto es demasiado grande.';
    if (!category) err.category = 'Elige una categoría.';
    if (!isValidDate(date)) err.date = 'Elige una fecha válida.';
    if (description.length > 80) err.description = 'Máximo 80 caracteres.';
    setErrors(err);
    if (Object.keys(err).length) return;

    const next: Transaction = { id: tx?.id ?? uid(), type, amount: n, category, description: description.trim(), date };

    let warn = '';
    const budget = type === 'gasto' ? data.budgets.find((b) => b.category === category) : undefined;
    if (budget) {
      const key = monthKey(date);
      const before = round2(
        data.transactions
          .filter((t) => t.id !== next.id && t.type === 'gasto' && t.category === category && monthKey(t.date) === key)
          .reduce((s, t) => s + t.amount, 0),
      );
      const after = round2(before + n);
      const th = data.settings.alertThreshold;
      if (after >= budget.limit && before < budget.limit) {
        warn = `Superaste tu presupuesto de ${category} (${fmtMoney(budget.limit)}).`;
      } else if ((after / budget.limit) * 100 >= th && (before / budget.limit) * 100 < th) {
        warn = `Ya usaste ${Math.round((after / budget.limit) * 100)}% de tu presupuesto de ${category}.`;
      }
    }

    if (tx) actions.updateTx(next);
    else actions.addTx(next);
    toast(warn || (tx ? 'Movimiento actualizado' : 'Movimiento guardado'), warn ? 'warn' : 'ok');
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={tx ? 'Editar movimiento' : 'Nuevo movimiento'}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-bg p-1">
          {(['gasto', 'ingreso'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => changeType(t)}
              className={cx(
                'rounded-lg py-2 text-sm font-medium capitalize transition',
                type === t ? (t === 'ingreso' ? 'bg-accent text-accent-ink' : 'bg-fg/10 text-fg') : 'text-muted hover:text-fg',
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <Field label="Monto (MXN)" error={errors.amount}>
          <MoneyInput value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoría" error={errors.category}>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {options.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Fecha" error={errors.date}>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Descripción (opcional)" error={errors.description}>
          <input
            className="input"
            value={description}
            maxLength={80}
            placeholder={type === 'gasto' ? 'Ej. Despensa de la semana' : 'Ej. Quincena'}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary">
            {tx ? 'Guardar cambios' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
