import { query } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

async function markAdminActive() {
  await query(
    `insert into admin_presence (id, last_active_at) values (1, now())
     on conflict (id) do update set last_active_at = now()`
  );
}

export async function GET(req) {
  try {
    const admin = getAdminSession();
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    await markAdminActive();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) return Response.json({ error: "userId wajib diisi" }, { status: 400 });

    const userRes = await query(
      "select id, username, email, last_active_at from users where id = $1",
      [userId]
    );
    if (userRes.rows.length === 0) {
      return Response.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
    }

    const msgRes = await query(
      `select id, sender, message, attachment_url, attachment_type, created_at
       from chat_messages where user_id = $1 order by created_at asc limit 200`,
      [userId]
    );

    await query(
      "update chat_messages set read_by_admin = true where user_id = $1 and sender = 'user' and read_by_admin = false",
      [userId]
    );

    return Response.json({ user: userRes.rows[0], messages: msgRes.rows });
  } catch (e) {
    console.error("Error di GET /api/admin/chat/thread:", e);
    return Response.json({ error: "Gagal memuat pesan. Cek koneksi database." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const admin = getAdminSession();
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    await markAdminActive();

    const { userId, message, attachmentUrl, attachmentType } = await req.json();
    const text = (message || "").trim();

    if (!userId || (!text && !attachmentUrl)) {
      return Response.json({ error: "Data tidak lengkap" }, { status: 400 });
    }
    if (attachmentUrl && !["image", "video"].includes(attachmentType)) {
      return Response.json({ error: "Jenis lampiran tidak valid" }, { status: 400 });
    }

    await query(
      "insert into chat_messages (user_id, sender, message, attachment_url, attachment_type) values ($1, 'admin', $2, $3, $4)",
      [userId, text.slice(0, 2000), attachmentUrl || null, attachmentType || null]
    );

    return Response.json({ ok: true });
  } catch (e) {
    console.error("Error di POST /api/admin/chat/thread:", e);
    return Response.json({ error: "Gagal mengirim pesan. Cek koneksi database." }, { status: 500 });
  }
}
