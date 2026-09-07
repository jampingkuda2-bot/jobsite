"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("password"); // "password" | "otp"

  // --- login password ---
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // --- login OTP email ---
  const [otpEmail, setOtpEmail] = useState("");
  const [otpStage, setOtpStage] = useState("email"); // "email" | "code"
  const [otpCode, setOtpCode] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitPassword(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal masuk");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  async function requestOtp(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", email: otpEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal mengirim kode");
        return;
      }
      setOtpStage("code");
    } catch (err) {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", email: otpEmail, code: otpCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Kode salah atau kedaluwarsa");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(m) {
    setMode(m);
    setError("");
    setOtpStage("email");
    setOtpCode("");
  }

  return (
    <div className="wrap">
      <h1>Masuk</h1>
      <p className="muted" style={{ marginBottom: 20 }}>Masuk ke akun Anda.</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          className={mode === "password" ? "" : "secondary"}
          style={{ flex: 1 }}
          onClick={() => switchMode("password")}
        >
          🔑 Password
        </button>
        <button
          type="button"
          className={mode === "otp" ? "" : "secondary"}
          style={{ flex: 1 }}
          onClick={() => switchMode("otp")}
        >
          📧 OTP Email
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {mode === "password" && (
        <form onSubmit={submitPassword} className="card">
          <div className="field">
            <label>Username atau Email</label>
            <input required value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button disabled={loading}>{loading ? "Memproses..." : "Masuk"}</button>
        </form>
      )}

      {mode === "otp" && otpStage === "email" && (
        <form onSubmit={requestOtp} className="card">
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              required
              value={otpEmail}
              onChange={(e) => setOtpEmail(e.target.value)}
              placeholder="nama@email.com"
            />
          </div>
          <button disabled={loading}>{loading ? "Mengirim..." : "Kirim kode ke email"}</button>
        </form>
      )}

      {mode === "otp" && otpStage === "code" && (
        <form onSubmit={verifyOtp} className="card">
          <p className="muted" style={{ marginBottom: 12 }}>
            Kode dikirim ke <b>{otpEmail}</b>. Cek inbox atau folder spam.
          </p>
          <div className="field">
            <label>Kode verifikasi</label>
            <input
              required
              inputMode="numeric"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
              placeholder="6 digit kode"
            />
          </div>
          <div className="row">
            <button disabled={loading}>{loading ? "Memproses..." : "Masuk"}</button>
            <button type="button" className="secondary" onClick={() => setOtpStage("email")}>
              Ganti email
            </button>
          </div>
        </form>
      )}

      <p className="muted" style={{ textAlign: "center", marginBottom: 6 }}>
        <a href="/forgot-password">Lupa password?</a>
      </p>

      <p className="muted" style={{ textAlign: "center" }}>
        Belum punya akun? <a href="/register">Daftar</a>
      </p>
    </div>
  );
}
