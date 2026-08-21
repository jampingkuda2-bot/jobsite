"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

function formatJam(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

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

  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || `Gagal mengirim (error ${res.status})`);
        return;
      }
      setText("");
      load(true);
    } catch (e) {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="wrap" style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <div className="top-bar">
        <h1>Chat Admin</h1>
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
            <div style={{ fontSize: "0.95rem" }}>{m.message}</div>
            <div style={{ fontSize: "0.7rem", opacity: 0.7, marginTop: 4 }}>
              {m.sender === "admin" ? "Admin · " : ""}{formatJam(m.created_at)}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} style={{ display: "flex", gap: 8, position: "sticky", bottom: "calc(16px + var(--safe-bottom))" }}>
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
