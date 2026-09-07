import { query } from "@/lib/db";
import { getUserSession } from "@/lib/auth";
import { generateOtp } from "@/lib/mailer";
import { sendWhatsappOtp, normalizePhone } from "@/lib/whatsapp";

export async function POST(req) {
  try {
    const session = await getUserSession();
    if (!session) return Response.json({ error: "Belum login" }, { status: 401 });

    const { action, phone, code } = await req.json();

    if (action === "request") {
      if (!phone || phone.trim().replace(/\D/g, "").length < 9) {
        return Response.json({ error: "Nomor WhatsApp tidak valid" }, { status: 400 });
      }
      const normalized = normalizePhone(phone);
      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await query(
        "insert into otp_codes (phone, code, purpose, method, expires_at) values ($1, $2, 'link-whatsapp', 'whatsapp', $3)",
        [normalized, otp, expiresAt]
      );

      try {
        await sendWhatsappOtp(normalized, otp);
      } catch (e) {
        console.error("Gagal kirim WA OTP:", e.message);
        return Response.json(
          { error: "Gagal mengirim WhatsApp. Cek nomor atau coba lagi." },
          { status: 500 }
        );
      }

      return Response.json({ ok: true });
    }

    if (action === "verify") {
      if (!phone || !code) {
        return Response.json({ error: "Data tidak lengkap" }, { status: 400 });
      }
      const normalized = normalizePhone(phone);

      const otpRes = await query(
        `select id from otp_codes
         where phone = $1 and code = $2 and purpose = 'link-whatsapp'
           and used = false and expires_at > now()
         order by created_at desc limit 1`,
        [normalized, code]
      );
      if (otpRes.rows.length === 0) {
        return Response.json(
          { error: "Kode salah atau sudah kedaluwarsa" },
          { status: 400 }
        );
      }

      await query(
        "update users set whatsapp_number = $1, whatsapp_verified = true where id = $2",
        [normalized, session.userId]
      );
      await query("update otp_codes set used = true where id = $1", [
        otpRes.rows[0].id,
      ]);

      return Response.json({ ok: true, whatsapp_number: normalized });
    }

    return Response.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  } catch (e) {
    console.error("Error di POST /api/profile/whatsapp:", e);
    return Response.json(
      { error: "Gagal memproses. Cek koneksi database." },
      { status: 500 }
    );
  }
}
