import { query } from "@/lib/db";
import { generateOtp, sendOtpEmail } from "@/lib/mailer";

export async function POST(req) {
  const { email } = await req.json();

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return Response.json({ error: "Email tidak valid" }, { status: 400 });
  }

  const existing = await query(
    "select id, is_verified from users where email = $1",
    [email]
  );
  if (existing.rows.length > 0 && existing.rows[0].is_verified) {
    return Response.json(
      { error: "Email sudah terdaftar. Silakan login." },
      { status: 400 }
    );
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await query(
    "insert into otp_codes (email, code, purpose, expires_at) values ($1, $2, 'register', $3)",
    [email, code, expiresAt]
  );

  try {
    await sendOtpEmail(email, code);
  } catch (e) {
    return Response.json(
      { error: "Gagal mengirim email. Coba lagi." },
      { status: 500 }
    );
  }

  return Response.json({ ok: true });
}
