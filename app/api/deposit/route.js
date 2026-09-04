import { query } from "@/lib/db";
import { getUserSession } from "@/lib/auth";

export async function POST(req) {
  try {
    const session = await getUserSession();
    if (!session) return Response.json({ error: "Belum login" }, { status: 401 });

    const { amount, paymentMethod } = await req.json();
    const amt = Number(amount);

    if (!amt || amt <= 0) {
      return Response.json({ error: "Jumlah tidak valid" }, { status: 400 });
    }
    if (!paymentMethod) {
      return Response.json({ error: "Metode pembayaran wajib diisi" }, { status: 400 });
    }

    await query("BEGIN");
    try {
      // Kunci baris user
      await query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [session.userId]);

      // Tambah token_balance
      await query(
        "UPDATE users SET token_balance = token_balance + $1 WHERE id = $2",
        [amt, session.userId]
      );

      // Catat riwayat (opsional)
      await query(
        `INSERT INTO balance_adjustments (user_id, amount, reason)
         VALUES ($1, $2, $3)`,
        [session.userId, amt, `Top-up via ${paymentMethod}`]
      );

      await query("COMMIT");
      return Response.json({
        ok: true,
        message: "Saldo token berhasil ditambahkan",
        newBalance: amt,
      });
    } catch (err) {
      await query("ROLLBACK");
      throw err;
    }
  } catch (e) {
    console.error("Error di /api/deposit:", e);
    return Response.json(
      { error: e.message || "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
