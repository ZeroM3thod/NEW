'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const ALL_REFERRALS = [
  { name:'Sophia Harrington', un:'@sophi_h',    init:'SH', joined:'01 Apr 2025', invested:4800,  comm:240.00, status:'active'   },
  { name:'Marcus Liu',         un:'@mliu_inv',  init:'ML', joined:'28 Mar 2025', invested:3200,  comm:160.00, status:'active'   },
  { name:'Elena Petrova',      un:'@epetrova',  init:'EP', joined:'22 Mar 2025', invested:7500,  comm:375.00, status:'active'   },
  { name:'David Okafor',       un:'@d.okafor',  init:'DO', joined:'15 Mar 2025', invested:1200,  comm:60.00,  status:'active'   },
  { name:'Aisha Nasser',       un:'@aisha.n',   init:'AN', joined:'10 Mar 2025', invested:5000,  comm:250.00, status:'active'   },
  { name:'Tom Brightwell',     un:'@tombright', init:'TB', joined:'02 Mar 2025', invested:0,     comm:0.00,   status:'pending'  },
  { name:'Chloe Mercier',      un:'@c.mercier', init:'CM', joined:'24 Feb 2025', invested:2400,  comm:120.00, status:'active'   },
  { name:'Rajan Mehta',        un:'@r.mehta',   init:'RM', joined:'18 Feb 2025', invested:6100,  comm:305.00, status:'active'   },
  { name:'Ingrid Olsson',      un:'@i.olsson',  init:'IO', joined:'11 Feb 2025', invested:980,   comm:49.00,  status:'active'   },
  { name:'James Thornton',     un:'@jthornton', init:'JT', joined:'05 Feb 2025', invested:0,     comm:0.00,   status:'pending'  },
  { name:'Priya Sundar',       un:'@p.sundar',  init:'PS', joined:'28 Jan 2025', invested:3750,  comm:187.50, status:'active'   },
  { name:'Luca Ferretti',      un:'@lferretti', init:'LF', joined:'20 Jan 2025', invested:1500,  comm:75.00,  status:'active'   },
  { name:'Fatima Zahra',       un:'@f.zahra',   init:'FZ', joined:'14 Jan 2025', invested:0,     comm:0.00,   status:'inactive' },
  { name:'Alex Rutherford',    un:'@a.ruth',    init:'AR', joined:'07 Jan 2025', invested:2200,  comm:110.00, status:'active'   },
  { name:'Yuki Tanaka',        un:'@y.tanaka',  init:'YT', joined:'02 Jan 2025', invested:4400,  comm:220.00, status:'active'   },
  { name:'Ben Adeyemi',        un:'@ben.ade',   init:'BA', joined:'26 Dec 2024', invested:800,   comm:40.00,  status:'active'   },
  { name:'Clara Schmidt',      un:'@c.schmidt', init:'CS', joined:'20 Dec 2024', invested:3100,  comm:155.00, status:'active'   },
  { name:'Nadia Kovalenko',    un:'@n.koval',   init:'NK', joined:'14 Dec 2024', invested:0,     comm:0.00,   status:'inactive' },
  { name:'Hamid Rashidi',      un:'@h.rashidi', init:'HR', joined:'08 Dec 2024', invested:5500,  comm:275.00, status:'active'   },
  { name:'Olivia Grant',       un:'@o.grant',   init:'OG', joined:'01 Dec 2024', invested:1900,  comm:95.00,  status:'active'   },
  { name:'Samuel Deschamps',   un:'@s.deschamps',init:'SD',joined:'24 Nov 2024', invested:2800,  comm:140.00, status:'active'   },
  { name:'Mei Lin',            un:'@mei.lin',   init:'ML', joined:'18 Nov 2024', invested:700,   comm:35.00,  status:'active'   },
  { name:'Victor Ibarra',      un:'@v.ibarra',  init:'VI', joined:'10 Nov 2024', invested:0,     comm:0.00,   status:'inactive' },
  { name:'Anouk Vermeer',      un:'@a.vermeer', init:'AV', joined:'03 Nov 2024', invested:4200,  comm:210.00, status:'active'   },
];

