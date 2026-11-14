import type { ReactNode } from 'react';
import { addMonths, currentMonth, monthLabel } from '../lib/format';
import { useStore } from '../store';
import { useUI } from '../uiState';
import TransactionForm from './TransactionForm';
import { Icon, Logo, cx, useConfirm, type IconName } from './ui';

export const NAV: { path: string; label: string; short: string; icon: IconName }[] = [
  { path: '/', label: 'Inicio', short: 'Inicio', icon: 'home' },
  { path: '/movimientos', label: 'Movimientos', short: 'Movim.', icon: 'list' },
  { path: '/presupuestos', label: 'Presupuestos', short: 'Presup.', icon: 'target' },
  { path: '/ahorros', label: 'Ahorros', short: 'Ahorros', icon: 'flag' },
  { path: '/estadisticas', label: 'Estadísticas', short: 'Estad.', icon: 'chart' },
  { path: '/herramientas', label: 'Herramientas', short: 'Herram.', icon: 'tools' },
];

const MONTH_PAGES = ['/', '/presupuestos', '/estadisticas'];

function MonthPicker({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const cur = currentMonth();
  return (
    <div className="flex items-center rounded-lg border border-line bg-surface">
      <button className="btn-icon" onClick={() => onChange(addMonths(month, -1))} aria-label="Mes anterior">
        <Icon name="chevL" />
      </button>
      <button className="min-w-[8.5rem] px-1 text-center text-sm font-medium" onClick={() => onChange(cur)} title="Ir al mes actual">
        {monthLabel(month)}
      </button>
      <button className="btn-icon" disabled={month >= cur} onClick={() => onChange(addMonths(month, 1))} aria-label="Mes siguiente">
        <Icon name="chevR" />
      </button>
    </div>
  );
}

export default function Layout({ path, children }: { path: string; children: ReactNode }) {
  const { data, actions, persistOk } = useStore();
  const { month, setMonth, txForm, openTxForm, closeTxForm } = useUI();
  const [confirm, confirmNode] = useConfirm();
  const seg = '/' + (path.split('/')[1] ?? '');
  const current = NAV.find((n) => n.path === seg) ?? NAV[0];
  const light = data.settings.theme === 'light';

  const clearDemo = async () => {
    const ok = await confirm({
      title: 'Borrar datos de demostración',
      message: 'Se eliminarán los movimientos, presupuestos y metas de ejemplo para que empieces con tus datos reales.',
      confirmText: 'Borrar',
    });
    if (ok) actions.clearAll();
  };

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface px-3 py-5 lg:flex">
        <a href="#/" className="mb-6 flex items-center gap-2.5 px-2">
          <Logo size={38} />
          <span className="font-semibold uppercase leading-tight tracking-wide">
            Skibidi
            <br />
            <span className="text-accent">Finance</span>
          </span>
        </a>
        <nav className="flex flex-1 flex-col gap-0.5" aria-label="Principal">
          {NAV.map((n) => (
            <a
              key={n.path}
              href={`#${n.path}`}
              className={cx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                n.path === current.path ? 'bg-raised text-fg' : 'text-muted hover:bg-raised/60 hover:text-fg',
              )}
              aria-current={n.path === current.path ? 'page' : undefined}
            >
              <Icon name={n.icon} className={cx('h-[18px] w-[18px]', n.path === current.path && 'text-accent')} />
              {n.label}
            </a>
          ))}
        </nav>
        <div className="space-y-2 px-1">
          <button className="btn-ghost w-full justify-start" onClick={() => actions.setSettings({ theme: light ? 'dark' : 'light' })}>
            <Icon name={light ? 'moon' : 'sun'} />
            {light ? 'Tema oscuro' : 'Tema claro'}
          </button>
          <p className="px-1 text-[11px] leading-snug text-muted">Tus datos se guardan solo en este navegador.</p>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2.5">
              <Logo size={30} className="lg:hidden" />
              <h1 className="text-lg font-semibold tracking-tight">{current.label}</h1>
            </div>
            <div className="flex items-center gap-2">
              {MONTH_PAGES.includes(current.path) && <MonthPicker month={month} onChange={setMonth} />}
              <button className="btn-primary hidden lg:inline-flex" onClick={() => openTxForm()}>
                <Icon name="plus" />
                Nuevo movimiento
              </button>
              <button
                className="btn-icon border border-line lg:hidden"
                onClick={() => actions.setSettings({ theme: light ? 'dark' : 'light' })}
                aria-label="Cambiar tema"
              >
                <Icon name={light ? 'moon' : 'sun'} />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl space-y-4 px-4 py-5 pb-32 sm:px-6 lg:px-8 lg:pb-10">
          {data.isDemo && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warn/30 bg-warn/10 px-4 py-2.5 text-sm">
              <span>Estás viendo datos de demostración. Bórralos antes de capturar tus datos reales.</span>
              <button className="btn-ghost py-1" onClick={clearDemo}>
                Borrar y empezar
              </button>
            </div>
          )}
          {!persistOk && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm text-danger" role="alert">
              No se pudo guardar en este navegador (¿almacenamiento lleno o modo privado?). Descarga un respaldo en Herramientas → Datos.
            </div>
          )}
          <div key={current.path} className="animate-fade-up space-y-4">
            {children}
          </div>
        </main>
      </div>

      <button
        className="fixed right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-accent text-accent-ink shadow-lg shadow-black/30 transition active:scale-95 lg:hidden"
        style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom))' }}
        onClick={() => openTxForm()}
        aria-label="Nuevo movimiento"
      >
        <Icon name="plus" className="h-6 w-6" />
      </button>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Principal"
      >
        {NAV.map((n) => (
          <a
            key={n.path}
            href={`#${n.path}`}
            className={cx(
              'flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition',
              n.path === current.path ? 'text-accent' : 'text-muted',
            )}
            aria-current={n.path === current.path ? 'page' : undefined}
          >
            <Icon name={n.icon} className="h-5 w-5" />
            {n.short}
          </a>
        ))}
      </nav>

      {txForm && <TransactionForm tx={txForm.tx} initialType={txForm.type} onClose={closeTxForm} />}
      {confirmNode}
    </div>
  );
}
