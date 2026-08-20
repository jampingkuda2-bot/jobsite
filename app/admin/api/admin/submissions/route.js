import { query } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  const admin = getAdminSession();
  if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

  const res = await query(
    `select s.id, s.status, s.submitted_at, u.username, u.email, t.title, t.reward
     from task_submissions s
     join users u on u.id = s.user_id
     join tasks t on t.id = s.task_id
     where s.status = 'pending'
     order by s.submitted_at asc`
  );

  return Response.json({
    submissions: res.rows.map((s) => ({ ...s, reward: Number(s.reward) })),
  });
}

// action: "approve" atau "reject"
export async function POST(req) {
  const admin = getAdminSession();
  if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

  const { submissionId, action } = await req.json();
  if (!submissionId || !["approve", "reject"].includes(action)) {
    return Response.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const subRes = await query(
    `select s.id, s.user_id, s.status, t.reward
     from task_submissions s join tasks t on t.id = s.task_id
     where s.id = $1`,
    [submissionId]
  );
  if (subRes.rows.length === 0) {
    return Response.json({ error: "Data tidak ditemukan" }, { status: 404 });
  }
  const sub = subRes.rows[0];
  if (sub.status !== "pending") {
    return Response.json({ error: "Sudah diproses sebelumnya" }, { status: 400 });
  }

  if (action === "approve") {
    await query(
      "update task_submissions set status = 'approved', reviewed_at = now() where id = $1",
      [submissionId]
    );
    await query("update users set saldo = saldo + $1 where id = $2", [
      sub.reward,
      sub.user_id,
    ]);
  } else {
    await query(
      "update task_submissions set status = 'rejected', reviewed_at = now() where id = $1",
      [submissionId]
    );
  }

  return Response.json({ ok: true });
}
