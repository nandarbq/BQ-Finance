import type {
  Budget,
  BudgetDraft,
  Category,
  CategoryDraft,
  Family,
  FamilyMember,
  FamilyState,
  FamilyRole,
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
  family_id: string | null;
  user_id: string | null;
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
    familyId: row.family_id,
    userId: row.user_id,
    createdAt: new Date(row.created_at).getTime(),
  };
}

interface MemberRow {
  id: string;
  name: string;
  color: string;
  built_in: boolean;
  family_id: string | null;
}

function rowToMember(row: MemberRow): Member {
  return { id: row.id, name: row.name, color: row.color, builtIn: row.built_in, familyId: row.family_id };
}

interface BudgetRow {
  id: string;
  mode: Mode;
  category: string;
  amount: number | string;
  family_id: string | null;
}

function rowToBudget(row: BudgetRow): Budget {
  return { id: row.id, mode: row.mode, category: row.category, amount: Number(row.amount), familyId: row.family_id };
}

interface CategoryRow {
  id: string;
  type: TxType;
  label: string;
  icon: string;
  color: string;
  is_default: boolean;
  family_id: string | null;
}

function rowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    type: row.type,
    label: row.label,
    icon: row.icon,
    color: row.color,
    isDefault: row.is_default,
    familyId: row.family_id,
  };
}

interface FamilyMemberRow {
  id: string;
  family_id: string;
  user_id: string;
  role: FamilyRole;
  email: string | null;
  avatar_url: string | null;
  display_name: string | null;
  created_at: string;
}

function rowToFamilyMember(row: FamilyMemberRow): FamilyMember {
  return {
    id: row.id,
    familyId: row.family_id,
    userId: row.user_id,
    role: row.role,
    email: row.email,
    avatarUrl: row.avatar_url,
    displayName: row.display_name,
    createdAt: new Date(row.created_at).getTime(),
  };
}

/* ================================ Keluarga ================================ */

export async function fetchMyFamily(): Promise<FamilyState | null> {
  const { data, error } = await supabase
    .from("family_members")
    .select("id, family_id, user_id, role, email, avatar_url, display_name, created_at");
  if (error) throw error;
  if (!data || data.length === 0) return null;
  const familyId = data[0].family_id;
  const { data: fam, error: famErr } = await supabase
    .from("families")
    .select("id, name")
    .eq("id", familyId)
    .maybeSingle();
  if (famErr) throw famErr;
  if (!fam) return null;
  const members = data
    .filter((r) => r.family_id === familyId)
    .map(rowToFamilyMember)
    .sort((a, b) => {
      const ak = a.role === "kepala_keluarga" ? 0 : 1;
      const bk = b.role === "kepala_keluarga" ? 0 : 1;
      if (ak !== bk) return ak - bk;
      return a.createdAt - b.createdAt;
    });
  return { family: fam, members };
}

export async function createFamily(): Promise<Family> {
  const { data, error } = await supabase.rpc("create_family");
  if (error) throw error;
  return { id: data as string, name: "Keluarga" };
}

export async function fetchJoinCode(familyId: string): Promise<string> {
  const { data, error } = await supabase.rpc("get_join_code", { target_family_id: familyId });
  if (error) throw error;
  return data as string;
}

export async function regenerateJoinCode(familyId: string): Promise<string> {
  const { data, error } = await supabase.rpc("regenerate_join_code", { target_family_id: familyId });
  if (error) throw error;
  return data as string;
}

export async function joinFamilyByCode(code: string): Promise<string> {
  const { data, error } = await supabase.rpc("join_family_by_code", { target_code: code });
  if (error) throw error;
  return data as string;
}

/** true = keluarga masih ada; false = keluarga (beserta datanya) dihapus. */
export async function leaveFamily(): Promise<boolean> {
  const { data, error } = await supabase.rpc("leave_family");
  if (error) throw error;
  return data !== null;
}

export async function removeFamilyMember(targetUserId: string): Promise<void> {
  const { error } = await supabase.rpc("remove_family_member", { target_user_id: targetUserId });
  if (error) throw error;
}

export async function updateMyFamilyAvatar(avatarUrl: string | null): Promise<void> {
  const { error } = await supabase.rpc("update_my_family_avatar", { target_avatar_url: avatarUrl });
  if (error) throw error;
}

export async function updateMyFamilyName(name: string): Promise<void> {
  const { error } = await supabase.rpc("update_my_family_name", { target_name: name });
  if (error) throw error;
}

/* ================================ Transactions ================================ */

export async function fetchTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToTx);
}

