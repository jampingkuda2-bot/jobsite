import { query } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  try {
    const admin = getAdminSession();
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    const pendingRes = await query(
      `select d.id, d.amount_idr, d.proof_url, d.status, d.created_at, u.username, u.email
       from token_deposits d join users u on u.id = d.user_id
       where d.status = 'pending'
       order by d.created_at asc`
    );

    const historyRes = await query(
      `select d.id, d.amount_idr, d.proof_url, d.status, d.created_at, d.reviewed_at, u.username, u.email
       from token_deposits d join users u on u.id = d.user_id
       where d.status != 'pending'
       order by d.reviewed_at desc
       limit 100`
    );

    return Response.json({
      pending: pendingRes.rows.map((d) => ({ ...d, amount_idr: Number(d.amount_idr) })),
      history: historyRes.rows.map((d) => ({ ...d, amount_idr: Number(d.amount_idr) })),
    });
  } catch (e) {
    console.error("Error di GET /api/admin/deposits:", e);
    return Response.json({ error: "Gagal memuat data. Cek koneksi database." }, { status: 500 });
  }
}

// action: "approve" (kredit ke token_balances milik user) atau "reject"
export async function POST(req) {
  try {
    const admin = getAdminSession();
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    const { depositId, action } = await req.json();
    if (!depositId || !["approve", "reject"].includes(action)) {
      return Response.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const depRes = await query(
      "select id, user_id, amount_idr, status from token_deposits where id = $1",
      [depositId]
    );
    if (depRes.rows.length === 0) {
      return Response.json({ error: "Data tidak ditemukan" }, { status: 404 });
    }
    const dep = depRes.rows[0];
    if (dep.status !== "pending") {
      return Response.json({ error: "Sudah diproses sebelumnya" }, { status: 400 });
    }

    if (action === "approve") {
      // PENTING: kredit ke token_balances, BUKAN ke users.saldo.
      // Saldo token ini sengaja terpisah total, tidak bisa ditarik jadi uang.
      await query(
        `insert into token_balances (user_id, token_balance, updated_at)
         values ($1, $2, now())
         on conflict (user_id) do update set token_balance = token_balances.token_balance + $2, updated_at = now()`,
        [dep.user_id, dep.amount_idr]
      );
      await query(
        "update token_deposits set status = 'approved', reviewed_at = now() where id = $1",
        [depositId]
      );
    } else {
      await query(
        "update token_deposits set status = 'rejected', reviewed_at = now() where id = $1",
        [depositId]
      );
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error("Error di POST /api/admin/deposits:", e);
    return Response.json({ error: "Gagal memproses. Cek koneksi database." }, { status: 500 });
  }
}
