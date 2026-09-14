import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./supabaseClient", () => {
  let chainResolve = { fetchValue: null, singleValue: null, maybeSingleValue: null };
  const chainResolvers = {
    set(fetchValue, singleValue, maybeSingleValue) {
      chainResolve = { fetchValue, singleValue, maybeSingleValue };
    },
    get() {
      return chainResolve;
    },
  };
  const methods = {};
  const chain = {
    from: vi.fn(() => methods),
    rpc: vi.fn((name) => {
      void name;
      const val = chainResolve.fetchValue;
      return Promise.resolve(val);
    }),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "u1" } }, error: null })),
    },
  };
  ["select", "insert", "update", "upsert", "delete", "eq", "order"].forEach((name) => {
    chain[name] = vi.fn(() => methods);
    methods[name] = chain[name];
  });
  chain.single = vi.fn(() => Promise.resolve(chainResolve.singleValue));
  methods.single = chain.single;
  chain.maybeSingle = vi.fn(() => Promise.resolve(chainResolve.maybeSingleValue));
  methods.maybeSingle = chain.maybeSingle;
  methods.then = (onFulfilled) => Promise.resolve(chainResolve.fetchValue).then(onFulfilled);
  return { supabase: chain, chainResolvers };
});

import { supabase, chainResolvers } from "./supabaseClient";
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
  fetchMyFamily,
  createFamily,
  fetchJoinCode,
  regenerateJoinCode,
  joinFamilyByCode,
  leaveFamily,
  removeFamilyMember,
} from "./financeApi";

function setupChain(fetchResult, singleResult = fetchResult, maybeSingleResult = fetchResult) {
  chainResolvers.set(fetchResult || { data: null, error: null }, singleResult || { data: null, error: null }, maybeSingleResult || { data: null, error: null });
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
    maybeSingle: () => Promise.resolve(value),
    then,
  };
  return self;
}

beforeEach(() => {
  vi.clearAllMocks();
  setupChain();
});

