import { supabase } from "./supabaseClient";

function rowToTx(row) {
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

function rowToMember(row) {
  return { id: row.id, name: row.name, color: row.color, builtIn: row.built_in };
}

export async function fetchTransactions(userId) {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToTx);
}

export async function insertTransaction(userId, draft) {
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

export async function deleteTransactionById(id) {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteTransactionsByMode(userId, mode) {
  const { error } = await supabase.from("transactions").delete().eq("user_id", userId).eq("mode", mode);
  if (error) throw error;
}

export async function fetchMembers(userId) {
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

export async function insertMember(userId, name, color, builtIn = false) {
  const { data, error } = await supabase
    .from("members")
    .insert({ user_id: userId, name, color, built_in: builtIn })
    .select()
    .single();
  if (error) throw error;
  return rowToMember(data);
}

export async function deleteMemberById(id) {
  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) throw error;
}
