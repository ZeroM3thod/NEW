'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface WdHistory {
  id:string;date:string;amount:number;fee:number;receive:number;
  network:string;wallet:string;status:'approved'|'pending'|'rejected';
  note:string;reason?:string;
}
interface PendingWd { amt:number;addr:string;note:string;recv:string;shortAddr:string; }

const INIT_HISTORY: WdHistory[] = [
  {id:'WD-1042',date:'Mar 30, 2025',amount:500, fee:0.5,receive:499.5,network:'BEP-20',wallet:'0x7bC9...E8c9B',status:'approved',note:'Monthly profit withdrawal'},
  {id:'WD-1018',date:'Mar 15, 2025',amount:250, fee:0.5,receive:249.5,network:'BEP-20',wallet:'0x7bC9...E8c9B',status:'approved',note:''},
  {id:'WD-0997',date:'Feb 28, 2025',amount:1000,fee:0.5,receive:999.5,network:'BEP-20',wallet:'0x7bC9...E8c9B',status:'rejected',note:'',reason:'Wallet address does not match our whitelist. Please update your verified withdrawal address in account settings and resubmit.'},
  {id:'WD-0974',date:'Feb 12, 2025',amount:150, fee:0.5,receive:149.5,network:'BEP-20',wallet:'0x7bC9...E8c9B',status:'pending',note:'Quick withdrawal'},
];

