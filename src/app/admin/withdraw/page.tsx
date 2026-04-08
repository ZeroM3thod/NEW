'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import AdminSidebar from '../AdminSidebar';

/* ══ TYPES ══ */
type WdStatus = 'pending' | 'approved' | 'rejected';
interface Withdrawal {
  id:string; init:string; name:string; un:string;
  amt:number; wallet:string; net:string; season:string;
  date:string; note:string; commission:number;
  txid:string; reason:string; status:WdStatus;
}

const INIT_WD: Withdrawal[] = [
  {id:'WD001',init:'RK',name:'Rakib Kowshar',   un:'@rakib.investor', amt:1920.00,wallet:'TRx1A2B3C4D5E6F7G8H9I0J',  net:'TRC-20',season:'S4',date:'2025-03-30',note:'Season 4 full profit withdrawal',      commission:96.00,  txid:'',          reason:'',                                              status:'pending'},
  {id:'WD002',init:'SN',name:'Sharmin Nahar',   un:'@sharmin.nahar',  amt:600.00, wallet:'0xAbCdEf1234567890aBcDeF12',net:'ERC-20',season:'S4',date:'2025-03-29',note:'Partial profit withdrawal',            commission:30.00,  txid:'',          reason:'',                                              status:'pending'},
  {id:'WD003',init:'AH',name:'Aminul Hossain',  un:'@aminul.h',       amt:380.00, wallet:'TRy9Z8X7W6V5U4T3S2R1Q0P', net:'TRC-20',season:'S3',date:'2025-03-28',note:'Season 3 principal + profit',           commission:19.00,  txid:'TX_0x8f3a9c',reason:'',                                              status:'approved'},
  {id:'WD004',init:'FK',name:'Farzana Khanam',  un:'@farzana.k',      amt:200.00, wallet:'0x1a2B3c4D5e6F7g8H9i0JkLm',net:'ERC-20',season:'S3',date:'2025-03-27',note:'Principal only withdrawal',             commission:10.00,  txid:'TX_0x2e7b1d',reason:'',                                              status:'approved'},
  {id:'WD005',init:'MR',name:'Mostafizur R.',   un:'@mostafiz.r',     amt:550.00, wallet:'TRz0Y9X8W7V6U5T4S3R2Q1P0', net:'TRC-20',season:'S4',date:'2025-03-26',note:'Full season 4 withdrawal',             commission:27.50,  txid:'',          reason:'',                                              status:'pending'},
  {id:'WD006',init:'NB',name:'Nasreen Begum',   un:'@nasreen.b',      amt:150.00, wallet:'TRn1A2S3D4F5G6H7J8K9L0M1', net:'TRC-20',season:'S3',date:'2025-03-25',note:'Referral commission withdrawal',        commission:7.50,   txid:'',          reason:'Duplicate request — already processed',         status:'rejected'},
  {id:'WD007',init:'JH',name:'Jahangir Hossain',un:'@jahangir.h',     amt:480.00, wallet:'0xJH12345678901234567890AB', net:'BSC',   season:'S4',date:'2025-03-24',note:'Mid-cycle partial exit',              commission:24.00,  txid:'',          reason:'',                                              status:'pending'},
  {id:'WD008',init:'RA',name:'Roksana Akter',   un:'@roksana.a',      amt:320.00, wallet:'TRr0A1K2T3E4R5A6K7T8E9R0', net:'TRC-20',season:'S3',date:'2025-03-23',note:'S3 profit share',                      commission:16.00,  txid:'TX_0x9d4c2f',reason:'',                                              status:'approved'},
  {id:'WD009',init:'KH',name:'Karim Hossain',   un:'@karim.h',        amt:1200.00,wallet:'0xKH9876543210ABCDEF123456', net:'ERC-20',season:'S5',date:'2025-04-01',note:'Season 5 early partial exit',         commission:60.00,  txid:'',          reason:'',                                              status:'pending'},
  {id:'WD010',init:'PM',name:'Parvin Molla',    un:'@parvin.m',       amt:90.00,  wallet:'TRp1A2R3V4I5N6M7O8L9L0A1', net:'TRC-20',season:'S2',date:'2025-03-20',note:'Season 2 old withdrawal',              commission:4.50,   txid:'TX_0x1a5e87',reason:'',                                              status:'approved'},
  {id:'WD011',init:'SM',name:'Salma Moni',      un:'@salma.m',        amt:750.00, wallet:'TRs1A2L3M4A5M6O7N8I9',     net:'TRC-20',season:'S5',date:'2025-04-01',note:'Season 5 first withdrawal',            commission:37.50,  txid:'',          reason:'',                                              status:'pending'},
  {id:'WD012',init:'HK',name:'Hasibul Karim',   un:'@hasibul.k',      amt:420.00, wallet:'0xHK4567890ABCDEF12345678', net:'BSC',   season:'S4',date:'2025-03-18',note:'S4 profit withdrawal',                commission:21.00,  txid:'',          reason:'Wallet address unverified — resubmit KYC',     status:'rejected'},
];

