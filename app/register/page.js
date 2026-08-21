"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [stage, setStage] = useState("email"); // email -> otp -> credentials
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Ambil kode referral dari URL (?ref=username), kalau ada, tanpa perlu Suspense
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) setReferralCode(ref);
    } catch (e) {
      // abaikan kalau gagal, field tetap kosong dan bisa diisi manual
    }
  }, []);

  async function sendOtp(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Gagal mengirim kode (error ${res.status})`);
        return;
      }
      setStage("otp");
    } catch (err) {
      setError("Tidak bisa terhubung ke server. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function checkOtp(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Kode salah (error ${res.status})`);
        return;
      }
      setStage("credentials");
    } catch (err) {
      setError("Tidak bisa terhubung ke server. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function finishRegister(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, username, password, referralCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Gagal mendaftar (error ${res.status})`);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError("Tidak bisa terhubung ke server. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wrap">
      <h1>Daftar akun</h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        Kerjakan tugas, kumpulkan saldo, tarik ke DANA kapan saja.
      </p>

      {error && <div className="error">{error}</div>}

      {stage === "email" && (
        <form onSubmit={sendOtp} className="card">
          <div className="field">
            <label>Alamat email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
            />
          </div>
          <button disabled={loading}>
            {loading ? "Mengirim..." : "Kirim kode verifikasi"}
          </button>
        </form>
      )}

      {stage === "otp" && (
        <form onSubmit={checkOtp} className="card">
          <p className="muted">
            Kode verifikasi sudah dikirim ke <b>{email}</b>. Cek inbox atau folder spam.
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
          <button disabled={loading}>
            {loading ? "Memeriksa..." : "Verifikasi"}
          </button>
        </form>
      )}

      {stage === "credentials" && (
        <form onSubmit={finishRegister} className="card">
          <p className="muted">Email terverifikasi. Buat username & password untuk login.</p>
          <div className="field">
            <label>Username</label>
            <input
              required
              minLength={3}
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""))}
              placeholder="username_kamu"
            />
            <p className="muted" style={{ marginTop: 4 }}>Huruf kecil, angka, underscore — tanpa spasi.</p>
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
            />
          </div>
          <div className="field">
            <label>Kode referral (opsional)</label>
            <input
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              placeholder="Username yang mengajak Anda"
            />
          </div>
          <button disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan & masuk"}
          </button>
        </form>
      )}

      <p className="muted" style={{ textAlign: "center" }}>
        Sudah punya akun? <a href="/login">Masuk</a>
      </p>
    </div>
  );
}
