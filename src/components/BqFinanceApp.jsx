import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Plus, X, Home, PieChart as PieIcon, ListChecks, Settings, Users,
  UtensilsCrossed, Car, ShoppingBag, Receipt, Gamepad2, HeartPulse,
  GraduationCap, MoreHorizontal, Gift, Briefcase, TrendingUp,
Sparkles, ChevronLeft, ChevronRight, Trash2, Calendar, PiggyBank,
Wallet, ArrowUpRight, ArrowDownRight, Check, UserPlus, LogOut, Sun, Moon, Camera,
ZoomIn, ZoomOut, Pencil, FileDown,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip,
  BarChart, Bar, XAxis, YAxis,
} from "recharts";
import { supabase } from "../lib/supabaseClient";
import {
  fetchTransactions, insertTransaction, deleteTransactionById, deleteTransactionsByMode,
  fetchMembers, insertMember, deleteMemberById,
} from "../lib/financeApi";
import { exportTransactionPdf } from "../lib/exportPdf";

/* ----------------------------- Konstanta & util ---------------------------- */

const EXPENSE_CATS = [
  { id: "makanan", label: "Makanan", icon: UtensilsCrossed, color: "var(--negative)" },
  { id: "transport", label: "Transport", icon: Car, color: "var(--cat-teal)" },
  { id: "belanja", label: "Belanja", icon: ShoppingBag, color: "var(--blue)" },
  { id: "tagihan", label: "Tagihan", icon: Receipt, color: "var(--cat-olive)" },
  { id: "hiburan", label: "Hiburan", icon: Gamepad2, color: "var(--cat-lime)" },
  { id: "kesehatan", label: "Kesehatan", icon: HeartPulse, color: "var(--cat-soft-red)" },
  { id: "pendidikan", label: "Pendidikan", icon: GraduationCap, color: "var(--cat-dark)" },
  { id: "lainnya_out", label: "Lainnya", icon: MoreHorizontal, color: "var(--text-muted)" },
];

const INCOME_CATS = [
  { id: "gaji", label: "Gaji", icon: Briefcase, color: "var(--cat-green)" },
  { id: "bonus", label: "Bonus", icon: Sparkles, color: "var(--cat-teal)" },
  { id: "usaha", label: "Usaha", icon: TrendingUp, color: "var(--cat-lime)" },
  { id: "hadiah", label: "Hadiah", icon: Gift, color: "var(--cat-mint)" },
  { id: "investasi", label: "Investasi", icon: PiggyBank, color: "var(--cat-dark)" },
  { id: "lainnya_in", label: "Lainnya", icon: MoreHorizontal, color: "var(--text-muted)" },
];

const MEMBER_COLORS = ["var(--blue)", "var(--cat-teal)", "var(--negative)", "var(--cat-lime)", "var(--cat-dark)", "var(--positive)"];

function formatRupiah(n) {
  const v = Number(n) || 0;
  return "Rp " + Math.round(Math.abs(v)).toLocaleString("id-ID");
}
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
function getCatMeta(type, catId) {
  const list = type === "out" ? EXPENSE_CATS : INCOME_CATS;
  return list.find((c) => c.id === catId) || { label: catId, icon: MoreHorizontal, color: "var(--text-muted)" };
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

function Avatar({ name, color, size = 32, ring = false }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "999px", background: color,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--bg-app)", fontWeight: 700, fontSize: size * 0.42,
        fontFamily: "'Sora', sans-serif",
        boxShadow: ring ? "0 0 0 2px var(--bg-app), 0 0 0 4px " + color : "none",
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-6">
      <div className="flex items-center justify-center mb-3" style={{ width: 56, height: 56, borderRadius: 18, background: "var(--bg-muted)" }}>
        <Icon size={24} color="var(--text-muted)" />
      </div>
      <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 14 }}>{title}</p>
      {subtitle ? <p style={{ color: "var(--text-muted)", fontSize: 12.5, marginTop: 4, maxWidth: 220 }}>{subtitle}</p> : null}
    </div>
  );
}

function RobotAvatar({ size = 36, innerId = "sb" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ display: "block", borderRadius: "999px", flexShrink: 0 }}>
      <defs>
        <linearGradient id={innerId + "-bg"} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7fe3b8" />
          <stop offset="100%" stopColor="#1bb87f" />
        </linearGradient>
      </defs>
      <circle cx="48" cy="48" r="48" fill={"url(#" + innerId + "-bg)"} />
      <g>
        <line x1="48" y1="23" x2="48" y2="15" stroke="#eafff4" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="48" cy="12" r="5" fill="#eafff4" />
        <rect x="22" y="40" width="8" height="16" rx="4" fill="#eafff4" opacity="0.92" />
        <rect x="66" y="40" width="8" height="16" rx="4" fill="#eafff4" opacity="0.92" />
        <rect x="29" y="24" width="38" height="40" rx="15" fill="#fff" />
        <circle cx="40" cy="43" r="5" fill="#0b7c53" />
        <circle cx="56" cy="43" r="5" fill="#0b7c53" />
        <path d="M40 54q8 8 16 0" stroke="#0b7c53" strokeWidth="3" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}

function ProfileAvatar({ avatar, size = 36, innerId = "sb" }) {
  const style = {
    width: size, height: size, borderRadius: "999px", overflow: "hidden",
    flexShrink: 0, display: "block",
  };
  if (avatar) {
    return <img src={avatar} alt="Foto profil" referrerPolicy="no-referrer" style={{ ...style, objectFit: "cover" }} />;
  }
  return <RobotAvatar size={size} innerId={innerId} />;
}

