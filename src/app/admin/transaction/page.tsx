'use client';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import AdminSidebar from '../AdminSidebar';
import ValutXLoader from '@/components/ValutXLoader';
import { createClient } from '@/utils/supabase/client';

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
function fmt(n: number) { return Number(n).toLocaleString('en-US') }
function fmtUSDT(n: number) {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return '$' + (n / 1_000).toFixed(0) + 'K';
  return '$' + fmt(n);
}
function fmtDate(d: Date | string) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return String(d);
  }
}
function fmtDateTime(d: Date | string) {
  if (!d) return '—';
  return fmtDate(d) + ' · ' + new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

const PER_PAGE = 10;

export default function AdminTransactionPage() {
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast]             = useState({msg:'',cls:'',show:false});
  const [allTx, setAllTx]             = useState<Tx[]>([]);
  const [loading, setLoading]         = useState(true);
  const [searchQ, setSearchQ]         = useState('');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [typeFilter, setTypeFilter]   = useState<'all'|'deposit'|'withdrawal'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [modalTx, setModalTx]         = useState<Tx|null>(null);
  const [chartTotals, setChartTotals] = useState({dep:'—',wd:'—',net:'—'});
  
  const bgRef   = useRef<HTMLCanvasElement>(null);
  const chartRef= useRef<HTMLCanvasElement>(null);
  const chartInst = useRef<any>(null);
  const toastTimer= useRef<ReturnType<typeof setTimeout>>();

  const showToast = useCallback((msg:string,cls='')=>{
    setToast({msg,cls,show:true});
    clearTimeout(toastTimer.current);
    toastTimer.current=setTimeout(()=>setToast(t=>({...t,show:false})),3200);
  },[]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    // 1. Fetch Deposits
    const { data: deposits, error: depError } = await supabase
      .from('deposits')
      .select('*, profiles(first_name, last_name, username, id)')
      .neq('status', 'pending');

    // 2. Fetch Withdrawals
    const { data: withdrawals, error: wdError } = await supabase
      .from('withdrawals')
      .select('*, profiles(first_name, last_name, username, id)')
      .neq('status', 'pending');

    if (depError || wdError) {
      showToast('✕ Error fetching history', 'err');
    } else {
      const depMapped: Tx[] = (deposits || []).map(d => ({
        id: d.id,
        type: 'deposit',
        user: { name: `${d.profiles.first_name} ${d.profiles.last_name}`, email: '', uid: d.profiles.username },
        amount: d.amount,
        wallet: '',
        txHash: d.tx_hash || '',
        network: d.network || 'BEP-20',
        date: new Date(d.created_at),
        status: d.status.charAt(0).toUpperCase() + d.status.slice(1) as TxStatus,
        rejectionReason: d.rejection_reason
      }));

      const wdMapped: Tx[] = (withdrawals || []).map(w => ({
        id: w.id,
        type: 'withdrawal',
        user: { name: `${w.profiles.first_name} ${w.profiles.last_name}`, email: '', uid: w.profiles.username },
        amount: w.amount,
        wallet: w.address,
        txHash: w.tx_hash || '',
        network: w.network || 'BEP-20',
        date: new Date(w.created_at),
        status: w.status.charAt(0).toUpperCase() + w.status.slice(1) as TxStatus,
        rejectionReason: w.rejection_reason
      }));

      setAllTx([...depMapped, ...wdMapped].sort((a,b) => b.date.getTime() - a.date.getTime()));
    }
    setLoading(false);
  }, [supabase, showToast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  /* ── Scroll reveal ── */
  useEffect(() => {
    const obs = new IntersectionObserver(
      e => e.forEach(x => { if (x.isIntersecting) x.target.classList.add('vis'); }),
      { threshold: 0.06 }
    );
    document.querySelectorAll<HTMLElement>('.tx-reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [allTx, loading]); // re-runs when data loads

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
      {loading && <ValutXLoader pageName="Admin · Transactions" />}
      <canvas ref={bgRef} style={{position:'fixed',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0,opacity:.04}}/>
      <div className={`tx-toast${toast.show?' show':''}${toast.cls?' '+toast.cls:''}`}>{toast.msg}</div>

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