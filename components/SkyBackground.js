"use client";

import { useEffect, useRef, useState, useMemo } from "react";

export default function SkyBackground() {
  const canvasRef = useRef(null);
  const [time, setTime] = useState(new Date());

  // Update tiap detik biar animasi halus
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Generate bintang (hitung sekali)
  const stars = useMemo(() => {
    const s = [];
    for (let i = 0; i < 180; i++) {
      s.push({
        x: Math.random(),
        y: Math.random() * 0.8 + 0.1,
        size: Math.random() * 2.2 + 0.3,
        speed: 0.5 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return s;
  }, []);

  // Awan (posisi & kecepatan)
  const clouds = useMemo(() => {
    return [
      { x: 0.1, y: 0.20, w: 180, h: 40, speed: 0.015, opacity: 0.25 },
      { x: 0.5, y: 0.30, w: 220, h: 50, speed: 0.01, opacity: 0.20 },
      { x: 0.8, y: 0.15, w: 200, h: 45, speed: 0.02, opacity: 0.18 },
      { x: 0.3, y: 0.45, w: 160, h: 35, speed: 0.012, opacity: 0.12 },
    ];
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let w, h;
    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Interpolasi warna linear
    function lerpColor(c1, c2, t) {
      return [
        Math.round(c1[0] + (c2[0] - c1[0]) * t),
        Math.round(c1[1] + (c2[1] - c1[1]) * t),
        Math.round(c1[2] + (c2[2] - c1[2]) * t),
      ];
    }

    function draw() {
      const hours = time.getHours();
      const minutes = time.getMinutes();
      const totalMinutes = hours * 60 + minutes;
      const dayProgress = totalMinutes / (24 * 60); // 0..1

      // ===================== WARNA LANGIT (SMOOTH) =====================
      // Definisikan 5 titik warna: [progress, topColor, bottomColor]
      const colorPoints = [
        // [progress, topR,G,B, bottomR,G,B]
        { p: 0.00, top: [3, 3, 12], bottom: [6, 8, 16] },     // tengah malam
        { p: 0.20, top: [15, 10, 40], bottom: [40, 25, 60] },  // subuh (04:48)
        { p: 0.30, top: [80, 60, 120], bottom: [180, 100, 80] }, // sunrise (07:12)
        { p: 0.40, top: [40, 100, 160], bottom: [80, 170, 200] }, // pagi (09:36)
        { p: 0.55, top: [20, 80, 150], bottom: [60, 150, 190] }, // siang (13:12)
        { p: 0.70, top: [100, 70, 110], bottom: [200, 130, 80] }, // sunset (16:48)
        { p: 0.80, top: [50, 30, 70], bottom: [120, 60, 50] },  // senja (19:12)
        { p: 0.90, top: [10, 8, 25], bottom: [20, 15, 30] },    // malam awal (21:36)
        { p: 1.00, top: [3, 3, 12], bottom: [6, 8, 16] },       // tengah malam
      ];

      // Cari segmen warna
      let c1 = colorPoints[0];
      let c2 = colorPoints[colorPoints.length - 1];
      for (let i = 0; i < colorPoints.length - 1; i++) {
        if (dayProgress >= colorPoints[i].p && dayProgress < colorPoints[i + 1].p) {
          c1 = colorPoints[i];
          c2 = colorPoints[i + 1];
          break;
        }
      }
      const tSegment = (dayProgress - c1.p) / (c2.p - c1.p + 0.0001);
      const topColor = lerpColor(c1.top, c2.top, tSegment);
      const bottomColor = lerpColor(c1.bottom, c2.bottom, tSegment);

      // Gambar gradien langit
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, `rgb(${topColor[0]},${topColor[1]},${topColor[2]})`);
      grad.addColorStop(1, `rgb(${bottomColor[0]},${bottomColor[1]},${bottomColor[2]})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // ===================== BINTANG =====================
      const isNight = dayProgress < 0.22 || dayProgress > 0.78;
      const starBrightness = isNight ? 1 : 0.2;

      stars.forEach((star) => {
        const x = star.x * w;
        const y = star.y * h;
        const twinkle = 0.6 + 0.4 * Math.sin(time.getTime() / 1000 * star.speed + star.phase);
        const size = star.size * (0.8 + 0.2 * twinkle);
        const opacity = starBrightness * (0.4 + 0.6 * twinkle);
        if (opacity > 0.05) {
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${opacity})`;
          ctx.fill();
          // Efek glow bintang
          if (star.size > 1.5) {
            ctx.shadowColor = `rgba(255,255,255,${opacity * 0.3})`;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      });

      // ===================== MATAHARI =====================
      let sunAngle = 0;
      if (dayProgress >= 0.22 && dayProgress < 0.78) {
        sunAngle = ((dayProgress - 0.22) / 0.56) * Math.PI;
      } else if (dayProgress >= 0.78) {
        sunAngle = Math.PI;
      } else {
        sunAngle = 0;
      }

      const sunX = w * 0.05 + w * 0.9 * (0.5 - 0.5 * Math.cos(sunAngle));
      const sunY = h * 0.85 - h * 0.65 * Math.sin(sunAngle);
      const sunRadius = Math.min(w, h) * 0.035;

      if (sunAngle > 0.02 && sunAngle < Math.PI - 0.02) {
        // Outer glow besar
        const glow1 = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius * 8);
        glow1.addColorStop(0, `rgba(255,220,120,${0.25 * (1 - Math.abs(Math.cos(sunAngle)))})`);
        glow1.addColorStop(0.4, `rgba(255,180,80,${0.15 * (1 - Math.abs(Math.cos(sunAngle)))})`);
        glow1.addColorStop(1, "rgba(255,180,80,0)");
        ctx.fillStyle = glow1;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius * 8, 0, Math.PI * 2);
        ctx.fill();

        // Inner glow
        const glow2 = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius * 3);
        glow2.addColorStop(0, `rgba(255,240,200,0.6)`);
        glow2.addColorStop(0.6, `rgba(255,200,100,0.3)`);
        glow2.addColorStop(1, "rgba(255,200,100,0)");
        ctx.fillStyle = glow2;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius * 3, 0, Math.PI * 2);
        ctx.fill();

        // Matahari
        ctx.shadowColor = "rgba(255,200,100,0.4)";
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
        const sunGrad = ctx.createRadialGradient(
          sunX - sunRadius * 0.3, sunY - sunRadius * 0.3, 0,
          sunX, sunY, sunRadius
        );
        sunGrad.addColorStop(0, "#FFF8E0");
        sunGrad.addColorStop(0.5, "#FFD580");
        sunGrad.addColorStop(1, "#FFB347");
        ctx.fillStyle = sunGrad;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // ===================== BULAN =====================
      let moonAngle = 0;
      if (dayProgress < 0.22 || dayProgress >= 0.78) {
        if (dayProgress >= 0.78) {
          moonAngle = ((dayProgress - 0.78) / 0.22) * Math.PI;
        } else {
          moonAngle = ((dayProgress + 0.22) / 0.44) * Math.PI;
        }
      }

      const moonX = w * 0.05 + w * 0.9 * (0.5 - 0.5 * Math.cos(moonAngle));
      const moonY = h * 0.85 - h * 0.65 * Math.sin(moonAngle);
      const moonRadius = Math.min(w, h) * 0.028;

      if (moonAngle > 0.02 && moonAngle < Math.PI - 0.02) {
        // Glow bulan
        const moonGlow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonRadius * 6);
        moonGlow.addColorStop(0, "rgba(200,210,235,0.15)");
        moonGlow.addColorStop(1, "rgba(200,210,235,0)");
        ctx.fillStyle = moonGlow;
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonRadius * 6, 0, Math.PI * 2);
        ctx.fill();

        // Bulan
        ctx.shadowColor = "rgba(200,210,235,0.2)";
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
        const moonGrad = ctx.createRadialGradient(
          moonX - moonRadius * 0.3, moonY - moonRadius * 0.3, 0,
          moonX, moonY, moonRadius
        );
        moonGrad.addColorStop(0, "#F5F6FA");
        moonGrad.addColorStop(0.6, "#E0E4EC");
        moonGrad.addColorStop(1, "#C8CDD6");
        ctx.fillStyle = moonGrad;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Efek sabit (bayangan di sisi)
        ctx.beginPath();
        ctx.arc(moonX + moonRadius * 0.35, moonY - moonRadius * 0.15, moonRadius * 0.75, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,0,0,${0.15 + 0.1 * Math.sin(time.getTime() / 5000)})`;
        ctx.fill();
      }

      // ===================== AWAN (BERGERAK) =====================
      const cloudOpacity = isNight ? 0.06 : 0.2;

      clouds.forEach((cloud) => {
        const cx = (cloud.x + (time.getTime() / 1000) * cloud.speed) % 1.2 - 0.1;
        const cy = cloud.y * h;
        const cw = cloud.w * (w / 800);
        const ch = cloud.h * (h / 600);

        ctx.fillStyle = `rgba(255,255,255,${cloud.opacity * cloudOpacity})`;
        ctx.filter = "blur(12px)";
        ctx.beginPath();
        ctx.ellipse(cx * w, cy, cw * 0.5, ch * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx * w + cw * 0.4, cy - ch * 0.2, cw * 0.4, ch * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx * w - cw * 0.3, cy + ch * 0.1, cw * 0.35, ch * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.filter = "none";
      });

      requestAnimationFrame(draw);
    }

    draw();

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, [time, stars, clouds]);

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
