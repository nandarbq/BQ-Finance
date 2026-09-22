import { useState, useEffect, useRef } from "react";
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from "react";
import { X, Pencil, Plus, MoreHorizontal, Trash2, Check, Calendar, GripVertical } from "lucide-react";
import { todayISO, formatDateShort } from "../lib/appUtils";
import { ICON_MAP, CATEGORY_COLORS } from "../lib/categoryMeta";
import type { Category, CategoryDraft, Member, Mode, Transaction, TransactionDraft, TxType } from "../lib/types";
import { Avatar } from "./ui";
import { CalendarSheet } from "./Sheets";

interface CategoryForm {
  id: string | null;
  label: string;
  icon: string;
  color: string;
}

interface QuickAddSheetProps {
  mode: Mode;
  members: Member[];
  categories: Category[];
  onClose: () => void;
  onSave: (draft: TransactionDraft) => void | Promise<void>;
  saving: boolean;
  onAddCategory: (draft: CategoryDraft) => void | Promise<void>;
  onUpdateCategory: (id: string, fields: { label: string; icon: string; color: string }) => void | Promise<void>;
  onDeleteCategory: (id: string) => void | Promise<void>;
  onReorderCategories: (orderedIds: string[]) => void | Promise<void>;
  editingTx: Transaction | null;
}

