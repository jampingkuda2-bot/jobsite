import { query } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  try {
    const admin = getAdminSession();
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    const res = await query("select enabled from ai_chat_settings where id = 1");
    return Response.json({ enabled: res.rows[0]?.enabled || false });
  } catch (e) {
    console.error("Error di GET /api/admin/ai-chat-settings:", e);
    return Response.json({ error: "Gagal memuat data. Cek koneksi database." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const admin = getAdminSession();
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    const { enabled } = await req.json();

    await query(
      `insert into ai_chat_settings (id, enabled) values (1, $1)
       on conflict (id) do update set enabled = $1`,
      [!!enabled]
    );

    return Response.json({ ok: true });
  } catch (e) {
    console.error("Error di POST /api/admin/ai-chat-settings:", e);
    return Response.json({ error: "Gagal menyimpan. Cek koneksi database." }, { status: 500 });
  }
}
