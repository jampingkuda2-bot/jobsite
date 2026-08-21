// Karakter dipilih supaya gampang dibaca (tanpa 0/O, 1/I yang suka ketuker)
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRefCode(prefix) {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return `${prefix}-${code}`;
}
