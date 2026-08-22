import { query } from "@/lib/db";

export async function GET() {
  try {
    const res = await query(
      "select message, is_active from announcement where id = 1"
    );
    if (res.rows.length === 0 || !res.rows[0].is_active || !res.rows[0].message) {
      return Response.json({ message: null });
    }
    return Response.json({ message: res.rows[0].message });
  } catch (e) {
    console.error("Error di GET /api/announcement:", e);
    // Gagal ambil pengumuman jangan sampai bikin dashboard error, cukup gak tampilkan apa-apa
    return Response.json({ message: null });
  }
}
