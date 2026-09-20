import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import type { TouchEvent } from "react";
import type { LucideIcon } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
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
  fetchMyFamily,
  createFamily,
  fetchJoinCode,
  regenerateJoinCode,
  joinFamilyByCode,
  leaveFamily,
  removeFamilyMember,
  updateMyFamilyAvatar,
  updateMyFamilyName,
} from "../lib/financeApi";
import { nameFromEmail } from "../lib/appUtils";
import type {
  Budget,
  Category,
  CategoryDraft,
  FamilyState,
  Member,
  Mode,
  TabId,
  Transaction,
  TransactionDraft,
} from "../lib/types";
import { ProfileAvatar, LoadingSkeleton } from "./ui";
import { CropSheet, ProfileSheet, TxDetailSheet, OnboardingSheet } from "./Sheets";
import { QuickAddSheet } from "./QuickAddSheet";
import { TabBeranda, TabTransaksi, TabGrafik, TabPengaturan } from "./Tabs";

interface BeforeInstallPromptEventShim extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface BqFinanceAppProps {
  session: Session;
}

function errMsg(e: unknown): string {
  const m = (e as { message?: string })?.message || "";
  const clean = m.replace(/^Database error saving new session[: ]*/i, "").trim();
  return clean || "Terjadi kesalahan. Coba lagi.";
}

function dedupeCategoriesWith(rows: Category[]): Category[] {
  const map = new Map<string, Category>();
  for (const c of rows) {
    const key = c.type + "|" + c.label.toLowerCase();
    const prev = map.get(key);
    if (!prev) map.set(key, c);
    else if (c.familyId && !prev.familyId) map.set(key, c);
  }
  return Array.from(map.values());
}

