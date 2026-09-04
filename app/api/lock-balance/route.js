import { query } from "@/lib/db";
import { getUserSession } from "@/lib/auth";

const TIERS = {
  30: { bonusPercent: 3, badge: "Perak" },
  90: { bonusPercent: 8, badge: "Emas" },
  365: { bonusPercent: 15, badge: "Platinum" },
};

export async function POST(req) {
  try {
    const session = await getUserSession();
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

    await query("BEGIN");
    try {
      const userRes = await query(
        "SELECT saldo FROM users WHERE id = $1 FOR UPDATE",
        [session.userId]
      );
      if (userRes.rows.length === 0) throw new Error("User tidak ditemukan");

      const totalSaldo = Number(userRes.rows[0].saldo);
      if (amt > totalSaldo) {
        throw new Error("Saldo tidak mencukupi");
      }

      await query(
        "UPDATE users SET saldo = saldo - $1 WHERE id = $2",
        [amt, session.userId]
      );

      const bonusAmount = Math.floor((amt * tier.bonusPercent) / 100);
      const unlocksAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

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
