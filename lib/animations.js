"use client";

// Anime.js di-load ASYNC (dynamic import), bukan di-import biasa di atas file.
// Alasannya: kalau di-import biasa, kodenya ikut masuk ke bundle JS awal
// SETIAP halaman yang import file ini — padahal animasi cuma perlu jalan
// belakangan, setelah halaman utamanya tampil. Dengan dynamic import,
// Next.js motong ini jadi file/chunk terpisah yang baru diambil pas
// benar-benar dipanggil, jadi halaman awal tetap ringan & cepat.
let animePromise = null;
function loadAnime() {
  if (!animePromise) {
    animePromise = import("animejs");
  }
  return animePromise;
}

// Angka naik pelan-pelan dari 0 ke nilai aslinya (buat saldo, dsb).
// el: elemen DOM (pakai ref), to: angka tujuan, formatter: fungsi format angka -> teks.
export async function countUp(el, { to, duration = 900, formatter } = {}) {
  if (!el || !Number.isFinite(to)) return;
  const { animate } = await loadAnime();
  const obj = { value: 0 };
  animate(obj, {
    value: to,
    duration,
    ease: "outExpo",
    onUpdate: () => {
      el.textContent = formatter ? formatter(obj.value) : Math.round(obj.value);
    },
  });
}

// Kartu/elemen muncul satu-satu (fade + geser dikit dari bawah), buat
// kesan halaman "hidup" pas pertama kali dimuat.
export async function staggerIn(selector, opts = {}) {
  const { animate, stagger } = await loadAnime();
  return animate(selector, {
    opacity: [0, 1],
    translateY: [14, 0],
    duration: 480,
    delay: stagger(60),
    ease: "outQuad",
    ...opts,
  });
}

// Efek "meletup" kecil, dipakai buat kasih feedback pas aksi berhasil
// (misal tombol check-in berhasil diklik).
export async function pulse(el) {
  if (!el) return;
  const { animate } = await loadAnime();
  return animate(el, {
    scale: [1, 1.08, 1],
    duration: 420,
    ease: "outElastic(1, .6)",
  });
}
