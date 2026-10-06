export function formatRupiah(n: number | string): string {
  const v = Math.round(Number(n) || 0);
  return "Rp " + v.toLocaleString("id-ID");
}

/** "2026-01-05" -> "05/01/2026" (lebar tetap supaya rapi di kolom tabel). */
export function formatDateID(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return iso || "-";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** 41.666 -> "41,7%" */
export function formatPercentID(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
}
