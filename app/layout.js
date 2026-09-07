import "./globals.css";
import { query } from "@/lib/db";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import SkyBackground from "@/components/SkyBackground"; // perbaiki typo

function cloudinaryIconUrl(url, size) {
  if (!url) return null;
  return url.replace("/upload/", `/upload/w_${size},h_${size},c_fill/`);
}

export async function generateMetadata() {
  let iconUrl = "/icon-192.png";
  try {
    const res = await query("select icon_url from app_settings where id = 1");
    if (res.rows[0]?.icon_url) {
      iconUrl = cloudinaryIconUrl(res.rows[0].icon_url, 192);
    }
  } catch (e) {
    console.error("Gagal ambil icon aplikasi buat favicon (pakai fallback):", e.message);
  }

  return {
    title: "Freelance Micro Task",
    description: "Kerjakan tugas, kumpulkan saldo, tarik ke DANA.",
    manifest: "/manifest.webmanifest",
    icons: {
      icon: iconUrl,
      shortcut: iconUrl,
      apple: iconUrl,
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "Freelance Micro Task",
    },
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0f1614",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <SkyBackground />  {/* letakkan di paling awal biar jadi background */}
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
