import { query } from "@/lib/db";
import { generateOtp, sendOtpEmail } from "@/lib/mailer";
import { signSession, setUserCookie } from "@/lib/auth";

export async function POST(req) {
  try {
    const { action, email, code } = await req.json();

    if (action === "request") {
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        return Response.json({ error: "Email tidak valid" }, { status: 400 });
      }

      const userRes = await query(
        "select id from users where email = $1 and is_verified = true",
        [email]
      );
      if (userRes.rows.length === 0) {
        return Response.json(
          { error: "Email tidak terdaftar" },
          { status: 400 }
        );
      }

      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await query(
        "insert into otp_codes (email, code, purpose, expires_at) values ($1, $2, 'login', $3)",
        [email, otp, expiresAt]
      );

      try {
        await sendOtpEmail(email, otp);
      } catch (e) {
        console.error("Gagal kirim OTP login:", e);
        return Response.json(
          { error: "Gagal mengirim email. Coba lagi nanti." },
          { status: 500 }
        );
      }

      return Response.json({ ok: true });
    }

    if (action === "verify") {
      if (!email || !code) {
        return Response.json({ error: "Data tidak lengkap" }, { status: 400 });
      }

      const otpRes = await query(
        `select id from otp_codes
         where email = $1 and code = $2 and purpose = 'login'
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

      const userRes = await query(
        "select id from users where email = $1 and is_verified = true",
        [email]
      );
      if (userRes.rows.length === 0) {
        return Response.json({ error: "Akun tidak ditemukan" }, { status: 404 });
      }

      await query("update otp_codes set used = true where id = $1", [
        otpRes.rows[0].id,
      ]);

      const token = signSession({ userId: userRes.rows[0].id, role: "user" });
      setUserCookie(token);

      return Response.json({ ok: true });
    }

    return Response.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  } catch (e) {
    console.error("Error di POST /api/login/otp:", e);
    return Response.json(
      { error: "Terjadi kesalahan server. Cek koneksi database." },
      { status: 500 }
    );
  }
}
