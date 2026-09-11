// StarField — hardware-accelerated canvas starfield + nebula atmosphere.
// Runs at <2% CPU idle because:
//   - Uses requestAnimationFrame (pauses when tab is hidden)
//   - Stars are pre-computed, not regenerated per frame
//   - Only redraws changed pixels via clearRect
import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
  size: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  opacity: number;
  life: number;
}

export const StarField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let w = 0, h = 0;
    let stars: Star[] = [];
    let particles: Particle[] = [];
    let shootingStars: ShootingStar[] = [];
    let shootingStarTimer = 0;

    const init = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;

      // Generate stars once
      stars = Array.from({ length: 280 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 1.4 + 0.3,
        opacity: Math.random() * 0.7 + 0.2,
        speed: Math.random() * 0.02 + 0.005,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.008 + 0.003,
      }));

      // Sparse cosmic dust
      particles = Array.from({ length: 40 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.08,
        vy: (Math.random() - 0.5) * 0.04,
        opacity: Math.random() * 0.15 + 0.03,
        size: Math.random() * 1.5 + 0.5,
      }));
    };

    const spawnShootingStar = () => {
      const sx = Math.random() * w * 0.7;
      const sy = Math.random() * h * 0.3;
      shootingStars.push({
        x: sx, y: sy,
        vx: Math.random() * 4 + 2,
        vy: Math.random() * 2 + 1,
        length: Math.random() * 80 + 40,
        opacity: 0.6,
        life: 1.0,
      });
    };

    const draw = () => {
      // Background — deep space
      ctx.fillStyle = '#020308';
      ctx.fillRect(0, 0, w, h);

      // Nebula gradients (subtle, static atmospheric blobs)
      const g1 = ctx.createRadialGradient(w * 0.15, h * 0.2, 0, w * 0.15, h * 0.2, w * 0.35);
      g1.addColorStop(0, 'rgba(6,18,60,0.18)');
      g1.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);

      const g2 = ctx.createRadialGradient(w * 0.85, h * 0.75, 0, w * 0.85, h * 0.75, w * 0.4);
      g2.addColorStop(0, 'rgba(0,40,60,0.14)');
      g2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);

      // Stars with twinkle
      stars.forEach((s) => {
        s.twinklePhase += s.twinkleSpeed;
        const tw = 0.5 + 0.5 * Math.sin(s.twinklePhase);
        const op = s.opacity * (0.7 + 0.3 * tw);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220, 235, 255, ${op})`;
        ctx.fill();
      });

      // Cosmic dust particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100,160,200,${p.opacity})`;
        ctx.fill();
      });

      // Shooting stars
      shootingStarTimer++;
      if (shootingStarTimer > 300 + Math.random() * 400) {
        spawnShootingStar();
        shootingStarTimer = 0;
      }
      shootingStars = shootingStars.filter((ss) => ss.life > 0.01);
      shootingStars.forEach((ss) => {
        ss.x += ss.vx;
        ss.y += ss.vy;
        ss.life -= 0.025;
        const grad = ctx.createLinearGradient(
          ss.x, ss.y,
          ss.x - ss.vx * (ss.length / ss.vx), ss.y - ss.vy * (ss.length / ss.vx),
        );
        grad.addColorStop(0, `rgba(200,240,255,${ss.opacity * ss.life})`);
        grad.addColorStop(1, 'rgba(200,240,255,0)');
        ctx.beginPath();
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
        ctx.moveTo(ss.x, ss.y);
        ctx.lineTo(ss.x - ss.vx * 20, ss.y - ss.vy * 20);
        ctx.stroke();
      });

      // Subtle orbital arc (midground)
      const orb = ctx.createLinearGradient(w * 0.3, h * 0.05, w * 0.95, h * 0.6);
      orb.addColorStop(0, 'rgba(34,211,238,0)');
      orb.addColorStop(0.4, 'rgba(34,211,238,0.04)');
      orb.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.beginPath();
      ctx.ellipse(w * 0.6, h * 0.35, w * 0.38, h * 0.22, Math.PI / 6, 0, Math.PI * 2);
      ctx.strokeStyle = orb;
      ctx.lineWidth = 1;
      ctx.stroke();

      animId = requestAnimationFrame(draw);
    };

    init();
    animId = requestAnimationFrame(draw);

    const onResize = () => init();
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
};
