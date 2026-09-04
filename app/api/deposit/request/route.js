import { query } from "@/lib/db";
import { getUserSession } from "@/lib/auth";

export async function POST(req) {
  try {
    const session = await getUserSession();
    if (!session) {
      return Response.json({ error: "Belum login" }, { status: 401 });
    }

    const { amount, paymentMethod, proofUrl } = await req.json();
    const amt = Number(amount);

    if (!amt || amt <= 0) {
      return Response.json({ error: "Jumlah tidak valid" }, { status: 400 });
    }
    if (!paymentMethod) {
      return Response.json({ error: "Metode pembayaran wajib" }, { status: 400 });
    }
    if (!proofUrl) {
      return Response.json({ error: "Bukti transfer wajib diunggah" }, { status: 400 });
    }

    // Insert ke deposit_requests
    const result = await query(
      `INSERT INTO deposit_requests (user_id, amount, payment_method, proof_url, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id`,
      [session.userId, amt, paymentMethod, proofUrl]
    );

    return Response.json({
      ok: true,
      requestId: result.rows[0].id,
      message: "Permintaan deposit dikirim, menunggu verifikasi admin.",
    });
  } catch (e) {
    console.error("Error di /api/deposit/request:", e);
    return Response.json(
      { error: "Gagal mengirim permintaan deposit" },
      { status: 500 }
    );
  }
}