type ModalMode = 'view' | 'approve' | 'reject' | null;

function fmtAmt(v:number){ return v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) }
function shortWallet(w:string){ return w.substring(0,10)+'…'+w.slice(-4) }
function bCls(s:WdStatus){ return s==='approved'?'dm-b-conf':s==='rejected'?'dm-b-rej':'dm-b-pend' }

export default function AdminWithdrawPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast,   setToast]   = useState({msg:'',cls:'',show:false});
  const [wds, setWds]         = useState<Withdrawal[]>(INIT_WD.map(w=>({...w})));
  const [chip, setChip]       = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [dateFrom, setDateFrom] = useState('2025-01-01');
  const [dateTo,   setDateTo]   = useState('2025-12-31');
  const [modalId,  setModalId]  = useState('');
  const [modalMode,setModalMode]= useState<ModalMode>(null);
  const [txidInput,setTxidInput]= useState('');
  const [rejReason,setRejReason]= useState('');
  const bgRef   = useRef<HTMLCanvasElement>(null);
  const chartRef= useRef<HTMLCanvasElement>(null);
  const chartInst=useRef<any>(null);
  const toastTimer=useRef<ReturnType<typeof setTimeout>>();

  const showToast=useCallback((msg:string,cls='')=>{
    setToast({msg,cls,show:true});
    clearTimeout(toastTimer.current);
    toastTimer.current=setTimeout(()=>setToast(t=>({...t,show:false})),3300);
  },[]);

  useEffect(()=>{
    const obs=new IntersectionObserver(e=>e.forEach(x=>{if(x.isIntersecting)x.target.classList.add('vis')}),{threshold:.06});
    document.querySelectorAll<HTMLElement>('.reveal').forEach(el=>obs.observe(el));
    return()=>obs.disconnect();
  },[wds]);

  useEffect(()=>{
    document.body.style.overflow=(sidebarOpen||!!modalMode)?'hidden':'';
    return()=>{document.body.style.overflow=''};
  },[sidebarOpen,modalMode]);

  /* BG canvas */
  useEffect(()=>{
    const cv=bgRef.current;if(!cv)return;
    const ctx=cv.getContext('2d')!;
    let W=0,H=0,T=0,candles:any[]=[],waves:any[]=[],rafId=0;
    const setup=()=>{
      W=cv.width=window.innerWidth;H=cv.height=window.innerHeight;
      const n=Math.max(5,Math.floor(W/52));
      candles=Array.from({length:n},(_,i)=>({x:(i/n)*W+10+Math.random()*18,y:H*.12+Math.random()*H*.74,w:8+Math.random()*9,h:14+Math.random()*70,wick:6+Math.random()*22,up:Math.random()>.42,spd:.15+Math.random()*.35,ph:Math.random()*Math.PI*2}));
      const pts=Math.ceil(W/36)+2;
      waves=[0,1,2,3].map(i=>({pts:Array.from({length:pts},(_,j)=>({x:j*36,y:H*(.1+i*.24)+Math.random()*44})),spd:.1+i*.04,ph:i*1.4,amp:13+i*8,col:i%2===0?'rgba(74,103,65,':'rgba(184,147,90,',opa:i%2===0?'.7)':'.55)'}));
    };
    const draw=()=>{
      ctx.clearRect(0,0,W,H);T+=.011;
      waves.forEach((w:any)=>{ctx.beginPath();w.pts.forEach((p:any,j:number)=>{const y=p.y+Math.sin(T*w.spd+j*.3+w.ph)*w.amp;j===0?ctx.moveTo(p.x,y):ctx.lineTo(p.x,y)});ctx.strokeStyle=w.col+w.opa;ctx.lineWidth=1;ctx.stroke()});
      candles.forEach((c:any)=>{const b=Math.sin(T*c.spd+c.ph)*7,x=c.x,y=c.y+b;ctx.strokeStyle='rgba(28,28,28,.8)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+c.w/2,y-c.wick);ctx.lineTo(x+c.w/2,y+c.h+c.wick);ctx.stroke();ctx.fillStyle=c.up?'rgba(74,103,65,.88)':'rgba(184,147,90,.82)';ctx.fillRect(x,y,c.w,c.h);ctx.strokeRect(x,y,c.w,c.h)});
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
      const ctx=chartRef.current.getContext('2d')!;
      const labels=['26 Mar','27 Mar','28 Mar','29 Mar','30 Mar','31 Mar','1 Apr'];
      const pend=[0,150,200,0,1920,550,1230],appr=[320,200,380,600,0,0,90],rej=[420,0,0,0,150,0,0];
      const g1=ctx.createLinearGradient(0,0,0,170);g1.addColorStop(0,'rgba(184,147,90,.18)');g1.addColorStop(1,'rgba(184,147,90,0)');
      const g2=ctx.createLinearGradient(0,0,0,170);g2.addColorStop(0,'rgba(74,103,65,.18)');g2.addColorStop(1,'rgba(74,103,65,0)');
      const g3=ctx.createLinearGradient(0,0,0,170);g3.addColorStop(0,'rgba(155,58,58,.14)');g3.addColorStop(1,'rgba(155,58,58,0)');
      chartInst.current=new Chart(ctx,{
        type:'line',
        data:{labels,datasets:[
          {label:'Pending', data:pend,fill:true,backgroundColor:g1,borderColor:'rgba(184,147,90,.85)',borderWidth:2,pointBackgroundColor:'rgba(184,147,90,.9)',pointBorderColor:'#faf7f2',pointBorderWidth:2,pointRadius:3,pointHoverRadius:5,tension:.42},
          {label:'Approved',data:appr,fill:true,backgroundColor:g2,borderColor:'rgba(74,103,65,.85)', borderWidth:2,pointBackgroundColor:'rgba(74,103,65,.9)', pointBorderColor:'#faf7f2',pointBorderWidth:2,pointRadius:3,pointHoverRadius:5,tension:.42},
          {label:'Rejected',data:rej, fill:true,backgroundColor:g3,borderColor:'rgba(155,58,58,.75)', borderWidth:2,pointBackgroundColor:'rgba(155,58,58,.9)', pointBorderColor:'#faf7f2',pointBorderWidth:2,pointRadius:3,pointHoverRadius:5,tension:.42},
        ]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'rgba(28,28,28,.96)',borderColor:'rgba(184,147,90,.3)',borderWidth:1,titleColor:'#d4aa72',bodyColor:'#f6f1e9',titleFont:{family:'DM Sans',size:10},bodyFont:{family:'DM Sans',size:11},padding:10,callbacks:{label:(c:any)=>`  ${c.dataset.label}: $${c.raw.toLocaleString()}`}}},scales:{x:{grid:{color:'rgba(184,147,90,.06)'},ticks:{color:'#6b6459',font:{family:'DM Sans',size:9}}},y:{grid:{color:'rgba(184,147,90,.06)'},ticks:{color:'#6b6459',font:{family:'DM Sans',size:9},callback:(v:any)=>'$'+(v>=1000?(v/1000).toFixed(1)+'K':v)}}},interaction:{intersect:false,mode:'index'}},
      });
    });
    return()=>{chartInst.current?.destroy()};
  },[]);

  const getFiltered=()=>wds.filter(w=>{
    const mC=chip==='all'||w.status===chip;
    const q=searchQ.toLowerCase();
    const mQ=!q||w.name.toLowerCase().includes(q)||w.un.toLowerCase().includes(q)||w.id.toLowerCase().includes(q)||w.wallet.toLowerCase().includes(q)||w.net.toLowerCase().includes(q);
    const mD=(!dateFrom||w.date>=dateFrom)&&(!dateTo||w.date<=dateTo);
    return mC&&mQ&&mD;
  });

  const filtered=getFiltered();
  const pend=wds.filter(w=>w.status==='pending');
  const appr=wds.filter(w=>w.status==='approved');
  const rej =wds.filter(w=>w.status==='rejected');
  const tod =wds.filter(w=>w.date==='2025-04-01');
  const fmtU=(v:number)=>'$'+v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

  const curWd=wds.find(w=>w.id===modalId)||null;

  const openView=(id:string)=>{setModalId(id);setModalMode('view')};
  const openApprove=(id:string)=>{setModalId(id);setTxidInput(wds.find(w=>w.id===id)?.txid||'');setModalMode('approve')};
  const openReject=(id:string)=>{setModalId(id);setRejReason(wds.find(w=>w.id===id)?.reason||'');setModalMode('reject')};
  const closeModal=()=>setModalMode(null);

  const doApprove=(id:string)=>{
    if(!txidInput.trim()){showToast('Transaction ID is required.','err');return}
    setWds(prev=>prev.map(w=>w.id===id?{...w,status:'approved',txid:txidInput.trim()}:w));
    closeModal();showToast(`✓ WD ${id} approved — TX: ${txidInput}`,'ok');
  };
  const doReject=(id:string)=>{
    if(!rejReason.trim()||rejReason.trim().length<10){showToast('Please enter a rejection reason (min 10 chars).','err');return}
    setWds(prev=>prev.map(w=>w.id===id?{...w,status:'rejected',reason:rejReason}:w));
    closeModal();showToast(`✕ WD ${id} rejected`,'err');
  };
  const approveAllPending=()=>{
    const pendIds=filtered.filter(w=>w.status==='pending');
    if(!pendIds.length){showToast('No pending withdrawals in current view.');return}
    const txidBulk=prompt(`Enter a Transaction ID to apply to all ${pendIds.length} pending withdrawals:`);
    if(txidBulk===null)return;
    if(!txidBulk.trim()){showToast('Transaction ID is required.','err');return}
    if(!confirm(`Approve all ${pendIds.length} pending withdrawals with TX: ${txidBulk}?`))return;
    const ids=new Set(pendIds.map(w=>w.id));
    setWds(prev=>prev.map(w=>ids.has(w.id)?{...w,status:'approved',txid:txidBulk.trim()}:w));
    showToast(`✓ ${pendIds.length} withdrawals approved!`,'ok');
  };
  const copyTxt=(t:string)=>{navigator.clipboard?.writeText(t).catch(()=>{});showToast('📋 Copied to clipboard!')};
  const exportCSV=()=>{
    const hdr=['ID','User','Username','Amount','Wallet','Network','Season','Date','Status','TxID','Reason','Commission','Note'];
    const lines=[hdr.join(','),...filtered.map(w=>[w.id,`"${w.name}"`,w.un,w.amt,`"${w.wallet}"`,w.net,w.season,w.date,w.status,`"${w.txid}"`,`"${w.reason}"`,w.commission,`"${w.note}"`].join(','))];
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/csv'}));a.download=`withdrawals-${new Date().toISOString().slice(0,10)}.csv`;a.click();
    showToast(`✓ Exported ${filtered.length} records`,'ok');
  };

  const detailGrid=(w:Withdrawal)=>(
    <div className="dm-dgrid">
      <div className="dm-dcell"><div className="dm-dl">ID</div><div className="dm-dv" style={{fontFamily:'monospace',fontSize:'.77rem'}}>{w.id}</div></div>
      <div className="dm-dcell"><div className="dm-dl">Status</div><div className="dm-dv"><span className={`dm-badge ${bCls(w.status)}`}>{w.status}</span></div></div>
      <div className="dm-dcell"><div className="dm-dl">User</div><div className="dm-dv">{w.name}</div></div>
      <div className="dm-dcell"><div className="dm-dl">Username</div><div className="dm-dv dm-td-sub">{w.un}</div></div>
      <div className="dm-dcell"><div className="dm-dl">Amount (USDT)</div><div className="dm-dv gold">-${fmtAmt(w.amt)}</div></div>
      <div className="dm-dcell"><div className="dm-dl">Network</div><div className="dm-dv">{w.net}</div></div>
      <div className="dm-dcell"><div className="dm-dl">Season</div><div className="dm-dv">{w.season}</div></div>
      <div className="dm-dcell"><div className="dm-dl">Requested</div><div className="dm-dv">{w.date}</div></div>
      <div className="dm-dcell"><div className="dm-dl">Referral Commission (5%)</div><div className="dm-dv sage">${w.commission.toFixed(2)}</div></div>
      <div className="dm-dcell"><div className="dm-dl">Net Payout</div><div className="dm-dv gold">${(w.amt-w.commission).toFixed(2)}</div></div>
      <div className="dm-dcell dm-dfull"><div className="dm-dl">Wallet Address</div><div className="dm-dv mono" onClick={()=>copyTxt(w.wallet)} title="Click to copy">{w.wallet}</div></div>
      {w.txid&&<div className="dm-dcell dm-dfull"><div className="dm-dl">Transaction ID (Approved)</div><div className="dm-dv mono" style={{color:'var(--sage)'}}>{w.txid}</div></div>}
      {w.reason&&<div className="dm-dcell dm-dfull"><div className="dm-dl">Rejection Reason</div><div className="dm-dv err-c">{w.reason}</div></div>}
      <div className="dm-dcell dm-dfull"><div className="dm-dl">Note</div><div className="dm-dv">{w.note}</div></div>
    </div>
  );

  return (
    <>
      <canvas ref={bgRef} style={{position:'fixed',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0,opacity:.04}}/>
      <div className={`dm-toast${toast.show?' show':''}${toast.cls?' '+toast.cls:''}`}>{toast.msg}</div>
      <div className={`adm-sb-overlay${sidebarOpen?' show':''}`} onClick={()=>setSidebarOpen(false)}/>

      {/* MODAL */}
      {modalMode&&(
        <div className="dm-ov open" onClick={e=>{if(e.target===e.currentTarget)closeModal()}}>
          <div className="dm-mb">
            <div className="dm-mhd">
              <span className="dm-mttl">
                {modalMode==='view'?`Withdrawal · ${modalId}`:modalMode==='approve'?'Confirm Approval':'Confirm Rejection'}
              </span>
              <button className="dm-mcls" onClick={closeModal}>✕</button>
            </div>
            {modalMode==='approve'&&curWd&&(
              <div className="dm-conf-note dm-cn-ok">
                You are approving a withdrawal of <strong>${fmtAmt(curWd.amt)} USDT</strong> for <strong>{curWd.name}</strong>. The referrer earns <strong>${curWd.commission.toFixed(2)}</strong> commission automatically.
              </div>
            )}
            {modalMode==='reject'&&curWd&&(
              <div className="dm-conf-note dm-cn-warn">
                ⚠ You are about to <strong>reject</strong> this withdrawal of <strong>${fmtAmt(curWd.amt)} USDT</strong> from <strong>{curWd.name}</strong>. A reason is required.
              </div>
            )}
            <div id="m-body">
              {curWd&&modalMode==='view'&&detailGrid(curWd)}
              {curWd&&modalMode==='approve'&&(
                <>
                  <div className="dm-dgrid">
                    <div className="dm-dcell"><div className="dm-dl">User</div><div className="dm-dv">{curWd.name}</div></div>
                    <div className="dm-dcell"><div className="dm-dl">Amount</div><div className="dm-dv gold">-${fmtAmt(curWd.amt)}</div></div>
                    <div className="dm-dcell dm-dfull"><div className="dm-dl">Wallet</div><div className="dm-dv mono">{curWd.wallet}</div></div>
                  </div>
                  <div className="dm-fg">
                    <label className="dm-fl" htmlFor="txid-input">Transaction ID <span style={{color:'var(--error)'}}>*</span></label>
                    <input className="dm-fi" type="text" id="txid-input" placeholder="Enter the blockchain transaction ID (e.g. TX_0x4f2a…)"
                      value={txidInput} onChange={e=>setTxidInput(e.target.value)}/>
                    <span style={{fontSize:'.67rem',color:'var(--text-sec)',marginTop:2}}>Required · This confirms the on-chain transfer was made.</span>
                  </div>
                </>
              )}
              {curWd&&modalMode==='reject'&&(
                <>
                  <div className="dm-dgrid" style={{marginBottom:8}}>
                    <div className="dm-dcell"><div className="dm-dl">User</div><div className="dm-dv">{curWd.name}</div></div>
                    <div className="dm-dcell"><div className="dm-dl">Amount</div><div className="dm-dv dm-td-amt" style={{color:'var(--gold-d)'}}>-${fmtAmt(curWd.amt)}</div></div>
                    <div className="dm-dcell dm-dfull"><div className="dm-dl">Wallet</div><div className="dm-dv mono">{curWd.wallet}</div></div>
                  </div>
                  <div className="dm-fg">
                    <label className="dm-fl" htmlFor="rej-reason">Rejection Reason <span style={{color:'var(--error)'}}>*</span></label>
                    <textarea className="dm-fi-ta" id="rej-reason" placeholder="Enter a clear reason for rejection. This message will be sent to the user…"
                      value={rejReason} onChange={e=>setRejReason(e.target.value)}/>
                    <span style={{fontSize:'.67rem',color:'var(--text-sec)',marginTop:2}}>Required · Minimum 10 characters.</span>
                  </div>
                </>
              )}
            </div>
            <div className="dm-mact">
              {modalMode==='view'&&curWd&&(
                curWd.status==='pending'
                  ?<>
                    <button className="dm-btn-conf" style={{flex:1,padding:10,fontSize:'.72rem'}} onClick={()=>openApprove(curWd.id)}>✓ Approve</button>
                    <button className="dm-btn-rej"  style={{flex:1,padding:10,fontSize:'.72rem'}} onClick={()=>openReject(curWd.id)}>✕ Reject</button>
                    <button className="dm-btn-ghost" style={{padding:'10px 14px',fontSize:'.72rem'}} onClick={closeModal}>Close</button>
                  </>
                  :<>
                    <button className="dm-btn-ghost" style={{flex:1,padding:10,fontSize:'.72rem'}} onClick={closeModal}>Close</button>
                    <button className="dm-btn-ghost" style={{padding:'10px 14px',fontSize:'.72rem'}} onClick={()=>copyTxt(curWd.wallet)}>Copy Wallet</button>
                  </>
              )}
              {modalMode==='approve'&&curWd&&<>
                <button className="dm-btn-conf" style={{flex:1,padding:10,fontSize:'.72rem'}} onClick={()=>doApprove(curWd.id)}>✓ Confirm Approval</button>
                <button className="dm-btn-ghost" style={{flex:1,padding:10,fontSize:'.72rem'}} onClick={closeModal}>Cancel</button>
              </>}
              {modalMode==='reject'&&curWd&&<>
                <button className="dm-btn-rej" style={{flex:1,padding:10,fontSize:'.72rem'}} onClick={()=>doReject(curWd.id)}>✕ Confirm Rejection</button>
                <button className="dm-btn-ghost" style={{flex:1,padding:10,fontSize:'.72rem'}} onClick={closeModal}>Cancel</button>
              </>}
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
            <div className="dm-srch">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search users, wallets…" value={searchQ} onChange={e=>setSearchQ(e.target.value)}/>
            </div>
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
              <button className="dm-btn-logout" onClick={()=>showToast('Logging out…')}>Logout</button>
            </div>
          </header>

          <div className="dm-content">
            {/* Page header */}
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12,marginBottom:22}} className="reveal">
              <div>
                <span className="dm-sec-label">Admin · Finance</span>
                <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'clamp(1.5rem,4vw,2.1rem)',fontWeight:400,lineHeight:1.15,color:'var(--ink)'}}>Withdrawal Management</h1>
                <p style={{fontSize:'.79rem',color:'var(--text-sec)',fontWeight:300,marginTop:4}}><span className="dm-live-dot"/>Live · Processing all withdrawal requests</p>
              </div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',alignSelf:'flex-end'}}>
                <input className="dm-date-in" type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} title="From"/>
                <input className="dm-date-in" type="date" value={dateTo}   onChange={e=>setDateTo(e.target.value)}   title="To"/>
                <button className="dm-btn-ink" onClick={exportCSV}>
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{position:'relative',zIndex:1}}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  <span>Export CSV</span>
                </button>
                <button className="dm-btn-ghost" onClick={()=>showToast('Data refreshed.')}>↻</button>
              </div>
            </div>

            {/* Stats */}
            <div className="dm-stats-grid reveal" style={{marginBottom:16}}>
              <div className="dm-stat-card">
                <div className="dm-st-icon" style={{background:'rgba(184,147,90,.08)'}}><svg viewBox="0 0 24 24" style={{stroke:'var(--gold)'}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg></div>
                <div className="dm-st-num">{pend.length}</div><div className="dm-st-lbl">Pending</div>
                <div className="dm-st-sub">{fmtU(pend.reduce((s,w)=>s+w.amt,0))}</div>
              </div>
              <div className="dm-stat-card">
                <div className="dm-st-icon" style={{background:'rgba(74,103,65,.08)'}}><svg viewBox="0 0 24 24" style={{stroke:'var(--sage)'}}><polyline points="20 6 9 17 4 12"/></svg></div>
                <div className="dm-st-num">{appr.length}</div><div className="dm-st-lbl">Approved</div>
                <div className="dm-st-sub">{fmtU(appr.reduce((s,w)=>s+w.amt,0))}</div>
              </div>
              <div className="dm-stat-card">
                <div className="dm-st-icon" style={{background:'rgba(155,58,58,.06)'}}><svg viewBox="0 0 24 24" style={{stroke:'#9b3a3a'}}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>
                <div className="dm-st-num">{rej.length}</div><div className="dm-st-lbl">Rejected</div>
                <div className="dm-st-sub">{fmtU(rej.reduce((s,w)=>s+w.amt,0))}</div>
              </div>
              <div className="dm-stat-card">
                <div className="dm-st-icon" style={{background:'rgba(28,28,28,.06)'}}><svg viewBox="0 0 24 24" style={{stroke:'var(--charcoal)'}}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-4 0v2"/></svg></div>
                <div className="dm-st-num">${tod.reduce((s,w)=>s+w.amt,0).toLocaleString()}</div>
                <div className="dm-st-lbl">Processed Today</div><div className="dm-st-sub">Apr 1, 2025</div>
              </div>
            </div>

            {/* Chart */}
            <div className="dm-chart-card reveal" style={{marginBottom:16}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8,marginBottom:12}}>
                <div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1rem',color:'var(--ink)'}}>7-Day Withdrawal Volume</div>
                  <div style={{fontSize:'.68rem',color:'var(--text-sec)'}}>Daily withdrawal amounts in USDT</div>
                </div>
                <div style={{display:'flex',gap:14,fontSize:'.68rem',color:'var(--text-sec)',flexWrap:'wrap'}}>
                  {[['var(--gold)','Pending'],['var(--sage)','Approved'],['#9b3a3a','Rejected']].map(([c,l])=>(
                    <span key={l} style={{display:'flex',alignItems:'center',gap:5}}>
                      <span className="dm-leg-dot" style={{background:c}}/>{l}
                    </span>
                  ))}
                </div>
              </div>
              <div className="dm-ch-h"><canvas ref={chartRef}/></div>
            </div>

            {/* Chips */}
            <div className="dm-chips reveal" style={{marginBottom:14}}>
              {[['all','All Status'],['pending','Pending'],['approved','Approved'],['rejected','Rejected']].map(([val,lbl])=>(
                <div key={val} className={`dm-chip${chip===val?' active':''}`} onClick={()=>setChip(val)}>{lbl}</div>
              ))}
            </div>

            {/* Table */}
            <div className="dm-table-card reveal">
              <div className="dm-table-head">
                <div>
                  <div className="dm-table-title">Withdrawal Requests</div>
                  <div className="dm-table-sub">{filtered.length} record{filtered.length!==1?'s':''} · filtered</div>
                </div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  <button className="dm-btn-ghost" style={{fontSize:'.68rem',borderColor:'rgba(74,103,65,.25)',color:'var(--sage)'}} onClick={approveAllPending}>Approve All Pending</button>
                </div>
              </div>
              <div className="dm-tscroll">
                <table className="dm-dt">
                  <thead>
                    <tr><th>User</th><th>Username</th><th>Amount (USDT)</th><th>Wallet Address</th><th>Network</th><th>Season</th><th>Requested</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {filtered.map(w=>(
                      <tr key={w.id}>
                        <td><div className="dm-td-u"><div className="dm-td-av">{w.init}</div><div className="dm-td-nm">{w.name}</div></div></td>
                        <td><span className="dm-td-sub">{w.un}</span></td>
                        <td><span className="dm-td-amt">-${fmtAmt(w.amt)}</span></td>
                        <td><span className="dm-td-mono" title={w.wallet} onClick={()=>copyTxt(w.wallet)}>{shortWallet(w.wallet)}</span></td>
                        <td><span className="dm-badge" style={{background:'rgba(28,28,28,.06)',border:'1px solid rgba(28,28,28,.1)',color:'var(--charcoal)',fontSize:'.56rem'}}>{w.net}</span></td>
                        <td><span className="dm-badge dm-b-pend" style={{fontSize:'.56rem'}}>{w.season}</span></td>
                        <td><span className="dm-td-sub">{w.date}</span></td>
                        <td><span className={`dm-badge ${bCls(w.status)}`}>{w.status}</span></td>
                        <td>
                          {w.status==='pending'
                            ?<div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                              <button className="dm-btn-conf" onClick={()=>openApprove(w.id)}>Approve</button>
                              <button className="dm-btn-rej"  onClick={()=>openReject(w.id)}>Reject</button>
                              <button className="dm-btn-view" onClick={()=>openView(w.id)}>View</button>
                            </div>
                            :<button className="dm-btn-view" onClick={()=>openView(w.id)}>Details</button>
                          }
                        </td>
                      </tr>
                    ))}
                    {filtered.length===0&&(
                      <tr><td colSpan={9}><div className="dm-empty-state"><div className="dm-empty-t">No withdrawals found</div><div className="dm-empty-b">Try adjusting your search or filter.</div></div></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="dm-pag">
                <div className="dm-pag-info">Showing {filtered.length} of {wds.length} records</div>
                <div className="dm-pag-btns">
                  <button className="dm-pag-btn" onClick={()=>showToast('Previous page')}>← Prev</button>
                  <button className="dm-pag-btn active">1</button>
                  <button className="dm-pag-btn" onClick={()=>showToast('Next page')}>Next →</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}