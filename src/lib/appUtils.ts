import { useState, useEffect, useRef } from "react";
import type { TxType } from "./types";

export function nameFromEmail(email: string): string {
  const base = (email || "").split("@")[0] || "Pengguna";
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export function toISO(d: Date): string {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

export function todayISO(): string {
  return toISO(new Date());
}

export function monthKeyFor(offset: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

export function monthLabel(offset: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

export function monthRange(offset: number): { start: string; end: string } {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  const start = toISO(d);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return { start, end: toISO(d) };
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const today = todayISO();
  const yestD = new Date();
  yestD.setDate(yestD.getDate() - 1);
  const yest = toISO(yestD);
  if (iso === today) return "Hari ini";
  if (iso === yest) return "Kemarin";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export function deltaPct(cur: number, prev: number): number {
  if (prev <= 0) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

interface MonthTotalsInput {
  date: string;
  type: TxType;
  amount: number;
}

export function monthTotals(
  list: MonthTotalsInput[],
  key: string
): { income: number; expense: number; balance: number } {
  const monthTx = list.filter((t) => t.date.startsWith(key));
  const income = monthTx.filter((t) => t.type === "in").reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter((t) => t.type === "out").reduce((s, t) => s + t.amount, 0);
  return { income, expense, balance: income - expense };
}

export function buildCatBreakdown(
  monthTx: { type: TxType; amount: number }[]
): { name: string; value: number; type: TxType; color: string }[] {
  const map = { in: 0, out: 0 };
  monthTx.forEach((t) => {
    map[t.type] += t.amount;
  });
  const items: { name: string; value: number; type: TxType; color: string }[] = [
    { name: "Pemasukan", value: map.in, type: "in", color: "var(--positive)" },
    { name: "Pengeluaran", value: map.out, type: "out", color: "var(--negative)" },
  ];
  return items.filter((c) => c.value > 0);
}

export function budgetColor(pct: number): string {
  if (pct >= 100) return "var(--negative)";
  if (pct >= 80) return "#f5b50a";
  return "var(--blue)";
}

export function useCountUp(value: number, duration = 650): number {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  useEffect(() => {
    const start = prevRef.current;
    const change = value - start;
    const startTime = performance.now();
    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + change * eased);
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
      else prevRef.current = value;
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return display;
}

export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
