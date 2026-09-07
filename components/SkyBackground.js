"use client";

import { useEffect, useRef, useMemo } from "react";

export default function SkyBackground() {
  const canvasRef = useRef(null);

  // Data statis (hitung sekali, gak berubah setiap frame)
  const stars = useMemo(() => {
    const s = [];
    for (let i = 0; i < 100; i++) {
      s.push({
        x: Math.random(),
        y: Math.random() * 0.7,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.6 + 0.3,
      });
    }
    return s;
  }, []);

  const clouds = useMemo(() => {
    return [
      { x: 0.1, y: 0.25, scale: 1.2 },
      { x: 0.6, y: 0.3, scale: 0.9 },
      { x: 0.85, y: 0.2, scale: 1.0 },
    ];
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let w = 0,
      h = 0;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    function draw() {
      ctx.clearRect(0, 0, w, h);

      // Langit gradien gelap
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#0b1a2a");
      grad.addColorStop(0.6, "#1b3b4a");
      grad.addColorStop(1, "#0f1614");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Bintang (pakai data statis)
      stars.forEach((star) => {
        const x = star.x * w;
        const y = star.y * h;
        ctx.beginPath();
        ctx.arc(x, y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${star.opacity})`;
        ctx.fill();
      });

      // Matahari (tetap di tempat)
      const sunX = w * 0.75;
      const sunY = h * 0.15;
      const sunRadius = Math.min(w, h) * 0.045;
      ctx.shadowColor = "rgba(255,200,100,0.5)";
      ctx.shadowBlur = 50;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#FFD580";
      ctx.fill();
      ctx.shadowBlur = 0;

      // Bulan
      const moonX = w * 0.2;
      const moonY = h * 0.12;
      const moonRadius = Math.min(w, h) * 0.025;
      ctx.shadowColor = "rgba(200,200,220,0.3)";
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#E8E8F0";
      ctx.fill();
      ctx.shadowBlur = 0;

      // Awan (pakai data statis)
      clouds.forEach((cloud) => {
        const cx = cloud.x * w;
        const cy = cloud.y * h;
        const scale = cloud.scale;
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.filter = "blur(8px)";
        ctx.beginPath();
        ctx.arc(cx, cy, 40 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 35 * scale, cy - 15 * scale, 35 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx - 30 * scale, cy - 10 * scale, 30 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.filter = "none";
      });

      requestAnimationFrame(draw);
    }

    draw();

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, [stars, clouds]);

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
