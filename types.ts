export type TxType = 'ingreso' | 'gasto';
export type Theme = 'dark' | 'light';

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  category: string;
  description: string;
  date: string;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
}

export interface Contribution {
  id: string;
  amount: number;
  date: string;
  note: string;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  deadline: string;
  contributions: Contribution[];
}

export interface Settings {
  initialBalance: number;
  alertThreshold: number;
  theme: Theme;
}

export interface AppData {
  version: 1;
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  settings: Settings;
  isDemo: boolean;
}
