import { useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useStore } from '../store';
import { useUI } from '../uiState';
import { Card, Empty, Field, Icon, MoneyInput, Segmented, cx, useConfirm } from '../components/ui';
import { LineChart } from '../components/charts';
import { available, averageNet, futureValue, requiredMonthly, totalSaved, totalsFor } from '../lib/calc';
import { addMonths, currentMonth, fmtMoney, fmtPct, monthLabel, parseAmount, toNum } from '../lib/format';
import { buildDemo } from '../lib/demo';
import { exportCSV, exportJSON, readFileText } from '../lib/export';
import { sanitize } from '../lib/storage';

const TABS = [
  { id: 'calculadora', label: 'Calculadora' },
  { id: 'simulador', label: 'Simulador' },
  { id: 'proyeccion', label: 'Proyección' },
  { id: 'datos', label: 'Datos y respaldo' },
] as const;

export default function Tools({ tab }: { tab: string }) {
  const active = TABS.find((t) => t.id === tab)?.id ?? 'calculadora';
  return (
    <div className="space-y-4">
      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1" aria-label="Herramientas">
        {TABS.map((t) => (
          <a
            key={t.id}
            href={`#/herramientas/${t.id}`}
            className={cx(
              'whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition',
              active === t.id ? 'bg-fg/10 text-fg' : 'text-muted hover:text-fg',
            )}
          >
            {t.label}
          </a>
        ))}
      </nav>
      {active === 'calculadora' && <Calculator />}
      {active === 'simulador' && <Simulator />}
      {active === 'proyeccion' && <Projection />}
      {active === 'datos' && <DataPanel />}
    </div>
  );
}

function Num({ label, value, onChange, prefix, suffix }: { label: string; value: string; onChange: (v: string) => void; prefix?: string; suffix?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">{prefix}</span>}
        <input
          className={cx('input tabular-nums', prefix && 'pl-7', suffix && 'pr-14')}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">{suffix}</span>}
      </div>
    </label>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-raised p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={cx('mt-1 text-xl font-semibold tabular-nums', accent && 'text-accent')}>{value}</p>
    </div>
  );
}

