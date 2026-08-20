"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "./AdminNav";

function formatRupiah(n) {
  return "Rp" + Number(n).toLocaleString("id-ID");
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState("");
  const [adjustFor, setAdjustFor] = useState(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    const res = await fetch("/api/admin/users?q=" + encodeURIComponent(q));
    if (res.status === 401) return router.push("/admin/login");
    const d = await res.json();
    setUsers(d.users);
  }

  useEffect(() => { load(); }, []);

  async function submitAdjust(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: adjustFor.id, amount: Number(amount), reason }),
    });
    const d = await res.json();
    if (!res.ok) return setError(d.error || "Gagal menyimpan");
    setNotice(`Saldo ${adjustFor.username} sekarang ${formatRupiah(d.saldo)}`);
    setAdjustFor(null);
    setAmount("");
    setReason("");
    load();
  }

  return (
    <div className="wrap-wide">
      <AdminNav />

      {error && <div className="error">{error}</div>}
      {notice && <div className="success">{notice}</div>}

      <div className="card">
        <h2>Cari pengguna</h2>
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="row">
          <input
            placeholder="Cari username atau email..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 12px", color: "var(--text)" }}
          />
          <button type="submit" style={{ width: 120 }}>Cari</button>
        </form>
      </div>

      {adjustFor && (
        <div className="card">
          <h2>Ubah saldo — {adjustFor.username}</h2>
          <p className="muted">Saldo saat ini: {formatRupiah(adjustFor.saldo)}</p>
          <form onSubmit={submitAdjust}>
            <div className="field">
              <label>Jumlah (isi minus untuk mengurangi, contoh: -5000)</label>
              <input type="number" required value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="field">
              <label>Catatan (opsional)</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="row">
              <button type="submit">Simpan</button>
              <button type="button" className="secondary" onClick={() => setAdjustFor(null)}>Batal</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2>Daftar pengguna</h2>
        {!users && <p className="muted">Memuat...</p>}
        {users && users.length === 0 && <p className="muted">Tidak ada pengguna.</p>}
        {users && users.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Saldo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.username || <span className="muted">(belum lengkap)</span>}</td>
                  <td>{u.email}</td>
                  <td>{formatRupiah(u.saldo)}</td>
                  <td>
                    <button className="small secondary" onClick={() => setAdjustFor(u)}>
                      Ubah saldo
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