export async function insertTransaction(
  userId: string,
  familyId: string | null,
  draft: TransactionDraft
): Promise<Transaction> {
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      family_id: draft.mode === "keluarga" ? familyId : null,
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

export async function deleteTransactionsByMode(userId: string, familyId: string | null, mode: Mode): Promise<void> {
  let query = supabase.from("transactions").delete();
  if (mode === "keluarga" && familyId) {
    query = query.eq("family_id", familyId);
  } else {
    query = query.eq("user_id", userId);
  }
  const { error } = await query.eq("mode", mode);
  if (error) throw error;
}

/* ================================ Members ================================ */

export async function fetchMembers(userId: string, familyId: string | null): Promise<Member[]> {
  if (!familyId) return [];
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!data || data.length === 0) {
    const created = await insertMember(userId, familyId, "Bersama", "#4FB0A5", true);
    return [created];
  }
  return data.map(rowToMember);
}

export async function insertMember(
  userId: string,
  familyId: string | null,
  name: string,
  color: string,
  builtIn = false
): Promise<Member> {
  const { data, error } = await supabase
    .from("members")
    .insert({ user_id: userId, family_id: familyId, name, color, built_in: builtIn })
    .select()
    .single();
  if (error) throw error;
  return rowToMember(data);
}

export async function deleteMemberById(id: string): Promise<void> {
  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) throw error;
}

/* ================================ Budgets ================================ */

export async function fetchBudgets(): Promise<Budget[]> {
  const { data, error } = await supabase.from("budgets").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToBudget);
}

export async function upsertBudget(userId: string, familyId: string | null, draft: BudgetDraft): Promise<Budget> {
  if (draft.mode === "keluarga") {
    if (!familyId) throw new Error("Tidak ada keluarga aktif.");
    const { data: existing, error: exErr } = await supabase
      .from("budgets")
      .select("id")
      .eq("family_id", familyId)
      .eq("mode", "keluarga")
      .eq("category", draft.category)
      .maybeSingle();
    if (exErr) throw exErr;
    if (existing?.id) {
      const { data, error } = await supabase
        .from("budgets")
        .update({ amount: draft.amount })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      return rowToBudget(data);
    }
    const { data, error } = await supabase
      .from("budgets")
      .insert({
        user_id: userId,
        family_id: familyId,
        mode: draft.mode,
        category: draft.category,
        amount: draft.amount,
      })
      .select()
      .single();
    if (error) throw error;
    return rowToBudget(data);
  }

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

function dedupeCategories(rows: Category[]): Category[] {
  const map = new Map<string, Category>();
  for (const c of rows) {
    const key = c.type + "|" + c.label.toLowerCase();
    const prev = map.get(key);
    if (!prev) map.set(key, c);
    else if (c.familyId && !prev.familyId) map.set(key, c);
  }
  return Array.from(map.values());
}

async function seedCategories(rows: Category[], draft: CategoryDraft[], familyId: string | null): Promise<Category[]> {
  const existing = new Set(rows.map((c) => c.type + "|" + c.label.toLowerCase()));
  const missing = draft.filter((c) => !existing.has(c.type + "|" + c.label.toLowerCase()));
  if (missing.length === 0) return rows;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id;
  if (!userId) return rows;
  try {
    await supabase
      .from("categories")
      .insert(missing.map((c) => ({ ...c, user_id: userId, family_id: familyId, is_default: true })));
  } catch (e) {
    console.warn("seed categories:", e);
  }
  return rows;
}

export async function fetchCategories(): Promise<Category[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id;
  if (!userId) return [];
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", userId)
    .is("family_id", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = (data || []).map(rowToCategory);
  await seedCategories(rows, DEFAULT_CATEGORIES, null);
  const { data: seeded, error: fetchError } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", userId)
    .is("family_id", null)
    .order("created_at", { ascending: true });
  if (fetchError) throw fetchError;
  return dedupeCategories((seeded || []).map(rowToCategory));
}

export async function fetchFamilyCategories(familyId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = (data || []).map(rowToCategory);
  await seedCategories(rows, DEFAULT_CATEGORIES, familyId);
  const { data: seeded, error: fetchError } = await supabase
    .from("categories")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });
  if (fetchError) throw fetchError;
  return dedupeCategories((seeded || []).map(rowToCategory));
}

export async function insertCategory(
  userId: string,
  familyId: string | null,
  draft: CategoryDraft,
  existing: Category[]
): Promise<Category> {
  const type = draft.type;
  const label = draft.label.trim();
  const icon = draft.icon || "MoreHorizontal";
  const color = draft.color || "var(--text-muted)";
  const byLabel = (c: Category) => c.type === type && c.label.toLowerCase() === label.toLowerCase();

  const dup = existing.find(byLabel);
  if (dup) return dup;
  const { data, error } = await supabase
    .from("categories")
    .insert({ user_id: userId, family_id: familyId, type, label, icon, color, is_default: false })
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