function CropSheet({ src, onClose, onConfirm }) {
  const V = 280;
  const OUT = 512;
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [extra, setExtra] = useState(null);
  const imgRef = useRef(null);
  const dragRef = useRef(null);

  const dw = extra ? extra.dw * scale : 0;
  const dh = extra ? extra.dh * scale : 0;
  const maxX = Math.max(0, dw - V);
  const maxY = Math.max(0, dh - V);

  function clampOffset(o) {
    return { x: Math.min(Math.max(o.x, 0), maxX), y: Math.min(Math.max(o.y, 0), maxY) };
  }

  function onImgLoad() {
    const img = imgRef.current;
    const base = Math.max(V / img.naturalWidth, V / img.naturalHeight);
    setExtra({ base, dw: img.naturalWidth * base, dh: img.naturalHeight * base });
    setOffset({
      x: Math.max(0, (img.naturalWidth * base - V) / 2),
      y: Math.max(0, (img.naturalHeight * base - V) / 2),
    });
  }

  function handleZoom(next) {
    const z = Math.min(Math.max(next, 1), 4);
    const centerX = (offset.x + V / 2) * (z / scale);
    const centerY = (offset.y + V / 2) * (z / scale);
    const nw = extra.dw * z;
    const nh = extra.dh * z;
    setScale(z);
    setOffset({
      x: Math.min(Math.max(centerX - V / 2, 0), Math.max(0, nw - V)),
      y: Math.min(Math.max(centerY - V / 2, 0), Math.max(0, nh - V)),
    });
  }

  function onPointerDown(e) {
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.sx;
    const dy = e.clientY - dragRef.current.sy;
    setOffset(clampOffset({ x: dragRef.current.ox + dx, y: dragRef.current.oy + dy }));
  }
  function onPointerUp(e) {
    if (dragRef.current && e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
  }

  function handleConfirm() {
    const img = imgRef.current;
    const s = extra.base * scale;
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, offset.x / s, offset.y / s, V / s, V / s, 0, 0, OUT, OUT);
    onConfirm(canvas.toDataURL("image/jpeg", 0.9));
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bqfinance-fade-in" style={{ background: "rgba(5,10,8,0.65)" }} onClick={onClose} />
      <div className="relative bqfinance-sheet-up rounded-t-3xl px-5 pt-4 pb-5" style={{ background: "var(--bg-surface)" }}>
        <div className="flex items-center justify-between mb-1">
          <p style={{ fontFamily: "'Sora', sans-serif", color: "var(--text-primary)", fontWeight: 700, fontSize: 15 }}>Atur foto profil</p>
          <button onClick={onClose} className="p-1.5 rounded-full" style={{ background: "var(--bg-muted)" }}><X size={15} color="var(--text-secondary)" /></button>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 14 }}>Geser untuk memindahkan, geser slider untuk zoom.</p>
        <div
          className="relative mx-auto select-none overflow-hidden rounded-full"
          style={{ width: V, height: V, background: "var(--bg-app)", touchAction: "none", cursor: "grab", boxShadow: "0 0 0 4px var(--bg-selected)" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <img ref={imgRef} src={src} draggable={false} onLoad={onImgLoad} alt="Pratinjau foto profil"
            style={{ position: "absolute", left: 0, top: 0, width: dw, height: dh, maxWidth: "none", userSelect: "none", WebkitUserDrag: "none", transform: "translate(" + (-offset.x) + "px," + (-offset.y) + "px)" }} />
        </div>
        <div className="flex items-center gap-3 mt-5 px-1">
          <ZoomOut size={15} color="var(--text-muted)" />
          <input type="range" min={1} max={4} step={0.01} value={scale} onChange={(e) => handleZoom(parseFloat(e.target.value))} aria-label="Perbesar foto profil" className="flex-1" />
          <ZoomIn size={15} color="var(--text-muted)" />
        </div>
        <button onClick={handleConfirm} className="w-full mt-5 py-3 rounded-2xl flex items-center justify-center gap-1.5"
          style={{ background: "var(--blue)", color: "var(--bg-app)", fontSize: 13, fontWeight: 700 }}>
          <Check size={15} />Simpan foto
        </button>
      </div>
    </div>
  );
}

function ProfileSheet({ onClose, email, avatar, name, onFileSelect, onRemoveAvatar }) {
  const fileRef = useRef(null);

  function pickFile() { if (fileRef.current) fileRef.current.click(); }

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <div className="absolute inset-0 bqfinance-fade-in" style={{ background: "rgba(5,10,8,0.6)" }} onClick={onClose} />
      <div className="relative bqfinance-sheet-up rounded-t-3xl px-4 pt-4 pb-5" style={{ background: "var(--bg-surface)", boxShadow: "0 -10px 40px rgba(0,0,0,0.4)" }}>
        <div className="flex items-center justify-between mb-4">
          <p style={{ fontFamily: "'Sora', sans-serif", color: "var(--text-primary)", fontWeight: 700, fontSize: 15 }}>Profil</p>
          <button onClick={onClose} className="p-1.5 rounded-full" style={{ background: "var(--bg-muted)" }}><X size={15} color="var(--text-secondary)" /></button>
        </div>
        <div className="flex flex-col items-center">
          <div className="relative" style={{ cursor: "pointer" }} onClick={pickFile}>
            <ProfileAvatar avatar={avatar} size={92} innerId="sb-profile" />
            <div className="absolute flex items-center justify-center rounded-full" style={{ bottom: -2, right: -2, width: 30, height: 30, background: "var(--blue)", boxShadow: "0 0 0 3px var(--bg-surface)" }}>
              <Camera size={14} color="var(--bg-app)" />
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) onFileSelect(f); e.target.value = ""; }} />
          <p className="mt-3" style={{ color: "var(--text-primary)", fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 700 }}>{name}</p>
          <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>{email}</p>
        </div>
        <div className="flex flex-col gap-2 mt-5">
          <button onClick={pickFile} className="w-full py-2.5 rounded-xl" style={{ background: "var(--blue)", color: "var(--bg-app)", fontSize: 12.5, fontWeight: 700 }}>Ganti foto</button>
          {avatar && <button onClick={onRemoveAvatar} className="w-full py-2.5 rounded-xl" style={{ background: "var(--bg-muted)", color: "var(--negative)", fontSize: 12.5, fontWeight: 700 }}>Hapus foto</button>}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- Beranda --------------------------------- */

