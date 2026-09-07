import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { signSession, setUserCookie } from "@/lib/auth";

export async function POST(req) {
  const { identifier, password } = await req.json();

  if (!identifier || !password) {
    return Response.json({ error: "Data tidak lengkap" }, { status: 400 });
  }

  const id = identifier.trim();

  const res = await query(
    "select id, password_hash from users where (username = $1 or email = $1) and is_verified = true",
    [id]
  );

  if (res.rows.length === 0) {
    return Response.json({ error: "Username/email atau password salah" }, { status: 400 });
  }

  const user = res.rows[0];
  const match = await bcrypt.compare(password, user.password_hash);

  if (!match) {
    return Response.json({ error: "Username/email atau password salah" }, { status: 400 });
  }

  const token = signSession({ userId: user.id, role: "user" });
  setUserCookie(token);

  return Response.json({ ok: true });
}
