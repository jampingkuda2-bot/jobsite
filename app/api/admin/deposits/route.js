import { query } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  try {
    const admin = getAdminSession();
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    const pendingRes = await query(
      `SELECT d.id, d.amount, d.proof_url, d.status, d.requested_at, u.username, u.email
       FROM deposit_requests d
       JOIN users u ON u.id = d.user_id
       WHERE d.status = 'pending'
       ORDER BY d.requested_at ASC`
    );

    const historyRes = await query(
      `SELECT d.id, d.amount, d.proof_url, d.status, d.requested_at, d.processed_at, u.username, u.email
       FROM deposit_requests d
       JOIN users u ON u.id = d.user_id
       WHERE d.status != 'pending'
       ORDER BY d.processed_at DESC
       LIMIT 100`
    );

    return Response.json({
      pending: pendingRes.rows.map((d) => ({ ...d, amount_idr: Number(d.amount) })),
      history: historyRes.rows.map((d) => ({ ...d, amount_idr: Number(d.amount) })),
    });
  } catch (e) {
    console.error("Error di GET /api/admin/deposits:", e);
    return Response.json({ error: "Gagal memuat data" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const admin = getAdminSession();
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    const { depositId, action } = await req.json();
    if (!depositId || !["approve", "reject"].includes(action)) {
      return Response.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const depRes = await query(
      "SELECT id, user_id, amount, status FROM deposit_requests WHERE id = $1",
      [depositId]
    );
    if (depRes.rows.length === 0) {
      return Response.json({ error: "Data tidak ditemukan" }, { status: 404 });
    }
    const dep = depRes.rows[0];
    if (dep.status !== "pending") {
      return Response.json({ error: "Sudah diproses sebelumnya" }, { status: 400 });
    }

    await query("BEGIN");
    try {
      if (action === "approve") {
        // Lock user
        await query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [dep.user_id]);

        // Tambah ke saldo utama (users.saldo)
        await query(
          "UPDATE users SET saldo = saldo + $1 WHERE id = $2",
          [dep.amount, dep.user_id]
        );

        // Update status request
        await query(
          `UPDATE deposit_requests
           SET status = 'approved', processed_at = NOW(), completed_at = NOW()
           WHERE id = $1`,
          [depositId]
        );

        // Catat riwayat
        await query(
          `INSERT INTO balance_adjustments (user_id, amount, reason)
           VALUES ($1, $2, $3)`,
          [dep.user_id, dep.amount, 'Deposit via admin']
        );
      } else {
        await query(
          `UPDATE deposit_requests
           SET status = 'rejected', processed_at = NOW()
           WHERE id = $1`,
          [depositId]
        );
      }
      await query("COMMIT");
      return Response.json({ ok: true });
    } catch (err) {
      await query("ROLLBACK");
      throw err;
    }
  } catch (e) {
    console.error("Error di POST /api/admin/deposits:", e);
    return Response.json({ error: "Gagal memproses" }, { status: 500 });
  }
}
