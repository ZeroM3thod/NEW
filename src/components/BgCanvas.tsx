'use client';

import { useEffect, useRef } from 'react';

interface Candle {
  x: number;
  y: number;
  w: number;
  h: number;
  up: boolean;
  speed: number;
  phase: number;
  wick: number;
}

interface Line {
  pts: { x: number; y: number }[];
  speed: number;
  phase: number;
  amp: number;
}

export default function BgCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let candles: Candle[] = [];
    let lines: Line[] = [];
    let W = 0;
    let H = 0;
    let animationId: number;
    let t = 0;

    function initCandles() {
      candles = [];
      const count = Math.floor(W / 48);
      for (let i = 0; i < count; i++) {
        candles.push({
          x: (i / count) * W + Math.random() * 40,
          y: H * 0.3 + Math.random() * H * 0.5,
          w: 10 + Math.random() * 8,
          h: 20 + Math.random() * 60,
          up: Math.random() > 0.4,
          speed: 0.2 + Math.random() * 0.4,
          phase: Math.random() * Math.PI * 2,
          wick: 8 + Math.random() * 20,
        });
      }
    }

    function initLines() {
      lines = [];
      const count = 4;
      for (let i = 0; i < count; i++) {
        const pts: { x: number; y: number }[] = [];
        for (let x = 0; x <= W; x += 40) {
          pts.push({ x, y: H * (0.2 + i * 0.18) + Math.random() * 60 });
        }
        lines.push({ pts, speed: 0.15 + i * 0.05, phase: i * 1.2, amp: 18 + i * 8 });
      }
    }

    function resize() {
      W = canvas!.width = window.innerWidth;
      H = canvas!.height = window.innerHeight;
      initCandles();
      initLines();
    }

    function drawCandles(time: number) {
      candles.forEach((c) => {
        const bob = Math.sin(time * c.speed + c.phase) * 8;
        const x = c.x;
        const y = c.y + bob;
        ctx!.strokeStyle = 'rgba(28,28,28,1)';
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.moveTo(x + c.w / 2, y - c.wick);
        ctx!.lineTo(x + c.w / 2, y + c.h + c.wick);
        ctx!.stroke();
        ctx!.fillStyle = c.up ? 'rgba(74,103,65,1)' : 'rgba(184,147,90,1)';
        ctx!.fillRect(x, y, c.w, c.h);
        ctx!.strokeRect(x, y, c.w, c.h);
      });
    }

    function drawLines(time: number) {
      lines.forEach((l, i) => {
        ctx!.beginPath();
        l.pts.forEach((p, j) => {
          const y = p.y + Math.sin(time * l.speed + j * 0.3 + l.phase) * l.amp;
          j === 0 ? ctx!.moveTo(p.x, y) : ctx!.lineTo(p.x, y);
        });
        ctx!.strokeStyle =
          i % 2 === 0 ? 'rgba(74,103,65,0.8)' : 'rgba(184,147,90,0.6)';
        ctx!.lineWidth = 1;
        ctx!.stroke();
      });
    }

    function animate() {
      ctx!.clearRect(0, 0, W, H);
      t += 0.012;
      drawLines(t);
      drawCandles(t);
      animationId = requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);
    resize();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="bg-canvas"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.06,
      }}
    />
  );
}
