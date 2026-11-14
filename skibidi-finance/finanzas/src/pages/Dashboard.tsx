import { useMemo } from 'react';
import { useStore } from '../store';
import { useUI } from '../uiState';
import { Card, Delta, Empty, Icon, Logo, Progress, cx } from '../components/ui';
import { BarChart, Ring } from '../components/charts';
import TxRow from '../components/TxRow';
import { addMonths, fmtMoney, fmtPct, monthLabel } from '../lib/format';
import {
  available,
  budgetStatus,
  buildSummary,
  byCategory,
  byDateDesc,
  delta,
  inMonth,
  monthRange,
  totalSaved,
  totalsFor,
} from '../lib/calc';
import { useCountUp } from '../lib/hooks';
import { buildDemo } from '../lib/demo';

export default function Dashboard() {
  const { data, actions } = useStore();
  const { month, openTxForm } = useUI();
  const { transactions, budgets, goals, settings } = data;

  const avail = available(data);
  const shown = useCountUp(avail);
  const saved = totalSaved(goals);
  const cur = totalsFor(transactions, month);
  const prev = totalsFor(transactions, addMonths(month, -1));

  const chart = useMemo(
    () =>
      monthRange(month, 6).map((k) => {
        const t = totalsFor(transactions, k);
        return { label: monthLabel(k, 'short'), a: t.income, b: t.expense };
      }),
    [transactions, month],
  );
  const recent = useMemo(() => [...transactions].sort(byDateDesc).slice(0, 6), [transactions]);
  const alerts = useMemo(() => {
    const spent = new Map(byCategory(inMonth(transactions, month), 'gasto').map((c) => [c.category, c.total]));
    return budgets
      .map((b) => ({ b, spent: spent.get(b.category) ?? 0, ...budgetStatus(spent.get(b.category) ?? 0, b.limit, settings.alertThreshold) }))
      .filter((x) => x.level !== 'ok')
      .sort((a, b) => b.pct - a.pct);
  }, [transactions, budgets, month, settings.alertThreshold]);
  const summary = useMemo(() => buildSummary(data, month), [data, month]);

  if (!transactions.length && !budgets.length && !goals.length) {
    return (
      <Card className="mx-auto max-w-xl p-6">
        <Logo size={72} className="mx-auto mb-2" />
        <Empty
          icon="wallet"
          title="Empieza con tu primer movimiento"
          text="Registra un ingreso o un gasto y el panel se llenará solo. Si prefieres explorar primero, carga datos de demostración; puedes borrarlos cuando quieras."
        >
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button className="btn-primary" onClick={() => openTxForm()}>
              <Icon name="plus" />
              Registrar movimiento
            </button>
            <button className="btn-ghost" onClick={() => actions.replace(buildDemo(settings.theme))}>
              <Icon name="sparkles" />
              Cargar datos de demostración
            </button>
          </div>
        </Empty>
        <p className="pb-2 text-center text-xs text-muted">
          ¿Ya tienes dinero en tu cuenta?{' '}
          <a className="underline hover:text-fg" href="#/herramientas/datos">
            Define tu saldo inicial
          </a>
          .
        </p>
      </Card>
    );
  }

  const kpis = [
    { label: 'Ingresos del mes', value: cur.income, d: delta(cur.income, prev.income), good: 'up' as const, tone: 'text-accent' },
    { label: 'Gastos del mes', value: cur.expense, d: delta(cur.expense, prev.expense), good: 'down' as const, tone: '' },
    { label: 'Balance neto', value: cur.net, d: delta(cur.net, prev.net), good: 'up' as const, tone: cur.net < 0 ? 'text-danger' : '' },
  ];
  const rateText =
    cur.income === 0
      ? 'Registra un ingreso este mes para calcularlo.'
      : cur.rate >= 20
        ? 'Vas muy bien: superas el 20% recomendado.'
        : cur.rate > 0
          ? 'Una meta habitual es ahorrar el 20% de tus ingresos.'
          : 'Este mes gastas más de lo que ingresas.';

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="relative overflow-hidden p-6 lg:col-span-2">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
        <p className="text-sm text-muted">Dinero disponible</p>
        <p className={cx('mt-2 text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl', avail < 0 && 'text-danger')}>
          {fmtMoney(shown)}
        </p>
        <p className="mt-2 text-xs text-muted">
          Saldo inicial {fmtMoney(settings.initialBalance)} + ingresos − gastos − {fmtMoney(saved)} apartados en metas ·{' '}
          <a className="underline hover:text-fg" href="#/herramientas/datos">
            Editar saldo inicial
          </a>
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => openTxForm({ type: 'ingreso' })}>
            <Icon name="arrowDown" />
            Registrar ingreso
          </button>
          <button className="btn-ghost" onClick={() => openTxForm({ type: 'gasto' })}>
            <Icon name="arrowUp" />
            Registrar gasto
          </button>
        </div>
      </Card>

      <Card className="flex items-center gap-5 p-6">
        <Ring pct={cur.rate}>
          <span className="text-lg font-semibold tabular-nums">{cur.income > 0 ? fmtPct(Math.max(cur.rate, 0)) : '—'}</span>
        </Ring>
        <div>
          <p className="text-sm text-muted">Ahorro del mes</p>
          <p className="mt-1 text-sm">{rateText}</p>
        </div>
      </Card>

      {kpis.map((k, i) => (
        <Card key={k.label} className="animate-fade-up p-5" style={{ animationDelay: `${i * 50}ms` }}>
          <p className="text-sm text-muted">{k.label}</p>
          <p className={cx('mt-1.5 text-2xl font-semibold tabular-nums', k.tone)}>{fmtMoney(k.value)}</p>
          <div className="mt-1.5">
            <Delta value={k.d} good={k.good} />
          </div>
        </Card>
      ))}

      <Card className="p-5 lg:col-span-2">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium">Ingresos y gastos</h2>
          <div className="flex gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent" />
              Ingresos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-danger" />
              Gastos
            </span>
          </div>
        </div>
        <BarChart data={chart} aName="Ingresos" bName="Gastos" aColor="rgb(var(--accent))" bColor="rgb(var(--danger))" />
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-medium">Resumen del mes</h2>
        <ul className="space-y-2.5 text-sm">
          {summary.map((s) => (
            <li key={s} className="flex gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5 lg:col-span-2">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-medium">Últimos movimientos</h2>
          <a href="#/movimientos" className="text-xs text-muted hover:text-fg">
            Ver todos
          </a>
        </div>
        {recent.length ? (
          <ul className="divide-y divide-line">
            {recent.map((t) => (
              <TxRow key={t.id} tx={t} onEdit={(x) => openTxForm({ tx: x })} />
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-muted">Aún no hay movimientos.</p>
        )}
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Presupuestos</h2>
          <a href="#/presupuestos" className="text-xs text-muted hover:text-fg">
            Administrar
          </a>
        </div>
        {!budgets.length ? (
          <p className="text-sm text-muted">Fija límites por categoría para evitar gastar de más.</p>
        ) : !alerts.length ? (
          <p className="flex items-center gap-2 text-sm">
            <Icon name="check" className="text-accent" />
            Todo en orden este mes.
          </p>
        ) : (
          <ul className="space-y-4">
            {alerts.map((a) => (
              <li key={a.b.id}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-medium">{a.b.category}</span>
                  <span className={cx('tabular-nums', a.level === 'over' ? 'text-danger' : 'text-warn')}>{fmtPct(a.pct)}</span>
                </div>
                <Progress pct={a.pct} level={a.level} />
                <p className="mt-1 text-xs text-muted">
                  {a.level === 'over' ? `Excediste por ${fmtMoney(-a.remaining)}` : `Te quedan ${fmtMoney(a.remaining)}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
