import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Transaction, TxType } from './types';
import { currentMonth } from './lib/format';
import { Icon, cx } from './components/ui';

type ToastKind = 'ok' | 'warn' | 'err';
interface ToastItem {
  id: number;
  msg: string;
  kind: ToastKind;
}
interface TxFormState {
  tx?: Transaction;
  type?: TxType;
}

interface UIValue {
  month: string;
  setMonth: (m: string) => void;
  toast: (msg: string, kind?: ToastKind) => void;
  txForm: TxFormState | null;
  openTxForm: (o?: TxFormState) => void;
  closeTxForm: () => void;
}

const Ctx = createContext<UIValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState(currentMonth);
  const [txForm, setTxForm] = useState<TxFormState | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const toast = useCallback((msg: string, kind: ToastKind = 'ok') => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, msg, kind }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'ok' ? 3200 : 5500);
  }, []);

  const value = useMemo<UIValue>(
    () => ({
      month,
      setMonth,
      toast,
      txForm,
      openTxForm: (o = {}) => setTxForm(o),
      closeTxForm: () => setTxForm(null),
    }),
    [month, toast, txForm],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex max-w-md animate-fade-up items-center gap-2.5 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm shadow-xl"
          >
            <Icon
              name={t.kind === 'ok' ? 'check' : 'alert'}
              className={cx('h-4 w-4', t.kind === 'ok' ? 'text-accent' : t.kind === 'warn' ? 'text-warn' : 'text-danger')}
            />
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useUI() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useUI debe usarse dentro de UIProvider');
  return c;
}
