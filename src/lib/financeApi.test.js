import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./supabaseClient.js", () => {
  let chainResolve;
  const chainResolvers = {
    set(fetchValue, singleValue) {
      chainResolve = {
        fetchValue,
        singleValue,
      };
    },
    get() {
      return chainResolve;
    },
  };
  const methods = {};
  const chain = {
    from: vi.fn(() => methods),
  };
  ["select", "insert", "update", "upsert", "delete", "eq", "order"].forEach((name) => {
    chain[name] = vi.fn(() => methods);
    methods[name] = chain[name];
  });
  chain.single = vi.fn(() => Promise.resolve(chainResolve.singleValue));
  methods.single = chain.single;
  methods.then = (onFulfilled) => Promise.resolve(chainResolve.fetchValue).then(onFulfilled);
  return { supabase: chain, chainResolvers };
});

import { supabase, chainResolvers } from "./supabaseClient.js";
import {
  fetchTransactions,
  insertTransaction,
  updateTransaction,
  deleteTransactionById,
  deleteTransactionsByMode,
  fetchMembers,
  insertMember,
  deleteMemberById,
  fetchBudgets,
  upsertBudget,
  deleteBudgetById,
  fetchCategories,
  insertCategory,
  updateCategory,
  deleteCategory,
} from "./financeApi.js";

function setupChain(fetchResult, sResult = fetchResult) {
  chainResolvers.set(fetchResult || { data: null, error: null }, sResult || { data: null, error: null });
}

function settledChain(value) {
  const then = (onFulfilled) => Promise.resolve(value).then(onFulfilled);
  const self = {
    select: () => self,
    insert: () => self,
    update: () => self,
    upsert: () => self,
    delete: () => self,
    eq: () => self,
    order: () => self,
    single: () => Promise.resolve(value),
    then,
  };
  return self;
}

beforeEach(() => {
  vi.clearAllMocks();
  setupChain();
});

describe("financeApi - transactions", () => {
  const txRow = {
    id: "tx1",
    mode: "pribadi",
    type: "out",
    amount: "50000",
    category: "Makanan",
    note: "Makan siang",
    date: "2026-09-08",
    member_id: null,
    created_at: "2026-09-08T00:00:00.000Z",
  };

  it("fetchTransactions returns mapped rows and orders by date", async () => {
    setupChain({ data: [txRow], error: null });
    const result = await fetchTransactions("u1");

    expect(supabase.from).toHaveBeenCalledWith("transactions");
    expect(supabase.eq).toHaveBeenCalledWith("user_id", "u1");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "tx1",
      mode: "pribadi",
      type: "out",
      amount: 50000,
      category: "Makanan",
      note: "Makan siang",
      date: "2026-09-08",
      memberId: null,
      createdAt: new Date("2026-09-08T00:00:00.000Z").getTime(),
    });
  });

  it("fetchTransactions throws on error", async () => {
    setupChain({ data: null, error: { message: "db down" } });
    await expect(fetchTransactions("u1")).rejects.toThrow("db down");
  });

  it("insertTransaction sends the correct payload including built-in default for member", async () => {
    setupChain({ data: { ...txRow, amount: "50000" }, error: null });
    await insertTransaction("u1", {
      mode: "pribadi",
      type: "out",
      amount: 50000,
      category: "Makanan",
      note: "Makan siang",
      date: "2026-09-08",
      memberId: null,
    });

    expect(supabase.insert).toHaveBeenCalledWith({
      user_id: "u1",
      mode: "pribadi",
      type: "out",
      amount: 50000,
      category: "Makanan",
      note: "Makan siang",
      date: "2026-09-08",
      member_id: null,
    });
  });

  it("updateTransaction sends the update payload", async () => {
    setupChain({ data: { ...txRow, amount: "60000" }, error: null });
    await updateTransaction("tx1", {
      type: "in",
      amount: 60000,
      category: "Gaji",
      note: "",
      date: "2026-09-09",
      memberId: "m1",
    });

    expect(supabase.update).toHaveBeenCalledWith({
      type: "in",
      amount: 60000,
      category: "Gaji",
      note: "",
      date: "2026-09-09",
      member_id: "m1",
    });
    expect(supabase.eq).toHaveBeenCalledWith("id", "tx1");
  });

  it("deleteTransactionById calls delete with the id", async () => {
    setupChain({ data: null, error: null });
    await deleteTransactionById("tx1");

    expect(supabase.delete).toHaveBeenCalled();
    expect(supabase.eq).toHaveBeenCalledWith("id", "tx1");
  });

  it("deleteTransactionsByMode scopes delete to user and mode", async () => {
    setupChain({ data: null, error: null });
    await deleteTransactionsByMode("u1", "keluarga");

    expect(supabase.eq).toHaveBeenCalledWith("user_id", "u1");
    expect(supabase.eq).toHaveBeenCalledWith("mode", "keluarga");
  });
});

