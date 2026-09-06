// Upload foto profil langsung dari browser ke Cloudinary (unsigned upload),
// pakai cloud name & upload preset yang sama dengan uploadChatFile.js.

const MAX_IMAGE_MB = 5;

export async function uploadProfilePhoto(file) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Upload belum dikonfigurasi. Hubungi admin.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Hanya boleh mengunggah foto");
  }

  const sizeMb = file.size / (1024 * 1024);
  if (sizeMb > MAX_IMAGE_MB) {
    throw new Error(`Ukuran foto maksimal ${MAX_IMAGE_MB}MB`);
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    throw new Error("Gagal mengunggah foto. Coba lagi.");
  }

  const data = await res.json();
  return data.secure_url;
}
