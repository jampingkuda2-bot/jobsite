// Modul ini sengaja dieksekusi sekali di level module (bukan di dalam useEffect komponen),
// supaya listener terpasang sedini mungkin — begitu layout ke-mount, bukan nunggu
// komponen tombol install-nya sendiri mount. Ini nyelesain masalah event
// "beforeinstallprompt" yang cuma nembak SEKALI dan sering kelewat kalau listener-nya
// baru dipasang belakangan.

let deferredPrompt = null;
let installed = false;
let unsupportedPlatform = false;
const listeners = new Set();

function notify() {
  listeners.forEach((cb) => cb());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    notify();
  });

  window.addEventListener("appinstalled", () => {
    installed = true;
    deferredPrompt = null;
    notify();
  });

  if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) {
    installed = true;
  }

  // iOS Safari (dan beberapa browser lain) tidak pernah menembak "beforeinstallprompt"
  // sama sekali, jadi kita deteksi manual biar tombolnya tetap kelihatan dengan
  // instruksi yang sesuai, bukan menghilang begitu saja.
  const ua = window.navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
  unsupportedPlatform = isIos && isSafari;
}

export function getInstallState() {
  return { deferredPrompt, installed, unsupportedPlatform };
}

export function subscribeInstallState(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export async function triggerInstall() {
  if (!deferredPrompt) return null;
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  notify();
  return choice;
}
