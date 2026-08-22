import { query } from "@/lib/db";

// Paksa route ini selalu jalan ulang tiap request (bukan di-cache statis),
// karena tidak ada pengecekan cookie/login di sini yang biasanya otomatis
// memicu mode dinamis di Next.js.
export const dynamic = "force-dynamic";

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
    return Response.json({ message: null });
  }
}
