"use client";

import { useEffect, useRef, useState } from "react";

export default function SkyBackground() {
  const canvasRef = useRef(null);
  const [time, setTime] = useState(new Date());

  // Update waktu tiap 10 detik biar animasi bergerak pelan
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let w, h;
    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    // Data bintang (statis, biar gak berkedip-kedip)
    const stars = [];
    for (let i = 0; i < 150; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random() * 0.8,
        size: Math.random() * 1.8 + 0.5,
        opacity: Math.random() * 0.7 + 0.3,
      });
    }

    function draw() {
      const hours = time.getHours();
      const minutes = time.getMinutes();
      const totalMinutes = hours * 60 + minutes;

      // Progress hari: 0 = tengah malam, 0.5 = siang, 1 = tengah malam lagi
      const dayProgress = totalMinutes / (24 * 60);

      // ========== WARNA LANGIT ==========
      let topColor, bottomColor;

      if (dayProgress >= 0.2 && dayProgress < 0.35) {
        // Subuh (05.00 - 08.30): ungu ke jingga
        const t = (dayProgress - 0.2) / 0.15;
        topColor = [30, 20, 60];
        bottomColor = [200, 120, 80];
      } else if (dayProgress >= 0.35 && dayProgress < 0.65) {
        // Siang (08.30 - 15.30): biru cerah
        const t = (dayProgress - 0.35) / 0.3;
        topColor = [30, 80, 120];
        bottomColor = [60, 140, 180];
      } else if (dayProgress >= 0.65 && dayProgress < 0.8) {
        // Sore (15.30 - 19.00): jingga ke merah
        const t = (dayProgress - 0.65) / 0.15;
        topColor = [120, 60, 80];
        bottomColor = [220, 120, 60];
      } else {
        // Malam (19.00 - 05.00): gelap pekat
        topColor = [5, 5, 15];
        bottomColor = [10, 15, 20];
      }

      // Gambar gradien langit
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, `rgb(${topColor[0]},${topColor[1]},${topColor[2]})`);
      grad.addColorStop(1, `rgb(${bottomColor[0]},${bottomColor[1]},${bottomColor[2]})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // ========== BINTANG (Cuma Malam) ==========
      const isNight = dayProgress < 0.2 || dayProgress > 0.8;
      if (isNight) {
        stars.forEach((star) => {
          const x = star.x * w;
          const y = star.y * h;
          ctx.beginPath();
          ctx.arc(x, y, star.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${star.opacity * 0.9})`;
          ctx.fill();
        });
      }

      // ========== MATAHARI (06.00 - 18.00) ==========
      let sunAngle = 0;
      if (dayProgress >= 0.25 && dayProgress < 0.75) {
        // Matahari terbit jam 06.00 (25%) sampai tenggelam 18.00 (75%)
        sunAngle = ((dayProgress - 0.25) / 0.5) * Math.PI;
      } else if (dayProgress >= 0.75) {
        sunAngle = Math.PI;
      } else {
        sunAngle = 0;
      }

      const sunX = w * 0.05 + w * 0.9 * (0.5 - 0.5 * Math.cos(sunAngle));
      const sunY = h * 0.85 - h * 0.7 * Math.sin(sunAngle);
      const sunRadius = Math.min(w, h) * 0.04;

      if (sunAngle > 0.05 && sunAngle < Math.PI - 0.05) {
        // Glow matahari
        const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius * 6);
        glow.addColorStop(0, "rgba(255,220,100,0.4)");
        glow.addColorStop(0.5, "rgba(255,180,60,0.15)");
        glow.addColorStop(1, "rgba(255,180,60,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius * 6, 0, Math.PI * 2);
        ctx.fill();

        // Matahari
        ctx.shadowColor = "rgba(255,200,100,0.5)";
        ctx.shadowBlur = 40;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#FFD580";
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // ========== BULAN (18.00 - 06.00) ==========
      let moonAngle = 0;
      if (dayProgress < 0.25 || dayProgress >= 0.75) {
        // Bulan muncul jam 18.00 (75%) sampai 06.00 (25% + 1 hari)
        if (dayProgress >= 0.75) {
          moonAngle = ((dayProgress - 0.75) / 0.25) * Math.PI;
        } else {
          moonAngle = ((dayProgress + 0.25) / 0.5) * Math.PI;
        }
      }

      const moonX = w * 0.05 + w * 0.9 * (0.5 - 0.5 * Math.cos(moonAngle));
      const moonY = h * 0.85 - h * 0.7 * Math.sin(moonAngle);
      const moonRadius = Math.min(w, h) * 0.028;

      if (moonAngle > 0.05 && moonAngle < Math.PI - 0.05) {
        // Glow bulan
        const glow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonRadius * 5);
        glow.addColorStop(0, "rgba(200,210,230,0.2)");
        glow.addColorStop(1, "rgba(200,210,230,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonRadius * 5, 0, Math.PI * 2);
        ctx.fill();

        // Bulan
        ctx.shadowColor = "rgba(200,210,230,0.2)";
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#E8E8F0";
        ctx.fill();

        // Efek sabit (bayangan gelap di sisi)
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(moonX + moonRadius * 0.3, moonY - moonRadius * 0.2, moonRadius * 0.75, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,0,0,0.25)`;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // ========== AWAN (selalu ada, transparan) ==========
      const drawCloud = (cx, cy, scale, opacity) => {
        ctx.fillStyle = `rgba(255,255,255,${opacity})`;
        ctx.filter = "blur(10px)";
        ctx.beginPath();
        ctx.arc(cx, cy, 45 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 40 * scale, cy - 18 * scale, 40 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx - 35 * scale, cy - 12 * scale, 35 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.filter = "none";
      };

      const cloudOpacity = isNight ? 0.05 : 0.12;
      drawCloud(w * 0.15, h * 0.22, 1.0, cloudOpacity);
      drawCloud(w * 0.55, h * 0.28, 0.8, cloudOpacity);
      drawCloud(w * 0.85, h * 0.18, 0.9, cloudOpacity);

      requestAnimationFrame(draw);
    }

    draw();

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, [time]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -1,
        pointerEvents: "none",
      }}
    />
  );
}
