"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Gagal masuk");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="wrap">
      <h1>Masuk</h1>
      <p className="muted" style={{ marginBottom: 20 }}>Masuk ke akun Anda.</p>

      {error && <div className="error">{error}</div>}

      <form onSubmit={submit} className="card">
        <div className="field">
          <label>Username</label>
          <input required value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button disabled={loading}>{loading ? "Memproses..." : "Masuk"}</button>
      </form>

      <p className="muted" style={{ textAlign: "center" }}>
        Belum punya akun? <a href="/register">Daftar</a>
      </p>
    </div>
  );
}
