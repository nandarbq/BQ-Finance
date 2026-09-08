import { useState, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Mode, Transaction, Member, Budget, Category, TabId } from "../lib/types";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieIcon,
  ListChecks,
  Target,
  Search,
  X,
  Calendar,
  Loader2,
  FileDown,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Check,
  LogOut,
  UserPlus,
  Moon,
  Sun,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "./Toast";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip, BarChart, Bar, XAxis, YAxis } from "recharts";
import { exportTransactionPdf } from "../lib/exportPdf";
import { formatRupiah } from "../lib/format";
import {
  monthKeyFor,
  monthLabel,
  monthRange,
  todayISO,
  formatDateShort,
  toISO,
  deltaPct,
  monthTotals,
  buildCatBreakdown,
  budgetColor,
  useCountUp,
  useDebouncedValue,
} from "../lib/appUtils";
import { getCatMeta, ICON_MAP, MEMBER_COLORS } from "../lib/categoryMeta";
import { Avatar, EmptyState } from "./ui";
import { CalendarSheet } from "./Sheets";

interface TabBerandaProps {
  mode: Mode;
  modeTx: Transaction[];
  modeBudgets: Budget[];
  members: Member[];
  setActiveTab: Dispatch<SetStateAction<TabId>>;
  openQuickAdd: () => void;
  categories: Category[];
}