function Calculator() {
  const { data } = useStore();
  const [kind, setKind] = useState<'compuesto' | 'meta' | 'regla'>('compuesto');
  const [c, setC] = useState({ initial: '0', monthly: '1000', rate: '5', years: '5' });
  const [m, setM] = useState({ target: '50000', current: '0', months: '12', rate: '0' });
  const monthIncome = totalsFor(data.transactions, currentMonth()).income;
  const [income, setIncome] = useState(monthIncome > 0 ? String(monthIncome) : '');

  const months = Math.max(0, Math.round(toNum(c.years) * 12));
  const fv = futureValue(toNum(c.initial), toNum(c.monthly), toNum(c.rate), months);
  const contributed = toNum(c.initial) + toNum(c.monthly) * months;
  const need = requiredMonthly(toNum(m.target), toNum(m.current), toNum(m.rate), Math.round(toNum(m.months)));
  const inc = toNum(income);

  return (
    <Card className="p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-medium">Calculadora financiera</h2>
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { value: 'compuesto', label: 'Interés compuesto' },
            { value: 'meta', label: 'Meta de ahorro' },
            { value: 'regla', label: 'Regla 50/30/20' },
          ]}
        />
      </div>

      {kind === 'compuesto' && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="grid grid-cols-2 gap-3">
            <Num label="Capital inicial" prefix="$" value={c.initial} onChange={(v) => setC({ ...c, initial: v })} />
            <Num label="Aportación mensual" prefix="$" value={c.monthly} onChange={(v) => setC({ ...c, monthly: v })} />
            <Num label="Rendimiento anual (supuesto)" suffix="%" value={c.rate} onChange={(v) => setC({ ...c, rate: v })} />
            <Num label="Plazo" suffix="años" value={c.years} onChange={(v) => setC({ ...c, years: v })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Stat label="Valor final estimado" value={fmtMoney(fv)} accent />
            </div>
            <Stat label="Total aportado" value={fmtMoney(contributed)} />
            <Stat label="Intereses ganados" value={fmtMoney(Math.max(fv - contributed, 0))} />
          </div>
        </div>
      )}

      {kind === 'meta' && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="grid grid-cols-2 gap-3">
            <Num label="Cantidad objetivo" prefix="$" value={m.target} onChange={(v) => setM({ ...m, target: v })} />
            <Num label="Ya tengo ahorrado" prefix="$" value={m.current} onChange={(v) => setM({ ...m, current: v })} />
            <Num label="Plazo" suffix="meses" value={m.months} onChange={(v) => setM({ ...m, months: v })} />
            <Num label="Rendimiento anual (supuesto)" suffix="%" value={m.rate} onChange={(v) => setM({ ...m, rate: v })} />
          </div>
          <div className="grid grid-cols-1 gap-3">
            <Stat label="Debes ahorrar cada mes" value={fmtMoney(need)} accent />
            <Stat label="Total que aportarías" value={fmtMoney(need * Math.max(Math.round(toNum(m.months)), 0))} />
          </div>
        </div>
      )}

      {kind === 'regla' && (
        <div className="space-y-4">
          <div className="max-w-xs">
            <Num label="Ingreso mensual neto" prefix="$" value={income} onChange={setIncome} />
          </div>
          {inc > 0 ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="50% · Necesidades" value={fmtMoney(inc * 0.5)} />
              <Stat label="30% · Gustos" value={fmtMoney(inc * 0.3)} />
              <Stat label="20% · Ahorro" value={fmtMoney(inc * 0.2)} accent />
            </div>
          ) : (
            <p className="text-sm text-muted">Escribe tu ingreso mensual para ver cómo repartirlo.</p>
          )}
          <p className="text-xs text-muted">Es una guía general, no una regla obligatoria: ajústala a tu situación.</p>
        </div>
      )}
    </Card>
  );
}

function Simulator() {
  const { data } = useStore();
  const [monthly, setMonthly] = useState('1000');
  const [rate, setRate] = useState(5);
  const [months, setMonths] = useState(24);
  const avg = useMemo(() => averageNet(data), [data]);
  const amount = Math.max(toNum(monthly), 0);

  const labels = useMemo(() => Array.from({ length: months + 1 }, (_, i) => `Mes ${i}`), [months]);
  const plain = useMemo(() => labels.map((_, i) => amount * i), [labels, amount]);
  const grown = useMemo(() => labels.map((_, i) => futureValue(0, amount, rate, i)), [labels, amount, rate]);

  return (
    <Card className="p-5">
      <h2 className="mb-1 font-medium">Simulador de ahorro</h2>
      <p className="mb-5 text-xs text-muted">Mueve los controles para ver cómo crecería tu ahorro. El rendimiento es un supuesto que tú defines, no una tasa real.</p>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Field label="Ahorro mensual (MXN)">
            <MoneyInput value={monthly} onChange={(e) => setMonthly(e.target.value)} />
          </Field>
          <input
            type="range"
            min={0}
            max={30000}
            step={100}
            value={Math.min(amount, 30000)}
            onChange={(e) => setMonthly(e.target.value)}
            className="mt-3 w-full accent-[rgb(var(--accent))]"
            aria-label="Ahorro mensual"
          />
          {avg && avg.net > 0 && (
            <button className="mt-2 text-xs text-accent hover:underline" onClick={() => setMonthly(String(Math.round(avg.net)))}>
              Usar mi promedio real ({fmtMoney(avg.net)})
            </button>
          )}
        </div>
        <div>
          <span className="label">Rendimiento anual: {fmtPct(rate, 1)}</span>
          <input type="range" min={0} max={15} step={0.5} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-full accent-[rgb(var(--accent))]" aria-label="Rendimiento anual" />
        </div>
        <div>
          <span className="label">Plazo: {months} meses</span>
          <input type="range" min={6} max={120} step={6} value={months} onChange={(e) => setMonths(Number(e.target.value))} className="w-full accent-[rgb(var(--accent))]" aria-label="Plazo en meses" />
        </div>
      </div>

      <div className="my-5 grid gap-3 sm:grid-cols-3">
        <Stat label={`Al mes ${months} con rendimiento`} value={fmtMoney(grown[months])} accent />
        <Stat label="Solo con tus aportaciones" value={fmtMoney(plain[months])} />
        <Stat label="Diferencia por rendimiento" value={fmtMoney(grown[months] - plain[months])} />
      </div>
      <LineChart
        labels={labels}
        series={[
          { name: 'Solo aportaciones', color: 'rgb(var(--muted))', values: plain, dashed: true },
          { name: 'Con rendimiento', color: 'rgb(var(--accent))', values: grown, area: true },
        ]}
      />
    </Card>
  );
}

