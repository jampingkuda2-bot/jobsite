import webpush from "web-push";
import { query } from "@/lib/db";
import { sendAdminWhatsapp } from "@/lib/whatsapp";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@riohoki.my.id",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function sendToSubscriptions(subs, payload) {
  const json = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          json
        );
      } catch (err) {
        // Kalau subscription-nya udah nggak valid (browser unsubscribe/uninstall), hapus dari DB
        if (err.statusCode === 410 || err.statusCode === 404) {
          await query("delete from push_subscriptions where endpoint = $1", [sub.endpoint]);
        } else {
          console.error("Gagal kirim push notification:", err.message);
        }
      }
    })
  );
}

export async function sendPushToUser(userId, payload) {
  const res = await query(
    "select endpoint, p256dh, auth from push_subscriptions where user_id = $1 and is_admin = false",
    [userId]
  );
  await sendToSubscriptions(res.rows, payload);
}

export async function sendPushToAllUsers(payload) {
  const res = await query(
    "select endpoint, p256dh, auth from push_subscriptions where is_admin = false"
  );
  await sendToSubscriptions(res.rows, payload);
}

export async function sendPushToAdmin(payload) {
  const res = await query(
    "select endpoint, p256dh, auth from push_subscriptions where is_admin = true"
  );
  await sendToSubscriptions(res.rows, payload);

  // Kirim juga ke WhatsApp admin (1 nomor tetap), best-effort — gagal di sini
  // tidak menggagalkan push notification yang sudah terkirim di atas.
  try {
    await sendAdminWhatsapp(`*${payload.title}*\n${payload.body}`);
  } catch (e) {
    console.error("Gagal kirim WA ke admin:", e.message);
  }
}
