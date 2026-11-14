import { useState, type FormEvent } from 'react';
import { useStore } from '../store';
import { useUI } from '../uiState';
import type { Goal } from '../types';
import { Card, Empty, Field, Icon, Modal, MoneyInput, Progress, useConfirm } from '../components/ui';
import { available, goalSaved } from '../lib/calc';
import { fmtDate, fmtMoney, fmtPct, isValidDate, parseAmount, parseDate, todayStr, uid } from '../lib/format';

function GoalForm({ goal, onClose }: { goal?: Goal; onClose: () => void }) {
  const { actions } = useStore();
  const { toast } = useUI();
  const [name, setName] = useState(goal?.name ?? '');
  const [target, setTarget] = useState(goal ? String(goal.target) : '');
  const [deadline, setDeadline] = useState(goal?.deadline ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = parseAmount(target);
    const err: Record<string, string> = {};
    if (!name.trim()) err.name = 'Ponle un nombre a tu meta.';
    if (!target.trim()) err.target = 'Escribe la cantidad objetivo.';
    else if (Number.isNaN(n) || n <= 0) err.target = 'Monto inválido: usa solo números, con hasta 2 decimales.';
    if (deadline && !isValidDate(deadline)) err.deadline = 'Fecha inválida.';
    setErrors(err);
    if (Object.keys(err).length) return;
    actions.saveGoal({ id: goal?.id ?? uid(), name: name.trim(), target: n, deadline });
    toast(goal ? 'Meta actualizada' : 'Meta creada');
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={goal ? 'Editar meta' : 'Nueva meta de ahorro'}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Nombre" error={errors.name}>
          <input className="input" value={name} maxLength={60} placeholder="Ej. Fondo de emergencia" onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Cantidad objetivo (MXN)" error={errors.target}>
          <MoneyInput value={target} onChange={(e) => setTarget(e.target.value)} />
        </Field>
        <Field label="Fecha límite (opcional)" error={errors.deadline} hint="Con una fecha te calculamos cuánto aportar al mes.">
          <input type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
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
    </Modal>
  );
}

function ContributionForm({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const { data, actions } = useStore();
  const { toast } = useUI();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const avail = available(data);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = parseAmount(amount);
    const err: Record<string, string> = {};
    if (!amount.trim()) err.amount = 'Escribe la cantidad a aportar.';
    else if (Number.isNaN(n) || n <= 0) err.amount = 'Monto inválido: usa solo números, con hasta 2 decimales.';
    if (!isValidDate(date)) err.date = 'Elige una fecha válida.';
    setErrors(err);
    if (Object.keys(err).length) return;
    actions.addContribution(goal.id, { id: uid(), amount: n, date, note: note.trim() });
    toast(n > avail ? 'Aportación guardada, pero superó tu dinero disponible.' : 'Aportación registrada', n > avail ? 'warn' : 'ok');
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={`Aportar a ${goal.name}`}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Cantidad (MXN)" error={errors.amount} hint={`Dinero disponible: ${fmtMoney(avail)}`}>
          <MoneyInput value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha" error={errors.date}>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Nota (opcional)">
            <input className="input" value={note} maxLength={80} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary">
            Registrar aportación
          </button>
        </div>
      </form>
    </Modal>
  );
}

function monthsUntil(deadline: string) {
  const d = parseDate(deadline);
  const t = new Date();
  return (d.getFullYear() - t.getFullYear()) * 12 + (d.getMonth() - t.getMonth());
}

