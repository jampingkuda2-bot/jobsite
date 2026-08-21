import { query } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  try {
    const admin = getAdminSession();
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    const pendingRes = await query(
      `select s.id, s.status, s.submitted_at, u.username, u.email, t.title, t.task_code, t.reward
       from task_submissions s
       join users u on u.id = s.user_id
       join tasks t on t.id = s.task_id
       where s.status = 'pending'
       order by s.submitted_at asc`
    );

    const historyRes = await query(
      `select s.id, s.status, s.submitted_at, s.reviewed_at, u.username, u.email, t.title, t.task_code, t.reward
       from task_submissions s
       join users u on u.id = s.user_id
       join tasks t on t.id = s.task_id
       where s.status != 'pending'
       order by s.reviewed_at desc
       limit 100`
    );

    return Response.json({
      submissions: pendingRes.rows.map((s) => ({ ...s, reward: Number(s.reward) })),
      history: historyRes.rows.map((s) => ({ ...s, reward: Number(s.reward) })),
    });
  } catch (e) {
    console.error("Error di GET /api/admin/submissions:", e);
    return Response.json({ error: "Gagal memuat data. Cek koneksi database." }, { status: 500 });
  }
}

// action: "approve" atau "reject"
export async function POST(req) {
  try {
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

      // Bonus referral: kalau user ini punya pengajak & belum pernah dapat bonus,
      // ini artinya tugas yang baru disetujui adalah tugas pertama yang berhasil dia kerjakan
      const referrerRes = await query(
        "select referred_by, referral_reward_given from users where id = $1",
        [sub.user_id]
      );
      const referrerInfo = referrerRes.rows[0];
      if (referrerInfo && referrerInfo.referred_by && !referrerInfo.referral_reward_given) {
        await query("update users set saldo = saldo + 800 where id = $1", [
          referrerInfo.referred_by,
        ]);
        await query(
          "insert into balance_adjustments (user_id, amount, reason) values ($1, 800, 'Bonus referral')",
          [referrerInfo.referred_by]
        );
        await query("update users set referral_reward_given = true where id = $1", [
          sub.user_id,
        ]);
      }
    } else {
      await query(
        "update task_submissions set status = 'rejected', reviewed_at = now() where id = $1",
        [submissionId]
      );
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error("Error di POST /api/admin/submissions:", e);
    return Response.json({ error: "Gagal memproses. Cek koneksi database." }, { status: 500 });
  }
}

// Hapus 1 baris riwayat (hanya yang sudah diproses, bukan yang masih pending)
export async function DELETE(req) {
  try {
    const admin = getAdminSession();
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    const { submissionId } = await req.json();
    if (!submissionId) return Response.json({ error: "ID wajib diisi" }, { status: 400 });

    await query(
      "delete from task_submissions where id = $1 and status != 'pending'",
      [submissionId]
    );

    return Response.json({ ok: true });
  } catch (e) {
    console.error("Error di DELETE /api/admin/submissions:", e);
    return Response.json({ error: "Gagal menghapus. Cek koneksi database." }, { status: 500 });
  }
}
