import { query } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

// GET – Lihat daftar deposit
export async function GET() {
  try {
    const admin = getAdminSession();
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    const pendingRes = await query(
      `SELECT r.id, r.amount, r.payment_method, r.proof_url, r.requested_at,
              u.username, u.email
       FROM deposit_requests r
       JOIN users u ON u.id = r.user_id
       WHERE r.status = 'pending'
       ORDER BY r.requested_at ASC`
    );

    const historyRes = await query(
      `SELECT r.id, r.amount, r.payment_method, r.status, r.admin_note,
              r.requested_at, r.processed_at, r.completed_at,
              u.username, u.email
       FROM deposit_requests r
       JOIN users u ON u.id = r.user_id
       WHERE r.status != 'pending'
       ORDER BY r.processed_at DESC
       LIMIT 100`
    );

    return Response.json({
      pending: pendingRes.rows,
      history: historyRes.rows,
    });
  } catch (e) {
    console.error("Error di GET /api/admin/deposit:", e);
    return Response.json({ error: "Gagal memuat data" }, { status: 500 });
  }
}

// POST – Approve atau Reject
export async function POST(req) {
  try {
    const admin = getAdminSession();
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    const { requestId, action, adminNote } = await req.json();
    if (!requestId || !["approve", "reject"].includes(action)) {
      return Response.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const reqRes = await query(
      `SELECT user_id, amount, status FROM deposit_requests WHERE id = $1`,
      [requestId]
    );
    if (reqRes.rows.length === 0) return Response.json({ error: "Request tidak ditemukan" }, { status: 404 });
    const req = reqRes.rows[0];
    if (req.status !== "pending") {
      return Response.json({ error: "Sudah diproses sebelumnya" }, { status: 400 });
    }

    await query("BEGIN");
    try {
      if (action === "approve") {
        // Lock user
        await query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [req.user_id]);
        // Tambah token_balance
        await query(
          "UPDATE users SET token_balance = token_balance + $1 WHERE id = $2",
          [req.amount, req.user_id]
        );
        // Update status request
        await query(
          `UPDATE deposit_requests
           SET status = 'approved', processed_at = NOW(), completed_at = NOW(), admin_note = $2
           WHERE id = $1`,
          [requestId, adminNote || null]
        );
        // Catat riwayat
        await query(
          `INSERT INTO balance_adjustments (user_id, amount, reason)
           VALUES ($1, $2, $3)`,
          [req.user_id, req.amount, `Deposit via admin`]
        );
      } else {
        // Reject
        await query(
          `UPDATE deposit_requests
           SET status = 'rejected', processed_at = NOW(), admin_note = $2
           WHERE id = $1`,
          [requestId, adminNote || "Ditolak admin"]
        );
      }
      await query("COMMIT");
      return Response.json({ ok: true });
    } catch (err) {
      await query("ROLLBACK");
      throw err;
    }
  } catch (e) {
    console.error("Error di POST /api/admin/deposit:", e);
    return Response.json({ error: "Gagal memproses" }, { status: 500 });
  }
}
