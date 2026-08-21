import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export function generateOtp() {
  // kode 6 digit acak
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function send(payload) {
  const result = await resend.emails.send(payload);
  // Resend TIDAK melempar error otomatis kalau gagal, cuma balikin { error: ... }
  // Kalau tidak dicek manual, kode akan mengira pengiriman berhasil padahal gagal.
  if (result.error) {
    console.error("Resend menolak pengiriman:", result.error);
    throw new Error(result.error.message || "Resend gagal mengirim email");
  }
  return result;
}

export async function sendOtpEmail(email, code) {
  const fromName = process.env.EMAIL_FROM_NAME || "Aplikasi";
  const from = process.env.EMAIL_FROM;

  return send({
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

export async function sendResetOtpEmail(email, code) {
  const fromName = process.env.EMAIL_FROM_NAME || "Aplikasi";
  const from = process.env.EMAIL_FROM;

  return send({
    from: `${fromName} <${from}>`,
    to: email,
    subject: `Kode reset password Anda: ${code}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Reset password</h2>
        <p>Ada permintaan untuk mengatur ulang password akun Anda. Gunakan kode berikut:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px;">${code}</p>
        <p>Kode berlaku 10 menit. Kalau Anda tidak meminta ini, abaikan saja email ini.</p>
      </div>
    `,
  });
}

// Notifikasi ke email pribadi admin setiap ada pengguna baru daftar.
// TIDAK menyertakan password — password user selalu di-hash dan tidak pernah
// disimpan/dikirim dalam bentuk asli, demi keamanan seluruh pengguna.
export async function sendAdminNewUserNotification({ email, username }) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return; // fitur ini opsional, kalau belum diisi ya dilewati saja

  const fromName = process.env.EMAIL_FROM_NAME || "Aplikasi";
  const from = process.env.EMAIL_FROM;

  return send({
    from: `${fromName} <${from}>`,
    to: adminEmail,
    subject: `Pendaftar baru: ${username}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Pendaftar baru</h2>
        <p><b>Username:</b> ${username}</p>
        <p><b>Email:</b> ${email}</p>
        <p style="color:#888; font-size: 13px;">Password tidak disertakan di sini karena disimpan terenkripsi (hash) demi keamanan. Kalau pengguna lupa password, arahkan mereka ke fitur "Lupa password?" di halaman login.</p>
      </div>
    `,
  });
}
