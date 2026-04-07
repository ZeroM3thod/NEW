'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import AdminSidebar from '../AdminSidebar';

/* ══════════════════════════════
   TYPES
══════════════════════════════ */
type DepStatus = 'pending' | 'confirmed' | 'rejected';
interface Deposit {
  id: string; init: string; name: string; un: string;
  amt: number; network: string; hash: string; date: string;
  season: string; note: string; reason: string; status: DepStatus;
}

/* ══════════════════════════════
   INITIAL DATA
══════════════════════════════ */
const INIT_DEPOSITS: Deposit[] = [
  { id:'DEP001', init:'RK', name:'Rakib Kowshar',    un:'@rakib.investor', amt:2174.65, network:'TRC-20', hash:'a1b2c3d4e5f6g7h8901234',        date:'2025-03-28', season:'S5', note:'Season 5 initial deposit',           reason:'',  status:'confirmed' },
  { id:'DEP002', init:'SN', name:'Sharmin Nahar',    un:'@sharmin.nahar',  amt:800.00,  network:'ERC-20', hash:'0xAbCd1234EfGh5678IjKl90',        date:'2025-03-29', season:'S5', note:'First investment S5',                 reason:'',  status:'confirmed' },
  { id:'DEP003', init:'AH', name:'Aminul Hossain',   un:'@aminul.h',       amt:500.00,  network:'TRC-20', hash:'TRz9Y8X7W6V5U4T3S2R1Q0P',         date:'2025-03-30', season:'S6', note:'Season 6 early entry',               reason:'',  status:'pending'   },
  { id:'DEP004', init:'FK', name:'Farzana Khanam',   un:'@farzana.k',      amt:300.00,  network:'BSC',    hash:'0xBNB2468ACEDFG13579246',           date:'2025-03-31', season:'S5', note:'Top-up deposit',                     reason:'',  status:'pending'   },
  { id:'DEP005', init:'MR', name:'Mostafizur R.',    un:'@mostafiz.r',     amt:5000.00, network:'TRC-20', hash:'TRa0B9C8D7E6F5G4H3I2J1',           date:'2025-04-01', season:'S7', note:'Large Season 7 deposit',             reason:'',  status:'pending'   },
  { id:'DEP006', init:'NB', name:'Nasreen Begum',    un:'@nasreen.b',      amt:450.00,  network:'ERC-20', hash:'0xNB9876543210ABCDEF1234',          date:'2025-03-27', season:'S5', note:'Mid-season deposit',                 reason:'',  status:'confirmed' },
  { id:'DEP007', init:'JH', name:'Jahangir Hossain', un:'@jahangir.h',     amt:1000.00, network:'BSC',    hash:'0xJH1234567890EFGH123456',          date:'2025-04-01', season:'S5', note:'New investor first deposit',         reason:'',  status:'pending'   },
  { id:'DEP008', init:'RA', name:'Roksana Akter',    un:'@roksana.a',      amt:750.00,  network:'TRC-20', hash:'TRr1O2K3S4A5N6A7K8T9E0',           date:'2025-03-26', season:'S6', note:'Season 6 deposit',                   reason:'Transaction hash mismatch — please resubmit', status:'rejected' },
  { id:'DEP009', init:'KH', name:'Karim Hossain',    un:'@karim.h',        amt:2500.00, network:'TRC-20', hash:'TRk0A9R1I2M3H4O5S6S7A8I',          date:'2025-03-25', season:'S4', note:'Late Season 4 top-up',               reason:'',  status:'confirmed' },
  { id:'DEP010', init:'PM', name:'Parvin Molla',     un:'@parvin.m',       amt:600.00,  network:'ERC-20', hash:'0xPM1357924680WXYZ123456',          date:'2025-03-24', season:'S6', note:'Season 6 entry',                     reason:'',  status:'pending'   },
  { id:'DEP011', init:'SM', name:'Salma Moni',       un:'@salma.m',        amt:1200.00, network:'TRC-20', hash:'TRs1A2L3M4A5M6O7N8I9J0',           date:'2025-04-01', season:'S7', note:'Season 7 first deposit',             reason:'',  status:'pending'   },
  { id:'DEP012', init:'HK', name:'Hasibul Karim',    un:'@hasibul.k',      amt:350.00,  network:'BSC',    hash:'0xHK4567890ABCDEF123456AB',         date:'2025-03-22', season:'S5', note:'Mid-season BSC deposit',             reason:'Insufficient network confirmations', status:'rejected' },
];

