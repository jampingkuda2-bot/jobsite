"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadChatFile } from "@/lib/uploadChatFile";

function formatJam(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

const ONLINE_THRESHOLD_MS = 20 * 1000;

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

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState(null);
  const [adminLastActiveAt, setAdminLastActiveAt] = useState(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  async function load(silent) {
    try {
      const res = await fetch("/api/chat");
      if (res.status === 401) return router.push("/login");
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (!silent) setError(d.error || `Gagal memuat pesan (error ${res.status})`);
        return;
      }
      setMessages(d.messages);
      setAdminLastActiveAt(d.adminLastActiveAt);
    } catch (e) {
      if (!silent) setError("Tidak bisa terhubung ke server.");
    }
  }

  useEffect(() => {
    load(false);
    const interval = setInterval(() => load(true), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendPayload(payload) {
    setError("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || `Gagal mengirim (error ${res.status})`);
        return;
      }
      load(true);
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
    <div className="wrap" style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <div className="top-bar">
        <div>
          <h1>Chat Admin</h1>
          <span className="muted" style={{ color: presenceLabel(adminLastActiveAt).online ? "var(--accent)" : undefined }}>
            {presenceLabel(adminLastActiveAt).text}
          </span>
        </div>
        <a href="/dashboard" className="link-btn">Kembali</a>
      </div>

      {error && <div className="error">{error}</div>}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {messages === null && <p className="muted">Memuat...</p>}
        {messages && messages.length === 0 && (
          <p className="muted">Belum ada percakapan. Tanya soal ketersediaan tugas di bawah ini.</p>
        )}
        {messages && messages.map((m) => (
          <div
            key={m.id}
            style={{
              alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
              maxWidth: "80%",
              background: m.sender === "user" ? "var(--accent)" : "var(--panel-2)",
              color: m.sender === "user" ? "#06140f" : "var(--text)",
              border: m.sender === "user" ? "none" : "1px solid var(--border)",
              borderRadius: 16,
              padding: "10px 14px",
              overflowWrap: "anywhere",
            }}
          >
            {m.message && <div style={{ fontSize: "0.95rem" }}>{m.message}</div>}
            {m.attachment_url && <Attachment url={m.attachment_url} type={m.attachment_type} />}
            <div style={{ fontSize: "0.7rem", opacity: 0.7, marginTop: 4 }}>
              {m.sender === "admin" ? "Admin · " : ""}{formatJam(m.created_at)}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} style={{ display: "flex", gap: 8, position: "sticky", bottom: "calc(16px + var(--safe-bottom))" }}>
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
          placeholder="Tulis pesan..."
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
  );
}
