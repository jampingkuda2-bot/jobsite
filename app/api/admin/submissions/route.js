import { query } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await getAdminSession(); // tambahkan await
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    const pendingRes = await query(
      `select s.id, s.status, s.submitted_at, s.screenshot_url, s.video_url,
              u.username, u.email, t.title, t.task_code, t.description, t.notes, t.reward
       from task_submissions s
       join users u on u.id = s.user_id
       join tasks t on t.id = s.task_id
       where s.status = 'pending'
       order by s.submitted_at asc`
    );

    const historyRes = await query(
      `select s.id, s.status, s.submitted_at, s.reviewed_at, s.screenshot_url, s.video_url, s.rejection_reason,
              u.username, u.email, t.title, t.task_code, t.description, t.notes, t.reward
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
    const admin = await getAdminSession();
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    const { submissionId, action, rejectionReason } = await req.json();
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

    // Mulai transaksi
    await query("BEGIN");
    try {
      if (action === "approve") {
        // Lock user untuk menghindari race condition
        await query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [sub.user_id]);

        // Update submission status
        await query(
          "UPDATE task_submissions SET status = 'approved', reviewed_at = now() WHERE id = $1",
          [submissionId]
        );
        // Tambah reward ke withdrawable_balance (bukan saldo)
        await query(
          "UPDATE users SET withdrawable_balance = withdrawable_balance + $1 WHERE id = $2",
          [sub.reward, sub.user_id]
        );

        // Bonus referral: jika user punya pengajak dan belum pernah dapat bonus
        const referrerRes = await query(
          "SELECT referred_by, referral_reward_given FROM users WHERE id = $1",
          [sub.user_id]
        );
        const referrerInfo = referrerRes.rows[0];
        if (referrerInfo && referrerInfo.referred_by && !referrerInfo.referral_reward_given) {
          // Lock referrer
          await query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [referrerInfo.referred_by]);
          await query(
            "UPDATE users SET withdrawable_balance = withdrawable_balance + 800 WHERE id = $1",
            [referrerInfo.referred_by]
          );
          await query(
            "INSERT INTO balance_adjustments (user_id, amount, reason) VALUES ($1, 800, 'Bonus referral')",
            [referrerInfo.referred_by]
          );
          await query(
            "UPDATE users SET referral_reward_given = true WHERE id = $1",
            [sub.user_id]
          );
        }
      } else {
        // Reject: tidak ubah saldo, hanya update status
        await query(
          "UPDATE task_submissions SET status = 'rejected', reviewed_at = now(), rejection_reason = $2 WHERE id = $1",
          [submissionId, rejectionReason || null]
        );
      }

      await query("COMMIT");
      return Response.json({ ok: true });
    } catch (err) {
      await query("ROLLBACK");
      throw err; // lempar ke catch luar
    }
  } catch (e) {
    console.error("Error di POST /api/admin/submissions:", e);
    return Response.json(
      { error: e.message || "Gagal memproses. Cek koneksi database." },
      { status: 500 }
    );
  }
}

// Hapus 1 baris riwayat (hanya yang sudah diproses, bukan yang masih pending)
export async function DELETE(req) {
  try {
    const admin = await getAdminSession();
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    const { submissionId } = await req.json();
    if (!submissionId) return Response.json({ error: "ID wajib diisi" }, { status: 400 });

    await query(
      "DELETE FROM task_submissions WHERE id = $1 AND status != 'pending'",
      [submissionId]
    );

    return Response.json({ ok: true });
  } catch (e) {
    console.error("Error di DELETE /api/admin/submissions:", e);
    return Response.json({ error: "Gagal menghapus. Cek koneksi database." }, { status: 500 });
  }
}
