import { query } from "@/lib/db";

// Cloudinary bisa resize on-the-fly lewat URL, jadi 1 foto upload bisa dipakai
// buat semua ukuran icon yang PWA butuhkan.
function cloudinaryIconUrl(url, size) {
  if (!url) return null;
  return url.replace("/upload/", `/upload/w_${size},h_${size},c_fill/`);
}

export default async function manifest() {
  let iconUrl = null;
  try {
    const res = await query("select icon_url from app_settings where id = 1");
    iconUrl = res.rows[0]?.icon_url || null;
  } catch (e) {
    console.error("Gagal ambil icon aplikasi (pakai fallback):", e.message);
  }

  const icon192 = iconUrl ? cloudinaryIconUrl(iconUrl, 192) : "/icon-192.png";
  const icon512 = iconUrl ? cloudinaryIconUrl(iconUrl, 512) : "/icon-512.png";

  return {
    name: "Freelance Micro Task",
    short_name: "FMT",
    description: "Kerjakan tugas kecil, dapat saldo, tarik ke DANA",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0b0f0d",
    theme_color: "#0b0f0d",
    icons: [
      { src: icon192, sizes: "192x192", type: "image/png" },
      { src: icon512, sizes: "512x512", type: "image/png" },
    ],
  };
}
