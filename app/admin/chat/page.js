"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "../AdminNav";
import { uploadChatFile } from "@/lib/uploadChatFile";

function formatWaktu(iso) {
  const d = new Date(iso);
  return d.toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
function formatJam(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

const ONLINE_THRESHOLD_MS = 20 * 1000; // dianggap online kalau aktif 20 detik terakhir

function presenceLabel(lastActiveAt) {
  if (!lastActiveAt) return { text: "Belum pernah online", online: false };
  const diffMs = Date.now() - new Date(lastActiveAt).getTime();
  if (diffMs < ONLINE_THRESHOLD_MS) return { text: "Online", online: true };

  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return { text: "Baru saja online", online: false };
  if (mins < 60) return { text: `Terakhir online ${mins} menit lalu`, online: false };
  const hours = Math.floor(mins / 60);
  if (hours < 24) return { text: `Terakhir online ${hours} jam lalu`, online: false };
  const days = Math.floor(hours / 24);
  return { text: `Terakhir online ${days} hari lalu`, online: false };
}

function Attachment({ url, type }) {
  if (type === "image") {
    return <img src={url} alt="lampiran" style={{ maxWidth: "100%", borderRadius: 10, display: "block", marginTop: 6 }} />;
  }
  if (type === "video") {
    return <video src={url} controls style={{ maxWidth: "100%", borderRadius: 10, display: "block", marginTop: 6 }} />;
  }
  return null;
}

export default function AdminChatPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState(null);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  async function loadAiSettings() {
    try {
      const res = await fetch("/api/admin/ai-chat-settings");
      const d = await res.json().catch(() => ({}));
      if (res.ok) setAiEnabled(d.enabled || false);
    } catch (e) {
      // diamkan, bukan bagian kritis
    }
  }

  async function toggleAi(checked) {
    setAiEnabled(checked);
    setAiSaving(true);
    try {
      await fetch("/api/admin/ai-chat-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: checked }),
      });
    } catch (e) {
      setError("Gagal menyimpan pengaturan AI.");
    } finally {
      setAiSaving(false);
    }
  }

  async function loadConversations() {
    try {
      const res = await fetch("/api/admin/chat");
      if (res.status === 401) return router.push("/admin/login");
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || `Gagal memuat data (error ${res.status})`);
        return;
      }
      setConversations(d.conversations);
    } catch (e) {
      setError("Tidak bisa terhubung ke server.");
    }
  }

  async function loadThread(userId, silent) {
    try {
      const res = await fetch(`/api/admin/chat/thread?userId=${userId}`);
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (!silent) setError(d.error || `Gagal memuat pesan (error ${res.status})`);
        return;
      }
      setMessages(d.messages);
      if (d.user) {
        setSelected((prev) => (prev ? { ...prev, last_active_at: d.user.last_active_at } : prev));
      }
    } catch (e) {
      if (!silent) setError("Tidak bisa terhubung ke server.");
    }
  }

  useEffect(() => {
    loadConversations();
    loadAiSettings();
    const interval = setInterval(loadConversations, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selected) return;
    setMessages(null);
    loadThread(selected.user_id, false);
    const interval = setInterval(() => loadThread(selected.user_id, true), 5000);
    return () => clearInterval(interval);
  }, [selected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendPayload(payload) {
    if (!selected) return;
    setError("");
    try {
      const res = await fetch("/api/admin/chat/thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selected.user_id, ...payload }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || `Gagal mengirim (error ${res.status})`);
        return;
      }
      loadThread(selected.user_id, true);
      loadConversations();
    } catch (e) {
      setError("Tidak bisa terhubung ke server.");
    }
  }

  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    await sendPayload({ message: text });
    setText("");
    setSending(false);
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { url, type } = await uploadChatFile(file);
      await sendPayload({ message: "", attachmentUrl: url, attachmentType: type });
    } catch (err) {
      setError(err.message || "Gagal mengunggah file");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="wrap-wide">
      <AdminNav />
      {error && <div className="error">{error}</div>}

      {!selected ? (
        <div className="card">
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 16 }}>
            <input
              type="checkbox"
              checked={aiEnabled}
              onChange={(e) => toggleAi(e.target.checked)}
              disabled={aiSaving}
              style={{ width: "auto" }}
            />
            Aktifkan balasan otomatis AI
          </label>

          <h2>Percakapan</h2>
          {conversations === null && <p className="muted">Memuat...</p>}
          {conversations && conversations.length === 0 && (
            <p className="muted">Belum ada percakapan dari pengguna.</p>
          )}
          {conversations && conversations.map((c) => {
            const presence = presenceLabel(c.last_active_at);
            return (
            <div
              key={c.user_id}
              className="task-item"
              onClick={() => setSelected(c)}
              style={{ cursor: "pointer" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="title">
                  {presence.online && <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", marginRight: 6 }} />}
                  {c.username}
                </div>
                {c.unread_count > 0 && (
                  <span className="badge pending">{c.unread_count} baru</span>
                )}
              </div>
              <p className="muted" style={{ margin: "4px 0" }}>
                {c.last_sender === "admin" ? "Anda: " : c.last_sender === "ai" ? "🤖 AI: " : ""}{c.last_message || "(lampiran)"}
              </p>
              <p className="muted" style={{ fontSize: "0.75rem" }}>
                {formatWaktu(c.last_at)} · <span style={{ color: presence.online ? "var(--accent)" : undefined }}>{presence.text}</span>
              </p>
            </div>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ display: "flex", flexDirection: "column", minHeight: "60vh" }}>
          <div className="top-bar" style={{ marginBottom: 12 }}>
            <div>
              <h2 style={{ marginBottom: 2 }}>{selected.username}</h2>
              <span className="muted" style={{ color: presenceLabel(selected.last_active_at).online ? "var(--accent)" : undefined }}>
                {presenceLabel(selected.last_active_at).text}
              </span>
            </div>
            <button className="link-btn" onClick={() => setSelected(null)}>‹ Semua chat</button>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {messages === null && <p className="muted">Memuat...</p>}
            {messages && messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: (m.sender === "admin" || m.sender === "ai") ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                  background: m.sender === "admin" ? "var(--accent)" : m.sender === "ai" ? "var(--accent-dark)" : "var(--panel-2)",
                  color: (m.sender === "admin" || m.sender === "ai") ? "#06140f" : "var(--text)",
                  border: (m.sender === "admin" || m.sender === "ai") ? "none" : "1px solid var(--border)",
                  borderRadius: 16,
                  padding: "10px 14px",
                  overflowWrap: "anywhere",
                }}
              >
                {m.message && <div style={{ fontSize: "0.95rem" }}>{m.message}</div>}
                {m.attachment_url && <Attachment url={m.attachment_url} type={m.attachment_type} />}
                <div style={{ fontSize: "0.7rem", opacity: 0.7, marginTop: 4 }}>
                  {m.sender === "ai" ? "🤖 AI · " : ""}{formatJam(m.created_at)}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={send} style={{ display: "flex", gap: 8 }}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFile}
              style={{ display: "none" }}
            />
            <button
              type="button"
              className="secondary"
              style={{ width: "auto", padding: "13px 16px" }}
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "..." : "📎"}
            </button>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Balas pesan..."
              style={{
                flex: 1,
                background: "var(--panel-2)",
                border: "1px solid var(--border)",
                borderRadius: 980,
                padding: "13px 16px",
                color: "var(--text)",
                fontSize: "1rem",
              }}
            />
            <button type="submit" disabled={sending} style={{ width: "auto", padding: "13px 20px" }}>
              Kirim
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
