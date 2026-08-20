import { signSession, setAdminCookie } from "@/lib/auth";

export async function POST(req) {
  const { password } = await req.json();

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: "Password salah" }, { status: 401 });
  }

  const token = signSession({ role: "admin" });
  setAdminCookie(token);

  return Response.json({ ok: true });
}