function TabBeranda({ mode, modeTx, modeBudgets, members, setActiveTab, openQuickAdd, categories }: TabBerandaProps) {
  const curKey = monthKeyFor(0);
  const monthTx = useMemo(() => modeTx.filter((t) => t.date.startsWith(curKey)), [modeTx, curKey]);
  const totalIncome = useMemo(() => modeTx.filter((t) => t.type === "in").reduce((s, t) => s + t.amount, 0), [modeTx]);
  const totalExpense = useMemo(
    () => modeTx.filter((t) => t.type === "out").reduce((s, t) => s + t.amount, 0),
    [modeTx]
  );
  const balance = totalIncome - totalExpense;
  const balanceDisplay = useCountUp(balance);
  const monthIncome = useMemo(
    () => monthTx.filter((t) => t.type === "in").reduce((s, t) => s + t.amount, 0),
    [monthTx]
  );
  const monthExpense = useMemo(
    () => monthTx.filter((t) => t.type === "out").reduce((s, t) => s + t.amount, 0),
    [monthTx]
  );

  const catBreakdown = useMemo(() => buildCatBreakdown(monthTx), [monthTx]);

  const recent = useMemo(() => [...modeTx].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5), [modeTx]);

  const budgetRows = useMemo(
    () =>
      modeBudgets.map((b) => {
        const spent = monthTx
          .filter((t) => t.type === "out" && t.category === b.category)
          .reduce((s, t) => s + t.amount, 0);
        const meta = getCatMeta(categories, "out", b.category);
        const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
        return { ...b, meta, spent, pct };
      }),
    [modeBudgets, monthTx, categories]
  );

  return (
    <div className="px-4 pt-1 pb-4">
      <div
        className="relative overflow-hidden rounded-3xl px-5 pt-5 pb-6 mb-4"
        style={{ background: "linear-gradient(160deg,var(--blue-soft) 0%,var(--bg-app) 60%,var(--bg-app) 100%)" }}
      >
        <div className="bqfinance-blob bqfinance-blob-a" />
        <div className="bqfinance-blob bqfinance-blob-b" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <span style={{ color: "var(--text-muted)", fontSize: 12.5, fontWeight: 500 }}>
              Saldo {mode === "keluarga" ? "keluarga" : "pribadi"}
            </span>
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-full"
              style={{ background: "rgba(0,171,107,0.14)" }}
            >
              <Wallet size={11} color="var(--blue)" />
              <span style={{ color: "var(--blue)", fontSize: 10.5, fontWeight: 600 }}>Total</span>
            </div>
          </div>
          <p
            className="mt-1.5"
            style={{
              fontFamily: "'Sora', sans-serif",
              fontWeight: 700,
              fontSize: 30,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
            }}
          >
            {formatRupiah(balanceDisplay)}
          </p>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div
                className="flex items-center justify-center"
                style={{ width: 26, height: 26, borderRadius: 9, background: "rgba(0,171,107,0.16)" }}
              >
                <ArrowUpRight size={13} color="var(--positive)" />
              </div>
              <div>
                <p style={{ color: "var(--text-muted)", fontSize: 10.5 }}>Pemasukan bln ini</p>
                <p style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 600 }}>
                  {formatRupiah(monthIncome)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="flex items-center justify-center"
                style={{ width: 26, height: 26, borderRadius: 9, background: "rgba(238,74,73,0.16)" }}
              >
                <ArrowDownRight size={13} color="var(--negative)" />
              </div>
              <div>
                <p style={{ color: "var(--text-muted)", fontSize: 10.5 }}>Pengeluaran bln ini</p>
                <p style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 600 }}>
                  {formatRupiah(monthExpense)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--bg-surface)" }}>
        <div className="flex items-center justify-between mb-1">
          <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13.5 }}>Pemasukan & pengeluaran</p>
          <button
            onClick={() => setActiveTab("grafik")}
            style={{ color: "var(--blue)", fontSize: 11.5, fontWeight: 600 }}
          >
            Lihat grafik
          </button>
        </div>
        {catBreakdown.length === 0 ? (
          <EmptyState
            icon={PieIcon}
            title="Belum ada transaksi bulan ini"
            subtitle="Catat pemasukan & pengeluaranmu untuk melihat grafiknya di sini."
          />
        ) : (
          <div className="flex items-center gap-3 mt-2">
            <div style={{ width: 112, height: 112, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={catBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={36}
                    outerRadius={54}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {catBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              {catBreakdown.map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div style={{ width: 7, height: 7, borderRadius: 99, background: c.color }} />
                    <span style={{ color: "var(--text-secondary)", fontSize: 11.5 }}>{c.name}</span>
                  </div>
                  <span style={{ color: "var(--text-primary)", fontSize: 11.5, fontWeight: 600 }}>
                    {formatRupiah(c.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--bg-surface)" }}>
        <div className="flex items-center justify-between mb-2">
          <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13.5 }}>Anggaran bulan ini</p>
          <button
            onClick={() => setActiveTab("pengaturan")}
            style={{ color: "var(--blue)", fontSize: 11.5, fontWeight: 600 }}
          >
            Atur
          </button>
        </div>
        {budgetRows.length === 0 ? (
          <button
            onClick={() => setActiveTab("pengaturan")}
            className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5"
            style={{ background: "var(--bg-muted)", color: "var(--text-muted)", fontSize: 11.5 }}
          >
            <Target size={14} color="var(--blue)" />
            <span>Belum ada anggaran. Ketuk untuk atur limit pengeluaran tiap kategori.</span>
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            {budgetRows.map((b) => {
              const Icon = b.meta.icon;
              const over = b.spent > b.amount;
              const remaining = b.amount - b.spent;
              return (
                <div key={b.id} className="flex items-center gap-2.5">
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: "color-mix(in srgb, " + b.meta.color + " 15%, transparent)",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={15} color={b.meta.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p style={{ color: "var(--text-primary)", fontSize: 12, fontWeight: 600 }}>{b.meta.label}</p>
                      <p
                        style={{
                          color: over ? "var(--negative)" : "var(--text-muted)",
                          fontSize: 10.5,
                          fontWeight: 600,
                        }}
                      >
                        {over ? "Lebih " + formatRupiah(-remaining) : "Sisa " + formatRupiah(remaining)}
                      </p>
                    </div>
                    <div
                      className="mt-1.5 h-1.5 rounded-full overflow-hidden"
                      style={{ background: "var(--bg-muted)" }}
                    >
                      <div
                        style={{
                          width: Math.min(b.pct, 100) + "%",
                          height: "100%",
                          borderRadius: 99,
                          background: budgetColor(b.pct),
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span style={{ color: "var(--text-faint)", fontSize: 10 }}>{formatRupiah(b.spent)} dipakai</span>
                      <span style={{ color: "var(--text-faint)", fontSize: 10 }}>dari {formatRupiah(b.amount)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl p-4" style={{ background: "var(--bg-surface)" }}>
        <div className="flex items-center justify-between mb-1">
          <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13.5 }}>Transaksi terbaru</p>
          <button
            onClick={() => setActiveTab("transaksi")}
            style={{ color: "var(--blue)", fontSize: 11.5, fontWeight: 600 }}
          >
            Lihat semua
          </button>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="Belum ada transaksi"
            subtitle="Ketuk tombol + di bawah untuk mulai mencatat."
          />
        ) : (
          <div className="flex flex-col mt-1.5">
            {recent.map((t) => {
              const meta = getCatMeta(categories, t.type, t.category);
              const Icon = meta.icon;
              const member = members.find((m) => m.id === t.memberId);
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-2.5 py-2"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: "color-mix(in srgb, " + meta.color + " 15%, transparent)",
                    }}
                  >
                    <Icon size={15} color={meta.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ color: "var(--text-primary)", fontSize: 12.5, fontWeight: 500 }} className="truncate">
                      {meta.label}
                      {t.note ? " - " + t.note : ""}
                    </p>
                    <p style={{ color: "var(--text-muted)", fontSize: 10.5 }}>
                      {formatDateShort(t.date)}
                      {member ? " - " + member.name : ""}
                    </p>
                  </div>
                  <span
                    style={{
                      color: t.type === "in" ? "var(--positive)" : "var(--negative)",
                      fontSize: 12.5,
                      fontWeight: 700,
                    }}
                  >
                    {t.type === "in" ? "+" : "-"}
                    {formatRupiah(t.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <button
        onClick={openQuickAdd}
        className="w-full mt-4 rounded-2xl py-3"
        style={{ background: "var(--bg-muted)", color: "var(--blue)", fontSize: 12.5, fontWeight: 600 }}
      >
        + Catat transaksi baru
      </button>
    </div>
  );
}

interface TabTransaksiProps {
  modeTx: Transaction[];
  members: Member[];
  mode: Mode;
  displayName: string;
  onDelete: (id: string) => void | Promise<void>;
  onEdit: (tx: Transaction) => void;
  onDetail: (tx: Transaction) => void;
  categories: Category[];
}

function TabTransaksi({
  modeTx,
  members,
  mode,
  displayName,
  onDelete,
  onEdit,
  onDetail,
  categories,
}: TabTransaksiProps) {
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");
  const [period, setPeriod] = useState<"all" | "month" | "lastMonth" | "custom">("month");
  const [startDate, setStartDate] = useState(monthRange(0).start);
  const [endDate, setEndDate] = useState(todayISO());
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [exporting, setExporting] = useState(false);
  const [rangeSheetOpen, setRangeSheetOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 250);

  const periodRange = useMemo(() => {
    if (period === "month") return monthRange(0);
    if (period === "lastMonth") return monthRange(-1);
    if (period === "custom") return { start: startDate, end: endDate };
    return null;
  }, [period, startDate, endDate]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    let list = [...modeTx];
    if (filter !== "all") list = list.filter((t) => t.type === filter);
    if (periodRange?.start) list = list.filter((t) => t.date >= periodRange.start && t.date <= periodRange.end);
    if (q) {
      list = list.filter((t) => {
        const member = members.find((m) => m.id === t.memberId);
        const note = (t.note || "").toLowerCase();
        const catLabel = getCatMeta(categories, t.type, t.category).label.toLowerCase();
        const amount = String(Math.round(t.amount)).toLowerCase();
        const memberName = member ? member.name.toLowerCase() : "";
        return note.includes(q) || catLabel.includes(q) || amount.includes(q) || memberName.includes(q);
      });
    }
    return list.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : b.createdAt - a.createdAt));
  }, [modeTx, filter, periodRange, debouncedQuery, members, categories]);

  const summary = useMemo(
    () =>
      filtered.reduce(
        (total, t) => {
          total[t.type === "in" ? "income" : "expense"] += t.amount;
          return total;
        },
        { income: 0, expense: 0 }
      ),
    [filtered]
  );

  const grouped = useMemo(() => {
    const map: Record<string, Transaction[]> = {};
    filtered.forEach((t) => {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    });
    return Object.entries(map);
  }, [filtered]);

  function periodLabel() {
    if (period === "all") return "Semua waktu";
    if (period === "month") return monthLabel(0);
    if (period === "lastMonth") return monthLabel(-1);
    return formatDateShort(startDate) + " - " + formatDateShort(endDate);
  }

  async function handleExportPdf() {
    if (filtered.length === 0) {
      toast.error("Tidak ada transaksi untuk diekspor. Periksa kembali periode dan filter.");
      return;
    }
    setExporting(true);
    const id = toast.loading("Membuat PDF...");
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        exportTransactionPdf({
          transactions: filtered,
          members,
          mode,
          periodLabel: periodLabel(),
          displayName,
          categories,
        }),
        new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error("timeout")), 20000);
        }),
      ]);
      clearTimeout(timeoutId);
      toast.resolve(id, "success", "PDF berhasil diunduh");
    } catch {
      clearTimeout(timeoutId);
      toast.resolve(id, "error", "Gagal membuat PDF. Coba lagi.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="px-4 pt-1 pb-4">
      <div className="relative mb-3">
        <Search
          size={14}
          color="var(--text-faint)"
          style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari catatan, kategori, nominal, atau anggota..."
          aria-label="Cari transaksi"
          className="w-full outline-none"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderColor: query ? "var(--blue)" : "var(--border)",
            color: "var(--text-primary)",
            fontSize: 12.5,
            padding: "10px 12px 10px 34px",
            borderRadius: 12,
          }}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label="Bersihkan pencarian"
            className="p-1 rounded-full"
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              background: "var(--bg-muted)",
              color: "var(--text-faint)",
            }}
          >
            <X size={13} />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 mb-4">
        {[
          { id: "all", label: "Semua" },
          { id: "in", label: "Pemasukan" },
          { id: "out", label: "Pengeluaran" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as "all" | "in" | "out")}
            className="px-3 py-1.5 rounded-full transition-colors"
            style={{
              background: filter === f.id ? "var(--blue)" : "var(--bg-muted)",
              color: filter === f.id ? "var(--bg-app)" : "var(--text-muted)",
              fontSize: 11.5,
              fontWeight: 600,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="rounded-2xl p-3 mb-4" style={{ background: "var(--bg-surface)" }}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5" style={{ color: "var(--blue)" }}>
            <Calendar size={14} />
            <span style={{ fontSize: 11.5, fontWeight: 600 }}>Periode transaksi</span>
          </div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as "all" | "month" | "lastMonth" | "custom")}
            aria-label="Pilih periode transaksi"
            className="outline-none rounded-lg px-2 py-1"
            style={{ background: "var(--bg-selected)", color: "var(--text-primary)", fontSize: 11.5 }}
          >
            <option value="all">Semua waktu</option>
            <option value="month">Bulan ini</option>
            <option value="lastMonth">Bulan lalu</option>
            <option value="custom">Pilih rentang</option>
          </select>
        </div>
        {period === "custom" && (
          <>
            <button
              onClick={() => setRangeSheetOpen(true)}
              className="w-full mt-3 flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5"
              style={{ background: "var(--bg-muted)", color: "var(--blue)", fontSize: 11, fontWeight: 600 }}
            >
              <Calendar size={12} />
              <span className="truncate">
                {formatDateShort(startDate)} — {formatDateShort(endDate)}
              </span>
            </button>
            {rangeSheetOpen && (
              <CalendarSheet
                mode="range"
                initial={{ start: startDate, end: endDate }}
                maxDate={todayISO()}
                onClose={() => setRangeSheetOpen(false)}
                onConfirm={(v) => {
                  if (typeof v === "object") {
                    setStartDate(v.start);
                    setEndDate(v.end);
                    setRangeSheetOpen(false);
                  }
                }}
              />
            )}
          </>
        )}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
          <div>
            <p style={{ color: "var(--text-muted)", fontSize: 9.5 }}>Pemasukan</p>
            <p style={{ color: "var(--positive)", fontSize: 11, fontWeight: 700 }}>{formatRupiah(summary.income)}</p>
          </div>
          <div>
            <p style={{ color: "var(--text-muted)", fontSize: 9.5 }}>Pengeluaran</p>
            <p style={{ color: "var(--negative)", fontSize: 11, fontWeight: 700 }}>{formatRupiah(summary.expense)}</p>
          </div>
          <div>
            <p style={{ color: "var(--text-muted)", fontSize: 9.5 }}>Selisih</p>
            <p
              style={{
                color: summary.income - summary.expense >= 0 ? "var(--blue)" : "var(--negative)",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {formatRupiah(summary.income - summary.expense)}
            </p>
          </div>
        </div>
        <button
          onClick={handleExportPdf}
          disabled={exporting}
          className="w-full mt-3 flex items-center justify-center gap-1.5 rounded-xl py-2"
          style={{
            background: exporting ? "var(--blue-soft)" : "var(--blue)",
            color: exporting ? "var(--blue)" : "var(--bg-app)",
            fontSize: 11.5,
            fontWeight: 700,
            cursor: exporting ? "default" : "pointer",
          }}
        >
          {exporting ? (
            <>
              <Loader2 size={13} className="bqfinance-toast-spin" />
              Membuat PDF...
            </>
          ) : (
            <>
              <FileDown size={13} />
              Export PDF
            </>
          )}
        </button>
      </div>

      {grouped.length === 0 ? (
        <EmptyState
          icon={Search}
          title={query ? "Tidak ditemukan" : "Tidak ada transaksi"}
          subtitle={
            query ? "Coba kata kunci lain atau periksa filternya." : "Coba ubah filter atau catat transaksi baru."
          }
        />
      ) : (
        grouped.map(([date, txs]) => (
          <div key={date} className="mb-4">
            <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600 }} className="mb-1.5">
              {formatDateShort(date)}
            </p>
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-surface)" }}>
              {txs.map((t, idx) => {
                const meta = getCatMeta(categories, t.type, t.category);
                const Icon = meta.icon;
                const member = members.find((m) => m.id === t.memberId);
                const isConfirm = confirmId === t.id;
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-2.5 px-3.5 py-2.5"
                    style={{ borderTop: idx === 0 ? "none" : "1px solid var(--border)" }}
                  >
                    <div
                      className="flex items-center justify-center"
                      onClick={() => onDetail(t)}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 11,
                        background: "color-mix(in srgb, " + meta.color + " 15%, transparent)",
                        flexShrink: 0,
                        cursor: "pointer",
                      }}
                    >
                      <Icon size={15} color={meta.color} />
                    </div>
                    <div className="flex-1 min-w-0" onClick={() => onDetail(t)} style={{ cursor: "pointer" }}>
                      <p style={{ color: "var(--text-primary)", fontSize: 12.5, fontWeight: 500 }} className="truncate">
                        {meta.label}
                      </p>
                      <p style={{ color: "var(--text-muted)", fontSize: 10.5 }} className="truncate">
                        {t.note ? t.note : member ? member.name : "\u00A0"}
                      </p>
                    </div>
                    {!isConfirm ? (
                      <>
                        <span
                          style={{
                            color: t.type === "in" ? "var(--positive)" : "var(--negative)",
                            fontSize: 12.5,
                            fontWeight: 700,
                          }}
                        >
                          {t.type === "in" ? "+" : "-"}
                          {formatRupiah(t.amount)}
                        </span>
                        <button
                          onClick={() => onEdit(t)}
                          aria-label={"Edit transaksi " + meta.label}
                          className="p-1.5 rounded-lg"
                        >
                          <Pencil size={13} color="var(--text-faint)" />
                        </button>
                        <button onClick={() => setConfirmId(t.id)} className="p-1.5 rounded-lg">
                          <Trash2 size={13} color="var(--text-faint)" />
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            onDelete(t.id);
                            setConfirmId(null);
                          }}
                          className="px-2 py-1 rounded-lg"
                          style={{
                            background: "var(--negative)",
                            color: "var(--bg-app)",
                            fontSize: 10.5,
                            fontWeight: 700,
                          }}
                        >
                          Hapus
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="px-2 py-1 rounded-lg"
                          style={{
                            background: "var(--bg-selected)",
                            color: "var(--text-secondary)",
                            fontSize: 10.5,
                            fontWeight: 600,
                          }}
                        >
                          Batal
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function TabGrafik({ modeTx }: { modeTx: Transaction[] }) {
  const [offset, setOffset] = useState(0);
  const curKey = monthKeyFor(offset);
  const monthTx = useMemo(() => modeTx.filter((t) => t.date.startsWith(curKey)), [modeTx, curKey]);

  const curTotals = useMemo(() => monthTotals(modeTx, curKey), [modeTx, curKey]);
  const prevTotals = useMemo(() => monthTotals(modeTx, monthKeyFor(offset - 1)), [modeTx, offset]);
  const compare = useMemo(() => !(curTotals.income === 0 && curTotals.expense === 0), [curTotals]);

  function renderCompareRow({
    label,
    cur,
    prev,
    goodWhenDown,
    accent,
  }: {
    label: string;
    cur: number;
    prev: number;
    goodWhenDown: boolean;
    accent: string;
  }) {
    const delta = deltaPct(cur, prev);
    const up = delta > 0;
    const flat = delta === 0;
    const good = flat ? true : up ? !goodWhenDown : goodWhenDown;
    const Icon = up ? ArrowUpRight : ArrowDownRight;
    return (
      <div className="flex items-center gap-3 py-2" style={{ borderTop: "1px solid var(--border)" }}>
        <div
          className="flex items-center justify-center"
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            background: "color-mix(in srgb, " + accent + " 15%, transparent)",
            flexShrink: 0,
          }}
        >
          <Icon size={14} color={accent} />
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ color: "var(--text-primary)", fontSize: 12.5, fontWeight: 600 }}>{formatRupiah(cur)}</p>
          <p style={{ color: "var(--text-muted)", fontSize: 10.5 }}>
            {label} · bulan lalu {formatRupiah(prev)}
          </p>
        </div>
        <div
          className="flex items-center gap-1 px-2 py-1 rounded-full flex-shrink-0"
          style={{ background: flat ? "var(--bg-muted)" : "rgba(" + (good ? "0,171,107" : "238,74,73") + ",0.14)" }}
        >
          <Icon size={10} color={flat ? "var(--text-faint)" : good ? "var(--positive)" : "var(--negative)"} />
          <span
            style={{
              color: flat ? "var(--text-faint)" : good ? "var(--positive)" : "var(--negative)",
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {flat ? "0%" : Math.abs(delta) + "%"}
          </span>
        </div>
      </div>
    );
  }

  const catBreakdown = useMemo(() => buildCatBreakdown(monthTx), [monthTx]);
  const totalMonth = catBreakdown.reduce((s, c) => s + c.value, 0);

  const weekData = useMemo(() => {
    const days: { label: string; income: number; expense: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = toISO(d);
      const dayTx = modeTx.filter((t) => t.date === iso);
      const income = dayTx.filter((t) => t.type === "in").reduce((s, t) => s + t.amount, 0);
      const expense = dayTx.filter((t) => t.type === "out").reduce((s, t) => s + t.amount, 0);
      days.push({ label: d.toLocaleDateString("id-ID", { weekday: "short" }), income, expense });
    }
    return days;
  }, [modeTx]);

  return (
    <div className="px-4 pt-1 pb-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setOffset((o) => o - 1)}
          className="p-1.5 rounded-lg"
          style={{ background: "var(--bg-muted)" }}
        >
          <ChevronLeft size={15} color="var(--text-secondary)" />
        </button>
        <p style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>
          {monthLabel(offset)}
        </p>
        <button
          onClick={() => setOffset((o) => Math.min(o + 1, 0))}
          className="p-1.5 rounded-lg"
          style={{ background: "var(--bg-muted)", opacity: offset === 0 ? 0.4 : 1 }}
          disabled={offset === 0}
        >
          <ChevronRight size={15} color="var(--text-secondary)" />
        </button>
      </div>

      <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--bg-surface)" }}>
        <div className="flex items-center justify-between mb-1">
          <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13.5 }}>Perbandingan bulan</p>
          <span style={{ color: "var(--text-muted)", fontSize: 10.5 }}>
            {monthLabel(offset)} vs {monthLabel(offset - 1)}
          </span>
        </div>
        {compare ? (
          <div className="flex flex-col mt-1">
            {renderCompareRow({
              label: "Pemasukan",
              cur: curTotals.income,
              prev: prevTotals.income,
              goodWhenDown: false,
              accent: "var(--positive)",
            })}
            {renderCompareRow({
              label: "Pengeluaran",
              cur: curTotals.expense,
              prev: prevTotals.expense,
              goodWhenDown: true,
              accent: "var(--negative)",
            })}
            {renderCompareRow({
              label: "Selisih",
              cur: curTotals.balance,
              prev: prevTotals.balance,
              goodWhenDown: true,
              accent: "var(--blue)",
            })}
          </div>
        ) : (
          <EmptyState
            icon={TrendingUp}
            title="Tidak ada data untuk dibandingkan"
            subtitle="Catat transaksi bulan ini untuk melihat perbandingannya dengan bulan lalu."
          />
        )}
      </div>

      <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--bg-surface)" }}>
        <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13.5 }} className="mb-2">
          Pemasukan & pengeluaran
        </p>
        {catBreakdown.length === 0 ? (
          <EmptyState icon={PieIcon} title="Tidak ada data" subtitle="Belum ada transaksi tercatat pada bulan ini." />
        ) : (
          <>
            <div style={{ width: "100%", height: 170 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={catBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {catBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <RTooltip
                    formatter={(v) => formatRupiah(Number(v))}
                    contentStyle={{ background: "var(--bg-muted)", border: "none", borderRadius: 10, fontSize: 11 }}
                    itemStyle={{ color: "var(--text-primary)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-1.5 mt-2">
              {catBreakdown.map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div style={{ width: 7, height: 7, borderRadius: 99, background: c.color }} />
                    <span style={{ color: c.type === "in" ? "var(--positive)" : "var(--negative)", fontSize: 11 }}>
                      {c.type === "in" ? "+" : "-"}
                    </span>
                    <span style={{ color: "var(--text-secondary)", fontSize: 11.5 }}>{c.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: "var(--text-muted)", fontSize: 10.5 }}>
                      {totalMonth ? Math.round((c.value / totalMonth) * 100) : 0}%
                    </span>
                    <span style={{ color: "var(--text-primary)", fontSize: 11.5, fontWeight: 600 }}>
                      {formatRupiah(c.value)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="rounded-2xl p-4" style={{ background: "var(--bg-surface)" }}>
        <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13.5 }} className="mb-2">
          7 hari terakhir
        </p>
        <div style={{ width: "100%", height: 150 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekData} barGap={2}>
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <RTooltip
                formatter={(v) => formatRupiah(Number(v))}
                contentStyle={{ background: "var(--bg-muted)", border: "none", borderRadius: 10, fontSize: 11 }}
                itemStyle={{ color: "var(--text-primary)" }}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
              />
              <Bar dataKey="income" fill="var(--positive)" radius={[4, 4, 0, 0]} maxBarSize={10} />
              <Bar dataKey="expense" fill="var(--negative)" radius={[4, 4, 0, 0]} maxBarSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-1 justify-center">
          <div className="flex items-center gap-1.5">
            <div style={{ width: 7, height: 7, borderRadius: 99, background: "var(--positive)" }} />
            <span style={{ color: "var(--text-muted)", fontSize: 10.5 }}>Pemasukan</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div style={{ width: 7, height: 7, borderRadius: 99, background: "var(--negative)" }} />
            <span style={{ color: "var(--text-muted)", fontSize: 10.5 }}>Pengeluaran</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TabPengaturanProps {
  mode: Mode;
  members: Member[];
  modeBudgets: Budget[];
  onAddMember: (name: string, color: string) => void | Promise<void>;
  onDeleteMember: (id: string) => void | Promise<void>;
  onSaveBudget: (category: string, amount: number) => void | Promise<void>;
  onDeleteBudget: (id: string) => void | Promise<void>;
  onClearData: () => void | Promise<void>;
  modeTx: Transaction[];
  userEmail: string;
  onSignOut: () => void | Promise<void>;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  displayName: string;
  onNameChange: (name: string) => void;
  categories: Category[];
}

function TabPengaturan({
  mode,
  members,
  modeBudgets,
  onAddMember,
  onDeleteMember,
  onSaveBudget,
  onDeleteBudget,
  onClearData,
  modeTx,
  userEmail,
  onSignOut,
  theme,
  onToggleTheme,
  displayName,
  onNameChange,
  categories,
}: TabPengaturanProps) {
  const [showAddMember, setShowAddMember] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(MEMBER_COLORS[0]);
  const [confirmClear, setConfirmClear] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState(displayName);
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [budgetCat, setBudgetCat] = useState<string | null>(null);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [confirmBudgetId, setConfirmBudgetId] = useState<string | null>(null);
  const [confirmMemberId, setConfirmMemberId] = useState<string | null>(null);

  const memberTotals = useMemo(
    () =>
      members.map((m) => {
        const spent = modeTx.filter((t) => t.memberId === m.id && t.type === "out").reduce((s, t) => s + t.amount, 0);
        return { ...m, spent };
      }),
    [members, modeTx]
  );

  return (
    <div className="px-4 pt-1 pb-4">
      <div
        className="rounded-2xl p-4 mb-4 flex items-center justify-between"
        style={{ background: "var(--bg-surface)" }}
      >
        <div className="min-w-0 flex-1 mr-2">
          {editingName ? (
            <div className="flex items-center gap-1.5">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={displayName}
                maxLength={40}
                autoFocus
                className="flex-1 min-w-0 px-3 py-2 rounded-xl outline-none"
                style={{
                  background: "var(--bg-muted)",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  border: "1px solid var(--bg-selected)",
                }}
              />
              <button
                onClick={() => {
                  onNameChange(editName);
                  setEditingName(false);
                }}
                disabled={!editName || !editName.trim()}
                aria-label="Simpan nama"
                className="p-2 flex items-center justify-center rounded-xl flex-shrink-0"
                style={{
                  background: !editName || !editName.trim() ? "var(--bg-selected)" : "var(--blue)",
                  color: !editName || !editName.trim() ? "var(--text-faint)" : "var(--bg-app)",
                }}
              >
                <Check size={15} />
              </button>
              <button
                onClick={() => {
                  setEditName(displayName);
                  setEditingName(false);
                }}
                aria-label="Batal ubah nama"
                className="p-2 flex items-center justify-center rounded-xl flex-shrink-0"
                style={{ background: "var(--bg-muted)", color: "var(--text-secondary)" }}
              >
                <X size={15} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13.5 }} className="truncate">
                {displayName}
              </p>
              <button
                onClick={() => {
                  setEditName(displayName);
                  setEditingName(true);
                }}
                aria-label="Ubah nama"
                className="p-1.5 rounded-full flex-shrink-0 transition-transform active:scale-90"
                style={{ background: "var(--bg-muted)" }}
              >
                <Pencil size={12} color="var(--blue)" />
              </button>
            </div>
          )}
          <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }} className="truncate">
            Masuk sebagai {userEmail}
          </p>
        </div>
        <button
          onClick={onSignOut}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0"
          style={{ background: "var(--bg-muted)" }}
        >
          <LogOut size={12} color="var(--negative)" />
          <span style={{ color: "var(--negative)", fontSize: 11, fontWeight: 600 }}>Keluar</span>
        </button>
      </div>

      <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--bg-surface)" }}>
        <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13.5 }}>Mode aktif</p>
        <p style={{ color: "var(--text-muted)", fontSize: 11.5, marginTop: 3 }}>
          {mode === "keluarga"
            ? "Pencatatan keuangan keluarga. Setiap transaksi dapat dikaitkan dengan anggota keluarga."
            : "Pencatatan keuangan pribadi. Ganti ke mode Keluarga lewat tombol di bagian atas beranda."}
        </p>
      </div>

      <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--bg-surface)" }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Target size={14} color="var(--blue)" />
            <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13.5 }}>Anggaran</p>
          </div>
          <button
            onClick={() => setShowAddBudget((v) => !v)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full"
            style={{ background: "var(--bg-muted)" }}
          >
            <UserPlus size={12} color="var(--blue)" />
            <span style={{ color: "var(--blue)", fontSize: 10.5, fontWeight: 600 }}>Tambah</span>
          </button>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 10 }}>
          Limit pengeluaran bulanan per kategori di mode {mode === "keluarga" ? "keluarga" : "pribadi"}. Terkait di
          kartu Beranda.
        </p>
        {showAddBudget && (
          <div className="rounded-xl p-3 mb-3" style={{ background: "var(--bg-muted)" }}>
            <div className="flex items-center justify-between mb-2">
              <p style={{ color: "var(--text-primary)", fontSize: 12, fontWeight: 600 }}>Tambah Anggaran</p>
              <button
                onClick={() => {
                  setShowAddBudget(false);
                  setBudgetCat(null);
                  setBudgetAmount("");
                }}
                className="p-1 rounded-full"
                style={{ background: "var(--bg-app)" }}
              >
                <X size={13} color="var(--text-muted)" />
              </button>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: 10.5, fontWeight: 600 }} className="mb-1.5">
              Pilih kategori
            </p>
            <div className="grid grid-cols-4 gap-1.5 mb-2.5">
              {categories
                .filter((c) => c.type === "out")
                .map((c) => {
                  const Icon = ICON_MAP[c.icon] || MoreHorizontal;
                  const active = budgetCat === c.label;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setBudgetCat(c.label)}
                      className="flex flex-col items-center gap-1 py-2 rounded-lg"
                      style={{
                        background: active ? "color-mix(in srgb, " + c.color + " 15%, transparent)" : "var(--bg-app)",
                        boxShadow: active ? "0 0 0 1.5px " + c.color + " inset" : "none",
                      }}
                    >
                      <Icon size={14} color={active ? c.color : "var(--text-muted)"} />
                      <span
                        style={{
                          color: active ? "var(--text-primary)" : "var(--text-muted)",
                          fontSize: 8.5,
                          fontWeight: 600,
                        }}
                      >
                        {c.label}
                      </span>
                    </button>
                  );
                })}
            </div>
            <div
              className="flex items-center gap-1.5 mb-2.5 px-3 py-2 rounded-lg"
              style={{ background: "var(--bg-app)", border: "1px solid var(--bg-selected)" }}
            >
              <span style={{ color: "var(--text-muted)", fontSize: 12.5, fontWeight: 600 }}>Rp</span>
              <input
                inputMode="numeric"
                value={budgetAmount ? Number(budgetAmount).toLocaleString("id-ID") : ""}
                onChange={(e) => setBudgetAmount(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="0"
                className="w-full outline-none bg-transparent"
                style={{ color: "var(--text-primary)", fontSize: 12.5, border: "none" }}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowAddBudget(false);
                  setBudgetCat(null);
                  setBudgetAmount("");
                }}
                className="flex-1 py-2 rounded-lg"
                style={{ background: "var(--bg-app)", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600 }}
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (budgetCat && parseInt(budgetAmount, 10) > 0) {
                    onSaveBudget(budgetCat, parseInt(budgetAmount, 10));
                    setBudgetCat(null);
                    setBudgetAmount("");
                    setShowAddBudget(false);
                  }
                }}
                className="flex-1 py-2 rounded-lg"
                style={{ background: "var(--blue)", color: "var(--bg-app)", fontSize: 12, fontWeight: 700 }}
              >
                Simpan
              </button>
            </div>
          </div>
        )}
        {modeBudgets.length === 0 ? (
          !showAddBudget && (
            <p style={{ color: "var(--text-faint)", fontSize: 11 }}>Belum ada anggaran untuk mode ini.</p>
          )
        ) : (
          <div className="flex flex-col gap-2">
            {modeBudgets.map((b) => {
              const meta = getCatMeta(categories, "out", b.category);
              const Icon = meta.icon;
              const isConfirmBudget = confirmBudgetId === b.id;
              return (
                <div key={b.id} className="flex items-center gap-2.5">
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 9,
                      background: "color-mix(in srgb, " + meta.color + " 15%, transparent)",
                    }}
                  >
                    <Icon size={14} color={meta.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ color: "var(--text-primary)", fontSize: 12.5, fontWeight: 500 }} className="truncate">
                      {meta.label}
                    </p>
                    <p style={{ color: "var(--text-muted)", fontSize: 10.5 }}>{formatRupiah(b.amount)} / bulan</p>
                  </div>
                  {!isConfirmBudget ? (
                    <button onClick={() => setConfirmBudgetId(b.id)} className="p-1.5">
                      <Trash2 size={13} color="var(--text-faint)" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => {
                          onDeleteBudget(b.id);
                          setConfirmBudgetId(null);
                        }}
                        className="px-2 py-1 rounded-lg"
                        style={{ background: "var(--negative)", color: "var(--bg-app)", fontSize: 10, fontWeight: 700 }}
                      >
                        Hapus
                      </button>
                      <button
                        onClick={() => setConfirmBudgetId(null)}
                        className="px-2 py-1 rounded-lg"
                        style={{
                          background: "var(--bg-selected)",
                          color: "var(--text-secondary)",
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      >
                        Batal
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div
        className="rounded-2xl p-4 mb-4 flex items-center justify-between"
        style={{ background: "var(--bg-surface)" }}
      >
        <div className="flex-1 min-w-0 mr-3">
          <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13.5 }}>Tampilan</p>
          <p style={{ color: "var(--text-muted)", fontSize: 11.5, marginTop: 3 }}>
            {theme === "light" ? "Mode terang aktif" : "Mode gelap aktif"}
          </p>
        </div>
        <button
          onClick={onToggleTheme}
          aria-label="Ganti tema"
          className="flex items-center justify-center rounded-xl flex-shrink-0"
          style={{ width: 38, height: 38, background: "var(--bg-muted)", border: "1px solid var(--border)" }}
        >
          {theme === "light" ? <Moon size={17} color="var(--blue)" /> : <Sun size={17} color="var(--blue-light)" />}
        </button>
      </div>

      {mode === "keluarga" && (
        <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--bg-surface)" }}>
          <div className="flex items-center justify-between mb-2">
            <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13.5 }}>Anggota keluarga</p>
            <button
              onClick={() => setShowAddMember((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full"
              style={{ background: "var(--bg-muted)" }}
            >
              <UserPlus size={12} color="var(--blue)" />
              <span style={{ color: "var(--blue)", fontSize: 10.5, fontWeight: 600 }}>Tambah</span>
            </button>
          </div>
          {showAddMember && (
            <div className="rounded-xl p-3 mb-3" style={{ background: "var(--bg-muted)" }}>
              <div className="flex items-center justify-between mb-2">
                <p style={{ color: "var(--text-primary)", fontSize: 12, fontWeight: 600 }}>Tambah Anggota</p>
                <button
                  onClick={() => {
                    setShowAddMember(false);
                    setName("");
                    setColor(MEMBER_COLORS[0]);
                  }}
                  className="p-1 rounded-full"
                  style={{ background: "var(--bg-app)" }}
                >
                  <X size={13} color="var(--text-muted)" />
                </button>
              </div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama anggota"
                maxLength={40}
                className="w-full mb-2 px-3 py-2 rounded-lg outline-none"
                style={{
                  background: "var(--bg-app)",
                  color: "var(--text-primary)",
                  fontSize: 12.5,
                  border: "1px solid var(--bg-selected)",
                }}
              />
              <div className="flex items-center gap-2 mb-2.5">
                {MEMBER_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 99,
                      background: c,
                      boxShadow: color === c ? "0 0 0 2px var(--bg-muted), 0 0 0 4px " + c : "none",
                    }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowAddMember(false);
                    setName("");
                    setColor(MEMBER_COLORS[0]);
                  }}
                  className="flex-1 py-2 rounded-lg"
                  style={{ background: "var(--bg-app)", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600 }}
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    onAddMember(name, color);
                    setName("");
                    setShowAddMember(false);
                  }}
                  className="flex-1 py-2 rounded-lg"
                  style={{ background: "var(--blue)", color: "var(--bg-app)", fontSize: 12, fontWeight: 700 }}
                >
                  Simpan
                </button>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2">
            {memberTotals.map((m) => {
              const isConfirmMember = confirmMemberId === m.id;
              return (
                <div key={m.id} className="flex items-center gap-2.5">
                  <Avatar name={m.name} color={m.color} size={30} />
                  <div className="flex-1 min-w-0">
                    <p style={{ color: "var(--text-primary)", fontSize: 12.5, fontWeight: 500 }} className="truncate">
                      {m.name}
                    </p>
                    <p style={{ color: "var(--text-muted)", fontSize: 10.5 }}>Pengeluaran: {formatRupiah(m.spent)}</p>
                  </div>
                  {!m.builtIn && !isConfirmMember && (
                    <button onClick={() => setConfirmMemberId(m.id)} className="p-1.5">
                      <Trash2 size={13} color="var(--text-faint)" />
                    </button>
                  )}
                  {!m.builtIn && isConfirmMember && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => {
                          onDeleteMember(m.id);
                          setConfirmMemberId(null);
                        }}
                        className="px-2 py-1 rounded-lg"
                        style={{ background: "var(--negative)", color: "var(--bg-app)", fontSize: 10, fontWeight: 700 }}
                      >
                        Hapus
                      </button>
                      <button
                        onClick={() => setConfirmMemberId(null)}
                        className="px-2 py-1 rounded-lg"
                        style={{
                          background: "var(--bg-selected)",
                          color: "var(--text-secondary)",
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      >
                        Batal
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl p-4" style={{ background: "var(--bg-surface)" }}>
        <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13.5 }}>Data</p>
        <p style={{ color: "var(--text-muted)", fontSize: 11.5, margin: "3px 0 10px" }}>
          {modeTx.length} transaksi tersimpan di mode {mode === "keluarga" ? "keluarga" : "pribadi"}.
        </p>
        {!confirmClear ? (
          <button
            onClick={() => setConfirmClear(true)}
            className="w-full py-2.5 rounded-xl"
            style={{ background: "var(--bg-muted)", color: "var(--negative)", fontSize: 12, fontWeight: 600 }}
          >
            Hapus semua data mode ini
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClearData();
                setConfirmClear(false);
              }}
              className="flex-1 py-2.5 rounded-xl"
              style={{ background: "var(--negative)", color: "var(--bg-app)", fontSize: 12, fontWeight: 700 }}
            >
              Ya, hapus semua
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="flex-1 py-2.5 rounded-xl"
              style={{
                background: "var(--bg-selected)",
                color: "var(--text-secondary)",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Batal
            </button>
          </div>
        )}
      </div>

      <p className="text-center mt-5" style={{ color: "var(--text-faint)", fontSize: 10.5 }}>
        BQ Finance · dibuat agar mencatat uang tidak lagi terasa merepotkan
      </p>
    </div>
  );
}

export { TabBeranda, TabTransaksi, TabGrafik, TabPengaturan };
