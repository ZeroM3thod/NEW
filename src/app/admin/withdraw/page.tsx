'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import AdminSidebar from '../AdminSidebar';
import { createClient } from '@/utils/supabase/client';

/* ══ TYPES ══ */
type WdStatus = 'pending' | 'approved' | 'rejected';
interface Withdrawal {
  id:string; init:string; name:string; un:string;
  amt:number; wallet:string; net:string; season:string;
  date:string; note:string; commission:number;
  txid:string; reason:string; status:WdStatus;
  user_id: string;
}

type ModalMode = 'view' | 'approve' | 'reject' | null;

function fmtAmt(v:number){ return v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) }
function shortWallet(w:string){ return w.substring(0,10)+'…'+w.slice(-4) }
function bCls(s:WdStatus){ return s==='approved'?'dm-b-conf':s==='rejected'?'dm-b-rej':'dm-b-pend' }

export default function AdminWithdrawPage() {
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast,   setToast]   = useState({msg:'',cls:'',show:false});
  const [wds, setWds]         = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
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

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('withdrawals')
      .select('*, profiles(first_name, last_name, username)')
      .order('created_at', { ascending: false });
    
    if (error) {
      showToast('✕ Error fetching withdrawals', 'err');
    } else {
      const mapped: Withdrawal[] = data.map(w => ({
        id: w.id,
        init: w.profiles.first_name[0] + w.profiles.last_name[0],
        name: `${w.profiles.first_name} ${w.profiles.last_name}`,
        un: `@${w.profiles.username}`,
        amt: w.amount,
        wallet: w.address,
        net: w.network || 'BEP-20',
        season: 'S4', // Mock or fetch from investments
        date: new Date(w.created_at).toISOString().split('T')[0],
        note: '',
        commission: w.amount * 0.05,
        txid: w.tx_hash || '',
        reason: w.rejection_reason || '',
        status: w.status,
        user_id: w.user_id
      }));
      setWds(mapped);
    }
    setLoading(false);
  }, [supabase, showToast]);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const closeModal = () => {
    setModalMode(null);
    setModalId('');
    setTxidInput('');
    setRejReason('');
  };
  const openView = (id: string) => { setModalId(id); setModalMode('view'); };
  const openApprove = (id: string) => { setModalId(id); setModalMode('approve'); };
  const openReject = (id: string) => { setModalId(id); setModalMode('reject'); };

  const curWd = wds.find(w => w.id === modalId);

  const filtered = wds.filter(w => {
    const q = searchQ.toLowerCase();
    if (chip !== 'all' && w.status !== chip) return false;
    if (q && !(w.name.toLowerCase().includes(q) || w.un.toLowerCase().includes(q) || w.wallet.toLowerCase().includes(q) || w.id.toLowerCase().includes(q))) return false;
    return true;
  });

  const pend = wds.filter(w => w.status === 'pending');
  const appr = wds.filter(w => w.status === 'approved');
  const rej  = wds.filter(w => w.status === 'rejected');
  const tod  = wds.filter(w => w.date === new Date().toISOString().split('T')[0] && w.status === 'approved');

  const fmtU = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const doApprove = async (id: string) => {
    if (!txidInput.trim()) { showToast('Transaction ID is required.', 'err'); return }
    const wd = wds.find(w => w.id === id);
    if (!wd) return;

    // 1. Update withdrawal status
    const { error: wdError } = await supabase
      .from('withdrawals')
      .update({ status: 'approved', tx_hash: txidInput.trim() })
      .eq('id', id);

    if (wdError) {
      showToast('✕ Failed to approve withdrawal', 'err');
      return;
    }

    // 2. Deduct from user's balance (it was already deducted from withdrawable_total on request)
    const { data: profile } = await supabase.from('profiles').select('balance').eq('id', wd.user_id).single();
    if (profile) {
      await supabase.from('profiles').update({ balance: profile.balance - wd.amt }).eq('id', wd.user_id);
    }

    showToast(`✓ WD ${id.slice(0,8)} approved`, 'ok');
    fetchWithdrawals();
    closeModal();
  };

  const doReject = async (id: string) => {
    if (!rejReason.trim() || rejReason.trim().length < 10) { showToast('Please enter a rejection reason (min 10 chars).', 'err'); return }
    const wd = wds.find(w => w.id === id);
    if (!wd) return;

    // 1. Update withdrawal status
    const { error: wdError } = await supabase
      .from('withdrawals')
      .update({ status: 'rejected', rejection_reason: rejReason })
      .eq('id', id);

    if (wdError) {
      showToast('✕ Failed to reject withdrawal', 'err');
      return;
    }

    // 2. Refund to user's withdrawable_total
    const { data: profile } = await supabase.from('profiles').select('withdrawable_total').eq('id', wd.user_id).single();
    if (profile) {
      await supabase.from('profiles').update({ withdrawable_total: profile.withdrawable_total + wd.amt }).eq('id', wd.user_id);
    }

    showToast(`✕ WD ${id.slice(0,8)} rejected`, 'err');
    fetchWithdrawals();
    closeModal();
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