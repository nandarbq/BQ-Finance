import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Wallet } from "lucide-react";

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!email || !password) {
      setError("Isi email dan kata sandi terlebih dahulu.");
      return;
    }
    setSubmitting(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setInfo("Akun dibuat. Cek email untuk konfirmasi, lalu masuk di sini.");
    }
    setSubmitting(false);
  }

  if (checking) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: "var(--bg-page)" }}>
        <span style={{ color: "var(--text-muted)", fontSize: 12, fontFamily: "Inter, sans-serif" }}>Memuat...</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center px-5" style={{ background: "var(--bg-page)" }}>
        <div className="w-full" style={{ maxWidth: 360 }}>
          <div className="flex flex-col items-center mb-6">
            <div
              className="flex items-center justify-center mb-3"
              style={{ width: 56, height: 56, borderRadius: 18, background: "var(--bg-surface)" }}
            >
              <Wallet size={24} color="var(--blue)" />
            </div>
            <p style={{ fontFamily: "'Sora', sans-serif", color: "var(--text-primary)", fontWeight: 800, fontSize: 22 }}>
              BQ <span style={{ color: "var(--blue)" }}>Finance</span>
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>Catat uangmu tanpa ribet</p>
          </div>

          <div className="flex rounded-xl p-1 mb-4" style={{ background: "var(--bg-surface)" }}>
            <button
              onClick={() => setMode("signin")}
              className="flex-1 py-2 rounded-lg"
              style={{ background: mode === "signin" ? "var(--bg-selected)" : "transparent", color: mode === "signin" ? "var(--text-primary)" : "var(--text-muted)", fontSize: 12.5, fontWeight: 600 }}
            >
              Masuk
            </button>
            <button
              onClick={() => setMode("signup")}
              className="flex-1 py-2 rounded-lg"
              style={{ background: mode === "signup" ? "var(--bg-selected)" : "transparent", color: mode === "signup" ? "var(--text-primary)" : "var(--text-muted)", fontSize: 12.5, fontWeight: 600 }}
            >
              Daftar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full px-3.5 py-3 rounded-xl outline-none"
              style={{ background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 13, border: "1px solid var(--bg-selected)" }}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Kata sandi"
              className="w-full px-3.5 py-3 rounded-xl outline-none"
              style={{ background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 13, border: "1px solid var(--bg-selected)" }}
            />
            {error && <p style={{ color: "var(--negative)", fontSize: 11.5 }}>{error}</p>}
            {info && <p style={{ color: "var(--positive)", fontSize: 11.5 }}>{info}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl mt-1"
              style={{ background: "var(--blue)", color: "var(--bg-app)", fontSize: 13, fontWeight: 700, opacity: submitting ? 0.7 : 1 }}
            >
              {mode === "signin" ? "Masuk" : "Buat akun"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return children(session);
}
