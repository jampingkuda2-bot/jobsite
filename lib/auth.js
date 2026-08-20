import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const SECRET = process.env.JWT_SECRET;

export function signSession(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: "30d" });
}

export function verifySession(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

export function setUserCookie(token) {
  cookies().set("session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function setAdminCookie(token) {
  cookies().set("admin_session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearUserCookie() {
  cookies().set("session", "", { path: "/", maxAge: 0 });
}

export function clearAdminCookie() {
  cookies().set("admin_session", "", { path: "/", maxAge: 0 });
}

export function getUserSession() {
  const token = cookies().get("session")?.value;
  if (!token) return null;
  return verifySession(token);
}

export function getAdminSession() {
  const token = cookies().get("admin_session")?.value;
  if (!token) return null;
  const data = verifySession(token);
  if (!data || data.role !== "admin") return null;
  return data;
}
