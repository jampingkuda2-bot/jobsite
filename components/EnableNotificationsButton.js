"use client";

import { useEffect, useState } from "react";
import { registerPushNotifications, getNotificationPermission } from "@/lib/registerPush";

export default function EnableNotificationsButton() {
  const [status, setStatus] = useState("default"); // "default" | "granted" | "denied" | "unsupported"
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setStatus(getNotificationPermission());
  }, []);

  async function handleClick() {
    setBusy(true);
    setError("");
    try {
      await registerPushNotifications();
      setStatus("granted");
    } catch (e) {
      setError(e.message || "Gagal mengaktifkan notifikasi");
      setStatus(getNotificationPermission());
    } finally {
      setBusy(false);
    }
  }

  if (status === "unsupported") return null;
  if (status === "granted") {
    return <p className="muted" style={{ fontSize: "0.85rem" }}>🔔 Notifikasi aktif</p>;
  }

  return (
    <div>
      <button
        type="button"
        className="secondary"
        onClick={handleClick}
        disabled={busy || status === "denied"}
      >
        {busy ? "Mengaktifkan..." : status === "denied" ? "Notifikasi diblokir" : "🔔 Aktifkan notifikasi"}
      </button>
      {status === "denied" && (
        <p className="muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
          Izin notifikasi diblokir di browser. Aktifkan lewat pengaturan situs di browser kamu.
        </p>
      )}
      {error && <p className="error" style={{ marginTop: 4 }}>{error}</p>}
    </div>
  );
}
