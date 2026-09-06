import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { getUserSession } from "@/lib/auth";

export async function POST(req) {
  try {
    const session = await getUserSession();
    if (!session) return Response.json({ error: "Belum login" }, { status: 401 });

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return Response.json({ error: "Data tidak lengkap" }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return Response.json(
        { error: "Password baru minimal 6 karakter" },
        { status: 400 }
      );
    }

    const userRes = await query(
      "select password_hash from users where id = $1",
      [session.userId]
    );
    if (userRes.rows.length === 0) {
      return Response.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    const match = await bcrypt.compare(
      currentPassword,
      userRes.rows[0].password_hash
    );
    if (!match) {
      return Response.json(
        { error: "Password saat ini salah" },
        { status: 400 }
      );
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await query("update users set password_hash = $1 where id = $2", [
      hash,
      session.userId,
    ]);

    return Response.json({ ok: true });
  } catch (e) {
    console.error("Error di POST /api/profile/password:", e);
    return Response.json(
      { error: "Gagal mengganti password. Cek koneksi database." },
      { status: 500 }
    );
  }
}
