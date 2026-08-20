import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export function generateOtp() {
  // kode 6 digit acak
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function sendOtpEmail(email, code) {
  const fromName = process.env.EMAIL_FROM_NAME || "Aplikasi";
  const from = process.env.EMAIL_FROM;

  await resend.emails.send({
    from: `${fromName} <${from}>`,
    to: email,
    subject: `Kode verifikasi Anda: ${code}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Kode verifikasi</h2>
        <p>Gunakan kode berikut untuk melanjutkan pendaftaran:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px;">${code}</p>
        <p>Kode berlaku 10 menit. Jangan bagikan kode ini ke siapa pun.</p>
      </div>
    `,
  });
}