function Projection() {
  const { data } = useStore();
  const avg = useMemo(() => averageNet(data), [data]);
  const start = available(data) + totalSaved(data.goals);

  if (!avg) {
    return (
      <Card>
        <Empty icon="chart" title="Aún no hay datos para proyectar" text="Necesitas movimientos de al menos un mes cerrado. Mientras tanto, prueba el simulador." />
      </Card>
    );
  }

  const cur = currentMonth();
  const labels = ['Hoy', ...Array.from({ length: 12 }, (_, i) => monthLabel(addMonths(cur, i + 1), 'short'))];
  const values = labels.map((_, i) => start + avg.net * i);
  const remainingGoals = data.goals
    .map((g) => ({ g, left: g.target - g.contributions.reduce((s, c) => s + c.amount, 0) }))
    .filter((x) => x.left > 0);

  return (
    <Card className="p-5">
      <h2 className="mb-1 font-medium">Proyección con tu ritmo real</h2>
      <p className="mb-5 text-xs text-muted">
        Basada en el promedio de {avg.months} {avg.months === 1 ? 'mes cerrado' : 'meses cerrados'}: ingresas {fmtMoney(avg.income)} y gastas {fmtMoney(avg.expense)} al mes. Es una estimación, no una promesa.
      </p>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Ahorro mensual promedio" value={fmtMoney(avg.net)} accent={avg.net > 0} />
        <Stat label="Dinero total hoy (disponible + metas)" value={fmtMoney(start)} />
        <Stat label="En 12 meses" value={fmtMoney(values[12])} accent={avg.net > 0} />
      </div>
      {avg.net <= 0 && (
        <p className="mb-4 rounded-lg bg-warn/10 px-3 py-2 text-sm text-warn">Con tu ritmo actual no estás ahorrando. Revisa tus presupuestos para recortar gastos.</p>
      )}
      <LineChart labels={labels} series={[{ name: 'Dinero total', color: 'rgb(var(--accent))', values, area: true }]} />
      {avg.net > 0 && remainingGoals.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-medium">Tiempo estimado por meta</h3>
          <ul className="divide-y divide-line text-sm">
            {remainingGoals.map(({ g, left }) => (
              <li key={g.id} className="flex items-center justify-between gap-3 py-2">
                <span className="truncate">{g.name}</span>
                <span className="shrink-0 tabular-nums text-muted">{Math.ceil(left / avg.net)} meses</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Cada cálculo supone que destinas todo tu ahorro mensual a esa meta.</p>
        </div>
      )}
    </Card>
  );
}

function Section({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="font-medium">{title}</h2>
      <p className="mb-4 mt-1 text-sm text-muted">{text}</p>
      {children}
    </Card>
  );
}

function DataPanel() {
  const { data, actions } = useStore();
  const { toast } = useUI();
  const [confirm, confirmNode] = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [balance, setBalance] = useState(String(data.settings.initialBalance));
  const [balanceErr, setBalanceErr] = useState('');
  const hasData = data.transactions.length + data.budgets.length + data.goals.length > 0;

  const saveBalance = () => {
    const n = balance.trim() === '' ? 0 : parseAmount(balance);
    if (Number.isNaN(n)) return setBalanceErr('Monto inválido: usa solo números, con hasta 2 decimales.');
    setBalanceErr('');
    actions.setSettings({ initialBalance: n });
    toast('Saldo inicial actualizado');
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      if (f.size > 10_000_000) throw new Error('grande');
      const parsed = sanitize(JSON.parse(await readFileText(f)));
      if (!parsed) throw new Error('formato');
      const ok = await confirm({
        title: 'Restaurar respaldo',
        message: `Se reemplazarán tus datos actuales por ${parsed.transactions.length} movimientos, ${parsed.budgets.length} presupuestos y ${parsed.goals.length} metas del archivo. ¿Continuar?`,
        confirmText: 'Restaurar',
        danger: false,
      });
      if (ok) {
        actions.replace(parsed);
        setBalance(String(parsed.settings.initialBalance));
        toast('Respaldo restaurado');
      }
    } catch {
      toast('El archivo no es un respaldo válido.', 'err');
    }
  };

  const loadDemo = async () => {
    const ok =
      !hasData ||
      (await confirm({
        title: 'Cargar datos de demostración',
        message: 'Esto reemplazará tus datos actuales por datos de ejemplo. Descarga un respaldo antes si quieres conservarlos.',
        confirmText: 'Cargar demo',
        danger: false,
      }));
    if (ok) {
      const demo = buildDemo(data.settings.theme);
      actions.replace(demo);
      setBalance(String(demo.settings.initialBalance));
      toast('Datos de demostración cargados');
    }
  };

  const wipe = async () => {
    if (
      await confirm({
        title: 'Borrar todos los datos',
        message: 'Se eliminarán todos tus movimientos, presupuestos y metas de este navegador. Esta acción no se puede deshacer.',
        confirmText: 'Borrar todo',
      })
    ) {
      actions.clearAll();
      setBalance('0');
      toast('Datos eliminados');
    }
  };

  return (
    <div className="space-y-4">
      <Section title="Saldo inicial" text="Dinero que ya tenías antes de empezar a registrar. Se suma a tu dinero disponible.">
        <div className="flex max-w-sm items-start gap-2">
          <div className="flex-1">
            <Field label="Saldo inicial (MXN)" error={balanceErr}>
              <MoneyInput value={balance} onChange={(e) => setBalance(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveBalance()} />
            </Field>
          </div>
          <button className="btn-primary mt-[26px]" onClick={saveBalance}>
            Guardar
          </button>
        </div>
      </Section>

      <Section title="Exportar" text="Descarga tus movimientos para abrirlos en Excel o Google Sheets, o un respaldo completo para restaurarlo después.">
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => exportCSV(data)} disabled={!data.transactions.length}>
            <Icon name="download" />
            Movimientos (CSV)
          </button>
          <button className="btn-ghost" onClick={() => exportJSON(data)}>
            <Icon name="download" />
            Respaldo completo (JSON)
          </button>
        </div>
      </Section>

      <Section title="Restaurar" text="Carga un respaldo JSON descargado antes. Reemplaza los datos actuales, tras pedirte confirmación.">
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
        <button className="btn-ghost" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" />
          Elegir archivo de respaldo
        </button>
      </Section>

      <Section title="Datos de demostración" text="Carga ejemplos para explorar la app. Se marcan como demo y los puedes borrar cuando quieras.">
        <button className="btn-ghost" onClick={loadDemo}>
          <Icon name="sparkles" />
          Cargar datos de demostración
        </button>
      </Section>

      <Section title="Zona de riesgo" text="Tus datos viven solo en este navegador y no se envían a ningún servidor. Si borras los datos del sitio o cambias de navegador, se pierden: haz respaldos.">
        <button className="btn-danger" onClick={wipe} disabled={!hasData}>
          <Icon name="trash" />
          Borrar todos mis datos
        </button>
      </Section>
      {confirmNode}
    </div>
  );
}
