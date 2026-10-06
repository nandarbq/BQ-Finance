import { memberLabelName } from "./appUtils";
import type { Category, Member, Transaction, TxType } from "./types";

/** Label kategori bawaan, dipakai sebagai cadangan bila `categories` kosong. */
const CAT_LABELS: Record<TxType, Record<string, string>> = {
  in: {
    gaji: "Gaji",
    bonus: "Bonus",
    usaha: "Usaha",
    hadiah: "Hadiah",
    investasi: "Investasi",
    lainnya_in: "Lainnya",
  },
  out: {
    makanan: "Makanan",
    transport: "Transport",
    belanja: "Belanja",
    tagihan: "Tagihan",
    hiburan: "Hiburan",
    kesehatan: "Kesehatan",
    pendidikan: "Pendidikan",
    lainnya_out: "Lainnya",
  },
};

export function resolveCategoryLabel(categories: Category[], type: TxType, catId: string): string {
  const found = categories.find((c) => c.type === type && c.label.toLowerCase() === String(catId).toLowerCase());
  if (found) return found.label;
  return CAT_LABELS[type][catId] || catId || "Lainnya";
}

/**
 * Urut kronologis naik untuk laporan cetak: tanggal paling awal lebih dulu,
 * dan dalam satu tanggal yang dibuat lebih dulu lebih dulu.
 * Mengembalikan salinan — array asli tidak diurutkan ulang, jadi urutan
 * tampilan di layar (terbaru di atas) tidak ikut berubah.
 */
export function sortChronological(list: Transaction[]): Transaction[] {
  return [...list].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.createdAt - b.createdAt;
  });
}

export interface CategoryRecapRow {
  category: string;
  label: string;
  total: number;
  count: number;
  pct: number;
}

/** Rekap per kategori untuk satu jenis transaksi, terurut dari yang terbesar. */
export function groupByCategory(
  list: Transaction[],
  categories: Category[],
  type: TxType
): CategoryRecapRow[] {
  const rows: CategoryRecapRow[] = [];
  const index = new Map<string, CategoryRecapRow>();
  let total = 0;

  for (const t of list) {
    if (t.type !== type) continue;
    const key = String(t.category || "");
    let row = index.get(key);
    if (!row) {
      row = {
        category: key,
        label: resolveCategoryLabel(categories, type, key),
        total: 0,
        count: 0,
        pct: 0,
      };
      index.set(key, row);
      rows.push(row);
    }
    row.total += t.amount;
    row.count += 1;
    total += t.amount;
  }

  if (total > 0) {
    for (const r of rows) r.pct = (r.total / total) * 100;
  }
  return rows.sort((a, b) => b.total - a.total || b.count - a.count);
}

export interface MemberRecapRow {
  memberId: string | null;
  name: string;
  income: number;
  expense: number;
  net: number;
}

/** Rekap per anggota, terurut dari pengeluaran terbesar. */
export function groupByMember(list: Transaction[], members: Member[]): MemberRecapRow[] {
  const rows: MemberRecapRow[] = [];
  const index = new Map<string, MemberRecapRow>();

  for (const t of list) {
    const key = t.memberId || "";
    let row = index.get(key);
    if (!row) {
      const member = t.memberId ? members.find((m) => m.id === t.memberId) : undefined;
      row = {
        memberId: t.memberId,
        name: member ? memberLabelName(member) : "Tanpa anggota",
        income: 0,
        expense: 0,
        net: 0,
      };
      index.set(key, row);
      rows.push(row);
    }
    if (t.type === "in") row.income += t.amount;
    else row.expense += t.amount;
    row.net = row.income - row.expense;
  }

  return rows.sort((a, b) => b.expense - a.expense || b.income - a.income);
}
