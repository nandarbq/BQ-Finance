import type {
  Budget,
  BudgetDraft,
  Category,
  CategoryDraft,
  Member,
  Mode,
  Transaction,
  TransactionDraft,
  TxType,
} from "./types";
import { supabase } from "./supabaseClient";

interface TxRow {
  id: string;
  mode: Mode;
  type: TxType;
  amount: number | string;
  category: string;
  note: string | null;
  date: string;
  member_id: string | null;
  created_at: string;
}

function rowToTx(row: TxRow): Transaction {
  return {
    id: row.id,
    mode: row.mode,
    type: row.type,
    amount: Number(row.amount),
    category: row.category,
    note: row.note || "",
    date: row.date,
    memberId: row.member_id,
    createdAt: new Date(row.created_at).getTime(),
  };
}

interface MemberRow {
  id: string;
  name: string;
  color: string;
  built_in: boolean;
}

function rowToMember(row: MemberRow): Member {
  return { id: row.id, name: row.name, color: row.color, builtIn: row.built_in };
}

interface BudgetRow {
  id: string;
  mode: Mode;
  category: string;
  amount: number | string;
}

function rowToBudget(row: BudgetRow): Budget {
  return { id: row.id, mode: row.mode, category: row.category, amount: Number(row.amount) };
}

interface CategoryRow {
  id: string;
  type: TxType;
  label: string;
  icon: string;
  color: string;
  is_default: boolean;
}

function rowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    type: row.type,
    label: row.label,
    icon: row.icon,
    color: row.color,
    isDefault: row.is_default,
  };
}

export async function fetchTransactions(userId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToTx);
}

export async function insertTransaction(userId: string, draft: TransactionDraft): Promise<Transaction> {
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      mode: draft.mode,
      type: draft.type,
      amount: draft.amount,
      category: draft.category,
      note: draft.note || "",
      date: draft.date,
      member_id: draft.memberId || null,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToTx(data);
}

export async function deleteTransactionById(id: string): Promise<void> {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

export async function updateTransaction(id: string, draft: Omit<TransactionDraft, "mode">): Promise<Transaction> {
  const { data, error } = await supabase
    .from("transactions")
    .update({
      type: draft.type,
      amount: draft.amount,
      category: draft.category,
      note: draft.note || "",
      date: draft.date,
      member_id: draft.memberId || null,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToTx(data);
}

export async function deleteTransactionsByMode(userId: string, mode: Mode): Promise<void> {
  const { error } = await supabase.from("transactions").delete().eq("user_id", userId).eq("mode", mode);
  if (error) throw error;
}

export async function fetchMembers(userId: string): Promise<Member[]> {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!data || data.length === 0) {
    const created = await insertMember(userId, "Bersama", "#4FB0A5", true);
    return [created];
  }
  return data.map(rowToMember);
}

export async function insertMember(userId: string, name: string, color: string, builtIn = false): Promise<Member> {
  const { data, error } = await supabase
    .from("members")
    .insert({ user_id: userId, name, color, built_in: builtIn })
    .select()
    .single();
  if (error) throw error;
  return rowToMember(data);
}

export async function deleteMemberById(id: string): Promise<void> {
  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchBudgets(userId: string): Promise<Budget[]> {
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToBudget);
}

export async function upsertBudget(userId: string, draft: BudgetDraft): Promise<Budget> {
  const { data, error } = await supabase
    .from("budgets")
    .upsert(
      { user_id: userId, mode: draft.mode, category: draft.category, amount: draft.amount },
      { onConflict: "user_id,mode,category" }
    )
    .select()
    .single();
  if (error) throw error;
  return rowToBudget(data);
}

export async function deleteBudgetById(id: string): Promise<void> {
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) throw error;
}

/* ================================ Categories ================================ */

const DEFAULT_CATEGORIES: CategoryDraft[] = [
  { type: "out", label: "Makanan", icon: "UtensilsCrossed", color: "var(--negative)" },
  { type: "out", label: "Transport", icon: "Car", color: "var(--cat-teal)" },
  { type: "out", label: "Belanja", icon: "ShoppingBag", color: "var(--blue)" },
  { type: "out", label: "Tagihan", icon: "Receipt", color: "var(--cat-olive)" },
  { type: "out", label: "Hiburan", icon: "Gamepad2", color: "var(--cat-lime)" },
  { type: "out", label: "Kesehatan", icon: "HeartPulse", color: "var(--cat-soft-red)" },
  { type: "out", label: "Pendidikan", icon: "GraduationCap", color: "var(--cat-dark)" },
  { type: "out", label: "Lainnya", icon: "MoreHorizontal", color: "var(--text-muted)" },
  { type: "in", label: "Gaji", icon: "Briefcase", color: "var(--cat-green)" },
  { type: "in", label: "Bonus", icon: "Sparkles", color: "var(--cat-teal)" },
  { type: "in", label: "Usaha", icon: "TrendingUp", color: "var(--cat-lime)" },
  { type: "in", label: "Hadiah", icon: "Gift", color: "var(--cat-mint)" },
  { type: "in", label: "Investasi", icon: "PiggyBank", color: "var(--cat-dark)" },
  { type: "in", label: "Lainnya", icon: "MoreHorizontal", color: "var(--text-muted)" },
];

export async function fetchCategories(userId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = data || [];
  if (rows.length === 0) {
    const { error: seedError } = await supabase.from("categories").upsert(
      DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: userId, is_default: true })),
      { onConflict: "user_id,type,label", ignoreDuplicates: true }
    );
    if (seedError) throw seedError;
    const { data: seeded, error: fetchError } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (fetchError) throw fetchError;
    return (seeded || []).map(rowToCategory);
  }
  return rows.map(rowToCategory);
}

export async function insertCategory(userId: string, draft: CategoryDraft): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: userId,
      type: draft.type,
      label: draft.label,
      icon: draft.icon || "MoreHorizontal",
      color: draft.color || "var(--text-muted)",
      is_default: false,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToCategory(data);
}

export async function updateCategory(
  id: string,
  fields: { label: string; icon: string; color: string }
): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .update({ label: fields.label, icon: fields.icon, color: fields.color })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToCategory(data);
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", id).eq("is_default", false);
  if (error) throw error;
}
