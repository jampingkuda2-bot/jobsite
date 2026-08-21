"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [stage, setStage] = useState("identifier"); // identifier -> reset
  const [identifier, setIdentifier] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function requestOtp(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/forgot-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || `Gagal mengirim kode (error ${res.status})`);
        return;
      }
      setMaskedEmail(d.maskedEmail || "");
      setStage("reset");
    } catch (e) {
      setError("Tidak bisa terhubung ke server. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function submitReset(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, code, newPassword }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || `Gagal reset password (error ${res.status})`);
        return;
      }
      setDone(true);
    } catch (e) {
      setError("Tidak bisa terhubung ke server. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wrap">
      <h1>Lupa password</h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        Kami akan kirim kode ke email yang terdaftar di akun Anda.
      </p>

      {error && <div className="error">{error}</div>}

      {done ? (
        <div className="card">
          <div className="success" style={{ marginBottom: 16 }}>
            Password berhasil diubah.
          </div>
          <a href="/login" className="btn">Masuk sekarang</a>
        </div>
      ) : stage === "identifier" ? (
        <form onSubmit={requestOtp} className="card">
          <div className="field">
            <label>Username atau email</label>
            <input
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="username_kamu atau email"
            />
          </div>
          <button disabled={loading}>
            {loading ? "Mengirim..." : "Kirim kode reset"}
          </button>
        </form>
      ) : (
        <form onSubmit={submitReset} className="card">
          <p className="muted">
            Kode dikirim ke <b>{maskedEmail || "email terdaftar"}</b>.
          </p>
          <div className="field">
            <label>Kode verifikasi (6 digit)</label>
            <input
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
            />
          </div>
          <div className="field">
            <label>Password baru</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
            />
          </div>
          <button disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan password baru"}
          </button>
        </form>
      )}

      <p className="muted" style={{ textAlign: "center" }}>
        <a href="/login">Kembali ke halaman masuk</a>
      </p>
    </div>
  );
}
