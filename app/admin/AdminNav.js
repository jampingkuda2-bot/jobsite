"use client";

import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/admin", label: "Pengguna & Saldo" },
  { href: "/admin/tugas", label: "Tugas" },
  { href: "/admin/pending", label: "Persetujuan Tugas" },
  { href: "/admin/penarikan", label: "Penarikan" },
  { href: "/admin/deposit", label: "Deposit" },
  { href: "/admin/chat", label: "Chat" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div className="top-bar" style={{ flexDirection: "column", alignItems: "stretch", gap: 12 }}>
      <div className="top-bar">
        <h1>Panel Admin</h1>
        <button className="link-btn" onClick={logout}>Keluar</button>
      </div>
      <nav className="admin-nav">
        {links.map((l) => (
          <a key={l.href} href={l.href} className={pathname === l.href ? "active" : ""}>
            {l.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