export default function BqFinanceApp({ session }: BqFinanceAppProps) {
  const userId = session.user.id;
  const userEmail = session.user.email || "";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pullActive, setPullActive] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [pullHeight, setPullHeight] = useState(0);
  const [mode, setMode] = useState<Mode>(() =>
    localStorage.getItem("bqfinance_mode") === "keluarga" ? "keluarga" : "pribadi"
  );
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [family, setFamily] = useState<FamilyState | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("beranda");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [detailTx, setDetailTx] = useState<Transaction | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    localStorage.getItem("bq_finance_theme") === "dark" ? "dark" : "light"
  );
  const [avatar, setAvatar] = useState<string | null>(() => localStorage.getItem("bqfinance_avatar_" + userId) || null);
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem("bqfinance_name_" + userId) || nameFromEmail(userEmail)
  );
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem("bqfinance_onboarded_" + userId));
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEventShim | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pullRef = useRef<number | null>(null);

  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: minimal-ui)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone);

  const loadData = useCallback(async () => {
    try {
      const fam = await fetchMyFamily();
      let code: string | null = null;
      if (fam) {
        try {
          code = await fetchJoinCode(fam.family.id);
        } catch (e) {
          console.error(e);
        }
      }
      const [tx, mem, bdgt, cats] = await Promise.all([
        fetchTransactions(),
        fetchMembers(userId, fam ? fam.family.id : null),
        fetchBudgets(),
        fetchCategories(),
      ]);
      setFamily(fam);
      setJoinCode(code);
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

  const refreshFamily = useCallback(async () => {
    try {
      const fam = await fetchMyFamily();
      let code: string | null = null;
      if (fam) {
        try {
          code = await fetchJoinCode(fam.family.id);
        } catch (e) {
          console.error(e);
        }
      }
      setFamily(fam);
      setJoinCode(code);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const familyRefreshBusy = useRef(false);
  useEffect(() => {
    if (activeTab !== "pengaturan") return;
    const doRefresh = async () => {
      if (familyRefreshBusy.current) return;
      familyRefreshBusy.current = true;
      try {
        await refreshFamily();
      } finally {
        familyRefreshBusy.current = false;
      }
    };
    doRefresh();
    const id = setInterval(doRefresh, 5000);
    return () => clearInterval(id);
  }, [activeTab, refreshFamily]);

  const familyId = family?.family.id ?? null;
  useEffect(() => {
    if (!familyId) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel("family-live-" + familyId)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "family_members", filter: "family_id=eq." + familyId },
          () => refreshFamily()
        )
        .subscribe(() => {});
    } catch (e) {
      console.error("realtime subscribe failed:", e);
    }
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [familyId, refreshFamily]);

  const onPullStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0) return;
    pullRef.current = e.touches[0].clientY;
    setPullActive(true);
    setPullDistance(0);
  }, []);

  const onPullMove = useCallback((e: TouchEvent<HTMLDivElement>) => {
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
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEventShim);
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
    async (draft: TransactionDraft) => {
      if (draft.mode === "keluarga" && !family) {
        toast.error("Buat atau gabung keluarga dulu lewat menu Pengaturan.");
        return;
      }
      setSaving(true);
      try {
        if (editingTx) {
          const updated = await updateTransaction(editingTx.id, draft);
          setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        } else {
          const tx = await insertTransaction(userId, family ? family.family.id : null, draft);
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
    [userId, editingTx, family]
  );

  const openQuickAdd = useCallback(() => {
    setEditingTx(null);
    setQuickAddOpen(true);
  }, []);

  const openQuickEdit = useCallback((tx: Transaction) => {
    setDetailTx(null);
    setEditingTx(tx);
    setQuickAddOpen(true);
  }, []);

  const openTxDetail = useCallback((tx: Transaction) => {
    setDetailTx(tx);
  }, []);

  const handleEditFromDetail = useCallback((tx: Transaction) => {
    setDetailTx(null);
    setEditingTx(tx);
    setQuickAddOpen(true);
  }, []);

  const handleDeleteTransaction = useCallback(
    async (id: string) => {
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
                  const restored = await insertTransaction(userId, target.mode === "keluarga" ? target.familyId : null, {
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
    (id: string) => {
      setDetailTx(null);
      handleDeleteTransaction(id);
    },
    [handleDeleteTransaction]
  );

  const handleClearData = useCallback(async () => {
    const prev = transactions;
    setTransactions((p) => p.filter((t) => t.mode !== mode));
    try {
      await deleteTransactionsByMode(userId, family ? family.family.id : null, mode);
    } catch (e) {
      console.error(e);
      setTransactions(prev);
      toast.error("Gagal menghapus data.");
    }
  }, [transactions, mode, userId, family]);

  const handleAddMember = useCallback(
    async (name: string, color: string) => {
      if (!name || !name.trim()) return;
      try {
        const m = await insertMember(userId, family ? family.family.id : null, name.trim(), color, false);
        setMembers((prev) => [...prev, m]);
      } catch (e) {
        console.error(e);
        toast.error("Gagal menambah anggota.");
      }
    },
    [userId, family]
  );

  const handleDeleteMember = useCallback(
    async (id: string) => {
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
    async (category: string, amount: number) => {
      if (!category || !amount || amount <= 0) return;
      try {
        const b = await upsertBudget(userId, family ? family.family.id : null, { mode, category, amount });
        setBudgets((prev) => {
          const rest = prev.filter((x) => !(x.mode === mode && x.category === category));
          return [...rest, b];
        });
      } catch (e) {
        console.error(e);
        toast.error("Gagal menyimpan anggaran.");
      }
    },
    [userId, mode, family]
  );

  const handleDeleteBudget = useCallback(
    async (id: string) => {
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
    async (draft: CategoryDraft) => {
      if (!draft || !draft.label || !draft.label.trim()) return;
      try {
        const cats = await insertCategory(
          userId,
          mode === "keluarga" ? (family ? family.family.id : null) : null,
          { ...draft, label: draft.label.trim() },
          categories
        );
        const next = dedupeCategoriesWith([...categories, cats]);
        setCategories(next);
      } catch (e) {
        console.error(e);
        toast.error("Gagal menambah kategori.");
      }
    },
    [userId, categories, mode, family]
  );

  const handleUpdateCategory = useCallback(
    async (id: string, fields: { label: string; icon: string; color: string }) => {
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
    async (id: string) => {
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

  const handleCreateFamily = useCallback(async () => {
    try {
      const fam = await createFamily();
      await Promise.all([
        updateMyFamilyName(displayName).catch((e) => console.error("sync family name:", e)),
        updateMyFamilyAvatar(avatar).catch((e) => console.error("sync family avatar:", e)),
      ]);
      await loadData();
      const code = await fetchJoinCode(fam.id);
      setJoinCode(code);
      toast.success("Keluarga dibuat. Bagikan kode undangan ke anggota keluargamu.");
      return true;
    } catch (e) {
      console.error(e);
      toast.error(errMsg(e));
      return false;
    }
  }, [loadData, displayName, avatar]);

  const handleJoinFamily = useCallback(
    async (code: string): Promise<boolean> => {
      try {
        const famId = await joinFamilyByCode(code.trim());
        await Promise.all([
          updateMyFamilyName(displayName).catch((e) => console.error("sync family name:", e)),
          updateMyFamilyAvatar(avatar).catch((e) => console.error("sync family avatar:", e)),
        ]);
        await loadData();
        const c = await fetchJoinCode(famId);
        setJoinCode(c);
        toast.success("Berhasil bergabung ke keluarga!");
        return true;
      } catch (e) {
        console.error(e);
        toast.error(errMsg(e));
        return false;
      }
    },
    [loadData, displayName, avatar]
  );

  const handleRegenerateCode = useCallback(async () => {
    if (!family) return;
    try {
      const code = await regenerateJoinCode(family.family.id);
      setJoinCode(code);
      toast.success("Kode undangan baru sudah dibuat.");
    } catch (e) {
      console.error(e);
      toast.error(errMsg(e));
    }
  }, [family]);

  const handleLeaveFamily = useCallback(async () => {
    try {
      const stillExists = await leaveFamily();
      await loadData();
      setJoinCode(null);
      if (stillExists) {
        toast.success("Kamu keluar dari keluarga.");
      } else {
        toast.success("Keluarga dihapus beserta seluruh datanya.");
      }
    } catch (e) {
      console.error(e);
      toast.error(errMsg(e));
    }
  }, [loadData]);

  const handleRemoveFamilyMember = useCallback(
    async (targetUserId: string) => {
      try {
        await removeFamilyMember(targetUserId);
        await loadData();
        toast.success("Anggota dihapus dari keluarga.");
      } catch (e) {
        console.error(e);
        toast.error(errMsg(e));
      }
    },
    [loadData]
  );

  function handleModeChange(m: Mode) {
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

  function handleAvatarFile(file: File) {
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Pilih file gambar untuk foto profil.");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => toast.error("Gagal memuat foto. Coba gunakan gambar lain.");
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleCropConfirm(dataUrl: string) {
    setAvatar(dataUrl);
    localStorage.setItem("bqfinance_avatar_" + userId, dataUrl);
    syncFamilyAvatar(dataUrl);
    updateMyFamilyAvatar(dataUrl).catch((e) => console.error("sync family avatar:", e));
    setCropSrc(null);
  }

  function handleRemoveAvatar() {
    setAvatar(null);
    localStorage.removeItem("bqfinance_avatar_" + userId);
    syncFamilyAvatar(null);
    updateMyFamilyAvatar(null).catch((e) => console.error("sync family avatar:", e));
  }

  function syncFamilyAvatar(avatarUrl: string | null) {
    setFamily((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        members: prev.members.map((fm) => (fm.userId === userId ? { ...fm, avatarUrl } : fm)),
      };
    });
  }

  function dismissOnboarding() {
    localStorage.setItem("bqfinance_onboarded_" + userId, "1");
    setShowOnboarding(false);
  }

  function handleNameChange(next: string) {
    const clean = (next || "").trim();
    const final = clean || nameFromEmail(userEmail);
    setDisplayName(final);
    localStorage.setItem("bqfinance_name_" + userId, final);
    if (family) {
      updateMyFamilyName(final)
        .then(() => syncMyFamilyName(final))
        .catch((e) => console.error("sync family name:", e));
    }
  }

  function syncMyFamilyName(name: string) {
    setFamily((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        members: prev.members.map((fm) => (fm.userId === userId ? { ...fm, displayName: name } : fm)),
      };
    });
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
        .bqfinance-swalter { animation: bqfinance-swalter 0.3s cubic-bezier(0.22,1,0.36,1); }
        @keyframes bqfinance-swalter { from { opacity: 0; transform: translateY(4px) scale(0.97); filter: blur(3px); } to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }
        @media (prefers-reduced-motion: reduce) {
          .bqfinance-blob, .bqfinance-fade-in, .bqfinance-sheet-up, .bqfinance-tabfade, .bqfinance-swalter { animation: none !important; }
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
                  hasFamily={!!family}
                />
              )}
              {activeTab === "transaksi" && (
                <TabTransaksi
                  modeTx={modeTx}
                  members={members}
                  mode={mode}
                  displayName={displayName}
                  family={family}
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
                  userId={userId}
                  onSignOut={handleSignOut}
                  theme={theme}
                  onToggleTheme={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
                  displayName={displayName}
                  avatar={avatar}
                  onNameChange={handleNameChange}
                  categories={categories}
                  family={family}
                  joinCode={joinCode}
                  onCreateFamily={handleCreateFamily}
                  onJoinFamily={handleJoinFamily}
                  onRegenerateCode={handleRegenerateCode}
onLeaveFamily={handleLeaveFamily}
                  onRemoveMember={handleRemoveFamilyMember}
                  onRefreshFamily={refreshFamily}
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
            const item = t as { id: TabId; label: string; icon: LucideIcon };
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="flex-1 flex flex-col items-center gap-0.5 py-2"
              >
                <Icon size={18} color={active ? "var(--blue)" : "var(--text-faint)"} strokeWidth={active ? 2.4 : 2} />
                <span style={{ color: active ? "var(--blue)" : "var(--text-faint)", fontSize: 9.5, fontWeight: 600 }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {(activeTab === "beranda" || activeTab === "transaksi") && !(mode === "keluarga" && !family) && (
          <button
            onClick={openQuickAdd}
            className="absolute flex items-center justify-center transition-transform active:scale-90"
            style={{
              width: 52,
              height: 52,
              borderRadius: 999,
              right: 18,
              bottom: "calc(env(safe-area-inset-bottom, 6px) + 72px)",
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
            family={family}
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