export default function WithdrawPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hamburgerOpen, setHamburgerOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('withdraw');
  const [toastMsg, setToastMsg] = useState('');
  const [toastShow, setToastShow] = useState(false);
  const [wdAmt, setWdAmt] = useState('');
  const [wdAddr, setWdAddr] = useState('');
  const [wdNote, setWdNote] = useState('');
  const [fsReq, setFsReq] = useState('—');
  const [fsRecv, setFsRecv] = useState('—');
  const [selectedChip, setSelectedChip] = useState<number|null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDetails, setConfirmDetails] = useState<PendingWd|null>(null);
  const [history, setHistory] = useState<WdHistory[]>(INIT_HISTORY);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEntry, setModalEntry] = useState<WdHistory|null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const bgRef = useRef<HTMLCanvasElement>(null);

  /* ── toast ── */
  const showToast = useCallback((msg: string)=>{
    setToastMsg('✓  '+msg); setToastShow(true);
    if(toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(()=>setToastShow(false),3200);
  },[]);

  /* ── bg canvas ── */
  useEffect(()=>{
    const cvs=bgRef.current; if(!cvs) return;
    const cx=cvs.getContext('2d'); if(!cx) return;
    type C={x:number;y:number;w:number;h:number;wick:number;up:boolean;spd:number;ph:number};
    type W={pts:{x:number;y:number}[];spd:number;ph:number;amp:number;color:string;opa:string};
    let BW=0,BH=0,candles:C[]=[],waves:W[]=[],T=0,aid=0;
    const build=()=>{
      const n=Math.max(6,Math.floor(BW/50));
      candles=Array.from({length:n},(_,i)=>({x:(i/n)*BW+14+Math.random()*18,y:BH*0.2+Math.random()*BH*0.58,w:8+Math.random()*8,h:14+Math.random()*70,wick:6+Math.random()*20,up:Math.random()>0.42,spd:0.16+Math.random()*0.36,ph:Math.random()*Math.PI*2}));
      const pts=Math.ceil(BW/36)+2;
      waves=[0,1,2,3].map(i=>({pts:Array.from({length:pts},(_,j)=>({x:j*36,y:BH*(0.15+i*0.22)+Math.random()*45})),spd:0.11+i*0.04,ph:i*1.4,amp:14+i*8,color:i%2===0?'rgba(74,103,65,':'rgba(184,147,90,',opa:i%2===0?'0.7)':'0.55)'}));
    };
    const setup=()=>{BW=cvs.width=window.innerWidth;BH=cvs.height=window.innerHeight;build();};
    const draw=()=>{
      cx.clearRect(0,0,BW,BH);T+=0.011;
      waves.forEach(w=>{cx.beginPath();w.pts.forEach((p,j)=>{const y=p.y+Math.sin(T*w.spd+j*0.3+w.ph)*w.amp;j===0?cx.moveTo(p.x,y):cx.lineTo(p.x,y)});cx.strokeStyle=w.color+w.opa;cx.lineWidth=1;cx.stroke()});
      candles.forEach(c=>{const bob=Math.sin(T*c.spd+c.ph)*7,x=c.x,y=c.y+bob;cx.strokeStyle='rgba(28,28,28,0.8)';cx.lineWidth=1;cx.beginPath();cx.moveTo(x+c.w/2,y-c.wick);cx.lineTo(x+c.w/2,y+c.h+c.wick);cx.stroke();cx.fillStyle=c.up?'rgba(74,103,65,0.88)':'rgba(184,147,90,0.82)';cx.fillRect(x,y,c.w,c.h);cx.strokeRect(x,y,c.w,c.h)});
      aid=requestAnimationFrame(draw);
    };
    window.addEventListener('resize',setup);setup();draw();
    return()=>{window.removeEventListener('resize',setup);cancelAnimationFrame(aid)};
  },[]);

  /* ── scroll reveal ── */
  useEffect(()=>{
    const obs=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('show');obs.unobserve(e.target)}}),{threshold:.12});
    document.querySelectorAll<HTMLElement>('.wd-reveal').forEach(el=>obs.observe(el));
    return()=>obs.disconnect();
  },[]);

  /* ── body scroll lock ── */
  useEffect(()=>{document.body.style.overflow=(sidebarOpen||confirmOpen||modalOpen)?'hidden':'';return()=>{document.body.style.overflow=''}},[sidebarOpen,confirmOpen,modalOpen]);

  /* ── ESC ── */
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{if(e.key==='Escape'){setModalOpen(false);setConfirmOpen(false);setSidebarOpen(false);setHamburgerOpen(false);}};
    document.addEventListener('keydown',h);return()=>document.removeEventListener('keydown',h);
  },[]);

  /* ── amount change ── */
  const onAmtChange = (v: string)=>{
    setWdAmt(v); const amt=parseFloat(v)||0; const recv=Math.max(0,amt-0.5);
    setFsReq(amt>0?amt+' USDT':'—'); setFsRecv(amt>0?recv.toFixed(2)+' USDT':'—');
    setSelectedChip(null);
  };
  const selectAmt=(v:number)=>{ setSelectedChip(v); setWdAmt(String(v)); onAmtChange(String(v)); setSelectedChip(v); };

  /* ── open confirm ── */
  const openConfirm = ()=>{
    const amt=parseFloat(wdAmt); const addr=wdAddr.trim(); const note=wdNote.trim();
    if(!amt||amt<10){showToast('Please enter a valid amount (min $10)');return;}
    if(amt>1920){showToast('Amount exceeds available balance ($1,920)');return;}
    if(!addr){showToast('Please enter your wallet address');return;}
    if(addr.length<26){showToast('Wallet address seems invalid');return;}
    const recv=(amt-0.5).toFixed(2);
    const shortAddr=addr.length>20?addr.slice(0,10)+'...'+addr.slice(-6):addr;
    setConfirmDetails({amt,addr,note,recv,shortAddr});
    setConfirmOpen(true);
  };

  /* ── submit ── */
  const submitWithdrawal = ()=>{
    if(!confirmDetails) return;
    const newEntry: WdHistory = {
      id:'WD-'+(1100+Math.floor(Math.random()*99)),
      date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),
      amount:confirmDetails.amt, fee:0.5, receive:parseFloat(confirmDetails.recv),
      network:'BEP-20', wallet:confirmDetails.shortAddr, status:'pending', note:confirmDetails.note,
    };
    setHistory(h=>[newEntry,...h]);
    setConfirmOpen(false);
    setWdAmt(''); setWdAddr(''); setWdNote(''); setFsReq('—'); setFsRecv('—'); setSelectedChip(null);
    showToast('Withdrawal submitted · Pending admin approval');
  };

  /* ── nav items ── */
  const navItems = [
    {id:'dashboard',label:'Dashboard',fn:()=>router.push('/dashboard'),svg:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>},
    {id:'seasons',  label:'Seasons',  fn:()=>router.push('/season'),   svg:<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>},
    {id:'deposit',  label:'Deposit',  fn:()=>router.push('/deposit'),  svg:<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></>},
    {id:'withdraw', label:'Withdraw', fn:()=>{setActiveNav('withdraw');setSidebarOpen(false);setHamburgerOpen(false);},svg:<><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></>},
    {id:'referral', label:'Referral', fn:()=>router.push('/referral'),svg:<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>},
    {id:'support',  label:'Support',  fn:()=>router.push('/support'), svg:<><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>},
  ] as {id:string;label:string;fn:()=>void;svg:React.ReactNode}[];

  return (
    <>
      <canvas ref={bgRef} style={{position:'fixed',inset:0,zIndex:0,pointerEvents:'none',opacity:.055,width:'100%',height:'100%'}}/>
      <div className={`wd-toast${toastShow?' show':''}`}>{toastMsg}</div>

      {/* SIDEBAR */}
      <aside className={`wd-sidebar${sidebarOpen?' open':''}`}>
        <div className="wd-sidebar-logo">
          <a href="/" style={{textDecoration:'none',display:'flex',alignItems:'center'}}>
            <div className="wd-logo-mark"/><span className="wd-logo-text">Vault<span>X</span></span>
          </a>
        </div>
        <nav className="wd-sidebar-nav">
          {navItems.map(n=>(
            <button key={n.id} className={`wd-nav-item${activeNav===n.id?' active':''}`} onClick={n.fn}>
              <svg fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">{n.svg}</svg>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="wd-sidebar-footer">
          <div className="wd-user-row" onClick={()=>router.push('/profile')}>
            <div className="wd-avatar">RK</div>
            <div><div className="wd-user-name">Rafiqul M.</div><div className="wd-user-tag">Season 4 Investor</div></div>
          </div>
        </div>
      </aside>
      <div className={`wd-sidebar-overlay${sidebarOpen?' open':''}`} onClick={()=>{setSidebarOpen(false);setHamburgerOpen(false)}}/>

      <div className="wd-layout">

        {/* TOPBAR */}
        <div className="wd-topbar">
          <button className={`wd-hamburger${hamburgerOpen?' is-open':''}`} onClick={()=>{setSidebarOpen(o=>!o);setHamburgerOpen(o=>!o)}}>
            <span/><span/><span/>
          </button>
          <div style={{position:'absolute',left:'50%',transform:'translateX(-50%)',display:'flex',alignItems:'center',gap:6}}>
            <div className="wd-logo-mark" style={{width:26,height:26}}/><span className="wd-logo-text" style={{fontSize:'1.15rem'}}>Vault<span>X</span></span>
          </div>
          <div className="wd-avatar" style={{width:32,height:32,fontSize:'.8rem',cursor:'pointer'}} onClick={()=>router.push('/profile')}>RK</div>
        </div>

        {/* MAIN */}
        <main className="wd-main">
          <div style={{maxWidth:760,margin:'0 auto'}}>

            {/* PAGE HEADER */}
            <div style={{marginBottom:28}} className="wd-reveal">
              <span className="wd-label">Transactions</span>
              <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'clamp(1.6rem,4vw,2.2rem)',fontWeight:400,color:'var(--ink)',lineHeight:1.15}}>
                Request a <em style={{fontStyle:'italic',color:'var(--gold)'}}>Withdrawal</em>
              </h1>
            </div>

            {/* AVAILABLE BALANCE */}
            <div className="wd-bal-badge wd-reveal" style={{marginBottom:20,transitionDelay:'.04s'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12,position:'relative',zIndex:1}}>
                <div>
                  <div style={{fontSize:'.68rem',letterSpacing:'.18em',textTransform:'uppercase',color:'rgba(246,241,233,0.4)',marginBottom:6}}>Available Balance</div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontWeight:300,fontSize:'2.2rem',background:'linear-gradient(135deg,#f6f1e9,#d4aa72,#f6f1e9)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>$1,920.00</div>
                  <div style={{fontSize:'.75rem',color:'rgba(246,241,233,0.4)',marginTop:4}}>USDT · Withdrawable</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:'.68rem',letterSpacing:'.1em',textTransform:'uppercase',color:'rgba(246,241,233,0.3)',marginBottom:4}}>Network</div>
                  <div style={{fontSize:'.82rem',color:'rgba(246,241,233,0.7)',letterSpacing:'.04em'}}>BNB Smart Chain</div>
                  <div style={{fontSize:'.7rem',color:'rgba(246,241,233,0.3)',marginTop:2}}>BEP-20 · USDT only</div>
                </div>
              </div>
            </div>

            {/* WITHDRAWAL FORM */}
            <div className="wd-card wd-reveal" style={{padding:'28px 24px',marginBottom:20,transitionDelay:'.08s'}}>
              <span className="wd-label">New Request</span>
              <div className="wd-section-title" style={{fontSize:'1.15rem',marginBottom:22}}>Withdrawal Details</div>

              {/* Amount */}
              <div style={{marginBottom:18}}>
                <label className="wd-form-label">Withdrawal Amount (USDT)</label>
                <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:10}}>
                  {[100,250,500,1000].map(v=>(
                    <button key={v} className={`wd-amt-chip${selectedChip===v?' selected':''}`} onClick={()=>selectAmt(v)}>${v.toLocaleString()}</button>
                  ))}
                </div>
                <input className="wd-form-input" type="number" placeholder="Enter amount e.g. 300" min="10" max="1920"
                  value={wdAmt} onChange={e=>onAmtChange(e.target.value)}/>
                <div style={{fontSize:'.7rem',color:'var(--txt3)',marginTop:5}}>Minimum: $10 · Maximum: $1,920 (available balance)</div>
              </div>

              {/* Wallet */}
              <div style={{marginBottom:18}}>
                <label className="wd-form-label">Receiving Wallet Address</label>
                <input className="wd-form-input" type="text" placeholder="Enter your USDT BEP-20 wallet address" value={wdAddr} onChange={e=>setWdAddr(e.target.value)}/>
                <div style={{fontSize:'.7rem',color:'var(--txt3)',marginTop:5}}>Only USDT on BNB Smart Chain (BEP-20) is supported.</div>
              </div>

              {/* Network (fixed) */}
              <div style={{marginBottom:18}}>
                <label className="wd-form-label">Network</label>
                <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'var(--parchment)',border:'1px solid var(--border)',borderRadius:'var(--r)'}}>
                  <div style={{width:28,height:28,background:'rgba(240,185,11,0.15)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.65rem',fontWeight:700,color:'#f0b90b',flexShrink:0}}>BNB</div>
                  <div>
                    <div style={{fontSize:'.82rem',fontWeight:500,color:'var(--ink)'}}>BNB Smart Chain — BEP-20</div>
                    <div style={{fontSize:'.7rem',color:'var(--txt3)'}}>Fee: ~0.5 USDT · Time: 1–2 minutes</div>
                  </div>
                  <div style={{marginLeft:'auto'}}>
                    <span className="wd-tag" style={{background:'rgba(74,103,65,0.1)',border:'1px solid rgba(74,103,65,0.2)',color:'var(--sage)',fontSize:'.62rem'}}>Only</span>
                  </div>
                </div>
              </div>

              {/* Note */}
              <div style={{marginBottom:22}}>
                <label className="wd-form-label">Note <span style={{fontSize:'.7rem',color:'var(--txt3)',textTransform:'none',letterSpacing:0,fontWeight:400}}>(optional)</span></label>
                <textarea className="wd-form-input" placeholder="Any note for this withdrawal (e.g. reason, reference)" value={wdNote} onChange={e=>setWdNote(e.target.value)}/>
              </div>

              {/* Fee Summary */}
              <div style={{padding:'14px 16px',background:'var(--parchment)',border:'1px solid var(--border)',borderRadius:'var(--r)',marginBottom:20}}>
                <div className="wd-detail-row"><span className="wd-detail-key">You Request</span><span className="wd-detail-val">{fsReq}</span></div>
                <div className="wd-detail-row"><span className="wd-detail-key">Transaction Fee</span><span className="wd-detail-val" style={{color:'var(--gold)'}}>~0.5 USDT</span></div>
                <div className="wd-detail-row"><span className="wd-detail-key">You Receive</span><span className="wd-detail-val" style={{color:'var(--sage)',fontWeight:600}}>{fsRecv}</span></div>
              </div>

              {/* Warning */}
              <div className="wd-warn-box" style={{marginBottom:20}}>
                ⚠ Please double-check your wallet address. Withdrawals sent to wrong addresses cannot be recovered. Processing time is 1–24 hours after approval.
              </div>

              <button className="wd-btn wd-btn-dark" style={{width:'100%'}} onClick={openConfirm}><span>Request Withdrawal →</span></button>
            </div>

            {/* WITHDRAWAL HISTORY */}
            <div style={{marginTop:36}} className="wd-reveal">
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                <div>
                  <span className="wd-label">Records</span>
                  <div className="wd-section-title" style={{fontSize:'1.15rem'}}>Withdrawal History</div>
                </div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {history.length===0
                  ? <div style={{textAlign:'center',padding:32,color:'var(--txt3)',fontSize:'.82rem'}}>No withdrawal records yet.</div>
                  : history.map((d,i)=>(
                    <div key={i} className="wd-hist-row">
                      <div style={{display:'flex',alignItems:'center',gap:12,flex:1,minWidth:0}}>
                        <div style={{width:34,height:34,background:'rgba(74,103,65,0.08)',border:'1px solid var(--border)',borderRadius:'var(--r)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          <svg width="14" height="14" fill="none" stroke="var(--sage)" strokeWidth="1.8" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                        </div>
                        <div style={{minWidth:0}}>
                          <div style={{fontSize:'.82rem',fontWeight:500,color:'var(--ink)',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                            {d.id} <span className={`wd-tag wd-tag-${d.status}`}>{d.status}</span>
                          </div>
                          <div style={{fontSize:'.7rem',color:'var(--txt3)',marginTop:2}}>{d.date} · {d.wallet}</div>
                        </div>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.1rem',color:'var(--ink)',fontWeight:500}}>−${d.amount.toLocaleString()}</div>
                        <button onClick={()=>{setModalEntry(d);setModalOpen(true)}} style={{fontSize:'.68rem',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--gold)',background:'none',border:'none',cursor:'pointer',marginTop:2}}>View →</button>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* CONFIRM OVERLAY */}
      <div className={`wd-confirm-overlay${confirmOpen?' open':''}`} onClick={e=>{if(e.target===e.currentTarget)setConfirmOpen(false)}}>
        <div className="wd-confirm-box">
          <div style={{marginBottom:20}}>
            <span className="wd-label">Review</span>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.3rem',fontWeight:400,color:'var(--ink)'}}>Confirm Withdrawal</div>
          </div>
          {confirmDetails && (
            <div style={{padding:'14px 16px',background:'var(--parchment)',border:'1px solid var(--border)',borderRadius:'var(--r)',marginBottom:16}}>
              <div className="wd-detail-row"><span className="wd-detail-key">Amount</span><span className="wd-detail-val">{confirmDetails.amt} USDT</span></div>
              <div className="wd-detail-row"><span className="wd-detail-key">Fee</span><span className="wd-detail-val" style={{color:'var(--gold)'}}>~0.5 USDT</span></div>
              <div className="wd-detail-row"><span className="wd-detail-key">You Receive</span><span className="wd-detail-val" style={{color:'var(--sage)'}}>{confirmDetails.recv} USDT</span></div>
              <div className="wd-detail-row"><span className="wd-detail-key">To Wallet</span><span className="wd-detail-val" style={{fontSize:'.76rem'}}>{confirmDetails.shortAddr}</span></div>
              <div className="wd-detail-row" style={confirmDetails.note?{}:{borderBottom:'none'}}><span className="wd-detail-key">Network</span><span className="wd-detail-val">BNB Smart Chain</span></div>
              {confirmDetails.note && <div className="wd-detail-row" style={{borderBottom:'none'}}><span className="wd-detail-key">Note</span><span className="wd-detail-val" style={{fontSize:'.78rem',maxWidth:200,textAlign:'right'}}>{confirmDetails.note}</span></div>}
            </div>
          )}
          <div className="wd-warn-box" style={{marginBottom:20,fontSize:'.75rem'}}>Once submitted, this request cannot be cancelled. Funds will be sent to your provided wallet address after admin approval.</div>
          <div style={{display:'flex',gap:10}}>
            <button className="wd-btn wd-btn-outline" style={{flex:1}} onClick={()=>setConfirmOpen(false)}>Cancel</button>
            <button className="wd-btn wd-btn-dark" style={{flex:1}} onClick={submitWithdrawal}><span>Confirm</span></button>
          </div>
        </div>
      </div>

      {/* DETAIL MODAL */}
      <div className={`wd-modal-overlay${modalOpen?' open':''}`} onClick={e=>{if(e.target===e.currentTarget)setModalOpen(false)}}>
        <div className="wd-modal-sheet">
          <div className="wd-modal-handle"/>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <div>
              <span className="wd-label">Transaction</span>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.3rem',fontWeight:400}}>Withdrawal Details</div>
            </div>
            <button onClick={()=>setModalOpen(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--txt3)',fontSize:'1.4rem',lineHeight:1}}>×</button>
          </div>
          {modalEntry && (
            <>
              <div style={{padding:'14px 16px',background:'var(--parchment)',border:'1px solid var(--border)',borderRadius:'var(--r)',marginBottom:16}}>
                <div className="wd-detail-row"><span className="wd-detail-key">Transaction ID</span><span className="wd-detail-val">{modalEntry.id}</span></div>
                <div className="wd-detail-row"><span className="wd-detail-key">Status</span><span className="wd-detail-val"><span className={`wd-tag wd-tag-${modalEntry.status}`} style={{fontSize:'.72rem'}}>{modalEntry.status}</span></span></div>
                <div className="wd-detail-row"><span className="wd-detail-key">Date</span><span className="wd-detail-val">{modalEntry.date}</span></div>
                <div className="wd-detail-row"><span className="wd-detail-key">Amount Requested</span><span className="wd-detail-val">{modalEntry.amount} USDT</span></div>
                <div className="wd-detail-row"><span className="wd-detail-key">Transaction Fee</span><span className="wd-detail-val">{modalEntry.fee} USDT</span></div>
                <div className="wd-detail-row"><span className="wd-detail-key">Amount to Receive</span><span className="wd-detail-val" style={{color:'var(--sage)'}}>{modalEntry.receive.toFixed(2)} USDT</span></div>
                <div className="wd-detail-row"><span className="wd-detail-key">Network</span><span className="wd-detail-val">{modalEntry.network}</span></div>
                <div className="wd-detail-row" style={modalEntry.note?{}:{borderBottom:'none'}}><span className="wd-detail-key">Wallet</span><span className="wd-detail-val" style={{fontSize:'.76rem',wordBreak:'break-all',maxWidth:180,textAlign:'right'}}>{modalEntry.wallet}</span></div>
                {modalEntry.note && <div className="wd-detail-row" style={{borderBottom:'none'}}><span className="wd-detail-key">Note</span><span className="wd-detail-val" style={{maxWidth:180,textAlign:'right',fontSize:'.78rem'}}>{modalEntry.note}</span></div>}
              </div>
              {modalEntry.status==='rejected' && modalEntry.reason && (
                <div style={{padding:'14px 16px',background:'rgba(180,50,50,0.05)',border:'1px solid rgba(180,50,50,0.2)',borderRadius:'var(--r)'}}>
                  <div style={{fontSize:'.7rem',letterSpacing:'.1em',textTransform:'uppercase',color:'#b43232',marginBottom:6}}>Rejection Reason</div>
                  <div style={{fontSize:'.82rem',color:'var(--ink)',lineHeight:1.6}}>{modalEntry.reason}</div>
                </div>
              )}
            </>
          )}
          <button className="wd-btn wd-btn-outline" style={{width:'100%',marginTop:20}} onClick={()=>setModalOpen(false)}>Close</button>
        </div>
      </div>
    </>
  );
}