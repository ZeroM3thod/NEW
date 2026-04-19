'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import AdminSidebar from '../AdminSidebar';
import VaultXLoader from '@/components/VaultXLoader';
import { createClient } from '@/utils/supabase/client';

/* ══════════════════════════════
   TYPES
══════════════════════════════ */
type DepStatus = 'pending' | 'approved' | 'rejected';
interface Deposit {
  id: string; init: string; name: string; un: string; userId: string;
  amt: number; network: string; hash: string; date: string;
  season: string; note: string; reason: string; status: DepStatus;
}

/* ══════════════════════════════
   HELPERS
══════════════════════════════ */
function fmtAmt(v: number) { return v.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 }); }
function shortHash(h: string) { return h && h.length > 18 ? h.substring(0, 12) + '…' + h.slice(-4) : h || '—'; }
function bCls(s: DepStatus) { return s === 'approved' ? 'dm-b-conf' : s === 'rejected' ? 'dm-b-rej' : 'dm-b-pend'; }

/* ══════════════════════════════
   MODAL TYPES
══════════════════════════════ */
type ModalMode = 'view' | 'confirm' | 'reject' | null;

export default function AdminDepositPage() {
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast]             = useState({ msg:'', cls:'', show:false });
  const [deposits, setDeposits]       = useState<Deposit[]>([]);
  const [chip, setChip]               = useState<string>('all');
  const [searchQ, setSearchQ]         = useState('');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo,   setDateTo]         = useState('');
  const [modalOpen, setModalOpen]     = useState(false);
  const [modalMode, setModalMode]     = useState<ModalMode>(null);
  const [modalId,   setModalId]       = useState('');
  const [rejReason, setRejReason]     = useState('');
  const bgRef      = useRef<HTMLCanvasElement>(null);
  const chartRef   = useRef<HTMLCanvasElement>(null);
  const chartInst  = useRef<any>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const [loading, setLoading] = useState(true);

  /* ── Fetch Data ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('deposits')
      .select('*, profiles(first_name, last_name, username)')
      .order('created_at', { ascending: false });

    if (error) {
      showToast('✕ Error fetching deposits', 'err');
    } else if (data) {
      setDeposits(data.map((d: any) => ({
        id: d.id,
        init: (d.profiles?.first_name?.[0] || '') + (d.profiles?.last_name?.[0] || ''),
        name: `${d.profiles?.first_name} ${d.profiles?.last_name}`,
        un: `@${d.profiles?.username}`,
        userId: d.user_id,
        amt: Number(d.amount),
        network: d.network || '—',
        hash: d.tx_hash || '—',
        date: d.created_at.split('T')[0],
        season: '—',
        note: '',
        reason: d.rejection_reason || '',
        status: d.status as any
      })));
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
          { label:'Approved', data:conf, fill:true, backgroundColor:g1, borderColor:'rgba(74,103,65,.85)', borderWidth:2, pointBackgroundColor:'rgba(74,103,65,.9)', pointBorderColor:'#faf7f2', pointBorderWidth:2, pointRadius:3, pointHoverRadius:5, tension:.42 },
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
  const conf  = deposits.filter(d => d.status === 'approved');
  const pendAmt  = pend.reduce((s,d) => s+d.amt, 0);
  const confAmt  = conf.reduce((s,d) => s+d.amt, 0);

  /* ── Actions ── */
  const openView = (id: string) => { setModalId(id); setModalMode('view'); setRejReason(''); setModalOpen(true); };
  const openConfirmModal = (id: string) => { setModalId(id); setModalMode('confirm'); setModalOpen(true); };
  const openRejectModal  = (id: string) => {
    const d = deposits.find(x => x.id === id);
    setModalId(id); setModalMode('reject'); setRejReason(d?.reason || ''); setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setModalMode(null); };

  const doConfirm = async (id: string) => {
    const d = deposits.find(x => x.id === id)
    if (!d) return

    // 1. Mark the deposit as approved
    const { error: depError } = await supabase
      .from('deposits')
      .update({ status: 'approved' })
      .eq('id', id)
    if (depError) { showToast('✕ Error confirming deposit', 'err'); return }

    // 2. Fetch the user's current balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', d.userId)
      .single()

    const newBalance = (Number(profile?.balance) || 0) + d.amt

    // 3. Determine how much of the NEW balance is still locked ─────────────
    //    a) Check whether THIS deposit's own lock window is still active.
    //       (The 5-min timer starts when the user submits, not when admin approves.)
    const now = new Date().toISOString()
    const { data: thisDeposit } = await supabase
      .from('deposits')
      .select('locked_until')
      .eq('id', id)
      .single()

    const thisDepositStillLocked =
      thisDeposit?.locked_until && thisDeposit.locked_until > now
    const thisDepositLockedAmt = thisDepositStillLocked ? d.amt : 0

    //    b) Any OTHER approved deposits for this user that are still locked.
    const { data: otherLocked } = await supabase
      .from('deposits')
      .select('amount')
      .eq('user_id', d.userId)
      .eq('status', 'approved')
      .gt('locked_until', now)
      .neq('id', id)

    const otherLockedTotal = (otherLocked || []).reduce(
      (sum, dep) => sum + Number(dep.amount),
      0
    )

    // 4. withdrawable = newBalance minus everything that is still locked
    const totalLocked    = thisDepositLockedAmt + otherLockedTotal
    const newWithdrawable = Math.max(0, newBalance - totalLocked)

    const { error: profError } = await supabase
      .from('profiles')
      .update({
        balance:            newBalance,
        withdrawable_total: newWithdrawable,
      })
      .eq('id', d.userId)

    if (profError) {
      showToast('✕ Error updating balance', 'err')
    } else {
      showToast(`✓ DEP ${id} confirmed — $${d.amt.toLocaleString()} USDT`, 'ok')
      fetchData()
    }
    closeModal()
  }

  const doReject = async (id: string) => {
    if (!rejReason.trim() || rejReason.trim().length < 5) {
      showToast('Please enter a rejection reason.', 'err'); return;
    }
    
    const { error } = await supabase.from('deposits').update({ status: 'rejected', rejection_reason: rejReason }).eq('id', id);
    if (error) {
      showToast('✕ Error rejecting deposit', 'err');
    } else {
      showToast(`✕ DEP ${id} rejected`, 'err');
      fetchData();
    }
    closeModal();
  };

  const confirmAllPending = async () => {
    const rows = getFiltered().filter(d => d.status === 'pending')
    if (!rows.length) { showToast('No pending deposits in current view.'); return }
    const total = rows.reduce((s, d) => s + d.amt, 0)
    if (!confirm(`Confirm all ${rows.length} pending deposits? Total: $${total.toLocaleString()}`)) return

    const now = new Date().toISOString()

    for (const d of rows) {
      // Approve the deposit row
      await supabase.from('deposits').update({ status: 'approved' }).eq('id', d.id)

      // Fetch current balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', d.userId)
        .single()

      const newBalance = (Number(profile?.balance) || 0) + d.amt

      // Check this deposit's own lock
      const { data: thisDeposit } = await supabase
        .from('deposits')
        .select('locked_until')
        .eq('id', d.id)
        .single()

      const thisDepositStillLocked =
        thisDeposit?.locked_until && thisDeposit.locked_until > now
      const thisDepositLockedAmt = thisDepositStillLocked ? d.amt : 0

      // Check other still-locked approved deposits for the same user
      const { data: otherLocked } = await supabase
        .from('deposits')
        .select('amount')
        .eq('user_id', d.userId)
        .eq('status', 'approved')
        .gt('locked_until', now)
        .neq('id', d.id)

      const otherLockedTotal = (otherLocked || []).reduce(
        (sum, dep) => sum + Number(dep.amount),
        0
      )

      const totalLocked     = thisDepositLockedAmt + otherLockedTotal
      const newWithdrawable = Math.max(0, newBalance - totalLocked)

      await supabase
        .from('profiles')
        .update({
          balance:            newBalance,
          withdrawable_total: newWithdrawable,
        })
        .eq('id', d.userId)
    }

    showToast(`✓ ${rows.length} deposits confirmed!`, 'ok')
    fetchData()
  }

  const copyTxt = (t: string) => { navigator.clipboard?.writeText(t).catch(() => {}); showToast('📋 Copied to clipboard!'); };

  const exportCSV = () => {
    const rows = getFiltered();
    const hdr = ['ID','User','Username','Amount','Network','Hash','Date','Status','Reason'];
    const lines = [hdr.join(','), ...rows.map(d => [d.id,`"${d.name}"`,d.un,d.amt,d.network,`"${d.hash}"`,d.date,d.status,`"${d.reason}"`].join(','))];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type:'text/csv' }));
    a.download = `deposits-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    showToast(`✓ Exported ${rows.length} records`, 'ok');
  };

  const filtered = getFiltered();
  const curModal = deposits.find(d => d.id === modalId);

  return (
    <>
      {loading && <VaultXLoader pageName="Admin · Deposits" />}
      <canvas ref={bgRef} style={{ position:'fixed', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:0, opacity:.04 }} />
      <div className={`dm-toast${toast.show?' show':''}${toast.cls?' '+toast.cls:''}`}>{toast.msg}</div>

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
              You are confirming a deposit of <strong>${fmtAmt(curModal.amt)} USDT</strong> via <strong>{curModal.network}</strong> from <strong>{curModal.name}</strong>. This will credit the user's balance.
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
                  <div className="dm-dcell"><div className="dm-dl">Date</div><div className="dm-dv">{curModal.date}</div></div>
                  <div className="dm-dcell dm-dfull"><div className="dm-dl">Transaction Hash</div><div className="dm-dv mono" onClick={() => copyTxt(curModal.hash)} title="Click to copy">{curModal.hash}</div></div>
                  {curModal.reason && <div className="dm-dcell dm-dfull"><div className="dm-dl">Rejection Reason</div><div className="dm-dv err-c">{curModal.reason}</div></div>}
                </div>
              )}
              {modalMode === 'confirm' && (
                <div className="dm-dgrid">
                  <div className="dm-dcell"><div className="dm-dl">User</div><div className="dm-dv">{curModal.name}</div></div>
                  <div className="dm-dcell"><div className="dm-dl">Amount</div><div className="dm-dv gold">+${fmtAmt(curModal.amt)}</div></div>
                  <div className="dm-dcell"><div className="dm-dl">Network</div><div className="dm-dv">{curModal.network}</div></div>
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
                    <textarea className="dm-fi-ta" id="rej-reason" placeholder="Enter a clear reason for rejection..."
                      value={rejReason} onChange={e => setRejReason(e.target.value)} />
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
                    <button className="dm-btn-conf" style={{ flex:1, padding:10, fontSize:'.72rem' }} onClick={() => doConfirm(curModal.id)}>✓ Confirm</button>
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
                <button className="dm-btn-ghost" onClick={() => { showToast('Data refreshed.'); fetchData(); }}>↻</button>
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
                <div className="dm-st-lbl">Approved</div>
                <div className="dm-st-sub">${fmtAmt(confAmt)}</div>
              </div>
              <div className="dm-stat-card">
                <div className="dm-st-icon" style={{ background:'rgba(28,28,28,.06)' }}><svg viewBox="0 0 24 24" style={{ stroke:'var(--charcoal)' }}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-4 0v2"/></svg></div>
                <div className="dm-st-num">{deposits.length}</div>
                <div className="dm-st-lbl">Total Records</div>
                <div className="dm-st-sub">All time</div>
              </div>
              <div className="dm-stat-card">
                <div className="dm-st-icon" style={{ background:'rgba(184,147,90,.07)' }}><svg viewBox="0 0 24 24" style={{ stroke:'var(--gold-d)' }}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
                <div className="dm-st-num">${Math.round(confAmt/1000)}K</div>
                <div className="dm-st-lbl">Total Approved</div>
                <div className="dm-st-sub">USDT</div>
              </div>
            </div>

            {/* Chips */}
            <div className="dm-chips dm-reveal" style={{ marginBottom:14 }}>
              {[['all','All Status'],['pending','Pending'],['approved','Approved'],['rejected','Rejected']].map(([val,lbl]) => (
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
                      <th>Date</th><th>Status</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={8} style={{ textAlign:'center', padding:40 }}>Loading...</td></tr>
                    ) : filtered.map(d => (
                      <tr key={d.id}>
                        <td><div className="dm-td-u"><div className="dm-td-av">{d.init}</div><div className="dm-td-nm">{d.name}</div></div></td>
                        <td><span className="dm-td-sub">{d.un}</span></td>
                        <td><span className="dm-td-amt">+${fmtAmt(d.amt)}</span></td>
                        <td><span className="dm-badge" style={{ background:'rgba(28,28,28,.06)', border:'1px solid rgba(28,28,28,.1)', color:'var(--charcoal)', fontSize:'.56rem' }}>{d.network}</span></td>
                        <td><span className="dm-td-mono" title={d.hash} onClick={() => copyTxt(d.hash)}>{shortHash(d.hash)}</span></td>
                        <td><span className="dm-td-sub">{d.date}</span></td>
                        <td><span className={`dm-badge ${bCls(d.status)}`}>{d.status}</span></td>
                        <td>
                          {d.status === 'pending' ? (
                            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                              <button className="dm-btn-conf" onClick={() => doConfirm(d.id)}>Confirm</button>
                              <button className="dm-btn-rej"  onClick={() => openRejectModal(d.id)}>Reject</button>
                              <button className="dm-btn-view" onClick={() => openView(d.id)}>View</button>
                            </div>
                          ) : (
                            <button className="dm-btn-view" onClick={() => openView(d.id)}>Details</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!loading && filtered.length === 0 && (
                      <tr><td colSpan={8}>
                        <div className="dm-empty-state">
                          <div className="dm-empty-t">No deposits found</div>
                          <div className="dm-empty-b">Try adjusting your search or filter.</div>
                        </div>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>{/* /content */}
        </div>{/* /main-area */}
      </div>
    </>
  );
}