function QuickAddSheet({
  mode,
  members,
  categories,
  onClose,
  onSave,
  saving,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onReorderCategories,
  editingTx,
}: QuickAddSheetProps) {
  const [type, setType] = useState<TxType>(editingTx ? editingTx.type : "out");
  const [amountStr, setAmountStr] = useState(editingTx ? String(editingTx.amount) : "");
  const [category, setCategory] = useState<string | null>(editingTx ? editingTx.category : null);
  const [memberId, setMemberId] = useState<string | null>(editingTx?.memberId || (members[0] ? members[0].id : null));
  const [note, setNote] = useState(editingTx ? editingTx.note || "" : "");
  const [showNote, setShowNote] = useState(editingTx ? !!editingTx.note : false);
  const [date, setDate] = useState(editingTx ? editingTx.date : todayISO());
  const [managing, setManaging] = useState(false);
  const [form, setForm] = useState<CategoryForm | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const amount = parseInt(amountStr || "0", 10);
  const cats = categories.filter((c) => c.type === type);

  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    id: string;
    startIndex: number;
    startContentY: number;
    spacing: number;
    slot: number;
  } | null>(null);
  const orderStateRef = useRef<string[]>([]);
  const prevCatsKeyRef = useRef("");
  const catsKey = cats.map((c) => c.id).join(",");

  useEffect(() => {
    if (prevCatsKeyRef.current === catsKey) return;
    prevCatsKeyRef.current = catsKey;
    const ids = catsKey ? catsKey.split(",") : [];
    orderStateRef.current = ids;
    setOrderIds(ids);
  }, [catsKey]);

  const orderedCats = orderIds.map((id) => cats.find((c) => c.id === id)).filter(Boolean) as Category[];

  const setOrder = (updater: (prev: string[]) => string[]) => {
    setOrderIds((prev) => {
      const next = updater(prev);
      orderStateRef.current = next;
      return next;
    });
  };

  function computeSlot(rows: HTMLElement[], startIndex: number, contentY: number): number {
    let insertBefore = rows.length;
    for (let i = 0; i < rows.length; i++) {
      if (i === startIndex) continue;
      if (contentY < rows[i].offsetTop + rows[i].offsetHeight / 2) {
        insertBefore = i;
        break;
      }
    }
    return insertBefore > startIndex ? insertBefore - 1 : insertBefore;
  }

  function handleGripPointerDown(e: ReactPointerEvent<HTMLButtonElement>, cat: Category) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const list = listRef.current;
    if (!list) return;
    const rect = list.getBoundingClientRect();
    const startIndex = orderIds.indexOf(cat.id);
    const row0 = list.children[0] as HTMLElement | undefined;
    const row1 = list.children[1] as HTMLElement | undefined;
    const spacing = row0 && row1 ? row1.offsetTop - row0.offsetTop : row0 ? row0.offsetHeight + 4 : 40;
    for (let i = 0; i < list.children.length; i++) {
      const r = list.children[i] as HTMLElement;
      r.style.transition = i === startIndex ? "none" : "transform 120ms ease";
      if (i !== startIndex) r.style.transform = "";
    }
    dragStateRef.current = {
      id: cat.id,
      startIndex,
      startContentY: e.clientY - rect.top + list.scrollTop,
      spacing,
      slot: startIndex,
    };
    setDraggingId(cat.id);
  }

  function handleGripPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragStateRef.current;
    if (!drag) return;
    const list = listRef.current;
    if (!list || list.children.length < 2) return;
    e.preventDefault();
    const rect = list.getBoundingClientRect();
    if (e.clientY < rect.top + 24) list.scrollTop -= 12;
    else if (e.clientY > rect.bottom - 24) list.scrollTop += 12;
    const contentY = e.clientY - rect.top + list.scrollTop;
    const rows = Array.from(list.children) as HTMLElement[];
    const slot = computeSlot(rows, drag.startIndex, contentY);
    const slotChanged = slot !== drag.slot;
    drag.slot = slot;
    const draggedRow = rows[drag.startIndex];
    if (draggedRow) {
      const baseDy = (slot - drag.startIndex) * drag.spacing;
      const within = contentY - drag.startContentY - baseDy;
      const offset = Math.max(-drag.spacing / 2, Math.min(drag.spacing / 2, within));
      draggedRow.style.transition = slotChanged ? "transform 120ms ease" : "none";
      draggedRow.style.transform = "translateY(" + (baseDy + offset) + "px)";
      if (slotChanged) {
        requestAnimationFrame(() => {
          if (dragStateRef.current?.id === drag.id) draggedRow.style.transition = "none";
        });
      }
    }
    for (let i = 0; i < rows.length; i++) {
      if (i === drag.startIndex) continue;
      let shift = 0;
      if (drag.slot !== drag.startIndex) {
        if (drag.slot > drag.startIndex && i > drag.startIndex && i <= drag.slot) shift = -drag.spacing;
        else if (drag.slot < drag.startIndex && i >= drag.slot && i < drag.startIndex) shift = drag.spacing;
      }
      rows[i].style.transform = shift ? "translateY(" + shift + "px)" : "";
    }
  }

  function handleGripPointerUp() {
    const drag = dragStateRef.current;
    const list = listRef.current;
    if (drag && list) {
      const rows = Array.from(list.children) as HTMLElement[];
      const draggedRow = rows[drag.startIndex];
      if (draggedRow) {
        draggedRow.style.transition = "transform 120ms ease";
        draggedRow.style.transform = "";
      }
      for (let i = 0; i < rows.length; i++) {
        if (i !== drag.startIndex) rows[i].style.transform = "";
      }
      if (drag.slot !== drag.startIndex) {
        const next = [...orderIds];
        const [moved] = next.splice(drag.startIndex, 1);
        next.splice(drag.slot, 0, moved);
        setOrder(() => next);
        void onReorderCategories(next);
      }
    }
    dragStateRef.current = null;
    setDraggingId(null);
  }

  function handleGripPointerCancel() {
    const drag = dragStateRef.current;
    const list = listRef.current;
    if (drag && list) {
      const rows = Array.from(list.children) as HTMLElement[];
      const draggedRow = rows[drag.startIndex];
      if (draggedRow) {
        draggedRow.style.transition = "transform 120ms ease";
        draggedRow.style.transform = "";
      }
      for (let i = 0; i < rows.length; i++) {
        if (i !== drag.startIndex) rows[i].style.transform = "";
      }
    }
    dragStateRef.current = null;
    setDraggingId(null);
  }

  useEffect(() => {
    setCategory(null);
    setManaging(false);
    setForm(null);
    setConfirmDeleteId(null);
  }, [type]);
  const canSave = amount > 0 && category && !saving;

  function addChip(v: number) {
    setAmountStr((prev) => String((parseInt(prev || "0", 10) || 0) + v));
  }
  function handleAmountChange(e: ChangeEvent<HTMLInputElement>) {
    setAmountStr(e.target.value.replace(/[^0-9]/g, ""));
  }

  function handleSave() {
    if (!canSave) return;
    onSave({ mode, type, amount, category, note: note.trim(), date, memberId: mode === "keluarga" ? memberId : null });
  }

  function openAddForm() {
    setForm({ id: null, label: "", icon: "MoreHorizontal", color: CATEGORY_COLORS[3].value });
  }
  function openEditForm(c: Category) {
    setForm({ id: c.id, label: c.label, icon: c.icon, color: c.color });
  }
  function handleFormSave() {
    if (!form || !form.label || !form.label.trim()) return;
    const label = form.label.trim();
    if (form.id === null) {
      onAddCategory({ type, label, icon: form.icon, color: form.color });
      setCategory(label);
    } else {
      onUpdateCategory(form.id, { label, icon: form.icon, color: form.color });
      if (category && category.toLowerCase() === label.toLowerCase()) setCategory(label);
    }
    setForm(null);
  }
  function handleFormDelete() {
    if (!form || form.id === null) return;
    onDeleteCategory(form.id);
    setForm(null);
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end">
      <div
        className="absolute inset-0 bqfinance-fade-in"
        style={{ background: "rgba(5,10,8,0.6)" }}
        onClick={onClose}
      />
      <div
        className="relative bqfinance-sheet-up rounded-t-3xl px-4 pt-4 pb-5 max-h-[88%] overflow-y-auto"
        style={{ background: "var(--bg-surface)", boxShadow: "0 -10px 40px rgba(0,0,0,0.4)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <p style={{ fontFamily: "'Sora', sans-serif", color: "var(--text-primary)", fontWeight: 700, fontSize: 15 }}>
            {editingTx
              ? "Edit " + (type === "out" ? "pengeluaran" : "pemasukan")
              : type === "out"
                ? "Catat pengeluaran"
                : "Catat pemasukan"}
          </p>
          <button onClick={onClose} className="p-1.5 rounded-full" style={{ background: "var(--bg-muted)" }}>
            <X size={15} color="var(--text-secondary)" />
          </button>
        </div>

        <div className="flex rounded-xl p-1 mb-4" style={{ background: "var(--bg-muted)" }}>
          <button
            onClick={() => setType("out")}
            className="flex-1 py-2 rounded-lg transition-colors"
            style={{
              background: type === "out" ? "var(--negative)" : "transparent",
              color: type === "out" ? "var(--bg-app)" : "var(--text-muted)",
              fontSize: 12.5,
              fontWeight: 700,
            }}
          >
            Pengeluaran
          </button>
          <button
            onClick={() => setType("in")}
            className="flex-1 py-2 rounded-lg transition-colors"
            style={{
              background: type === "in" ? "var(--positive)" : "transparent",
              color: type === "in" ? "var(--bg-app)" : "var(--text-muted)",
              fontSize: 12.5,
              fontWeight: 700,
            }}
          >
            Pemasukan
          </button>
        </div>

        <div className="text-center mb-3">
          <div className="flex items-center justify-center gap-1">
            <span
              style={{ color: "var(--text-muted)", fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 600 }}
            >
              Rp
            </span>
            <input
              inputMode="numeric"
              value={amountStr ? Number(amountStr).toLocaleString("id-ID") : ""}
              onChange={handleAmountChange}
              placeholder="0"
              autoFocus
              className="text-center outline-none bg-transparent"
              style={{
                fontFamily: "'Sora', sans-serif",
                color: "var(--text-primary)",
                fontSize: 30,
                fontWeight: 700,
                width: "60%",
              }}
            />
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
            {[10000, 50000, 100000, 500000].map((v) => (
              <button
                key={v}
                onClick={() => addChip(v)}
                className="px-2.5 py-1 rounded-full"
                style={{
                  background: "var(--bg-muted)",
                  color: "var(--text-secondary)",
                  fontSize: 10.5,
                  fontWeight: 600,
                }}
              >
                +{(v / 1000).toLocaleString("id-ID")}rb
              </button>
            ))}
            {amountStr && (
              <button
                onClick={() => setAmountStr("")}
                className="px-2.5 py-1 rounded-full"
                style={{ background: "var(--bg-muted)", color: "var(--negative)", fontSize: 10.5, fontWeight: 600 }}
              >
                Bersihkan
              </button>
            )}
          </div>
        </div>

        {!managing ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600 }}>Kategori</p>
              <button
                onClick={() => setManaging(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-full"
                style={{ background: "var(--bg-muted)" }}
              >
                <Pencil size={11} color="var(--blue)" />
                <span style={{ color: "var(--blue)", fontSize: 10, fontWeight: 600 }}>Kelola</span>
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {cats.map((c) => {
                const Icon = ICON_MAP[c.icon] || MoreHorizontal;
                const active = category === c.label;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.label)}
                    className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-transform"
                    style={{
                      background: active ? "color-mix(in srgb, " + c.color + " 15%, transparent)" : "var(--bg-muted)",
                      boxShadow: active ? "0 0 0 1.5px " + c.color + " inset" : "none",
                    }}
                  >
                    <Icon size={16} color={active ? c.color : "var(--text-muted)"} />
                    <span
                      style={{
                        color: active ? "var(--text-primary)" : "var(--text-muted)",
                        fontSize: 9.5,
                        fontWeight: 600,
                      }}
                    >
                      {c.label}
                    </span>
                  </button>
                );
              })}
              {cats.length < 24 && (
                <button
                  onClick={() => {
                    setManaging(true);
                    openAddForm();
                  }}
                  className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl"
                  style={{
                    background: "var(--bg-muted)",
                    color: "var(--text-faint)",
                    border: "1px dashed var(--text-faint)",
                  }}
                >
                  <Plus size={16} />
                  <span style={{ fontSize: 9.5, fontWeight: 600 }}>Tambah</span>
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-xl p-3 mb-4" style={{ background: "var(--bg-muted)" }}>
            <div className="flex items-center justify-between mb-2">
              <p style={{ color: "var(--text-primary)", fontSize: 12, fontWeight: 600 }}>
                Kelola {type === "out" ? "Pengeluaran" : "Pemasukan"}
              </p>
              <button
                onClick={() => {
                  setManaging(false);
                  setForm(null);
                  setConfirmDeleteId(null);
                }}
                aria-label="Tutup kelola kategori"
                className="p-1 rounded-full"
                style={{ background: "var(--bg-app)" }}
              >
                <X size={13} color="var(--text-muted)" />
              </button>
            </div>
            {!form && (
              <p className="mb-2" style={{ color: "var(--text-faint)", fontSize: 10 }}>
                Seret ikon ⠿ untuk mengurutkan.
              </p>
            )}
            {form ? (
              <>
                <p style={{ color: "var(--text-muted)", fontSize: 10.5, fontWeight: 600 }} className="mb-1.5">
                  Nama kategori
                </p>
                <input
                  value={form.label}
                  onChange={(e) => setForm((f) => (f ? { ...f, label: e.target.value } : f))}
                  placeholder="cth: Belanja Online"
                  maxLength={40}
                  autoFocus
                  className="w-full mb-3 px-3 py-2 rounded-lg outline-none"
                  style={{
                    background: "var(--bg-app)",
                    color: "var(--text-primary)",
                    fontSize: 12.5,
                    border: "1px solid var(--bg-selected)",
                  }}
                />
                <p style={{ color: "var(--text-muted)", fontSize: 10.5, fontWeight: 600 }} className="mb-1.5">
                  Pilih icon
                </p>
                <div className="grid grid-cols-6 gap-1.5 mb-3">
                  {Object.entries(ICON_MAP).map(([name, Icon]) => (
                    <button
                      key={name}
                      onClick={() => setForm((f) => (f ? { ...f, icon: name } : f))}
                      aria-label={"Icon " + name}
                      className="flex items-center justify-center py-2 rounded-lg"
                      style={{
                        background:
                          form.icon === name
                            ? "color-mix(in srgb, " + form.color + " 15%, transparent)"
                            : "var(--bg-app)",
                        color: form.icon === name ? form.color : "var(--text-muted)",
                        boxShadow: form.icon === name ? "0 0 0 1.5px " + form.color + " inset" : "none",
                      }}
                    >
                      <Icon size={15} />
                    </button>
                  ))}
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: 10.5, fontWeight: 600 }} className="mb-1.5">
                  Pilih warna
                </p>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {CATEGORY_COLORS.map((c) => (
                    <button
                      key={c.value}
                      title={c.label}
                      onClick={() => setForm((f) => (f ? { ...f, color: c.value } : f))}
                      aria-label={"Pilih warna " + c.label}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 99,
                        background: c.value,
                        boxShadow: form.color === c.value ? "0 0 0 2px var(--bg-muted), 0 0 0 4px " + c.value : "none",
                        flexShrink: 0,
                      }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setForm(null)}
                    className="flex-1 py-2 rounded-lg"
                    style={{
                      background: "var(--bg-app)",
                      color: "var(--text-secondary)",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleFormSave}
                    disabled={!form.label || !form.label.trim()}
                    className="flex-1 py-2 rounded-lg"
                    style={{
                      background: !form.label || !form.label.trim() ? "var(--bg-selected)" : "var(--blue)",
                      color: !form.label || !form.label.trim() ? "var(--text-faint)" : "var(--bg-app)",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    Simpan
                  </button>
                </div>
                {form.id !== null && (
                  <>
                    <button
                      onClick={handleFormDelete}
                      className="w-full mt-2 py-2 rounded-lg"
                      style={{ background: "var(--bg-app)", color: "var(--negative)", fontSize: 12, fontWeight: 700 }}
                    >
                      Hapus kategori ini
                    </button>
                    {cats.find((c) => c.id === form.id)?.isDefault && (
                      <p style={{ color: "var(--text-faint)", fontSize: 10, marginTop: 6 }}>
                        Kategori bawaan tidak bisa dihapus.
                      </p>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <div
                  ref={listRef}
                  className="relative flex flex-col gap-1 mb-2.5 max-h-52 overflow-y-auto pr-0.5"
                  style={{ touchAction: draggingId ? "none" : undefined }}
                >
                  {orderedCats.map((c) => {
                    const Icon = ICON_MAP[c.icon] || MoreHorizontal;
                    const confirmed = confirmDeleteId === c.id;
                    return (
                      <div
                        key={c.id}
                        className="relative flex items-center gap-2 px-2 py-1.5 rounded-lg"
                        style={{
                          zIndex: draggingId === c.id ? 12 : undefined,
                          background:
                            draggingId === c.id
                              ? "color-mix(in srgb, var(--blue) 10%, var(--bg-app))"
                              : "var(--bg-app)",
                          boxShadow: draggingId === c.id ? "0 2px 8px rgba(0,0,0,0.18)" : "none",
                        }}
                      >
                        <button
                          type="button"
                          aria-label={"Urutkan kategori " + c.label}
                          aria-grabbed={draggingId === c.id}
                          onPointerDown={(e) => handleGripPointerDown(e, c)}
                          onPointerMove={handleGripPointerMove}
                          onPointerUp={handleGripPointerUp}
                          onPointerCancel={handleGripPointerCancel}
                          onContextMenu={(e) => e.preventDefault()}
                          className="flex items-center justify-center flex-shrink-0 p-1 rounded"
                          style={{
                            touchAction: "none",
                            cursor: "grab",
                            userSelect: "none",
                            WebkitUserSelect: "none",
                            WebkitTouchCallout: "none",
                            background:
                              draggingId === c.id ? "color-mix(in srgb, var(--blue) 18%, transparent)" : "transparent",
                          }}
                        >
                          <GripVertical size={13} color={draggingId === c.id ? "var(--blue)" : "var(--text-faint)"} />
                        </button>
                        <div
                          className="flex items-center justify-center flex-shrink-0"
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: "color-mix(in srgb, " + c.color + " 15%, transparent)",
                          }}
                        >
                          <Icon size={14} color={c.color} />
                        </div>
                        <p
                          className="flex-1 min-w-0 truncate"
                          style={{ color: "var(--text-primary)", fontSize: 12, fontWeight: 500 }}
                        >
                          {c.label}
                        </p>
                        {confirmed ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                onDeleteCategory(c.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-1 rounded-lg"
                              style={{
                                background: "var(--negative)",
                                color: "var(--bg-app)",
                                fontSize: 10,
                                fontWeight: 700,
                              }}
                            >
                              Hapus
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 rounded-lg"
                              style={{
                                background: "var(--bg-muted)",
                                color: "var(--text-secondary)",
                                fontSize: 10,
                                fontWeight: 600,
                              }}
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <>
                            {c.isDefault && (
                              <button
                                onClick={() => openEditForm(c)}
                                className="flex items-center gap-1 px-2 py-1 rounded-full flex-shrink-0"
                                style={{ background: "var(--bg-muted)" }}
                              >
                                <Pencil size={10} color="var(--blue)" />
                                <span style={{ color: "var(--blue)", fontSize: 10, fontWeight: 600 }}>Edit</span>
                              </button>
                            )}
                            {!c.isDefault && (
                              <>
                                <button
                                  onClick={() => openEditForm(c)}
                                  aria-label={"Edit kategori " + c.label}
                                  className="p-1.5 rounded-lg flex-shrink-0"
                                >
                                  <Pencil size={12} color="var(--text-faint)" />
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(c.id)}
                                  aria-label={"Hapus kategori " + c.label}
                                  className="p-1.5 rounded-lg flex-shrink-0"
                                >
                                  <Trash2 size={12} color="var(--text-faint)" />
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => {
                    openAddForm();
                  }}
                  className="w-full flex items-center justify-center gap-1 py-2 rounded-lg"
                  style={{ background: "var(--bg-app)", color: "var(--blue)", fontSize: 12, fontWeight: 700 }}
                >
                  <Plus size={14} />
                  Tambah kategori
                </button>
              </>
            )}
          </div>
        )}

        {mode === "keluarga" && (
          <>
            <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600 }} className="mb-1.5">
              Anggota
            </p>
            <div className="flex items-start gap-2.5 mb-4 overflow-x-auto px-1 pt-1 pb-2 -mx-1">
              {members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMemberId(m.id)}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0"
                >
                  <Avatar name={m.name} color={m.color} size={34} ring={memberId === m.id} />
                  <span
                    className="truncate"
                    style={{
                      maxWidth: 76,
                      color: memberId === m.id ? "var(--text-primary)" : "var(--text-muted)",
                      fontSize: 9.5,
                      fontWeight: 600,
                      lineHeight: 1.2,
                    }}
                  >
                    {m.name}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setShowCalendar(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: "var(--bg-muted)" }}
          >
            <Calendar size={12} color="var(--blue)" />
            <span style={{ color: "var(--text-primary)", fontSize: 11 }}>{formatDateShort(date)}</span>
          </button>
          {!showNote ? (
            <button onClick={() => setShowNote(true)} style={{ color: "var(--text-muted)", fontSize: 11 }}>
              + Tambah catatan
            </button>
          ) : null}
        </div>
        {showNote && (
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Catatan singkat (opsional)"
            maxLength={120}
            className="w-full mb-4 px-3 py-2 rounded-lg outline-none"
            style={{
              background: "var(--bg-muted)",
              color: "var(--text-primary)",
              fontSize: 12,
              border: "1px solid var(--bg-selected)",
            }}
          />
        )}

        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full py-3 rounded-2xl flex items-center justify-center gap-1.5"
          style={{
            background: !canSave ? "var(--bg-selected)" : type === "out" ? "var(--negative)" : "var(--positive)",
            color: !canSave ? "var(--text-faint)" : "var(--bg-app)",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          <Check size={15} />
          {saving ? "Menyimpan..." : editingTx ? "Simpan perubahan" : "Simpan transaksi"}
        </button>
      </div>
      {showCalendar && (
        <CalendarSheet
          mode="single"
          initial={date}
          maxDate={todayISO()}
          onClose={() => setShowCalendar(false)}
          onConfirm={(iso) => {
            if (typeof iso === "string") {
              setDate(iso);
              setShowCalendar(false);
            }
          }}
        />
      )}
    </div>
  );
}

export { QuickAddSheet };