export default function Savings() {
  const { data, actions } = useStore();
  const { toast } = useUI();
  const [confirm, confirmNode] = useConfirm();
  const [goalForm, setGoalForm] = useState<{ goal?: Goal } | null>(null);
  const [contrib, setContrib] = useState<Goal | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const onDeleteGoal = async (g: Goal) => {
    if (
      await confirm({
        title: 'Eliminar meta',
        message: `¿Eliminar "${g.name}"? Sus ${g.contributions.length} aportaciones se borrarán y ${fmtMoney(goalSaved(g))} volverán a tu dinero disponible.`,
        confirmText: 'Eliminar',
      })
    ) {
      actions.deleteGoal(g.id);
      toast('Meta eliminada');
    }
  };

  const onDeleteContribution = async (g: Goal, id: string, amount: number) => {
    if (
      await confirm({
        title: 'Eliminar aportación',
        message: `¿Eliminar la aportación de ${fmtMoney(amount)}? Ese dinero volverá a tu disponible.`,
        confirmText: 'Eliminar',
      })
    ) {
      actions.deleteContribution(g.id, id);
      toast('Aportación eliminada');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setGoalForm({})}>
          <Icon name="plus" />
          Nueva meta
        </button>
      </div>

      {!data.goals.length ? (
        <Card>
          <Empty icon="flag" title="Sin metas de ahorro" text="Crea una meta, registra aportaciones y mira cuánto falta para lograrla.">
            <button className="btn-primary mt-5" onClick={() => setGoalForm({})}>
              <Icon name="plus" />
              Crear mi primera meta
            </button>
          </Empty>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {data.goals.map((g) => {
            const saved = goalSaved(g);
            const pct = (saved / g.target) * 100;
            const remaining = Math.max(g.target - saved, 0);
            const done = saved >= g.target;
            const overdue = !!g.deadline && g.deadline < todayStr();
            const perMonth = g.deadline && !overdue && !done ? remaining / Math.max(monthsUntil(g.deadline), 1) : 0;
            const history = [...g.contributions].sort((a, b) => b.date.localeCompare(a.date));
            return (
              <Card key={g.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-medium">{g.name}</h3>
                    <p className="text-xs text-muted">{g.deadline ? `Para el ${fmtDate(g.deadline)}` : 'Sin fecha límite'}</p>
                  </div>
                  <div className="flex shrink-0">
                    <button className="btn-icon" onClick={() => setGoalForm({ goal: g })} aria-label={`Editar ${g.name}`}>
                      <Icon name="edit" />
                    </button>
                    <button className="btn-icon hover:text-danger" onClick={() => onDeleteGoal(g)} aria-label={`Eliminar ${g.name}`}>
                      <Icon name="trash" />
                    </button>
                  </div>
                </div>
                <p className="mt-4 text-2xl font-semibold tabular-nums">
                  {fmtMoney(saved)} <span className="text-sm font-normal text-muted">de {fmtMoney(g.target)}</span>
                </p>
                <Progress className="mt-3" pct={pct} />
                <div className="mt-2 flex justify-between text-xs text-muted">
                  <span>{fmtPct(Math.min(pct, 100))}</span>
                  <span className={done ? 'text-accent' : ''}>{done ? '¡Meta alcanzada!' : `Faltan ${fmtMoney(remaining)}`}</span>
                </div>
                {perMonth > 0 && (
                  <p className="mt-3 rounded-lg bg-raised px-3 py-2 text-xs">
                    Para llegar a tiempo, aporta unos <strong className="tabular-nums">{fmtMoney(perMonth)}</strong> al mes.
                  </p>
                )}
                {overdue && !done && (
                  <p className="mt-3 rounded-lg bg-warn/10 px-3 py-2 text-xs text-warn">La fecha límite ya pasó. Puedes editarla.</p>
                )}
                <div className="mt-auto flex gap-2 pt-4">
                  <button className="btn-primary flex-1" onClick={() => setContrib(g)}>
                    <Icon name="plus" />
                    Aportar
                  </button>
                  <button className="btn-ghost" onClick={() => setOpen(open === g.id ? null : g.id)} aria-expanded={open === g.id}>
                    Historial ({g.contributions.length})
                    <Icon name="chevD" className={open === g.id ? 'rotate-180 transition' : 'transition'} />
                  </button>
                </div>
                {open === g.id && (
                  <ul className="mt-3 animate-fade-in divide-y divide-line border-t border-line">
                    {history.length ? (
                      history.map((c) => (
                        <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                          <div className="min-w-0">
                            <p className="tabular-nums">{fmtMoney(c.amount)}</p>
                            <p className="truncate text-xs text-muted">
                              {fmtDate(c.date)}
                              {c.note && ` · ${c.note}`}
                            </p>
                          </div>
                          <button className="btn-icon hover:text-danger" onClick={() => onDeleteContribution(g, c.id, c.amount)} aria-label="Eliminar aportación">
                            <Icon name="trash" />
                          </button>
                        </li>
                      ))
                    ) : (
                      <li className="py-3 text-center text-xs text-muted">Aún no hay aportaciones.</li>
                    )}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {goalForm && <GoalForm goal={goalForm.goal} onClose={() => setGoalForm(null)} />}
      {contrib && <ContributionForm goal={contrib} onClose={() => setContrib(null)} />}
      {confirmNode}
    </div>
  );
}
