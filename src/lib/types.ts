export type Mode = "pribadi" | "keluarga";
export type TxType = "in" | "out";
export type TabId = "beranda" | "transaksi" | "grafik" | "pengaturan";

export interface Transaction {
  id: string;
  mode: Mode;
  type: TxType;
  amount: number;
  category: string;
  note: string;
  date: string;
  memberId: string | null;
  createdAt: number;
}

export interface TransactionDraft {
  mode: Mode;
  type: TxType;
  amount: number;
  category: string;
  note?: string;
  date: string;
  memberId?: string | null;
}

export interface Member {
  id: string;
  name: string;
  color: string;
  builtIn: boolean;
}

export interface Budget {
  id: string;
  mode: Mode;
  category: string;
  amount: number;
}

export interface BudgetDraft {
  mode: Mode;
  category: string;
  amount: number;
}

export interface Category {
  id: string;
  type: TxType;
  label: string;
  icon: string;
  color: string;
  isDefault: boolean;
}

export interface CategoryDraft {
  type: TxType;
  label: string;
  icon?: string;
  color?: string;
}
