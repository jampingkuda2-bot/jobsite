"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "../AdminNav";

function formatRupiah(n) {
  return "Rp" + Number(n).toLocaleString("id-ID");
}

function formatTanggal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function AdminWithdrawalsPage() {
  const router = useRouter();
  const [items, setItems] = useState(null);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setError("");
    try {
      const res = await fetch("/api/admin/withdrawals");
      if (res.status === 401) return router.push("/admin/login");
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || `Gagal memuat data (error ${res.status})`);
        setItems([]);
        setHistory([]);
        return;
      }
      setItems(d.withdrawals);
      setHistory(d.history);
    } catch (e) {
      setError("Tidak bisa terhubung ke server.");
      setItems([]);
      setHistory([]);
    }
  }

  useEffect(() => { load(); }, []);

  async function act(id, action) {
    if (action === "done" && !confirm("Konfirmasi: Anda sudah transfer manual ke DANA pengguna ini?")) return;
    setBusyId(id);
    setError("");
    try {
      const res = await fetch("/api/admin/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalId: id, action }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setError(d.error || `Gagal memproses (error ${res.status})`);
    } catch (e) {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setBusyId(null);
      load();
    }
  }

  return (
    <div className="wrap-wide">
      <AdminNav />
      {error && <div className="error">{error}</div>}

      <div className="card">
        <h2>Pengajuan penarikan</h2>
        {items === null && <p className="muted">Memuat...</p>}
        {items && items.length === 0 && !error && <p className="muted">Tidak ada pengajuan yang menunggu.</p>}
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

      <div className="card">
        <h2>Riwayat penarikan</h2>
        {history === null && <p className="muted">Memuat...</p>}
        {history && history.length === 0 && !error && <p className="muted">Belum ada riwayat.</p>}
        {history && history.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Pengguna</th>
                <th>Jumlah</th>
                <th>DANA</th>
                <th>Status</th>
                <th>Selesai</th>
              </tr>
            </thead>
            <tbody>
              {history.map((w) => (
                <tr key={w.id}>
                  <td>{w.username}</td>
                  <td>{formatRupiah(w.amount)}</td>
                  <td>{w.dana_number}</td>
                  <td>
                    <span className={`badge ${w.status === "done" ? "done" : "rejected"}`}>
                      {w.status === "done" ? "Selesai" : "Ditolak"}
                    </span>
                  </td>
                  <td>{formatTanggal(w.completed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
