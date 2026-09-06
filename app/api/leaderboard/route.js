import { query } from "@/lib/db";

export async function GET() {
  try {
    const res = await query(
      `select u.username, u.photo_url, coalesce(sum(t.reward), 0)::bigint as total
       from task_submissions s
       join tasks t on t.id = s.task_id
       join users u on u.id = s.user_id
       where s.status = 'approved'
         and date_trunc('month', s.reviewed_at) = date_trunc('month', now())
       group by u.id, u.username, u.photo_url
       order by total desc
       limit 10`
    );

    return Response.json({
      leaderboard: res.rows.map((r) => ({
        username: r.username,
        photo_url: r.photo_url || null,
        total: Number(r.total),
      })),
    });
  } catch (e) {
    console.error("Error di /api/leaderboard:", e);
    return Response.json(
      { error: "Terjadi kesalahan server. Cek koneksi database." },
      { status: 500 }
    );
  }
}
