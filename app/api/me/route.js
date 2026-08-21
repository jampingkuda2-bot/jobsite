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
      `select t.id, t.title, t.description, t.link, t.reward
       from tasks t
       where t.is_active = true
         and (t.target_user_id is null or t.target_user_id = $1)
         and not exists (
           select 1 from task_submissions s
           where s.task_id = t.id and s.user_id = $1
         )
       order by t.created_at desc`,
      [user.id]
    );

    const submissionsRes = await query(
      `select s.id, s.status, s.submitted_at, t.title, t.reward
       from task_submissions s
       join tasks t on t.id = s.task_id
       where s.user_id = $1
       order by s.submitted_at desc
       limit 50`,
      [user.id]
    );

    const withdrawalsRes = await query(
      `select id, amount, dana_number, status, requested_at, completed_at
       from withdrawals where user_id = $1
       order by requested_at desc limit 50`,
      [user.id]
    );

    return Response.json({
      user: { email: user.email, username: user.username, saldo: Number(user.saldo) },
      tasks: tasksRes.rows,
      submissions: submissionsRes.rows,
      withdrawals: withdrawalsRes.rows,
    });
  } catch (e) {
    console.error("Error di GET /api/me:", e);
    return Response.json({ error: "Gagal memuat data. Cek koneksi database." }, { status: 500 });
  }
}
