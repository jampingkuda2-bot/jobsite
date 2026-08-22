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

export default function AdminPendingPage() {
  const router = useRouter();
  const [items, setItems] = useState(null);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setError("");
    try {
      const res = await fetch("/api/admin/submissions");
      if (res.status === 401) return router.push("/admin/login");
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || `Gagal memuat data (error ${res.status})`);
        setItems([]);
        setHistory([]);
        return;
      }
      setItems(d.submissions);
      setHistory(d.history);
    } catch (e) {
      setError("Tidak bisa terhubung ke server.");
      setItems([]);
      setHistory([]);
    }
  }

  useEffect(() => { load(); }, []);

  async function act(id, action) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch("/api/admin/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: id, action }),
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

  async function hapusRiwayat(id) {
    if (!confirm("Hapus riwayat ini secara permanen?")) return;
    setBusyId(id);
    setError("");
    try {
      const res = await fetch("/api/admin/submissions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: id }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setError(d.error || `Gagal menghapus (error ${res.status})`);
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
        <h2>Menunggu persetujuan</h2>
        {items === null && <p className="muted">Memuat...</p>}
        {items && items.length === 0 && !error && <p className="muted">Tidak ada yang menunggu persetujuan.</p>}
        {items && items.map((s) => (
          <div className="task-item" key={s.id}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div className="title">{s.title}</div>
              <div className="reward">{formatRupiah(s.reward)}</div>
            </div>
            <p className="muted">Oleh {s.username} ({s.email})</p>
            {s.task_code && <p className="muted">ID Tugas: {s.task_code}</p>}
            {s.description && <p className="muted pre-wrap" style={{ marginTop: 6 }}>{s.description}</p>}
            {s.notes && <p className="muted pre-wrap" style={{ marginTop: 4 }}>Catatan: {s.notes}</p>}
            <p className="muted">Dikirim: {formatTanggal(s.submitted_at)}</p>
            {(s.screenshot_url || s.video_url) && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {s.screenshot_url && (
                  <a href={s.screenshot_url} target="_blank" rel="noreferrer">
                    <img src={s.screenshot_url} alt="screenshot" style={{ height: 100, width: 100, objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)" }} />
                  </a>
                )}
                {s.video_url && (
                  <a href={s.video_url} target="_blank" rel="noreferrer">
                    <video src={s.video_url} style={{ height: 100, width: 100, objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)" }} />
                  </a>
                )}
              </div>
            )}
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

      <div className="card">
        <h2>Riwayat persetujuan</h2>
        {history === null && <p className="muted">Memuat...</p>}
        {history && history.length === 0 && !error && <p className="muted">Belum ada riwayat.</p>}
        {history && history.map((s) => (
          <div className="task-item" key={s.id}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div className="title">{s.title}</div>
              <div className="reward">{formatRupiah(s.reward)}</div>
            </div>
            <p className="muted">{s.username} — {formatTanggal(s.reviewed_at)}</p>
            {s.task_code && <p className="muted">ID Tugas: {s.task_code}</p>}
            {s.description && <p className="muted pre-wrap" style={{ marginTop: 4 }}>{s.description}</p>}
            {(s.screenshot_url || s.video_url) && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {s.screenshot_url && (
                  <a href={s.screenshot_url} target="_blank" rel="noreferrer">
                    <img src={s.screenshot_url} alt="screenshot" style={{ height: 100, width: 100, objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)" }} />
                  </a>
                )}
                {s.video_url && (
                  <a href={s.video_url} target="_blank" rel="noreferrer">
                    <video src={s.video_url} style={{ height: 100, width: 100, objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)" }} />
                  </a>
                )}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <span className={`badge ${s.status === "approved" ? "approved" : "rejected"}`}>
                {s.status === "approved" ? "Disetujui" : "Ditolak"}
              </span>
              <button className="small danger" onClick={() => hapusRiwayat(s.id)} disabled={busyId === s.id}>
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