describe("financeApi - keluarga", () => {
  const memberRow = {
    id: "fm1",
    family_id: "fam1",
    user_id: "u1",
    role: "kepala_keluarga",
    email: "a@mail.com",
    created_at: "2026-09-01T00:00:00.000Z",
  };

  it("fetchMyFamily returns null when no membership exists", async () => {
    setupChain({ data: [], error: null });
    const result = await fetchMyFamily();
    expect(result).toBeNull();
  });

  it("fetchMyFamily returns family and mapped members", async () => {
    setupChain(
      { data: [memberRow], error: null },
      { data: { id: "fam1", name: "Keluarga" }, error: null },
      { data: { id: "fam1", name: "Keluarga" }, error: null }
    );

    const result = await fetchMyFamily();
    expect(supabase.from).toHaveBeenCalledWith("family_members");
    expect(supabase.from).toHaveBeenCalledWith("families");
    expect(result?.family).toEqual({ id: "fam1", name: "Keluarga" });
    expect(result?.members).toEqual([
      {
        id: "fm1",
        familyId: "fam1",
        userId: "u1",
        role: "kepala_keluarga",
        email: "a@mail.com",
        createdAt: new Date("2026-09-01T00:00:00.000Z").getTime(),
      },
    ]);
  });

  it("createFamily calls rpc and returns empty shell family", async () => {
    setupChain({ data: "fam1", error: null });
    const result = await createFamily();
    expect(supabase.rpc).toHaveBeenCalledWith("create_family");
    expect(result).toEqual({ id: "fam1", name: "Keluarga" });
  });

  it("fetchJoinCode calls get_join_code rpc", async () => {
    setupChain({ data: "AB12CD34", error: null });
    const result = await fetchJoinCode("fam1");
    expect(supabase.rpc).toHaveBeenCalledWith("get_join_code", { target_family_id: "fam1" });
    expect(result).toBe("AB12CD34");
  });

  it("regenerateJoinCode calls regenerate_join_code rpc", async () => {
    setupChain({ data: "XY98PQ12", error: null });
    const result = await regenerateJoinCode("fam1");
    expect(supabase.rpc).toHaveBeenCalledWith("regenerate_join_code", { target_family_id: "fam1" });
    expect(result).toBe("XY98PQ12");
  });

  it("joinFamilyByCode calls join_family_by_code rpc", async () => {
    setupChain({ data: "fam1", error: null });
    const result = await joinFamilyByCode("ab12 cd34");
    expect(supabase.rpc).toHaveBeenCalledWith("join_family_by_code", { target_code: "ab12 cd34" });
    expect(result).toBe("fam1");
  });

  it("leaveFamily returns true when family persists", async () => {
    setupChain({ data: "fam1", error: null });
    await expect(leaveFamily()).resolves.toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith("leave_family");
  });

  it("leaveFamily returns false when family was deleted", async () => {
    setupChain({ data: null, error: null });
    await expect(leaveFamily()).resolves.toBe(false);
  });

  it("removeFamilyMember calls remove_family_member rpc", async () => {
    setupChain({ data: null, error: null });
    await removeFamilyMember("u2");
    expect(supabase.rpc).toHaveBeenCalledWith("remove_family_member", { target_user_id: "u2" });
  });
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
    family_id: null,
    created_at: "2026-09-08T00:00:00.000Z",
  };

  it("fetchTransactions maps rows and orders by date (RLS scoped)", async () => {
    setupChain({ data: [txRow], error: null });
    const result = await fetchTransactions();

    expect(supabase.from).toHaveBeenCalledWith("transactions");
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
      familyId: null,
      createdAt: new Date("2026-09-08T00:00:00.000Z").getTime(),
    });
  });

  it("fetchTransactions throws on error", async () => {
    setupChain({ data: null, error: { message: "db down" } });
    await expect(fetchTransactions()).rejects.toThrow("db down");
  });

  it("insertTransaction sends family_id null for pribadi", async () => {
    setupChain({ data: { ...txRow, amount: "50000" }, error: null });
    await insertTransaction("u1", null, {
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
      family_id: null,
      mode: "pribadi",
      type: "out",
      amount: 50000,
      category: "Makanan",
      note: "Makan siang",
      date: "2026-09-08",
      member_id: null,
    });
  });

  it("insertTransaction sends family_id for keluarga", async () => {
    setupChain({ data: { ...txRow, mode: "keluarga", family_id: "fam1" }, error: null });
    await insertTransaction("u1", "fam1", {
      mode: "keluarga",
      type: "out",
      amount: 50000,
      category: "Makanan",
      note: "",
      date: "2026-09-08",
      memberId: "m1",
    });

    expect(supabase.insert).toHaveBeenCalledWith({
      user_id: "u1",
      family_id: "fam1",
      mode: "keluarga",
      type: "out",
      amount: 50000,
      category: "Makanan",
      note: "",
      date: "2026-09-08",
      member_id: "m1",
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

  it("deleteTransactionsByMode scopes pribadi delete to user and mode", async () => {
    setupChain({ data: null, error: null });
    await deleteTransactionsByMode("u1", null, "pribadi");

    expect(supabase.eq).toHaveBeenCalledWith("user_id", "u1");
    expect(supabase.eq).toHaveBeenCalledWith("mode", "pribadi");
  });

  it("deleteTransactionsByMode scopes keluarga delete to family and mode", async () => {
    setupChain({ data: null, error: null });
    await deleteTransactionsByMode("u1", "fam1", "keluarga");

    expect(supabase.eq).toHaveBeenCalledWith("family_id", "fam1");
    expect(supabase.eq).toHaveBeenCalledWith("mode", "keluarga");
  });
});

describe("financeApi - members", () => {
  const memberRow = {
    id: "m1",
    user_id: "u1",
    family_id: "fam1",
    name: "Ayah",
    color: "#ff0000",
    built_in: false,
  };

  it("fetchMembers returns [] when no family", async () => {
    const result = await fetchMembers("u1", null);
    expect(result).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("fetchMembers seeds a default Bersama member when empty", async () => {
    setupChain(
      { data: [], error: null },
      { data: { ...memberRow, id: "m-bersama", name: "Bersama", color: "#4FB0A5", built_in: true }, error: null }
    );
    const result = await fetchMembers("u1", "fam1");

    expect(supabase.eq).toHaveBeenCalledWith("family_id", "fam1");
    expect(supabase.insert).toHaveBeenCalledWith({
      user_id: "u1",
      family_id: "fam1",
      name: "Bersama",
      color: "#4FB0A5",
      built_in: true,
    });
    expect(result).toEqual([{ id: "m-bersama", name: "Bersama", color: "#4FB0A5", builtIn: true, familyId: "fam1" }]);
  });

  it("fetchMembers returns mapped members", async () => {
    setupChain({ data: [memberRow], error: null });
    const result = await fetchMembers("u1", "fam1");
    expect(result).toEqual([{ id: "m1", name: "Ayah", color: "#ff0000", builtIn: false, familyId: "fam1" }]);
  });

  it("insertMember returns the mapped member", async () => {
    setupChain({ data: memberRow, error: null });
    const result = await insertMember("u1", "fam1", "Ayah", "#ff0000", false);

    expect(supabase.insert).toHaveBeenCalledWith({
      user_id: "u1",
      family_id: "fam1",
      name: "Ayah",
      color: "#ff0000",
      built_in: false,
    });
    expect(result).toEqual({ id: "m1", name: "Ayah", color: "#ff0000", builtIn: false, familyId: "fam1" });
  });

  it("deleteMemberById deletes the member by id", async () => {
    setupChain({ data: null, error: null });
    await deleteMemberById("m1");
    expect(supabase.eq).toHaveBeenCalledWith("id", "m1");
  });
});

describe("financeApi - budgets", () => {
  const budgetRow = {
    id: "b1",
    user_id: "u1",
    family_id: null,
    mode: "pribadi",
    category: "Makanan",
    amount: "1000000",
  };

  it("fetchBudgets returns mapped budgets", async () => {
    setupChain({ data: [budgetRow], error: null });
    const result = await fetchBudgets();

    expect(result).toEqual([{ id: "b1", mode: "pribadi", category: "Makanan", amount: 1000000, familyId: null }]);
  });

  it("upsertBudget pribadi sends draft and onConflict config", async () => {
    setupChain({ data: budgetRow, error: null });
    const result = await upsertBudget("u1", null, {
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

  it("upsertBudget keluarga updates existing family budget", async () => {
    setupChain(
      null,
      { data: { ...budgetRow, family_id: "fam1", mode: "keluarga", amount: "2000000" }, error: null },
      { data: { id: "b1" }, error: null }
    );
    const result = await upsertBudget("u1", "fam1", {
      mode: "keluarga",
      category: "Makanan",
      amount: 2000000,
    });

    expect(supabase.eq).toHaveBeenCalledWith("family_id", "fam1");
    expect(supabase.eq).toHaveBeenCalledWith("mode", "keluarga");
    expect(supabase.eq).toHaveBeenCalledWith("category", "Makanan");
    expect(supabase.update).toHaveBeenCalledWith({ amount: 2000000 });
    expect(result.amount).toBe(2000000);
  });

  it("upsertBudget keluarga inserts when no existing budget", async () => {
    setupChain(
      null,
      { data: { ...budgetRow, family_id: "fam1", mode: "keluarga", amount: "1000000" }, error: null },
      { data: null, error: null }
    );
    const result = await upsertBudget("u1", "fam1", {
      mode: "keluarga",
      category: "Makanan",
      amount: 1000000,
    });

    expect(supabase.insert).toHaveBeenCalledWith({
      user_id: "u1",
      family_id: "fam1",
      mode: "keluarga",
      category: "Makanan",
      amount: 1000000,
    });
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
    family_id: null,
  };

  it("fetchCategories returns deduped mapped categories when rows exist", async () => {
    setupChain({ data: [catRow], error: null });
    const result = await fetchCategories();

    expect(result).toEqual([
      {
        id: "c1",
        type: "out",
        label: "Makanan",
        icon: "UtensilsCrossed",
        color: "var(--negative)",
        isDefault: true,
        familyId: null,
      },
    ]);
  });

  it("fetchCategories prefers family category over personal duplicate", async () => {
    setupChain({
      data: [
        { ...catRow, id: "c-personal", family_id: null },
        { ...catRow, id: "c-family", family_id: "fam1", color: "var(--blue)" },
      ],
      error: null,
    });
    const result = await fetchCategories();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c-family");
    expect(result[0].familyId).toBe("fam1");
  });

  it("fetchCategories seeds defaults when empty using current user", async () => {
    setupChain({ data: [], error: null });
    supabase.from
      .mockReturnValueOnce(settledChain({ data: [], error: null }))
      .mockReturnValueOnce(settledChain({ data: null, error: null }))
      .mockReturnValueOnce(
        settledChain({
          data: [{ ...catRow, id: "c-def", is_default: true }],
          error: null,
        })
      );
    const result = await fetchCategories();

    expect(supabase.auth.getUser).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c-def");
  });

  it("fetchCategories throws when seeding default categories fails", async () => {
    setupChain({ data: [], error: null });
    supabase.from.mockReturnValueOnce(settledChain({ data: [], error: null })).mockReturnValueOnce(
      settledChain({ data: null, error: { message: "seed failed" } })
    );

    await expect(fetchCategories()).rejects.toThrow("seed failed");
  });

  it("insertCategory pribadi returns the existing personal duplicate", async () => {
    const result = await insertCategory(
      "u1",
      null,
      { type: "out", label: "Makanan" },
      [{ ...catRow, id: "existing", isDefault: false, familyId: null }]
    );

    expect(supabase.from).not.toHaveBeenCalled();
    expect(result.id).toBe("existing");
  });

  it("insertCategory pribadi inserts when no duplicate", async () => {
    setupChain({ data: { ...catRow, id: "c2", is_default: false }, error: null });
    await insertCategory("u1", null, { type: "in", label: "Lainnya" }, [
      { ...catRow, id: "other", label: "Gaji", isDefault: false, familyId: null },
    ]);

    expect(supabase.insert).toHaveBeenCalledWith({
      user_id: "u1",
      family_id: null,
      type: "in",
      label: "Lainnya",
      icon: "MoreHorizontal",
      color: "var(--text-muted)",
      is_default: false,
    });
  });

  it("insertCategory keluarga promotes personal category to family", async () => {
    setupChain({ data: { ...catRow, family_id: "fam1" }, error: null });
    const result = await insertCategory(
      "u1",
      "fam1",
      { type: "out", label: "Makanan" },
      [{ ...catRow, id: "c1", isDefault: false, familyId: null }]
    );

    expect(supabase.update).toHaveBeenCalledWith({ family_id: "fam1" });
    expect(supabase.eq).toHaveBeenCalledWith("id", "c1");
    expect(result.familyId).toBe("fam1");
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
});