import { useState, useRef } from "react";
import type { CSSProperties, PointerEvent, ReactElement } from "react";
import type { LucideIcon } from "lucide-react";
import {
  X,
  Check,
  ZoomIn,
  ZoomOut,
  Camera,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  PiggyBank,
  Users,
  PieChart as PieIcon,
  FileDown,
} from "lucide-react";
import { todayISO, formatDateShort } from "../lib/appUtils";
import { formatRupiah } from "../lib/format";
import { getCatMeta } from "../lib/categoryMeta";
import type { Category, Member, Transaction } from "../lib/types";
import { Avatar, ProfileAvatar } from "./ui";

interface CropSheetProps {
  src: string;
  onClose: () => void;
  onConfirm: (dataUrl: string) => void;
}

function CropSheet({ src, onClose, onConfirm }: CropSheetProps) {
  const V = 280;
  const OUT = 512;
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [extra, setExtra] = useState<{ base: number; dw: number; dh: number } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  const dw = extra ? extra.dw * scale : 0;
  const dh = extra ? extra.dh * scale : 0;
  const maxX = Math.max(0, dw - V);
  const maxY = Math.max(0, dh - V);

  function clampOffset(o: { x: number; y: number }) {
    return { x: Math.min(Math.max(o.x, 0), maxX), y: Math.min(Math.max(o.y, 0), maxY) };
  }

  function onImgLoad() {
    const img = imgRef.current;
    if (!img) return;
    const base = Math.max(V / img.naturalWidth, V / img.naturalHeight);
    setExtra({ base, dw: img.naturalWidth * base, dh: img.naturalHeight * base });
    setOffset({
      x: Math.max(0, (img.naturalWidth * base - V) / 2),
      y: Math.max(0, (img.naturalHeight * base - V) / 2),
    });
  }

  function handleZoom(next: number) {
    if (!extra) return;
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

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.sx;
    const dy = e.clientY - dragRef.current.sy;
    setOffset(clampOffset({ x: dragRef.current.ox + dx, y: dragRef.current.oy + dy }));
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (dragRef.current && e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
  }

  function handleConfirm() {
    const img = imgRef.current;
    if (!img || !extra) return;
    const s = extra.base * scale;
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, offset.x / s, offset.y / s, V / s, V / s, 0, 0, OUT, OUT);
    onConfirm(canvas.toDataURL("image/jpeg", 0.9));
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <div
        className="absolute inset-0 bqfinance-fade-in"
        style={{ background: "rgba(5,10,8,0.65)" }}
        onClick={onClose}
      />
      <div
        className="relative bqfinance-sheet-up rounded-t-3xl px-5 pt-4 pb-5"
        style={{ background: "var(--bg-surface)" }}
      >
        <div className="flex items-center justify-between mb-1">
          <p style={{ fontFamily: "'Sora', sans-serif", color: "var(--text-primary)", fontWeight: 700, fontSize: 15 }}>
            Atur foto profil
          </p>
          <button onClick={onClose} className="p-1.5 rounded-full" style={{ background: "var(--bg-muted)" }}>
            <X size={15} color="var(--text-secondary)" />
          </button>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 14 }}>
          Geser untuk memindahkan, geser slider untuk zoom.
        </p>
        <div
          className="relative mx-auto select-none overflow-hidden rounded-full"
          style={{
            width: V,
            height: V,
            background: "var(--bg-app)",
            touchAction: "none",
            cursor: "grab",
            boxShadow: "0 0 0 4px var(--bg-selected)",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <img
            ref={imgRef}
            src={src}
            draggable={false}
            onLoad={onImgLoad}
            alt="Pratinjau foto profil"
            style={
              {
                position: "absolute",
                left: 0,
                top: 0,
                width: dw,
                height: dh,
                maxWidth: "none",
                userSelect: "none",
                WebkitUserDrag: "none",
                transform: "translate(" + -offset.x + "px," + -offset.y + "px)",
              } as CSSProperties
            }
          />
        </div>
        <div className="flex items-center gap-3 mt-5 px-1">
          <ZoomOut size={15} color="var(--text-muted)" />
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={scale}
            onChange={(e) => handleZoom(parseFloat(e.target.value))}
            aria-label="Perbesar foto profil"
            className="flex-1"
          />
          <ZoomIn size={15} color="var(--text-muted)" />
        </div>
        <button
          onClick={handleConfirm}
          className="w-full mt-5 py-3 rounded-2xl flex items-center justify-center gap-1.5"
          style={{ background: "var(--blue)", color: "var(--bg-app)", fontSize: 13, fontWeight: 700 }}
        >
          <Check size={15} />
          Simpan foto
        </button>
      </div>
    </div>
  );
}

