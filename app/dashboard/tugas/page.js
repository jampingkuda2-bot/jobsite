"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadChatFile } from "@/lib/uploadChatFile";

function formatRupiah(n) {
  return "Rp" + Number(n).toLocaleString("id-ID");
}

export default function TaskDetailPage() {
  const router = useRouter();
  const [taskId, setTaskId] = useState(null);
  const [task, setTask] = useState(undefined); // undefined = belum dicek, null = tidak ditemukan
  const [error, setError] = useState("");
  const [notFoundReason, setNotFoundReason] = useState("");

  const [screenshotUrl, setScreenshotUrl] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [uploadingShot, setUploadingShot] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const shotRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTaskId(params.get("id"));
  }, []);

  useEffect(() => {
    if (!taskId) return;
    fetch("/api/me")
      .then(async (res) => {
        if (res.status === 401) return router.push("/login");
        const d = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(d.error || "Gagal memuat data");
          setTask(null);
          return;
        }
        const found = d.tasks.find((t) => t.id === taskId);
        if (!found) {
          setNotFoundReason("Tugas ini sudah tidak tersedia (mungkin sudah dikerjakan orang lain atau dinonaktifkan).");
          setTask(null);
          return;
        }
        setTask(found);
      })
      .catch(() => {
        setError("Tidak bisa terhubung ke server.");
        setTask(null);
      });
  }, [taskId]);

  async function handleShot(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingShot(true);
    setError("");
    try {
      const { url } = await uploadChatFile(file);
      setScreenshotUrl(url);
    } catch (err) {
      setError(err.message || "Gagal mengunggah screenshot");
    } finally {
      setUploadingShot(false);
    }
  }

  async function handleVideo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    setError("");
    try {
      const { url } = await uploadChatFile(file);
      setVideoUrl(url);
    } catch (err) {
      setError(err.message || "Gagal mengunggah video");
    } finally {
      setUploadingVideo(false);
    }
  }

  async function submit() {
    setError("");
    if (task.requires_screenshot && !screenshotUrl) {
      setError("Wajib lampirkan screenshot dulu");
      return;
    }
    if (task.requires_video && !videoUrl) {
      setError("Wajib lampirkan video dulu");
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
        setError(d.error || `Gagal mengirim (error ${res.status})`);
        return;
      }
      setDone(true);
    } catch (err) {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setSending(false);
    }
  }

  if (task === undefined) {
    return <div className="wrap"><p className="muted">Memuat...</p></div>;
  }

  if (task === null) {
    return (
      <div className="wrap">
        <div className="top-bar">
          <h1>Tugas</h1>
          <a href="/dashboard" className="link-btn">Kembali</a>
        </div>
        <div className="error">{notFoundReason || error || "Tugas tidak ditemukan"}</div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="top-bar">
        <h1>Detail tugas</h1>
        <a href="/dashboard" className="link-btn">Kembali</a>
      </div>

      {error && <div className="error">{error}</div>}

      {done ? (
        <div className="card">
          <div className="success" style={{ marginBottom: 16 }}>
            Tugas terkirim, menunggu persetujuan admin.
          </div>
          <a href="/dashboard" className="btn">Kembali ke dashboard</a>
        </div>
      ) : (
        <div className="card">
          <div className="reward" style={{ fontSize: "1.1rem", marginBottom: 4 }}>{formatRupiah(task.reward)}</div>
          <h2 style={{ marginBottom: 10 }}>{task.title}</h2>

          {task.task_code && <p className="muted">ID: {task.task_code}</p>}
          {task.description && <p className="muted pre-wrap" style={{ marginTop: 10 }}>{task.description}</p>}
          {task.notes && <p className="muted pre-wrap" style={{ marginTop: 10 }}>Catatan: {task.notes}</p>}
          {task.example_images && task.example_images.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <p className="muted" style={{ marginBottom: 6 }}>Contoh:</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {task.example_images.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`contoh ${i + 1}`}
                    style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)" }}
                  />
                ))}
              </div>
            </div>
          )}
          {task.link && (
            <p style={{ marginTop: 10 }}>
              <a href={task.link} target="_blank" rel="noreferrer">Buka tautan tugas ↗</a>
            </p>
          )}

          {task.requires_screenshot && (
            <div className="field" style={{ marginTop: 18 }}>
              <label>Lampirkan screenshot (wajib)</label>
              <input ref={shotRef} type="file" accept="image/*" onChange={handleShot} style={{ display: "none" }} />
              <button
                type="button"
                className="secondary"
                onClick={() => shotRef.current?.click()}
                disabled={uploadingShot}
              >
                {uploadingShot ? "Mengunggah..." : screenshotUrl ? "Ganti screenshot" : "Pilih screenshot"}
              </button>
              {screenshotUrl && (
                <img src={screenshotUrl} alt="screenshot" style={{ maxWidth: "100%", borderRadius: 10, marginTop: 8 }} />
              )}
            </div>
          )}

          {task.requires_video && (
            <div className="field">
              <label>Lampirkan video (wajib, maks 1 menit)</label>
              <input ref={videoRef} type="file" accept="video/*" onChange={handleVideo} style={{ display: "none" }} />
              <button
                type="button"
                className="secondary"
                onClick={() => videoRef.current?.click()}
                disabled={uploadingVideo}
              >
                {uploadingVideo ? "Mengunggah..." : videoUrl ? "Ganti video" : "Pilih video"}
              </button>
              {videoUrl && (
                <video src={videoUrl} controls style={{ maxWidth: "100%", borderRadius: 10, marginTop: 8 }} />
              )}
            </div>
          )}

          <button
            style={{ marginTop: 18 }}
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
