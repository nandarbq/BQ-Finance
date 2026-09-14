export type Mode = "pribadi" | "keluarga";
export type TxType = "in" | "out";
export type TabId = "beranda" | "transaksi" | "grafik" | "pengaturan";
export type FamilyRole = "kepala_keluarga" | "member";

export interface Family {
  id: string;
  name: string;
}

export interface FamilyMember {
  id: string;
  familyId: string;
  userId: string;
  role: FamilyRole;
  email: string | null;
  avatarUrl: string | null;
  displayName: string | null;
  createdAt: number;
}

export interface FamilyState {
  family: Family;
  members: FamilyMember[];
}

export interface Transaction {
  id: string;
  mode: Mode;
  type: TxType;
  amount: number;
  category: string;
  note: string;
  date: string;
  memberId: string | null;
  familyId: string | null;
  /** ID akun pengguna yang menambahkan transaksi ini (pembuat). */
  userId: string | null;
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
  familyId?: string | null;
}

export interface Member {
  id: string;
  name: string;
  color: string;
  builtIn: boolean;
  familyId: string | null;
}

export interface Budget {
  id: string;
  mode: Mode;
  category: string;
  amount: number;
  familyId: string | null;
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
  familyId: string | null;
}

export interface CategoryDraft {
  type: TxType;
  label: string;
  icon?: string;
  color?: string;
}