/* ══════════════════════════════
   HELPERS
══════════════════════════════ */
function fmtAmt(v: number) { return v.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 }); }
function shortHash(h: string) { return h.length > 18 ? h.substring(0, 12) + '…' + h.slice(-4) : h; }
function bCls(s: DepStatus) { return s === 'confirmed' ? 'dm-b-conf' : s === 'rejected' ? 'dm-b-rej' : 'dm-b-pend'; }

/* ══════════════════════════════
   MODAL TYPES
══════════════════════════════ */
type ModalMode = 'view' | 'confirm' | 'reject' | null;

export default function AdminDepositPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast]             = useState({ msg:'', cls:'', show:false });
  const [deposits, setDeposits]       = useState<Deposit[]>(INIT_DEPOSITS.map(d => ({ ...d })));
  const [chip, setChip]               = useState<string>('all');
  const [searchQ, setSearchQ]         = useState('');
  const [dateFrom, setDateFrom]       = useState('2025-01-01');
  const [dateTo,   setDateTo]         = useState('2025-12-31');
  const [modalOpen, setModalOpen]     = useState(false);
  const [modalMode, setModalMode]     = useState<ModalMode>(null);
  const [modalId,   setModalId]       = useState('');
  const [rejReason, setRejReason]     = useState('');
  const bgRef      = useRef<HTMLCanvasElement>(null);
  const chartRef   = useRef<HTMLCanvasElement>(null);
  const chartInst  = useRef<any>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  /* ── Toast ── */
  const showToast = useCallback((msg: string, cls = '') => {
    setToast({ msg, cls, show:true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show:false })), 3300);
  }, []);

  /* ── Reveal ── */
  useEffect(() => {
    const obs = new IntersectionObserver(
      e => e.forEach(x => { if (x.isIntersecting) x.target.classList.add('vis'); }),
      { threshold: 0.06 }
    );
    document.querySelectorAll<HTMLElement>('.dm-reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [deposits]);

  /* ── Body lock ── */
  useEffect(() => {
    document.body.style.overflow = (sidebarOpen || modalOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen, modalOpen]);

  /* ── BG canvas ── */
  useEffect(() => {
    const cv = bgRef.current; if (!cv) return;
    const ctx = cv.getContext('2d')!;
    let W=0, H=0, T=0, candles:any[]=[], waves:any[]=[], rafId=0;
    const setup = () => {
      W=cv.width=window.innerWidth; H=cv.height=window.innerHeight;
      const n=Math.max(5,Math.floor(W/52));
      candles=Array.from({length:n},(_,i)=>({ x:(i/n)*W+10+Math.random()*18, y:H*.12+Math.random()*H*.74, w:8+Math.random()*9, h:14+Math.random()*70, wick:6+Math.random()*22, up:Math.random()>.42, spd:.15+Math.random()*.35, ph:Math.random()*Math.PI*2 }));
      const pts=Math.ceil(W/36)+2;
      waves=[0,1,2,3].map(i=>({ pts:Array.from({length:pts},(_,j)=>({x:j*36,y:H*(.1+i*.24)+Math.random()*44})), spd:.1+i*.04, ph:i*1.4, amp:13+i*8, col:i%2===0?'rgba(74,103,65,':'rgba(184,147,90,', opa:i%2===0?'.7)':'.55)' }));
    };
    const draw = () => {
      ctx.clearRect(0,0,W,H); T+=.011;
      waves.forEach((w:any)=>{ ctx.beginPath(); w.pts.forEach((p:any,j:number)=>{ const y=p.y+Math.sin(T*w.spd+j*.3+w.ph)*w.amp; j===0?ctx.moveTo(p.x,y):ctx.lineTo(p.x,y); }); ctx.strokeStyle=w.col+w.opa; ctx.lineWidth=1; ctx.stroke(); });
      candles.forEach((c:any)=>{ const b=Math.sin(T*c.spd+c.ph)*7,x=c.x,y=c.y+b; ctx.strokeStyle='rgba(28,28,28,.8)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(x+c.w/2,y-c.wick); ctx.lineTo(x+c.w/2,y+c.h+c.wick); ctx.stroke(); ctx.fillStyle=c.up?'rgba(74,103,65,.88)':'rgba(184,147,90,.82)'; ctx.fillRect(x,y,c.w,c.h); ctx.strokeRect(x,y,c.w,c.h); });
      rafId=requestAnimationFrame(draw);
    };
    window.addEventListener('resize',setup); setup(); draw();
    return () => { cancelAnimationFrame(rafId); window.removeEventListener('resize',setup); };
  }, []);

  /* ── Chart ── */
  useEffect(() => {
    import('chart.js/auto').then(({ default: Chart }) => {
      if (!chartRef.current) return;
      chartInst.current?.destroy();
      const ctx = chartRef.current.getContext('2d')!;
      const labels = ['26 Mar','27 Mar','28 Mar','29 Mar','30 Mar','31 Mar','1 Apr'];
      const conf=[2500,450,2174,800,0,0,4700], pend=[0,0,0,0,300,0,1600], rej=[350,0,750,0,0,0,0];
      const g1=ctx.createLinearGradient(0,0,0,175); g1.addColorStop(0,'rgba(74,103,65,.18)'); g1.addColorStop(1,'rgba(74,103,65,0)');
      const g2=ctx.createLinearGradient(0,0,0,175); g2.addColorStop(0,'rgba(184,147,90,.18)'); g2.addColorStop(1,'rgba(184,147,90,0)');
      const g3=ctx.createLinearGradient(0,0,0,175); g3.addColorStop(0,'rgba(155,58,58,.14)'); g3.addColorStop(1,'rgba(155,58,58,0)');
      chartInst.current = new Chart(ctx, {
        type:'line',
        data:{ labels, datasets:[
          { label:'Confirmed', data:conf, fill:true, backgroundColor:g1, borderColor:'rgba(74,103,65,.85)', borderWidth:2, pointBackgroundColor:'rgba(74,103,65,.9)', pointBorderColor:'#faf7f2', pointBorderWidth:2, pointRadius:3, pointHoverRadius:5, tension:.42 },
          { label:'Pending',   data:pend, fill:true, backgroundColor:g2, borderColor:'rgba(184,147,90,.85)', borderWidth:2, pointBackgroundColor:'rgba(184,147,90,.9)', pointBorderColor:'#faf7f2', pointBorderWidth:2, pointRadius:3, pointHoverRadius:5, tension:.42 },
          { label:'Rejected',  data:rej,  fill:true, backgroundColor:g3, borderColor:'rgba(155,58,58,.75)', borderWidth:2, pointBackgroundColor:'rgba(155,58,58,.9)', pointBorderColor:'#faf7f2', pointBorderWidth:2, pointRadius:3, pointHoverRadius:5, tension:.42 },
        ]},
        options:{ responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{display:false}, tooltip:{ backgroundColor:'rgba(28,28,28,.96)', borderColor:'rgba(184,147,90,.3)', borderWidth:1, titleColor:'#d4aa72', bodyColor:'#f6f1e9', titleFont:{family:'DM Sans',size:10}, bodyFont:{family:'DM Sans',size:11}, padding:10, callbacks:{ label:(c:any)=>`  ${c.dataset.label}: $${c.raw.toLocaleString()}` } } },
          scales:{ x:{ grid:{color:'rgba(184,147,90,.06)'}, ticks:{color:'#6b6459',font:{family:'DM Sans',size:9}} }, y:{ grid:{color:'rgba(184,147,90,.06)'}, ticks:{color:'#6b6459',font:{family:'DM Sans',size:9},callback:(v:any)=>'$'+(v>=1000?(v/1000).toFixed(1)+'K':v)} } },
          interaction:{intersect:false,mode:'index'} }
      });
    });
    return () => { chartInst.current?.destroy(); };
  }, []);

  /* ── Filter ── */
  const getFiltered = useCallback(() => {
    return deposits.filter(d => {
      const mC = chip==='all' || d.status===chip;
      const q  = searchQ.toLowerCase();
      const mQ = !q || d.name.toLowerCase().includes(q) || d.un.toLowerCase().includes(q) || d.id.toLowerCase().includes(q) || d.hash.toLowerCase().includes(q) || d.network.toLowerCase().includes(q);
      const mD = (!dateFrom || d.date >= dateFrom) && (!dateTo || d.date <= dateTo);
      return mC && mQ && mD;
    });
  }, [deposits, chip, searchQ, dateFrom, dateTo]);

  /* ── Stats ── */
  const pend  = deposits.filter(d => d.status === 'pending');
  const conf  = deposits.filter(d => d.status === 'confirmed');
  const tod   = deposits.filter(d => d.date === '2025-04-01');
  const month = deposits.filter(d => d.date >= '2025-03-01' && d.status === 'confirmed');
  const pendAmt  = pend.reduce((s,d) => s+d.amt, 0);
  const confAmt  = conf.reduce((s,d) => s+d.amt, 0);
  const todTotal = tod.reduce((s,d) => s+d.amt, 0);
  const monTotal = month.reduce((s,d) => s+d.amt, 0);

  /* ── Actions ── */
  const openView = (id: string) => { setModalId(id); setModalMode('view'); setRejReason(''); setModalOpen(true); };
  const openConfirmModal = (id: string) => { setModalId(id); setModalMode('confirm'); setModalOpen(true); };
  const openRejectModal  = (id: string) => {
    const d = deposits.find(x => x.id === id);
    setModalId(id); setModalMode('reject'); setRejReason(d?.reason || ''); setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setModalMode(null); };

  const doConfirm = (id: string) => {
    setDeposits(prev => prev.map(d => d.id===id ? {...d, status:'confirmed'} : d));
    closeModal();
    const d = deposits.find(x => x.id===id);
    showToast(`✓ DEP ${id} confirmed — $${d?.amt.toLocaleString()} USDT`, 'ok');
  };
  const doReject = (id: string) => {
    if (!rejReason.trim() || rejReason.trim().length < 10) {
      showToast('Please enter a rejection reason (min 10 chars).', 'err'); return;
    }
    setDeposits(prev => prev.map(d => d.id===id ? {...d, status:'rejected', reason:rejReason} : d));
    closeModal();
    showToast(`✕ DEP ${id} rejected`, 'err');
  };
  const confirmAllPending = () => {
    const rows = getFiltered().filter(d => d.status === 'pending');
    if (!rows.length) { showToast('No pending deposits in current view.'); return; }
    const total = rows.reduce((s,d) => s+d.amt, 0);
    if (!confirm(`Confirm all ${rows.length} pending deposits? Total: $${total.toLocaleString()}`)) return;
    const ids = new Set(rows.map(d => d.id));
    setDeposits(prev => prev.map(d => ids.has(d.id) ? {...d, status:'confirmed'} : d));
    showToast(`✓ ${rows.length} deposits confirmed!`, 'ok');
  };
  const copyTxt = (t: string) => { navigator.clipboard?.writeText(t).catch(() => {}); showToast('📋 Copied to clipboard!'); };

  const exportCSV = () => {
    const rows = getFiltered();
    const hdr = ['ID','User','Username','Amount','Network','Hash','Date','Season','Status','Reason','Note'];
    const lines = [hdr.join(','), ...rows.map(d => [d.id,`"${d.name}"`,d.un,d.amt,d.network,`"${d.hash}"`,d.date,d.season,d.status,`"${d.reason}"`,`"${d.note}"`].join(','))];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type:'text/csv' }));
    a.download = `deposits-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    showToast(`✓ Exported ${rows.length} records`, 'ok');
  };

  const filtered = getFiltered();
  const curModal = deposits.find(d => d.id === modalId);

  return (
    <>
      <canvas ref={bgRef} style={{ position:'fixed', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:0, opacity:.04 }} />
      <div className={`dm-toast${toast.show?' show':''}${toast.cls?' '+toast.cls:''}`}>{toast.msg}</div>
      <div className={`adm-sb-overlay${sidebarOpen?' show':''}`} onClick={() => setSidebarOpen(false)} />

      {/* ── MODAL ── */}
      <div className={`dm-ov${modalOpen?' open':''}`} onClick={e => { if (e.target===e.currentTarget) closeModal(); }}>
        <div className="dm-mb">
          <div className="dm-mhd">
            <span className="dm-mttl">
              {modalMode==='view' ? `Deposit · ${modalId}` : modalMode==='confirm' ? 'Confirm Deposit' : 'Reject Deposit'}
            </span>
            <button className="dm-mcls" onClick={closeModal}>✕</button>
          </div>

          {/* Note bar */}
          {modalMode === 'confirm' && curModal && (
            <div className="dm-conf-note dm-cn-ok">
              You are confirming a deposit of <strong>${fmtAmt(curModal.amt)} USDT</strong> via <strong>{curModal.network}</strong> from <strong>{curModal.name}</strong>. Please verify the transaction hash before proceeding.
            </div>
          )}
          {modalMode === 'reject' && curModal && (
            <div className="dm-conf-note dm-cn-warn">
              ⚠ You are about to <strong>reject</strong> a deposit of <strong>${fmtAmt(curModal.amt)} USDT</strong> from <strong>{curModal.name}</strong>. A reason is required.
            </div>
          )}

          {/* Body */}
          {curModal && (
            <>
              {modalMode === 'view' && (
                <div className="dm-dgrid">
                  <div className="dm-dcell"><div className="dm-dl">ID</div><div className="dm-dv" style={{ fontFamily:'monospace', fontSize:'.77rem' }}>{curModal.id}</div></div>
                  <div className="dm-dcell"><div className="dm-dl">Status</div><div className="dm-dv"><span className={`dm-badge ${bCls(curModal.status)}`}>{curModal.status}</span></div></div>
                  <div className="dm-dcell"><div className="dm-dl">User</div><div className="dm-dv">{curModal.name}</div></div>
                  <div className="dm-dcell"><div className="dm-dl">Username</div><div className="dm-dv dm-td-sub">{curModal.un}</div></div>
                  <div className="dm-dcell"><div className="dm-dl">Amount (USDT)</div><div className="dm-dv gold">+${fmtAmt(curModal.amt)}</div></div>
                  <div className="dm-dcell"><div className="dm-dl">Network</div><div className="dm-dv">{curModal.network}</div></div>
                  <div className="dm-dcell"><div className="dm-dl">Season</div><div className="dm-dv">{curModal.season}</div></div>
                  <div className="dm-dcell"><div className="dm-dl">Date</div><div className="dm-dv">{curModal.date}</div></div>
                  <div className="dm-dcell dm-dfull"><div className="dm-dl">Transaction Hash</div><div className="dm-dv mono" onClick={() => copyTxt(curModal.hash)} title="Click to copy">{curModal.hash}</div></div>
                  {curModal.reason && <div className="dm-dcell dm-dfull"><div className="dm-dl">Rejection Reason</div><div className="dm-dv err-c">{curModal.reason}</div></div>}
                  <div className="dm-dcell dm-dfull"><div className="dm-dl">Note</div><div className="dm-dv">{curModal.note}</div></div>
                </div>
              )}
              {modalMode === 'confirm' && (
                <div className="dm-dgrid">
                  <div className="dm-dcell"><div className="dm-dl">User</div><div className="dm-dv">{curModal.name}</div></div>
                  <div className="dm-dcell"><div className="dm-dl">Amount</div><div className="dm-dv gold">+${fmtAmt(curModal.amt)}</div></div>
                  <div className="dm-dcell"><div className="dm-dl">Network</div><div className="dm-dv">{curModal.network}</div></div>
                  <div className="dm-dcell"><div className="dm-dl">Season</div><div className="dm-dv">{curModal.season}</div></div>
                  <div className="dm-dcell dm-dfull"><div className="dm-dl">Transaction Hash (verify before confirming)</div><div className="dm-dv mono" onClick={() => copyTxt(curModal.hash)} title="Click to copy">{curModal.hash}</div></div>
                </div>
              )}
              {modalMode === 'reject' && (
                <>
                  <div className="dm-dgrid" style={{ marginBottom:8 }}>
                    <div className="dm-dcell"><div className="dm-dl">User</div><div className="dm-dv">{curModal.name}</div></div>
                    <div className="dm-dcell"><div className="dm-dl">Amount</div><div className="dm-dv dm-td-amt">${fmtAmt(curModal.amt)}</div></div>
                    <div className="dm-dcell dm-dfull"><div className="dm-dl">Transaction Hash</div><div className="dm-dv mono">{curModal.hash}</div></div>
                  </div>
                  <div className="dm-fg">
                    <label className="dm-fl" htmlFor="rej-reason">Rejection Reason <span style={{ color:'var(--error)' }}>*</span></label>
                    <textarea className="dm-fi-ta" id="rej-reason" placeholder="Enter a clear reason for rejection. This message will be sent to the user…"
                      value={rejReason} onChange={e => setRejReason(e.target.value)} />
                    <span style={{ fontSize:'.67rem', color:'var(--text-sec)', marginTop:2 }}>Required · Minimum 10 characters.</span>
                  </div>
                </>
              )}
            </>
          )}

          {/* Actions */}
          <div className="dm-mact">
            {modalMode === 'view' && curModal && (
              curModal.status === 'pending'
                ? <>
                    <button className="dm-btn-conf" style={{ flex:1, padding:10, fontSize:'.72rem' }} onClick={() => openConfirmModal(curModal.id)}>✓ Confirm</button>
                    <button className="dm-btn-rej"  style={{ flex:1, padding:10, fontSize:'.72rem' }} onClick={() => openRejectModal(curModal.id)}>✕ Reject</button>
                    <button className="dm-btn-ghost" style={{ padding:'10px 14px', fontSize:'.72rem' }} onClick={closeModal}>Close</button>
                  </>
                : <>
                    <button className="dm-btn-ghost" style={{ flex:1, padding:10, fontSize:'.72rem' }} onClick={closeModal}>Close</button>
                    <button className="dm-btn-ghost" style={{ padding:'10px 14px', fontSize:'.72rem' }} onClick={() => copyTxt(curModal.hash)}>Copy Hash</button>
                  </>
            )}
            {modalMode === 'confirm' && curModal && (
              <>
                <button className="dm-btn-conf" style={{ flex:1, padding:10, fontSize:'.72rem' }} onClick={() => doConfirm(curModal.id)}>✓ Confirm Deposit</button>
                <button className="dm-btn-ghost" style={{ flex:1, padding:10, fontSize:'.72rem' }} onClick={closeModal}>Cancel</button>
              </>
            )}
            {modalMode === 'reject' && curModal && (
              <>
                <button className="dm-btn-rej" style={{ flex:1, padding:10, fontSize:'.72rem' }} onClick={() => doReject(curModal.id)}>✕ Confirm Rejection</button>
                <button className="dm-btn-ghost" style={{ flex:1, padding:10, fontSize:'.72rem' }} onClick={closeModal}>Cancel</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── LAYOUT ── */}
      <div className="adm-layout">
        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onToast={showToast} />

        <div className="adm-main-area">
          {/* Header */}
          <header className="adm-top-header">
            <button className="adm-ham-btn" onClick={() => setSidebarOpen(o => !o)}>
              <span/><span/><span/>
            </button>
            <a className="adm-back-pill" href="/admin/dashboard">
              <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
              Dashboard
            </a>
            <div className="dm-srch">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search users, hashes…" value={searchQ} onChange={e => setSearchQ(e.target.value)} />
            </div>
            <div className="adm-header-right">
              <div className="adm-notif-btn" onClick={() => showToast('3 new notifications')}>
                <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                <div className="adm-notif-dot" />
              </div>
              <div className="adm-header-avatar">AD</div>
              <div className="adm-header-uinfo">
                <div className="adm-header-uname">Admin User</div>
                <div className="adm-header-role">Super Administrator</div>
              </div>
              <button className="dm-btn-logout" onClick={() => showToast('Logging out…')}>Logout</button>
            </div>
          </header>

          <div className="dm-content">

            {/* Page header */}
            <div className="dm-reveal" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:22 }}>
              <div>
                <span className="dm-sec-label">Admin · Finance</span>
                <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'clamp(1.5rem,4vw,2.1rem)', fontWeight:400, lineHeight:1.15, color:'var(--ink)' }}>Deposit Management</h1>
                <p style={{ fontSize:'.79rem', color:'var(--text-sec)', fontWeight:300, marginTop:4 }}><span className="dm-live-dot"/>Live · Monitoring all incoming deposits</p>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignSelf:'flex-end' }}>
                <input className="dm-date-in" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="From" />
                <input className="dm-date-in" type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   title="To" />
                <button className="dm-btn-ink" onClick={exportCSV}>
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ position:'relative', zIndex:1 }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  <span>Export CSV</span>
                </button>
                <button className="dm-btn-ghost" onClick={() => showToast('Data refreshed.')}>↻</button>
              </div>
            </div>

            {/* Stats */}
            <div className="dm-stats-grid dm-reveal" style={{ marginBottom:16 }}>
              <div className="dm-stat-card">
                <div className="dm-st-icon" style={{ background:'rgba(184,147,90,.08)' }}><svg viewBox="0 0 24 24" style={{ stroke:'var(--gold)' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg></div>
                <div className="dm-st-num">{pend.length}</div>
                <div className="dm-st-lbl">Pending</div>
                <div className="dm-st-sub">${fmtAmt(pendAmt)}</div>
              </div>
              <div className="dm-stat-card">
                <div className="dm-st-icon" style={{ background:'rgba(74,103,65,.08)' }}><svg viewBox="0 0 24 24" style={{ stroke:'var(--sage)' }}><polyline points="20 6 9 17 4 12"/></svg></div>
                <div className="dm-st-num">{conf.length}</div>
                <div className="dm-st-lbl">Confirmed</div>
                <div className="dm-st-sub">${fmtAmt(confAmt)}</div>
              </div>
              <div className="dm-stat-card">
                <div className="dm-st-icon" style={{ background:'rgba(28,28,28,.06)' }}><svg viewBox="0 0 24 24" style={{ stroke:'var(--charcoal)' }}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-4 0v2"/></svg></div>
                <div className="dm-st-num">${todTotal.toLocaleString()}</div>
                <div className="dm-st-lbl">Received Today</div>
                <div className="dm-st-sub">Apr 1, 2025</div>
              </div>
              <div className="dm-stat-card">
                <div className="dm-st-icon" style={{ background:'rgba(184,147,90,.07)' }}><svg viewBox="0 0 24 24" style={{ stroke:'var(--gold-d)' }}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
                <div className="dm-st-num">${Math.round(monTotal/1000)}K</div>
                <div className="dm-st-lbl">Monthly (Confirmed)</div>
                <div className="dm-st-sub">Mar – Apr 2025</div>
              </div>
            </div>

            {/* Chart */}
            <div className="dm-chart-card dm-reveal" style={{ marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8, marginBottom:14 }}>
                <div>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.05rem', color:'var(--ink)' }}>Deposit Volume</div>
                  <div style={{ fontSize:'.68rem', color:'var(--text-sec)', marginTop:2 }}>Last 7 days · USDT received</div>
                </div>
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  {[['var(--sage)','Confirmed'],['var(--gold)','Pending'],['#9b3a3a','Rejected']].map(([c,l]) => (
                    <div key={l} style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <span className="dm-leg-dot" style={{ background:c }}/>
                      <span style={{ fontSize:'.65rem', color:'var(--text-sec)' }}>{l}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="dm-ch-h"><canvas ref={chartRef} /></div>
            </div>

            {/* Chips */}
            <div className="dm-chips dm-reveal" style={{ marginBottom:14 }}>
              {[['all','All Status'],['pending','Pending'],['confirmed','Confirmed'],['rejected','Rejected']].map(([val,lbl]) => (
                <div key={val} className={`dm-chip${chip===val?' active':''}`} onClick={() => setChip(val)}>{lbl}</div>
              ))}
            </div>

            {/* Table */}
            <div className="dm-table-card dm-reveal">
              <div className="dm-table-head">
                <div>
                  <div className="dm-table-title">Deposit Records</div>
                  <div className="dm-table-sub">{filtered.length} record{filtered.length!==1?'s':''} · filtered</div>
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <button className="dm-btn-ghost" style={{ fontSize:'.68rem', borderColor:'rgba(74,103,65,.25)', color:'var(--sage)' }} onClick={confirmAllPending}>Confirm All Pending</button>
                </div>
              </div>
              <div className="dm-tscroll">
                <table className="dm-dt">
                  <thead>
                    <tr>
                      <th>User</th><th>Username</th><th>Amount (USDT)</th>
                      <th>Network</th><th>Transaction Hash</th>
                      <th>Date</th><th>Season</th><th>Status</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(d => (
                      <tr key={d.id}>
                        <td><div className="dm-td-u"><div className="dm-td-av">{d.init}</div><div className="dm-td-nm">{d.name}</div></div></td>
                        <td><span className="dm-td-sub">{d.un}</span></td>
                        <td><span className="dm-td-amt">+${fmtAmt(d.amt)}</span></td>
                        <td><span className="dm-badge" style={{ background:'rgba(28,28,28,.06)', border:'1px solid rgba(28,28,28,.1)', color:'var(--charcoal)', fontSize:'.56rem' }}>{d.network}</span></td>
                        <td><span className="dm-td-mono" title={d.hash} onClick={() => copyTxt(d.hash)}>{shortHash(d.hash)}</span></td>
                        <td><span className="dm-td-sub">{d.date}</span></td>
                        <td><span className="dm-badge dm-b-pend" style={{ fontSize:'.56rem' }}>{d.season}</span></td>
                        <td><span className={`dm-badge ${bCls(d.status)}`}>{d.status}</span></td>
                        <td>
                          {d.status === 'pending' ? (
                            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                              <button className="dm-btn-conf" onClick={() => openConfirmModal(d.id)}>Confirm</button>
                              <button className="dm-btn-rej"  onClick={() => openRejectModal(d.id)}>Reject</button>
                              <button className="dm-btn-view" onClick={() => openView(d.id)}>View</button>
                            </div>
                          ) : (
                            <button className="dm-btn-view" onClick={() => openView(d.id)}>Details</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={9}>
                        <div className="dm-empty-state">
                          <div className="dm-empty-t">No deposits found</div>
                          <div className="dm-empty-b">Try adjusting your search or filter.</div>
                        </div>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="dm-pag">
                <div className="dm-pag-info">Showing {filtered.length} of {deposits.length} records</div>
                <div className="dm-pag-btns">
                  <button className="dm-pag-btn" onClick={() => showToast('Previous page')}>← Prev</button>
                  <button className="dm-pag-btn active">1</button>
                  <button className="dm-pag-btn" onClick={() => showToast('Next page')}>Next →</button>
                </div>
              </div>
            </div>

          </div>{/* /content */}
        </div>{/* /main-area */}
      </div>
    </>
  );
}