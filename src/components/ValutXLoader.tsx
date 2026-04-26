'use client';

import { useEffect, useState } from 'react';

interface Props {
  pageName?: string;
}

export default function ValutXLoader({ pageName = '' }: Props) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    // Percentage counter steps
    const steps: [number, number][] = [
      [300, 8], [600, 20], [900, 35], [1200, 50],
      [1500, 65], [1900, 78], [2300, 88], [2800, 96], [3200, 100],
    ];
    const timers: ReturnType<typeof setTimeout>[] = [];
    steps.forEach(([delay, val]) => {
      timers.push(setTimeout(() => setPct(val), delay));
    });

    // Fade out after 3.5s
    const fadeTimer = setTimeout(() => setFading(true), 3500);
    // Remove from DOM after fade completes
    const removeTimer = setTimeout(() => setVisible(false), 4600);

    return () => {
      [...timers, fadeTimer, removeTimer].forEach(clearTimeout);
    };
  }, []);

  if (!visible) return null;

  return (
    <>
      <style>{`
        #vx-loader {
          position: fixed;
          inset: 0;
          z-index: 999999;
          background: #f6f1e9;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          overflow: hidden;
          transition: opacity 1s cubic-bezier(.4,0,.2,1), visibility 1s cubic-bezier(.4,0,.2,1);
        }
        #vx-loader.fade-out {
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
        }
        #vx-loader::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
          pointer-events: none;
          opacity: 0.45;
        }
        #vx-loader::after {
          content: '';
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(184,147,90,0.09) 0%, transparent 70%);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: vx-breathe 3s ease-in-out infinite;
        }
        @keyframes vx-breathe {
          0%,100% { transform: translate(-50%,-50%) scale(1); opacity: 0.7; }
          50%      { transform: translate(-50%,-50%) scale(1.15); opacity: 1; }
        }

        /* Corner brackets */
        .vx-corner {
          position: absolute;
          width: 28px;
          height: 28px;
          opacity: 0;
          animation: vx-corners-in 0.6s 0.3s ease forwards;
        }
        .vx-corner.tl { top: 40px; left: 40px; border-top: 1px solid rgba(184,147,90,0.35); border-left: 1px solid rgba(184,147,90,0.35); }
        .vx-corner.tr { top: 40px; right: 40px; border-top: 1px solid rgba(184,147,90,0.35); border-right: 1px solid rgba(184,147,90,0.35); }
        .vx-corner.bl { bottom: 40px; left: 40px; border-bottom: 1px solid rgba(184,147,90,0.35); border-left: 1px solid rgba(184,147,90,0.35); }
        .vx-corner.br { bottom: 40px; right: 40px; border-bottom: 1px solid rgba(184,147,90,0.35); border-right: 1px solid rgba(184,147,90,0.35); }
        @keyframes vx-corners-in { to { opacity: 1; } }

        /* Grid lines */
        .vx-grid { position: absolute; inset: 0; overflow: hidden; opacity: 0.04; }
        .vx-grid line { stroke: #b8935a; stroke-width: 0.5; }

        /* Content */
        .vx-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
        }

        /* Ring */
        .vx-ring-wrap {
          position: relative;
          width: 220px;
          height: 220px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .vx-orbit { position: absolute; inset: 0; }
        .vx-orbit-track { stroke: rgba(184,147,90,0.1); fill: none; stroke-width: 1; }
        .vx-orbit-arc {
          fill: none;
          stroke: rgba(184,147,90,0.5);
          stroke-width: 1;
          stroke-linecap: round;
          stroke-dasharray: 565.48;
          stroke-dashoffset: 565.48;
          transform-origin: center;
          transform: rotate(-90deg);
          animation: vx-arc 2.6s 0.4s cubic-bezier(.4,0,.2,1) forwards;
        }
        @keyframes vx-arc { to { stroke-dashoffset: 0; } }

        .vx-ticks { position: absolute; inset: 0; animation: vx-spin 12s linear infinite; }
        @keyframes vx-spin { to { transform: rotate(360deg); } }

        /* Inner badge — stays dark for logo contrast */
        .vx-badge {
          width: 120px;
          height: 120px;
          background: #1c1c1c;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          box-shadow:
            0 0 0 1px rgba(184,147,90,0.2),
            0 0 40px rgba(184,147,90,0.07),
            0 20px 60px rgba(28,28,28,0.18);
          animation: vx-badge-in 0.5s 0.2s ease both;
        }
        @keyframes vx-badge-in {
          from { opacity: 0; transform: scale(0.88); }
          to   { opacity: 1; transform: scale(1); }
        }

        /* SVG VX letterforms */
        .vx-svg {
          width: 80px;
          height: 56px;
          overflow: visible;
          filter: drop-shadow(0 0 0px rgba(184,147,90,0));
          animation: vx-glow 1.5s 2s ease forwards;
        }
        @keyframes vx-glow {
          to { filter: drop-shadow(0 0 8px rgba(212,170,114,0.55)); }
        }
        #vx-v {
          stroke: #b8935a;
          stroke-width: 2.5;
          stroke-linecap: round;
          stroke-linejoin: round;
          fill: none;
          stroke-dasharray: 106;
          stroke-dashoffset: 106;
          animation: vx-draw-v 0.9s 0.6s cubic-bezier(.4,0,.2,1) forwards;
        }
        @keyframes vx-draw-v { to { stroke-dashoffset: 0; } }
        #vx-x1 {
          stroke: #d4aa72;
          stroke-width: 2.5;
          stroke-linecap: round;
          fill: none;
          stroke-dasharray: 56;
          stroke-dashoffset: 56;
          animation: vx-draw-x1 0.55s 1.6s cubic-bezier(.4,0,.2,1) forwards;
        }
        @keyframes vx-draw-x1 { to { stroke-dashoffset: 0; } }
        #vx-x2 {
          stroke: #d4aa72;
          stroke-width: 2.5;
          stroke-linecap: round;
          fill: none;
          stroke-dasharray: 56;
          stroke-dashoffset: 56;
          animation: vx-draw-x2 0.55s 2s cubic-bezier(.4,0,.2,1) forwards;
        }
        @keyframes vx-draw-x2 { to { stroke-dashoffset: 0; } }
        #vx-divider {
          stroke: rgba(184,147,90,0.4);
          stroke-width: 1;
          stroke-dasharray: 8;
          stroke-dashoffset: 8;
          animation: vx-draw-div 0.3s 1.45s ease forwards;
        }
        @keyframes vx-draw-div { to { stroke-dashoffset: 0; } }

        /* Brand name — light theme: ink colour */
        .vx-brand {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.75rem;
          font-weight: 300;
          letter-spacing: 0.55em;
          color: #1c1c1c;
          text-transform: uppercase;
          margin-top: 28px;
          opacity: 0;
          padding-left: 0.55em;
          animation: vx-fadeup 0.7s 2.3s ease forwards;
        }
        .vx-brand b { color: #b8935a; font-weight: 300; }

        /* Page name — shown under VX brand */
        .vx-pagename {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.58rem;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgba(184,147,90,0.65);
          margin-top: 7px;
          opacity: 0;
          animation: vx-fadeup 0.6s 2.55s ease forwards;
        }

        /* Tagline */
        .vx-tag {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.6rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(107,100,89,0.55);
          margin-top: 5px;
          opacity: 0;
          animation: vx-fadeup 0.6s 2.7s ease forwards;
        }

        /* Progress bar */
        .vx-bar-wrap {
          width: 180px;
          height: 1px;
          background: rgba(184,147,90,0.12);
          margin-top: 32px;
          border-radius: 2px;
          overflow: hidden;
          opacity: 0;
          animation: vx-fadeup 0.4s 0.6s ease forwards;
        }
        .vx-bar {
          height: 100%;
          width: 0%;
          background: linear-gradient(90deg, #4a6741 0%, #b8935a 60%, #d4aa72 100%);
          border-radius: 2px;
          animation: vx-progress 3s 0.6s cubic-bezier(.25,.1,.25,1) forwards;
        }
        @keyframes vx-progress {
          0%   { width: 0%;   }
          30%  { width: 28%;  }
          60%  { width: 65%;  }
          85%  { width: 88%;  }
          100% { width: 100%; }
        }

        /* Percentage counter */
        .vx-pct {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.6rem;
          letter-spacing: 0.1em;
          color: rgba(107,100,89,0.4);
          margin-top: 8px;
          opacity: 0;
          animation: vx-fadeup 0.4s 0.7s ease forwards;
        }

        @keyframes vx-fadeup {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div id="vx-loader" className={fading ? 'fade-out' : ''}>

        {/* Decorative grid */}
        <svg className="vx-grid" xmlns="http://www.w3.org/2000/svg">
          {Array.from({ length: 20 }, (_, i) => (
            <line key={`v${i}`} x1={i * 80} y1="0" x2={i * 80} y2="100%" />
          ))}
          {Array.from({ length: 15 }, (_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 80} x2="100%" y2={i * 80} />
          ))}
        </svg>

        {/* Corner brackets */}
        <div className="vx-corner tl" />
        <div className="vx-corner tr" />
        <div className="vx-corner bl" />
        <div className="vx-corner br" />

        {/* Main content */}
        <div className="vx-content">
          <div className="vx-ring-wrap">
            {/* Orbital ring */}
            <svg className="vx-orbit" viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg">
              <circle className="vx-orbit-track" cx="110" cy="110" r="103" />
              <circle className="vx-orbit-arc"   cx="110" cy="110" r="103" />
              {/* Tick marks */}
              <g className="vx-ticks">
                {Array.from({ length: 36 }, (_, i) => {
                  const angle = (i * 10 * Math.PI) / 180;
                  const r1 = 103, r2 = i % 3 === 0 ? 96 : 99;
                  const x1 = 110 + r1 * Math.cos(angle);
                  const y1 = 110 + r1 * Math.sin(angle);
                  const x2 = 110 + r2 * Math.cos(angle);
                  const y2 = 110 + r2 * Math.sin(angle);
                  return (
                    <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke={`rgba(184,147,90,${i % 3 === 0 ? '0.45' : '0.2'})`}
                      strokeWidth={i % 3 === 0 ? '1.2' : '0.7'} />
                  );
                })}
              </g>
            </svg>

            {/* Logo badge */}
            <div className="vx-badge">
              <svg className="vx-svg" viewBox="0 0 84 56" xmlns="http://www.w3.org/2000/svg">
                {/* V */}
                <path id="vx-v" d="M 4,4 L 24,52 L 44,4" />
                {/* Divider dot */}
                <line id="vx-divider" x1="46" y1="28" x2="50" y2="28" />
                {/* X */}
                <line id="vx-x1" x1="52" y1="4"  x2="80" y2="52" />
                <line id="vx-x2" x1="80" y1="4"  x2="52" y2="52" />
              </svg>
            </div>
          </div>

          {/* Brand */}
          <div className="vx-brand">Valut<b>X</b></div>

          {/* Page name — under VX */}
          {pageName && (
            <div className="vx-pagename">{pageName}</div>
          )}

          {/* Tagline */}
          <div className="vx-tag">Where Capital Meets Discipline</div>

          {/* Progress bar */}
          <div className="vx-bar-wrap">
            <div className="vx-bar" />
          </div>

          {/* Percentage */}
          <div className="vx-pct">{pct}%</div>
        </div>

      </div>
    </>
  );
}