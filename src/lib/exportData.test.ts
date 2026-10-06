import { describe, it, expect } from "vitest";
import {
  groupByCategory,
  groupByMember,
  resolveCategoryLabel,
  sortChronological,
} from "./exportData";
import type { Category, Member, Transaction } from "./types";

function tx(partial: Partial<Transaction>): Transaction {
  return {
    id: "t",
    mode: "pribadi",
    type: "out",
    amount: 0,
    category: "",
    note: "",
    date: "2026-01-01",
    memberId: null,
    familyId: null,
    userId: null,
    createdAt: 0,
    ...partial,
  };
}

function member(partial: Partial<Member>): Member {
  return {
    id: "m1",
    name: "Ayah",
    color: "#0f766e",
    builtIn: false,
    familyId: "f1",
    linkedUserId: null,
    displayName: null,
    avatarUrl: null,
    ...partial,
  };
}

function category(partial: Partial<Category>): Category {
  return {
    id: "c1",
    type: "out",
    label: "",
    icon: "",
    color: "",
    isDefault: false,
    familyId: null,
    sortOrder: 0,
    ...partial,
  };
}

describe("exportData - sortChronological", () => {
  it("sorts earliest date first", () => {
    const list = [
      tx({ id: "c", date: "2026-01-10", createdAt: 1 }),
      tx({ id: "a", date: "2026-01-05", createdAt: 3 }),
      tx({ id: "b", date: "2026-01-07", createdAt: 2 }),
    ];
    expect(sortChronological(list).map((t) => t.id)).toEqual(["a", "b", "c"]);
  });

  it("breaks same-date ties by creation order, oldest first", () => {
    const list = [
      tx({ id: "second", date: "2026-01-10", createdAt: 20 }),
      tx({ id: "third", date: "2026-01-10", createdAt: 30 }),
      tx({ id: "first", date: "2026-01-10", createdAt: 10 }),
    ];
    expect(sortChronological(list).map((t) => t.id)).toEqual(["first", "second", "third"]);
  });

  it("does not mutate the input array", () => {
    const list = [tx({ id: "b", date: "2026-01-10" }), tx({ id: "a", date: "2026-01-05" })];
    sortChronological(list);
    expect(list.map((t) => t.id)).toEqual(["b", "a"]);
  });

  it("returns the same list when empty", () => {
    expect(sortChronological([])).toEqual([]);
  });
});

describe("exportData - resolveCategoryLabel", () => {
  it("prefers the matching category label, case-insensitively", () => {
    const categories = [category({ type: "out", label: "Makanan Harian" })];
    expect(resolveCategoryLabel(categories, "out", "makanan harian")).toBe("Makanan Harian");
  });

  it("ignores categories of the other type", () => {
    const categories = [category({ type: "in", label: "Bukan ini" })];
    expect(resolveCategoryLabel(categories, "out", "makanan")).toBe("Makanan");
  });

  it("falls back to the built-in label map", () => {
    expect(resolveCategoryLabel([], "out", "transport")).toBe("Transport");
    expect(resolveCategoryLabel([], "in", "gaji")).toBe("Gaji");
  });

  it("falls back to the raw id, then to Lainnya", () => {
    expect(resolveCategoryLabel([], "out", "kopi")).toBe("kopi");
    expect(resolveCategoryLabel([], "out", "")).toBe("Lainnya");
  });
});

describe("exportData - groupByCategory", () => {
  const list = [
    tx({ type: "out", category: "makanan", amount: 500, date: "2026-01-01" }),
    tx({ type: "out", category: "makanan", amount: 250, date: "2026-01-02" }),
    tx({ type: "out", category: "transport", amount: 250, date: "2026-01-03" }),
    tx({ type: "in", category: "gaji", amount: 900, date: "2026-01-04" }),
  ];

  it("only aggregates transactions of the requested type", () => {
    const rows = groupByCategory(list, [], "out");
    expect(rows.map((r) => r.category)).toEqual(["makanan", "transport"]);
    expect(rows.find((r) => r.category === "makanan")?.total).toBe(750);
  });

  it("counts transactions per category", () => {
    const rows = groupByCategory(list, [], "out");
    expect(rows.find((r) => r.category === "makanan")?.count).toBe(2);
    expect(rows.find((r) => r.category === "transport")?.count).toBe(1);
  });

  it("computes each category's share of its own type total", () => {
    const rows = groupByCategory(list, [], "out");
    expect(rows.find((r) => r.category === "makanan")?.pct).toBeCloseTo(75, 5);
    expect(rows.find((r) => r.category === "transport")?.pct).toBeCloseTo(25, 5);
  });

  it("orders rows by total descending", () => {
    const rows = groupByCategory(list, [], "out");
    expect(rows[0].total).toBeGreaterThanOrEqual(rows[1].total);
  });

  it("matches the category list case-insensitively", () => {
    const categories = [category({ type: "out", label: "makanan" })];
    const rows = groupByCategory([tx({ type: "out", category: "Makanan", amount: 10 })], categories, "out");
    expect(rows[0].label).toBe("makanan");
  });

  it("returns no rows when the type has no transactions", () => {
    expect(groupByCategory(list, [], "in").map((r) => r.category)).toEqual(["gaji"]);
    expect(groupByCategory([tx({ type: "in", amount: 0 })], [], "out")).toEqual([]);
  });
});

describe("exportData - groupByMember", () => {
  it("sums income and expense per member and derives net", () => {
    const list = [
      tx({ memberId: "m1", type: "out", amount: 300 }),
      tx({ memberId: "m1", type: "in", amount: 800 }),
      tx({ memberId: "m2", type: "out", amount: 100 }),
    ];
    const rows = groupByMember(list, [member({ id: "m1" }), member({ id: "m2", name: "Ibu" })]);
    const m1 = rows.find((r) => r.memberId === "m1");
    expect(m1).toMatchObject({ income: 800, expense: 300, net: 500 });
    expect(rows.find((r) => r.memberId === "m2")?.expense).toBe(100);
  });

  it("prefers the linked account name over the label name", () => {
    const list = [tx({ memberId: "m1", type: "out", amount: 10 })];
    const rows = groupByMember(list, [member({ id: "m1", name: "Ayah", displayName: "Budi" })]);
    expect(rows[0].name).toBe("Budi");
  });

  it("groups transactions without a member under Tanpa anggota", () => {
    const list = [
      tx({ memberId: null, type: "out", amount: 40 }),
      tx({ memberId: null, type: "in", amount: 10 }),
    ];
    const rows = groupByMember(list, []);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ memberId: null, name: "Tanpa anggota", expense: 40, income: 10 });
  });

  it("orders rows by expense descending", () => {
    const list = [
      tx({ memberId: "small", type: "out", amount: 10 }),
      tx({ memberId: "big", type: "out", amount: 900 }),
      tx({ memberId: "mid", type: "out", amount: 500 }),
    ];
    const rows = groupByMember(list, []);
    expect(rows.map((r) => r.memberId)).toEqual(["big", "mid", "small"]);
  });

  it("returns no rows when there is nothing to aggregate", () => {
    expect(groupByMember([], [])).toEqual([]);
  });
});
