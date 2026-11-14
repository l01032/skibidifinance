import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { useUI } from '../uiState';
import { Card, Empty, Segmented, cx } from '../components/ui';
import { BarChart, Donut, LineChart } from '../components/charts';
import { categoryColor } from '../lib/constants';
import { availableAtMonthEnd, buildSummary, byCategory, monthRange, totalsFor } from '../lib/calc';
import { fmtMoney, fmtPct, monthKey, monthLabel } from '../lib/format';

type Period = 'mes' | '3m' | '12m';

export default function Stats() {
  const { data } = useStore();
  const { month } = useUI();
  const [period, setPeriod] = useState<Period>('mes');
  const { transactions } = data;

  const keys = useMemo(() => (period === 'mes' ? [month] : monthRange(month, period === '3m' ? 3 : 12)), [period, month]);
  const cats = useMemo(
    () => byCategory(transactions.filter((t) => keys.includes(monthKey(t.date))), 'gasto'),
    [transactions, keys],
  );
  const total = cats.reduce((s, c) => s + c.total, 0);
  const months12 = useMemo(() => monthRange(month, 12), [month]);
  const evolution = useMemo(() => months12.map((k) => availableAtMonthEnd(data, k)), [data, months12]);
  const history = useMemo(
    () =>
      months12
        .map((k) => ({ key: k, ...totalsFor(transactions, k) }))
        .filter((h) => h.income || h.expense)
        .reverse(),
    [transactions, months12],
  );
  const bars = useMemo(
    () => months12.map((k) => ({ label: monthLabel(k, 'short'), a: totalsFor(transactions, k).income, b: totalsFor(transactions, k).expense })),
    [transactions, months12],
  );
  const summary = useMemo(() => buildSummary(data, month), [data, month]);

  if (!transactions.length) {
    return (
      <Card>
        <Empty icon="chart" title="Aún no hay estadísticas" text="Registra algunos movimientos y aquí verás en qué gastas, cómo evoluciona tu balance y tu historial mensual." />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="mb-3 font-medium">Resumen de {monthLabel(month).toLowerCase()}</h2>
        <ul className="space-y-2 text-sm">
          {summary.map((s) => (
            <li key={s} className="flex gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-medium">Gastos por categoría</h2>
          <Segmented
            value={period}
            onChange={setPeriod}
            options={[
              { value: 'mes', label: 'Mes' },
              { value: '3m', label: '3 meses' },
              { value: '12m', label: '12 meses' },
            ]}
          />
        </div>
        {!cats.length ? (
          <p className="py-8 text-center text-sm text-muted">No hay gastos en este periodo.</p>
        ) : (
          <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
            <Donut
              segments={cats.map((c) => ({ label: c.category, value: c.total, color: categoryColor(c.category) }))}
              centerLabel="Total gastado"
              centerValue={fmtMoney(total)}
            />
            <ul className="space-y-3">
              {cats.map((c, i) => {
                const share = (c.total / total) * 100;
                return (
                  <li key={c.category}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: categoryColor(c.category) }} />
                        <span className="truncate">{c.category}</span>
                        {i === 0 && cats.length > 1 && (
                          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent">Donde más gastas</span>
                        )}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {fmtMoney(c.total)} <span className="text-muted">· {fmtPct(share)}</span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-raised">
                      <div className="h-full rounded-full" style={{ width: `${share}%`, background: categoryColor(c.category) }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-1 font-medium">Evolución del dinero disponible</h2>
          <p className="mb-3 text-xs text-muted">Al cierre de cada mes, últimos 12 meses.</p>
          <LineChart
            labels={months12.map((k) => monthLabel(k, 'short'))}
            series={[{ name: 'Disponible', color: 'rgb(var(--accent))', values: evolution, area: true }]}
          />
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Ingresos vs. gastos</h2>
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
          <BarChart data={bars} aName="Ingresos" bName="Gastos" aColor="rgb(var(--accent))" bColor="rgb(var(--danger))" />
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 font-medium">Historial mensual</h2>
        {!history.length ? (
          <p className="py-4 text-center text-sm text-muted">Sin movimientos en los últimos 12 meses.</p>
        ) : (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm tabular-nums">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="px-2 py-2 font-medium">Mes</th>
                  <th className="px-2 py-2 text-right font-medium">Ingresos</th>
                  <th className="px-2 py-2 text-right font-medium">Gastos</th>
                  <th className="px-2 py-2 text-right font-medium">Balance</th>
                  <th className="px-2 py-2 text-right font-medium">Ahorro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {history.map((h) => (
                  <tr key={h.key}>
                    <td className="px-2 py-2.5">{monthLabel(h.key)}</td>
                    <td className="px-2 py-2.5 text-right text-accent">{fmtMoney(h.income)}</td>
                    <td className="px-2 py-2.5 text-right">{fmtMoney(h.expense)}</td>
                    <td className={cx('px-2 py-2.5 text-right', h.net < 0 && 'text-danger')}>{fmtMoney(h.net)}</td>
                    <td className="px-2 py-2.5 text-right text-muted">{h.income > 0 ? fmtPct(h.rate) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
