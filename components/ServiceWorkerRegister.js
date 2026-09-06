"use client";

import { useEffect } from "react";
import "@/lib/pwaInstall"; // sekadar diimpor supaya listener beforeinstallprompt aktif sejak awal

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("Gagal mendaftarkan service worker:", err);
      });
    }
  }, []);

  return null;
}
