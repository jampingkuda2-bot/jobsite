import { query } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  try {
    const admin = getAdminSession();
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    const pendingRes = await query(
      `select w.id, w.ref_code, w.amount, w.dana_number, w.dana_name, w.status, w.requested_at,
              u.username, u.email
       from withdrawals w
       join users u on u.id = w.user_id
       where w.status = 'pending'
       order by w.requested_at asc`
    );

    const historyRes = await query(
      `select w.id, w.ref_code, w.amount, w.dana_number, w.dana_name, w.status, w.requested_at, w.completed_at,
              u.username, u.email
       from withdrawals w
       join users u on u.id = w.user_id
       where w.status != 'pending'
       order by w.completed_at desc
       limit 100`
    );

    return Response.json({
      withdrawals: pendingRes.rows.map((w) => ({ ...w, amount: Number(w.amount) })),
      history: historyRes.rows.map((w) => ({ ...w, amount: Number(w.amount) })),
    });
  } catch (e) {
    console.error("Error di GET /api/admin/withdrawals:", e);
    return Response.json({ error: "Gagal memuat data. Cek koneksi database." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
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
  } catch (e) {
    console.error("Error di POST /api/admin/withdrawals:", e);
    return Response.json({ error: "Gagal memproses. Cek koneksi database." }, { status: 500 });
  }
}

// Hapus 1 baris riwayat (hanya yang sudah selesai/ditolak, bukan yang masih pending)
export async function DELETE(req) {
  try {
    const admin = getAdminSession();
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    const { withdrawalId } = await req.json();
    if (!withdrawalId) return Response.json({ error: "ID wajib diisi" }, { status: 400 });

    await query(
      "delete from withdrawals where id = $1 and status != 'pending'",
      [withdrawalId]
    );

    return Response.json({ ok: true });
  } catch (e) {
    console.error("Error di DELETE /api/admin/withdrawals:", e);
    return Response.json({ error: "Gagal menghapus. Cek koneksi database." }, { status: 500 });
  }
}
