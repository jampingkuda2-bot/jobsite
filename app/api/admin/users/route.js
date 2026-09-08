import { query } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET(req) {
  try {
    const admin = await getAdminSession();
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    const res = await query(
      `SELECT 
        u.id,
        u.email,
        u.username,
        u.created_at,
        -- Total saldo (sumber tunggal: users.saldo, sama kayak yang dipakai
        -- dashboard user, fitur kunci saldo, approval tugas, dan penarikan)
        COALESCE(u.saldo, 0) AS total_balance,
        -- Saldo terkunci aktif
        COALESCE((
          SELECT SUM(amount) 
          FROM balance_locks 
          WHERE user_id = u.id AND status = 'active'
        ), 0) AS locked_balance,
        -- Saldo tersedia = saldo - terkunci (rumus sama persis kayak /api/me)
        COALESCE(u.saldo, 0) 
        - COALESCE((
          SELECT SUM(amount) 
          FROM balance_locks 
          WHERE user_id = u.id AND status = 'active'
        ), 0) AS available_balance,
        -- Total deposit disetujui (info tambahan, saldo token terpisah)
        COALESCE((
          SELECT SUM(amount) 
          FROM deposit_requests 
          WHERE user_id = u.id AND status = 'approved'
        ), 0) AS total_deposit,
        -- Total reward dari tugas disetujui
        COALESCE((
          SELECT SUM(t.reward)
          FROM task_submissions s
          JOIN tasks t ON t.id = s.task_id
          WHERE s.user_id = u.id AND s.status = 'approved'
        ), 0) AS total_earned,
        -- Total bonus referral
        COALESCE((
          SELECT SUM(amount)
          FROM balance_adjustments
          WHERE user_id = u.id AND reason = 'Bonus referral'
        ), 0) AS referral_bonus,
        -- Total penarikan selesai
        COALESCE((
          SELECT SUM(amount) 
          FROM withdrawals 
          WHERE user_id = u.id AND status = 'done'
        ), 0) AS total_withdrawn,
        -- Jumlah lock aktif
        COALESCE((
          SELECT COUNT(*) 
          FROM balance_locks 
          WHERE user_id = u.id AND status = 'active'
        ), 0) AS active_locks_count
       FROM users u
       WHERE u.username ILIKE $1 OR u.email ILIKE $1
       ORDER BY u.created_at DESC
       LIMIT 200`,
      [`%${q}%`]
    );

    return Response.json({
      users: res.rows.map((u) => ({
        ...u,
        total_balance: Number(u.total_balance),
        locked_balance: Number(u.locked_balance),
        available_balance: Number(u.available_balance),
        total_deposit: Number(u.total_deposit),
        total_earned: Number(u.total_earned),
        referral_bonus: Number(u.referral_bonus),
        total_withdrawn: Number(u.total_withdrawn),
        active_locks_count: Number(u.active_locks_count),
      })),
    });
  } catch (e) {
    console.error("Error di GET /api/admin/users:", e);
    return Response.json({ error: "Gagal memuat data. Cek koneksi database." }, { status: 500 });
  }
}

// Tambah atau kurangi saldo user secara manual
export async function POST(req) {
  try {
    const admin = await getAdminSession();
    if (!admin) return Response.json({ error: "Tidak diizinkan" }, { status: 401 });

    const { userId, amount, reason } = await req.json();
    const amt = Number(amount);

    if (!userId || !amt) {
      return Response.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    // Cek user
    const userRes = await query("SELECT saldo FROM users WHERE id = $1", [userId]);
    if (userRes.rows.length === 0) {
      return Response.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    // PENTING: sesuaikan users.saldo, kolom yang sama dipakai dashboard user,
    // fitur kunci saldo, approval tugas, dan penarikan (bukan withdrawable_balance)
    const currentBalance = Number(userRes.rows[0].saldo);
    const newBalance = currentBalance + amt;

    if (newBalance < 0) {
      return Response.json({ error: "Saldo tidak boleh minus" }, { status: 400 });
    }

    await query(
      "UPDATE users SET saldo = $1 WHERE id = $2",
      [newBalance, userId]
    );
    await query(
      "INSERT INTO balance_adjustments (user_id, amount, reason) VALUES ($1, $2, $3)",
      [userId, amt, reason || `Admin adjustment: ${reason || "Manual"}`]
    );

    return Response.json({ ok: true, saldo: newBalance });
  } catch (e) {
    console.error("Error di POST /api/admin/users:", e);
    return Response.json({ error: "Gagal menyimpan. Cek koneksi database." }, { status: 500 });
  }
}
