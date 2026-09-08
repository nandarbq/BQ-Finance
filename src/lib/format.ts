export function formatRupiah(n: number | string): string {
  const v = Math.round(Number(n) || 0);
  return "Rp " + v.toLocaleString("id-ID");
}
