import "./globals.css";

export const metadata = {
  title: "Dashboard Saldo",
  description: "Kerjakan tugas, kumpulkan saldo, tarik ke DANA.",
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
      <body>{children}</body>
    </html>
  );
}
