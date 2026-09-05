// Balasan otomatis chat pakai AI: Gemini (utama, gratis) dengan cadangan Groq
// kalau Gemini kena limit/error. Keduanya gratis, tidak perlu kartu kredit.

const SITE_CONTEXT = `Kamu adalah asisten chat untuk platform microtask "Freelance Micro Task" (riohoki.my.id).
Aturan platform:
- User daftar, kerjakan tugas kecil (misal buat akun, dll), kirim bukti (screenshot/video kalau diminta task-nya), lalu tunggu admin approve.
- Setelah disetujui admin, saldo bertambah sesuai imbalan tugas.
- Saldo bisa ditarik ke DANA (tanpa minimum), atau dikunci 30/90/365 hari untuk dapat bonus penyelesaian sekali cair + badge (Perak/Emas/Platinum).
- Ada program ajak teman: dapat Rp800 kalau orang yang diajak menyelesaikan tugas pertamanya.
- Ada check-in harian untuk dapat saldo kecil, syaratnya harus sudah kerjakan minimal 1 tugas di hari itu.
- Kalau user tanya soal ketersediaan tugas, jelaskan tugas baru muncul kalau admin mengaktifkannya, sarankan cek dashboard secara berkala.
- Kalau pertanyaannya butuh keputusan manual (approve/reject tugas, penarikan spesifik, komplain) atau di luar hal-hal di atas, bilang dengan sopan bahwa admin asli akan segera membalas.
Jawab singkat (maksimal 3-4 kalimat), ramah, pakai Bahasa Indonesia santai. Jangan mengarang kebijakan yang tidak disebutkan di atas.`;

async function callGemini(history) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY belum diisi");

  const contents = history.map((m) => ({
    role: m.sender === "user" ? "user" : "model",
    parts: [{ text: m.message || "(lampiran)" }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SITE_CONTEXT }] },
        contents,
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini tidak mengembalikan teks");
  return text.trim();
}

async function callGroq(history) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY belum diisi");

  const messages = [
    { role: "system", content: SITE_CONTEXT },
    ...history.map((m) => ({
      role: m.sender === "user" ? "user" : "assistant",
      content: m.message || "(lampiran)",
    })),
  ];

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      max_tokens: 300,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Groq error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq tidak mengembalikan teks");
  return text.trim();
}

// history: array {sender: 'user'|'admin'|'ai', message: string}, urut dari lama ke baru
export async function generateAiReply(history) {
  try {
    return await callGemini(history);
  } catch (e) {
    console.error("Gemini gagal, coba Groq sebagai cadangan:", e.message);
    return await callGroq(history);
  }
}
