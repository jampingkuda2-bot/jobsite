import { clearUserCookie } from "@/lib/auth";

export async function POST() {
  clearUserCookie();
  return Response.json({ ok: true });
}
