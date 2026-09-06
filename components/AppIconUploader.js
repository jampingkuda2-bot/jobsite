"use client";

import { useEffect, useRef, useState } from "react";
import { uploadProfilePhoto } from "@/lib/uploadProfilePhoto";

export default function AppIconUploader() {
  const [iconUrl, setIconUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const fileRef = useRef(null);

  async function load() {
    try {
      const res = await fetch("/api/admin/app-icon");
      const d = await res.json().catch(() => ({}));
      if (res.ok) setIconUrl(d.icon_url);
    } catch (e) {
      // diamkan, bukan bagian kritis
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    setNotice("");
    try {
      const url = await uploadProfilePhoto(file);
      const res = await fetch("/api/admin/app-icon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iconUrl: url }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "Gagal menyimpan icon");
        return;
      }
      setIconUrl(url);
      setNotice("Icon aplikasi diperbarui. Perubahan kelihatan pas user install/update PWA-nya.");
    } catch (err) {
      setError(err.message || "Gagal mengunggah icon");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="card">
      <h2>Icon Aplikasi (PWA)</h2>
      <p className="muted" style={{ marginBottom: 12 }}>
        Icon yang muncul pas user install web ini sebagai aplikasi di HP.
      </p>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        {iconUrl ? (
          <img
            src={iconUrl}
            alt="Icon aplikasi"
            style={{ width: 64, height: 64, borderRadius: 14, objectFit: "cover", border: "1px solid var(--border)" }}
          />
        ) : (
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              background: "var(--panel-2)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--muted)",
              fontSize: "0.7rem",
              textAlign: "center",
            }}
          >
            Default
          </div>
        )}
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleChange}
            style={{ display: "none" }}
          />
          <button
            type="button"
            className="secondary"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Mengunggah..." : "Ganti icon"}
          </button>
        </div>
      </div>
      {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}
      {notice && <div className="success" style={{ marginTop: 12 }}>{notice}</div>}
    </div>
  );
}
