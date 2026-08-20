"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const d = await res.json();
    setLoading(false);
    if (!res.ok) return setError(d.error || "Gagal masuk");
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="wrap">
      <h1>Admin</h1>
      <p className="muted" style={{ marginBottom: 20 }}>Masuk ke panel admin.</p>
      {error && <div className="error">{error}</div>}
      <form onSubmit={submit} className="card">
        <div className="field">
          <label>Password admin</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button disabled={loading}>{loading ? "Memproses..." : "Masuk"}</button>
      </form>
    </div>
  );
}
