import { query } from "@/lib/db";
import { generateOtp, sendOtpEmail } from "@/lib/mailer";
import { sendWhatsappOtp, normalizePhone } from "@/lib/whatsapp";

export async function POST(req) {
  try {
    const { email, otpMethod, phone } = await req.json();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return Response.json({ error: "Email tidak valid" }, { status: 400 });
    }

    const method = otpMethod === "whatsapp" ? "whatsapp" : "email";
    let normalizedPhone = null;
    if (method === "whatsapp") {
      if (!phone || phone.trim().replace(/\D/g, "").length < 9) {
        return Response.json({ error: "Nomor WhatsApp tidak valid" }, { status: 400 });
      }
      normalizedPhone = normalizePhone(phone);
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
      "insert into otp_codes (email, phone, code, purpose, method, expires_at) values ($1, $2, $3, 'register', $4, $5)",
      [email, normalizedPhone, code, method, expiresAt]
    );

    try {
      if (method === "whatsapp") {
        await sendWhatsappOtp(normalizedPhone, code);
      } else {
        await sendOtpEmail(email, code);
      }
    } catch (e) {
      console.error("Gagal kirim OTP:", e);
      return Response.json(
        {
          error:
            method === "whatsapp"
              ? "Gagal mengirim WhatsApp. Cek nomor atau coba lagi."
              : "Gagal mengirim email. Cek konfigurasi Resend/domain pengirim.",
        },
        { status: 500 }
      );
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error("Error di /api/register:", e);
    return Response.json(
      { error: "Terjadi kesalahan server. Cek koneksi database." },
      { status: 500 }
    );
  }
}
