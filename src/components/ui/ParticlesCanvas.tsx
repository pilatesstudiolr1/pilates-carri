'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
  baseAlpha: number;
  vx: number;
  vy: number;
  twinkleSpeed: number;
}

const PALETTE = [
  '#DFB267', // Wood Gold
  '#C89B4E', // Amber
  '#3D4A3E', // Olive
  '#8B734B', // Warm Bronze
];

export default function ParticlesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Create fewer, more subtle particles
    const particleCount = Math.floor((width * height) / 48000);
    const particles: Particle[] = Array.from({ length: Math.max(18, particleCount) }, () => {
      const baseAlpha = 0.18 + Math.random() * 0.25;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 0.8 + Math.random() * 1.5,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        alpha: baseAlpha,
        baseAlpha,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -0.08 - Math.random() * 0.18,
        twinkleSpeed: 0.008 + Math.random() * 0.015,
      };
    });


    const drawStar = (
      ctx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      spikes: number,
      outerRadius: number,
      innerRadius: number,
      color: string,
      alpha: number
    ) => {
      let rot = (Math.PI / 2) * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy - outerRadius);

      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;

      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.restore();
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        // Move particle
        p.x += p.vx;
        p.y += p.vy;

        // Twinkle effect
        p.alpha += Math.sin(Date.now() * p.twinkleSpeed) * 0.008;
        p.alpha = Math.max(0.1, Math.min(p.baseAlpha + 0.15, p.alpha));


        // Wrap around screen
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        // Render star / particle glow
        ctx.save();
        ctx.shadowBlur = p.radius * 4;
        ctx.shadowColor = p.color;

        if (p.radius > 2.2) {
          // Draw 4-point star for larger particles
          drawStar(ctx, p.x, p.y, 4, p.radius * 2.5, p.radius * 0.8, p.color, p.alpha);
        } else {
          // Draw soft glowing circle for smaller stars
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.fill();
        }
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}