describe("financeApi - members", () => {
  it("fetchMembers seeds a default Bersama member when empty", async () => {
    setupChain(
      { data: [], error: null },
      { data: { id: "m-bersama", user_id: "u1", name: "Bersama", color: "#4FB0A5", built_in: true }, error: null }
    );
    const result = await fetchMembers("u1");

    expect(supabase.insert).toHaveBeenCalledWith({
      user_id: "u1",
      name: "Bersama",
      color: "#4FB0A5",
      built_in: true,
    });
    expect(result).toEqual([
      { id: "m-bersama", name: "Bersama", color: "#4FB0A5", builtIn: true },
    ]);
  });

  it("insertMember returns the mapped member", async () => {
    setupChain({ data: { id: "m1", user_id: "u1", name: "Ayah", color: "#ff0000", built_in: false }, error: null });
    const result = await insertMember("u1", "Ayah", "#ff0000", false);

    expect(supabase.insert).toHaveBeenCalledWith({
      user_id: "u1",
      name: "Ayah",
      color: "#ff0000",
      built_in: false,
    });
    expect(result).toEqual({ id: "m1", name: "Ayah", color: "#ff0000", builtIn: false });
  });

  it("deleteMemberById deletes the member by id", async () => {
    setupChain({ data: null, error: null });
    await deleteMemberById("m1");
    expect(supabase.eq).toHaveBeenCalledWith("id", "m1");
  });
});

describe("financeApi - budgets", () => {
  it("fetchBudgets returns mapped budgets", async () => {
    setupChain({
      data: [
        { id: "b1", user_id: "u1", mode: "pribadi", category: "Makanan", amount: "1000000" },
      ],
      error: null,
    });
    const result = await fetchBudgets("u1");

    expect(result).toEqual([{ id: "b1", mode: "pribadi", category: "Makanan", amount: 1000000 }]);
  });

  it("upsertBudget sends draft and onConflict config", async () => {
    setupChain({ data: { id: "b1", user_id: "u1", mode: "pribadi", category: "Makanan", amount: "1000000" }, error: null });
    const result = await upsertBudget("u1", {
      mode: "pribadi",
      category: "Makanan",
      amount: 1000000,
    });

    expect(supabase.upsert).toHaveBeenCalledWith(
      { user_id: "u1", mode: "pribadi", category: "Makanan", amount: 1000000 },
      { onConflict: "user_id,mode,category" }
    );
    expect(result.amount).toBe(1000000);
  });

  it("deleteBudgetById deletes the budget by id", async () => {
    setupChain({ data: null, error: null });
    await deleteBudgetById("b1");
    expect(supabase.eq).toHaveBeenCalledWith("id", "b1");
  });
});

describe("financeApi - categories", () => {
  const catRow = {
    id: "c1",
    user_id: "u1",
    type: "out",
    label: "Makanan",
    icon: "UtensilsCrossed",
    color: "var(--negative)",
    is_default: true,
  };

  it("fetchCategories returns mapped categories when rows exist", async () => {
    setupChain({ data: [catRow], error: null });
    const result = await fetchCategories("u1");

    expect(result).toEqual([
      { id: "c1", type: "out", label: "Makanan", icon: "UtensilsCrossed", color: "var(--negative)", isDefault: true },
    ]);
  });

  it("fetchCategories maps is_default to isDefault", async () => {
    const row = { ...catRow, is_default: false };
    setupChain({ data: [row], error: null });
    const result = await fetchCategories("u1");
    expect(result[0].isDefault).toBe(false);
  });

  it("insertCategory defaults icon and color", async () => {
    setupChain({ data: { ...catRow, id: "c2", is_default: false }, error: null });
    await insertCategory("u1", { type: "in", label: "Lainnya" });

    expect(supabase.insert).toHaveBeenCalledWith({
      user_id: "u1",
      type: "in",
      label: "Lainnya",
      icon: "MoreHorizontal",
      color: "var(--text-muted)",
      is_default: false,
    });
  });

  it("updateCategory sends label, icon, and color", async () => {
    setupChain({ data: { ...catRow, label: "Kuliner", icon: "Car", color: "#000000" }, error: null });
    await updateCategory("c1", { label: "Kuliner", icon: "Car", color: "#000000" });

    expect(supabase.update).toHaveBeenCalledWith({ label: "Kuliner", icon: "Car", color: "#000000" });
    expect(supabase.eq).toHaveBeenCalledWith("id", "c1");
  });

  it("deleteCategory only deletes non-default categories", async () => {
    setupChain({ data: null, error: null });
    await deleteCategory("c1");
    expect(supabase.eq).toHaveBeenCalledWith("id", "c1");
    expect(supabase.eq).toHaveBeenCalledWith("is_default", false);
  });

  it("fetchCategories throws when seeding default categories fails", async () => {
    supabase.from
      .mockReturnValueOnce(settledChain({ data: [], error: null }))
      .mockReturnValueOnce(settledChain({ data: null, error: { message: "seed failed" } }));

    await expect(fetchCategories("u1")).rejects.toThrow("seed failed");
  });
});
