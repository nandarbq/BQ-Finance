import React, { useSyncExternalStore } from "react";
import { Check, X, Loader2 } from "lucide-react";

let nextId = 0;
let toasts = [];
const listeners = new Set();
const timers = new Map();

function setToasts(update) {
  toasts = typeof update === "function" ? update(toasts) : update;
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function clearTimer(id) {
  const t = timers.get(id);
  if (t) {
    clearTimeout(t);
    timers.delete(id);
  }
}

function dismiss(id) {
  setToasts((prev) => prev.filter((t) => t.id !== id));
  clearTimer(id);
}

function setTimer(id, fn, ms) {
  clearTimer(id);
  timers.set(id, setTimeout(fn, ms));
}

function push(type, message, opts = {}) {
  const id = (opts.id ?? "toast") + "-" + ++nextId;
  setToasts((prev) => [...prev, { id, type, message, action: opts.action }]);
  const duration =
    type === "loading" ? opts.loadingMs ?? 12000 : opts.duration ?? 2600;
  setTimer(id, () => dismiss(id), duration);
  return id;
}

export const toast = {
  loading(message) {
    return push("loading", message);
  },
  success(message, opts) {
    return push("success", message, opts);
  },
  error(message, opts) {
    return push("error", message, opts);
  },
  resolve(id, type, message, opts = {}) {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, type, message } : t))
    );
    if (type !== "loading") {
      setTimer(id, () => dismiss(id), opts.duration ?? 2600);
    }
  },
  dismiss,
};

export function ToastProvider({ children }) {
  const items = useSyncExternalStore(subscribe, () => toasts);

  return (
    <>
      {children}
      <div
        style={{
          position: "fixed",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          pointerEvents: "none",
          width: "calc(100% - 32px)",
          maxWidth: 340,
        }}
      >
        {items.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </>
  );
}

function Toast({ toast, onDismiss }) {
  const config = {
    loading: { bg: "var(--bg-surface)", border: "var(--border)", color: "var(--text-primary)" },
    success: { bg: "var(--bg-surface)", border: "var(--positive)", color: "var(--positive)" },
    error: { bg: "var(--bg-surface)", border: "var(--negative)", color: "var(--negative)" },
  }[toast.type];

  return (
    <div
      onClick={!(toast.action) && (toast.type === "success" || toast.type === "error") ? onDismiss : undefined}
      role={toast.type === "success" || toast.type === "error" ? "status" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        maxWidth: "100%",
        padding: "10px 14px",
        borderRadius: 12,
        background: config.bg,
        border: "1px solid " + config.border,
        boxShadow: "0 8px 28px var(--shadow)",
        color: "var(--text-primary)",
        fontSize: 12.5,
        fontWeight: 600,
        animation: "bqfinance-toast-in 0.28s cubic-bezier(0.22,1,0.36,1) both",
        pointerEvents: "auto",
      }}
    >
      {toast.type === "loading" ? (
        <Loader2 size={16} className="bqfinance-toast-spin" color="var(--blue)" />
      ) : toast.type === "success" ? (
        <Check size={16} color="var(--positive)" />
      ) : (
        <X size={16} color="var(--negative)" />
      )}
      <span style={{ color: "var(--text-primary)" }}>{toast.message}</span>
      {toast.action && (
        <button
          onClick={(e) => { e.stopPropagation(); toast.action.onClick(); onDismiss(); }}
          style={{ background: "var(--blue)", color: "var(--bg-app)", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", flexShrink: 0, marginLeft: 4 }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
}