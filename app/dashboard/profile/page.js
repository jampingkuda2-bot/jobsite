"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadProfilePhoto } from "@/lib/uploadProfilePhoto";

export default function ProfilePage() {
  const router = useRouter();
  const [tab, setTab] = useState("profil"); // "profil" | "password" | "whatsapp"
  const [data, setData] = useState(null);
  const [username, setUsername] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [waPhone, setWaPhone] = useState("");
  const [waOtpSent, setWaOtpSent] = useState(false);
  const [waCode, setWaCode] = useState("");
  const [waBusy, setWaBusy] = useState(false);

  const fileRef = useRef(null);

  async function load() {
    try {
      const res = await fetch("/api/me");
      if (res.status === 401) return router.push("/login");
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || `Gagal memuat data (error ${res.status})`);
        return;
      }
      setData(d);
      setUsername(d.user.username);
      setPhotoUrl(d.user.photo_url || "");
    } catch (e) {
      setError("Tidak bisa terhubung ke server.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    setNotice("");
    try {
      const url = await uploadProfilePhoto(file);
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: url }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "Gagal menyimpan foto");
        return;
      }
      setPhotoUrl(url);
      setNotice("Foto profil diperbarui.");
    } catch (err) {
      setError(err.message || "Gagal mengunggah foto");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function saveProfile(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setSavingProfile(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "Gagal menyimpan profil");
        return;
      }
      setNotice("Profil disimpan.");
      load();
    } catch (err) {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password baru tidak cocok");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "Gagal mengganti password");
        return;
      }
      setNotice("Password berhasil diganti.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function requestWaOtp(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setWaBusy(true);
    try {
      const res = await fetch("/api/profile/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", phone: waPhone }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "Gagal mengirim kode");
        return;
      }
      setWaOtpSent(true);
      setNotice("Kode verifikasi dikirim ke WhatsApp kamu.");
    } catch (err) {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setWaBusy(false);
    }
  }

  async function verifyWaOtp(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setWaBusy(true);
    try {
      const res = await fetch("/api/profile/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", phone: waPhone, code: waCode }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "Kode salah atau kedaluwarsa");
        return;
      }
      setNotice("Nomor WhatsApp berhasil dikaitkan & terverifikasi.");
      setWaOtpSent(false);
      setWaCode("");
      setWaPhone("");
      load();
    } catch (err) {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setWaBusy(false);
    }
  }

  if (!data) return <div className="wrap"><p className="muted">Memuat...</p></div>;

  return (
    <div className="wrap">
      <div className="top-bar" style={{ marginBottom: 16 }}>
        <h1>Profil Saya</h1>
        <button className="link-btn" onClick={() => router.push("/dashboard")}>‹ Kembali</button>
      </div>

      <div className="card" style={{ display: "flex", gap: 16, alignItems: "center" }}>
        {photoUrl ? (
          <img
            src={photoUrl}
            alt="Foto profil"
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              objectFit: "cover",
              border: "1px solid var(--border)",
            }}
          />
        ) : (
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "var(--panel-2)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--muted)",
            }}
          >
            {data.user.username?.[0]?.toUpperCase() || "?"}
          </div>
        )}
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            style={{ display: "none" }}
          />
          <button
            type="button"
            className="secondary"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Mengunggah..." : "Ganti foto"}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {notice && <div className="success">{notice}</div>}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", overflowX: "auto" }}>
          <button
            type="button"
            onClick={() => setTab("profil")}
            style={{
              flex: 1,
              minWidth: 90,
              padding: "14px 0",
              background: "transparent",
              border: "none",
              borderBottom: tab === "profil" ? "2px solid var(--accent)" : "2px solid transparent",
              color: tab === "profil" ? "var(--accent)" : "var(--muted)",
              fontWeight: 700,
              fontSize: "0.9rem",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Edit Profil
          </button>
          <button
            type="button"
            onClick={() => setTab("password")}
            style={{
              flex: 1,
              minWidth: 90,
              padding: "14px 0",
              background: "transparent",
              border: "none",
              borderBottom: tab === "password" ? "2px solid var(--accent)" : "2px solid transparent",
              color: tab === "password" ? "var(--accent)" : "var(--muted)",
              fontWeight: 700,
              fontSize: "0.9rem",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Ganti Password
          </button>
          <button
            type="button"
            onClick={() => setTab("whatsapp")}
            style={{
              flex: 1,
              minWidth: 90,
              padding: "14px 0",
              background: "transparent",
              border: "none",
              borderBottom: tab === "whatsapp" ? "2px solid var(--accent)" : "2px solid transparent",
              color: tab === "whatsapp" ? "var(--accent)" : "var(--muted)",
              fontWeight: 700,
              fontSize: "0.9rem",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            WhatsApp
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {tab === "profil" && (
            <form onSubmit={saveProfile}>
              <div className="field">
                <label>Username</label>
                <input
                  required
                  minLength={3}
                  value={username}
                  onChange={(e) =>
                    setUsername(
                      e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
                    )
                  }
                />
                <p className="muted" style={{ marginTop: 4 }}>
                  Huruf kecil, angka, underscore — tanpa spasi.
                </p>
              </div>
              <div className="field">
                <label>Email</label>
                <input value={data.user.email} disabled />
                <p className="muted" style={{ marginTop: 4 }}>Email tidak bisa diubah.</p>
              </div>
              <button disabled={savingProfile}>
                {savingProfile ? "Menyimpan..." : "Simpan profil"}
              </button>
            </form>
          )}

          {tab === "password" && (
            <form onSubmit={savePassword}>
              <div className="field">
                <label>Password saat ini</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
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
              <div className="field">
                <label>Konfirmasi password baru</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <button disabled={savingPassword}>
                {savingPassword ? "Menyimpan..." : "Ganti password"}
              </button>
            </form>
          )}

          {tab === "whatsapp" && (
            <div>
              {data.user.whatsapp_verified && data.user.whatsapp_number ? (
                <div className="success" style={{ marginBottom: 16 }}>
                  Nomor aktif: <b>{data.user.whatsapp_number}</b> (terverifikasi)
                </div>
              ) : (
                <p className="muted" style={{ marginBottom: 16 }}>
                  Belum ada nomor WhatsApp terkait. Tambahkan biar bisa dapat OTP & notifikasi lewat WA.
                </p>
              )}

              {!waOtpSent ? (
                <form onSubmit={requestWaOtp}>
                  <div className="field">
                    <label>{data.user.whatsapp_verified ? "Ganti nomor WhatsApp" : "Nomor WhatsApp"}</label>
                    <input
                      type="tel"
                      required
                      value={waPhone}
                      onChange={(e) => setWaPhone(e.target.value)}
                      placeholder="08xxxxxxxxxx"
                    />
                  </div>
                  <button disabled={waBusy}>
                    {waBusy ? "Mengirim..." : "Kirim kode verifikasi"}
                  </button>
                </form>
              ) : (
                <form onSubmit={verifyWaOtp}>
                  <p className="muted" style={{ marginBottom: 12 }}>
                    Kode dikirim ke <b>{waPhone}</b>.
                  </p>
                  <div className="field">
                    <label>Kode verifikasi</label>
                    <input
                      required
                      inputMode="numeric"
                      value={waCode}
                      onChange={(e) => setWaCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="6 digit kode"
                    />
                  </div>
                  <div className="row">
                    <button disabled={waBusy}>
                      {waBusy ? "Memverifikasi..." : "Verifikasi"}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => { setWaOtpSent(false); setWaCode(""); }}
                    >
                      Batal
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
                    }
                        
