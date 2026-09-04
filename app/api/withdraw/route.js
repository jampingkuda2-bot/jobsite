import { query } from "@/lib/db";
import { getUserSession } from "@/lib/auth";
import { generateRefCode } from "@/lib/codes";

export async function POST(req) {
  try {
    const session = await getUserSession(); // tambahkan await
    if (!session) return Response.json({ error: "Belum login" }, { status: 401 });

    const { amount, danaNumber, danaName } = await req.json();
    const amt = Number(amount);

    if (!amt || amt <= 0) {
      return Response.json({ error: "Jumlah tidak valid" }, { status: 400 });
    }
    if (!danaNumber || danaNumber.trim().length < 8) {
      return Response.json({ error: "Nomor DANA tidak valid" }, { status: 400 });
    }

    // Cek apakah ada penarikan pending (di luar transaksi, tidak masalah)
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

    // MULAI TRANSAKSI
    await query("BEGIN");
    try {
      // Lock baris user
      const userRes = await query(
        "SELECT withdrawable_balance FROM users WHERE id = $1 FOR UPDATE",
        [session.userId]
      );
      if (userRes.rows.length === 0) throw new Error("User tidak ditemukan");

      const withdrawable = Number(userRes.rows[0].withdrawable_balance);
      if (amt > withdrawable) {
        throw new Error("Saldo tidak mencukupi");
      }

      // Kurangi withdrawable_balance
      await query(
        "UPDATE users SET withdrawable_balance = withdrawable_balance - $1 WHERE id = $2",
        [amt, session.userId]
      );

      // Generate kode referensi (dengan retry)
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
          if (e.code !== "23505") throw e; // bukan error duplikat
          // else lanjut retry
        }
      }

      if (!inserted) {
        // Gagal insert karena bentrok kode, rollback perubahan saldo
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
