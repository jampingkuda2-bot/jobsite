import { query } from "@/lib/db";
import { getUserSession } from "@/lib/auth";

export async function POST(req) {
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

  // Ada penarikan pending yang belum diproses admin? cegah dobel ajuan
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

  // Kurangi saldo langsung saat pengajuan agar tidak bisa dipakai dobel,
  // saldo akan dikembalikan otomatis kalau nanti admin menolak (lihat panel admin)
  await query("update users set saldo = saldo - $1 where id = $2", [
    amt,
    session.userId,
  ]);

  await query(
    `insert into withdrawals (user_id, amount, dana_number, dana_name, status)
     values ($1, $2, $3, $4, 'pending')`,
    [session.userId, amt, danaNumber.trim(), danaName || null]
  );

  return Response.json({ ok: true });
}
