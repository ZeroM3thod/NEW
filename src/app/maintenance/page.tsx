'use client';
// src/app/maintenance/page.tsx
// Drop this file at: src/app/maintenance/page.tsx
// Also create:       src/app/maintenance/layout.tsx  (see bottom of file)

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

/* ─── types ─── */
interface Candle { x:number;y:number;w:number;h:number;wick:number;up:boolean;spd:number;ph:number }
interface Wave { pts:{x:number;y:number}[];spd:number;ph:number;amp:number;col:string;opa:string }

function pad(n: number){ return String(n).padStart(2,'0'); }

export default function MaintenancePage() {
  const bgRef = useRef<HTMLCanvasElement>(null);
  const supabase = createClient();

  const [endTime, setEndTime] = useState<number | null>(null);
  const [h, setH] = useState('00');
  const [m, setM] = useState('00');
  const [s, setS] = useState('00');
  const [tickH, setTickH] = useState(false);
  const [tickM, setTickM] = useState(false);
  const [tickS, setTickS] = useState(false);
  const [progPct, setProgPct] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function fetchMaintenance() {
      const { data } = await supabase
        .from('settings')
        .select('maintenance_ends_at')
        .eq('id', 1)
        .single();
      
      if (data?.maintenance_ends_at) {
        setEndTime(new Date(data.maintenance_ends_at).getTime());
      }
    }
    fetchMaintenance();
  }, [supabase]);

  /* ── Countdown ── */
  useEffect(()=>{
    if (!endTime) return;
    const tick = ()=>{
      const now  = Date.now();
      const diff = Math.max(0, endTime - now);
      const hh   = Math.floor(diff / 3_600_000);
      const mm   = Math.floor((diff % 3_600_000) / 60_000);
      const ss   = Math.floor((diff % 60_000) / 1_000);

      setH(prev => { if(prev !== pad(hh)){ setTickH(true); setTimeout(()=>setTickH(false),300); } return pad(hh); });
      setM(prev => { if(prev !== pad(mm)){ setTickM(true); setTimeout(()=>setTickM(false),300); } return pad(mm); });
      setS(prev => { if(prev !== pad(ss)){ setTickS(true); setTimeout(()=>setTickS(false),300); } return pad(ss); });

      // Mock progress based on a 2h window if we don't have start time
      const startTime = endTime - 2 * 60 * 60 * 1000;
      const elapsed = Date.now() - startTime;
      setProgPct(Math.min(100, Math.round(elapsed / (2 * 60 * 60 * 1000) * 100)));

      if(diff === 0){
        setDone(true);
        clearInterval(iv);
        setTimeout(()=>{ window.location.href = '/'; }, 3000);
      }
    };
    tick();
    const iv = setInterval(tick, 1000);
    return ()=>clearInterval(iv);
  },[endTime]);

  /* ── BG Canvas ── */
  useEffect(()=>{
    const cvs = bgRef.current; if(!cvs) return;
    const cx  = cvs.getContext('2d')!;
    let W=0,H=0,T=0,candles:Candle[]=[],waves:Wave[]=[],rafId=0;

    const build = ()=>{
      const n=Math.max(6,Math.floor(W/50));
      candles=Array.from({length:n},(_,i)=>({
        x:(i/n)*W+14+Math.random()*18, y:H*0.18+Math.random()*H*0.62,
        w:8+Math.random()*9, h:14+Math.random()*70,
        wick:6+Math.random()*22, up:Math.random()>0.42,
        spd:0.15+Math.random()*0.35, ph:Math.random()*Math.PI*2,
      }));
      const pts=Math.ceil(W/36)+2;
      waves=[0,1,2,3].map(i=>({
        pts:Array.from({length:pts},(_,j)=>({x:j*36,y:H*(0.15+i*0.22)+Math.random()*44})),
        spd:0.1+i*0.04, ph:i*1.4, amp:13+i*8,
        col:i%2===0?'rgba(74,103,65,':'rgba(184,147,90,',
        opa:i%2===0?'0.72)':'0.56)',
      }));
    };
    const setup = ()=>{ W=cvs.width=window.innerWidth; H=cvs.height=window.innerHeight; build(); };
    const draw  = ()=>{
      cx.clearRect(0,0,W,H); T+=0.011;
      waves.forEach(w=>{
        cx.beginPath();
        w.pts.forEach((p,j)=>{ const y=p.y+Math.sin(T*w.spd+j*0.3+w.ph)*w.amp; j===0?cx.moveTo(p.x,y):cx.lineTo(p.x,y); });
        cx.strokeStyle=w.col+w.opa; cx.lineWidth=1; cx.stroke();
      });
      candles.forEach(c=>{
        const bob=Math.sin(T*c.spd+c.ph)*7,x=c.x,y=c.y+bob;
        cx.strokeStyle='rgba(28,28,28,.8)'; cx.lineWidth=1;
        cx.beginPath(); cx.moveTo(x+c.w/2,y-c.wick); cx.lineTo(x+c.w/2,y+c.h+c.wick); cx.stroke();
        cx.fillStyle=c.up?'rgba(74,103,65,.88)':'rgba(184,147,90,.82)';
        cx.fillRect(x,y,c.w,c.h); cx.strokeRect(x,y,c.w,c.h);
      });
      rafId=requestAnimationFrame(draw);
    };
    window.addEventListener('resize',setup); setup(); draw();
    return()=>{ window.removeEventListener('resize',setup); cancelAnimationFrame(rafId); };
  },[]);

  return (
    <>
      {/* ── GLOBAL STYLES ── */}
      <style>{`
        :root{
          --ink:#1c1c1c;--cream:#f6f1e9;--parchment:#ede7da;
          --gold:#b8935a;--gold-l:#d4aa72;--gold-d:#9a7a47;
          --sage:#4a6741;--sage-l:#6a8c60;--charcoal:#2e2e2e;
          --surface:#faf7f2;--border:rgba(184,147,90,0.18);
          --border-h:rgba(184,147,90,0.35);--text-sec:#6b6459;--radius:6px;
        }
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth;height:100%}
        body{
          font-family:'DM Sans',sans-serif;background:var(--cream);color:var(--ink);
          min-height:100svh;overflow-x:hidden;-webkit-font-smoothing:antialiased;
          display:flex;flex-direction:column;align-items:center;justify-content:center;
        }
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:var(--parchment)}
        ::-webkit-scrollbar-thumb{background:var(--gold);border-radius:10px}
        body::before{
          content:'';position:fixed;inset:0;z-index:1;pointer-events:none;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.022'/%3E%3C/svg%3E");
          opacity:.42;
        }
        @keyframes cardIn{from{opacity:0;transform:translateY(24px) scale(.97)}to{opacity:1;transform:none}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes statusPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}
      `}</style>

      {/* BG Canvas */}
      <canvas ref={bgRef} style={{position:'fixed',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0,opacity:.055}}/>

      {/* Page Shell */}
      <div style={{position:'relative',zIndex:2,width:'100%',minHeight:'100svh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'40px 20px'}}>

        {/* Main Card */}
        <div style={{
          background:'rgba(250,247,242,0.92)',
          backdropFilter:'blur(28px)',WebkitBackdropFilter:'blur(28px)',
          border:'1px solid var(--border)',borderRadius:18,
          width:'100%',maxWidth:560,padding:'48px 40px 44px',
          boxShadow:'0 4px 40px rgba(184,147,90,.08),0 1px 0 rgba(255,255,255,.8) inset',
          position:'relative',textAlign:'center',
          animation:'cardIn .7s cubic-bezier(.16,1,.3,1) both',
        }}>
          {/* Gold top rule */}
          <div style={{position:'absolute',top:0,left:'50%',transform:'translateX(-50%)',width:'48%',height:2,background:'linear-gradient(90deg,transparent,var(--gold),transparent)',borderRadius:'0 0 4px 4px'}}/>

          {/* Logo */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10,marginBottom:32,animation:'fadeUp .7s .08s cubic-bezier(.16,1,.3,1) both'}}>
            <div style={{width:48,height:48,background:'var(--ink)',borderRadius:'var(--radius)',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',bottom:8,left:'50%',transform:'translateX(-50%)',width:18,height:1.5,background:'var(--gold)',borderRadius:2,boxShadow:'0 -6px 0 var(--gold-l),0 -12px 0 var(--cream)'}}/>
            </div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.5rem',fontWeight:600,color:'var(--ink)',letterSpacing:'.04em'}}>
              Vault<span style={{color:'var(--gold)'}}>X</span>
            </div>
          </div>

          {/* Wrench icon */}
          <div style={{width:80,height:80,borderRadius:'50%',background:'rgba(184,147,90,.08)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px',animation:'fadeUp .7s .14s cubic-bezier(.16,1,.3,1) both, float 3.6s ease-in-out infinite 1s'}}>
            <svg viewBox="0 0 24 24" width={34} height={34} fill="none" stroke="var(--gold)" strokeWidth={1.6}>
              <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>

          {/* Status bar */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,background:'rgba(184,147,90,.06)',border:'1px solid var(--border)',borderRadius:100,padding:'8px 20px',marginBottom:32,animation:'fadeUp .7s .3s cubic-bezier(.16,1,.3,1) both'}}>
            {done ? (
              <>
                <svg width={8} height={8} viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="var(--sage)"/></svg>
                <span style={{fontSize:'.72rem',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--sage)'}}>Maintenance Complete — Reloading…</span>
              </>
            ) : (
              <>
                <div style={{width:8,height:8,borderRadius:'50%',background:'var(--gold)',animation:'statusPulse 1.8s ease-in-out infinite',flexShrink:0}}/>
                <span style={{fontSize:'.72rem',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--gold)'}}>Maintenance In Progress</span>
              </>
            )}
          </div>

          {/* Text */}
          <span style={{fontSize:'.66rem',letterSpacing:'.22em',textTransform:'uppercase',color:'var(--gold)',display:'block',marginBottom:10,animation:'fadeUp .7s .18s cubic-bezier(.16,1,.3,1) both'}}>
            Platform Update
          </span>
          <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'clamp(1.8rem,5vw,2.6rem)',fontWeight:400,lineHeight:1.15,color:'var(--ink)',marginBottom:14,animation:'fadeUp .7s .22s cubic-bezier(.16,1,.3,1) both'}}>
            We'll be back<br/><em style={{fontStyle:'italic',color:'var(--gold)'}}>shortly.</em>
          </h1>
          <p style={{fontSize:'.86rem',color:'var(--text-sec)',fontWeight:300,lineHeight:1.75,maxWidth:400,margin:'0 auto 32px',animation:'fadeUp .7s .26s cubic-bezier(.16,1,.3,1) both'}}>
            VaultX is currently undergoing scheduled maintenance to improve your experience. We apologise for the inconvenience and appreciate your patience.
          </p>

          {/* Countdown */}
          <div style={{marginBottom:32,animation:'fadeUp .7s .34s cubic-bezier(.16,1,.3,1) both'}}>
            <span style={{fontSize:'.62rem',letterSpacing:'.14em',textTransform:'uppercase',color:'var(--text-sec)',marginBottom:14,display:'block'}}>Estimated time remaining</span>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              {[{val:h,lbl:'Hours',tick:tickH},{val:m,lbl:'Mins',tick:tickM},{val:s,lbl:'Secs',tick:tickS}].map((u,i)=>(
                <>
                  <div key={u.lbl} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5,flex:1,maxWidth:72}}>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'clamp(2rem,6vw,2.8rem)',fontWeight:300,color:u.tick?'var(--gold)':'var(--ink)',lineHeight:1,background:'var(--surface)',border:`1px solid ${u.tick?'var(--border-h)':'var(--border)'}`,borderRadius:10,width:'100%',textAlign:'center',padding:'12px 6px',transition:'all .3s'}}>
                      {u.val}
                    </div>
                    <span style={{fontSize:'.58rem',letterSpacing:'.14em',textTransform:'uppercase',color:'var(--text-sec)'}}>{u.lbl}</span>
                  </div>
                  {i < 2 && <div key={`sep${i}`} style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'2rem',fontWeight:300,color:'var(--gold)',lineHeight:1,marginBottom:20,flexShrink:0}}>:</div>}
                </>
              ))}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{marginBottom:32,animation:'fadeUp .7s .38s cubic-bezier(.16,1,.3,1) both'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
              <span style={{fontSize:'.68rem',color:'var(--text-sec)',letterSpacing:'.06em'}}>Maintenance Progress</span>
              <span style={{fontSize:'.72rem',color:'var(--gold)',fontWeight:500}}>{progPct}%</span>
            </div>
            <div style={{height:5,background:'rgba(184,147,90,.12)',borderRadius:100,overflow:'hidden'}}>
              <div style={{height:'100%',background:'linear-gradient(90deg,var(--gold-d),var(--gold-l))',borderRadius:100,width:`${progPct}%`,transition:'width 2s cubic-bezier(.16,1,.3,1)'}}/>
            </div>
          </div>

          {/* Feature chips */}
          <div style={{marginBottom:28,animation:'fadeUp .7s .36s cubic-bezier(.16,1,.3,1) both'}}>
            <span style={{fontSize:'.6rem',letterSpacing:'.14em',textTransform:'uppercase',color:'var(--text-sec)',marginBottom:12,display:'block'}}>What's being updated</span>
            <div style={{display:'flex',flexWrap:'wrap',gap:7,justifyContent:'center'}}>
              {[
                {label:'Database migration',    status:'done'},
                {label:'Security patches',      status:'done'},
                {label:'Performance optimisation',status:'in-progress'},
                {label:'Final system checks',   status:'pending'},
              ].map(f=>{
                const dotColor = f.status==='done'?'var(--sage)':f.status==='in-progress'?'var(--gold)':'rgba(107,100,89,.35)';
                const chipColor = f.status==='done'?'var(--sage)':f.status==='in-progress'?'var(--gold-d)':'var(--text-sec)';
                const chipBg  = f.status==='done'?'rgba(74,103,65,.06)':'rgba(184,147,90,.06)';
                const chipBd  = f.status==='done'?'rgba(74,103,65,.18)':'var(--border)';
                return (
                  <div key={f.label} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'5px 12px',background:chipBg,border:`1px solid ${chipBd}`,borderRadius:100,fontSize:'.68rem',color:chipColor,letterSpacing:'.04em'}}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:dotColor,flexShrink:0,animation:f.status==='in-progress'?'statusPulse 1.4s ease-in-out infinite':undefined}}/>
                    {f.label}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div style={{height:1,background:'var(--border)',margin:'28px 0'}}/>

          {/* Contact */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:20,flexWrap:'wrap',animation:'fadeUp .7s .42s cubic-bezier(.16,1,.3,1) both'}}>
            <a href="mailto:support@vaultx.io" style={{display:'inline-flex',alignItems:'center',gap:7,fontSize:'.74rem',color:'var(--text-sec)',textDecoration:'none',transition:'color .2s',letterSpacing:'.03em'}}
              onMouseOver={e=>(e.currentTarget.style.color='var(--gold)')}
              onMouseOut={e=>(e.currentTarget.style.color='var(--text-sec)')}>
              <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="var(--gold)" strokeWidth={1.8}>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              support@vaultx.io
            </a>
            <div style={{width:3,height:3,borderRadius:'50%',background:'var(--border-h)',flexShrink:0}}/>
            <a href="https://t.me/VaultXOfficial" target="_blank" rel="noreferrer"
              style={{display:'inline-flex',alignItems:'center',gap:7,fontSize:'.74rem',color:'var(--text-sec)',textDecoration:'none',transition:'color .2s',letterSpacing:'.03em'}}
              onMouseOver={e=>(e.currentTarget.style.color='var(--gold)')}
              onMouseOut={e=>(e.currentTarget.style.color='var(--text-sec)')}>
              <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="var(--gold)" strokeWidth={1.8}>
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              @VaultXOfficial
            </a>
          </div>
        </div>{/* /maint-card */}
      </div>{/* /page-shell */}

      {/* Admin bypass link */}
      <div style={{position:'fixed',bottom:20,right:20,zIndex:10,animation:'fadeUp .7s .6s cubic-bezier(.16,1,.3,1) both'}}>
        <a href="/admin/dashboard" style={{display:'inline-flex',alignItems:'center',gap:6,padding:'7px 14px',background:'rgba(28,28,28,.06)',border:'1px solid var(--border)',borderRadius:100,fontSize:'.64rem',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text-sec)',textDecoration:'none',transition:'all .22s'}}
          onMouseOver={e=>{ (e.currentTarget as HTMLElement).style.borderColor='var(--gold)'; (e.currentTarget as HTMLElement).style.color='var(--gold)'; }}
          onMouseOut={e=>{ (e.currentTarget as HTMLElement).style.borderColor='var(--border)'; (e.currentTarget as HTMLElement).style.color='var(--text-sec)'; }}>
          <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
          Admin Access
        </a>
      </div>

      {/* Bottom caption */}
      <div style={{position:'fixed',bottom:14,left:0,right:0,textAlign:'center',zIndex:2,pointerEvents:'none',fontSize:'.64rem',letterSpacing:'.08em',color:'rgba(107,100,89,.4)'}}>
        © 2025 VaultX · All rights reserved
      </div>
    </>
  );
}

/*
─────────────────────────────────────────
  ALSO CREATE THIS LAYOUT FILE:
  src/app/maintenance/layout.tsx
─────────────────────────────────────────

import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'VaultX — Under Maintenance',
  description: 'VaultX is currently undergoing scheduled maintenance.',
};

export default function MaintenanceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
─────────────────────────────────────────
*/