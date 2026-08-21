import { query } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  try {
    const admin = getAdminSession();
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    const res = await query(
      `select t.id, t.title, t.description, t.link, t.reward, t.is_active, t.created_at,
              t.target_user_id, u.username as target_username
       from tasks t
       left join users u on u.id = t.target_user_id
       order by t.created_at desc`
    );
    return Response.json({
      tasks: res.rows.map((t) => ({ ...t, reward: Number(t.reward) })),
    });
  } catch (e) {
    console.error("Error di GET /api/admin/tasks:", e);
    return Response.json({ error: "Gagal memuat data. Cek koneksi database." }, { status: 500 });
  }
}

// Buat tugas baru. Default is_active = false (belum tampil di web sampai admin aktifkan)
// targetUsername opsional: kalau diisi, tugas hanya tampil untuk user itu.
// Kalau kosong, tugas tampil untuk semua pengguna (seperti biasa).
export async function POST(req) {
  try {
    const admin = getAdminSession();
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    const { title, description, link, reward, targetUsername } = await req.json();
    if (!title) return Response.json({ error: "Judul wajib diisi" }, { status: 400 });

    let targetUserId = null;
    if (targetUsername && targetUsername.trim()) {
      const userRes = await query(
        "select id from users where username = $1",
        [targetUsername.trim()]
      );
      if (userRes.rows.length === 0) {
        return Response.json(
          { error: `Username "${targetUsername}" tidak ditemukan` },
          { status: 400 }
        );
      }
      targetUserId = userRes.rows[0].id;
    }

    const res = await query(
      `insert into tasks (title, description, link, reward, is_active, target_user_id)
       values ($1, $2, $3, $4, false, $5) returning id`,
      [title, description || null, link || null, reward || 1500, targetUserId]
    );

    return Response.json({ ok: true, id: res.rows[0].id });
  } catch (e) {
    console.error("Error di POST /api/admin/tasks:", e);
    return Response.json({ error: "Gagal menyimpan. Cek koneksi database." }, { status: 500 });
  }
}

// Edit tugas (termasuk aktifkan/nonaktifkan)
export async function PATCH(req) {
  try {
    const admin = getAdminSession();
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    const { id, title, description, link, reward, is_active } = await req.json();
    if (!id) return Response.json({ error: "ID wajib diisi" }, { status: 400 });

    await query(
      `update tasks set
         title = coalesce($2, title),
         description = coalesce($3, description),
         link = coalesce($4, link),
         reward = coalesce($5, reward),
         is_active = coalesce($6, is_active)
       where id = $1`,
      [id, title, description, link, reward, is_active]
    );

    return Response.json({ ok: true });
  } catch (e) {
    console.error("Error di PATCH /api/admin/tasks:", e);
    return Response.json({ error: "Gagal menyimpan. Cek koneksi database." }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const admin = getAdminSession();
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    const { id } = await req.json();
    await query("delete from tasks where id = $1", [id]);

    return Response.json({ ok: true });
  } catch (e) {
    console.error("Error di DELETE /api/admin/tasks:", e);
    return Response.json({ error: "Gagal menghapus. Cek koneksi database." }, { status: 500 });
  }
}
