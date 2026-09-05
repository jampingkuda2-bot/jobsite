import { query } from "@/lib/db";
import { getUserSession } from "@/lib/auth";

const CHECKIN_REWARD = 200;

export async function POST() {
  try {
    const session = await getUserSession();
    if (!session) return Response.json({ error: "Belum login" }, { status: 401 });

    const already = await query(
      "select id from daily_checkins where user_id = $1 and checkin_date = current_date",
      [session.userId]
    );
    if (already.rows.length > 0) {
      return Response.json({ error: "Sudah check-in hari ini" }, { status: 400 });
    }

    // Wajib udah kirim minimal 1 tugas hari ini (gak perlu nunggu disetujui admin)
    const didTaskToday = await query(
      "select id from task_submissions where user_id = $1 and submitted_at::date = current_date limit 1",
      [session.userId]
    );
    if (didTaskToday.rows.length === 0) {
      return Response.json(
        { error: "Kerjakan minimal 1 tugas dulu hari ini sebelum check-in" },
        { status: 400 }
      );
    }

    await query(
      "insert into daily_checkins (user_id, checkin_date) values ($1, current_date)",
      [session.userId]
    );
    await query("update users set saldo = saldo + $1 where id = $2", [
      CHECKIN_REWARD,
      session.userId,
    ]);

    return Response.json({ ok: true, amount: CHECKIN_REWARD });
  } catch (e) {
    console.error("Error di /api/checkin:", e);
    return Response.json(
      { error: "Terjadi kesalahan server. Cek koneksi database." },
      { status: 500 }
    );
  }
}
