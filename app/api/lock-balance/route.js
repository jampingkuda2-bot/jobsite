import { query } from "@/lib/db";
import { getUserSession } from "@/lib/auth";

// Bonus FLAT sekali cair berdasarkan durasi
const TIERS = {
  30: { bonusPercent: 3, badge: "Perak" },
  90: { bonusPercent: 8, badge: "Emas" },
  365: { bonusPercent: 15, badge: "Platinum" },
};

export async function POST(req) {
  try {
    const session = await getUserSession(); // tambahkan await
    if (!session) return Response.json({ error: "Belum login" }, { status: 401 });

    const { amount, durationDays } = await req.json();
    const amt = Math.floor(Number(amount));
    const days = Number(durationDays);

    if (!amt || amt <= 0) {
      return Response.json({ error: "Jumlah tidak valid" }, { status: 400 });
    }
    const tier = TIERS[days];
    if (!tier) {
      return Response.json({ error: "Durasi tidak valid" }, { status: 400 });
    }

    // MULAI TRANSAKSI
    await query("BEGIN");
    try {
      // Lock baris user agar tidak terjadi perubahan bersamaan
      const userRes = await query(
        "SELECT token_balance FROM users WHERE id = $1 FOR UPDATE",
        [session.userId]
      );
      if (userRes.rows.length === 0) throw new Error("User tidak ditemukan");

      const tokenBalance = Number(userRes.rows[0].token_balance);
      if (amt > tokenBalance) {
        throw new Error("Saldo token tidak mencukupi");
      }

      // Kurangi token_balance (bukan saldo)
      await query(
        "UPDATE users SET token_balance = token_balance - $1 WHERE id = $2",
        [amt, session.userId]
      );

      const bonusAmount = Math.floor((amt * tier.bonusPercent) / 100);
      const unlocksAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      // Insert ke balance_locks (status default 'active')
      await query(
        `INSERT INTO balance_locks 
          (user_id, amount, duration_days, bonus_percent, bonus_amount, unlocks_at, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
        [session.userId, amt, days, tier.bonusPercent, bonusAmount, unlocksAt]
      );

      await query("COMMIT");
      return Response.json({ ok: true, bonusAmount, unlocksAt });
    } catch (err) {
      await query("ROLLBACK");
      throw err;
    }
  } catch (e) {
    console.error("Error di /api/lock-balance:", e);
    return Response.json(
      { error: e.message || "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
