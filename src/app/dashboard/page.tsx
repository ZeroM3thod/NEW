'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { Chart: any; }
}

export default function DashboardPage() {
  const router = useRouter();

  /* ── State ── */
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [activeNav, setActiveNav]           = useState('dashboard');
  const [toastMsg, setToastMsg]             = useState('');
  const [toastShow, setToastShow]           = useState(false);
  const [displayBalance, setDisplayBalance] = useState('$2,847.65');
  const [progWidth, setProgWidth]           = useState('0%');
  const [chartMode, setChartMode]           = useState<'roi' | 'usdt'>('roi');
  const [chartReady, setChartReady]         = useState(false);

  /* ── Refs ── */
  const bgCanvasRef   = useRef<HTMLCanvasElement>(null);
  const toastTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const balAnimRef    = useRef<number>(0);
  const chartRef      = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartInstance = useRef<any>(null);
  const balanceRef    = useRef(2847.65);

  /* ── Toast ── */
  const showToast = useCallback((msg: string) => {
    setToastMsg('✓  ' + msg);
    setToastShow(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastShow(false), 3200);
  }, []);

  /* ── Balance animation ── */
  const animBal = useCallback((target: number, dur = 1100) => {
    const from = balanceRef.current;
    const t0 = performance.now();
    if (balAnimRef.current) cancelAnimationFrame(balAnimRef.current);
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      const v = from + (target - from) * e;
      setDisplayBalance('$' + v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','));
      if (p < 1) { balAnimRef.current = requestAnimationFrame(tick); }
      else { balanceRef.current = target; }
    };
    balAnimRef.current = requestAnimationFrame(tick);
  }, []);

  /* ── Background canvas ── */
  useEffect(() => {
    const bgC = bgCanvasRef.current;
    if (!bgC) return;
    const bgX = bgC.getContext('2d');
    if (!bgX) return;
    type Candle = {x:number;y:number;w:number;h:number;up:boolean;spd:number;phase:number;wick:number};
    type Wave   = {pts:{x:number;y:number}[];spd:number;phase:number;amp:number};
    let BW=0, BH=0, candles:Candle[]=[], waves:Wave[]=[], bT=0, animId=0;
    const initC = () => {
      candles=[];
      const n=Math.max(8,Math.floor(BW/52));
      for(let i=0;i<n;i++) candles.push({x:(i/n)*BW+Math.random()*30,y:BH*.28+Math.random()*BH*.5,w:10+Math.random()*7,h:18+Math.random()*58,up:Math.random()>.42,spd:.18+Math.random()*.35,phase:Math.random()*Math.PI*2,wick:7+Math.random()*18});
    };
    const initW = () => {
      waves=[];
      for(let i=0;i<4;i++){
        const pts:{x:number;y:number}[]=[];
        for(let x=0;x<=BW;x+=38) pts.push({x,y:BH*(.18+i*.17)+Math.random()*55});
        waves.push({pts,spd:.12+i*.04,phase:i*1.1,amp:16+i*7});
      }
    };
    const resize = () => { BW=bgC.width=window.innerWidth; BH=bgC.height=window.innerHeight; initC(); initW(); };
    const anim = () => {
      bgX.clearRect(0,0,BW,BH); bT+=.011;
      waves.forEach((w,i)=>{
        bgX.beginPath();
        w.pts.forEach((p,j)=>{ const y=p.y+Math.sin(bT*w.spd+j*.28+w.phase)*w.amp; if(j===0)bgX.moveTo(p.x,y); else bgX.lineTo(p.x,y); });
        bgX.strokeStyle=i%2===0?'rgba(74,103,65,0.9)':'rgba(184,147,90,0.7)'; bgX.lineWidth=.9; bgX.stroke();
      });
      candles.forEach(c=>{
        const bob=Math.sin(bT*c.spd+c.phase)*7, x=c.x, y=c.y+bob;
        bgX.strokeStyle='rgba(28,28,28,0.9)'; bgX.lineWidth=.9;
        bgX.beginPath(); bgX.moveTo(x+c.w/2,y-c.wick); bgX.lineTo(x+c.w/2,y+c.h+c.wick); bgX.stroke();
        bgX.fillStyle=c.up?'rgba(74,103,65,0.85)':'rgba(184,147,90,0.8)'; bgX.fillRect(x,y,c.w,c.h);
        bgX.strokeStyle=c.up?'rgba(74,103,65,1)':'rgba(184,147,90,1)'; bgX.lineWidth=.6; bgX.strokeRect(x,y,c.w,c.h);
      });
      animId=requestAnimationFrame(anim);
    };
    window.addEventListener('resize',resize); resize(); anim();
    return ()=>{ window.removeEventListener('resize',resize); cancelAnimationFrame(animId); };
  }, []);

  /* ── Progress bar ── */
  useEffect(() => { const t=setTimeout(()=>setProgWidth('46.7%'),350); return ()=>clearTimeout(t); }, []);

  /* ── Balance ticker ── */
  useEffect(() => {
    const iv=setInterval(()=>{ const n=Math.max(2600,balanceRef.current+(Math.random()-.48)*.6); animBal(n,700); },4200);
    return ()=>clearInterval(iv);
  }, [animBal]);

  /* ── Chart.js init ── */
  const initChart = useCallback(() => {
    if (!chartRef.current || !window.Chart) return;
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;
    const grad = (c1:string,c2:string) => { const g=ctx.createLinearGradient(0,0,0,200); g.addColorStop(0,c1); g.addColorStop(1,c2); return g; };
    chartInstance.current = new window.Chart(ctx,{
      type:'line',
      data:{ labels:['S1','S2','S3','S4 est'], datasets:[{ data:[18.2,23.7,28.4,14.8], fill:true, backgroundColor:grad('rgba(74,103,65,0.15)','rgba(74,103,65,0)'), borderColor:'#4a6741', borderWidth:2, pointBackgroundColor:'#4a6741', pointBorderColor:'#faf7f2', pointBorderWidth:2, pointRadius:5, pointHoverRadius:7, tension:.4 }] },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{display:false},
          tooltip:{ backgroundColor:'rgba(28,28,28,0.92)', borderColor:'rgba(184,147,90,0.3)', borderWidth:1, titleColor:'#d4aa72', bodyColor:'#f6f1e9', titleFont:{family:'DM Sans',size:11,weight:'500'}, bodyFont:{family:'DM Sans',size:12}, padding:12, callbacks:{label:(c:{raw:number})=>`  ROI: +${c.raw}%`} },
        },
        scales:{
          x:{grid:{color:'rgba(184,147,90,0.06)',drawBorder:false},ticks:{color:'#9c9186',font:{family:'DM Sans',size:10}}},
          y:{grid:{color:'rgba(184,147,90,0.06)',drawBorder:false},ticks:{color:'#9c9186',font:{family:'DM Sans',size:10},callback:(v:number)=>v+'%'}},
        },
        interaction:{intersect:false,mode:'index'},
      },
    });
  }, []);

  useEffect(() => { if (chartReady) initChart(); }, [chartReady, initChart]);

  /* ── Switch chart ── */
  const switchChart = useCallback((mode:'roi'|'usdt') => {
    if (!chartInstance.current || !chartRef.current) return;
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;
    const grad=(c1:string,c2:string)=>{ const g=ctx.createLinearGradient(0,0,0,200); g.addColorStop(0,c1); g.addColorStop(1,c2); return g; };
    const datasets = { roi:[18.2,23.7,28.4,14.8], usdt:[1820,2900,3680,1480] };
    const labels   = ['S1','S2','S3','S4 est'];
    chartInstance.current.data.labels = labels;
    chartInstance.current.data.datasets[0].data = datasets[mode];
    if (mode==='usdt') {
      chartInstance.current.data.datasets[0].borderColor='#b8935a';
      chartInstance.current.data.datasets[0].pointBackgroundColor='#b8935a';
      chartInstance.current.data.datasets[0].backgroundColor=grad('rgba(184,147,90,0.14)','rgba(184,147,90,0)');
    } else {
      chartInstance.current.data.datasets[0].borderColor='#4a6741';
      chartInstance.current.data.datasets[0].pointBackgroundColor='#4a6741';
      chartInstance.current.data.datasets[0].backgroundColor=grad('rgba(74,103,65,0.15)','rgba(74,103,65,0)');
    }
    chartInstance.current.options.scales.y.ticks.callback=(v:number)=>mode==='roi'?v+'%':'$'+v;
    chartInstance.current.options.plugins.tooltip.callbacks.label=(c:{raw:number})=>mode==='roi'?`  ROI: +${c.raw}%`:`  Profit: +$${c.raw.toLocaleString()}`;
    chartInstance.current.update('active');
    setChartMode(mode);
  }, []);

  /* ── ESC / scroll lock / reveal ── */
  useEffect(() => {
    const h=(e:KeyboardEvent)=>{ if(e.key==='Escape'){setSidebarOpen(false);} };
    document.addEventListener('keydown',h);
    return ()=>document.removeEventListener('keydown',h);
  }, []);
  useEffect(() => {
    document.body.style.overflow=(sidebarOpen)?'hidden':'';
    return ()=>{ document.body.style.overflow=''; };
  }, [sidebarOpen]);
  useEffect(() => {
    const obs=new IntersectionObserver(entries=>entries.forEach(e=>{ if(e.isIntersecting){e.target.classList.add('show');obs.unobserve(e.target);} }),{threshold:.12});
    document.querySelectorAll<HTMLElement>('.db-reveal').forEach(el=>obs.observe(el));
    return ()=>obs.disconnect();
  }, []);

  /* ── Copy referral ── */
  const copyRef = () => {
    const code='VAULT-X-RK2025';
    const fb=()=>{
      const ta=document.createElement('textarea'); ta.value=code; ta.style.position='absolute'; ta.style.left='-9999px';
      document.body.appendChild(ta); ta.select();
      try{document.execCommand('copy');showToast('Referral code copied');}catch{showToast('Copy failed');}
      document.body.removeChild(ta);
    };
    navigator.clipboard?.writeText(code).then(()=>showToast('Referral code copied')).catch(fb)??fb();
  };

  /* ════════════════════════════════════════════════ */
  return (
    <>
      <Script src="https://cdn.jsdelivr.net/npm/chart.js" onReady={()=>setChartReady(true)} />
      <canvas ref={bgCanvasRef} style={{position:'fixed',inset:0,zIndex:0,pointerEvents:'none',opacity:.055,width:'100%',height:'100%'}}/>
      <div className={`db-toast${toastShow?' show':''}`}>{toastMsg}</div>
      {/* SIDEBAR — outside layout so z-index works correctly on mobile */}
      <aside className={`db-sidebar${sidebarOpen?' open':''}`}>
        <div className="db-sidebar-logo">
          <a href="/" style={{textDecoration:'none',display:'flex',alignItems:'center'}}>
            <div className="db-logo-mark"/><span className="db-logo-text">Vault<span>X</span></span>
          </a>
        </div>
        <nav className="db-sidebar-nav">
          {([
            {id:'dashboard',svg:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,label:'Dashboard',fn:()=>{setActiveNav('dashboard');setSidebarOpen(false);showToast('Dashboard view');}},
            {id:'seasons',  svg:<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>,label:'Seasons',fn:()=>{router.push('/season');}},
            {id:'deposit',  svg:<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></>,label:'Deposit',fn:()=>router.push('/deposit')},
            {id:'withdraw', svg:<><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></>,label:'Withdraw',fn:()=>router.push('/withdraw')},
            {id:'referral', svg:<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,label:'Referral',fn:()=>router.push('/referral')},
            {id:'support',  svg:<><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,label:'Support',fn:()=>router.push('/support')},
          ] as {id:string;svg:React.ReactNode;label:string;fn:()=>void}[]).map(n=>(
            <button key={n.id} className={`db-nav-item${activeNav===n.id?' active':''}`} onClick={n.fn}>
              <svg fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">{n.svg}</svg>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="db-sidebar-footer">
          <div className="db-user-row" onClick={()=>router.push('/profile')} style={{cursor:'pointer'}}>
            <div className="db-avatar">RK</div>
            <div><div className="db-user-name">Rafiqul M.</div><div className="db-user-tag">Season 4 Investor</div></div>
          </div>
        </div>
      </aside>

      <div className={`db-sidebar-overlay${sidebarOpen?' open':''}`} onClick={()=>setSidebarOpen(false)}/>

      <div className="db-layout">

        {/* MOBILE TOPBAR */}
        <div className="db-topbar">
          <button className="db-hamburger" onClick={()=>setSidebarOpen(true)}><span/><span/><span/></button>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <div className="db-logo-mark" style={{width:26,height:26}}/><span className="db-logo-text" style={{fontSize:'1.15rem'}}>Vault<span>X</span></span>
          </div>
          <div className="db-avatar" style={{width:32,height:32,fontSize:'.8rem',cursor:'pointer'}} onClick={()=>router.push('/profile')}>RK</div>
        </div>

        {/* MAIN */}
        <main className="db-main">
          <div style={{maxWidth:900,margin:'0 auto'}}>

            {/* HEADER */}
            <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16,marginBottom:28}} className="db-reveal">
              <div>
                <span className="db-label">Overview</span>
                <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'clamp(1.6rem,4vw,2.2rem)',fontWeight:400,color:'var(--ink)',lineHeight:1.15}}>
                  Good morning,<br/><em style={{fontStyle:'italic',color:'var(--gold)'}}>Rafiqul</em>
                </h1>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                <div className="db-live-pill"><div className="db-live-dot"/>Season 4 Live</div>
              </div>
            </div>

            {/* BALANCE HERO */}
            <div className="db-balance-hero db-reveal" style={{marginBottom:20,transitionDelay:'.06s'}}>
              <div style={{display:'flex',flexWrap:'wrap',alignItems:'flex-start',justifyContent:'space-between',gap:16,position:'relative',zIndex:1}}>
                <div>
                  <div className="db-balance-label" style={{marginBottom:8}}>Total Portfolio · USDT</div>
                  <div className="db-balance-num">{displayBalance}</div>
                  <div className="db-balance-sub" style={{marginTop:8}}>
                    <span style={{color:'#6a8c60'}}>↑ +$673.00</span>&nbsp;·&nbsp;all-time profit&nbsp;·&nbsp;<span style={{color:'var(--gold-l)'}}>+23.4% avg ROI</span>
                  </div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div className="db-balance-label" style={{marginBottom:6}}>Season 4</div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.9rem',fontWeight:300,color:'rgba(246,241,233,0.85)'}}>Day 42</div>
                  <div className="db-balance-sub">of 90 days</div>
                </div>
              </div>
              <div style={{marginTop:24,position:'relative',zIndex:1}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:'.7rem',color:'rgba(246,241,233,0.35)',letterSpacing:'.06em',textTransform:'uppercase',marginBottom:8}}>
                  <span>Season Progress</span><span style={{color:'var(--gold-l)'}}>46.7%</span>
                </div>
                <div className="db-prog-track"><div className="db-prog-fill" style={{width:progWidth}}/></div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:'.68rem',color:'rgba(246,241,233,0.25)',marginTop:6}}>
                  <span>Entry $2,174.65</span><span>Target +24–32%</span>
                </div>
              </div>
            </div>

            {/* STAT CARDS */}
            <div className="db-grid-4 db-reveal" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20,transitionDelay:'.1s'}}>
              {([
                {bg:'rgba(184,147,90,0.1)',stroke:'var(--gold)',  icon:<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-4 0v2"/></>,  lbl:'Invested',    val:'$8,420', sub:'all seasons', cls:'db-stat-gold'},
                {bg:'rgba(74,103,65,0.1)', stroke:'var(--sage)',  icon:<path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>,                          lbl:'Withdrawable',val:'$1,920', sub:'available now',cls:'db-stat-up'},
                {bg:'rgba(74,103,65,0.08)',stroke:'var(--sage-l)',icon:<><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,  lbl:'Total Profits',val:'+$673',  sub:'all time',    cls:'db-stat-up'},
                {bg:'rgba(184,147,90,0.08)',stroke:'var(--gold)', icon:<><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></>, lbl:'Avg ROI',val:'+23.4%',sub:'3 seasons',cls:'db-stat-gold'},
              ] as {bg:string;stroke:string;icon:React.ReactNode;lbl:string;val:string;sub:string;cls:string}[]).map((s,i)=>(
                <div key={i} className="db-card db-card-hover" style={{padding:'18px 16px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
                    <div style={{width:26,height:26,background:s.bg,borderRadius:'var(--r)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <svg width="13" height="13" fill="none" stroke={s.stroke} strokeWidth="1.8" viewBox="0 0 24 24">{s.icon}</svg>
                    </div>
                    <span style={{fontSize:'.67rem',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--txt2)'}}>{s.lbl}</span>
                  </div>
                  <div className={`db-stat-num ${s.cls}`}>{s.val}</div>
                  <div style={{fontSize:'.7rem',color:'var(--txt3)',marginTop:5}}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* ACTION BUTTONS */}
            <div className="db-grid-2 db-reveal" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20,transitionDelay:'.13s'}}>
              <button className="db-btn db-btn-dark" onClick={()=>router.push('/deposit')}><span>+ Deposit</span></button>
              <button className="db-btn db-btn-outline" onClick={()=>router.push('/withdraw')}>Withdraw →</button>
            </div>

            {/* CHART + SEASONS */}
            <div className="db-mid-grid db-reveal" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20}}>

              {/* CHART */}
              <div className="db-card" style={{padding:'22px 20px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
                  <div><span className="db-label">Performance</span><div className="db-section-title" style={{fontSize:'1.1rem'}}>Profit Trend</div></div>
                  <div style={{display:'flex',gap:6}}>
                    <button className={`db-chart-tab${chartMode==='roi'?' active':''}`} onClick={()=>switchChart('roi')}>ROI%</button>
                    <button className={`db-chart-tab${chartMode==='usdt'?' active':''}`} onClick={()=>switchChart('usdt')}>USDT</button>
                  </div>
                </div>
                <div className="db-chart-wrap"><canvas ref={chartRef}/></div>
                <div className="db-divider" style={{margin:'16px 0 14px'}}/>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  {([{l:'Best',v:'S3 +28.4%',c:'var(--sage)'},{l:'Avg',v:'+23.4%',c:'var(--gold)'},{l:'Seasons',v:'4',c:'var(--ink)'}]).map((x,i)=>(
                    <div key={i} style={{textAlign:i===2?'right':i===1?'center':'left'}}>
                      <div style={{fontSize:'.67rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--txt3)'}}>{x.l}</div>
                      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.1rem',fontWeight:500,color:x.c}}>{x.v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SEASONS */}
              <div className="db-card" style={{padding:'22px 20px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
                  <div><span className="db-label">History</span><div className="db-section-title" style={{fontSize:'1.1rem'}}>Seasons</div></div>
                  <button style={{fontSize:'.68rem',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--gold)',background:'none',border:'none',cursor:'pointer'}}>All →</button>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {([
                    {b:'S1',bg:'rgba(74,103,65,0.1)',   bc:'rgba(74,103,65,0.2)',   bc2:'var(--sage)',   name:'Season One',   p:'Jan–Apr 2023',   r:'+18.2%',rc:'var(--sage)',   t:'Done',tc:'db-tag-sage'},
                    {b:'S2',bg:'rgba(184,147,90,0.08)', bc:'rgba(184,147,90,0.2)',  bc2:'var(--gold)',   name:'Season Two',   p:'Jun–Sep 2023',   r:'+23.7%',rc:'var(--gold)',   t:'Done',tc:'db-tag-gold'},
                    {b:'S3',bg:'rgba(74,103,65,0.1)',   bc:'rgba(74,103,65,0.25)',  bc2:'var(--sage-l)', name:'Season Three', p:'Nov 23–Feb 24',  r:'+28.4%',rc:'var(--sage)',   t:'Best',tc:'db-tag-ink'},
                  ] as {b:string;bg:string;bc:string;bc2:string;name:string;p:string;r:string;rc:string;t:string;tc:string}[]).map((s,i)=>(
                    <div key={i} className="db-season-row">
                      <div style={{display:'flex',alignItems:'center',gap:11}}>
                        <div className="db-season-badge" style={{background:s.bg,border:`1px solid ${s.bc}`,color:s.bc2}}>{s.b}</div>
                        <div><div style={{fontSize:'.82rem',fontWeight:500,color:'var(--ink)'}}>{s.name}</div><div style={{fontSize:'.68rem',color:'var(--txt3)'}}>{s.p}</div></div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.1rem',color:s.rc,fontWeight:500}}>{s.r}</div>
                        <div className={`db-tag ${s.tc}`} style={{marginTop:3}}>{s.t}</div>
                      </div>
                    </div>
                  ))}
                  {/* S4 Active */}
                  <div className="db-season-row" style={{borderColor:'rgba(184,147,90,0.25)',background:'rgba(184,147,90,0.04)'}}>
                    <div style={{display:'flex',alignItems:'center',gap:11}}>
                      <div className="db-season-badge" style={{background:'rgba(184,147,90,0.12)',border:'1px solid rgba(184,147,90,0.35)',color:'var(--gold)',position:'relative'}}>
                        S4<div className="db-live-dot" style={{position:'absolute',top:-3,right:-3,width:6,height:6,background:'var(--sage)'}}/>
                      </div>
                      <div><div style={{fontSize:'.82rem',fontWeight:500,color:'var(--ink)'}}>Season Four</div><div style={{fontSize:'.68rem',color:'var(--txt3)'}}>Day 42 / 90</div></div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.1rem',color:'var(--gold-l)',fontWeight:500}}>24–32%</div>
                      <div className="db-tag db-tag-live" style={{marginTop:3}}>Active</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* REFERRAL CARD */}
            <div className="db-card db-reveal" style={{padding:'24px 22px',marginBottom:20,transitionDelay:'.18s'}}>
              <div className="db-ref-head-grid" style={{display:'grid',gridTemplateColumns:'1fr auto',alignItems:'start',gap:16,marginBottom:20}}>
                <div>
                  <span className="db-label">Passive Income</span>
                  <div className="db-section-title">Referral Programme</div>
                  <div style={{fontSize:'.82rem',color:'var(--txt2)',marginTop:6,lineHeight:1.7,fontWeight:300}}>Earn 5% commission on every withdrawal made by your referred investors — automatically credited to your wallet.</div>
                </div>
                <div style={{width:44,height:44,background:'var(--ink)',borderRadius:'var(--r)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <svg width="20" height="20" fill="none" stroke="var(--gold)" strokeWidth="1.6" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                </div>
              </div>
              <div className="db-ref-copy-row" style={{display:'flex',gap:8,marginBottom:18}}>
                <div className="db-ref-code">VAULT-X-RK2025</div>
                <button className="db-copy-btn" onClick={copyRef}>Copy</button>
              </div>
              <div className="db-ref-stats-grid" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:2}}>
                {([{l:'Referrals',v:'7',c:'var(--ink)'},{l:'Earned',v:'$84.50',c:'var(--sage)'},{l:'Rate',v:'5%',c:'var(--gold)'}]).map((r,i)=>(
                  <div key={i} style={{background:'var(--parchment)',border:'1px solid var(--border)',padding:'14px 16px',borderRadius:'var(--r)'}}>
                    <div style={{fontSize:'.67rem',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--txt3)',marginBottom:6}}>{r.l}</div>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.6rem',fontWeight:400,color:r.c}}>{r.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* NOTICE STRIP */}
            <div className="db-reveal" style={{background:'var(--ink)',borderRadius:'var(--r-lg)',padding:'18px 22px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap',transitionDelay:'.22s'}}>
              <div>
                <div style={{fontSize:'.68rem',letterSpacing:'.16em',textTransform:'uppercase',color:'rgba(246,241,233,0.35)',marginBottom:5}}>Season 4 · Entry Closing</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.15rem',fontWeight:400,color:'var(--cream)'}}>18 days remain to join Season 4. Pool at 62% capacity.</div>
              </div>
              <button className="db-btn db-btn-dark" style={{whiteSpace:'nowrap',flexShrink:0}} onClick={()=>router.push('/season')}><span>Invest Now</span></button>
            </div>

          </div>
        </main>
      </div>

    </>
  );
}