"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "../AdminNav";
import { uploadChatFile } from "@/lib/uploadChatFile";

function formatRupiah(n) {
  return "Rp" + Number(n).toLocaleString("id-ID");
}

function formatTanggal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AdminTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [link, setLink] = useState("");
  const [reward, setReward] = useState(1500);
  const [targetUsername, setTargetUsername] = useState("");
  const [taskCode, setTaskCode] = useState("");
  const [requiresScreenshot, setRequiresScreenshot] = useState(false);
  const [requiresVideo, setRequiresVideo] = useState(false);
  const [exampleImages, setExampleImages] = useState([]);
  const [uploadingExample, setUploadingExample] = useState(false);
  const exampleFileRef = useRef(null);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const res = await fetch("/api/admin/tasks");
      if (res.status === 401) return router.push("/admin/login");
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || `Gagal memuat data (error ${res.status})`);
        setTasks([]);
        return;
      }
      setTasks(d.tasks);
    } catch (e) {
      setError("Tidak bisa terhubung ke server.");
      setTasks([]);
    }
  }

  useEffect(() => { load(); }, []);

  async function addExampleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingExample(true);
    setError("");
    try {
      const { url } = await uploadChatFile(file);
      setExampleImages((prev) => [...prev, url]);
    } catch (err) {
      setError(err.message || "Gagal mengunggah contoh screenshot");
    } finally {
      setUploadingExample(false);
      if (exampleFileRef.current) exampleFileRef.current.value = "";
    }
  }

  function removeExampleImage(index) {
    setExampleImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function createTask(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, description, link, reward: Number(reward), targetUsername, taskCode,
          notes, requiresScreenshot, requiresVideo, exampleImages,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setError(d.error || `Gagal membuat tugas (error ${res.status})`);
      setTitle(""); setDescription(""); setLink(""); setReward(1500);
      setTargetUsername(""); setTaskCode(""); setNotes("");
      setRequiresScreenshot(false); setRequiresVideo(false); setExampleImages([]);
      load();
    } catch (e) {
      setError("Tidak bisa terhubung ke server.");
    }
  }

  async function toggleActive(t) {
    setError("");
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, is_active: !t.is_active }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setError(d.error || `Gagal menyimpan (error ${res.status})`);
    } catch (e) {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      load();
    }
  }

  async function deleteTask(t) {
    if (!confirm(`Hapus tugas "${t.title}"?`)) return;
    setError("");
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setError(d.error || `Gagal menghapus (error ${res.status})`);
    } catch (e) {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      load();
    }
  }

  return (
    <div className="wrap-wide">
      <AdminNav />

      {error && <div className="error">{error}</div>}

      <div className="card">
        <h2>Tambah tugas baru</h2>
        <p className="muted" style={{ marginBottom: 12 }}>
          Tugas baru otomatis <b>nonaktif</b> dan tidak muncul di web sampai Anda tekan "Aktifkan".
        </p>
        <form onSubmit={createTask}>
          <div className="field">
            <label>Judul tugas</label>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field">
            <label>Deskripsi / instruksi</label>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="field">
            <label>Catatan tambahan (opsional, kosongkan kalau tidak perlu)</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="field">
            <label>Contoh screenshot (opsional, kosongkan kalau tidak perlu — bisa lebih dari 1)</label>
            <input
              ref={exampleFileRef}
              type="file"
              accept="image/*"
              onChange={addExampleImage}
              style={{ display: "none" }}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: exampleImages.length > 0 ? 10 : 0 }}>
              {exampleImages.map((url, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <img src={url} alt={`contoh ${i + 1}`} style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)" }} />
                  <button
                    type="button"
                    onClick={() => removeExampleImage(i)}
                    style={{
                      position: "absolute", top: -6, right: -6, width: 22, height: 22,
                      borderRadius: "50%", background: "var(--danger)", color: "white",
                      border: "none", fontSize: 12, padding: 0, boxShadow: "none",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="secondary"
              onClick={() => exampleFileRef.current?.click()}
              disabled={uploadingExample}
            >
              {uploadingExample ? "Mengunggah..." : "+ Tambah contoh screenshot"}
            </button>
          </div>
          <div className="field">
            <label>Tautan tugas (opsional)</label>
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
          </div>
          <div className="field">
            <label>Imbalan (Rp)</label>
            <input type="number" required value={reward} onChange={(e) => setReward(e.target.value)} />
          </div>
          <div className="field">
            <label>ID tugas (opsional, bebas format, contoh: TSK-01)</label>
            <input value={taskCode} onChange={(e) => setTaskCode(e.target.value)} />
          </div>
          <div className="field">
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={requiresScreenshot}
                onChange={(e) => setRequiresScreenshot(e.target.checked)}
                style={{ width: "auto" }}
              />
              Wajib lampirkan screenshot saat kirim
            </label>
          </div>
          <div className="field">
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={requiresVideo}
                onChange={(e) => setRequiresVideo(e.target.checked)}
                style={{ width: "auto" }}
              />
              Wajib lampirkan video saat kirim
            </label>
          </div>
          <div className="field">
            <label>Khusus untuk username tertentu (opsional)</label>
            <input
              value={targetUsername}
              onChange={(e) => setTargetUsername(e.target.value)}
              placeholder="Kosongkan = tampil untuk semua pengguna"
            />
          </div>
          <button>Simpan tugas</button>
        </form>
      </div>

      <div className="card">
        <h2>Semua tugas</h2>
        {tasks === null && <p className="muted">Memuat...</p>}
        {tasks && tasks.length === 0 && !error && <p className="muted">Belum ada tugas.</p>}
        {tasks && tasks.map((t) => (
          <div className="task-item" key={t.id}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div className="reward">{formatRupiah(t.reward)}</div>
              <span className={`badge ${t.is_active ? "approved" : "rejected"}`}>
                {t.is_active ? "Aktif" : "Nonaktif"}
              </span>
            </div>
            <div className="title">{t.title}</div>
            {t.task_code && <p className="muted" style={{ margin: "2px 0" }}>ID: {t.task_code}</p>}
            <p className="muted" style={{ margin: "2px 0" }}>Dibuat: {formatTanggal(t.created_at)}</p>
            {t.description && <p className="muted pre-wrap">{t.description}</p>}
            {t.notes && <p className="muted pre-wrap">Catatan: {t.notes}</p>}
            {t.example_images && t.example_images.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "6px 0" }}>
                {t.example_images.map((url, i) => (
                  <img key={i} src={url} alt={`contoh ${i + 1}`} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }} />
                ))}
              </div>
            )}
            {(t.requires_screenshot || t.requires_video) && (
              <p className="muted">
                Wajib lampiran: {[t.requires_screenshot && "Screenshot", t.requires_video && "Video"].filter(Boolean).join(" + ")}
              </p>
            )}
            <p className="muted">
              {t.target_username ? `Khusus: ${t.target_username}` : "Untuk semua pengguna"}
            </p>
            <div className="row">
              <button className="small secondary" onClick={() => toggleActive(t)}>
                {t.is_active ? "Nonaktifkan" : "Aktifkan"}
              </button>
              <button className="small danger" onClick={() => deleteTask(t)}>Hapus</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
