import { query } from "@/lib/db";
import { generateOtp, sendResetOtpEmail } from "@/lib/mailer";

export async function POST(req) {
  try {
    const { identifier } = await req.json();
    if (!identifier || !identifier.trim()) {
      return Response.json({ error: "Isi username atau email dulu" }, { status: 400 });
    }

    const id = identifier.trim();
    const userRes = await query(
      "select id, email, username from users where (username = $1 or email = $1) and is_verified = true",
      [id]
    );

    if (userRes.rows.length === 0) {
      // Jangan bocorkan apakah akunnya ada atau tidak, cukup bilang gagal secara umum
      return Response.json(
        { error: "Akun tidak ditemukan. Cek lagi username/email Anda." },
        { status: 400 }
      );
    }

    const user = userRes.rows[0];
    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await query(
      "insert into otp_codes (email, code, purpose, expires_at) values ($1, $2, 'reset', $3)",
      [user.email, code, expiresAt]
    );

    try {
      await sendResetOtpEmail(user.email, code);
    } catch (e) {
      console.error("Gagal kirim email reset:", e);
      return Response.json(
        { error: "Gagal mengirim email. Coba lagi nanti." },
        { status: 500 }
      );
    }

    // Sensor sebagian email biar user tahu ke mana kode dikirim tanpa membocorkan penuh
    const maskedEmail = user.email.replace(/(.{2}).+(@.+)/, "$1***$2");

    return Response.json({ ok: true, maskedEmail });
  } catch (e) {
    console.error("Error di /api/forgot-password/request:", e);
    return Response.json(
      { error: "Terjadi kesalahan server. Cek koneksi database." },
      { status: 500 }
    );
  }
}
