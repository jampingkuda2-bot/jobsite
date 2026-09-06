"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EnableNotificationsButton from "@/components/EnableNotificationsButton";
import InstallPwaButton from "@/components/InstallPwaButton";

function formatRupiah(n) {
  return "Rp" + Number(n).toLocaleString("id-ID");
}

function Avatar({ url, name, size = 32 }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name || "avatar"}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          border: "1px solid var(--border)",
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--panel-2)",
        border: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.45,
        fontWeight: 700,
        color: "var(--muted)",
      }}
    >
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

function MenuIcon({ href, emoji, label }) {
  return (
    <a
      href={href}
      style={{
        textDecoration: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        flex: 1,
        padding: "12px 4px",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: "var(--panel-2)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.3rem",
        }}
      >
        {emoji}
      </div>
      <span style={{ fontSize: "0.75rem", color: "var(--text)", textAlign: "center" }}>{label}</span>
    </a>
  );
}

const ACTIVITY_TABS = [
  { key: "peringkat", label: "Peringkat" },
  { key: "tugas", label: "Riwayat Tugas" },
  { key: "terkunci", label: "Terkunci" },
  { key: "tarik", label: "Tarik" },
  { key: "deposit", label: "Deposit" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [announcement, setAnnouncement] = useState(null);
  const [checkinBusy, setCheckinBusy] = useState(false);
  const [leaderboard, setLeaderboard] = useState(null);
  const [activityTab, setActivityTab] = useState("peringkat");
  const [showAllTasks, setShowAllTasks] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/me");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setData({ error: d.error || `Gagal memuat data (error ${res.status})` });
        return;
      }
      setData(d);
    } catch (e) {
      setData({ error: "Tidak bisa terhubung ke server." });
    }
  }

  useEffect(() => {
    load();
    fetch("/api/announcement")
      .then((res) => res.json())
      .then((d) => setAnnouncement(d.message))
      .catch(() => {});
    fetch("/api/leaderboard")
      .then((res) => res.json())
      .then((d) => setLeaderboard(d.leaderboard || []))
      .catch(() => setLeaderboard([]));
  }, []);

  async function doCheckin() {
    setCheckinBusy(true);
    setError("");
    try {
      const res = await fetch("/api/checkin", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "Gagal check-in");
        return;
      }
      load();
    } catch (e) {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setCheckinBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  }

  function copyReferralLink() {
    const link = `${window.location.origin}/register?ref=${data.user.username}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!data) return <div className="wrap"><p className="muted">Memuat...</p></div>;
  if (data.error) return (
    <div className="wrap">
      <div className="error">{data.error}</div>
      <button onClick={load}>Coba lagi</button>
    </div>
  );

  return (
    <div className="wrap">
      {announcement && (
        <div className="announcement-bar">
          <span className="marquee-track">📢 &nbsp;{announcement}&nbsp;&nbsp;&nbsp;&nbsp;📢 &nbsp;{announcement}</span>
        </div>
      )}

      <div className="top-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/dashboard/profile" style={{ display: "block" }}>
            <Avatar url={data.user.photo_url} name={data.user.username} size={44} />
          </a>
          <div>
            <h1>Halo, {data.user.username}</h1>
            <span className="muted">{data.user.email}</span>
          </div>
        </div>
        <button className="link-btn" onClick={logout}>Keluar</button>
      </div>

      <div className="card" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <EnableNotificationsButton />
        <InstallPwaButton />
      </div>

      <div className="card">
        <h2>Check-in Harian</h2>
        <p className="muted" style={{ marginBottom: 12 }}>
          Klik sekali sehari, dapat <b style={{ color: "var(--accent)" }}>Rp200</b> gratis.
        </p>
        <button onClick={doCheckin} disabled={checkinBusy || data.checkedInToday}>
          {data.checkedInToday ? "Sudah check-in hari ini" : checkinBusy ? "Memproses..." : "Check-in sekarang"}
        </button>
        {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}
      </div>

      {/* === CARD SALDO GABUNGAN (TANPA TOMBOL TOP-UP) === */}
      <div className="balance-card">
        <div>
          <div className="balance-label">Total Saldo</div>
          <div className="balance-value">{formatRupiah(data.user.saldo ?? 0)}</div>
        </div>
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 4 }}>
          <div className="balance-label">Terkunci</div>
          <div className="balance-value" style={{ color: "var(--muted)" }}>
            {formatRupiah(data.user.total_locked ?? 0)}
          </div>
        </div>
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 4 }}>
          <div className="balance-label">Tersedia (bisa ditarik & dikunci)</div>
          <div className="balance-value" style={{ color: "var(--accent)" }}>
            {formatRupiah(data.user.available_balance ?? 0)}
          </div>
        </div>
        <a href="/dashboard/tarik" className="btn" style={{ marginTop: 16, display: "block" }}>
          Tarik saldo ke DANA
        </a>
      </div>

      {/* === MENU CEPAT: baris ikon polos, tanpa bungkus card, biar nggak numpuk kotak === */}
      <div style={{ display: "flex", margin: "4px 0 20px" }}>
        <MenuIcon href="/dashboard/deposit" emoji="💰" label="Deposit" />
        <MenuIcon href="/dashboard/kunci-saldo" emoji="🔒" label="Kunci Saldo" />
        <MenuIcon href="/dashboard/chat" emoji="💬" label="Chat Admin" />
      </div>

      <div className="card">
        <h2>Tugas tersedia</h2>
        {data.tasks.length === 0 && (
          <p className="muted">Belum ada tugas tersedia saat ini. Cek lagi nanti.</p>
        )}
        {(showAllTasks ? data.tasks : data.tasks.slice(0, 3)).map((t) => (
          <a href={`/dashboard/tugas?id=${t.id}`} className="task-item" key={t.id} style={{ display: "block", textDecoration: "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="reward">{formatRupiah(t.reward)}</div>
              <span style={{ color: "var(--muted)" }}>›</span>
            </div>
            <div className="title">{t.title}</div>
            {(t.requires_screenshot || t.requires_video) && (
              <p className="muted" style={{ margin: "2px 0" }}>
                Wajib lampirkan: {[t.requires_screenshot && "screenshot", t.requires_video && "video"].filter(Boolean).join(" & ")}
              </p>
            )}
          </a>
        ))}
        {data.tasks.length > 3 && (
          <button
            type="button"
            className="secondary"
            style={{ marginTop: 8 }}
            onClick={() => setShowAllTasks((v) => !v)}
          >
            {showAllTasks ? "Tampilkan lebih sedikit" : `Lihat semua (${data.tasks.length})`}
          </button>
        )}
      </div>

      <div className="card">
        <h2>Ajak teman</h2>
        <p className="muted" style={{ marginBottom: 12 }}>
          Dapat <b style={{ color: "var(--accent)" }}>Rp800</b> setiap teman yang Anda ajak berhasil menyelesaikan tugas pertamanya.
        </p>
        <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
          <div>
            <div className="balance-label" style={{ fontSize: "0.7rem" }}>Diajak</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700 }}>{data.referral?.count ?? 0}</div>
          </div>
          <div>
            <div className="balance-label" style={{ fontSize: "0.7rem" }}>Bonus didapat</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--accent)" }}>
              {formatRupiah(data.referral?.earned ?? 0)}
            </div>
          </div>
        </div>
        <button className="secondary" onClick={copyReferralLink}>
          {copied ? "Tersalin!" : "Salin link ajakan"}
        </button>
      </div>

      {/* === AKTIVITAS: Peringkat + semua riwayat digabung 1 panel bertab, ala buku tabungan === */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", overflowX: "auto" }}>
          {ACTIVITY_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActivityTab(t.key)}
              style={{
                flex: 1,
                minWidth: 88,
                padding: "12px 0",
                background: "transparent",
                border: "none",
                borderBottom: activityTab === t.key ? "2px solid var(--accent)" : "2px solid transparent",
                color: activityTab === t.key ? "var(--accent)" : "var(--muted)",
                fontWeight: 700,
                fontSize: "0.82rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 20 }}>
          {activityTab === "peringkat" && (
            <>
              {leaderboard === null && <p className="muted">Memuat...</p>}
              {leaderboard && leaderboard.length === 0 && <p className="muted">Belum ada data bulan ini.</p>}
              {leaderboard && leaderboard.map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="muted">#{i + 1}</span>
                    <Avatar url={r.photo_url} name={r.username} size={28} />
                    {r.username}
                  </div>
                  <b style={{ color: "var(--accent)" }}>{formatRupiah(r.total)}</b>
                </div>
              ))}
            </>
          )}

          {activityTab === "tugas" && (
            <>
              {data.submissions.length === 0 && <p className="muted">Belum ada riwayat.</p>}
              {data.submissions.map((s) => (
                <div key={s.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <div>{s.title}</div>
                      <span className="muted">{formatRupiah(s.reward)}</span>
                    </div>
                    <span className={`badge ${s.status}`}>
                      {s.status === "pending" ? "Menunggu" : s.status === "approved" ? "Disetujui" : "Ditolak"}
                    </span>
                  </div>
                  {s.status === "rejected" && s.rejection_reason && (
                    <p className="muted" style={{ marginTop: 4 }}>Alasan: {s.rejection_reason}</p>
                  )}
                </div>
              ))}
            </>
          )}

          {activityTab === "terkunci" && (
            <>
              {(!data.locks || data.locks.length === 0) && <p className="muted">Belum ada saldo yang dikunci.</p>}
              {data.locks && data.locks.map((l) => {
                const badge = l.duration_days === 30 ? "Perak" : l.duration_days === 90 ? "Emas" : "Platinum";
                return (
                  <div key={l.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                    <div>
                      <div>{formatRupiah(l.amount)} · {l.duration_days} hari</div>
                      <span className="muted">Badge: {badge} · Bonus {formatRupiah(l.bonus_amount)}</span>
                    </div>
                    <span className={`badge ${l.status === "completed" ? "done" : "pending"}`}>
                      {l.status === "completed" ? "Sudah cair" : "Terkunci"}
                    </span>
                  </div>
                );
              })}
            </>
          )}

          {activityTab === "tarik" && (
            <>
              {data.withdrawals.length === 0 && <p className="muted">Belum ada riwayat.</p>}
              {data.withdrawals.map((w) => (
                <div key={w.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <div>{formatRupiah(w.amount)}</div>
                    <span className="muted">{w.ref_code ? `${w.ref_code} · ` : ""}ke {w.dana_number}</span>
                  </div>
                  <span className={`badge ${w.status === "done" ? "done" : w.status === "rejected" ? "rejected" : "pending"}`}>
                    {w.status === "done" ? "Selesai" : w.status === "rejected" ? "Ditolak" : "Diproses"}
                  </span>
                </div>
              ))}
            </>
          )}

          {activityTab === "deposit" && (
            <>
              {(!data.deposits || data.deposits.length === 0) && <p className="muted">Belum ada riwayat deposit.</p>}
              {data.deposits && data.deposits.map((d) => (
                <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <div>{formatRupiah(d.amount)}</div>
                    <span className="muted">{d.payment_method} · {new Date(d.requested_at).toLocaleDateString("id-ID")}</span>
                  </div>
                  <span className={`badge ${d.status}`}>
                    {d.status === "pending" ? "Menunggu" : d.status === "approved" ? "Disetujui" : "Ditolak"}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
