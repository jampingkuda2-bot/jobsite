import { query } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { sendPushToAllUsers } from "@/lib/push";

export async function GET() {
  try {
    const admin = getAdminSession();
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    const res = await query(
      "select message, is_active from announcement where id = 1"
    );
    return Response.json({
      message: res.rows[0]?.message || "",
      is_active: res.rows[0]?.is_active || false,
    });
  } catch (e) {
    console.error("Error di GET /api/admin/announcement:", e);
    return Response.json({ error: "Gagal memuat data. Cek koneksi database." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const admin = getAdminSession();
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    const { message, isActive } = await req.json();

    await query(
      `insert into announcement (id, message, is_active, updated_at)
       values (1, $1, $2, now())
       on conflict (id) do update set message = $1, is_active = $2, updated_at = now()`,
      [message || "", !!isActive]
    );

    // Kirim push notification ke semua user, cuma kalau pengumumannya diaktifkan
    if (isActive && message) {
      try {
        await sendPushToAllUsers({
          title: "Pengumuman baru 📢",
          body: message,
          url: "/dashboard",
        });
      } catch (pushErr) {
        console.error("Gagal kirim push ke semua user:", pushErr.message);
      }
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error("Error di POST /api/admin/announcement:", e);
    return Response.json({ error: "Gagal menyimpan. Cek koneksi database." }, { status: 500 });
  }
}
