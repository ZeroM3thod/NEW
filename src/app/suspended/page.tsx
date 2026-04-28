'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

function pad(n: number) { return String(n).padStart(2, '0'); }

export default function SuspendedPage() {
  const router = useRouter();
  const supabase = createClient();
  const bgRef = useRef<HTMLCanvasElement>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth/signin'); return; }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setProfile(data);
        // If not suspended anymore, redirect away
        if (data.status !== 'suspended') {
          const dest = data.role === 'admin' ? '/admin/dashboard' : '/dashboard';
          router.push(dest);
        }
      }
    }
    check();
  }, []);

  // BG canvas — muted, slow red-toned candles
  useEffect(() => {
    const cvs = bgRef.current; if (!cvs) return;
    const cx = cvs.getContext('2d')!;
    type C = { x:number;y:number;w:number;h:number;wick:number;spd:number;ph:number };
    type W = { pts:{x:number;y:number}[];spd:number;ph:number;amp:number };
    let W=0,H=0,candles:C[]=[],waves:W[]=[],T=0,aid=0;
    const build=()=>{
      const n=Math.max(5,Math.floor(W/60));
      candles=Array.from({length:n},(_,i)=>({x:(i/n)*W+14+Math.random()*20,y:H*.2+Math.random()*H*.6,w:9+Math.random()*7,h:16+Math.random()*60,wick:8+Math.random()*18,spd:.1+Math.random()*.2,ph:Math.random()*Math.PI*2}));
      const pts=Math.ceil(W/40)+2;
      waves=[0,1,2].map(i=>({pts:Array.from({length:pts},(_,j)=>({x:j*40,y:H*(.18+i*.25)+Math.random()*35})),spd:.06+i*.03,ph:i*1.2,amp:10+i*6}));
    };
    const setup=()=>{ W=cvs.width=innerWidth; H=cvs.height=innerHeight; build(); };
    const draw=()=>{
      cx.clearRect(0,0,W,H); T+=.008;
      waves.forEach(w=>{cx.beginPath();w.pts.forEach((p,j)=>{const y=p.y+Math.sin(T*w.spd+j*.3+w.ph)*w.amp;j===0?cx.moveTo(p.x,y):cx.lineTo(p.x,y)});cx.strokeStyle='rgba(155,58,58,0.5)';cx.lineWidth=1;cx.stroke()});
      candles.forEach(c=>{const bob=Math.sin(T*c.spd+c.ph)*5,x=c.x,y=c.y+bob;cx.strokeStyle='rgba(155,58,58,0.6)';cx.lineWidth=1;cx.beginPath();cx.moveTo(x+c.w/2,y-c.wick);cx.lineTo(x+c.w/2,y+c.h+c.wick);cx.stroke();cx.fillStyle='rgba(155,58,58,0.35)';cx.fillRect(x,y,c.w,c.h);cx.strokeRect(x,y,c.w,c.h);});
      aid=requestAnimationFrame(draw);
    };
    window.addEventListener('resize',setup); setup(); draw();
    return()=>{ window.removeEventListener('resize',setup); cancelAnimationFrame(aid); };
  },[]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/signin');
  };

  const initials = profile
    ? `${profile.first_name?.[0] || '?'}${profile.last_name?.[0] || '?'}`.toUpperCase()
    : '??';

  const displayName = profile
    ? `${profile.first_name} ${profile.last_name}`
    : 'User';

  return (
    <>
      <style>{`
        :root {
          --ink: #1c1c1c;
          --cream: #f6f1e9;
          --parchment: #ede7da;
          --gold: #b8935a;
          --gold-l: #d4aa72;
          --sage: #4a6741;
          --surface: #faf7f2;
          --border: rgba(184,147,90,0.18);
          --text-sec: #6b6459;
          --error: #9b3a3a;
          --error-l: #c97070;
          --radius: 6px;
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { height: 100%; }
        body {
          font-family: 'DM Sans', sans-serif;
          background: #f9f0f0;
          color: var(--ink);
          min-height: 100svh;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }
        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.022'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
          opacity: 0.4;
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #f9f0f0; }
        ::-webkit-scrollbar-thumb { background: var(--error); border-radius: 10px; }

        /* ── SHELL ── */
        .sp-shell {
          position: relative;
          z-index: 2;
          min-height: 100svh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
        }

        /* ── CORNER MARKS ── */
        .sp-corner {
          position: fixed;
          width: 24px;
          height: 24px;
          opacity: 0.35;
          pointer-events: none;
          z-index: 1;
        }
        .sp-corner.tl { top: 28px; left: 28px; border-top: 1px solid var(--error); border-left: 1px solid var(--error); }
        .sp-corner.tr { top: 28px; right: 28px; border-top: 1px solid var(--error); border-right: 1px solid var(--error); }
        .sp-corner.bl { bottom: 28px; left: 28px; border-bottom: 1px solid var(--error); border-left: 1px solid var(--error); }
        .sp-corner.br { bottom: 28px; right: 28px; border-bottom: 1px solid var(--error); border-right: 1px solid var(--error); }

        /* ── CARD ── */
        .sp-card {
          background: rgba(250,247,242,0.94);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          border: 1px solid rgba(155,58,58,0.22);
          border-radius: 16px;
          width: 100%;
          max-width: 520px;
          padding: 52px 44px 44px;
          position: relative;
          overflow: hidden;
          box-shadow:
            0 4px 48px rgba(155,58,58,0.1),
            0 1px 0 rgba(255,255,255,0.75) inset;
          animation: sp-card-in 0.7s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes sp-card-in {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: none; }
        }

        /* Top accent line */
        .sp-card::before {
          content: '';
          position: absolute;
          top: 0; left: 10%; right: 10%;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(155,58,58,0.7), transparent);
          border-radius: 0 0 3px 3px;
        }

        /* Radial glow */
        .sp-card::after {
          content: '';
          position: absolute;
          width: 280px;
          height: 280px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(155,58,58,0.06) 0%, transparent 70%);
          top: -80px; right: -60px;
          pointer-events: none;
        }

        /* ── LOGO STRIP ── */
        .sp-logo-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 36px;
          animation: sp-fade-up 0.6s 0.1s ease both;
        }
        .sp-logo-mark {
          width: 32px;
          height: 32px;
          background: var(--ink);
          border-radius: var(--radius);
          position: relative;
          overflow: visible;
          flex-shrink: 0;
        }
        .sp-logo-mark::after {
          content: 'VX';
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 11px;
          font-weight: 600;
          color: #b8935a;
          letter-spacing: 0.5px;
          line-height: 1;
        }
        .sp-logo-text {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.4rem;
          font-weight: 600;
          color: var(--ink);
          letter-spacing: 0.04em;
        }
        .sp-logo-text span { color: var(--gold); }

        /* ── ICON CIRCLE ── */
        .sp-icon-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 28px;
          animation: sp-fade-up 0.6s 0.18s ease both;
        }
        .sp-icon-circle {
          width: 76px;
          height: 76px;
          border-radius: 50%;
          background: rgba(155,58,58,0.08);
          border: 1.5px solid rgba(155,58,58,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: sp-pulse 2.5s ease-in-out infinite;
        }
        @keyframes sp-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(155,58,58,0); }
          50%      { box-shadow: 0 0 0 12px rgba(155,58,58,0.07); }
        }
        .sp-icon-circle svg { width: 32px; height: 32px; }

        /* ── CONTENT ── */
        .sp-label {
          text-align: center;
          font-size: 0.6rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(155,58,58,0.75);
          margin-bottom: 10px;
          display: block;
          animation: sp-fade-up 0.6s 0.24s ease both;
        }
        .sp-title {
          text-align: center;
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.8rem, 5vw, 2.6rem);
          font-weight: 400;
          color: var(--ink);
          line-height: 1.15;
          margin-bottom: 14px;
          animation: sp-fade-up 0.6s 0.28s ease both;
        }
        .sp-title em {
          font-style: italic;
          color: var(--error);
        }
        .sp-desc {
          text-align: center;
          font-size: 0.83rem;
          color: var(--text-sec);
          line-height: 1.78;
          font-weight: 300;
          margin-bottom: 30px;
          max-width: 380px;
          margin-left: auto;
          margin-right: auto;
          animation: sp-fade-up 0.6s 0.32s ease both;
        }

        /* ── USER INFO STRIP ── */
        .sp-user-strip {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: rgba(155,58,58,0.05);
          border: 1px solid rgba(155,58,58,0.2);
          border-radius: 10px;
          margin-bottom: 26px;
          animation: sp-fade-up 0.6s 0.36s ease both;
        }
        .sp-user-av {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--parchment);
          box-shadow: 0 0 0 2px rgba(155,58,58,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Cormorant Garamond', serif;
          font-size: 1rem;
          font-weight: 600;
          color: var(--error);
          flex-shrink: 0;
        }
        .sp-user-name {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--ink);
          line-height: 1.2;
        }
        .sp-user-tag {
          font-size: 0.65rem;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--text-sec);
          margin-top: 2px;
        }
        .sp-suspended-badge {
          margin-left: auto;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          background: rgba(155,58,58,0.1);
          border: 1px solid rgba(155,58,58,0.25);
          border-radius: 100px;
          font-size: 0.58rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--error);
          flex-shrink: 0;
        }
        .sp-suspended-badge-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--error);
          animation: sp-blink 1.6s ease-in-out infinite;
        }
        @keyframes sp-blink { 0%,100%{opacity:1}50%{opacity:.25} }

        /* ── NOTICE BOX ── */
        .sp-notice {
          padding: 14px 16px;
          background: rgba(184,147,90,0.06);
          border: 1px solid rgba(184,147,90,0.2);
          border-radius: 8px;
          margin-bottom: 26px;
          font-size: 0.76rem;
          color: var(--text-sec);
          line-height: 1.75;
          animation: sp-fade-up 0.6s 0.4s ease both;
        }
        .sp-notice strong { color: var(--ink); }
        .sp-notice a {
          color: var(--gold);
          text-decoration: none;
          font-weight: 500;
        }
        .sp-notice a:hover { text-decoration: underline; }

        /* ── ACTIONS ── */
        .sp-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          animation: sp-fade-up 0.6s 0.44s ease both;
        }

        .sp-btn-primary {
          width: 100%;
          padding: 13px;
          background: var(--ink);
          color: var(--cream);
          border: 1px solid var(--ink);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.76rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          border-radius: var(--radius);
          position: relative;
          overflow: hidden;
          transition: border-color 0.25s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-decoration: none;
        }
        .sp-btn-primary::after {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--error);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s ease;
          z-index: 0;
        }
        .sp-btn-primary:hover { border-color: var(--error); }
        .sp-btn-primary:hover::after { transform: scaleX(1); }
        .sp-btn-primary span { position: relative; z-index: 1; }
        .sp-btn-primary svg { position: relative; z-index: 1; }

        .sp-btn-ghost {
          width: 100%;
          padding: 12px;
          background: transparent;
          color: var(--text-sec);
          border: 1px solid var(--border);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.75rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          border-radius: var(--radius);
          transition: all 0.22s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-decoration: none;
        }
        .sp-btn-ghost:hover {
          border-color: rgba(155,58,58,0.4);
          color: var(--error);
        }

        /* ── FOOTER ── */
        .sp-footer {
          text-align: center;
          margin-top: 28px;
          font-size: 0.65rem;
          letter-spacing: 0.08em;
          color: rgba(107,100,89,0.4);
          animation: sp-fade-up 0.6s 0.52s ease both;
        }
        .sp-footer a {
          color: var(--gold);
          text-decoration: none;
          transition: color 0.2s;
        }
        .sp-footer a:hover { color: var(--gold-l); }

        @keyframes sp-fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 560px) {
          .sp-card { padding: 36px 22px 32px; }
          .sp-actions { gap: 8px; }
        }
      `}</style>

      <canvas ref={bgRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0, opacity: 0.06 }} />

      {/* Corner marks */}
      <div className="sp-corner tl" />
      <div className="sp-corner tr" />
      <div className="sp-corner bl" />
      <div className="sp-corner br" />

      <div className="sp-shell">
        <div className="sp-card">

          {/* Logo */}
          <div className="sp-logo-row">
            <div className="sp-logo-mark" />
            <span className="sp-logo-text">Valut<span>X</span></span>
          </div>

          {/* Icon */}
          <div className="sp-icon-wrap">
            <div className="sp-icon-circle">
              <svg viewBox="0 0 24 24" fill="none" stroke="#9b3a3a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            </div>
          </div>

          {/* Text */}
          <span className="sp-label">Account Status · Restricted</span>
          <h1 className="sp-title">
            Your account has been<br /><em>suspended</em>
          </h1>
          <p className="sp-desc">
            Access to this platform has been temporarily restricted by an administrator. You cannot access any pages until your account is reinstated.
          </p>

          {/* User info */}
          <div className="sp-user-strip">
            <div className="sp-user-av">{initials}</div>
            <div>
              <div className="sp-user-name">{displayName}</div>
              <div className="sp-user-tag">@{profile?.username || '—'}</div>
            </div>
            <div className="sp-suspended-badge">
              <span className="sp-suspended-badge-dot" />
              Suspended
            </div>
          </div>

          {/* Notice */}
          <div className="sp-notice">
            If you believe this is a mistake or would like to appeal, please contact our support team at{' '}
            <a href="mailto:valutxsupport@duck.com">valutxsupport@duck.com</a>
            {' '}or reach us on{' '}
            <a href="https://t.me/ValutXOfficial" target="_blank" rel="noreferrer">
              Telegram @ValutXOfficial
            </a>.
            Include your username and a brief explanation. Our team typically responds within 24 hours.
          </div>

          {/* Actions */}
          <div className="sp-actions">
            <a href="mailto:valutxsupport@duck.com" className="sp-btn-primary">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <span>Contact Support</span>
            </a>
            <button className="sp-btn-ghost" onClick={handleLogout}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              Sign Out
            </button>
          </div>

          {/* Footer */}
          <div className="sp-footer">
            © {new Date().getFullYear()} ValutX · <a href="/">Back to Home</a>
          </div>
        </div>
      </div>
    </>
  );
}