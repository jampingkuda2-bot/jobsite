"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DepositPage() {
  const router = useRouter();
  const [amount, setAmount] = useState(50000);
  const [method, setMethod] = useState("QRIS");
  const [proofUrl, setProofUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/deposit/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, paymentMethod: method, proofUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Permintaan deposit dikirim! Tunggu verifikasi admin.");
        setTimeout(() => router.push("/dashboard"), 2000);
      } else {
        setMessage("❌ " + data.error);
      }
    } catch (err) {
      setMessage("❌ Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wrap" style={{ maxWidth: 500, margin: "auto" }}>
      <h1 style={{ marginBottom: 8 }}>Deposit Saldo Token</h1>
      <p className="muted" style={{ marginBottom: 16 }}>
        Transfer ke rekening berikut, lalu upload bukti.
      </p>

      <div style={{ background: "var(--bg)", padding: 16, borderRadius: 12, marginBottom: 16 }}>
        <p style={{ fontWeight: 600 }}>QRIS / Mayar:</p>
        <img src="/qris-placeholder.png" alt="QRIS" style={{ maxWidth: 200, margin: "8px auto", display: "block" }} />
        <p className="muted" style={{ textAlign: "center" }}>
          Scan QRIS di atas atau transfer ke <b>081234567890</b> (BNI)
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Jumlah (Rp)</label>
          <input
            type="number"
            className="input"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            min={10000}
            step={10000}
            required
            style={{ width: "100%", padding: "8px 12px" }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Metode Pembayaran</label>
          <select
            className="input"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            style={{ width: "100%", padding: "8px 12px" }}
          >
            <option value="QRIS">QRIS</option>
            <option value="Mayar">Mayar</option>
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Bukti Transfer (URL)</label>
          <input
            type="text"
            className="input"
            placeholder="Paste link gambar bukti dari Cloudinary"
            value={proofUrl}
            onChange={(e) => setProofUrl(e.target.value)}
            required
            style={{ width: "100%", padding: "8px 12px" }}
          />
          <p className="muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
            Upload bukti ke imgur/cloudinary, lalu tempel link di sini.
          </p>
        </div>
        {message && (
          <div style={{ marginBottom: 12, padding: 8, borderRadius: 4, background: "var(--bg)" }}>
            {message}
          </div>
        )}
        <button type="submit" className="btn" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Mengirim..." : "Kirim Permintaan Deposit"}
        </button>
      </form>
    </div>
  );
}
