"use client";

import { useEffect, useState } from "react";

export default function AdminDepositPage() {
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/deposit");
    const data = await res.json();
    setPending(data.pending || []);
    setHistory(data.history || []);
  }

  async function handleAction(id, action) {
    if (!confirm(`Yakin ${action} deposit ini?`)) return;
    setLoading(true);
    await fetch("/api/admin/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: id, action }),
    });
    load();
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="wrap">
      <h1>Deposit Pending</h1>
      {pending.length === 0 && <p className="muted">Tidak ada deposit pending.</p>}
      {pending.map((req) => (
        <div key={req.id} style={{ padding: 12, borderBottom: "1px solid var(--border)" }}>
          <div>
            <b>{req.username}</b> ({req.email})
          </div>
          <div>Jumlah: Rp{Number(req.amount).toLocaleString("id-ID")}</div>
          <div>Metode: {req.payment_method}</div>
          <div>
            Bukti: <a href={req.proof_url} target="_blank">Lihat bukti</a>
          </div>
          <div style={{ marginTop: 8 }}>
            <button className="btn" onClick={() => handleAction(req.id, "approve")} disabled={loading}>
              Setujui
            </button>
            <button className="secondary" onClick={() => handleAction(req.id, "reject")} disabled={loading} style={{ marginLeft: 8 }}>
              Tolak
            </button>
          </div>
        </div>
      ))}

      <h2 style={{ marginTop: 24 }}>Riwayat</h2>
      {history.map((req) => (
        <div key={req.id} style={{ padding: 8, borderBottom: "1px solid var(--border)", fontSize: "0.9rem" }}>
          {req.username} - Rp{Number(req.amount).toLocaleString("id-ID")} -{" "}
          <span className={`badge ${req.status}`}>
            {req.status === "approved" ? "Disetujui" : "Ditolak"}
          </span>
        </div>
      ))}
    </div>
  );
}