const PER_PAGE = 10;

export default function ReferralPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hamOpen, setHamOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastCls, setToastCls] = useState('');
  const [toastShow, setToastShow] = useState(false);
  const [refTab, setRefTab] = useState<'link'|'code'>('link');
  const [linkCopied, setLinkCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [milestoneWidth, setMilestoneWidth] = useState('0%');
  const [ringOffset, setRingOffset] = useState(188);
  const toastTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  const showToast = useCallback((msg: string, cls = '') => {
    setToastMsg(msg); setToastCls(cls); setToastShow(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastShow(false), 2800);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); });
    }, { threshold: 0.06 });
    document.querySelectorAll<HTMLElement>('.rf-reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setMilestoneWidth('48%');
      setRingOffset(2 * Math.PI * 30 * (1 - 24/50));
    }, 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { setSidebarOpen(false); setHamOpen(false); } };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  /* Responsive info-grid */
  useEffect(() => {
    const apply = () => {
      const ig = document.getElementById('rf-info-grid');
      const sp = document.getElementById('rf-side-panels');
      if (!ig || !sp) return;
      if (window.innerWidth >= 1100) {
        ig.style.gridTemplateColumns = '1.6fr 1fr';
        sp.style.gridTemplateColumns = '1fr';
      } else if (window.innerWidth >= 640) {
        ig.style.gridTemplateColumns = '1fr';
        sp.style.gridTemplateColumns = '1fr 1fr';
      } else {
        ig.style.gridTemplateColumns = '1fr';
        sp.style.gridTemplateColumns = '1fr';
      }
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);

  const copyRef = (type: 'link'|'code') => {
    const text = type === 'link' ? 'https://vaultx.io/ref/JSDRT-2024' : 'JSDRT-2024';
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => {});
    if (type === 'link') { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2200); }
    else { setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2200); }
    showToast(type === 'link' ? '🔗 Referral link copied!' : '📋 Referral code copied!', 'ok');
  };

  const shareVia = (platform: string) => {
    const link = 'https://vaultx.io/ref/JSDRT-2024';
    const msg = `Join VaultX and invest with me! ${link}`;
    const urls: Record<string,string> = {
      WhatsApp: `https://wa.me/?text=${encodeURIComponent(msg)}`,
      Telegram: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Join VaultX!')}`,
      Twitter:  `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}`,
      Email:    `mailto:?subject=Join%20VaultX&body=${encodeURIComponent(msg)}`,
    };
    if (urls[platform]) window.open(urls[platform], '_blank');
    showToast(`📤 Opening ${platform}…`);
  };

  const getFiltered = () => filter === 'all' ? ALL_REFERRALS : ALL_REFERRALS.filter(r => r.status === filter);
  const filtered = getFiltered();
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const start = (page - 1) * PER_PAGE;
  const slice = filtered.slice(start, start + PER_PAGE);
  const goPage = (n: number) => { if (n >= 1 && n <= totalPages) setPage(n); };

  const navItems = [
    {id:'dashboard',label:'Dashboard',fn:()=>router.push('/dashboard'),svg:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>},
    {id:'seasons',  label:'Seasons',  fn:()=>router.push('/season'),   svg:<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>},
    {id:'deposit',  label:'Deposit',  fn:()=>router.push('/deposit'),  svg:<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></>},
    {id:'withdraw', label:'Withdraw', fn:()=>router.push('/withdraw'), svg:<><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></>},
    {id:'referral', label:'Referral', fn:()=>{},                       svg:<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>},
    {id:'support',  label:'Support',  fn:()=>router.push('/support'),  svg:<><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>},
  ] as {id:string;label:string;fn:()=>void;svg:React.ReactNode}[];

  const BadgeComp = ({status}:{status:string}) => (
    <span className={`rf-badge rf-b-${status}`}>{status}</span>
  );

  return (
    <>
      <div className={`rf-toast${toastShow?' show':''}${toastCls?' '+toastCls:''}`}>{toastMsg}</div>

      {/* SIDEBAR — outside layout */}
      <aside className={`rf-sidebar${sidebarOpen?' open':''}`}>
        <div className="rf-sidebar-logo">
          <a href="/" style={{textDecoration:'none',display:'flex',alignItems:'center'}}>
            <div className="rf-logo-mark"/><span className="rf-logo-text">Vault<span>X</span></span>
          </a>
        </div>
        <nav className="rf-sidebar-nav">
          {navItems.map(n=>(
            <button key={n.id} className={`rf-nav-item${n.id==='referral'?' active':''}`}
              onClick={()=>{n.fn();setSidebarOpen(false);setHamOpen(false);}}>
              <svg fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">{n.svg}</svg>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="rf-sidebar-footer">
          <div className="rf-user-row" onClick={()=>router.push('/profile')}>
            <div className="rf-avatar">RK</div>
            <div><div className="rf-user-name">Rafiqul M.</div><div className="rf-user-tag">Season 4 Investor</div></div>
          </div>
        </div>
      </aside>
      <div className={`rf-sb-overlay${sidebarOpen?' show':''}`} onClick={()=>{setSidebarOpen(false);setHamOpen(false);}}/>

      <div className="rf-layout">

        {/* MOBILE TOPBAR */}
        <div className="rf-topbar">
          <button className={`rf-ham-btn${hamOpen?' is-open':''}`} onClick={()=>{setSidebarOpen(o=>!o);setHamOpen(o=>!o);}}>
            <span/><span/><span/>
          </button>
          <div style={{position:'absolute',left:'50%',transform:'translateX(-50%)',display:'flex',alignItems:'center',gap:8,cursor:'pointer'}} onClick={()=>router.push('/')}>
            <div className="rf-logo-mark" style={{width:26,height:26}}/>
            <span className="rf-logo-text" style={{fontSize:'1.15rem'}}>Vault<span>X</span></span>
          </div>
          <div className="rf-topbar-avatar" onClick={()=>router.push('/profile')}>RK</div>
        </div>

        {/* MAIN */}
        <main className="rf-main">
          <div style={{maxWidth:1100,margin:'0 auto'}}>

            {/* PAGE TITLE */}
            <div className="rf-reveal" style={{marginBottom:22}}>
              <span className="rf-sec-label">My Account</span>
              <h1 className="rf-sec-title">Referral Program</h1>
              <p className="rf-sec-sub">Invite friends and earn 5% commission on every investment they make.</p>
            </div>

            {/* REFERRAL HERO */}
            <div className="rf-hero rf-reveal" style={{marginBottom:14}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:10,marginBottom:16}}>
                <div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.1rem',fontWeight:400,color:'var(--ink)',marginBottom:3}}>Your Unique Referral Details</div>
                  <div style={{fontSize:'.7rem',color:'var(--text-sec)'}}>Share your link or code — both lead to the same reward</div>
                </div>
                <span className="rf-badge rf-b-active" style={{alignSelf:'flex-start'}}>
                  <span className="rf-live-dot"/>Active
                </span>
              </div>

              <div className="rf-tabs">
                <button className={`rf-tab${refTab==='link'?' active':''}`} onClick={()=>setRefTab('link')}>Referral Link</button>
                <button className={`rf-tab${refTab==='code'?' active':''}`} onClick={()=>setRefTab('code')}>Referral Code</button>
              </div>

              {refTab==='link' ? (
                <div>
                  <div className="rf-link-row">
                    <input className="rf-link-input" type="text" readOnly defaultValue="https://vaultx.io/ref/JSDRT-2024"/>
                    <button className={`rf-btn-copy${linkCopied?' copied':''}`} onClick={()=>copyRef('link')}>
                      {linkCopied?'✓ Copied!':'Copy Link'}
                    </button>
                  </div>
                  <div style={{fontSize:'.63rem',color:'var(--text-sec)',marginTop:7}}>
                    🔒 This link is unique to your account. Do not share with untrusted parties.
                  </div>
                </div>
              ) : (
                <div>
                  <div className="rf-link-row">
                    <span className="rf-code-display">JSDRT-2024</span>
                    <button className={`rf-btn-copy${codeCopied?' copied':''}`} onClick={()=>copyRef('code')}>
                      {codeCopied?'✓ Copied!':'Copy Code'}
                    </button>
                  </div>
                  <div style={{fontSize:'.63rem',color:'var(--text-sec)',marginTop:7}}>
                    Share this code anywhere — your referrals can enter it during registration.
                  </div>
                </div>
              )}

              <div className="rf-share-row">
                <span style={{fontSize:'.65rem',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text-sec)',flexShrink:0}}>Share via:</span>
                {['WhatsApp','Telegram','Twitter','Email'].map(p=>(
                  <button key={p} className="rf-share-btn" onClick={()=>shareVia(p)}>
                    {p==='WhatsApp'&&<svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>}
                    {p==='Telegram'&&<svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>}
                    {p==='Twitter'&&<svg viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/></svg>}
                    {p==='Email'&&<svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* STAT CARDS */}
            <div className="rf-stats-grid rf-reveal" style={{marginBottom:14}}>
              {[
                {icon:<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,bg:'rgba(184,147,90,.1)',sc:'var(--gold)',val:'24',lbl:'Total Referred',ch:<>+3 this month</>,cup:true},
                {icon:<path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>,bg:'rgba(74,103,65,.1)',sc:'var(--sage)',val:'$1,248',lbl:'Total Commission',ch:<>+$186 this month</>,cup:true,vc:'var(--sage)'},
                {icon:<><circle cx="12" cy="12" r="10"/><path d="M15 9.354a4 4 0 10-4 6.292"/></>,bg:'rgba(184,147,90,.08)',sc:'var(--gold-d)',val:'5%',lbl:'Commission Rate',ch:'Per referral investment',cup:false,vc:'var(--gold)'},
                {icon:<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,bg:'rgba(155,58,58,.07)',sc:'#9b6a3a',val:'$74',lbl:'Pending Commission',ch:'Processing · 2–3 days',cup:false,vc:'#9b6a3a'},
              ].map((s,i)=>(
                <div key={i} className="rf-stat-card">
                  <div className="rf-stat-icon" style={{background:s.bg}}>
                    <svg viewBox="0 0 24 24" style={{stroke:s.sc}}>{s.icon}</svg>
                  </div>
                  <div className="rf-stat-val" style={s.vc?{color:s.vc}:{}}>{s.val}</div>
                  <div className="rf-stat-lbl">{s.lbl}</div>
                  <div className={`rf-stat-change ${s.cup?'rf-ch-up':'rf-ch-neu'}`} style={!s.cup&&s.vc?{color:s.vc}:{}}>
                    {s.cup&&<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>}
                    {s.ch}
                  </div>
                </div>
              ))}
            </div>

            {/* INFO GRID */}
            <div style={{display:'grid',gridTemplateColumns:'1fr',gap:14,marginBottom:14}} className="rf-reveal" id="rf-info-grid">

              {/* HOW IT WORKS */}
              <div className="rf-how-card">
                <span className="rf-sec-label" style={{marginBottom:4}}>Program Details</span>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.05rem',color:'var(--ink)'}}>How the Referral Program Works</div>
                <div className="rf-steps-grid">
                  {[
                    {n:'1',t:'Share Your Link',d:'Copy your unique referral link or code and share it with friends, colleagues, or your audience.'},
                    {n:'2',t:'They Register & Invest',d:'Your referral signs up using your link and makes their first investment into any active season.'},
                    {n:'3',t:'You Earn Commission',d:'Receive 5% of every USDT amount your referral invests, credited within 2–3 business days.'},
                  ].map(s=>(
                    <div key={s.n} className="rf-step-item">
                      <div className="rf-step-num">{s.n}</div>
                      <div><div className="rf-step-title">{s.t}</div><div className="rf-step-desc">{s.d}</div></div>
                    </div>
                  ))}
                </div>
                <div className="rf-comm-strip">
                  <div className="rf-comm-strip-icon"><svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                      <span className="rf-comm-rate">5% Commission</span>
                      <span className="rf-badge rf-b-active" style={{fontSize:'.55rem'}}>Lifetime</span>
                    </div>
                    <div className="rf-comm-desc">Earned on every investment your referred users make — across all seasons, forever.</div>
                  </div>
                </div>
              </div>

              {/* SIDE PANELS */}
              <div style={{display:'grid',gridTemplateColumns:'1fr',gap:14}} id="rf-side-panels">

                {/* Milestone */}
                <div className="rf-how-card" style={{padding:'18px 16px'}}>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.02rem',color:'var(--ink)',marginBottom:14}}>Referral Milestone</div>
                  <div style={{display:'flex',alignItems:'center',gap:14}}>
                    <div className="rf-milestone-ring">
                      <svg viewBox="0 0 70 70">
                        <circle className="rf-ring-bg" cx="35" cy="35" r="30"/>
                        <circle className="rf-ring-fill" cx="35" cy="35" r="30" style={{strokeDashoffset:ringOffset}}/>
                      </svg>
                      <div className="rf-ring-label"><span>24</span><span className="rf-ring-sublabel">of 50</span></div>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:'.76rem',fontWeight:500,color:'var(--ink)',marginBottom:3}}>Next Reward at 50 Referrals</div>
                      <div style={{fontSize:'.68rem',color:'var(--text-sec)',marginBottom:8}}>26 more to unlock +1% bonus rate.</div>
                      <div className="rf-prog-bar"><div className="rf-prog-fill" style={{width:milestoneWidth}}/></div>
                      <div style={{fontSize:'.62rem',color:'var(--text-sec)',marginTop:4}}>48% complete</div>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:14}}>
                    <div style={{background:'var(--cream)',border:'1px solid var(--border)',borderRadius:6,padding:'10px 12px'}}>
                      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1rem',color:'var(--ink)'}}>$48,920</div>
                      <div style={{fontSize:'.58rem',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text-sec)'}}>Total Invested by Refs</div>
                    </div>
                    <div style={{background:'var(--cream)',border:'1px solid var(--border)',borderRadius:6,padding:'10px 12px'}}>
                      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1rem',color:'var(--sage)'}}>$2,446</div>
                      <div style={{fontSize:'.58rem',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text-sec)'}}>Lifetime Earnings</div>
                    </div>
                  </div>
                </div>

                {/* Monthly earnings */}
                <div className="rf-how-card" style={{padding:'18px 16px'}}>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.02rem',color:'var(--ink)',marginBottom:14}}>Monthly Earnings</div>
                  {[['April 2025','+$186.40'],['March 2025','+$241.80'],['February 2025','+$318.20'],['January 2025','+$274.00'],['December 2024','+$228.50']].map(([m,v])=>(
                    <div key={m} className="rf-earn-row">
                      <span className="rf-earn-label">{m}</span>
                      <span className="rf-earn-val positive">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rf-divider rf-reveal"/>

            {/* TABLE */}
            <div className="rf-table-card rf-reveal">
              <div className="rf-table-head">
                <div>
                  <div className="rf-table-title">Referred Users</div>
                  <div className="rf-table-sub">All users who signed up through your referral link or code</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                  <div className="rf-filter-row">
                    {[['all','All (24)'],['active','Active'],['pending','Pending'],['inactive','Inactive']].map(([f,lbl])=>(
                      <button key={f} className={`rf-filter-pill${filter===f?' active':''}`} onClick={()=>{setFilter(f);setPage(1);}}>{lbl}</button>
                    ))}
                  </div>
                  <button className="rf-btn-ghost" onClick={()=>showToast('Exporting referral report…')}>Export CSV</button>
                </div>
              </div>

              {/* Desktop table */}
              <div className="rf-tbl-wrap">
                <table className="rf-dtbl">
                  <thead>
                    <tr><th>User</th><th>Joined Date</th><th>Total Invested</th><th>Commission</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {slice.length===0 ? (
                      <tr><td colSpan={5}>
                        <div className="rf-empty-state">
                          <div className="rf-empty-icon"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></div>
                          <div className="rf-empty-title">No {filter} referrals</div>
                          <div className="rf-empty-desc">Share your referral link to grow your network.</div>
                        </div>
                      </td></tr>
                    ) : slice.map((r,i)=>(
                      <tr key={i}>
                        <td>
                          <div className="rf-td-user">
                            <div className="rf-td-av">{r.init}</div>
                            <div><div className="rf-td-name">{r.name}</div><div className="rf-td-sub">{r.un}</div></div>
                          </div>
                        </td>
                        <td><span className="rf-td-sub">{r.joined}</span></td>
                        <td>{r.invested>0 ? <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1rem',color:'var(--ink)',fontWeight:500}}>${r.invested.toLocaleString()}</span> : <span className="rf-td-sub">—</span>}</td>
                        <td>{r.comm>0 ? <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1rem',color:'var(--sage)',fontWeight:500}}>+${r.comm.toFixed(2)}</span> : <span className="rf-td-sub">—</span>}</td>
                        <td><BadgeComp status={r.status}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="rf-mob-cards">
                {slice.length===0 ? (
                  <div className="rf-empty-state" style={{padding:'32px 16px'}}>
                    <div className="rf-empty-icon"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
                    <div className="rf-empty-title">No {filter} referrals</div>
                  </div>
                ) : slice.map((r,i)=>(
                  <div key={i} className="rf-mob-card">
                    <div className="rf-mob-card-top">
                      <div className="rf-mob-card-user">
                        <div className="rf-td-av">{r.init}</div>
                        <div><div className="rf-td-name">{r.name}</div><div className="rf-td-sub">{r.un}</div></div>
                      </div>
                      <BadgeComp status={r.status}/>
                    </div>
                    <div className="rf-mob-row">
                      <span className="rf-mob-key">Joined</span>
                      <span style={{fontSize:'.74rem',color:'var(--text-sec)'}}>{r.joined}</span>
                    </div>
                    <div className="rf-mob-row">
                      <span className="rf-mob-key">Invested</span>
                      <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'.95rem',fontWeight:500,color:'var(--ink)'}}>
                        {r.invested>0?`$${r.invested.toLocaleString()}`:'—'}
                      </span>
                    </div>
                    <div className="rf-mob-row">
                      <span className="rf-mob-key">Commission</span>
                      <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'.95rem',color:r.comm>0?'var(--sage)':'var(--text-sec)'}}>
                        {r.comm>0?`+$${r.comm.toFixed(2)}`:'—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rf-pagination">
                <div className="rf-page-info">Showing {start+1}–{Math.min(start+PER_PAGE,filtered.length)} of {filtered.length} users</div>
                <div className="rf-page-btns">
                  <button className="rf-page-btn" onClick={()=>goPage(page-1)}>
                    <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  {Array.from({length:totalPages},(_,i)=>i+1).map(n=>(
                    <button key={n} className={`rf-page-btn${page===n?' active':''}`} onClick={()=>goPage(n)}>{n}</button>
                  ))}
                  <button className="rf-page-btn" onClick={()=>goPage(page+1)}>
                    <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </>
  );
}