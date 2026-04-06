'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();

  /* ── State ── */
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [activeNav, setActiveNav]         = useState('profile');
  const [toastMsg, setToastMsg]           = useState('');
  const [toastCls, setToastCls]           = useState('');
  const [toastShow, setToastShow]         = useState(false);
  const [seeMoreOpen, setSeeMoreOpen]     = useState(false);
  const [copied, setCopied]               = useState(false);
  const [heroName, setHeroName]           = useState('Rakib Kowshar');

  /* form fields */
  const [fName, setFName]   = useState('Rakib Kowshar');
  const [fUn, setFUn]       = useState('rakib.investor');
  const [fEm, setFEm]       = useState('hellorakib.rk@gmail.com');
  const [fPh, setFPh]       = useState('1712-345678');
  const [fCo, setFCo]       = useState('Bangladesh');

  /* ── Refs ── */
  const bgRef       = useRef<HTMLCanvasElement>(null);
  const toastTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formCardRef = useRef<HTMLDivElement>(null);

  /* ── Toast ── */
  const showToast = useCallback((msg: string, cls = '') => {
    setToastMsg('✓  ' + msg);
    setToastCls(cls);
    setToastShow(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastShow(false), 3000);
  }, []);

  /* ── BG Canvas ── */
  useEffect(() => {
    const cvs = bgRef.current;
    if (!cvs) return;
    const cx = cvs.getContext('2d');
    if (!cx) return;
    type Candle = { x:number;y:number;w:number;h:number;wick:number;up:boolean;spd:number;ph:number };
    type Wave   = { pts:{x:number;y:number}[];spd:number;ph:number;amp:number;color:string;opa:string };
    let W=0, H=0, candles:Candle[]=[], waves:Wave[]=[], T=0, animId=0;

    const build = () => {
      const count = Math.max(6, Math.floor(W / 50));
      candles = Array.from({ length: count }, (_,i) => ({
        x: (i/count)*W + 14 + Math.random()*18,
        y: H*0.2 + Math.random()*H*0.58,
        w: 8 + Math.random()*8, h: 14 + Math.random()*70,
        wick: 6 + Math.random()*20, up: Math.random() > 0.42,
        spd: 0.16 + Math.random()*0.36, ph: Math.random()*Math.PI*2,
      }));
      const pts = Math.ceil(W/36)+2;
      waves = [0,1,2,3].map(i => ({
        pts: Array.from({ length: pts }, (_,j) => ({ x: j*36, y: H*(0.15+i*0.22)+Math.random()*45 })),
        spd: 0.11+i*0.04, ph: i*1.4, amp: 14+i*8,
        color: i%2===0 ? 'rgba(74,103,65,' : 'rgba(184,147,90,',
        opa:   i%2===0 ? '0.7)' : '0.55)',
      }));
    };
    const setup = () => { W=cvs.width=window.innerWidth; H=cvs.height=window.innerHeight; build(); };
    const draw = () => {
      cx.clearRect(0,0,W,H); T+=0.011;
      waves.forEach(w => {
        cx.beginPath();
        w.pts.forEach((p,j) => { const y=p.y+Math.sin(T*w.spd+j*0.3+w.ph)*w.amp; j===0?cx.moveTo(p.x,y):cx.lineTo(p.x,y); });
        cx.strokeStyle=w.color+w.opa; cx.lineWidth=1; cx.stroke();
      });
      candles.forEach(c => {
        const bob=Math.sin(T*c.spd+c.ph)*7, x=c.x, y=c.y+bob;
        cx.strokeStyle='rgba(28,28,28,0.8)'; cx.lineWidth=1;
        cx.beginPath(); cx.moveTo(x+c.w/2,y-c.wick); cx.lineTo(x+c.w/2,y+c.h+c.wick); cx.stroke();
        cx.fillStyle=c.up?'rgba(74,103,65,0.88)':'rgba(184,147,90,0.82)';
        cx.fillRect(x,y,c.w,c.h); cx.strokeRect(x,y,c.w,c.h);
      });
      animId = requestAnimationFrame(draw);
    };
    window.addEventListener('resize', setup); setup(); draw();
    return () => { window.removeEventListener('resize', setup); cancelAnimationFrame(animId); };
  }, []);

  /* ── Scroll reveal ── */
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('show'); });
    }, { threshold: 0.1 });
    document.querySelectorAll<HTMLElement>('.pf-reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  /* ── Body scroll lock ── */
  useEffect(() => {
    document.body.style.overflow = (sidebarOpen || seeMoreOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen, seeMoreOpen]);

  /* ── ESC ── */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSeeMoreOpen(false); setSidebarOpen(false); }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  /* ── Save profile ── */
  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setHeroName(fName.trim() || 'Rakib Kowshar');
    showToast('Profile saved successfully', 'ok');
  };

  /* ── Reset form ── */
  const resetForm = () => {
    setFName('Rakib Kowshar'); setFUn('rakib.investor');
    setFEm('hellorakib.rk@gmail.com'); setFPh('1712-345678'); setFCo('Bangladesh');
    showToast('Changes discarded');
  };

  /* ── Copy referral code ── */
  const copyCode = () => {
    const code = 'VAULT-RK-2025';
    const doShow = () => { setCopied(true); showToast('Referral code copied', 'ok'); setTimeout(() => setCopied(false), 2500); };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(doShow).catch(doShow);
    } else doShow();
  };

  /* ── Scroll to form ── */
  const scrollToForm = () => {
    formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* ── Referral table data ── */
  const users = [
    { i:'RM', name:'Rafiqul Molla',    h:'@rafiqul.m',  p:'+$218.40', b:'$1,418.40', w:'$980.00',  s:'active'  },
    { i:'SN', name:'Sharmin Nahar',    h:'@sharmin.n',  p:'+$134.80', b:'$934.80',   w:'$600.00',  s:'active'  },
    { i:'AH', name:'Aminul Hossain',   h:'@aminul.h',   p:'+$89.20',  b:'$589.20',   w:'$380.00',  s:'pending' },
    { i:'FK', name:'Farzana Khanam',   h:'@farzana.k',  p:'+$64.50',  b:'$364.50',   w:'$200.00',  s:'active'  },
    { i:'MR', name:'Mostafizur R.',    h:'@mostafiz.r', p:'+$112.60', b:'$812.60',   w:'$550.00',  s:'active'  },
    { i:'NB', name:'Nasreen Begum',    h:'@nasreen.b',  p:'+$53.00',  b:'$253.00',   w:'$150.00',  s:'pending' },
    { i:'JH', name:'Jahangir Hossain', h:'@jahangir.h', p:'+$0.00',   b:'$500.00',   w:'$0.00',    s:'pending' },
  ];

  /* ── Lock SVG ── */
  const LockSVG = () => (
    <svg width="20" height="20" fill="none" stroke="var(--gold)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="rgba(184,147,90,0.15)"/>
      <path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
  );

  /* ════════════════════════════════════════════════ */
  return (
    <>
      {/* BG Canvas */}
      <canvas ref={bgRef} style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', opacity:.055, width:'100%', height:'100%' }} />

      {/* Toast */}
      <div className={`pf-toast${toastShow?' show':''}${toastCls?' '+toastCls:''}`}>{toastMsg}</div>

      {/* SIDEBAR — outside layout for correct z-index stacking */}
      <aside className={`pf-sidebar${sidebarOpen?' open':''}`}>
        <div className="pf-sidebar-logo">
          <a href="/" style={{ textDecoration:'none', display:'flex', alignItems:'center' }}>
            <div className="pf-logo-mark" />
            <span className="pf-logo-text">Vault<span>X</span></span>
          </a>
        </div>
        <nav className="pf-sidebar-nav">
          {([
            { id:'dashboard', label:'Dashboard', fn:()=>{router.push('/dashboard');}, svg:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></> },
            { id:'seasons',   label:'Seasons',   fn:()=>{router.push('/season');}, svg:<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/> },
            { id:'deposit',   label:'Deposit',   fn:()=>{router.push('/deposit');}, svg:<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></> },
            { id:'withdraw',  label:'Withdraw',  fn:()=>{router.push('/withdraw');}, svg:<><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></> },
            { id:'referral',  label:'Referral',  fn:()=>{router.push('referral');}, svg:<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></> },
            { id:'support',   label:'Support',   fn:()=>{router.push('support');}, svg:<><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></> },
          ] as { id:string; label:string; fn:()=>void; svg:React.ReactNode }[]).map(n => (
            <button key={n.id} className={`pf-nav-item${activeNav===n.id?' active':''}`} onClick={n.fn}>
              <svg fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">{n.svg}</svg>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="pf-sidebar-footer">
          <div className="pf-user-row" onClick={() => router.push('/profile')} style={{ cursor:'pointer' }}>
            <div className="pf-avatar">RK</div>
            <div>
              <div className="pf-user-name">{heroName.split(' ')[0]} M.</div>
              <div className="pf-user-tag">Season 4 Investor</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Sidebar overlay */}
      <div className={`pf-sidebar-overlay${sidebarOpen?' open':''}`} onClick={() => setSidebarOpen(false)} />

      <div className="pf-layout">

        {/* ═══ MOBILE TOPBAR ═══ */}
        <div className="pf-topbar">
          <button className="pf-hamburger" onClick={() => setSidebarOpen(true)}><span/><span/><span/></button>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div className="pf-logo-mark" style={{ width:26, height:26 }} />
            <span className="pf-logo-text" style={{ fontSize:'1.15rem' }}>Vault<span>X</span></span>
          </div>
          <div className="pf-avatar" style={{ width:32, height:32, fontSize:'.8rem', cursor:'pointer' }} onClick={() => router.push('/profile')}>RK</div>
        </div>

        {/* ═══ MAIN ═══ */}
        <div className="pf-main">
          <div style={{ maxWidth:960, margin:'0 auto' }}>

            {/* HEADING */}
            <div className="pf-reveal" style={{ marginBottom:24 }}>
              <span className="pf-label">Account</span>
              <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'clamp(1.6rem,4vw,2.2rem)', fontWeight:400, color:'var(--ink)', lineHeight:1.15 }}>
                Good morning,<br /><em style={{ fontStyle:'italic', color:'var(--gold)' }}>Rakib</em>
              </h1>
            </div>

            {/* HERO CARD */}
            <div className="pf-hero-card pf-reveal" style={{ transitionDelay:'.05s' }}>
              <div style={{ position:'relative', flexShrink:0 }}>
                <div className="pf-avatar-lg">RK<div className="pf-online-dot"/></div>
              </div>
              <div className="pf-hero-body">
                <h2 className="pf-hero-name">{heroName}</h2>
                <div className="pf-hero-uid">@rakib.investor · Member since Jan 2023</div>
                <div className="pf-meta-pills">
                  <div className="pf-pill">Balance <strong>$2,847.65</strong></div>
                  <div className="pf-pill">ROI <strong>+23.4%</strong></div>
                  <div className="pf-pill">Season <strong>S4 Active</strong></div>
                  <div className="pf-pill">Referred <strong>7 users</strong></div>
                </div>
              </div>
              <button className="pf-btn-ghost" style={{ flexShrink:0 }} onClick={scrollToForm}>Edit Profile</button>
            </div>

            {/* TWO-COL */}
            <div className="pf-two-col">

              {/* LEFT COL */}
              <div className="pf-col">

                {/* PROFILE FORM */}
                <div className="pf-card pf-reveal" ref={formCardRef} style={{ transitionDelay:'.08s' }}>
                  <div className="pf-cp" style={{ paddingBottom:0 }}>
                    <span className="pf-sec-label">Personal Info</span>
                    <h2 className="pf-sec-title" style={{ fontSize:'1.25rem', marginBottom:22 }}>Edit Profile</h2>
                  </div>
                  <form onSubmit={saveProfile} className="pf-cp" style={{ paddingTop:0 }}>
                    <div className="pf-form-grid">
                      <div className="pf-fg">
                        <label className="pf-fl" htmlFor="pf-fn">Full Name</label>
                        <input className="pf-fi" type="text" id="pf-fn" value={fName} onChange={e=>setFName(e.target.value)} placeholder="Your full name" required />
                      </div>
                      <div className="pf-fg">
                        <label className="pf-fl" htmlFor="pf-un">Username</label>
                        <input className="pf-fi" type="text" id="pf-un" value={fUn} onChange={e=>setFUn(e.target.value)} placeholder="username" required />
                      </div>
                      <div className="pf-fg pf-f-full">
                        <label className="pf-fl" htmlFor="pf-em">Email Address</label>
                        <input className="pf-fi" type="email" id="pf-em" value={fEm} onChange={e=>setFEm(e.target.value)} placeholder="you@email.com" required />
                      </div>
                      <div className="pf-fg pf-f-full">
                        <label className="pf-fl" htmlFor="pf-ph">Phone Number</label>
                        <div className="pf-phone-row">
                          <span className="pf-phone-pfx">🇧🇩 +880</span>
                          <input className="pf-fi" type="tel" id="pf-ph" value={fPh} onChange={e=>setFPh(e.target.value)} placeholder="01X-XXXXXXXX" />
                        </div>
                      </div>
                      <div className="pf-fg">
                        <label className="pf-fl" htmlFor="pf-co">Country</label>
                        <input className="pf-fi" type="text" id="pf-co" value={fCo} onChange={e=>setFCo(e.target.value)} placeholder="Country" />
                      </div>
                      <div className="pf-fg">
                        <label className="pf-fl" htmlFor="pf-ss">Active Season</label>
                        <input className="pf-fi" type="text" id="pf-ss" value="Season 4" readOnly />
                      </div>
                      <div className="pf-f-full" style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:6 }}>
                        <button type="submit" className="pf-btn-ink">Save Changes</button>
                        <button type="button" className="pf-btn-ghost" onClick={resetForm}>Cancel</button>
                      </div>
                    </div>
                  </form>
                </div>

                {/* SECURITY */}
                <div className="pf-card pf-reveal pf-cp" style={{ transitionDelay:'.12s' }}>
                  <span className="pf-sec-label">Security</span>
                  <h2 className="pf-sec-title" style={{ fontSize:'1.25rem', marginBottom:18 }}>Account Security</h2>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

                    {/* Password — unlocked */}
                    <div className="pf-sec-row">
                      <div>
                        <div style={{ fontSize:'.82rem', fontWeight:500, color:'var(--ink)', marginBottom:2 }}>Password</div>
                        <div style={{ fontSize:'.7rem', color:'var(--txt2)' }}>Last changed 45 days ago</div>
                      </div>
                      <button className="pf-btn-ghost" style={{ fontSize:'.7rem', padding:'7px 14px' }}
                        onClick={() => showToast('Password reset link sent to your email.', 'ok')}>Change</button>
                    </div>

                    {/* Google 2FA — locked */}
                    <div className="pf-lock-wrapper">
                      <div className="pf-sec-row">
                        <div>
                          <div style={{ fontSize:'.82rem', fontWeight:500, color:'var(--ink)', marginBottom:2 }}>Google Two-Factor Auth</div>
                          <div style={{ fontSize:'.7rem', color:'var(--txt2)' }}>Extra layer of protection via Google Authenticator</div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:'.68rem', textTransform:'uppercase', letterSpacing:'.06em', color:'var(--sage)' }}>Enabled</span>
                          <div className="pf-toggle-track"><div className="pf-toggle-knob"/></div>
                        </div>
                      </div>
                      <div className="pf-lock-overlay">
                        <div className="pf-lock-badge"><LockSVG /></div>
                        <div className="pf-lock-text-block">
                          <span className="pf-lock-main">Not available in your region</span>
                          <span className="pf-lock-hint">Google 2FA is restricted for your account</span>
                        </div>
                      </div>
                    </div>

                    {/* KYC — locked */}
                    <div className="pf-lock-wrapper">
                      <div className="pf-sec-row">
                        <div>
                          <div style={{ fontSize:'.82rem', fontWeight:500, color:'var(--ink)', marginBottom:2 }}>KYC Verification</div>
                          <div style={{ fontSize:'.7rem', color:'var(--txt2)' }}>Identity document verification</div>
                        </div>
                        <span className="pf-badge pf-b-act">Verified</span>
                      </div>
                      <div className="pf-lock-overlay">
                        <div className="pf-lock-badge"><LockSVG /></div>
                        <div className="pf-lock-text-block">
                          <span className="pf-lock-main">Not available in your region</span>
                          <span className="pf-lock-hint">KYC verification is restricted for your account</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>{/* /left */}

              {/* RIGHT COL */}
              <div className="pf-col">

                {/* REFERRAL */}
                <div className="pf-card pf-reveal pf-cp" style={{ transitionDelay:'.1s' }}>
                  <span className="pf-sec-label">Passive Income</span>
                  <h2 className="pf-sec-title" style={{ fontSize:'1.25rem', marginBottom:6 }}>Referral Program</h2>
                  <p style={{ fontSize:'.78rem', color:'var(--txt2)', fontWeight:300, lineHeight:1.75, marginBottom:20 }}>
                    Earn <strong style={{ color:'var(--gold)' }}>5% commission</strong> automatically every time a referred user makes a withdrawal — no cap, no delays.
                  </p>
                  <span className="pf-sec-label">Your Code</span>
                  <div className="pf-ref-code-box" style={{ marginBottom:18 }}>
                    <span className="pf-ref-code-val">VAULT-RK-2025</span>
                    <button className={`pf-btn-copy${copied?' copied':''}`} onClick={copyCode}>
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <span className="pf-sec-label">Statistics</span>
                  <div className="pf-stat-trio" style={{ marginBottom:18 }}>
                    <div className="pf-stat-cell"><div className="pf-stat-val">$84<span>.50</span></div><div className="pf-stat-lbl">Commission</div></div>
                    <div className="pf-stat-cell"><div className="pf-stat-val">7</div><div className="pf-stat-lbl">Referred</div></div>
                    <div className="pf-stat-cell"><div className="pf-stat-val">5<span>%</span></div><div className="pf-stat-lbl">Rate</div></div>
                  </div>
                  <div style={{ background:'rgba(184,147,90,0.05)', border:'1px solid var(--border)', borderRadius:6, padding:'12px 14px', marginBottom:20 }}>
                    <div style={{ fontSize:'.68rem', color:'var(--txt2)', lineHeight:1.85, fontWeight:300 }}>
                      📌 Share code → Friend invests → Friend withdraws → <strong style={{ color:'var(--gold)' }}>You earn 5%</strong> credited automatically.
                    </div>
                  </div>

                  {/* Referred users table */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                    <span className="pf-sec-label" style={{ marginBottom:0 }}>Referred Users</span>
                    <span style={{ fontSize:'.65rem', color:'var(--txt2)', letterSpacing:'.06em' }}>7 total</span>
                  </div>
                  <div className="pf-tbl-wrap">
                    <table className="pf-rtbl">
                      <thead><tr><th>User</th><th>Profit</th><th>Balance</th><th>Withdrawable</th><th>Status</th></tr></thead>
                      <tbody>
                        {users.map((u, i) => (
                          <tr key={i}>
                            <td>
                              <div className="pf-td-u">
                                <div className="pf-td-av">{u.i}</div>
                                <div><div className="pf-td-nm">{u.name}</div><div className="pf-td-hd">{u.h}</div></div>
                              </div>
                            </td>
                            <td className={u.p==='+$0.00'?'pf-c-neu':'pf-c-pos'}>{u.p}</td>
                            <td style={{ fontWeight:500, color:'var(--ink)' }}>{u.b}</td>
                            <td style={{ color:'var(--sage)' }}>{u.w}</td>
                            <td><span className={`pf-badge ${u.s==='active'?'pf-b-act':'pf-b-pend'}`}>{u.s}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ marginTop:14, textAlign:'center' }}>
                    <button className="pf-btn-ghost" style={{ width:'100%' }} onClick={() => setSeeMoreOpen(true)}>See Full List →</button>
                  </div>
                </div>

                {/* WALLET */}
                <div className="pf-card pf-reveal pf-cp" style={{ transitionDelay:'.14s' }}>
                  <span className="pf-sec-label">Assets</span>
                  <h2 className="pf-sec-title" style={{ fontSize:'1.25rem', marginBottom:16 }}>Wallet Summary</h2>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    <div className="pf-wrow"><span className="pf-wrow-lbl">Total Invested</span><span className="pf-wrow-val" style={{ color:'var(--ink)' }}>$8,420.00</span></div>
                    <div className="pf-wrow"><span className="pf-wrow-lbl">Current Balance</span><span className="pf-wrow-val" style={{ color:'var(--gold)' }}>$2,847.65</span></div>
                    <div className="pf-wrow"><span className="pf-wrow-lbl">Withdrawable</span><span className="pf-wrow-val" style={{ color:'var(--sage)' }}>$1,920.00</span></div>
                    <div className="pf-wrow"><span className="pf-wrow-lbl">Total Profits</span><span className="pf-wrow-val" style={{ color:'var(--sage)' }}>+$673.00</span></div>
                    <div className="pf-wrow"><span className="pf-wrow-lbl">Referral Commission</span><span className="pf-wrow-val" style={{ color:'var(--gold)' }}>+$84.50</span></div>
                  </div>
                </div>

              </div>{/* /right */}
            </div>{/* /two-col */}
          </div>
        </div>{/* /main */}
      </div>{/* /layout */}

      {/* SEE MORE MODAL */}
      <div className={`pf-overlay${seeMoreOpen?' open':''}`} onClick={e => { if (e.target === e.currentTarget) setSeeMoreOpen(false); }}>
        <div className="pf-modal-box">
          <div className="pf-modal-hd">
            <span className="pf-modal-ttl">All Referred Users</span>
            <button className="pf-modal-cls" onClick={() => setSeeMoreOpen(false)}>✕</button>
          </div>
          <p style={{ fontSize:'.82rem', color:'var(--txt2)', fontWeight:300, lineHeight:1.75, marginBottom:16 }}>
            You have referred <strong style={{ color:'var(--ink)' }}>7 users</strong> so far.
          </p>
          <div className="pf-placeholder-box">
            <div className="pf-placeholder-big">Full Referral List</div>
            <div className="pf-placeholder-sub">A complete paginated table of all 7 referred accounts — including withdrawal history, per-transaction commission, and account tier.</div>
            <div style={{ marginTop:14, fontSize:'.7rem', color:'#b8b0a4', letterSpacing:'.04em' }}>Connecting to live referral dashboard…</div>
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            <button className="pf-btn-ink" style={{ flex:1, minWidth:120, textAlign:'center' }} onClick={() => setSeeMoreOpen(false)}>Close</button>
            <button className="pf-btn-ghost" style={{ flex:1, minWidth:120, textAlign:'center' }}
              onClick={() => { showToast('CSV export coming soon.', 'ok'); setSeeMoreOpen(false); }}>Export CSV</button>
          </div>
        </div>
      </div>
    </>
  );
}