interface ProfileSheetProps {
  onClose: () => void;
  email: string;
  avatar: string | null;
  name: string;
  onFileSelect: (file: File) => void;
  onRemoveAvatar: () => void;
}

function ProfileSheet({ onClose, email, avatar, name, onFileSelect, onRemoveAvatar }: ProfileSheetProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  function pickFile() {
    if (fileRef.current) fileRef.current.click();
  }

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <div
        className="absolute inset-0 bqfinance-fade-in"
        style={{ background: "rgba(5,10,8,0.6)" }}
        onClick={onClose}
      />
      <div
        className="relative bqfinance-sheet-up rounded-t-3xl px-4 pt-4 pb-5"
        style={{ background: "var(--bg-surface)", boxShadow: "0 -10px 40px rgba(0,0,0,0.4)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <p style={{ fontFamily: "'Sora', sans-serif", color: "var(--text-primary)", fontWeight: 700, fontSize: 15 }}>
            Profil
          </p>
          <button onClick={onClose} className="p-1.5 rounded-full" style={{ background: "var(--bg-muted)" }}>
            <X size={15} color="var(--text-secondary)" />
          </button>
        </div>
        <div className="flex flex-col items-center">
          <div className="relative" style={{ cursor: "pointer" }} onClick={pickFile}>
            <ProfileAvatar avatar={avatar} size={92} innerId="sb-profile" />
            <div
              className="absolute flex items-center justify-center rounded-full"
              style={{
                bottom: -2,
                right: -2,
                width: 30,
                height: 30,
                background: "var(--blue)",
                boxShadow: "0 0 0 3px var(--bg-surface)",
              }}
            >
              <Camera size={14} color="var(--bg-app)" />
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files && e.target.files[0];
              if (f) onFileSelect(f);
              e.target.value = "";
            }}
          />
          <p
            className="mt-3"
            style={{ color: "var(--text-primary)", fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 700 }}
          >
            {name}
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>{email}</p>
        </div>
        <div className="flex flex-col gap-2 mt-5">
          <button
            onClick={pickFile}
            className="w-full py-2.5 rounded-xl"
            style={{ background: "var(--blue)", color: "var(--bg-app)", fontSize: 12.5, fontWeight: 700 }}
          >
            Ganti foto
          </button>
          {avatar && (
            <button
              onClick={onRemoveAvatar}
              className="w-full py-2.5 rounded-xl"
              style={{ background: "var(--bg-muted)", color: "var(--negative)", fontSize: 12.5, fontWeight: 700 }}
            >
              Hapus foto
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface TxDetailSheetProps {
  tx: Transaction;
  members: Member[];
  onClose: () => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  categories: Category[];
}

function TxDetailSheet({ tx, members, onClose, onEdit, onDelete, categories }: TxDetailSheetProps) {
  const meta = getCatMeta(categories, tx.type, tx.category);
  const Icon = meta.icon;
  const member = members.find((m) => m.id === tx.memberId);
  const fullDate = new Date(tx.date + "T00:00:00").toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="absolute inset-0 z-45 flex flex-col justify-end">
      <div
        className="absolute inset-0 bqfinance-fade-in"
        style={{ background: "rgba(5,10,8,0.6)" }}
        onClick={onClose}
      />
      <div
        className="relative bqfinance-sheet-up rounded-t-3xl px-5 pt-4 pb-5"
        style={{ background: "var(--bg-surface)", boxShadow: "0 -10px 40px rgba(0,0,0,0.4)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <p style={{ fontFamily: "'Sora', sans-serif", color: "var(--text-primary)", fontWeight: 700, fontSize: 15 }}>
            Detail transaksi
          </p>
          <button onClick={onClose} className="p-1.5 rounded-full" style={{ background: "var(--bg-muted)" }}>
            <X size={15} color="var(--text-secondary)" />
          </button>
        </div>

        <div className="flex flex-col items-center mb-5">
          <div
            className="flex items-center justify-center"
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              background: "color-mix(in srgb, " + meta.color + " 15%, transparent)",
            }}
          >
            <Icon size={24} color={meta.color} />
          </div>
          <p className="mt-3" style={{ color: "var(--text-muted)", fontSize: 12 }}>
            {meta.label}
          </p>
          <p
            className="mt-1"
            style={{
              fontFamily: "'Sora', sans-serif",
              color: tx.type === "in" ? "var(--positive)" : "var(--negative)",
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            {tx.type === "in" ? "+" : "-"}
            {formatRupiah(tx.amount)}
          </p>
        </div>

        <div className="rounded-2xl overflow-hidden mb-5" style={{ background: "var(--bg-muted)" }}>
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <span style={{ color: "var(--text-muted)", fontSize: 11.5 }}>Jenis</span>
            <span style={{ color: "var(--text-primary)", fontSize: 12, fontWeight: 600 }}>
              {tx.type === "in" ? "Pemasukan" : "Pengeluaran"}
            </span>
          </div>
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <span style={{ color: "var(--text-muted)", fontSize: 11.5 }}>Kategori</span>
            <span style={{ color: "var(--text-primary)", fontSize: 12, fontWeight: 600 }}>{meta.label}</span>
          </div>
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <span style={{ color: "var(--text-muted)", fontSize: 11.5 }}>Tanggal</span>
            <span style={{ color: "var(--text-primary)", fontSize: 12, fontWeight: 600 }}>{fullDate}</span>
          </div>
          {member && (
            <div
              className="flex items-center justify-between px-4 py-2.5"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <span style={{ color: "var(--text-muted)", fontSize: 11.5 }}>Anggota</span>
              <span className="flex items-center gap-1.5">
                <Avatar name={member.name} color={member.color} size={18} />
                <span style={{ color: "var(--text-primary)", fontSize: 12, fontWeight: 600 }}>{member.name}</span>
              </span>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-2.5">
            <span style={{ color: "var(--text-muted)", fontSize: 11.5 }}>Catatan</span>
            <span
              style={{ color: "var(--text-primary)", fontSize: 12, fontWeight: 600, maxWidth: 200, textAlign: "right" }}
            >
              {tx.note || "—"}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onDelete(tx.id)}
            className="flex items-center justify-center gap-1.5 flex-1 py-3 rounded-2xl"
            style={{ background: "var(--bg-muted)", color: "var(--negative)", fontSize: 13, fontWeight: 700 }}
          >
            <Trash2 size={15} />
            Hapus
          </button>
          <button
            onClick={() => onEdit(tx)}
            className="flex items-center justify-center gap-1.5 flex-1 py-3 rounded-2xl"
            style={{ background: "var(--blue)", color: "var(--bg-app)", fontSize: 13, fontWeight: 700 }}
          >
            <Pencil size={15} />
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

export type CalendarValue = string | { start: string; end: string };

interface CalendarSheetProps {
  mode?: "single" | "range";
  initial?: string | { start?: string; end?: string };
  minDate?: string;
  maxDate?: string;
  onClose: () => void;
  onConfirm: (value: CalendarValue) => void;
}

function CalendarSheet({ mode = "single", initial, minDate, maxDate, onClose, onConfirm }: CalendarSheetProps) {
  const today = todayISO();
  const WEEK = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  const MONTHS = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const initialISO =
    mode === "range" && typeof initial === "object" && initial
      ? initial.start
      : typeof initial === "string"
        ? initial
        : undefined;

  const [view, setView] = useState(() => {
    const base = initialISO ? new Date(initialISO + "T00:00:00") : new Date();
    return { y: base.getFullYear(), m: base.getMonth() };
  });
  const [sel, setSel] = useState<string | null>(mode === "single" ? initialISO || null : null);
  const [range, setRange] = useState<{ start: string | null; end: string | null }>(
    mode === "range"
      ? {
          start: typeof initial === "object" && initial && initial.start ? initial.start : null,
          end: typeof initial === "object" && initial && initial.end ? initial.end : null,
        }
      : { start: null, end: null }
  );

  const firstIdx = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
  const dim = new Date(view.y, view.m + 1, 0).getDate();

  function cellISO(d: number) {
    return view.y + "-" + String(view.m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
  }
  function isDisabled(d: number) {
    const iso = cellISO(d);
    return Boolean((minDate && iso < minDate) || (maxDate && iso > maxDate));
  }
  function isRangeMiddle(d: number) {
    const iso = cellISO(d);
    return mode === "range" && range.start && range.end && iso > range.start && iso < range.end;
  }
  function isSelected(d: number) {
    const iso = cellISO(d);
    if (mode === "single") return iso === sel;
    return (range.start && iso === range.start) || (range.end && iso === range.end);
  }

  function handleDay(d: number) {
    const iso = cellISO(d);
    if (isDisabled(d)) return;
    if (mode === "single") {
      setSel(iso);
      onConfirm(iso);
      return;
    }
    if (!range.start || (range.start && range.end)) {
      setRange({ start: iso, end: null });
    } else {
      const [a, b] = iso < range.start ? [iso, range.start] : [range.start, iso];
      setRange({ start: a, end: b });
    }
  }

  function canConfirm() {
    return mode === "single" || (mode === "range" && range.start && range.end);
  }
  function handleConfirm() {
    if (!canConfirm()) return;
    if (mode === "range" && range.start && range.end) onConfirm({ start: range.start, end: range.end });
  }

  function goPrev() {
    setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }));
  }
  function goNext() {
    setView((v) => {
      const now = new Date();
      if (v.y > now.getFullYear() || (v.y === now.getFullYear() && v.m >= now.getMonth())) return v;
      return v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 };
    });
  }
  function jumpToday() {
    const t = todayISO();
    const base = new Date(t + "T00:00:00");
    setView({ y: base.getFullYear(), m: base.getMonth() });
    if (mode === "single") {
      setSel(t);
      onConfirm(t);
    } else {
      setRange({ start: t, end: t });
    }
  }

  const cells: ReactElement[] = [];
  for (let i = 0; i < firstIdx; i++) cells.push(<div key={"pad" + i} />);
  for (let d = 1; d <= dim; d++) {
    const iso = cellISO(d);
    const off = isDisabled(d);
    const bg = isSelected(d) ? "var(--blue)" : isRangeMiddle(d) ? "var(--blue-soft)" : "transparent";
    const color = isSelected(d)
      ? "var(--bg-app)"
      : isRangeMiddle(d)
        ? "var(--blue)"
        : iso === today
          ? "var(--blue)"
          : "var(--text-primary)";
    cells.push(
      <button
        key={d}
        disabled={off}
        onClick={() => handleDay(d)}
        aria-label={"Pilih tanggal " + iso}
        className="flex items-center justify-center"
        style={{
          height: 36,
          borderRadius: 10,
          fontSize: 12,
          fontWeight: 600,
          background: bg,
          color,
          cursor: off ? "default" : "pointer",
          opacity: off ? 0.35 : 1,
          boxShadow: iso === today && !isSelected(d) ? "inset 0 0 0 1.5px var(--blue)" : "none",
        }}
      >
        {d}
      </button>
    );
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <div
        className="absolute inset-0 bqfinance-fade-in"
        style={{ background: "rgba(5,10,8,0.6)" }}
        onClick={onClose}
      />
      <div
        className="relative bqfinance-sheet-up rounded-t-3xl px-5 pt-4 pb-5"
        style={{ background: "var(--bg-surface)", boxShadow: "0 -10px 40px rgba(0,0,0,0.4)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <p style={{ fontFamily: "'Sora', sans-serif", color: "var(--text-primary)", fontWeight: 700, fontSize: 15 }}>
            {mode === "range" ? "Pilih rentang tanggal" : "Pilih tanggal"}
          </p>
          <button onClick={onClose} className="p-1.5 rounded-full" style={{ background: "var(--bg-muted)" }}>
            <X size={15} color="var(--text-secondary)" />
          </button>
        </div>

        <div className="flex items-center justify-between mb-3">
          <button onClick={goPrev} className="p-1.5 rounded-lg" style={{ background: "var(--bg-muted)" }}>
            <ChevronLeft size={15} color="var(--text-secondary)" />
          </button>
          <p style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>
            {MONTHS[view.m]} {view.y}
          </p>
          <button onClick={goNext} className="p-1.5 rounded-lg" style={{ background: "var(--bg-muted)" }}>
            <ChevronRight size={15} color="var(--text-secondary)" />
          </button>
        </div>

        <div className="grid mb-1" style={{ gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {WEEK.map((w) => (
            <div
              key={w}
              className="flex items-center justify-center"
              style={{ height: 28, color: "var(--text-muted)", fontSize: 10, fontWeight: 600 }}
            >
              {w}
            </div>
          ))}
        </div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {cells}
        </div>

        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={jumpToday}
            className="px-3 py-1.5 rounded-full flex-shrink-0"
            style={{ background: "var(--bg-muted)", color: "var(--blue)", fontSize: 11, fontWeight: 600 }}
          >
            Hari ini
          </button>
          {mode === "range" ? (
            <div className="flex-1 flex items-center justify-end gap-1.5 overflow-hidden">
              <span style={{ color: "var(--text-muted)", fontSize: 10.5, whiteSpace: "nowrap" }}>
                {range.start ? formatDateShort(range.start) : "—"}
              </span>
              <span style={{ color: "var(--text-faint)", fontSize: 10.5 }}>s/d</span>
              <span style={{ color: "var(--text-muted)", fontSize: 10.5, whiteSpace: "nowrap" }}>
                {range.end ? formatDateShort(range.end) : "—"}
              </span>
            </div>
          ) : null}
        </div>

        {mode === "range" && (
          <button
            onClick={handleConfirm}
            disabled={!canConfirm()}
            className="w-full mt-3 py-3 rounded-2xl"
            style={{
              background: !canConfirm() ? "var(--bg-selected)" : "var(--blue)",
              color: !canConfirm() ? "var(--text-faint)" : "var(--bg-app)",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {canConfirm() ? "Gunakan rentang ini" : "Pilih tanggal mulai & selesai"}
          </button>
        )}
      </div>
    </div>
  );
}

interface OnboardingSheetProps {
  onClose: () => void;
}

function OnboardingSheet({ onClose }: OnboardingSheetProps) {
  const items: { icon: LucideIcon; color: string; text: string }[] = [
    {
      icon: PiggyBank,
      color: "var(--blue)",
      text: "Catat pemasukan & pengeluaran lewat tombol + atau kartu di Beranda.",
    },
    { icon: Users, color: "var(--cat-teal)", text: "Ganti ke mode Keluarga untuk mencatat bersama anggota keluarga." },
    { icon: PieIcon, color: "var(--cat-lime)", text: "Pantau tren lewat Grafik dan batasi belanja dengan Anggaran." },
    {
      icon: FileDown,
      color: "var(--cat-olive)",
      text: "Cetak laporan keuangan ke PDF kapan saja dari menu Transaksi.",
    },
  ];
  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <div
        className="absolute inset-0 bqfinance-fade-in"
        style={{ background: "rgba(5,10,8,0.6)" }}
        onClick={onClose}
      />
      <div
        className="relative bqfinance-sheet-up rounded-t-3xl px-5 pt-5 pb-5"
        style={{ background: "var(--bg-surface)", boxShadow: "0 -10px 40px rgba(0,0,0,0.4)" }}
      >
        <div className="text-center mb-4">
          <p style={{ fontFamily: "'Sora', sans-serif", color: "var(--text-primary)", fontWeight: 800, fontSize: 18 }}>
            Selamat datang di <span style={{ color: "var(--blue)" }}>BQ Finance</span>
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: 11.5, marginTop: 4 }}>
            Beberapa hal yang bisa kamu lakukan:
          </p>
        </div>
        <div className="flex flex-col gap-3 mb-5">
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 11,
                    background: "color-mix(in srgb, " + it.color + " 15%, transparent)",
                  }}
                >
                  <Icon size={16} color={it.color} />
                </div>
                <p style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.5 }}>{it.text}</p>
              </div>
            );
          })}
        </div>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl"
          style={{ background: "var(--blue)", color: "var(--bg-app)", fontSize: 13, fontWeight: 700 }}
        >
          Mulai catat transaksi
        </button>
        <button
          onClick={onClose}
          className="w-full mt-2 py-2 rounded-xl"
          style={{ background: "var(--bg-muted)", color: "var(--text-muted)", fontSize: 12, fontWeight: 600 }}
        >
          Lewati
        </button>
      </div>
    </div>
  );
}

export { CropSheet, ProfileSheet, TxDetailSheet, CalendarSheet, OnboardingSheet };
