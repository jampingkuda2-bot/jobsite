"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "../AdminNav";

function formatRupiah(n) {
  return "Rp" + Number(n).toLocaleString("id-ID");
}

export default function AdminPendingPage() {
  const router = useRouter();
  const [items, setItems] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    const res = await fetch("/api/admin/submissions");
    if (res.status === 401) return router.push("/admin/login");
    const d = await res.json();
    setItems(d.submissions);
  }

  useEffect(() => { load(); }, []);

  async function act(id, action) {
    setBusyId(id);
    await fetch("/api/admin/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId: id, action }),
    });
    setBusyId(null);
    load();
  }

  return (
    <div className="wrap-wide">
      <AdminNav />
      <div className="card">
        <h2>Menunggu persetujuan</h2>
        {!items && <p className="muted">Memuat...</p>}
        {items && items.length === 0 && <p className="muted">Tidak ada yang menunggu persetujuan.</p>}
        {items && items.map((s) => (
          <div className="task-item" key={s.id}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div className="title">{s.title}</div>
              <div className="reward">{formatRupiah(s.reward)}</div>
            </div>
            <p className="muted">Oleh {s.username} ({s.email})</p>
            <div className="row">
              <button className="small" onClick={() => act(s.id, "approve")} disabled={busyId === s.id}>
                Setujui
              </button>
              <button className="small danger" onClick={() => act(s.id, "reject")} disabled={busyId === s.id}>
                Tolak
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
