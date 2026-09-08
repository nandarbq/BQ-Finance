import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Plus, Home, PieChart as PieIcon, ListChecks, Settings, Users, Download, WifiOff, Loader2 } from "lucide-react";
import { toast } from "./Toast";
import { supabase } from "../lib/supabaseClient";
import {
  fetchTransactions,
  insertTransaction,
  updateTransaction,
  deleteTransactionById,
  deleteTransactionsByMode,
  fetchMembers,
  insertMember,
  deleteMemberById,
  fetchBudgets,
  upsertBudget,
  deleteBudgetById,
  fetchCategories,
  insertCategory,
  updateCategory,
  deleteCategory,
} from "../lib/financeApi";
import { nameFromEmail } from "../lib/appUtils";
import { ProfileAvatar, LoadingSkeleton } from "./ui";
import { CropSheet, ProfileSheet, TxDetailSheet, OnboardingSheet } from "./Sheets";
import { QuickAddSheet } from "./QuickAddSheet";
import { TabBeranda, TabTransaksi, TabGrafik, TabPengaturan } from "./Tabs";

export default function BqFinanceApp({ session }) {
  const userId = session.user.id;
  const userEmail = session.user.email;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pullActive, setPullActive] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [pullHeight, setPullHeight] = useState(0);
  const [mode, setMode] = useState(() => localStorage.getItem("bqfinance_mode") || "pribadi");
  const [transactions, setTransactions] = useState([]);
  const [members, setMembers] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState("beranda");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [detailTx, setDetailTx] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("bq_finance_theme") || "light");
  const [avatar, setAvatar] = useState(() => localStorage.getItem("bqfinance_avatar_" + userId) || null);
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem("bqfinance_name_" + userId) || nameFromEmail(userEmail)
  );
  const [cropSrc, setCropSrc] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem("bqfinance_onboarded_" + userId));
  const [installEvent, setInstallEvent] = useState(null);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const scrollRef = useRef(null);
  const pullRef = useRef(null);

  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: minimal-ui)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.navigator.standalone);

  const loadData = useCallback(async () => {
    try {
      const [tx, mem, bdgt, cats] = await Promise.all([
        fetchTransactions(userId),
        fetchMembers(userId),
        fetchBudgets(userId),
        fetchCategories(userId),
      ]);
      setTransactions(tx);
      setMembers(mem);
      setBudgets(bdgt);
      setCategories(cats);
      setLoadError("");
      return true;
    } catch (e) {
      console.error(e);
      setLoadError("Gagal memuat data. Periksa koneksi atau konfigurasi Supabase.");
      return false;
    }
  }, [userId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await loadData();
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const onPullStart = useCallback((e) => {
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0) return;
    pullRef.current = e.touches[0].clientY;
    setPullActive(true);
    setPullDistance(0);
  }, []);

  const onPullMove = useCallback((e) => {
    if (!pullRef.current) return;
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0) {
      setPullDistance(0);
      return;
    }
    const delta = e.touches[0].clientY - pullRef.current;
    if (delta > 0) {
      const dist = Math.min(delta * 0.45, 80);
      setPullDistance(dist);
      setPullHeight(dist);
    } else {
      setPullDistance(0);
      setPullHeight(0);
    }
  }, []);

  const onPullEnd = useCallback(() => {
    pullRef.current = null;
    if (pullDistance > 52) {
      setPullHeight(46);
      setPullActive(true);
      handleRefresh().then(() => {
        setPullDistance(0);
        setPullHeight(0);
        setPullActive(false);
      });
    } else {
      setPullDistance(0);
      setPullHeight(0);
      setPullActive(false);
    }
  }, [pullDistance, handleRefresh]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("bq_finance_theme", theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#121212" : "#00ab6b");
  }, [theme]);

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    const onInstalled = () => setInstallEvent(null);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);
  const modeTx = useMemo(() => transactions.filter((t) => t.mode === mode), [transactions, mode]);
  const modeBudgets = useMemo(() => budgets.filter((b) => b.mode === mode), [budgets, mode]);

  const handleSaveTransaction = useCallback(
    async (draft) => {
      setSaving(true);
      try {
        if (editingTx) {
          const updated = await updateTransaction(editingTx.id, draft);
          setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        } else {
          const tx = await insertTransaction(userId, draft);
          setTransactions((prev) => [tx, ...prev]);
        }
        setQuickAddOpen(false);
        setEditingTx(null);
      } catch (e) {
        console.error(e);
        toast.error("Gagal menyimpan transaksi. Coba lagi.");
      } finally {
        setSaving(false);
      }
    },
    [userId, editingTx]
  );

  const openQuickAdd = useCallback(() => {
    setEditingTx(null);
    setQuickAddOpen(true);
  }, []);

  const openQuickEdit = useCallback((tx) => {
    setDetailTx(null);
    setEditingTx(tx);
    setQuickAddOpen(true);
  }, []);

  const openTxDetail = useCallback((tx) => {
    setDetailTx(tx);
  }, []);

  const handleEditFromDetail = useCallback((tx) => {
    setDetailTx(null);
    setEditingTx(tx);
    setQuickAddOpen(true);
  }, []);

  const handleDeleteTransaction = useCallback(
    async (id) => {
      const target = transactions.find((t) => t.id === id);
      const prev = transactions;
      setTransactions((p) => p.filter((t) => t.id !== id));
      try {
        await deleteTransactionById(id);
        if (target) {
          toast.success("Transaksi dihapus", {
            duration: 5000,
            action: {
              label: "Urungkan",
              onClick: async () => {
                try {
                  const restored = await insertTransaction(userId, {
                    mode: target.mode,
                    type: target.type,
                    amount: target.amount,
                    category: target.category,
                    note: target.note || "",
                    date: target.date,
                    memberId: target.memberId,
                  });
                  setTransactions((p) => [...p, restored]);
                  toast.success("Transaksi dikembalikan");
                } catch (e) {
                  console.error(e);
                  toast.error("Gagal mengembalikan transaksi.");
                }
              },
            },
          });
        }
      } catch (e) {
        console.error(e);
        setTransactions(prev);
        toast.error("Gagal menghapus transaksi.");
      }
    },
    [transactions, userId]
  );

  const handleDeleteFromDetail = useCallback(
    (id) => {
      setDetailTx(null);
      handleDeleteTransaction(id);
    },
    [handleDeleteTransaction]
  );

  const handleClearData = useCallback(async () => {
    const prev = transactions;
    setTransactions((p) => p.filter((t) => t.mode !== mode));
    try {
      await deleteTransactionsByMode(userId, mode);
    } catch (e) {
      console.error(e);
      setTransactions(prev);
      toast.error("Gagal menghapus data.");
    }
  }, [transactions, mode, userId]);

  const handleAddMember = useCallback(
    async (name, color) => {
      if (!name || !name.trim()) return;
      try {
        const m = await insertMember(userId, name.trim(), color, false);
        setMembers((prev) => [...prev, m]);
      } catch (e) {
        console.error(e);
        toast.error("Gagal menambah anggota.");
      }
    },
    [userId]
  );

  const handleDeleteMember = useCallback(
    async (id) => {
      const prev = members;
      setMembers((p) => p.filter((m) => m.id !== id));
      try {
        await deleteMemberById(id);
      } catch (e) {
        console.error(e);
        setMembers(prev);
        toast.error("Gagal menghapus anggota.");
      }
    },
    [members]
  );

  const handleSaveBudget = useCallback(
    async (category, amount) => {
      if (!category || !amount || amount <= 0) return;
      try {
        const b = await upsertBudget(userId, { mode, category, amount });
        setBudgets((prev) => {
          const rest = prev.filter((x) => !(x.mode === mode && x.category === category));
          return [...rest, b];
        });
      } catch (e) {
        console.error(e);
        toast.error("Gagal menyimpan anggaran.");
      }
    },
    [userId, mode]
  );

  const handleDeleteBudget = useCallback(
    async (id) => {
      const prev = budgets;
      setBudgets((p) => p.filter((b) => b.id !== id));
      try {
        await deleteBudgetById(id);
      } catch (e) {
        console.error(e);
        setBudgets(prev);
        toast.error("Gagal menghapus anggaran.");
      }
    },
    [budgets]
  );

  const handleAddCategory = useCallback(
    async (draft) => {
      if (!draft || !draft.label || !draft.label.trim()) return;
      try {
        const cats = await insertCategory(userId, { ...draft, label: draft.label.trim() });
        const next = [...categories, cats];
        setCategories(next);
      } catch (e) {
        console.error(e);
        toast.error("Gagal menambah kategori.");
      }
    },
    [userId, categories]
  );

  const handleUpdateCategory = useCallback(
    async (id, fields) => {
      const prev = categories;
      try {
        const updated = await updateCategory(id, {
          label: fields.label.trim(),
          icon: fields.icon,
          color: fields.color,
        });
        const next = prev.map((c) => (c.id === id ? updated : c));
        setCategories(next);
      } catch (e) {
        console.error(e);
        setCategories(prev);
        toast.error("Gagal mengubah kategori.");
      }
    },
    [categories]
  );

  const handleDeleteCategory = useCallback(
    async (id) => {
      const prev = categories;
      const next = prev.filter((c) => c.id !== id);
      setCategories(next);
      try {
        await deleteCategory(id);
      } catch (e) {
        console.error(e);
        setCategories(prev);
        toast.error("Gagal menghapus kategori.");
      }
    },
    [categories]
  );

  function handleModeChange(m) {
    setMode(m);
    localStorage.setItem("bqfinance_mode", m);
  }

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
    } catch {
      toast.error("Gagal keluar. Periksa koneksi lalu coba lagi.");
    }
  }

  async function handleInstallApp() {
    if (!installEvent) return;
    try {
      installEvent.prompt();
      await installEvent.userChoice;
    } catch {
      toast.error("Gagal menginstal aplikasi. Coba lagi.");
    } finally {
      setInstallEvent(null);
    }
  }

  function handleAvatarFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Pilih file gambar untuk foto profil.");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => toast.error("Gagal memuat foto. Coba gunakan gambar lain.");
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

  function dismissOnboarding() {
    localStorage.setItem("bqfinance_onboarded_" + userId, "1");
    setShowOnboarding(false);
  }

  function handleNameChange(next) {
    const clean = (next || "").trim();
    const final = clean || nameFromEmail(userEmail);
    setDisplayName(final);
    localStorage.setItem("bqfinance_name_" + userId, final);
  }

  return (
    <div
      className="bqfinance-page min-h-screen w-full flex items-center justify-center"
      style={{ background: "var(--bg-page)" }}
    >
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

      <div
        className="bqfinance-shell relative w-full flex flex-col overflow-hidden"
        style={{ background: "var(--bg-app)" }}
      >
        <div
          className="px-4 pt-3 pb-2 flex-shrink-0"
          style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p
                style={{
                  fontFamily: "'Sora', sans-serif",
                  color: "var(--text-primary)",
                  fontWeight: 800,
                  fontSize: 19,
                  letterSpacing: "-0.01em",
                }}
              >
                BQ <span style={{ color: "var(--blue)" }}>Finance</span>
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: 10.5, marginTop: -2 }}>Catat uangmu tanpa ribet</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {installEvent && !isStandalone && (
                <button
                  onClick={handleInstallApp}
                  aria-label="Install aplikasi"
                  title="Install aplikasi"
                  className="transition-transform active:scale-90 flex items-center justify-center rounded-full"
                  style={{ width: 36, height: 36, border: "none", background: "var(--bg-surface)", cursor: "pointer" }}
                >
                  <Download size={16} color="var(--blue)" />
                </button>
              )}
              <button
                onClick={() => setProfileOpen(true)}
                aria-label="Buka profil"
                className="transition-transform active:scale-90 flex items-center gap-2"
                style={{ border: "none", background: "none", padding: 0, cursor: "pointer" }}
              >
                <span
                  className="truncate text-right"
                  style={{ maxWidth: 100, color: "var(--text-primary)", fontSize: 13, fontWeight: 600 }}
                >
                  {displayName}
                </span>
                <ProfileAvatar avatar={avatar} size={38} innerId="sb-header" />
              </button>
            </div>
          </div>
          <div className="flex rounded-xl p-1" style={{ background: "var(--bg-surface)" }}>
            <button
              onClick={() => handleModeChange("pribadi")}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors"
              style={{ background: mode === "pribadi" ? "var(--bg-selected)" : "transparent" }}
            >
              <Home size={12} color={mode === "pribadi" ? "var(--blue)" : "var(--text-muted)"} />
              <span
                style={{
                  color: mode === "pribadi" ? "var(--text-primary)" : "var(--text-muted)",
                  fontSize: 11.5,
                  fontWeight: 600,
                }}
              >
                Pribadi
              </span>
            </button>
            <button
              onClick={() => handleModeChange("keluarga")}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors"
              style={{ background: mode === "keluarga" ? "var(--bg-selected)" : "transparent" }}
            >
              <Users size={12} color={mode === "keluarga" ? "var(--cat-teal)" : "var(--text-muted)"} />
              <span
                style={{
                  color: mode === "keluarga" ? "var(--text-primary)" : "var(--text-muted)",
                  fontSize: 11.5,
                  fontWeight: 600,
                }}
              >
                Keluarga
              </span>
            </button>
          </div>
          {!isOnline && (
            <div
              className="flex items-center justify-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg"
              style={{ background: "rgba(238,74,73,0.12)" }}
            >
              <WifiOff size={12} color="var(--negative)" />
              <span style={{ color: "var(--negative)", fontSize: 10.5, fontWeight: 600 }}>
                Offline — data yang tampil mungkin belum yang terbaru
              </span>
            </div>
          )}
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto"
          onTouchStart={onPullStart}
          onTouchMove={onPullMove}
          onTouchEnd={onPullEnd}
        >
          <div
            ref={pullRef}
            className={refreshing || pullActive ? "flex items-center justify-center py-0" : "hidden"}
            style={{
              height: refreshing || pullActive ? pullHeight : 0,
              overflow: "hidden",
              transition: "height 0.25s ease",
            }}
          >
            {refreshing ? (
              <Loader2 size={18} className="bqfinance-toast-spin" color="var(--blue)" />
            ) : pullDistance > 52 ? (
              <span style={{ color: "var(--blue)", fontSize: 11, fontWeight: 600 }}>Lepaskan untuk muat ulang</span>
            ) : (
              <span style={{ color: "var(--text-muted)", fontSize: 11 }}>Tarik untuk muat ulang</span>
            )}
          </div>
          {loading ? (
            <LoadingSkeleton />
          ) : loadError ? (
            <div className="flex items-center justify-center h-full px-6 text-center">
              <span style={{ color: "var(--negative)", fontSize: 12 }}>{loadError}</span>
            </div>
          ) : (
            <div key={activeTab} className="bqfinance-tabfade">
              {activeTab === "beranda" && (
                <TabBeranda
                  mode={mode}
                  modeTx={modeTx}
                  modeBudgets={modeBudgets}
                  members={members}
                  setActiveTab={setActiveTab}
                  openQuickAdd={openQuickAdd}
                  categories={categories}
                />
              )}
              {activeTab === "transaksi" && (
                <TabTransaksi
                  modeTx={modeTx}
                  members={members}
                  mode={mode}
                  displayName={displayName}
                  onDelete={handleDeleteTransaction}
                  onEdit={openQuickEdit}
                  onDetail={openTxDetail}
                  categories={categories}
                />
              )}
              {activeTab === "grafik" && <TabGrafik modeTx={modeTx} />}
              {activeTab === "pengaturan" && (
                <TabPengaturan
                  mode={mode}
                  members={members}
                  modeTx={modeTx}
                  modeBudgets={modeBudgets}
                  onAddMember={handleAddMember}
                  onDeleteMember={handleDeleteMember}
                  onSaveBudget={handleSaveBudget}
                  onDeleteBudget={handleDeleteBudget}
                  onClearData={handleClearData}
                  userEmail={userEmail}
                  onSignOut={handleSignOut}
                  theme={theme}
                  onToggleTheme={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
                  displayName={displayName}
                  onNameChange={handleNameChange}
                  categories={categories}
                />
              )}
            </div>
          )}
        </div>

        <div
          className="relative flex-shrink-0 flex items-center pt-2"
          style={{
            background: "var(--bg-app)",
            borderTop: "1px solid var(--bg-muted)",
            paddingBottom: "env(safe-area-inset-bottom, 6px)",
          }}
        >
          {[
            { id: "beranda", label: "Beranda", icon: Home },
            { id: "transaksi", label: "Transaksi", icon: ListChecks },
            { id: "grafik", label: "Grafik", icon: PieIcon },
            { id: "pengaturan", label: "Pengaturan", icon: Settings },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className="flex-1 flex flex-col items-center gap-0.5 py-2"
              >
                <Icon size={18} color={active ? "var(--blue)" : "var(--text-faint)"} strokeWidth={active ? 2.4 : 2} />
                <span style={{ color: active ? "var(--blue)" : "var(--text-faint)", fontSize: 9.5, fontWeight: 600 }}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>

        {(activeTab === "beranda" || activeTab === "transaksi") && (
          <button
            onClick={openQuickAdd}
            className="absolute flex items-center justify-center transition-transform active:scale-90"
            style={{
              width: 52,
              height: 52,
              borderRadius: 999,
              right: 18,
              bottom: 74,
              background: "linear-gradient(135deg,var(--blue-light),var(--blue))",
              boxShadow: "0 8px 22px rgba(0,171,107,0.4)",
            }}
          >
            <Plus size={22} color="var(--bg-app)" strokeWidth={2.6} />
          </button>
        )}

        {showOnboarding && <OnboardingSheet onClose={dismissOnboarding} />}
        {quickAddOpen && (
          <QuickAddSheet
            mode={mode}
            members={members}
            categories={categories}
            editingTx={editingTx}
            onClose={() => {
              setQuickAddOpen(false);
              setEditingTx(null);
            }}
            onSave={handleSaveTransaction}
            saving={saving}
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        )}
        {detailTx && (
          <TxDetailSheet
            tx={detailTx}
            members={members}
            categories={categories}
            onClose={() => setDetailTx(null)}
            onEdit={handleEditFromDetail}
            onDelete={handleDeleteFromDetail}
          />
        )}
        {profileOpen && (
          <ProfileSheet
            onClose={() => setProfileOpen(false)}
            email={userEmail}
            avatar={avatar}
            name={displayName}
            onFileSelect={handleAvatarFile}
            onRemoveAvatar={handleRemoveAvatar}
          />
        )}
        {cropSrc && <CropSheet src={cropSrc} onClose={() => setCropSrc(null)} onConfirm={handleCropConfirm} />}
      </div>
    </div>
  );
}
