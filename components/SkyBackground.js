"use client";

import { useEffect, useState } from "react";

// Background langit yang berubah warna & elemen (matahari/bulan/bintang/awan)
// sesuai jam lokal HP user. Murni CSS + sedikit JS, tanpa library tambahan,
// jadi ringan dan gak bikin lag di HP.

function getSkyPhase(hour) {
  // hour: 0-23.99
  if (hour >= 5 && hour < 7) return "dawn";      // subuh/fajar
  if (hour >= 7 && hour < 17) return "day";      // siang
  if (hour >= 17 && hour < 19) return "dusk";    // senja
  return "night";                                 // malam
}

const GRADIENTS = {
  dawn: "linear-gradient(180deg, #2b3a55 0%, #7d6b8f 35%, #e8a87c 70%, #f4c896 100%)",
  day: "linear-gradient(180deg, #1a2f2a 0%, #16332b 50%, #0f1614 100%)",
  dusk: "linear-gradient(180deg, #1a1830 0%, #5a3a5c 35%, #c9714f 70%, #e8a05a 100%)",
  night: "linear-gradient(180deg, #05070a 0%, #0a1210 55%, #0f1614 100%)",
};

export default function SkyBackground() {
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!now) return null;

  const hour = now.getHours() + now.getMinutes() / 60;
  const phase = getSkyPhase(hour);
  const isNight = phase === "night";
  const isDaylight = phase === "day" || phase === "dawn" || phase === "dusk";

  // Posisi matahari: bergerak dari kiri ke kanan antara jam 6 pagi - 6 sore
  // Posisi bulan: bergerak dari kiri ke kanan antara jam 6 sore - 6 pagi
  let sunProgress = null;
  let moonProgress = null;
  if (hour >= 6 && hour <= 18) {
    sunProgress = (hour - 6) / 12;
  } else {
    const nightHour = hour > 18 ? hour - 18 : hour + 6;
    moonProgress = nightHour / 12;
  }

  function arcPosition(progress) {
    const left = progress * 100;
    const top = 65 - Math.sin(progress * Math.PI) * 55;
    return { left: `${left}%`, top: `${top}%` };
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        overflow: "hidden",
        background: GRADIENTS[phase],
        transition: "background 3s ease",
      }}
    >
      {/* Bintang, cuma malam */}
      {isNight && (
        <div className="sky-stars" style={{ position: "absolute", inset: 0 }} />
      )}

      {/* Matahari */}
      {sunProgress !== null && (
        <div
          style={{
            position: "absolute",
            ...arcPosition(sunProgress),
            width: 46,
            height: 46,
            marginLeft: -23,
            marginTop: -23,
            borderRadius: "50%",
            background: "radial-gradient(circle, #fff3c4 0%, #ffd76a 55%, rgba(255,215,106,0) 75%)",
            boxShadow: "0 0 40px 12px rgba(255, 215, 106, 0.35)",
            transition: "left 3s linear, top 3s linear",
          }}
        />
      )}

      {/* Bulan */}
      {moonProgress !== null && (
        <div
          style={{
            position: "absolute",
            ...arcPosition(moonProgress),
            width: 34,
            height: 34,
            marginLeft: -17,
            marginTop: -17,
            borderRadius: "50%",
            background: "radial-gradient(circle at 35% 35%, #f5f6f0 0%, #cfd3d8 60%, rgba(207,211,216,0) 78%)",
            boxShadow: "0 0 24px 6px rgba(230, 234, 240, 0.25)",
            transition: "left 3s linear, top 3s linear",
          }}
        />
      )}

      {/* Awan, lebih kelihatan siang, samar-samar malam */}
      <div
        className="sky-cloud"
        style={{
          top: "18%",
          animationDuration: "70s",
          opacity: isDaylight ? 0.5 : 0.12,
        }}
      />
      <div
        className="sky-cloud"
        style={{
          top: "32%",
          animationDuration: "95s",
          animationDelay: "-30s",
          opacity: isDaylight ? 0.35 : 0.08,
        }}
      />
      <div
        className="sky-cloud"
        style={{
          top: "10%",
          animationDuration: "120s",
          animationDelay: "-60s",
          opacity: isDaylight ? 0.3 : 0.06,
        }}
      />
    </div>
  );
}
