import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata = {
  title: "Freelance Micro Task",
  description: "Kerjakan tugas, kumpulkan saldo, tarik ke DANA.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Freelance Micro Task",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0f1614",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