function TabBeranda({ mode, modeTx, members, setActiveTab, openQuickAdd }) {
  const curKey = monthKeyFor(0);
  const monthTx = useMemo(() => modeTx.filter((t) => t.date.startsWith(curKey)), [modeTx, curKey]);
  const totalIncome = useMemo(() => modeTx.filter((t) => t.type === "in").reduce((s, t) => s + t.amount, 0), [modeTx]);
  const totalExpense = useMemo(() => modeTx.filter((t) => t.type === "out").reduce((s, t) => s + t.amount, 0), [modeTx]);
  const balance = totalIncome - totalExpense;
  const balanceDisplay = useCountUp(balance);
  const monthIncome = useMemo(() => monthTx.filter((t) => t.type === "in").reduce((s, t) => s + t.amount, 0), [monthTx]);
  const monthExpense = useMemo(() => monthTx.filter((t) => t.type === "out").reduce((s, t) => s + t.amount, 0), [monthTx]);

const catBreakdown = useMemo(() => {
    const map = { in: 0, out: 0 };
    monthTx.forEach((t) => { map[t.type] += t.amount; });
    return [
      { name: "Pemasukan", value: map.in, color: "var(--positive)" },
      { name: "Pengeluaran", value: map.out, color: "var(--negative)" },
    ].filter((c) => c.value > 0);
  }, [monthTx]);

  const recent = useMemo(() => [...modeTx].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5), [modeTx]);

  return (
    <div className="px-4 pt-1 pb-4">
      <div className="relative overflow-hidden rounded-3xl px-5 pt-5 pb-6 mb-4" style={{ background: "linear-gradient(160deg,var(--blue-soft) 0%,var(--bg-app) 60%,var(--bg-app) 100%)" }}>
        <div className="bqfinance-blob bqfinance-blob-a" />
        <div className="bqfinance-blob bqfinance-blob-b" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <span style={{ color: "var(--text-muted)", fontSize: 12.5, fontWeight: 500 }}>Saldo {mode === "keluarga" ? "keluarga" : "pribadi"}</span>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: "rgba(0,171,107,0.14)" }}>
              <Wallet size={11} color="var(--blue)" />
              <span style={{ color: "var(--blue)", fontSize: 10.5, fontWeight: 600 }}>Total</span>
            </div>
          </div>
          <p className="mt-1.5" style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 30, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            {formatRupiah(balanceDisplay)}
          </p>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center" style={{ width: 26, height: 26, borderRadius: 9, background: "rgba(0,171,107,0.16)" }}>
                <ArrowUpRight size={13} color="var(--positive)" />
              </div>
              <div>
                <p style={{ color: "var(--text-muted)", fontSize: 10.5 }}>Pemasukan bln ini</p>
                <p style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 600 }}>{formatRupiah(monthIncome)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center" style={{ width: 26, height: 26, borderRadius: 9, background: "rgba(238,74,73,0.16)" }}>
                <ArrowDownRight size={13} color="var(--negative)" />
              </div>
              <div>
                <p style={{ color: "var(--text-muted)", fontSize: 10.5 }}>Pengeluaran bln ini</p>
                <p style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 600 }}>{formatRupiah(monthExpense)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--bg-surface)" }}>
        <div className="flex items-center justify-between mb-1">
