import { query } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  const admin = getAdminSession();
  if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

  const res = await query(
    `select w.id, w.amount, w.dana_number, w.dana_name, w.status, w.requested_at,
            u.username, u.email
     from withdrawals w
     join users u on u.id = w.user_id
     where w.status = 'pending'
     order by w.requested_at asc`
  );

  return Response.json({
    withdrawals: res.rows.map((w) => ({ ...w, amount: Number(w.amount) })),
  });
}

// action: "done" (sudah admin TF manual) atau "reject" (batal, saldo dikembalikan)
export async function POST(req) {
  const admin = getAdminSession();
  if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

  const { withdrawalId, action } = await req.json();
  if (!withdrawalId || !["done", "reject"].includes(action)) {
    return Response.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const wRes = await query(
    "select id, user_id, amount, status from withdrawals where id = $1",
    [withdrawalId]
  );
  if (wRes.rows.length === 0) {
    return Response.json({ error: "Data tidak ditemukan" }, { status: 404 });
  }
  const w = wRes.rows[0];
  if (w.status !== "pending") {
    return Response.json({ error: "Sudah diproses sebelumnya" }, { status: 400 });
  }

  if (action === "done") {
    await query(
      "update withdrawals set status = 'done', completed_at = now() where id = $1",
      [withdrawalId]
    );
  } else {
    // Batal -> kembalikan saldo user (karena saat pengajuan saldo sudah dipotong)
    await query(
      "update withdrawals set status = 'rejected', completed_at = now() where id = $1",
      [withdrawalId]
    );
    await query("update users set saldo = saldo + $1 where id = $2", [
      w.amount,
      w.user_id,
    ]);
  }

  return Response.json({ ok: true });
}
