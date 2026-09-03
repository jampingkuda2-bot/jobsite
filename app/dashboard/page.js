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
  const [copied, setCopied] = useState(false);
  const [announcement, setAnnouncement] = useState(null);

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
    fetch("/api/announcement")
      .then((res) => res.json())
      .then((d) => setAnnouncement(d.message))
      .catch(() => {});
  }, []);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  }

  function copyReferralLink() {
    const link = `${window.location.origin}/register?ref=${data.user.username}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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
      {announcement && (
        <div className="announcement-bar">
          <span className="marquee-track">📢 &nbsp;{announcement}&nbsp;&nbsp;&nbsp;&nbsp;📢 &nbsp;{announcement}</span>
        </div>
      )}

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

      <a href="/dashboard/kunci-saldo" className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none" }}>
        <div>
          <h2 style={{ marginBottom: 2 }}>Kunci Saldo</h2>
          <span className="muted">Kunci 30/90/365 hari, dapat bonus & badge</span>
        </div>
        <span style={{ color: "var(--accent)", fontWeight: 700 }}>›</span>
      </a>

      <a href="/dashboard/chat" className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none" }}>
        <div>
          <h2 style={{ marginBottom: 2 }}>Chat Admin</h2>
          <span className="muted">Tanya soal ketersediaan tugas</span>
        </div>
        <span style={{ color: "var(--accent)", fontWeight: 700 }}>›</span>
      </a>

      <div className="card">
        <h2>Ajak teman</h2>
        <p className="muted" style={{ marginBottom: 12 }}>
          Dapat <b style={{ color: "var(--accent)" }}>Rp800</b> setiap teman yang Anda ajak berhasil menyelesaikan tugas pertamanya.
        </p>
        <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
          <div>
            <div className="balance-label" style={{ fontSize: "0.7rem" }}>Diajak</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700 }}>{data.referral?.count ?? 0}</div>
          </div>
          <div>
            <div className="balance-label" style={{ fontSize: "0.7rem" }}>Bonus didapat</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--accent)" }}>
              {formatRupiah(data.referral?.earned ?? 0)}
            </div>
          </div>
        </div>
        <button className="secondary" onClick={copyReferralLink}>
          {copied ? "Tersalin!" : "Salin link ajakan"}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="card">
        <h2>Tugas tersedia</h2>
        {data.tasks.length === 0 && (
          <p className="muted">Belum ada tugas tersedia saat ini. Cek lagi nanti.</p>
        )}
        {data.tasks.map((t) => (
          <a href={`/dashboard/tugas?id=${t.id}`} className="task-item" key={t.id} style={{ display: "block", textDecoration: "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="reward">{formatRupiah(t.reward)}</div>
              <span style={{ color: "var(--muted)" }}>›</span>
            </div>
            <div className="title">{t.title}</div>
            {(t.requires_screenshot || t.requires_video) && (
              <p className="muted" style={{ margin: "2px 0" }}>
                Wajib lampirkan: {[t.requires_screenshot && "screenshot", t.requires_video && "video"].filter(Boolean).join(" & ")}
              </p>
            )}
          </a>
        ))}
      </div>

      <div className="card">
        <h2>Riwayat tugas</h2>
        {data.submissions.length === 0 && <p className="muted">Belum ada riwayat.</p>}
        {data.submissions.map((s) => (
          <div key={s.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div>{s.title}</div>
                <span className="muted">{formatRupiah(s.reward)}</span>
              </div>
              <span className={`badge ${s.status}`}>
                {s.status === "pending" ? "Menunggu" : s.status === "approved" ? "Disetujui" : "Ditolak"}
              </span>
            </div>
            {s.status === "rejected" && s.rejection_reason && (
              <p className="muted" style={{ marginTop: 4 }}>Alasan: {s.rejection_reason}</p>
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Saldo terkunci</h2>
        {(!data.locks || data.locks.length === 0) && <p className="muted">Belum ada saldo yang dikunci.</p>}
        {data.locks && data.locks.map((l) => {
          const badge = l.duration_days === 30 ? "Perak" : l.duration_days === 90 ? "Emas" : "Platinum";
          return (
            <div key={l.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <div>
                <div>{formatRupiah(l.amount)} · {l.duration_days} hari</div>
                <span className="muted">Badge: {badge} · Bonus {formatRupiah(l.bonus_amount)}</span>
              </div>
              <span className={`badge ${l.status === "completed" ? "done" : "pending"}`}>
                {l.status === "completed" ? "Sudah cair" : "Terkunci"}
              </span>
            </div>
          );
        })}
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
