"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function formatRupiah(n) {
  return "Rp" + Number(n).toLocaleString("id-ID");
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busyTaskId, setBusyTaskId] = useState(null);
  const [notice, setNotice] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/me");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setData({ error: d.error || `Gagal memuat data (error ${res.status})` });
        return;
      }
      setData(d);
    } catch (e) {
      setData({ error: "Tidak bisa terhubung ke server." });
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function doTask(taskId) {
    setError("");
    setNotice("");
    setBusyTaskId(taskId);
    try {
      const res = await fetch("/api/tasks/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || `Gagal mengirim tugas (error ${res.status})`);
        return;
      }
      setNotice("Tugas terkirim, menunggu persetujuan admin.");
      load();
    } catch (e) {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setBusyTaskId(null);
    }
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  }

  if (!data) return <div className="wrap"><p className="muted">Memuat...</p></div>;
  if (data.error) return (
    <div className="wrap">
      <div className="error">{data.error}</div>
      <button onClick={load}>Coba lagi</button>
    </div>
  );

  return (
    <div className="wrap">
      <div className="top-bar">
        <div>
          <h1>Halo, {data.user.username}</h1>
          <span className="muted">{data.user.email}</span>
        </div>
        <button className="link-btn" onClick={logout}>Keluar</button>
      </div>

      <div className="balance-card">
        <div className="balance-label">Saldo Anda</div>
        <div className="balance-value">{formatRupiah(data.user.saldo)}</div>
        <a href="/dashboard/tarik" className="btn" style={{ marginTop: 16, display: "block" }}>
          Tarik saldo ke DANA
        </a>
      </div>

      <a href="/dashboard/chat" className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none" }}>
        <div>
          <h2 style={{ marginBottom: 2 }}>Chat Admin</h2>
          <span className="muted">Tanya soal ketersediaan tugas</span>
        </div>
        <span style={{ color: "var(--accent)", fontWeight: 700 }}>›</span>
      </a>

      {error && <div className="error">{error}</div>}
      {notice && <div className="success">{notice}</div>}

      <div className="card">
        <h2>Tugas tersedia</h2>
        {data.tasks.length === 0 && (
          <p className="muted">Belum ada tugas tersedia saat ini. Cek lagi nanti.</p>
        )}
        {data.tasks.map((t) => (
          <div className="task-item" key={t.id}>
            <div className="reward">{formatRupiah(t.reward)}</div>
            <div className="title">{t.title}</div>
            {t.task_code && <p className="muted" style={{ margin: "2px 0" }}>ID: {t.task_code}</p>}
            {t.description && <p className="muted" style={{ margin: "4px 0" }}>{t.description}</p>}
            {t.link && (
              <p style={{ margin: "6px 0" }}>
                <a href={t.link} target="_blank" rel="noreferrer">Buka tautan tugas</a>
              </p>
            )}
            <button
              className="small"
              disabled={busyTaskId === t.id}
              onClick={() => doTask(t.id)}
            >
              {busyTaskId === t.id ? "Mengirim..." : "Sudah selesai, kirim"}
            </button>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Riwayat tugas</h2>
        {data.submissions.length === 0 && <p className="muted">Belum ada riwayat.</p>}
        {data.submissions.map((s) => (
          <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
            <div>
              <div>{s.title}</div>
              <span className="muted">{formatRupiah(s.reward)}</span>
            </div>
            <span className={`badge ${s.status}`}>
              {s.status === "pending" ? "Menunggu" : s.status === "approved" ? "Disetujui" : "Ditolak"}
            </span>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Riwayat penarikan</h2>
        {data.withdrawals.length === 0 && <p className="muted">Belum ada riwayat.</p>}
        {data.withdrawals.map((w) => (
          <div key={w.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
            <div>
              <div>{formatRupiah(w.amount)}</div>
              <span className="muted">{w.ref_code ? `${w.ref_code} · ` : ""}ke {w.dana_number}</span>
            </div>
            <span className={`badge ${w.status === "done" ? "done" : w.status === "rejected" ? "rejected" : "pending"}`}>
              {w.status === "done" ? "Selesai" : w.status === "rejected" ? "Ditolak" : "Diproses"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
