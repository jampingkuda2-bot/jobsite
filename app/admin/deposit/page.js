"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "../AdminNav";
import { uploadChatFile } from "@/lib/uploadChatFile";

function formatRupiah(n) {
  return "Rp" + Number(n).toLocaleString("id-ID");
}
function formatTanggal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function AdminDepositPage() {
  const router = useRouter();
  const [bankInfo, setBankInfo] = useState("");
  const [qrisImageUrl, setQrisImageUrl] = useState("");
  const [uploadingQris, setUploadingQris] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const qrisFileRef = useRef(null);

  const [pending, setPending] = useState(null);
  const [history, setHistory] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadSettings() {
    try {
      const res = await fetch("/api/admin/payment-settings");
      if (res.status === 401) return router.push("/admin/login");
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setBankInfo(d.bankInfo || "");
        setQrisImageUrl(d.qrisImageUrl || "");
      }
    } catch (e) {
      // diamkan, bukan bagian kritis
    } finally {
      setSettingsLoaded(true);
    }
  }

  async function loadDeposits() {
    setError("");
    try {
      const res = await fetch("/api/admin/deposits");
      if (res.status === 401) return router.push("/admin/login");
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || `Gagal memuat data (error ${res.status})`);
        setPending([]);
        setHistory([]);
        return;
      }
      setPending(d.pending);
      setHistory(d.history);
    } catch (e) {
      setError("Tidak bisa terhubung ke server.");
      setPending([]);
      setHistory([]);
    }
  }

  useEffect(() => { loadSettings(); loadDeposits(); }, []);

  async function handleQrisUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingQris(true);
    setError("");
    try {
      const { url } = await uploadChatFile(file);
      setQrisImageUrl(url);
    } catch (err) {
      setError(err.message || "Gagal mengunggah gambar QRIS");
    } finally {
      setUploadingQris(false);
    }
  }

  async function saveSettings(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/payment-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankInfo, qrisImageUrl }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setError(d.error || `Gagal menyimpan (error ${res.status})`);
      setNotice("Pengaturan pembayaran disimpan.");
    } catch (e) {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setSavingSettings(false);
    }
  }

  async function act(id, action) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch("/api/admin/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depositId: id, action }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setError(d.error || `Gagal memproses (error ${res.status})`);
    } catch (e) {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setBusyId(null);
      loadDeposits();
    }
  }

  return (
    <div className="wrap-wide">
      <AdminNav />

      {error && <div className="error">{error}</div>}
      {notice && <div className="success">{notice}</div>}

      <div className="card">
        <h2>Pengaturan pembayaran</h2>
        {settingsLoaded && (
          <form onSubmit={saveSettings}>
            <div className="field">
              <label>Info rekening (ditampilkan ke user)</label>
              <textarea
                rows={3}
                value={bankInfo}
                onChange={(e) => setBankInfo(e.target.value)}
                placeholder="Contoh: BNI 081234567890 a.n. Nama Anda"
              />
            </div>
            <div className="field">
              <label>Gambar QRIS (opsional)</label>
              <input ref={qrisFileRef} type="file" accept="image/*" onChange={handleQrisUpload} style={{ display: "none" }} />
              <button
                type="button"
                className="secondary"
                onClick={() => qrisFileRef.current?.click()}
                disabled={uploadingQris}
              >
                {uploadingQris ? "Mengunggah..." : qrisImageUrl ? "Ganti gambar QRIS" : "Upload gambar QRIS"}
              </button>
              {qrisImageUrl && (
                <img src={qrisImageUrl} alt="QRIS" style={{ maxWidth: 160, borderRadius: 10, marginTop: 8, display: "block" }} />
              )}
            </div>
            <button disabled={savingSettings}>{savingSettings ? "Menyimpan..." : "Simpan pengaturan"}</button>
          </form>
        )}
      </div>

      <div className="card">
        <h2>Pengajuan deposit</h2>
        {pending === null && <p className="muted">Memuat...</p>}
        {pending && pending.length === 0 && !error && <p className="muted">Tidak ada pengajuan yang menunggu.</p>}
        {pending && pending.map((d) => (
          <div className="task-item" key={d.id}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div className="title">{d.username} ({d.email})</div>
              <div className="reward">{formatRupiah(d.amount_idr)}</div>
            </div>
            <p className="muted">Diajukan: {formatTanggal(d.created_at)}</p>
            <img
              src={d.proof_url}
              alt="bukti transfer"
              onClick={() => window.open(d.proof_url, "_blank")}
              style={{ height: 120, width: 120, objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)", marginTop: 8, cursor: "pointer" }}
            />
            <div className="row" style={{ marginTop: 10 }}>
              <button className="small" onClick={() => act(d.id, "approve")} disabled={busyId === d.id}>
                Setujui (kredit token)
              </button>
              <button className="small danger" onClick={() => act(d.id, "reject")} disabled={busyId === d.id}>
                Tolak
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Riwayat deposit</h2>
        {history === null && <p className="muted">Memuat...</p>}
        {history && history.length === 0 && !error && <p className="muted">Belum ada riwayat.</p>}
        {history && history.map((d) => (
          <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
            <div>
              <div>{d.username}</div>
              <span className="muted">{formatRupiah(d.amount_idr)} · {formatTanggal(d.reviewed_at)}</span>
            </div>
            <span className={`badge ${d.status === "approved" ? "approved" : "rejected"}`}>
              {d.status === "approved" ? "Disetujui" : "Ditolak"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
