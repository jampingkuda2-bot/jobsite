"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const OTP_LENGTH = 6;

export default function RegisterPage() {
  const router = useRouter();
  const [stage, setStage] = useState("email"); // email -> otp -> credentials
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [verifying, setVerifying] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const otpInputRefs = useRef([]);

  const code = digits.join("");

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

  async function checkOtp(fullCode) {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: fullCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Kode salah (error ${res.status})`);
        setDigits(Array(OTP_LENGTH).fill(""));
        otpInputRefs.current[0]?.focus();
        return;
      }
      // Kode benar: mainkan animasi orbit dulu sebentar sebelum lanjut
      setVerifying(true);
      setTimeout(() => {
        setStage("credentials");
        setVerifying(false);
      }, 850);
    } catch (err) {
      setError("Tidak bisa terhubung ke server. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  function handleDigitChange(index, value) {
    const v = value.replace(/[^0-9]/g, "");
    if (!v) {
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }
    // Kalau user paste banyak karakter sekaligus di satu kotak
    if (v.length > 1) {
      const chars = v.slice(0, OTP_LENGTH - index).split("");
      const next = [...digits];
      chars.forEach((c, i) => { next[index + i] = c; });
      setDigits(next);
      const lastFilled = Math.min(index + chars.length, OTP_LENGTH - 1);
      otpInputRefs.current[lastFilled]?.focus();
      const joined = next.join("");
      if (joined.length === OTP_LENGTH && next.every((d) => d !== "")) {
        checkOtp(joined);
      }
      return;
    }
    const next = [...digits];
    next[index] = v;
    setDigits(next);
    if (index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
    if (next.every((d) => d !== "")) {
      checkOtp(next.join(""));
    }
  }

  function handleDigitKeyDown(index, e) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  }

  function handlePasteOtp(e) {
    const text = e.clipboardData.getData("text").replace(/[^0-9]/g, "");
    if (!text) return;
    e.preventDefault();
    const chars = text.slice(0, OTP_LENGTH).split("");
    const next = Array(OTP_LENGTH).fill("");
    chars.forEach((c, i) => { next[i] = c; });
    setDigits(next);
    const lastFilled = Math.min(chars.length, OTP_LENGTH - 1);
    otpInputRefs.current[lastFilled]?.focus();
    if (chars.length === OTP_LENGTH) {
      checkOtp(next.join(""));
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
        <div className="card">
          <p className="muted">
            Kode verifikasi sudah dikirim ke <b>{email}</b>. Cek inbox atau folder spam.
          </p>

          <div className={`otp-wrap${verifying ? " verifying" : ""}`}>
            <div className="otp-orbit-ring" />
            <div className="otp-hub" />
            {digits.map((d, i) => {
              // Susunan hexagon melingkar dipakai cuma saat animasi "verifying"
              const angle = -90 + i * 60;
              const rad = (angle * Math.PI) / 180;
              const radius = 78;
              const tx = Math.cos(rad) * radius;
              const ty = Math.sin(rad) * radius;
              const rot = i % 2 === 0 ? 14 : -14;
              return (
                <input
                  key={i}
                  ref={(el) => (otpInputRefs.current[i] = el)}
                  className={`otp-slot${verifying ? " verified" : ""}`}
                  style={verifying ? { transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg)` } : undefined}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  disabled={verifying}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(i, e)}
                  onPaste={handlePasteOtp}
                />
              );
            })}
          </div>

          {loading && !verifying && <p className="muted" style={{ textAlign: "center" }}>Memeriksa kode...</p>}
        </div>
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
