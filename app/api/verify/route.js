import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { signSession, setUserCookie } from "@/lib/auth";
import { sendAdminNewUserNotification } from "@/lib/mailer";

export async function POST(req) {
  try {
  const { email, code, username, password, referralCode } = await req.json();

  if (!email || !code) {
    return Response.json({ error: "Data tidak lengkap" }, { status: 400 });
  }

  const otpRes = await query(
    `select id from otp_codes
     where email = $1 and code = $2 and purpose = 'register'
       and used = false and expires_at > now()
     order by created_at desc limit 1`,
    [email, code]
  );

  if (otpRes.rows.length === 0) {
    return Response.json(
      { error: "Kode salah atau sudah kedaluwarsa" },
      { status: 400 }
    );
  }

  // Tahap 1: baru verifikasi kode saja (username & password belum dikirim)
  if (!username || !password) {
    return Response.json({ ok: true, step: "set-credentials" });
  }

  if (username.length < 3 || password.length < 6) {
    return Response.json(
      { error: "Username minimal 3 karakter, password minimal 6 karakter" },
      { status: 400 }
    );
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    return Response.json(
      { error: "Username cuma boleh huruf kecil, angka, dan underscore, tanpa spasi" },
      { status: 400 }
    );
  }

  const usernameTaken = await query(
    "select id from users where username = $1",
    [username]
  );
  if (usernameTaken.rows.length > 0) {
    return Response.json({ error: "Username sudah dipakai" }, { status: 400 });
  }

  // Kalau ada kode referral, cari pemiliknya (kode referral = username pengajak)
  let referredBy = null;
  if (referralCode && referralCode.trim()) {
    const refCode = referralCode.trim();
    if (refCode.toLowerCase() === username.toLowerCase()) {
      return Response.json(
        { error: "Tidak bisa memakai kode referral sendiri" },
        { status: 400 }
      );
    }
    const refUser = await query("select id from users where username = $1", [refCode]);
    if (refUser.rows.length === 0) {
      return Response.json(
        { error: `Kode referral "${refCode}" tidak ditemukan` },
        { status: 400 }
      );
    }
    referredBy = refUser.rows[0].id;
  }

  const hash = await bcrypt.hash(password, 10);

  const existing = await query("select id from users where email = $1", [
    email,
  ]);

  let userId;
  if (existing.rows.length > 0) {
    userId = existing.rows[0].id;
    await query(
      "update users set username = $1, password_hash = $2, is_verified = true, referred_by = coalesce(referred_by, $4) where id = $3",
      [username, hash, userId, referredBy]
    );
  } else {
    const inserted = await query(
      `insert into users (email, username, password_hash, is_verified, referred_by)
       values ($1, $2, $3, true, $4) returning id`,
      [email, username, hash, referredBy]
    );
    userId = inserted.rows[0].id;
  }

  await query("update otp_codes set used = true where id = $1", [
    otpRes.rows[0].id,
  ]);

  const token = signSession({ userId, role: "user" });
  setUserCookie(token);

  // Kirim notifikasi ke email admin (opsional, gagal kirim tidak menggagalkan pendaftaran)
  try {
    await sendAdminNewUserNotification({ email, username });
  } catch (e) {
    console.error("Gagal kirim notifikasi admin (diabaikan):", e);
  }

  return Response.json({ ok: true, step: "done" });
  } catch (e) {
    console.error("Error di /api/verify:", e);
    return Response.json(
      { error: "Terjadi kesalahan server. Cek koneksi database." },
      { status: 500 }
    );
  }
}
