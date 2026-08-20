import { clearAdminCookie } from "@/lib/auth";

export async function POST() {
  clearAdminCookie();
  return Response.json({ ok: true });
}
