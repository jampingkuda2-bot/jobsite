"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function formatRupiah(n) {
  return "Rp" + Number(n).toLocaleString("id-ID");
}

const TIERS = [
  { days: 30, percent: 3, badge: "Perak" },
  { days: 90, percent: 8, badge: "Emas" },
  { days: 365, percent: 15, badge: "Platinum" },
];

export default function KunciSaldoPage() {
  const router = useRouter();
  const [saldo, setSaldo] = useState(null);
  const [amount, setAmount] = useState("");
  const [days, setDays] = useState(30);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    fetch("/api/me")
      .then(async (res) => {
        if (res.status === 401) return router.push("/login");
        const d = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(d.error || `Gagal memuat saldo (error ${res.status})`);
          return;
        }
        setSaldo(d.user.saldo);
      })
      .catch(() => setError("Tidak bisa terhubung ke server."));
  }, []);

  const tier = TIERS.find((t) => t.days === days);
  const amt = Number(amount) || 0;
  const estimatedBonus = Math.floor((amt * tier.percent) / 100);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/lock-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, durationDays: days }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || `Gagal mengunci saldo (error ${res.status})`);
        return;
      }
      setDone({ bonusAmount: d.bonusAmount, unlocksAt: d.unlocksAt });
    } catch (e) {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wrap">
      <div className="top-bar">
        <h1>Kunci Saldo</h1>
        <a href="/dashboard" className="link-btn">Kembali</a>
      </div>

      {saldo !== null && (
        <p className="muted" style={{ marginBottom: 16 }}>
          Saldo tersedia: <b style={{ color: "var(--accent)" }}>{formatRupiah(saldo)}</b>
        </p>
      )}

      {error && <div className="error">{error}</div>}

      {done ? (
        <div className="card">
          <div className="success" style={{ marginBottom: 16 }}>
            Saldo berhasil dikunci. Selesai pada {new Date(done.unlocksAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })},
            saldo + bonus {formatRupiah(done.bonusAmount)} otomatis masuk ke saldo Anda.
          </div>
          <a href="/dashboard" className="btn">Kembali ke dashboard</a>
        </div>
      ) : (
        <form onSubmit={submit} className="card">
          <div className="field">
            <label>Jumlah yang dikunci (Rp)</label>
            <input
              type="number"
              min={1}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Contoh: 50000"
            />
          </div>

          <div className="field">
            <label>Pilih durasi</label>
            <div className="row">
              {TIERS.map((t) => (
                <button
                  key={t.days}
                  type="button"
                  className={days === t.days ? "" : "secondary"}
                  onClick={() => setDays(t.days)}
                  style={{ flexDirection: "column", padding: "12px 8px" }}
                >
                  <div style={{ fontWeight: 700 }}>{t.days} hari</div>
                  <div style={{ fontSize: "0.78rem" }}>+{t.percent}% · {t.badge}</div>
                </button>
              ))}
            </div>
          </div>

          {amt > 0 && (
            <div className="card" style={{ background: "var(--panel-2)", marginBottom: 16 }}>
              <p className="muted" style={{ marginBottom: 4 }}>Ringkasan</p>
              <p style={{ margin: "2px 0" }}>Dikunci: <b>{formatRupiah(amt)}</b></p>
              <p style={{ margin: "2px 0" }}>Bonus penyelesaian ({tier.percent}%): <b style={{ color: "var(--accent)" }}>{formatRupiah(estimatedBonus)}</b></p>
              <p style={{ margin: "2px 0" }}>Total cair nanti: <b>{formatRupiah(amt + estimatedBonus)}</b></p>
              <p className="muted" style={{ marginTop: 6 }}>Cair otomatis setelah {days} hari. Selama terkunci, saldo ini tidak bisa ditarik.</p>
            </div>
          )}

          <button disabled={loading}>
            {loading ? "Memproses..." : "Kunci saldo sekarang"}
          </button>
        </form>
      )}
    </div>
  );
}
