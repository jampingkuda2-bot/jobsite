import { query } from "@/lib/db";
import { getUserSession } from "@/lib/auth";

// Bonus FLAT sekali cair berdasarkan lama kunci (bukan bunga berkala/tahunan)
const TIERS = {
  30: { bonusPercent: 3, badge: "Perak" },
  90: { bonusPercent: 8, badge: "Emas" },
  365: { bonusPercent: 15, badge: "Platinum" },
};

export async function POST(req) {
  try {
    const session = getUserSession();
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

    const userRes = await query("select saldo from users where id = $1", [session.userId]);
    const saldo = Number(userRes.rows[0].saldo);
    if (amt > saldo) {
      return Response.json({ error: "Saldo tidak mencukupi" }, { status: 400 });
    }

    const bonusAmount = Math.floor((amt * tier.bonusPercent) / 100);
    const unlocksAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await query("update users set saldo = saldo - $1 where id = $2", [amt, session.userId]);

    await query(
      `insert into balance_locks (user_id, amount, duration_days, bonus_percent, bonus_amount, unlocks_at)
       values ($1, $2, $3, $4, $5, $6)`,
      [session.userId, amt, days, tier.bonusPercent, bonusAmount, unlocksAt]
    );

    return Response.json({ ok: true, bonusAmount, unlocksAt });
  } catch (e) {
    console.error("Error di /api/lock-balance:", e);
    return Response.json(
      { error: "Terjadi kesalahan server. Cek koneksi database." },
      { status: 500 }
    );
  }
}
