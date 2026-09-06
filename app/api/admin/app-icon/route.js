import { query } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  try {
    const admin = getAdminSession();
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    const res = await query("select icon_url from app_settings where id = 1");
    return Response.json({ icon_url: res.rows[0]?.icon_url || null });
  } catch (e) {
    console.error("Error di GET /api/admin/app-icon:", e);
    return Response.json(
      { error: "Gagal memuat data. Cek koneksi database." },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const admin = getAdminSession();
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    const { iconUrl } = await req.json();
    if (!iconUrl) return Response.json({ error: "URL icon wajib diisi" }, { status: 400 });

    await query(
      `insert into app_settings (id, icon_url) values (1, $1)
       on conflict (id) do update set icon_url = $1`,
      [iconUrl]
    );

    return Response.json({ ok: true });
  } catch (e) {
    console.error("Error di POST /api/admin/app-icon:", e);
    return Response.json(
      { error: "Gagal menyimpan. Cek koneksi database." },
      { status: 500 }
    );
  }
}
