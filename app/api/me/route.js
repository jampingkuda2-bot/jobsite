import { query } from "@/lib/db";
import { getUserSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getUserSession();
    if (!session) return Response.json({ error: "Belum login" }, { status: 401 });

    // MULAI TRANSAKSI UNTUK UNLOCK OTOMATIS
    await query("BEGIN");
    try {
      const dueLocks = await query(
        `SELECT id, user_id, amount, bonus_amount
         FROM balance_locks
         WHERE user_id = $1 AND status = 'active' AND unlocks_at <= NOW()`,
        [session.userId]
      );

      for (const lock of dueLocks.rows) {
        await query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [lock.user_id]);

        // Kembalikan pokok + bonus ke saldo (users.saldo)
        const total = Number(lock.amount) + Number(lock.bonus_amount);
        await query(
          "UPDATE users SET saldo = saldo + $1 WHERE id = $2",
          [total, lock.user_id]
        );

        await query(
          `UPDATE balance_locks
           SET status = 'completed', completed_at = NOW()
           WHERE id = $1`,
          [lock.id]
        );
      }

      await query("COMMIT");
    } catch (err) {
      await query("ROLLBACK");
      throw err;
    }

    // Ambil data user terbaru (ambil semua kolom yang diperlukan)
    const userRes = await query(
      `SELECT id, email, username, saldo, token_balance, withdrawable_balance
       FROM users WHERE id = $1`,
      [session.userId]
    );
    if (userRes.rows.length === 0) {
      return Response.json({ error: "User tidak ditemukan" }, { status: 404 });
    }
    const user = userRes.rows[0];

    // ================= TAMBAHAN: Hitung total lock aktif =================
    const lockedRes = await query(
      `SELECT COALESCE(SUM(amount), 0)::BIGINT AS total_locked
       FROM balance_locks
       WHERE user_id = $1 AND status = 'active'`,
      [user.id]
    );
    const totalLocked = Number(lockedRes.rows[0].total_locked);
    const availableBalance = Number(user.saldo) - totalLocked;

    // Ambil daftar tugas tersedia
    const tasksRes = await query(
      `SELECT t.id, t.task_code, t.title, t.description, t.notes, t.link, t.reward,
              t.requires_screenshot, t.requires_video, t.example_images
       FROM tasks t
       WHERE t.is_active = true
         AND (t.target_user_id IS NULL OR t.target_user_id = $1)
         AND (t.expires_at IS NULL OR t.expires_at > NOW())
         AND NOT EXISTS (
           SELECT 1 FROM task_submissions s
           WHERE s.task_id = t.id AND s.user_id = $1 AND s.status IN ('pending', 'approved')
         )
       ORDER BY t.created_at DESC`,
      [user.id]
    );

    // Ambil riwayat submit tugas
    const submissionsRes = await query(
      `SELECT s.id, s.status, s.submitted_at, s.rejection_reason, t.title, t.reward
       FROM task_submissions s
       JOIN tasks t ON t.id = s.task_id
       WHERE s.user_id = $1
       ORDER BY s.submitted_at DESC
       LIMIT 50`,
      [user.id]
    );

    // Ambil riwayat penarikan
    const withdrawalsRes = await query(
      `SELECT id, ref_code, amount, dana_number, status, requested_at, completed_at
       FROM withdrawals
       WHERE user_id = $1
       ORDER BY requested_at DESC
       LIMIT 50`,
      [user.id]
    );

    // Ambil data referral
    const referralCountRes = await query(
      "SELECT COUNT(*)::INT AS count FROM users WHERE referred_by = $1",
      [user.id]
    );
    const referralEarnedRes = await query(
      `SELECT COALESCE(SUM(amount), 0)::BIGINT AS total
       FROM balance_adjustments
       WHERE user_id = $1 AND reason = 'Bonus referral'`,
      [user.id]
    );

    // Ambil riwayat lock
    const locksRes = await query(
      `SELECT id, amount, duration_days, bonus_percent, bonus_amount,
              status, locked_at, unlocks_at, completed_at
       FROM balance_locks
       WHERE user_id = $1
       ORDER BY locked_at DESC
       LIMIT 50`,
      [user.id]
    );

    // Ambil riwayat deposit (tambahan)
    const depositsRes = await query(
      `SELECT id, amount, payment_method, status, admin_note,
              requested_at, processed_at, completed_at
       FROM deposit_requests
       WHERE user_id = $1
       ORDER BY requested_at DESC
       LIMIT 10`,
      [user.id]
    );

    // ================= TAMBAHAN: Status check-in hari ini =================
    const checkinRes = await query(
      "select id from daily_checkins where user_id = $1 and checkin_date = current_date",
      [user.id]
    );
    const checkedInToday = checkinRes.rows.length > 0;

    return Response.json({
      user: {
        email: user.email,
        username: user.username,
        saldo: Number(user.saldo),
        total_locked: totalLocked,
        available_balance: availableBalance,
        token_balance: Number(user.token_balance || 0),
        withdrawable_balance: Number(user.withdrawable_balance || 0),
      },
      tasks: tasksRes.rows,
      submissions: submissionsRes.rows,
      withdrawals: withdrawalsRes.rows,
      referral: {
        count: referralCountRes.rows[0].count,
        earned: Number(referralEarnedRes.rows[0].total),
      },
      locks: locksRes.rows.map((l) => ({
        ...l,
        amount: Number(l.amount),
        bonus_amount: Number(l.bonus_amount),
      })),
      deposits: depositsRes.rows.map((d) => ({
        ...d,
        amount: Number(d.amount),
      })),
      checkedInToday,
    });
  } catch (e) {
    console.error("Error di GET /api/me:", e);
    return Response.json(
      { error: "Gagal memuat data. Cek koneksi database." },
      { status: 500 }
    );
  }
}
