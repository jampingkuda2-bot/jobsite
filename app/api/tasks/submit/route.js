import { query } from "@/lib/db";
import { getUserSession } from "@/lib/auth";

export async function POST(req) {
  try {
    const session = getUserSession();
    if (!session) return Response.json({ error: "Belum login" }, { status: 401 });

    const { taskId, screenshotUrl, videoUrl } = await req.json();
    if (!taskId) return Response.json({ error: "Tugas tidak valid" }, { status: 400 });

    const taskRes = await query(
      `select id, requires_screenshot, requires_video
       from tasks where id = $1 and is_active = true
       and (target_user_id is null or target_user_id = $2)
       and (expires_at is null or expires_at > now())
       and not exists (
         select 1 from task_submissions where task_id = $1 and status in ('pending', 'approved')
       )`,
      [taskId, session.userId]
    );
    if (taskRes.rows.length === 0) {
      return Response.json({ error: "Tugas sudah tidak tersedia (mungkin sudah dikerjakan orang lain)" }, { status: 400 });
    }
    const task = taskRes.rows[0];

    if (task.requires_screenshot && !screenshotUrl) {
      return Response.json({ error: "Tugas ini wajib melampirkan screenshot" }, { status: 400 });
    }
    if (task.requires_video && !videoUrl) {
      return Response.json({ error: "Tugas ini wajib melampirkan video" }, { status: 400 });
    }

    const already = await query(
      "select id from task_submissions where user_id = $1 and task_id = $2",
      [session.userId, taskId]
    );
    if (already.rows.length > 0) {
      return Response.json({ error: "Tugas sudah pernah dikirim" }, { status: 400 });
    }

    await query(
      `insert into task_submissions (user_id, task_id, status, screenshot_url, video_url)
       values ($1, $2, 'pending', $3, $4)`,
      [session.userId, taskId, screenshotUrl || null, videoUrl || null]
    );

    return Response.json({ ok: true });
  } catch (e) {
    console.error("Error di POST /api/tasks/submit:", e);
    return Response.json({ error: "Gagal mengirim. Cek koneksi database." }, { status: 500 });
  }
}
