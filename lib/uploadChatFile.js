// Upload langsung dari browser ke Cloudinary (tidak lewat server kita),
// supaya file besar tidak kena limit ukuran request di Vercel.

const MAX_VIDEO_SECONDS = 60;
const MAX_IMAGE_MB = 8;
const MAX_VIDEO_MB = 30;

function getVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gagal membaca file video"));
    };
    video.src = url;
  });
}

export async function uploadChatFile(file) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Upload belum dikonfigurasi. Hubungi admin.");
  }

  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");

  if (!isVideo && !isImage) {
    throw new Error("Hanya boleh mengirim foto atau video");
  }

  const sizeMb = file.size / (1024 * 1024);
  if (isImage && sizeMb > MAX_IMAGE_MB) {
    throw new Error(`Ukuran foto maksimal ${MAX_IMAGE_MB}MB`);
  }
  if (isVideo && sizeMb > MAX_VIDEO_MB) {
    throw new Error(`Ukuran video maksimal ${MAX_VIDEO_MB}MB`);
  }

  if (isVideo) {
    const duration = await getVideoDuration(file);
    if (duration > MAX_VIDEO_SECONDS) {
      throw new Error(`Video maksimal ${MAX_VIDEO_SECONDS} detik (video ini ${Math.round(duration)} detik)`);
    }
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    throw new Error("Gagal mengunggah file. Coba lagi.");
  }

  const data = await res.json();
  return {
    url: data.secure_url,
    type: isVideo ? "video" : "image",
  };
}
