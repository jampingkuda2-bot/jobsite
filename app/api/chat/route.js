import { query } from "@/lib/db";
import { getUserSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = getUserSession();
    if (!session) return Response.json({ error: "Belum login" }, { status: 401 });

    const res = await query(
      `select id, sender, message, attachment_url, attachment_type, created_at
       from chat_messages where user_id = $1 order by created_at asc limit 200`,
      [session.userId]
    );

    await query(
      "update chat_messages set read_by_user = true where user_id = $1 and sender = 'admin' and read_by_user = false",
      [session.userId]
    );

    return Response.json({ messages: res.rows });
  } catch (e) {
    console.error("Error di GET /api/chat:", e);
    return Response.json({ error: "Gagal memuat pesan. Cek koneksi database." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = getUserSession();
    if (!session) return Response.json({ error: "Belum login" }, { status: 401 });

    const { message, attachmentUrl, attachmentType } = await req.json();
    const text = (message || "").trim();

    if (!text && !attachmentUrl) {
      return Response.json({ error: "Pesan tidak boleh kosong" }, { status: 400 });
    }
    if (attachmentUrl && !["image", "video"].includes(attachmentType)) {
      return Response.json({ error: "Jenis lampiran tidak valid" }, { status: 400 });
    }

    await query(
      "insert into chat_messages (user_id, sender, message, attachment_url, attachment_type) values ($1, 'user', $2, $3, $4)",
      [session.userId, text.slice(0, 2000), attachmentUrl || null, attachmentType || null]
    );

    return Response.json({ ok: true });
  } catch (e) {
    console.error("Error di POST /api/chat:", e);
    return Response.json({ error: "Gagal mengirim pesan. Cek koneksi database." }, { status: 500 });
  }
}
