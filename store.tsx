import { createContext, useContext, useEffect, useMemo, useReducer, useState, type Dispatch, type ReactNode } from 'react';
import type { AppData, Budget, Contribution, Goal, Settings, Transaction } from './types';
import { STORAGE_KEY, defaultData, load, save } from './lib/storage';

type Action =
  | { t: 'addTx'; tx: Transaction }
  | { t: 'updateTx'; tx: Transaction }
  | { t: 'delTx'; id: string }
  | { t: 'saveBudget'; b: Budget }
  | { t: 'delBudget'; id: string }
  | { t: 'saveGoal'; g: Pick<Goal, 'id' | 'name' | 'target' | 'deadline'> }
  | { t: 'delGoal'; id: string }
  | { t: 'addContribution'; goalId: string; c: Contribution }
  | { t: 'delContribution'; goalId: string; id: string }
  | { t: 'settings'; s: Partial<Settings> }
  | { t: 'replace'; d: AppData }
  | { t: 'clear' };

function reducer(s: AppData, a: Action): AppData {
  switch (a.t) {
    case 'addTx':
      return { ...s, transactions: [a.tx, ...s.transactions] };
    case 'updateTx':
      return { ...s, transactions: s.transactions.map((t) => (t.id === a.tx.id ? a.tx : t)) };
    case 'delTx':
      return { ...s, transactions: s.transactions.filter((t) => t.id !== a.id) };
    case 'saveBudget':
      return {
        ...s,
        budgets: s.budgets.some((b) => b.id === a.b.id)
          ? s.budgets.map((b) => (b.id === a.b.id ? a.b : b))
          : [...s.budgets, a.b],
      };
    case 'delBudget':
      return { ...s, budgets: s.budgets.filter((b) => b.id !== a.id) };
    case 'saveGoal':
      return {
        ...s,
        goals: s.goals.some((g) => g.id === a.g.id)
          ? s.goals.map((g) => (g.id === a.g.id ? { ...g, ...a.g } : g))
          : [...s.goals, { ...a.g, contributions: [] }],
      };
    case 'delGoal':
      return { ...s, goals: s.goals.filter((g) => g.id !== a.id) };
    case 'addContribution':
      return {
        ...s,
        goals: s.goals.map((g) => (g.id === a.goalId ? { ...g, contributions: [...g.contributions, a.c] } : g)),
      };
    case 'delContribution':
      return {
        ...s,
        goals: s.goals.map((g) =>
          g.id === a.goalId ? { ...g, contributions: g.contributions.filter((c) => c.id !== a.id) } : g,
        ),
      };
    case 'settings':
      return { ...s, settings: { ...s.settings, ...a.s } };
    case 'replace':
      return a.d;
    case 'clear':
      return { ...defaultData(), settings: s.settings };
    default:
      return s;
  }
}

const makeActions = (d: Dispatch<Action>) => ({
  addTx: (tx: Transaction) => d({ t: 'addTx', tx }),
  updateTx: (tx: Transaction) => d({ t: 'updateTx', tx }),
  deleteTx: (id: string) => d({ t: 'delTx', id }),
  saveBudget: (b: Budget) => d({ t: 'saveBudget', b }),
  deleteBudget: (id: string) => d({ t: 'delBudget', id }),
  saveGoal: (g: Pick<Goal, 'id' | 'name' | 'target' | 'deadline'>) => d({ t: 'saveGoal', g }),
  deleteGoal: (id: string) => d({ t: 'delGoal', id }),
  addContribution: (goalId: string, c: Contribution) => d({ t: 'addContribution', goalId, c }),
  deleteContribution: (goalId: string, id: string) => d({ t: 'delContribution', goalId, id }),
  setSettings: (s: Partial<Settings>) => d({ t: 'settings', s }),
  replace: (data: AppData) => d({ t: 'replace', d: data }),
  clearAll: () => d({ t: 'clear' }),
});

type Actions = ReturnType<typeof makeActions>;
interface StoreValue {
  data: AppData;
  actions: Actions;
  persistOk: boolean;
}

const Ctx = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, load);
  const [persistOk, setPersistOk] = useState(true);
  const actions = useMemo(() => makeActions(dispatch), []);

  useEffect(() => {
    setPersistOk(save(data));
  }, [data]);

  useEffect(() => {
    document.documentElement.classList.toggle('light', data.settings.theme === 'light');
  }, [data.settings.theme]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) dispatch({ t: 'replace', d: load() });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(() => ({ data, actions, persistOk }), [data, actions, persistOk]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useStore debe usarse dentro de StoreProvider');
  return c;
}
