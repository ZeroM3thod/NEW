'use client';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import AdminSidebar from '../AdminSidebar';

/* ══ TYPES ══ */
type TxStatus = 'Pending' | 'Approved' | 'Completed' | 'Rejected';
type TxType   = 'deposit' | 'withdrawal';
interface TxUser { name: string; email: string; uid: string }
interface Tx {
  id: string; type: TxType; user: TxUser;
  amount: number; wallet: string; txHash: string; network: string;
  date: Date; status: TxStatus; rejectionReason: string | null;
}

/* ══ HELPERS ══ */
const NETWORKS = ['TRC-20','ERC-20','BEP-20'];
const STATUS_W = [10,20,55,15];
const USERS: TxUser[] = [
  {name:'Arash Karimi',     email:'arash.karimi@email.com',    uid:'USR-0041'},
  {name:'Fatima Al-Hassan', email:'fatima.alhassan@email.com', uid:'USR-0078'},
  {name:'Rohan Mehta',      email:'rohan.mehta@email.com',     uid:'USR-0133'},
  {name:'Elena Vostrikova', email:'elena.v@email.com',         uid:'USR-0209'},
  {name:'James Okafor',     email:'j.okafor@email.com',        uid:'USR-0317'},
  {name:'Mei Lin',          email:'mei.lin@email.com',         uid:'USR-0422'},
  {name:'Carlos Ibáñez',    email:'c.ibanez@email.com',        uid:'USR-0558'},
  {name:'Nadia Fournier',   email:'nadia.f@email.com',         uid:'USR-0614'},
  {name:'Ivan Petrov',      email:'ivan.petrov@email.com',     uid:'USR-0703'},
  {name:'Sara Williams',    email:'sara.w@email.com',          uid:'USR-0891'},
];
const REJECTIONS = [
  'Insufficient KYC verification','Wallet address mismatch',
  'Flagged by risk engine','Duplicate transaction detected'
];

function rand(a:number,b:number){ return Math.floor(Math.random()*(b-a+1))+a }
function hashAddr(){ return '0x'+Array.from({length:40},()=>'0123456789abcdef'[Math.floor(Math.random()*16)]).join('') }
function txHashFn(){ return '0x'+Array.from({length:64},()=>'0123456789abcdef'[Math.floor(Math.random()*16)]).join('') }
function weightedStatus(): TxStatus {
  const r=Math.random()*100;
  if(r<10) return 'Pending';
  if(r<30) return 'Approved';
  if(r<85) return 'Completed';
  return 'Rejected';
}
function fmtUSDT(n:number){
  if(n>=1e6) return '$'+(n/1e6).toFixed(2)+'M';
  if(n>=1e3) return '$'+(n/1e3).toFixed(1)+'K';
  return '$'+n.toFixed(2);
}
function fmtDateTime(d:Date){
  return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})
    +' · '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
}
function generateTxs(): Tx[] {
  const now = new Date();
  return Array.from({length:20},(_,i)=>{
    const type: TxType = Math.random()>0.45 ? 'deposit' : 'withdrawal';
    const user = USERS[i%USERS.length];
    const amount = parseFloat((Math.random()*49900+100).toFixed(2));
    const status = weightedStatus();
    const daysAgo = rand(0,29), hoursAgo = rand(0,23);
    const date = new Date(now.getTime()-daysAgo*86400000-hoursAgo*3600000);
    return {
      id:'TXN-'+Math.random().toString(36).slice(2,10).toUpperCase(),
      type, user, amount, wallet:hashAddr(), txHash:txHashFn(),
      network:NETWORKS[rand(0,2)], date, status,
      rejectionReason: status==='Rejected' ? REJECTIONS[rand(0,3)] : null,
    };
  }).sort((a,b)=>b.date.getTime()-a.date.getTime());
}

