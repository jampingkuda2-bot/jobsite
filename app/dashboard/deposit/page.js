"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadChatFile } from "@/lib/uploadChatFile";

function formatRupiah(n) {
  return "Rp" + Number(n).toLocaleString("id-ID");
}

export default function DepositPage() {
  const router = useRouter();
  const [bankInfo, setBankInfo] = useState("");
  const [qrisImageUrl, setQrisImageUrl] = useState("");
  const [amount, setAmount] = useState("");
  const [proofUrl, setProofUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    fetch("/api/me").then((res) => {
      if (res.status === 401) router.push("/login");
    });
    fetch("/api/payment-settings")
      .then((res) => res.json())
      .then((d) => {
        setBankInfo(d.bankInfo || "");
        setQrisImageUrl(d.qrisImageUrl || "");
      })
      .catch(() => {});
  }, []);

  async function handleProof(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { url } = await uploadChatFile(file);
      setProofUrl(url);
    } catch (err) {
      setError(err.message || "Gagal mengunggah bukti transfer");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!proofUrl) {
      setError("Wajib upload bukti transfer dulu");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountIdr: Number(amount), proofUrl }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || `Gagal mengajukan deposit (error ${res.status})`);
        return;
      }
      setDone(true);
    } catch (err) {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wrap">
      <div className="top-bar">
        <h1>Deposit Saldo Token</h1>
        <a href="/dashboard" className="link-btn">Kembali</a>
      </div>
      <p className="muted" style={{ marginBottom: 16 }}>
        Saldo token dipakai untuk fitur di dalam aplikasi. Ini terpisah dari saldo tugas dan tidak bisa ditarik jadi uang.
      </p>

      {error && <div className="error">{error}</div>}

      {done ? (
        <div className="card">
          <div className="success" style={{ marginBottom: 16 }}>
            Pengajuan deposit terkirim. Saldo token akan masuk setelah admin memverifikasi bukti transfer.
          </div>
          <a href="/dashboard" className="btn">Kembali ke dashboard</a>
        </div>
      ) : (
        <div className="card">
          <h2>Transfer ke</h2>
          {bankInfo ? (
            <p className="pre-wrap" style={{ marginBottom: 12 }}>{bankInfo}</p>
          ) : (
            <p className="muted" style={{ marginBottom: 12 }}>Belum ada info rekening. Hubungi admin.</p>
          )}
          {qrisImageUrl && (
            <img src={qrisImageUrl} alt="QRIS" style={{ maxWidth: 220, borderRadius: 12, display: "block", margin: "0 auto 16px" }} />
          )}

          <form onSubmit={submit}>
            <div className="field">
              <label>Jumlah yang ditransfer (Rp)</label>
              <input
                type="number"
                min={1}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Contoh: 50000"
              />
            </div>

            <div className="field">
              <label>Bukti transfer</label>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleProof} style={{ display: "none" }} />
              <button
                type="button"
                className="secondary"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Mengunggah..." : proofUrl ? "Ganti bukti transfer" : "Upload bukti transfer"}
              </button>
              {proofUrl && (
                <img src={proofUrl} alt="bukti transfer" style={{ maxWidth: "100%", borderRadius: 10, marginTop: 8 }} />
              )}
            </div>

            <button disabled={loading || uploading}>
              {loading ? "Mengirim..." : "Kirim Permintaan Deposit"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
