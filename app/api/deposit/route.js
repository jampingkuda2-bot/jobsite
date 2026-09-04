import { query } from "@/lib/db";
import { getUserSession } from "@/lib/auth";

export async function POST(req) {
  try {
    const session = getUserSession();
    if (!session) return Response.json({ error: "Belum login" }, { status: 401 });

    const { amountIdr, proofUrl } = await req.json();
    const amt = Math.floor(Number(amountIdr));

    if (!amt || amt <= 0) {
      return Response.json({ error: "Jumlah tidak valid" }, { status: 400 });
    }
    if (!proofUrl) {
      return Response.json({ error: "Wajib upload bukti transfer" }, { status: 400 });
    }

    await query(
      "insert into token_deposits (user_id, amount_idr, proof_url, status) values ($1, $2, $3, 'pending')",
      [session.userId, amt, proofUrl]
    );

    return Response.json({ ok: true });
  } catch (e) {
    console.error("Error di /api/deposit:", e);
    return Response.json(
      { error: "Terjadi kesalahan server. Cek koneksi database." },
      { status: 500 }
    );
  }
}
