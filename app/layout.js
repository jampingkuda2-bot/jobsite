import "./globals.css";

export const metadata = {
  title: "Dashboard Saldo",
  description: "Kerjakan tugas, kumpulkan saldo, tarik ke DANA.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