function buildChartData(){
  const now=new Date();
  const labels:string[]=[],depData:number[]=[],wdData:number[]=[];
  for(let i=29;i>=0;i--){
    const d=new Date(now.getTime()-i*86400000);
    labels.push(d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'}));
    const base=180000, seasonal=Math.sin((29-i)/29*Math.PI)*60000;
    depData.push(Math.max(5000,Math.round(base+seasonal+(Math.random()-.3)*80000)));
    wdData.push(Math.max(2000,Math.round(base*.6+seasonal*.5+(Math.random()-.4)*60000)));
  }
  return {labels,depData,wdData};
}

const ALL_TX = generateTxs();
const PER_PAGE = 10;

export default function AdminTransactionPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast]             = useState({msg:'',cls:'',show:false});
  const [allTx, setAllTx]             = useState<Tx[]>(ALL_TX);
  const [searchQ, setSearchQ]         = useState('');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [typeFilter, setTypeFilter]   = useState<'all'|'deposit'|'withdrawal'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [modalTx, setModalTx]         = useState<Tx|null>(null);
  const bgRef   = useRef<HTMLCanvasElement>(null);
  const chartRef= useRef<HTMLCanvasElement>(null);
  const chartInst = useRef<any>(null);
  const toastTimer= useRef<ReturnType<typeof setTimeout>>();

  const showToast = useCallback((msg:string,cls='')=>{
    setToast({msg,cls,show:true});
    clearTimeout(toastTimer.current);
    toastTimer.current=setTimeout(()=>setToast(t=>({...t,show:false})),3200);
  },[]);

  /* reveal */
  useEffect(()=>{
    const obs=new IntersectionObserver(e=>e.forEach(x=>{if(x.isIntersecting)x.target.classList.add('vis')}),{threshold:.05});
    document.querySelectorAll<HTMLElement>('.tx-reveal').forEach(el=>obs.observe(el));
    return()=>obs.disconnect();
  },[]);

  /* body lock */
  useEffect(()=>{
    document.body.style.overflow=(sidebarOpen||!!modalTx)?'hidden':'';
    return()=>{document.body.style.overflow=''};
  },[sidebarOpen,modalTx]);

  /* BG canvas */
  useEffect(()=>{
    const cv=bgRef.current;if(!cv)return;
    const ctx=cv.getContext('2d')!;
    let W=0,H=0,candles:any[]=[],waves:any[]=[],t=0,rafId=0;
    const setup=()=>{
      W=cv.width=window.innerWidth;H=cv.height=window.innerHeight;
      const cols=Math.floor(W/28);candles=[];
      for(let i=0;i<cols;i++) candles.push({x:i*28+14,open:H*.35+(Math.random()-.5)*H*.28,close:H*.35+(Math.random()-.5)*H*.28,high:0,low:0,speed:.003+Math.random()*.004,phase:Math.random()*Math.PI*2});
      candles.forEach((c:any)=>{c.high=Math.min(c.open,c.close)-Math.random()*H*.04;c.low=Math.max(c.open,c.close)+Math.random()*H*.04;});
      waves=Array.from({length:3},(_,i)=>({amplitude:40+i*20,freq:.005+i*.002,speed:.0008+i*.0004,phase:i*Math.PI/1.5,yBase:H*(.3+i*.2)}));
    };
    const draw=()=>{
      ctx.clearRect(0,0,W,H);t+=.012;
      candles.forEach((c:any)=>{const dy=Math.sin(t*c.speed*100+c.phase)*H*.015,o=c.open+dy,cl=c.close-dy,bull=cl<o,col=bull?'rgba(74,103,65,1)':'rgba(155,58,58,1)',bH=Math.abs(o-cl)||2,bY=Math.min(o,cl);ctx.strokeStyle=col;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(c.x,c.high+dy);ctx.lineTo(c.x,bY);ctx.moveTo(c.x,bY+bH);ctx.lineTo(c.x,c.low+dy);ctx.stroke();ctx.fillStyle=col;ctx.fillRect(c.x-5,bY,10,bH||2);});
      waves.forEach((w:any,wi:number)=>{ctx.beginPath();ctx.strokeStyle=`rgba(184,147,90,${.4-wi*.08})`;ctx.lineWidth=1.2-wi*.2;for(let x=0;x<=W;x+=4){const y=w.yBase+Math.sin(x*w.freq+t*w.speed*100+w.phase)*w.amplitude;x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();});
      rafId=requestAnimationFrame(draw);
    };
    window.addEventListener('resize',setup);setup();draw();
    return()=>{cancelAnimationFrame(rafId);window.removeEventListener('resize',setup)};
  },[]);

  /* Chart */
  useEffect(()=>{
    import('chart.js/auto').then(({default:Chart})=>{
      if(!chartRef.current)return;
      chartInst.current?.destroy();
      const {labels,depData,wdData}=buildChartData();
      const ctx=chartRef.current.getContext('2d')!;
      const depSum=depData.reduce((a,b)=>a+b,0);
      const wdSum=wdData.reduce((a,b)=>a+b,0);
      setChartTotals({dep:fmtUSDT(depSum),wd:fmtUSDT(wdSum),net:(depSum-wdSum>=0?'+':'')+fmtUSDT(depSum-wdSum)});
      chartInst.current=new Chart(ctx,{
        type:'line',
        data:{labels,datasets:[
          {label:'Deposits',    data:depData,borderColor:'#4a6741',backgroundColor:'rgba(74,103,65,.07)',borderWidth:1.8,pointRadius:2,pointHoverRadius:4,tension:.35,fill:true},
          {label:'Withdrawals', data:wdData, borderColor:'#9b3a3a',backgroundColor:'rgba(155,58,58,.06)',borderWidth:1.8,pointRadius:2,pointHoverRadius:4,tension:.35,fill:true},
        ]},
        options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
          plugins:{legend:{display:false},tooltip:{backgroundColor:'rgba(28,28,28,.95)',titleColor:'#b8935a',bodyColor:'#f6f1e9',borderColor:'rgba(184,147,90,.3)',borderWidth:1,padding:10,titleFont:{family:"'Cormorant Garamond',serif",size:12},bodyFont:{family:"'DM Sans',sans-serif",size:11},callbacks:{label:(c:any)=>` ${c.dataset.label}: $${(c.raw/1000).toFixed(1)}K`}}},
          scales:{x:{grid:{color:'rgba(184,147,90,.07)'},ticks:{color:'#6b6459',font:{family:"'DM Sans',sans-serif",size:9},maxTicksLimit:10,maxRotation:0}},y:{grid:{color:'rgba(184,147,90,.07)'},ticks:{color:'#6b6459',font:{family:"'DM Sans',sans-serif",size:9},callback:(v:any)=>'$'+(v/1000).toFixed(0)+'K'}}}},
      });
    });
    return()=>{chartInst.current?.destroy()};
  },[]);

  const [chartTotals, setChartTotals] = useState({dep:'—',wd:'—',net:'—'});

  /* filtered */
  const filtered = useMemo(()=>allTx.filter(tx=>{
    const q=searchQ.trim().toLowerCase();
    if(q){const hay=(tx.user.name+tx.user.uid+tx.id+tx.amount).toLowerCase();if(!hay.includes(q))return false;}
    if(dateFrom&&tx.date<new Date(dateFrom+'T00:00:00'))return false;
    if(dateTo&&tx.date>new Date(dateTo+'T23:59:59'))return false;
    if(typeFilter!=='all'&&tx.type!==typeFilter)return false;
    return true;
  }),[allTx,searchQ,dateFrom,dateTo,typeFilter]);

  const totalPages=Math.max(1,Math.ceil(filtered.length/PER_PAGE));
  const pageRows=filtered.slice((currentPage-1)*PER_PAGE,currentPage*PER_PAGE);

  const deps=filtered.filter(t=>t.type==='deposit');
  const wds=filtered.filter(t=>t.type==='withdrawal');
  const total=filtered.reduce((s,t)=>s+t.amount,0);

  function clearFilters(){
    setSearchQ('');setDateFrom('');setDateTo('');setTypeFilter('all');setCurrentPage(1);
    showToast('Filters cleared','ok');
  }

  function changeStatus(id:string,newStatus:TxStatus){
    setAllTx(prev=>prev.map(tx=>tx.id===id?{...tx,status:newStatus}:tx));
    setModalTx(null);
    showToast(`✓ Transaction ${newStatus.toLowerCase()}`,newStatus==='Approved'?'ok':'err');
  }

  function exportCSV(){
    const headers=['ID','Type','User','User ID','Amount (USDT)','Network','Wallet','TX Hash','Date','Status'];
    const rows=filtered.map(t=>[t.id,t.type,t.user.name,t.user.uid,t.amount.toFixed(2),t.network,t.wallet,t.txHash,t.date.toISOString().slice(0,19).replace('T',' '),t.status]);
    const csv=[headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='transactions.csv';a.click();
    showToast('✓ CSV exported','ok');
  }

  const badgeClass: Record<TxStatus,string> = {Pending:'tx-b-pending',Approved:'tx-b-approved',Completed:'tx-b-completed',Rejected:'tx-b-rejected'};

  return (
    <>
      <canvas ref={bgRef} style={{position:'fixed',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0,opacity:.04}}/>
      <div className={`tx-toast${toast.show?' show':''}${toast.cls?' '+toast.cls:''}`}>{toast.msg}</div>
      <div className={`adm-sb-overlay${sidebarOpen?' show':''}`} onClick={()=>setSidebarOpen(false)}/>

      {/* MODAL */}
      {modalTx && (
        <div className="tx-modal-overlay open" onClick={e=>{if(e.target===e.currentTarget)setModalTx(null)}}>
          <div className="tx-modal-box">
            <div className="tx-modal-header">
              <div>
                <div className="tx-modal-title">Transaction Details</div>
                <div style={{fontSize:'.67rem',color:'var(--text-sec)',marginTop:2}}>{modalTx.id}</div>
              </div>
              <button className="tx-modal-close" onClick={()=>setModalTx(null)}>
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="tx-modal-body">
              {[
                ['Transaction ID',  modalTx.id],
                ['Type',            modalTx.type==='deposit'?'↓ Deposit':'↑ Withdrawal'],
                ['Status',          modalTx.status+(modalTx.rejectionReason?' — '+modalTx.rejectionReason:'')],
                ['Amount',          fmtUSDT(modalTx.amount)+' USDT'],
                ['Network',         modalTx.network],
                ['User Name',       modalTx.user.name],
                ['User Email',      modalTx.user.email],
                ['User ID',         modalTx.user.uid],
                ['Wallet Address',  modalTx.wallet],
                ['Transaction Hash',modalTx.txHash],
                ['Date & Time',     fmtDateTime(modalTx.date)],
                ...(modalTx.rejectionReason?[['Rejection Reason',modalTx.rejectionReason]]:[]),
              ].map(([label,val])=>(
                <div key={label} className="tx-detail-row">
                  <div className="tx-detail-label">{label}</div>
                  <div className="tx-detail-value">{val}</div>
                </div>
              ))}
              <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:20,flexWrap:'wrap'}}>
                {modalTx.status==='Pending'&&<>
                  <button className="tx-btn-ghost" onClick={()=>changeStatus(modalTx.id,'Rejected')}>Reject</button>
                  <button className="tx-btn-primary" onClick={()=>changeStatus(modalTx.id,'Approved')}>Approve</button>
                </>}
                <button className="tx-btn-ghost" onClick={()=>setModalTx(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="adm-layout">
        <AdminSidebar open={sidebarOpen} onClose={()=>setSidebarOpen(false)} onToast={showToast}/>

        <div className="adm-main-area">
          <header className="adm-top-header">
            <button className="adm-ham-btn" onClick={()=>setSidebarOpen(o=>!o)}><span/><span/><span/></button>
            <a className="adm-back-pill" href="/admin/dashboard">
              <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>Dashboard
            </a>
            <div className="adm-header-right">
              <div className="adm-notif-btn" onClick={()=>showToast('3 new notifications')}>
                <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                <div className="adm-notif-dot"/>
              </div>
              <div className="adm-header-avatar">AD</div>
              <div className="adm-header-uinfo">
                <div className="adm-header-uname">Admin User</div>
                <div className="adm-header-role">Super Administrator</div>
              </div>
            </div>
          </header>

          <div className="tx-page-wrapper">

            {/* PAGE TITLE */}
            <div className="tx-reveal" style={{marginBottom:28,display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:14}}>
              <div>
                <span className="tx-sec-label">Admin · SeasonRise Platform</span>
                <h1 className="tx-sec-title">Transaction History</h1>
                <p className="tx-sec-sub"><span className="tx-live-dot"/>Live ledger · All deposit &amp; withdrawal records</p>
              </div>
              <div style={{alignSelf:'flex-end'}}>
                <button className="tx-btn-primary" onClick={exportCSV}>↓ Export CSV</button>
              </div>
            </div>

            {/* FILTER BAR */}
            <div className="tx-reveal tx-card" style={{marginBottom:20}}>
              <div className="tx-card-body" style={{padding:'16px 20px'}}>
                <div style={{display:'grid',gap:10,gridTemplateColumns:'1fr'}}>
                  <div className="tx-search-wrap">
                    <div className="tx-search-icon"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
                    <input className="tx-form-input" type="text" placeholder="Search by user, amount, or transaction ID…"
                      value={searchQ} onChange={e=>{setSearchQ(e.target.value);setCurrentPage(1)}}/>
                  </div>
                  <div style={{display:'grid',gap:10,gridTemplateColumns:'1fr 1fr 1fr'}}>
                    <div>
                      <div style={{fontSize:'.6rem',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text-sec)',marginBottom:4}}>From Date</div>
                      <input className="tx-form-input" type="date" value={dateFrom} onChange={e=>{setDateFrom(e.target.value);setCurrentPage(1)}}/>
                    </div>
                    <div>
                      <div style={{fontSize:'.6rem',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text-sec)',marginBottom:4}}>To Date</div>
                      <input className="tx-form-input" type="date" value={dateTo} onChange={e=>{setDateTo(e.target.value);setCurrentPage(1)}}/>
                    </div>
                    <div>
                      <div style={{fontSize:'.6rem',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text-sec)',marginBottom:4}}>Transaction Type</div>
                      <select className="tx-form-select" value={typeFilter} onChange={e=>{setTypeFilter(e.target.value as any);setCurrentPage(1)}}>
                        <option value="all">All Transactions</option>
                        <option value="deposit">Deposits Only</option>
                        <option value="withdrawal">Withdrawals Only</option>
                      </select>
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
                    <span style={{fontSize:'.72rem',color:'var(--text-sec)'}}>Showing {filtered.length} of {allTx.length} transactions</span>
                    <button className="tx-btn-ghost tx-btn-sm" onClick={clearFilters}>Clear Filters</button>
                  </div>
                </div>
              </div>
            </div>

            {/* STAT CARDS */}
            <div className="tx-reveal" style={{display:'grid',gap:12,gridTemplateColumns:'repeat(2,1fr)',marginBottom:24}}>
              <style>{`@media(min-width:640px){.tx-stats-g{grid-template-columns:repeat(4,1fr)!important}}`}</style>
              <div className="tx-stat-card"><div className="tx-stat-lbl">Total Transactions</div><div className="tx-stat-val">{filtered.length}</div></div>
              <div className="tx-stat-card"><div className="tx-stat-lbl">Total Deposits</div><div className="tx-stat-val" style={{color:'var(--sage)'}}>{deps.length}</div></div>
              <div className="tx-stat-card"><div className="tx-stat-lbl">Total Withdrawals</div><div className="tx-stat-val" style={{color:'#9b3a3a'}}>{wds.length}</div></div>
              <div className="tx-stat-card"><div className="tx-stat-lbl">Total Amount Processed</div><div className="tx-stat-val" style={{color:'var(--gold)'}}>{fmtUSDT(total)}</div></div>
            </div>

            {/* CHART */}
            <div className="tx-reveal tx-card" style={{marginBottom:24}}>
              <div className="tx-card-head">
                <div>
                  <div className="tx-card-title">Daily Flow — Last 30 Days</div>
                  <div style={{fontSize:'.67rem',color:'var(--text-sec)',marginTop:2}}>Deposits vs Withdrawals</div>
                </div>
                <div style={{display:'flex',gap:16,alignItems:'center'}}>
                  {[['var(--sage)','Deposits'],['#9b3a3a','Withdrawals']].map(([c,l])=>(
                    <div key={l} style={{display:'flex',alignItems:'center',gap:6,fontSize:'.68rem',color:'var(--text-sec)'}}>
                      <div style={{width:12,height:3,background:c,borderRadius:2}}/>{l}
                    </div>
                  ))}
                </div>
              </div>
              <div className="tx-card-body">
                <div className="tx-chart-wrap"><canvas ref={chartRef}/></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',borderTop:'1px solid var(--border)'}}>
                {[['30-Day Deposits',chartTotals.dep,'var(--sage)'],['30-Day Withdrawals',chartTotals.wd,'#9b3a3a'],['Net Flow',chartTotals.net,'var(--gold)']].map(([lbl,val,col],i)=>(
                  <div key={lbl} style={{padding:'14px 18px',borderRight:i<2?'1px solid var(--border)':'none'}}>
                    <div style={{fontSize:'.58rem',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--text-sec)'}}>{lbl}</div>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.15rem',color:col,marginTop:3}}>{val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* TABLE */}
            <div className="tx-reveal tx-card">
              <div className="tx-card-head">
                <div>
                  <div className="tx-card-title">All Transactions</div>
                  <div style={{fontSize:'.67rem',color:'var(--text-sec)',marginTop:2}}>{filtered.length} transaction{filtered.length!==1?'s':''}</div>
                </div>
              </div>
              <div className="tx-tbl-wrap">
                <table className="tx-dtbl">
                  <thead>
                    <tr><th>Type</th><th>User</th><th>Amount (USDT)</th><th>Details</th><th>Date &amp; Time</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {pageRows.length===0?(
                      <tr><td colSpan={7} style={{textAlign:'center',padding:'44px 20px',color:'var(--text-sec)',fontSize:'.8rem'}}>
                        <div style={{fontSize:'2rem',marginBottom:10,opacity:.5}}>🔍</div>No transactions match your filters.
                      </td></tr>
                    ):pageRows.map(tx=>(
                      <tr key={tx.id}>
                        <td>
                          <span className={`tx-badge ${tx.type==='deposit'?'tx-b-deposit':'tx-b-withdraw'}`}>
                            {tx.type==='deposit'?'↓ Deposit':'↑ Withdraw'}
                          </span>
                        </td>
                        <td>
                          <div style={{fontSize:'.8rem',fontWeight:500,color:'var(--ink)'}}>{tx.user.name}</div>
                          <div style={{fontSize:'.65rem',color:'var(--text-sec)'}}>{tx.user.uid}</div>
                        </td>
                        <td>
                          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1rem',color:'var(--ink)'}}>{fmtUSDT(tx.amount)}</div>
                          <div style={{fontSize:'.62rem',color:'var(--text-sec)'}}>{tx.network}</div>
                        </td>
                        <td>
                          <div className="tx-hash-cell" title={tx.wallet}>{tx.wallet}</div>
                          <div className="tx-hash-cell" title={tx.txHash} style={{marginTop:2,opacity:.6}}>{tx.txHash}</div>
                        </td>
                        <td style={{fontSize:'.75rem',color:'var(--text-sec)',whiteSpace:'nowrap'}}>{fmtDateTime(tx.date)}</td>
                        <td><span className={`tx-badge ${badgeClass[tx.status]}`}>{tx.status}</span></td>
                        <td>
                          <button className="tx-btn-gold tx-btn-sm" onClick={()=>setModalTx(allTx.find(t=>t.id===tx.id)||null)}>View Details</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div style={{padding:'14px 20px',borderTop:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
                <span style={{fontSize:'.7rem',color:'var(--text-sec)'}}>Page {currentPage} of {totalPages}</span>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <button className="tx-page-btn" onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1}>‹</button>
                  {Array.from({length:totalPages},(_,i)=>i+1).map(p=>(
                    <button key={p} className={`tx-page-btn${currentPage===p?' active':''}`} onClick={()=>setCurrentPage(p)}>{p}</button>
                  ))}
                  <button className="tx-page-btn" onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))} disabled={currentPage===totalPages}>›</button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}