import { query } from "@/lib/db";
import { getUserSession } from "@/lib/auth";
import { generateRefCode } from "@/lib/codes";

export async function POST(req) {
  try {
    const session = getUserSession();
    if (!session) return Response.json({ error: "Belum login" }, { status: 401 });

    const { amount, danaNumber, danaName } = await req.json();
    const amt = Number(amount);

    if (!amt || amt <= 0) {
      return Response.json({ error: "Jumlah tidak valid" }, { status: 400 });
    }
    if (!danaNumber || danaNumber.trim().length < 8) {
      return Response.json({ error: "Nomor DANA tidak valid" }, { status: 400 });
    }

    const userRes = await query("select saldo from users where id = $1", [
      session.userId,
    ]);
    const saldo = Number(userRes.rows[0].saldo);

    if (amt > saldo) {
      return Response.json({ error: "Saldo tidak mencukupi" }, { status: 400 });
    }

    const pending = await query(
      "select id from withdrawals where user_id = $1 and status = 'pending'",
      [session.userId]
    );
    if (pending.rows.length > 0) {
      return Response.json(
        { error: "Anda masih punya penarikan yang sedang diproses" },
        { status: 400 }
      );
    }

    await query("update users set saldo = saldo - $1 where id = $2", [
      amt,
      session.userId,
    ]);

    // Coba insert dengan kode acak, ulangi kalau kebetulan bentrok (sangat jarang terjadi)
    let refCode;
    let inserted = false;
    for (let attempt = 0; attempt < 8 && !inserted; attempt++) {
      refCode = generateRefCode("WD");
      try {
        await query(
          `insert into withdrawals (user_id, amount, dana_number, dana_name, status, ref_code)
           values ($1, $2, $3, $4, 'pending', $5)`,
          [session.userId, amt, danaNumber.trim(), danaName || null, refCode]
        );
        inserted = true;
      } catch (e) {
        if (e.code !== "23505") throw e; // bukan error duplikat, lempar lagi
        // kalau duplikat (bentrok kode), lanjut ke percobaan berikutnya
      }
    }

    if (!inserted) {
      // Gagal terus setelah 8x coba (harusnya nyaris mustahil) — batalkan,
      // kembalikan saldo yang sudah dipotong tadi supaya tidak hilang
      await query("update users set saldo = saldo + $1 where id = $2", [
        amt,
        session.userId,
      ]);
      return Response.json(
        { error: "Gagal membuat kode penarikan, coba lagi." },
        { status: 500 }
      );
    }

    return Response.json({ ok: true, refCode });
  } catch (e) {
    console.error("Error di /api/withdraw:", e);
    return Response.json(
      { error: "Terjadi kesalahan server. Cek koneksi database." },
      { status: 500 }
    );
  }
}
