import { query } from "@/lib/db";
import { getUserSession } from "@/lib/auth";

export async function POST(req) {
  try {
    const session = await getUserSession();
    if (!session) return Response.json({ error: "Belum login" }, { status: 401 });

    const { username, photoUrl } = await req.json();

    if (username !== undefined) {
      const trimmed = String(username).trim();
      if (trimmed.length < 3) {
        return Response.json(
          { error: "Username minimal 3 karakter" },
          { status: 400 }
        );
      }
      if (!/^[a-z0-9_]+$/.test(trimmed)) {
        return Response.json(
          { error: "Username cuma boleh huruf kecil, angka, dan underscore, tanpa spasi" },
          { status: 400 }
        );
      }

      const taken = await query(
        "select id from users where username = $1 and id != $2",
        [trimmed, session.userId]
      );
      if (taken.rows.length > 0) {
        return Response.json({ error: "Username sudah dipakai" }, { status: 400 });
      }

      await query("update users set username = $1 where id = $2", [
        trimmed,
        session.userId,
      ]);
    }

    if (photoUrl !== undefined) {
      await query("update users set photo_url = $1 where id = $2", [
        photoUrl,
        session.userId,
      ]);
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error("Error di POST /api/profile:", e);
    return Response.json(
      { error: "Gagal menyimpan profil. Cek koneksi database." },
      { status: 500 }
    );
  }
}
