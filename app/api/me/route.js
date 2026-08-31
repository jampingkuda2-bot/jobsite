import { query } from "@/lib/db";
import { getUserSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = getUserSession();
    if (!session) return Response.json({ error: "Belum login" }, { status: 401 });

    const userRes = await query(
      "select id, email, username, saldo from users where id = $1",
      [session.userId]
    );
    if (userRes.rows.length === 0) {
      return Response.json({ error: "User tidak ditemukan" }, { status: 404 });
    }
    const user = userRes.rows[0];

    const tasksRes = await query(
      `select t.id, t.task_code, t.title, t.description, t.notes, t.link, t.reward,
              t.requires_screenshot, t.requires_video, t.example_images
       from tasks t
       where t.is_active = true
         and (t.target_user_id is null or t.target_user_id = $1)
         and (t.expires_at is null or t.expires_at > now())
         and not exists (
           select 1 from task_submissions s
           where s.task_id = t.id and s.status in ('pending', 'approved')
         )
       order by t.created_at desc`,
      [user.id]
    );

    const submissionsRes = await query(
      `select s.id, s.status, s.submitted_at, s.rejection_reason, t.title, t.reward
       from task_submissions s
       join tasks t on t.id = s.task_id
       where s.user_id = $1
       order by s.submitted_at desc
       limit 50`,
      [user.id]
    );

    const withdrawalsRes = await query(
      `select id, ref_code, amount, dana_number, status, requested_at, completed_at
       from withdrawals where user_id = $1
       order by requested_at desc limit 50`,
      [user.id]
    );

    const referralCountRes = await query(
      "select count(*)::int as count from users where referred_by = $1",
      [user.id]
    );
    const referralEarnedRes = await query(
      "select coalesce(sum(amount), 0)::bigint as total from balance_adjustments where user_id = $1 and reason = 'Bonus referral'",
      [user.id]
    );

    return Response.json({
      user: { email: user.email, username: user.username, saldo: Number(user.saldo) },
      tasks: tasksRes.rows,
      submissions: submissionsRes.rows,
      withdrawals: withdrawalsRes.rows,
      referral: {
        count: referralCountRes.rows[0].count,
        earned: Number(referralEarnedRes.rows[0].total),
      },
    });
  } catch (e) {
    console.error("Error di GET /api/me:", e);
    return Response.json({ error: "Gagal memuat data. Cek koneksi database." }, { status: 500 });
  }
}
