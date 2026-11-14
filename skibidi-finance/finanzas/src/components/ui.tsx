import { useCallback, useEffect, useState, type CSSProperties, type InputHTMLAttributes, type ReactNode } from 'react';
import logoUrl from '../assets/logo.png';

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');

const ICONS = {
  plus: 'M12 5v14M5 12h14',
  x: 'M18 6 6 18M6 6l12 12',
  edit: 'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z',
  trash: 'M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3',
  chevL: 'm15 18-6-6 6-6',
  chevR: 'm9 18 6-6-6-6',
  chevD: 'm6 9 6 6 6-6',
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  flag: 'M4 22V4M4 4h13l-2 4 2 4H4',
  chart: 'M3 3v18h18M7 16v-4M12 16V8M17 16v-6',
  tools: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  alert: 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0ZM12 9v4M12 17h.01',
  check: 'M20 6 9 17l-5-5',
  arrowUp: 'M12 19V5M5 12l7-7 7 7',
  arrowDown: 'M12 5v14M19 12l-7 7-7-7',
  wallet: 'M20 7H5a2 2 0 0 1 0-4h13v4ZM3 5v14a2 2 0 0 0 2 2h15V7M16 14h.01',
  sparkles: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9ZM19 3v4M21 5h-4',
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, className = 'h-4 w-4' }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx('shrink-0', className)}
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

export function Logo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cx('grid shrink-0 place-items-center rounded-[28%] bg-accent shadow-[0_0_24px_-6px_rgb(var(--accent)/.6)]', className)}
      style={{ width: size, height: size }}
    >
      <img src={logoUrl} alt="" width={size} height={size} className="p-[11%]" draggable={false} />
    </span>
  );
}

export function Card({ className, style, children }: { className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div className={cx('card', className)} style={style}>
      {children}
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-md animate-sheet overflow-y-auto rounded-t-2xl border border-line bg-surface p-5 shadow-2xl sm:animate-scale-in sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Cerrar">
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

interface ConfirmOpts {
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
}

export function useConfirm() {
  const [state, setState] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const confirm = useCallback(
    (o: ConfirmOpts) => new Promise<boolean>((resolve) => setState({ ...o, resolve })),
    [],
  );
  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };
  const node = (
    <Modal open={!!state} onClose={() => close(false)} title={state?.title ?? ''}>
      <p className="text-sm text-muted">{state?.message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={() => close(false)}>
          Cancelar
        </button>
        <button type="button" className={state?.danger === false ? 'btn-primary' : 'btn-danger'} onClick={() => close(true)}>
          {state?.confirmText ?? 'Confirmar'}
        </button>
      </div>
    </Modal>
  );
  return [confirm, node] as const;
}

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="block">
        <span className="label">{label}</span>
        {children}
      </label>
      {error ? (
        <p className="mt-1 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function MoneyInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
      <input placeholder="0.00" {...props} inputMode="decimal" autoComplete="off" className="input pl-7 tabular-nums" />
    </div>
  );
}

const LEVEL_BG = { ok: 'bg-accent', warn: 'bg-warn', over: 'bg-danger' } as const;

export function Progress({ pct, level = 'ok', className }: { pct: number; level?: keyof typeof LEVEL_BG; className?: string }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const r = requestAnimationFrame(() => setW(Math.min(Math.max(pct, 0), 100)));
    return () => cancelAnimationFrame(r);
  }, [pct]);
  return (
    <div
      className={cx('h-2 w-full overflow-hidden rounded-full bg-raised', className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={cx('h-full rounded-full transition-[width] duration-700 ease-out', LEVEL_BG[level])} style={{ width: `${w}%` }} />
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <div className={cx('inline-flex rounded-lg border border-line bg-bg p-0.5', className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-md px-3 py-1.5 text-xs font-medium transition',
            o.value === value ? 'bg-fg/10 text-fg' : 'text-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ icon, title, text, children }: { icon: IconName; title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-8 text-center">
      <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-raised text-muted">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <p className="font-medium">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {children}
    </div>
  );
}

export function Delta({ value, good }: { value: number | null; good: 'up' | 'down' }) {
  if (value === null) return <span className="text-xs text-muted">Sin mes previo para comparar</span>;
  if (Math.abs(value) < 0.5) return <span className="text-xs text-muted">Igual que el mes anterior</span>;
  const up = value > 0;
  const ok = (good === 'up') === up;
  return (
    <span className={cx('inline-flex items-center gap-1 text-xs font-medium', ok ? 'text-accent' : 'text-danger')}>
      <Icon name={up ? 'arrowUp' : 'arrowDown'} className="h-3 w-3" />
      {Math.abs(value).toFixed(0)}%<span className="font-normal text-muted">vs mes anterior</span>
    </span>
  );
}
