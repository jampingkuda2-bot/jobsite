import { query } from "@/lib/db";
import { getUserSession } from "@/lib/auth";
import { generateRefCode } from "@/lib/codes";

export async function POST(req) {
  try {
    const session = await getUserSession();
    if (!session) return Response.json({ error: "Belum login" }, { status: 401 });

    const { amount, danaNumber, danaName } = await req.json();
    const amt = Number(amount);

    if (!amt || amt <= 0) {
      return Response.json({ error: "Jumlah tidak valid" }, { status: 400 });
    }
    if (!danaNumber || danaNumber.trim().length < 8) {
      return Response.json({ error: "Nomor DANA tidak valid" }, { status: 400 });
    }

    // Cek pending (di luar transaksi)
    const pending = await query(
      "SELECT id FROM withdrawals WHERE user_id = $1 AND status = 'pending'",
      [session.userId]
    );
    if (pending.rows.length > 0) {
      return Response.json(
        { error: "Anda masih punya penarikan yang sedang diproses" },
        { status: 400 }
      );
    }

    await query("BEGIN");
    try {
      // Lock user
      const userRes = await query(
        "SELECT saldo FROM users WHERE id = $1 FOR UPDATE",
        [session.userId]
      );
      if (userRes.rows.length === 0) throw new Error("User tidak ditemukan");

      // Hitung total lock aktif
      const lockedRes = await query(
        "SELECT COALESCE(SUM(amount), 0)::BIGINT AS total_locked FROM balance_locks WHERE user_id = $1 AND status = 'active'",
        [session.userId]
      );
      const totalLocked = Number(lockedRes.rows[0].total_locked);
      const available = Number(userRes.rows[0].saldo) - totalLocked;

      if (amt > available) {
        throw new Error(`Saldo tersedia hanya Rp${available.toLocaleString("id-ID")}`);
      }

      // Kurangi saldo utama
      await query(
        "UPDATE users SET saldo = saldo - $1 WHERE id = $2",
        [amt, session.userId]
      );

      // Insert withdrawal
      let refCode;
      let inserted = false;
      for (let attempt = 0; attempt < 8 && !inserted; attempt++) {
        refCode = generateRefCode("WD");
        try {
          await query(
            `INSERT INTO withdrawals 
              (user_id, amount, dana_number, dana_name, status, ref_code)
             VALUES ($1, $2, $3, $4, 'pending', $5)`,
            [session.userId, amt, danaNumber.trim(), danaName || null, refCode]
          );
          inserted = true;
        } catch (e) {
          if (e.code !== "23505") throw e;
        }
      }

      if (!inserted) {
        await query("ROLLBACK");
        return Response.json(
          { error: "Gagal membuat kode penarikan, coba lagi." },
          { status: 500 }
        );
      }

      await query("COMMIT");
      return Response.json({ ok: true, refCode });
    } catch (err) {
      await query("ROLLBACK");
      throw err;
    }
  } catch (e) {
    console.error("Error di /api/withdraw:", e);
    return Response.json(
      { error: e.message || "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
