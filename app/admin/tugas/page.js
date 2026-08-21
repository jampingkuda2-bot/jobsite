"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "../AdminNav";

function formatRupiah(n) {
  return "Rp" + Number(n).toLocaleString("id-ID");
}

export default function AdminTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [reward, setReward] = useState(1500);
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

  async function createTask(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, link, reward: Number(reward) }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setError(d.error || `Gagal membuat tugas (error ${res.status})`);
      setTitle(""); setDescription(""); setLink(""); setReward(1500);
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
            <label>Tautan tugas (opsional)</label>
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
          </div>
          <div className="field">
            <label>Imbalan (Rp)</label>
            <input type="number" required value={reward} onChange={(e) => setReward(e.target.value)} />
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
            {t.description && <p className="muted">{t.description}</p>}
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
