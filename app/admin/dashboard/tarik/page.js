"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function formatRupiah(n) {
  return "Rp" + Number(n).toLocaleString("id-ID");
}

export default function TarikPage() {
  const router = useRouter();
  const [saldo, setSaldo] = useState(null);
  const [amount, setAmount] = useState("");
  const [danaNumber, setDanaNumber] = useState("");
  const [danaName, setDanaName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/api/me").then(async (res) => {
      if (res.status === 401) return router.push("/login");
      const d = await res.json();
      setSaldo(d.user.saldo);
    });
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount), danaNumber, danaName }),
    });
    const d = await res.json();
    setLoading(false);
    if (!res.ok) return setError(d.error || "Gagal mengajukan penarikan");
    setDone(true);
  }

  return (
    <div className="wrap">
      <div className="top-bar">
        <h1>Tarik saldo</h1>
        <a href="/dashboard" className="link-btn">Kembali</a>
      </div>

      {saldo !== null && (
        <p className="muted" style={{ marginBottom: 16 }}>
          Saldo tersedia: <b style={{ color: "var(--accent)" }}>{formatRupiah(saldo)}</b>. Tidak ada minimum penarikan.
        </p>
      )}

      {error && <div className="error">{error}</div>}

      {done ? (
        <div className="success">
          Pengajuan penarikan berhasil dikirim. Dana akan ditransfer secara manual ke DANA Anda oleh admin.
        </div>
      ) : (
        <form onSubmit={submit} className="card">
          <div className="field">
            <label>Jumlah penarikan (Rp)</label>
            <input
              type="number"
              min={1}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Contoh: 15000"
            />
          </div>
          <div className="field">
            <label>Nomor DANA</label>
            <input
              required
              value={danaNumber}
              onChange={(e) => setDanaNumber(e.target.value)}
              placeholder="08xxxxxxxxxx"
            />
          </div>
          <div className="field">
            <label>Nama pemilik akun DANA (opsional)</label>
            <input value={danaName} onChange={(e) => setDanaName(e.target.value)} />
          </div>
          <button disabled={loading}>
            {loading ? "Mengirim..." : "Ajukan penarikan"}
          </button>
        </form>
      )}
    </div>
  );
}
