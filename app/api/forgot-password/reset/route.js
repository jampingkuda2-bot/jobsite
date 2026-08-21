import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

export async function POST(req) {
  try {
    const { identifier, code, newPassword } = await req.json();

    if (!identifier || !code || !newPassword) {
      return Response.json({ error: "Data tidak lengkap" }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return Response.json(
        { error: "Password minimal 6 karakter" },
        { status: 400 }
      );
    }

    const userRes = await query(
      "select id, email from users where username = $1 or email = $1",
      [identifier.trim()]
    );
    if (userRes.rows.length === 0) {
      return Response.json({ error: "Akun tidak ditemukan" }, { status: 400 });
    }
    const user = userRes.rows[0];

    const otpRes = await query(
      `select id from otp_codes
       where email = $1 and code = $2 and purpose = 'reset'
         and used = false and expires_at > now()
       order by created_at desc limit 1`,
      [user.email, code]
    );
    if (otpRes.rows.length === 0) {
      return Response.json(
        { error: "Kode salah atau sudah kedaluwarsa" },
        { status: 400 }
      );
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await query("update users set password_hash = $1 where id = $2", [
      hash,
      user.id,
    ]);
    await query("update otp_codes set used = true where id = $1", [
      otpRes.rows[0].id,
    ]);

    return Response.json({ ok: true });
  } catch (e) {
    console.error("Error di /api/forgot-password/reset:", e);
    return Response.json(
      { error: "Terjadi kesalahan server. Cek koneksi database." },
      { status: 500 }
    );
  }
}
