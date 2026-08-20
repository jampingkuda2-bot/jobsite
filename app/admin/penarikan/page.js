"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "../AdminNav";

function formatRupiah(n) {
  return "Rp" + Number(n).toLocaleString("id-ID");
}

export default function AdminWithdrawalsPage() {
  const router = useRouter();
  const [items, setItems] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    const res = await fetch("/api/admin/withdrawals");
    if (res.status === 401) return router.push("/admin/login");
    const d = await res.json();
    setItems(d.withdrawals);
  }

  useEffect(() => { load(); }, []);

  async function act(id, action) {
    if (action === "done" && !confirm("Konfirmasi: Anda sudah transfer manual ke DANA pengguna ini?")) return;
    setBusyId(id);
    await fetch("/api/admin/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ withdrawalId: id, action }),
    });
    setBusyId(null);
    load();
  }

  return (
    <div className="wrap-wide">
      <AdminNav />
      <div className="card">
        <h2>Pengajuan penarikan</h2>
        {!items && <p className="muted">Memuat...</p>}
        {items && items.length === 0 && <p className="muted">Tidak ada pengajuan yang menunggu.</p>}
        {items && items.map((w) => (
          <div className="task-item" key={w.id}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div className="title">{w.username} ({w.email})</div>
              <div className="reward">{formatRupiah(w.amount)}</div>
            </div>
            <p className="muted">DANA: {w.dana_number} {w.dana_name ? `— ${w.dana_name}` : ""}</p>
            <div className="row">
              <button className="small" onClick={() => act(w.id, "done")} disabled={busyId === w.id}>
                Sudah TF, tandai selesai
              </button>
              <button className="small danger" onClick={() => act(w.id, "reject")} disabled={busyId === w.id}>
                Tolak (kembalikan saldo)
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
