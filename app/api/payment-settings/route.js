import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await query(
      "select bank_info, qris_image_url from payment_settings where id = 1"
    );
    return Response.json({
      bankInfo: res.rows[0]?.bank_info || "",
      qrisImageUrl: res.rows[0]?.qris_image_url || "",
    });
  } catch (e) {
    console.error("Error di GET /api/payment-settings:", e);
    return Response.json({ bankInfo: "", qrisImageUrl: "" });
  }
}
