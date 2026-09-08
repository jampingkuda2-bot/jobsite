import { query } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

  const res = await query(
    `select current_database() as db, (select count(*) from users) as jumlah_user, (select count(*) from task_submissions where status='approved') as jumlah_approved`
  );
  return Response.json(res.rows[0]);
}
