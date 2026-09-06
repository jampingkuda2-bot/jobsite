import { query } from "@/lib/db";
import { getUserSession, getAdminSession } from "@/lib/auth";

export async function POST(req) {
  try {
    const { subscription } = await req.json();
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return Response.json({ error: "Data subscription tidak lengkap" }, { status: 400 });
    }

    const userSession = await getUserSession();
    const adminSession = !userSession ? getAdminSession() : null;

    if (!userSession && !adminSession) {
      return Response.json({ error: "Belum login" }, { status: 401 });
    }

    const isAdmin = !!adminSession;
    const userId = userSession ? userSession.userId : null;

    await query(
      `insert into push_subscriptions (user_id, is_admin, endpoint, p256dh, auth)
       values ($1, $2, $3, $4, $5)
       on conflict (endpoint) do update
       set user_id = $1, is_admin = $2, p256dh = $4, auth = $5`,
      [userId, isAdmin, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
    );

    return Response.json({ ok: true });
  } catch (e) {
    console.error("Error di POST /api/push/subscribe:", e);
    return Response.json(
      { error: "Gagal menyimpan subscription. Cek koneksi database." },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const { endpoint } = await req.json();
    if (!endpoint) return Response.json({ error: "Endpoint tidak ada" }, { status: 400 });
    await query("delete from push_subscriptions where endpoint = $1", [endpoint]);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("Error di DELETE /api/push/subscribe:", e);
    return Response.json({ error: "Gagal menghapus subscription." }, { status: 500 });
  }
}
