import { query } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

async function markAdminActive() {
  await query(
    `insert into admin_presence (id, last_active_at) values (1, now())
     on conflict (id) do update set last_active_at = now()`
  );
}

export async function GET() {
  try {
    const admin = getAdminSession();
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    await markAdminActive();

    // Ambil percakapan terakhir per user, diurutkan dari yang terbaru,
    // sekaligus hitung jumlah pesan yang belum dibaca admin
    const res = await query(
      `select
         u.id as user_id,
         u.username,
         u.email,
         u.last_active_at,
         last_msg.message as last_message,
         last_msg.created_at as last_at,
         last_msg.sender as last_sender,
         coalesce(unread.count, 0) as unread_count
       from users u
       join lateral (
         select message, created_at, sender from chat_messages
         where user_id = u.id order by created_at desc limit 1
       ) last_msg on true
       left join lateral (
         select count(*)::int as count from chat_messages
         where user_id = u.id and sender = 'user' and read_by_admin = false
       ) unread on true
       order by last_msg.created_at desc
       limit 200`
    );

    return Response.json({ conversations: res.rows });
  } catch (e) {
    console.error("Error di GET /api/admin/chat:", e);
    return Response.json({ error: "Gagal memuat data. Cek koneksi database." }, { status: 500 });
  }
}
