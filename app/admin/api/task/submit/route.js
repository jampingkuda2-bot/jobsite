import { query } from "@/lib/db";
import { getUserSession } from "@/lib/auth";

export async function POST(req) {
  const session = getUserSession();
  if (!session) return Response.json({ error: "Belum login" }, { status: 401 });

  const { taskId } = await req.json();
  if (!taskId) return Response.json({ error: "Tugas tidak valid" }, { status: 400 });

  const task = await query(
    "select id from tasks where id = $1 and is_active = true",
    [taskId]
  );
  if (task.rows.length === 0) {
    return Response.json({ error: "Tugas tidak tersedia" }, { status: 400 });
  }

  const already = await query(
    "select id from task_submissions where user_id = $1 and task_id = $2",
    [session.userId, taskId]
  );
  if (already.rows.length > 0) {
    return Response.json({ error: "Tugas sudah pernah dikirim" }, { status: 400 });
  }

  await query(
    "insert into task_submissions (user_id, task_id, status) values ($1, $2, 'pending')",
    [session.userId, taskId]
  );

  return Response.json({ ok: true });
}
