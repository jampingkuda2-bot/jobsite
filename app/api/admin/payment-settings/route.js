import { query } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  try {
    const admin = getAdminSession();
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    const res = await query(
      "select bank_info, qris_image_url from payment_settings where id = 1"
    );
    return Response.json({
      bankInfo: res.rows[0]?.bank_info || "",
      qrisImageUrl: res.rows[0]?.qris_image_url || "",
    });
  } catch (e) {
    console.error("Error di GET /api/admin/payment-settings:", e);
    return Response.json({ error: "Gagal memuat data. Cek koneksi database." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const admin = getAdminSession();
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    const { bankInfo, qrisImageUrl } = await req.json();

    await query(
      `insert into payment_settings (id, bank_info, qris_image_url, updated_at)
       values (1, $1, $2, now())
       on conflict (id) do update set bank_info = $1, qris_image_url = $2, updated_at = now()`,
      [bankInfo || null, qrisImageUrl || null]
    );

    return Response.json({ ok: true });
  } catch (e) {
    console.error("Error di POST /api/admin/payment-settings:", e);
    return Response.json({ error: "Gagal menyimpan. Cek koneksi database." }, { status: 500 });
  }
}
