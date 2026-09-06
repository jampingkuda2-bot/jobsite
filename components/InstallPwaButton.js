"use client";

import { useEffect, useState } from "react";
import { getInstallState, subscribeInstallState, triggerInstall } from "@/lib/pwaInstall";

export default function InstallPwaButton() {
  const [state, setState] = useState({ deferredPrompt: null, installed: false, unsupportedPlatform: false });
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    setState(getInstallState());
    const unsubscribe = subscribeInstallState(() => setState(getInstallState()));
    return unsubscribe;
  }, []);

  async function handleInstall() {
    if (state.unsupportedPlatform) {
      setShowIosHelp(true);
      return;
    }
    await triggerInstall();
  }

  if (state.installed) return null;
  // Kalau browser-nya nggak dukung beforeinstallprompt sama sekali (bukan iOS Safari
  // dan bukan Chrome-based), diamkan saja daripada kasih instruksi yang salah.
  if (!state.deferredPrompt && !state.unsupportedPlatform) return null;

  return (
    <div>
      <button type="button" className="secondary" onClick={handleInstall}>
        📲 Install aplikasi
      </button>
      {showIosHelp && (
        <p className="muted" style={{ fontSize: "0.8rem", marginTop: 6, maxWidth: 260 }}>
          Di Safari: tap ikon <b>Bagikan</b> (kotak dengan panah ke atas), lalu pilih{" "}
          <b>"Tambah ke Layar Utama"</b>.
        </p>
      )}
    </div>
  );
}
