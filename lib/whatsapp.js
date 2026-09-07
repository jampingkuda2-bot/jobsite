const FONNTE_API_URL = "https://api.fonnte.com/send";

// Nomor Indonesia bisa masuk dalam berbagai format (08xx, +628xx, 628xx).
// Fonnte butuh formatnya konsisten (62xx tanpa + / spasi), jadi kita rapikan di sini.
export function normalizePhone(raw) {
  let p = String(raw).replace(/[^0-9]/g, "");
  if (p.startsWith("0")) p = "62" + p.slice(1);
  return p;
}

async function sendWhatsappMessage(target, message) {
  const token = process.env.FONNTE_TOKEN;
  if (!token) throw new Error("FONNTE_TOKEN belum diisi");

  const res = await fetch(FONNTE_API_URL, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ target, message }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status === false) {
    throw new Error(data.reason || data.message || `Fonnte error ${res.status}`);
  }
  return data;
}

export async function sendWhatsappOtp(number, code) {
  const message = `Kode verifikasi Freelance Micro Task kamu: *${code}*\n\nJangan bagikan kode ini ke siapa pun. Berlaku 10 menit.`;
  return sendWhatsappMessage(number, message);
}

// Notifikasi ke 1 nomor WA admin (fixed, bukan per-user)
export async function sendAdminWhatsapp(message) {
  const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
  if (!adminNumber) {
    console.error("ADMIN_WHATSAPP_NUMBER belum diisi, notifikasi WA ke admin dilewati");
    return;
  }
  return sendWhatsappMessage(adminNumber, message);
}
