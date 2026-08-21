import { query } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET(req) {
  try {
    const admin = getAdminSession();
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    const res = await query(
      `select id, email, username, saldo, is_verified, created_at
       from users
       where username ilike $1 or email ilike $1
       order by created_at desc
       limit 200`,
      [`%${q}%`]
    );

    return Response.json({
      users: res.rows.map((u) => ({ ...u, saldo: Number(u.saldo) })),
    });
  } catch (e) {
    console.error("Error di GET /api/admin/users:", e);
    return Response.json({ error: "Gagal memuat data. Cek koneksi database." }, { status: 500 });
  }
}

// Tambah atau kurangi saldo user secara manual
export async function POST(req) {
  try {
    const admin = getAdminSession();
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    const { userId, amount, reason } = await req.json();
    const amt = Number(amount);

    if (!userId || !amt) {
      return Response.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const userRes = await query("select saldo from users where id = $1", [userId]);
    if (userRes.rows.length === 0) {
      return Response.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    const newSaldo = Number(userRes.rows[0].saldo) + amt;
    if (newSaldo < 0) {
      return Response.json({ error: "Saldo tidak boleh minus" }, { status: 400 });
    }

    await query("update users set saldo = $1 where id = $2", [newSaldo, userId]);
    await query(
      "insert into balance_adjustments (user_id, amount, reason) values ($1, $2, $3)",
      [userId, amt, reason || null]
    );

    return Response.json({ ok: true, saldo: newSaldo });
  } catch (e) {
    console.error("Error di POST /api/admin/users:", e);
    return Response.json({ error: "Gagal menyimpan. Cek koneksi database." }, { status: 500 });
  }
}
