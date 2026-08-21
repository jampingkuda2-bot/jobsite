"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadChatFile } from "@/lib/uploadChatFile";

function formatRupiah(n) {
  return "Rp" + Number(n).toLocaleString("id-ID");
}

function TaskCard({ task, onSubmitted }) {
  const [open, setOpen] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [uploadingShot, setUploadingShot] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [sending, setSending] = useState(false);
  const [localError, setLocalError] = useState("");
  const shotRef = useRef(null);
  const videoRef = useRef(null);

  async function handleShot(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingShot(true);
    setLocalError("");
    try {
      const { url } = await uploadChatFile(file);
      setScreenshotUrl(url);
    } catch (err) {
      setLocalError(err.message || "Gagal mengunggah screenshot");
    } finally {
      setUploadingShot(false);
    }
  }

  async function handleVideo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    setLocalError("");
    try {
      const { url } = await uploadChatFile(file);
      setVideoUrl(url);
    } catch (err) {
      setLocalError(err.message || "Gagal mengunggah video");
    } finally {
      setUploadingVideo(false);
    }
  }

  async function submit() {
    setLocalError("");
    if (task.requires_screenshot && !screenshotUrl) {
      setLocalError("Wajib lampirkan screenshot dulu");
      return;
    }
    if (task.requires_video && !videoUrl) {
      setLocalError("Wajib lampirkan video dulu");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/tasks/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, screenshotUrl, videoUrl }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLocalError(d.error || `Gagal mengirim (error ${res.status})`);
        return;
      }
      onSubmitted();
    } catch (err) {
      setLocalError("Tidak bisa terhubung ke server.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="task-item">
      <div onClick={() => setOpen(!open)} style={{ cursor: "pointer" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="reward">{formatRupiah(task.reward)}</div>
          <span style={{ color: "var(--muted)", fontSize: "1.1rem" }}>{open ? "︿" : "﹀"}</span>
        </div>
        <div className="title">{task.title}</div>
        {!open && <p className="muted" style={{ margin: "2px 0" }}>Ketuk untuk lihat detail</p>}
      </div>

      {open && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          {task.task_code && <p className="muted" style={{ margin: "2px 0" }}>ID: {task.task_code}</p>}
          {task.description && <p className="muted" style={{ margin: "6px 0" }}>{task.description}</p>}
          {task.notes && <p className="muted" style={{ margin: "6px 0" }}>Catatan: {task.notes}</p>}
          {task.link && (
            <p style={{ margin: "6px 0" }}>
              <a href={task.link} target="_blank" rel="noreferrer">Buka tautan tugas</a>
            </p>
          )}

          {localError && <div className="error" style={{ marginTop: 8 }}>{localError}</div>}

          {task.requires_screenshot && (
            <div className="field" style={{ marginTop: 10 }}>
              <label>Lampirkan screenshot (wajib)</label>
              <input ref={shotRef} type="file" accept="image/*" onChange={handleShot} />
              {uploadingShot && <p className="muted">Mengunggah...</p>}
              {screenshotUrl && <p className="muted" style={{ color: "var(--accent)" }}>✓ Screenshot terlampir</p>}
            </div>
          )}

          {task.requires_video && (
            <div className="field">
              <label>Lampirkan video (wajib, maks 1 menit)</label>
              <input ref={videoRef} type="file" accept="video/*" onChange={handleVideo} />
              {uploadingVideo && <p className="muted">Mengunggah...</p>}
              {videoUrl && <p className="muted" style={{ color: "var(--accent)" }}>✓ Video terlampir</p>}
            </div>
          )}

          <button
            className="small"
            style={{ width: "100%", marginTop: 8 }}
            disabled={sending || uploadingShot || uploadingVideo}
            onClick={submit}
          >
            {sending ? "Mengirim..." : "Sudah selesai, kirim"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);

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

  function onTaskSubmitted() {
    setNotice("Tugas terkirim, menunggu persetujuan admin.");
    load();
  }

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
      {notice && <div className="success">{notice}</div>}

      <div className="card">
        <h2>Tugas tersedia</h2>
        {data.tasks.length === 0 && (
          <p className="muted">Belum ada tugas tersedia saat ini. Cek lagi nanti.</p>
        )}
        {data.tasks.map((t) => (
          <TaskCard key={t.id} task={t} onSubmitted={onTaskSubmitted} />
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