<p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13.5 }}>Pemasukan & pengeluaran</p>
          <button onClick={() => setActiveTab("grafik")} style={{ color: "var(--blue)", fontSize: 11.5, fontWeight: 600 }}>Lihat grafik</button>
        </div>
        {catBreakdown.length === 0 ? (
          <EmptyState icon={PieIcon} title="Belum ada transaksi bulan ini" subtitle="Catat pemasukan & pengeluaranmu untuk melihat grafiknya di sini." />
        ) : (
          <div className="flex items-center gap-3 mt-2">
            <div style={{ width: 84, height: 84, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={catBreakdown} dataKey="value" nameKey="name" innerRadius={26} outerRadius={40} paddingAngle={3} stroke="none">
                    {catBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
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
                  <span style={{ color: "var(--text-primary)", fontSize: 11.5, fontWeight: 600 }}>{formatRupiah(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl p-4" style={{ background: "var(--bg-surface)" }}>
        <div className="flex items-center justify-between mb-1">
          <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13.5 }}>Transaksi terbaru</p>
          <button onClick={() => setActiveTab("transaksi")} style={{ color: "var(--blue)", fontSize: 11.5, fontWeight: 600 }}>Lihat semua</button>
        </div>
        {recent.length === 0 ? (
          <EmptyState icon={ListChecks} title="Belum ada transaksi" subtitle="Ketuk tombol + di bawah untuk mulai mencatat." />
        ) : (
          <div className="flex flex-col mt-1.5">
            {recent.map((t) => {
              const meta = getCatMeta(t.type, t.category);
              const Icon = meta.icon;
              const member = members.find((m) => m.id === t.memberId);
              return (
                <div key={t.id} className="flex items-center gap-2.5 py-2" style={{ borderTop: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 10, background: "color-mix(in srgb, " + meta.color + " 15%, transparent)" }}>
                    <Icon size={15} color={meta.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ color: "var(--text-primary)", fontSize: 12.5, fontWeight: 500 }} className="truncate">{meta.label}{t.note ? " - " + t.note : ""}</p>
                    <p style={{ color: "var(--text-muted)", fontSize: 10.5 }}>{formatDateShort(t.date)}{member ? " - " + member.name : ""}</p>
                  </div>
                  <span style={{ color: t.type === "in" ? "var(--positive)" : "var(--negative)", fontSize: 12.5, fontWeight: 700 }}>
                    {t.type === "in" ? "+" : "-"}{formatRupiah(t.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <button onClick={openQuickAdd} className="w-full mt-4 rounded-2xl py-3" style={{ background: "var(--bg-muted)", color: "var(--blue)", fontSize: 12.5, fontWeight: 600 }}>
        + Catat transaksi baru
      </button>
    </div>
  );
}

/* -------------------------------- Transaksi -------------------------------- */

function TabTransaksi({ modeTx, members, mode, displayName, onDelete }) {
  const [filter, setFilter] = useState("all");
  const [period, setPeriod] = useState("month");
  const [startDate, setStartDate] = useState(monthRange(0).start);
  const [endDate, setEndDate] = useState(todayISO());
  const [confirmId, setConfirmId] = useState(null);

  const periodRange = useMemo(() => {
    if (period === "month") return monthRange(0);
    if (period === "lastMonth") return monthRange(-1);
    if (period === "custom") return { start: startDate, end: endDate };
    return null;
  }, [period, startDate, endDate]);

  const filtered = useMemo(() => {
    let list = [...modeTx];
    if (filter !== "all") list = list.filter((t) => t.type === filter);
    if (periodRange?.start) list = list.filter((t) => t.date >= periodRange.start && t.date <= periodRange.end);
    return list.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : b.createdAt - a.createdAt));
  }, [modeTx, filter, periodRange]);

  const summary = useMemo(() => filtered.reduce((total, t) => {
    total[t.type === "in" ? "income" : "expense"] += t.amount;
    return total;
  }, { income: 0, expense: 0 }), [filtered]);

const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((t) => { if (!map[t.date]) map[t.date] = []; map[t.date].push(t); });
    return Object.entries(map);
  }, [filtered]);

  function periodLabel() {
    if (period === "all") return "Semua waktu";
    if (period === "month") return monthLabel(0);
    if (period === "lastMonth") return monthLabel(-1);
    return formatDateShort(startDate) + " - " + formatDateShort(endDate);
  }

  function handleExportPdf() {
    if (filtered.length === 0) {
      alert("Tidak ada transaksi untuk diekspor. Periksa kembali periode dan filter.");
      return;
    }
    exportTransactionPdf({
      transactions: filtered,
      members,
      mode,
      periodLabel: periodLabel(),
      displayName,
    });
  }

  return (
    <div className="px-4 pt-1 pb-4">
      <div className="flex items-center gap-2 mb-4">
        {[{ id: "all", label: "Semua" }, { id: "in", label: "Pemasukan" }, { id: "out", label: "Pengeluaran" }].map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} className="px-3 py-1.5 rounded-full transition-colors"
            style={{ background: filter === f.id ? "var(--blue)" : "var(--bg-muted)", color: filter === f.id ? "var(--bg-app)" : "var(--text-muted)", fontSize: 11.5, fontWeight: 600 }}>
            {f.label}
          </button>
        ))}
      </div>
      <div className="rounded-2xl p-3 mb-4" style={{ background: "var(--bg-surface)" }}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5" style={{ color: "var(--blue)" }}><Calendar size={14} /><span style={{ fontSize: 11.5, fontWeight: 600 }}>Periode transaksi</span></div>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Pilih periode transaksi" className="outline-none rounded-lg px-2 py-1" style={{ background: "var(--bg-selected)", color: "var(--text-primary)", fontSize: 11.5 }}>
            <option value="all">Semua waktu</option><option value="month">Bulan ini</option><option value="lastMonth">Bulan lalu</option><option value="custom">Pilih rentang</option>
          </select>
        </div>
        {period === "custom" && <div className="flex items-center gap-2 mt-3"><input type="date" value={startDate} max={endDate || todayISO()} onChange={(e) => setStartDate(e.target.value)} aria-label="Tanggal mulai" className="min-w-0 flex-1 rounded-lg px-2 py-1.5 outline-none" style={{ background: "var(--bg-muted)", color: "var(--text-primary)", fontSize: 11 }} /><span style={{ color: "var(--text-muted)", fontSize: 11 }}>s/d</span><input type="date" value={endDate} min={startDate} max={todayISO()} onChange={(e) => setEndDate(e.target.value)} aria-label="Tanggal selesai" className="min-w-0 flex-1 rounded-lg px-2 py-1.5 outline-none" style={{ background: "var(--bg-muted)", color: "var(--text-primary)", fontSize: 11 }} /></div>}
<div className="grid grid-cols-3 gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
          <div><p style={{ color: "var(--text-muted)", fontSize: 9.5 }}>Pemasukan</p><p style={{ color: "var(--positive)", fontSize: 11, fontWeight: 700 }}>{formatRupiah(summary.income)}</p></div><div><p style={{ color: "var(--text-muted)", fontSize: 9.5 }}>Pengeluaran</p><p style={{ color: "var(--negative)", fontSize: 11, fontWeight: 700 }}>{formatRupiah(summary.expense)}</p></div><div><p style={{ color: "var(--text-muted)", fontSize: 9.5 }}>Selisih</p><p style={{ color: summary.income - summary.expense >= 0 ? "var(--blue)" : "var(--negative)", fontSize: 11, fontWeight: 700 }}>{formatRupiah(summary.income - summary.expense)}</p></div>
        </div>
        <button onClick={handleExportPdf} className="w-full mt-3 flex items-center justify-center gap-1.5 rounded-xl py-2"
          style={{ background: "var(--blue)", color: "var(--bg-app)", fontSize: 11.5, fontWeight: 700 }}>
          <FileDown size={13} />Export PDF
        </button>
      </div>

      {grouped.length === 0 ? (
        <EmptyState icon={ListChecks} title="Tidak ada transaksi" subtitle="Coba ubah filter atau catat transaksi baru." />
      ) : (
        grouped.map(([date, txs]) => (
          <div key={date} className="mb-4">
            <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600 }} className="mb-1.5">{formatDateShort(date)}</p>
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-surface)" }}>
              {txs.map((t, idx) => {
                const meta = getCatMeta(t.type, t.category);
                const Icon = meta.icon;
                const member = members.find((m) => m.id === t.memberId);
                const isConfirm = confirmId === t.id;
                return (
                  <div key={t.id} className="flex items-center gap-2.5 px-3.5 py-2.5" style={{ borderTop: idx === 0 ? "none" : "1px solid var(--border)" }}>
                    <div className="flex items-center justify-center" style={{ width: 34, height: 34, borderRadius: 11, background: "color-mix(in srgb, " + meta.color + " 15%, transparent)", flexShrink: 0 }}>
                      <Icon size={15} color={meta.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ color: "var(--text-primary)", fontSize: 12.5, fontWeight: 500 }} className="truncate">{meta.label}</p>
                      <p style={{ color: "var(--text-muted)", fontSize: 10.5 }} className="truncate">{t.note ? t.note : member ? member.name : "\u00A0"}</p>
                    </div>
                    {!isConfirm ? (
                      <>
                        <span style={{ color: t.type === "in" ? "var(--positive)" : "var(--negative)", fontSize: 12.5, fontWeight: 700 }}>
                          {t.type === "in" ? "+" : "-"}{formatRupiah(t.amount)}
                        </span>
                        <button onClick={() => setConfirmId(t.id)} className="p-1.5 rounded-lg"><Trash2 size={13} color="var(--text-faint)" /></button>
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => { onDelete(t.id); setConfirmId(null); }} className="px-2 py-1 rounded-lg" style={{ background: "var(--negative)", color: "var(--bg-app)", fontSize: 10.5, fontWeight: 700 }}>Hapus</button>
                        <button onClick={() => setConfirmId(null)} className="px-2 py-1 rounded-lg" style={{ background: "var(--bg-selected)", color: "var(--text-secondary)", fontSize: 10.5, fontWeight: 600 }}>Batal</button>
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

/* ---------------------------------- Grafik ---------------------------------- */

function TabGrafik({ modeTx }) {
  const [offset, setOffset] = useState(0);
  const curKey = monthKeyFor(offset);
  const monthTx = useMemo(() => modeTx.filter((t) => t.date.startsWith(curKey)), [modeTx, curKey]);

const catBreakdown = useMemo(() => {
    const map = { in: 0, out: 0 };
    monthTx.forEach((t) => { map[t.type] += t.amount; });
    return [
      { name: "Pemasukan", value: map.in, type: "in", color: "var(--positive)" },
      { name: "Pengeluaran", value: map.out, type: "out", color: "var(--negative)" },
    ].filter((c) => c.value > 0);
  }, [monthTx]);
  const totalMonth = catBreakdown.reduce((s, c) => s + c.value, 0);

  const weekData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
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
        <button onClick={() => setOffset((o) => o - 1)} className="p-1.5 rounded-lg" style={{ background: "var(--bg-muted)" }}><ChevronLeft size={15} color="var(--text-secondary)" /></button>
        <p style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{monthLabel(offset)}</p>
        <button onClick={() => setOffset((o) => Math.min(o + 1, 0))} className="p-1.5 rounded-lg" style={{ background: "var(--bg-muted)", opacity: offset === 0 ? 0.4 : 1 }} disabled={offset === 0}><ChevronRight size={15} color="var(--text-secondary)" /></button>
      </div>

      <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--bg-surface)" }}>
<p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13.5 }} className="mb-2">Pemasukan & pengeluaran</p>
        {catBreakdown.length === 0 ? (
          <EmptyState icon={PieIcon} title="Tidak ada data" subtitle="Belum ada transaksi tercatat pada bulan ini." />
        ) : (
          <>
            <div style={{ width: "100%", height: 170 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={catBreakdown} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3} stroke="none">
                    {catBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <RTooltip formatter={(v) => formatRupiah(v)} contentStyle={{ background: "var(--bg-muted)", border: "none", borderRadius: 10, fontSize: 11 }} itemStyle={{ color: "var(--text-primary)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-1.5 mt-2">
              {catBreakdown.map((c, i) => (
<div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div style={{ width: 7, height: 7, borderRadius: 99, background: c.color }} />
                    <span style={{ color: c.type === "in" ? "var(--positive)" : "var(--negative)", fontSize: 11 }}>{c.type === "in" ? "+" : "-"}</span>
                    <span style={{ color: "var(--text-secondary)", fontSize: 11.5 }}>{c.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: "var(--text-muted)", fontSize: 10.5 }}>{totalMonth ? Math.round((c.value / totalMonth) * 100) : 0}%</span>
                    <span style={{ color: "var(--text-primary)", fontSize: 11.5, fontWeight: 600 }}>{formatRupiah(c.value)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="rounded-2xl p-4" style={{ background: "var(--bg-surface)" }}>
        <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13.5 }} className="mb-2">7 hari terakhir</p>
        <div style={{ width: "100%", height: 150 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekData} barGap={2}>
              <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <RTooltip formatter={(v) => formatRupiah(v)} contentStyle={{ background: "var(--bg-muted)", border: "none", borderRadius: 10, fontSize: 11 }} itemStyle={{ color: "var(--text-primary)" }} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="income" fill="var(--positive)" radius={[4, 4, 0, 0]} maxBarSize={10} />
              <Bar dataKey="expense" fill="var(--negative)" radius={[4, 4, 0, 0]} maxBarSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-1 justify-center">
          <div className="flex items-center gap-1.5"><div style={{ width: 7, height: 7, borderRadius: 99, background: "var(--positive)" }} /><span style={{ color: "var(--text-muted)", fontSize: 10.5 }}>Pemasukan</span></div>
          <div className="flex items-center gap-1.5"><div style={{ width: 7, height: 7, borderRadius: 99, background: "var(--negative)" }} /><span style={{ color: "var(--text-muted)", fontSize: 10.5 }}>Pengeluaran</span></div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Pengaturan -------------------------------- */

function TabPengaturan({ mode, members, onAddMember, onDeleteMember, onClearData, modeTx, userEmail, onSignOut, theme, onToggleTheme, displayName, onNameChange }) {
  const [showAddMember, setShowAddMember] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(MEMBER_COLORS[0]);
  const [confirmClear, setConfirmClear] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState(displayName);

  const memberTotals = useMemo(() => members.map((m) => {
    const spent = modeTx.filter((t) => t.memberId === m.id && t.type === "out").reduce((s, t) => s + t.amount, 0);
    return { ...m, spent };
  }), [members, modeTx]);

  return (
    <div className="px-4 pt-1 pb-4">
<div className="rounded-2xl p-4 mb-4 flex items-center justify-between" style={{ background: "var(--bg-surface)" }}>
        <div className="min-w-0 flex-1 mr-2">
          {editingName ? (
            <div className="flex items-center gap-1.5">
              <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder={displayName} maxLength={40} autoFocus
                className="flex-1 min-w-0 px-3 py-2 rounded-xl outline-none" style={{ background: "var(--bg-muted)", color: "var(--text-primary)", fontSize: 13, border: "1px solid var(--bg-selected)" }} />
              <button onClick={() => { onNameChange(editName); setEditingName(false); }} disabled={!editName || !editName.trim()} aria-label="Simpan nama"
                className="p-2 flex items-center justify-center rounded-xl flex-shrink-0" style={{ background: !editName || !editName.trim() ? "var(--bg-selected)" : "var(--blue)", color: !editName || !editName.trim() ? "var(--text-faint)" : "var(--bg-app)" }}>
                <Check size={15} />
              </button>
              <button onClick={() => { setEditName(displayName); setEditingName(false); }} aria-label="Batal ubah nama"
                className="p-2 flex items-center justify-center rounded-xl flex-shrink-0" style={{ background: "var(--bg-muted)", color: "var(--text-secondary)" }}>
                <X size={15} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13.5 }} className="truncate">{displayName}</p>
              <button onClick={() => { setEditName(displayName); setEditingName(true); }} aria-label="Ubah nama" className="p-1.5 rounded-full flex-shrink-0 transition-transform active:scale-90" style={{ background: "var(--bg-muted)" }}>
                <Pencil size={12} color="var(--blue)" />
              </button>
            </div>
          )}
          <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }} className="truncate">Masuk sebagai {userEmail}</p>
        </div>
        <button onClick={onSignOut} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0" style={{ background: "var(--bg-muted)" }}>
          <LogOut size={12} color="var(--negative)" />
          <span style={{ color: "var(--negative)", fontSize: 11, fontWeight: 600 }}>Keluar</span>
        </button>
      </div>

      <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--bg-surface)" }}>
          <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13.5 }}>Mode aktif</p>
        <p style={{ color: "var(--text-muted)", fontSize: 11.5, marginTop: 3 }}>
          {mode === "keluarga" ? "Pencatatan keuangan keluarga. Setiap transaksi dapat dikaitkan dengan anggota keluarga." : "Pencatatan keuangan pribadi. Ganti ke mode Keluarga lewat tombol di bagian atas beranda."}
        </p>
      </div>

      <div className="rounded-2xl p-4 mb-4 flex items-center justify-between" style={{ background: "var(--bg-surface)" }}>
        <div className="flex-1 min-w-0 mr-3">
          <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13.5 }}>Tampilan</p>
          <p style={{ color: "var(--text-muted)", fontSize: 11.5, marginTop: 3 }}>{theme === "light" ? "Mode terang aktif" : "Mode gelap aktif"}</p>
        </div>
        <button onClick={onToggleTheme} aria-label="Ganti tema" className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 38, height: 38, background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
          {theme === "light" ? <Moon size={17} color="var(--blue)" /> : <Sun size={17} color="var(--blue-light)" />}
        </button>
      </div>

      {mode === "keluarga" && (
        <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--bg-surface)" }}>
          <div className="flex items-center justify-between mb-2">
            <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13.5 }}>Anggota keluarga</p>
            <button onClick={() => setShowAddMember((v) => !v)} className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: "var(--bg-muted)" }}>
              <UserPlus size={12} color="var(--blue)" />
              <span style={{ color: "var(--blue)", fontSize: 10.5, fontWeight: 600 }}>Tambah</span>
            </button>
          </div>
          {showAddMember && (
            <div className="rounded-xl p-3 mb-3" style={{ background: "var(--bg-muted)" }}>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama anggota"
                className="w-full mb-2 px-3 py-2 rounded-lg outline-none" style={{ background: "var(--bg-app)", color: "var(--text-primary)", fontSize: 12.5, border: "1px solid var(--bg-selected)" }} />
              <div className="flex items-center gap-2 mb-2.5">
                {MEMBER_COLORS.map((c) => (
                  <button key={c} onClick={() => setColor(c)} style={{ width: 22, height: 22, borderRadius: 99, background: c, boxShadow: color === c ? "0 0 0 2px var(--bg-muted), 0 0 0 4px " + c : "none" }} />
                ))}
              </div>
              <button onClick={() => { onAddMember(name, color); setName(""); setShowAddMember(false); }} className="w-full py-2 rounded-lg" style={{ background: "var(--blue)", color: "var(--bg-app)", fontSize: 12, fontWeight: 700 }}>
                Simpan anggota
              </button>
            </div>
          )}
          <div className="flex flex-col gap-2">
            {memberTotals.map((m) => (
              <div key={m.id} className="flex items-center gap-2.5">
                <Avatar name={m.name} color={m.color} size={30} />
                <div className="flex-1 min-w-0">
                  <p style={{ color: "var(--text-primary)", fontSize: 12.5, fontWeight: 500 }} className="truncate">{m.name}</p>
                  <p style={{ color: "var(--text-muted)", fontSize: 10.5 }}>Pengeluaran: {formatRupiah(m.spent)}</p>
                </div>
                {!m.builtIn && <button onClick={() => onDeleteMember(m.id)} className="p-1.5"><Trash2 size={13} color="var(--text-faint)" /></button>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl p-4" style={{ background: "var(--bg-surface)" }}>
        <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13.5 }}>Data</p>
        <p style={{ color: "var(--text-muted)", fontSize: 11.5, margin: "3px 0 10px" }}>{modeTx.length} transaksi tersimpan di mode {mode === "keluarga" ? "keluarga" : "pribadi"}.</p>
        {!confirmClear ? (
          <button onClick={() => setConfirmClear(true)} className="w-full py-2.5 rounded-xl" style={{ background: "var(--bg-muted)", color: "var(--negative)", fontSize: 12, fontWeight: 600 }}>Hapus semua data mode ini</button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => { onClearData(); setConfirmClear(false); }} className="flex-1 py-2.5 rounded-xl" style={{ background: "var(--negative)", color: "var(--bg-app)", fontSize: 12, fontWeight: 700 }}>Ya, hapus semua</button>
            <button onClick={() => setConfirmClear(false)} className="flex-1 py-2.5 rounded-xl" style={{ background: "var(--bg-selected)", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600 }}>Batal</button>
          </div>
        )}
      </div>

      <p className="text-center mt-5" style={{ color: "var(--text-faint)", fontSize: 10.5 }}>BQ Finance · dibuat agar mencatat uang tidak lagi terasa merepotkan</p>
    </div>
  );
}

/* ------------------------------ Quick Add Sheet ----------------------------- */

function QuickAddSheet({ mode, members, onClose, onSave, saving }) {
  const [type, setType] = useState("out");
  const [amountStr, setAmountStr] = useState("");
  const [category, setCategory] = useState(null);
  const [memberId, setMemberId] = useState(members[0] ? members[0].id : null);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [date, setDate] = useState(todayISO());
  const dateInputRef = useRef(null);
  const amount = parseInt(amountStr || "0", 10);
  const cats = type === "out" ? EXPENSE_CATS : INCOME_CATS;

  useEffect(() => { setCategory(null); }, [type]);
  const canSave = amount > 0 && category && !saving;

  function addChip(v) { setAmountStr((prev) => String((parseInt(prev || "0", 10) || 0) + v)); }
  function handleAmountChange(e) { setAmountStr(e.target.value.replace(/[^0-9]/g, "")); }

  function handleSave() {
    if (!canSave) return;
    onSave({ mode, type, amount, category, note: note.trim(), date, memberId: mode === "keluarga" ? memberId : null });
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end">
      <div className="absolute inset-0 bqfinance-fade-in" style={{ background: "rgba(5,10,8,0.6)" }} onClick={onClose} />
      <div className="relative bqfinance-sheet-up rounded-t-3xl px-4 pt-4 pb-5 max-h-[88%] overflow-y-auto" style={{ background: "var(--bg-surface)", boxShadow: "0 -10px 40px rgba(0,0,0,0.4)" }}>
        <div className="flex items-center justify-between mb-3">
          <p style={{ fontFamily: "'Sora', sans-serif", color: "var(--text-primary)", fontWeight: 700, fontSize: 15 }}>{type === "out" ? "Catat pengeluaran" : "Catat pemasukan"}</p>
          <button onClick={onClose} className="p-1.5 rounded-full" style={{ background: "var(--bg-muted)" }}><X size={15} color="var(--text-secondary)" /></button>
        </div>

        <div className="flex rounded-xl p-1 mb-4" style={{ background: "var(--bg-muted)" }}>
          <button onClick={() => setType("out")} className="flex-1 py-2 rounded-lg transition-colors" style={{ background: type === "out" ? "var(--negative)" : "transparent", color: type === "out" ? "var(--bg-app)" : "var(--text-muted)", fontSize: 12.5, fontWeight: 700 }}>Pengeluaran</button>
          <button onClick={() => setType("in")} className="flex-1 py-2 rounded-lg transition-colors" style={{ background: type === "in" ? "var(--positive)" : "transparent", color: type === "in" ? "var(--bg-app)" : "var(--text-muted)", fontSize: 12.5, fontWeight: 700 }}>Pemasukan</button>
        </div>

        <div className="text-center mb-3">
          <div className="flex items-center justify-center gap-1">
            <span style={{ color: "var(--text-muted)", fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 600 }}>Rp</span>
            <input inputMode="numeric" value={amountStr ? Number(amountStr).toLocaleString("id-ID") : ""} onChange={handleAmountChange} placeholder="0" autoFocus
              className="text-center outline-none bg-transparent" style={{ fontFamily: "'Sora', sans-serif", color: "var(--text-primary)", fontSize: 30, fontWeight: 700, width: "60%" }} />
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
            {[10000, 50000, 100000, 500000].map((v) => (
              <button key={v} onClick={() => addChip(v)} className="px-2.5 py-1 rounded-full" style={{ background: "var(--bg-muted)", color: "var(--text-secondary)", fontSize: 10.5, fontWeight: 600 }}>+{(v / 1000).toLocaleString("id-ID")}rb</button>
            ))}
            {amountStr && <button onClick={() => setAmountStr("")} className="px-2.5 py-1 rounded-full" style={{ background: "var(--bg-muted)", color: "var(--negative)", fontSize: 10.5, fontWeight: 600 }}>Bersihkan</button>}
          </div>
        </div>

        <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600 }} className="mb-2">Kategori</p>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {cats.map((c) => {
            const Icon = c.icon;
            const active = category === c.id;
            return (
              <button key={c.id} onClick={() => setCategory(c.id)} className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-transform"
                style={{ background: active ? "color-mix(in srgb, " + c.color + " 15%, transparent)" : "var(--bg-muted)", boxShadow: active ? "0 0 0 1.5px " + c.color + " inset" : "none" }}>
                <Icon size={16} color={active ? c.color : "var(--text-muted)"} />
                <span style={{ color: active ? "var(--text-primary)" : "var(--text-muted)", fontSize: 9.5, fontWeight: 600 }}>{c.label}</span>
              </button>
            );
          })}
        </div>

        {mode === "keluarga" && (
          <>
            <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600 }} className="mb-2">Anggota</p>
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
              {members.map((m) => (
                <button key={m.id} onClick={() => setMemberId(m.id)} className="flex flex-col items-center gap-1 flex-shrink-0">
                  <Avatar name={m.name} color={m.color} size={34} ring={memberId === m.id} />
                  <span style={{ color: memberId === m.id ? "var(--text-primary)" : "var(--text-muted)", fontSize: 9.5, fontWeight: 600 }}>{m.name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => (dateInputRef.current && dateInputRef.current.showPicker ? dateInputRef.current.showPicker() : dateInputRef.current.click())} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "var(--bg-muted)" }}>
            <Calendar size={12} color="var(--blue)" />
            <span style={{ color: "var(--text-primary)", fontSize: 11 }}>{formatDateShort(date)}</span>
          </button>
          <input ref={dateInputRef} type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
          {!showNote ? <button onClick={() => setShowNote(true)} style={{ color: "var(--text-muted)", fontSize: 11 }}>+ Tambah catatan</button> : null}
        </div>
        {showNote && (
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan singkat (opsional)"
            className="w-full mb-4 px-3 py-2 rounded-lg outline-none" style={{ background: "var(--bg-muted)", color: "var(--text-primary)", fontSize: 12, border: "1px solid var(--bg-selected)" }} />
        )}

        <button onClick={handleSave} disabled={!canSave} className="w-full py-3 rounded-2xl flex items-center justify-center gap-1.5"
          style={{ background: !canSave ? "var(--bg-selected)" : type === "out" ? "var(--negative)" : "var(--positive)", color: !canSave ? "var(--text-faint)" : "var(--bg-app)", fontSize: 13, fontWeight: 700 }}>
          <Check size={15} />
          {saving ? "Menyimpan..." : "Simpan transaksi"}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------- App ------------------------------------ */

export default function BqFinanceApp({ session }) {
  const userId = session.user.id;
  const userEmail = session.user.email;

  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(() => localStorage.getItem("bqfinance_mode") || "pribadi");
  const [transactions, setTransactions] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState("beranda");
const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("bq_finance_theme") || "light");
  const [avatar, setAvatar] = useState(() => localStorage.getItem("bqfinance_avatar_" + userId) || null);
  const [displayName, setDisplayName] = useState(() => localStorage.getItem("bqfinance_name_" + userId) || nameFromEmail(userEmail));
  const [cropSrc, setCropSrc] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [tx, mem] = await Promise.all([fetchTransactions(userId), fetchMembers(userId)]);
        if (!mounted) return;
        setTransactions(tx);
        setMembers(mem);
      } catch (e) {
        console.error(e);
        setLoadError("Gagal memuat data. Periksa koneksi atau konfigurasi Supabase.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [userId]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("bq_finance_theme", theme);
  }, [theme]);
const modeTx = useMemo(() => transactions.filter((t) => t.mode === mode), [transactions, mode]);

  const handleSaveTransaction = useCallback(async (draft) => {
    setSaving(true);
    try {
      const tx = await insertTransaction(userId, draft);
      setTransactions((prev) => [tx, ...prev]);
      setQuickAddOpen(false);
    } catch (e) {
      console.error(e);
      alert("Gagal menyimpan transaksi. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }, [userId]);

  const handleDeleteTransaction = useCallback(async (id) => {
    const prev = transactions;
    setTransactions((p) => p.filter((t) => t.id !== id));
    try {
      await deleteTransactionById(id);
    } catch (e) {
      console.error(e);
      setTransactions(prev);
      alert("Gagal menghapus transaksi.");
    }
  }, [transactions]);

  const handleClearData = useCallback(async () => {
    const prev = transactions;
    setTransactions((p) => p.filter((t) => t.mode !== mode));
    try {
      await deleteTransactionsByMode(userId, mode);
    } catch (e) {
      console.error(e);
      setTransactions(prev);
      alert("Gagal menghapus data.");
    }
  }, [transactions, mode, userId]);

  const handleAddMember = useCallback(async (name, color) => {
    if (!name || !name.trim()) return;
    try {
      const m = await insertMember(userId, name.trim(), color, false);
      setMembers((prev) => [...prev, m]);
    } catch (e) {
      console.error(e);
      alert("Gagal menambah anggota.");
    }
  }, [userId]);

  const handleDeleteMember = useCallback(async (id) => {
    const prev = members;
    setMembers((p) => p.filter((m) => m.id !== id));
    try {
      await deleteMemberById(id);
    } catch (e) {
      console.error(e);
      setMembers(prev);
      alert("Gagal menghapus anggota.");
    }
  }, [members]);

  function handleModeChange(m) {
    setMode(m);
    localStorage.setItem("bqfinance_mode", m);
  }

async function handleSignOut() {
    await supabase.auth.signOut();
  }

  function handleAvatarFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      alert("Pilih file gambar untuk foto profil.");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => alert("Gagal memuat foto. Coba gunakan gambar lain.");
    reader.onload = () => setCropSrc(reader.result);
    reader.readAsDataURL(file);
  }

  function handleCropConfirm(dataUrl) {
    setAvatar(dataUrl);
    localStorage.setItem("bqfinance_avatar_" + userId, dataUrl);
    setCropSrc(null);
  }

  function handleRemoveAvatar() {
    setAvatar(null);
    localStorage.removeItem("bqfinance_avatar_" + userId);
  }

  function handleNameChange(next) {
    const clean = (next || "").trim();
    const final = clean || nameFromEmail(userEmail);
    setDisplayName(final);
    localStorage.setItem("bqfinance_name_" + userId, final);
  }

return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ background: "var(--bg-page)" }}>
      <style>{`
        .bqfinance-blob { position: absolute; border-radius: 999px; filter: blur(30px); opacity: 0.35; pointer-events: none; }
        .bqfinance-blob-a { width: 160px; height: 160px; background: var(--blue); top: -60px; right: -40px; animation: bqfinance-float-a 9s ease-in-out infinite; }
        .bqfinance-blob-b { width: 130px; height: 130px; background: var(--cat-teal); bottom: -50px; left: -30px; animation: bqfinance-float-b 11s ease-in-out infinite; }
        @keyframes bqfinance-float-a { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-14px,16px) scale(1.12); } }
        @keyframes bqfinance-float-b { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(12px,-10px) scale(1.08); } }
        .bqfinance-fade-in { animation: bqfinance-fadein 0.2s ease-out; }
        @keyframes bqfinance-fadein { from { opacity: 0; } to { opacity: 1; } }
        .bqfinance-sheet-up { animation: bqfinance-sheetup 0.28s cubic-bezier(0.22,1,0.36,1); }
        @keyframes bqfinance-sheetup { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .bqfinance-tabfade { animation: bqfinance-tabfade 0.25s ease-out; }
        @keyframes bqfinance-tabfade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) {
          .bqfinance-blob, .bqfinance-fade-in, .bqfinance-sheet-up, .bqfinance-tabfade { animation: none !important; }
        }
      `}</style>

      <div className="relative w-full flex flex-col overflow-hidden" style={{ maxWidth: 428, height: "100vh", maxHeight: 926, background: "var(--bg-app)", borderRadius: 34, boxShadow: "0 30px 90px rgba(0,0,0,0.55)" }}>
<div className="px-4 pt-3 pb-2 flex-shrink-0">
<div className="flex items-center justify-between mb-3">
            <div>
              <p style={{ fontFamily: "'Sora', sans-serif", color: "var(--text-primary)", fontWeight: 800, fontSize: 19, letterSpacing: "-0.01em" }}>
                BQ <span style={{ color: "var(--blue)" }}>Finance</span>
              </p>
<p style={{ color: "var(--text-muted)", fontSize: 10.5, marginTop: -2 }}>Catat uangmu tanpa ribet</p>
            </div>
            <button onClick={() => setProfileOpen(true)} aria-label="Buka profil" className="transition-transform active:scale-90 flex items-center gap-2 flex-shrink-0" style={{ border: "none", background: "none", padding: 0, cursor: "pointer" }}>
              <span className="truncate text-right" style={{ maxWidth: 100, color: "var(--text-primary)", fontSize: 13, fontWeight: 600 }}>{displayName}</span>
              <ProfileAvatar avatar={avatar} size={38} innerId="sb-header" />
            </button>
          </div>
          <div className="flex rounded-xl p-1" style={{ background: "var(--bg-surface)" }}>
            <button onClick={() => handleModeChange("pribadi")} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors" style={{ background: mode === "pribadi" ? "var(--bg-selected)" : "transparent" }}>
              <Home size={12} color={mode === "pribadi" ? "var(--blue)" : "var(--text-muted)"} />
              <span style={{ color: mode === "pribadi" ? "var(--text-primary)" : "var(--text-muted)", fontSize: 11.5, fontWeight: 600 }}>Pribadi</span>
            </button>
            <button onClick={() => handleModeChange("keluarga")} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors" style={{ background: mode === "keluarga" ? "var(--bg-selected)" : "transparent" }}>
              <Users size={12} color={mode === "keluarga" ? "var(--cat-teal)" : "var(--text-muted)"} />
              <span style={{ color: mode === "keluarga" ? "var(--text-primary)" : "var(--text-muted)", fontSize: 11.5, fontWeight: 600 }}>Keluarga</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full"><span style={{ color: "var(--text-muted)", fontSize: 12 }}>Memuat data...</span></div>
          ) : loadError ? (
            <div className="flex items-center justify-center h-full px-6 text-center"><span style={{ color: "var(--negative)", fontSize: 12 }}>{loadError}</span></div>
          ) : (
            <div key={activeTab} className="bqfinance-tabfade">
              {activeTab === "beranda" && <TabBeranda mode={mode} modeTx={modeTx} members={members} setActiveTab={setActiveTab} openQuickAdd={() => setQuickAddOpen(true)} />}
              {activeTab === "transaksi" && <TabTransaksi modeTx={modeTx} members={members} mode={mode} displayName={displayName} onDelete={handleDeleteTransaction} />}
              {activeTab === "grafik" && <TabGrafik modeTx={modeTx} />}
              {activeTab === "pengaturan" && (
                <TabPengaturan mode={mode} members={members} modeTx={modeTx} onAddMember={handleAddMember} onDeleteMember={handleDeleteMember} onClearData={handleClearData} userEmail={userEmail} onSignOut={handleSignOut} theme={theme} onToggleTheme={() => setTheme((current) => current === "light" ? "dark" : "light")} displayName={displayName} onNameChange={handleNameChange} />
              )}
            </div>
          )}
        </div>

        <div className="relative flex-shrink-0 flex items-center justify-around px-2 pt-2" style={{ background: "var(--bg-app)", borderTop: "1px solid var(--bg-muted)" }}>
          {[
            { id: "beranda", label: "Beranda", icon: Home },
            { id: "transaksi", label: "Transaksi", icon: ListChecks },
            { id: "grafik", label: "Grafik", icon: PieIcon },
            { id: "pengaturan", label: "Pengaturan", icon: Settings },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className="flex flex-col items-center gap-0.5 py-2 px-2">
                <Icon size={18} color={active ? "var(--blue)" : "var(--text-faint)"} strokeWidth={active ? 2.4 : 2} />
                <span style={{ color: active ? "var(--blue)" : "var(--text-faint)", fontSize: 9.5, fontWeight: 600 }}>{t.label}</span>
              </button>
            );
          })}
          <div style={{ paddingBottom: "env(safe-area-inset-bottom, 6px)" }} />
        </div>

        {(activeTab === "beranda" || activeTab === "transaksi") && (
          <button onClick={() => setQuickAddOpen(true)} className="absolute flex items-center justify-center transition-transform active:scale-90"
            style={{ width: 52, height: 52, borderRadius: 999, right: 18, bottom: 74, background: "linear-gradient(135deg,var(--blue-light),var(--blue))", boxShadow: "0 8px 22px rgba(0,171,107,0.4)" }}>
            <Plus size={22} color="var(--bg-app)" strokeWidth={2.6} />
          </button>
        )}

        {quickAddOpen && <QuickAddSheet mode={mode} members={members} onClose={() => setQuickAddOpen(false)} onSave={handleSaveTransaction} saving={saving} />}
        {profileOpen && <ProfileSheet onClose={() => setProfileOpen(false)} email={userEmail} avatar={avatar} name={displayName} onFileSelect={handleAvatarFile} onRemoveAvatar={handleRemoveAvatar} />}
        {cropSrc && <CropSheet src={cropSrc} onClose={() => setCropSrc(null)} onConfirm={handleCropConfirm} />}
      </div>
    </div>
  );
}
