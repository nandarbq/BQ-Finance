import { useState, useEffect, useRef } from "react";

function nameFromEmail(email) {
  const base = (email || "").split("@")[0] || "Pengguna";
  return base.charAt(0).toUpperCase() + base.slice(1);
}
function toISO(d) {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}
function todayISO() {
  return toISO(new Date());
}
function monthKeyFor(offset) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}
function monthLabel(offset) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}
function monthRange(offset) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  const start = toISO(d);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return { start, end: toISO(d) };
}
function formatDateShort(iso) {
  const d = new Date(iso + "T00:00:00");
  const today = todayISO();
  const yestD = new Date();
  yestD.setDate(yestD.getDate() - 1);
  const yest = toISO(yestD);
  if (iso === today) return "Hari ini";
  if (iso === yest) return "Kemarin";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function deltaPct(cur, prev) {
  if (prev <= 0) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 100);
}
function monthTotals(list, key) {
  const monthTx = list.filter((t) => t.date.startsWith(key));
  const income = monthTx.filter((t) => t.type === "in").reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter((t) => t.type === "out").reduce((s, t) => s + t.amount, 0);
  return { income, expense, balance: income - expense };
}
function buildCatBreakdown(monthTx) {
  const map = { in: 0, out: 0 };
  monthTx.forEach((t) => {
    map[t.type] += t.amount;
  });
  return [
    { name: "Pemasukan", value: map.in, type: "in", color: "var(--positive)" },
    { name: "Pengeluaran", value: map.out, type: "out", color: "var(--negative)" },
  ].filter((c) => c.value > 0);
}
function budgetColor(pct) {
  if (pct >= 100) return "var(--negative)";
  if (pct >= 80) return "#f5b50a";
  return "var(--blue)";
}
function useCountUp(value, duration = 650) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  const frameRef = useRef(null);
  useEffect(() => {
    const start = prevRef.current;
    const change = value - start;
    const startTime = performance.now();
    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + change * eased);
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
      else prevRef.current = value;
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => frameRef.current && cancelAnimationFrame(frameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return display;
}

function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export {
  nameFromEmail,
  toISO,
  todayISO,
  monthKeyFor,
  monthLabel,
  monthRange,
  formatDateShort,
  deltaPct,
  monthTotals,
  buildCatBreakdown,
  budgetColor,
  useCountUp,
  useDebouncedValue,
};
