import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Eye, EyeOff } from "lucide-react";
import logoUrl from "../assets/logo bq-finance.png";

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState("idle"); // idle | processing | success | error
  const [confirmEmail, setConfirmEmail] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
      if (window.location.hash.startsWith("#/confirm")) {
        handleEmailConfirm();
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleEmailConfirm() {
    const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
    const tokenHash = params.get("token_hash");
    const type = params.get("type") || "email";
    if (!tokenHash || !window.location.hash.startsWith("#/confirm")) return;
    setConfirmStatus("processing");
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (window.location.hash) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    if (error) {
      setConfirmStatus("error");
      return;
    }
    setConfirmEmail(data.user?.email || "");
    setConfirmStatus("success");
  }

  async function handleResend() {
    if (!confirmEmail) return;
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: confirmEmail });
    setResending(false);
    if (error) setError(error.message);
    else setInfo("Email konfirmasi dikirim ulang. Cek inbox & folder spam kamu.");
  }

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
      else setInfo("🎉 Akun dibuat! Buka email kamu, klik link konfirmasi (cek juga folder spam), lalu masuk di sini.");
    }
    setSubmitting(false);
  }

  async function handleGoogleAuth() {
    setError("");
    setInfo("");
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
    setGoogleLoading(false);
  }

  if (checking) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: "var(--bg-page)" }}>
        <div
          className="flex items-center justify-center bqfinance-logo-pop"
          style={{ width: 96, height: 96, borderRadius: 26, overflow: "hidden", background: "var(--bg-surface)", boxShadow: "0 12px 40px var(--shadow)" }}
        >
          <img src={logoUrl} alt="BQ Finance" className="bqfinance-logo-breathe" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
      </div>
    );
  }

  if (confirmStatus !== "idle") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center px-5" style={{ background: "var(--bg-page)" }}>
        <div className="w-full text-center" style={{ maxWidth: 360 }}>
          <div className="flex items-center justify-center mb-4 mx-auto" style={{ width: 88, height: 88, borderRadius: 22, overflow: "hidden", background: "var(--bg-surface)" }}>
            <img src={logoUrl} alt="BQ Finance" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>

          {confirmStatus === "processing" && (
            <>
              <div className="mx-auto mb-4" style={{ width: 40, height: 40, border: "3px solid var(--bg-selected)", borderTopColor: "var(--blue)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <p style={{ fontFamily: "'Sora', sans-serif", color: "var(--text-primary)", fontWeight: 700, fontSize: 17 }}>Memverifikasi email...</p>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6 }}>Tunggu sebentar ya, konfirmasi sedang diproses.</p>
            </>
          )}

          {confirmStatus === "success" && (
            <>
              <p style={{ fontSize: 44, lineHeight: 1 }}>🎉</p>
              <p style={{ fontFamily: "'Sora', sans-serif", color: "var(--text-primary)", fontWeight: 800, fontSize: 19, marginTop: 8 }}>
                Email berhasil dikonfirmasi!
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8 }}>
                Akun kamu sudah aktif. Silakan masuk untuk mulai memakai BQ Finance.
              </p>
              <button
                onClick={() => setConfirmStatus("idle")}
                className="w-full py-3 rounded-xl mt-6"
                style={{ background: "var(--blue)", color: "var(--bg-app)", fontSize: 13, fontWeight: 700 }}
              >
                Lanjut
              </button>
            </>
          )}

          {confirmStatus === "error" && (
            <>
              <p style={{ fontSize: 44, lineHeight: 1 }}>😕</p>
              <p style={{ fontFamily: "'Sora', sans-serif", color: "var(--text-primary)", fontWeight: 800, fontSize: 19, marginTop: 8 }}>
                Link tidak valid
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8 }}>
                Link konfirmasi ini sudah kedaluwarsa atau sudah pernah dipakai. Masukkan email kamu untuk kami kirimkan link baru.
              </p>
              <input
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder="Email kamu"
                className="w-full px-3.5 py-3 rounded-xl outline-none mt-4 text-left"
                style={{ background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 13, border: "1px solid var(--bg-selected)" }}
              />
              {error && <p style={{ color: "var(--negative)", fontSize: 11.5, marginTop: 8 }}>{error}</p>}
              {info && <p style={{ color: "var(--positive)", fontSize: 11.5, marginTop: 8 }}>{info}</p>}
              <button
                onClick={handleResend}
                disabled={resending || !confirmEmail}
                className="w-full py-3 rounded-xl mt-4"
                style={{ background: "var(--blue)", color: "var(--bg-app)", fontSize: 13, fontWeight: 700, opacity: resending || !confirmEmail ? 0.7 : 1 }}
              >
                {resending ? "Mengirim..." : "Kirim ulang link"}
              </button>
              <button
                onClick={() => setConfirmStatus("idle")}
                className="w-full py-3 rounded-xl mt-2"
                style={{ background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 13, fontWeight: 600, border: "1px solid var(--bg-selected)" }}
              >
                Kembali ke halaman masuk
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center px-5" style={{ background: "var(--bg-page)" }}>
        <div className="w-full" style={{ maxWidth: 360 }}>
          <div className="flex flex-col items-center mb-6">
            <div
              className="flex items-center justify-center mb-3 bqfinance-logo-pop"
              style={{ width: 88, height: 88, borderRadius: 22, overflow: "hidden", background: "var(--bg-surface)" }}
            >
              <img src={logoUrl} alt="BQ Finance" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
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
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kata sandi"
                className="w-full px-3.5 py-3 rounded-xl outline-none"
                style={{ background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 13, border: "1px solid var(--bg-selected)" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center"
                style={{ color: "var(--text-muted)", background: "transparent", border: "none", cursor: "pointer" }}
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
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

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1" style={{ height: 1, background: "var(--bg-selected)" }} />
            <span style={{ color: "var(--text-muted)", fontSize: 11 }}>atau</span>
            <div className="flex-1" style={{ height: 1, background: "var(--bg-selected)" }} />
          </div>

          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={googleLoading}
            className="w-full py-3 rounded-xl flex items-center justify-center gap-2"
            style={{ background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 13, fontWeight: 600, border: "1px solid var(--bg-selected)", opacity: googleLoading ? 0.7 : 1 }}
          >
            <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <span>{googleLoading ? "Memproses..." : mode === "signin" ? "Masuk dengan Google" : "Daftar dengan Google"}</span>
          </button>
        </div>
      </div>
    );
  }

  return children(session);
}
