'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '../AdminSidebar';
import { createClient } from '@/utils/supabase/client';

/* ══════════════════════════════
   HELPERS
══════════════════════════════ */
function fmtU(n: number) {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000)     return '$' + (n / 1_000).toFixed(1) + 'K';
  return '$' + parseFloat(String(n)).toFixed(2);
}
function fmtDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}
function fmtDT(d: string) {
  if (!d) return '—';
  return fmtDate(d) + ' · ' + new Date(d).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
}
function initials(name: string) { return name ? name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : '??'; }

/* ══════════════════════════════
   TYPES
══════════════════════════════ */
interface SeasonEntry { season:string; amount:number; roi:number; profit:number }
interface TxEntry { id:string; type:'deposit'|'withdrawal'; amount:number; status:string; date:string; wallet:string; network:string; userId:string }
interface User {
  uid:string; name:string; username:string; email:string; phone:string; country:string;
  balance:number; invested:number; withdrawn:number; pnl:number;
  refCount:number; refCode:string; refUsers:string[]; refEarn:number;
  status:string; joined:string;
  seasonsJoined:SeasonEntry[]; deposits:TxEntry[]; withdrawals:TxEntry[];
  referredBy:string|null;
}

const PER_PAGE = 10;

/* ══════════════════════════════
   STATUS BADGE
══════════════════════════════ */
function StatusBadge({ s }: { s:string }) {
  const map: Record<string,string> = { Active:'adm-b-active', Suspended:'adm-b-rejected', Pending:'adm-b-pending' };
  return <span className={`adm-badge ${map[s]||'adm-b-pending'}`}>{s}</span>;
}

/* ══════════════════════════════
   MAIN COMPONENT
══════════════════════════════ */
export default function AdminUserPage() {
  const router = useRouter();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [toastMsg,    setToastMsg]       = useState('');
  const [toastType,   setToastType]      = useState('');
  const [toastShow,   setToastShow]      = useState(false);
  const [users,       setUsers]          = useState<User[]>([]);
  const [searchQ,     setSearchQ]        = useState('');
  const [statusFilter,setStatusFilter]   = useState('all');
  const [currentPage, setCurrentPage]    = useState(1);
  const [totalCount,  setTotalCount]     = useState(0);
  const [activeUser,  setActiveUser]     = useState<User|null>(null);
  const [modalOpen,   setModalOpen]      = useState(false);
  const [activeTab,   setActiveTab]      = useState('basic');
  const [txFilter,    setTxFilter]       = useState('all');
  const [formState,   setFormState]      = useState<Partial<User>>({});
  const [newRefInput, setNewRefInput]    = useState('');
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const toastTimer  = useRef<ReturnType<typeof setTimeout>|null>(null);

  const [loading, setLoading] = useState(true);

  /* ── Fetch Users ── */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('profiles').select('*', { count: 'exact' });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    
    if (searchQ.trim()) {
      query = query.or(`first_name.ilike.%${searchQ}%,last_name.ilike.%${searchQ}%,username.ilike.%${searchQ}%`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE - 1);

    if (error) {
      console.error(error);
      showToast('✕ Error fetching users', 'err');
    } else if (data) {
      setUsers(data.map(u => ({
        uid: u.id,
        name: `${u.first_name} ${u.last_name}`,
        username: u.username,
        email: u.username + '@email.com',
        phone: u.phone_number || '—',
        country: u.country || '—',
        balance: Number(u.balance),
        invested: Number(u.invested_total),
        withdrawn: Number(u.withdrawable_total),
        pnl: Number(u.profits_total),
        refCount: 0,
        refCode: u.referral_code,
        refUsers: [],
        refEarn: 0,
        status: u.status || 'Active',
        joined: u.created_at,
        seasonsJoined: [],
        deposits: [],
        withdrawals: [],
        referredBy: u.referred_by
      })));
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [supabase, searchQ, statusFilter, currentPage]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /* ── Toast ── */
  const showToast = useCallback((msg: string, cls = '') => {
    setToastMsg(msg); setToastType(cls); setToastShow(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastShow(false), 3200);
  }, []);

  /* ── Scroll reveal ── */
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); }),
      { threshold: 0.05 }
    );
    document.querySelectorAll<HTMLElement>('.adm-reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [users]);

  /* ── Body scroll lock ── */
  useEffect(() => {
    document.body.style.overflow = (sidebarOpen || modalOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen, modalOpen]);

  /* ── BG canvas ── */
  useEffect(() => {
    const cv = bgCanvasRef.current; if (!cv) return;
    const ctx = cv.getContext('2d')!;
    let W=0,H=0,candles:any[]=[],waves:any[]=[],t=0,rafId=0;
    const resize=()=>{ W=cv.width=innerWidth; H=cv.height=innerHeight; buildC(); buildW(); };
    function buildC(){candles=[];const cols=Math.floor(W/28);for(let i=0;i<cols;i++){candles.push({x:i*28+14,open:H*.35+(Math.random()-.5)*H*.28,close:H*.35+(Math.random()-.5)*H*.28,high:0,low:0,speed:.003+Math.random()*.004,phase:Math.random()*Math.PI*2});}candles.forEach(c=>{c.high=Math.min(c.open,c.close)-Math.random()*H*.04;c.low=Math.max(c.open,c.close)+Math.random()*H*.04;});}
    function buildW(){waves=Array.from({length:3},(_,i)=>({amplitude:40+i*20,freq:.005+i*.002,speed:.0008+i*.0004,phase:i*Math.PI/1.5,yBase:H*(.3+i*.2)}));}
    function draw(){ctx.clearRect(0,0,W,H);t+=.012;candles.forEach(c=>{const dy=Math.sin(t*c.speed*100+c.phase)*H*.015,o=c.open+dy,cl=c.close-dy,bull=cl<o,col=bull?'rgba(74,103,65,1)':'rgba(155,58,58,1)',bH=Math.abs(o-cl)||2,bY=Math.min(o,cl);ctx.strokeStyle=col;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(c.x,c.high+dy);ctx.lineTo(c.x,bY);ctx.moveTo(c.x,bY+bH);ctx.lineTo(c.x,c.low+dy);ctx.stroke();ctx.fillStyle=col;ctx.fillRect(c.x-5,bY,10,bH||2);});waves.forEach((w:any,wi:number)=>{ctx.beginPath();ctx.strokeStyle=`rgba(184,147,90,${.4-wi*.08})`;ctx.lineWidth=1.2-wi*.2;for(let x=0;x<=W;x+=4){const y=w.yBase+Math.sin(x*w.freq+t*w.speed*100+w.phase)*w.amplitude;x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();});rafId=requestAnimationFrame(draw);}
    window.addEventListener('resize',resize);resize();draw();
    return ()=>{ cancelAnimationFrame(rafId); window.removeEventListener('resize',resize); };
  }, []);

  /* ── Open modal ── */
  const openModal = async (u: User) => {
    setLoading(true);
    const { data: deposits } = await supabase.from('deposits').select('*').eq('user_id', u.uid);
    const { data: withdrawals } = await supabase.from('withdrawals').select('*').eq('user_id', u.uid);
    const { data: investments } = await supabase.from('investments').select('*, seasons(name)').eq('user_id', u.uid);
    const { data: referrals } = await supabase.from('profiles').select('username').eq('referred_by', u.uid);

    const fullUser = {
      ...u,
      deposits: deposits?.map(d => ({ id: d.id, type: 'deposit', amount: Number(d.amount), status: d.status, date: d.created_at, wallet: d.tx_hash, network: d.network, userId: d.user_id })) || [],
      withdrawals: withdrawals?.map(w => ({ id: w.id, type: 'withdrawal', amount: Number(w.amount), status: w.status, date: w.created_at, wallet: w.address, network: w.network, userId: w.user_id })) || [],
      seasonsJoined: investments?.map((i: any) => ({ season: i.seasons?.name || 'Unknown', amount: Number(i.amount), roi: 0, profit: 0 })) || [],
      refUsers: referrals?.map(r => r.username) || [],
      refCount: referrals?.length || 0
    } as User;

    setActiveUser(fullUser);
    setFormState(fullUser);
    setActiveTab('basic');
    setTxFilter('all');
    setNewRefInput('');
    setModalOpen(true);
    setLoading(false);
  };
  const closeModal = () => { setModalOpen(false); setActiveUser(null); };

  /* ── Save ── */
  const saveUser = async () => {
    if (!activeUser || !formState) return;
    
    const [firstName, ...lastNameParts] = (formState.name || '').split(' ');
    const lastName = lastNameParts.join(' ');

    const { error } = await supabase.from('profiles').update({
      first_name: firstName,
      last_name: lastName,
      username: formState.username,
      phone_number: formState.phone,
      country: formState.country,
      balance: formState.balance,
      invested_total: formState.invested,
      profits_total: formState.pnl,
      status: formState.status,
      created_at: formState.joined
    }).eq('id', activeUser.uid);

    if (error) {
      showToast('✕ Error saving changes', 'err');
    } else {
      const updated = { ...activeUser, ...formState } as User;
      setUsers(prev => prev.map(u => u.uid === updated.uid ? updated : u));
      setActiveUser(updated);
      showToast('✓ Changes saved for ' + updated.name, 'ok');
    }
  };

  /* ── Toggle suspend ── */
  const toggleSuspend = async () => {
    if (!activeUser) return;
    const wasSusp = activeUser.status === 'Suspended';
    const newStatus = wasSusp ? 'Active' : 'Suspended';
    
    const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', activeUser.uid);
    
    if (error) {
      showToast('✕ Error updating status', 'err');
    } else {
      const updated = { ...activeUser, status: newStatus };
      setActiveUser(updated);
      setFormState(f => ({ ...f, status: newStatus }));
      setUsers(prev => prev.map(u => u.uid === updated.uid ? updated : u));
      showToast(wasSusp ? `✓ ${updated.name} reactivated` : `⚠ ${updated.name} suspended`, wasSusp ? 'ok' : 'err');
    }
  };

  /* ── Ref user helpers ── */
  const removeRefUser = async (idx: number) => {
    if (!activeUser) return;
    const usernameToRemove = activeUser.refUsers[idx];
    const { error } = await supabase.from('profiles').update({ referred_by: null }).eq('username', usernameToRemove);
    
    if (error) {
      showToast('✕ Error removing referral', 'err');
    } else {
      const newRefs = activeUser.refUsers.filter((_,i) => i !== idx);
      const u2 = { ...activeUser, refUsers: newRefs, refCount: newRefs.length };
      setActiveUser(u2); setFormState(f => ({ ...f, refUsers: newRefs, refCount: newRefs.length }));
    }
  };
  const addRefUser = async () => {
    if (!activeUser || !newRefInput.trim()) { showToast('⚠ Enter a username','err'); return; }
    const val = newRefInput.trim().replace('@','');
    if (activeUser.refUsers.includes(val)) { showToast('⚠ Already in list','err'); return; }
    
    const { data: refUser } = await supabase.from('profiles').select('id').eq('username', val).single();
    if (!refUser) { showToast('⚠ User not found', 'err'); return; }

    const { error } = await supabase.from('profiles').update({ referred_by: activeUser.uid }).eq('id', refUser.id);
    
    if (error) {
      showToast('✕ Error adding referral', 'err');
    } else {
      const newRefs = [...activeUser.refUsers, val];
      const u2 = { ...activeUser, refUsers: newRefs, refCount: newRefs.length };
      setActiveUser(u2); setFormState(f => ({ ...f, refUsers: newRefs, refCount: newRefs.length }));
      setNewRefInput('');
    }
  };

  /* ── TX list ── */
  const txList = activeUser
    ? [...activeUser.deposits, ...activeUser.withdrawals]
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .filter(t => txFilter==='all' || t.type===txFilter)
    : [];

  /* ── Export CSV ── */
  const exportCSV = () => {
    const headers=['UID','Name','Username','Email','Phone','Country','Balance','Invested','PnL','Withdrawn','Referrals','Status','Joined'];
    const rows=users.map(u=>[u.uid,u.name,u.username,u.email,u.phone,u.country,u.balance.toFixed(2),u.invested.toFixed(2),u.pnl.toFixed(2),u.withdrawn.toFixed(2),u.refCount,u.status,u.joined]);
    const csv=[headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download='users.csv'; a.click();
    showToast('✓ CSV exported','ok');
  };

  const txStatusMap: Record<string,string> = { Completed:'adm-b-completed', Approved:'adm-b-approved', Pending:'adm-b-pending', Rejected:'adm-b-rejected' };

  /* ── Balance overview cards ── */
  const balOv = activeUser ? [
    ['Current Balance',  fmtU(activeUser.balance),  'var(--ink)'],
    ['Total Invested',   fmtU(activeUser.invested),  'var(--charcoal)'],
    ['Profit / Loss',    (activeUser.pnl>=0?'+':'')+fmtU(Math.abs(activeUser.pnl)), activeUser.pnl>=0?'var(--sage)':'var(--error)'],
    ['Total Withdrawn',  fmtU(activeUser.withdrawn), '#9b3a3a'],
  ] : [];

  const totalProfit = activeUser?.seasonsJoined.reduce((s,x) => s+x.profit, 0) ?? 0;
  const actSummary = activeUser ? [
    ['Seasons Joined',    String(activeUser.seasonsJoined.length), 'var(--ink)'],
    ['Total Profit/Loss', (totalProfit>=0?'+':'')+fmtU(Math.abs(totalProfit)), totalProfit>=0?'var(--sage)':'var(--error)'],
    ['Total Deposits',    String(activeUser.deposits.length),    'var(--charcoal)'],
    ['Total Withdrawals', String(activeUser.withdrawals.length), '#9b3a3a'],
  ] : [];

  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE));

  return (
    <>
      <canvas ref={bgCanvasRef} style={{ position:'fixed', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:0, opacity:.04 }} />
      <div className={`adm-toast${toastShow?' show':''}${toastType?' '+toastType:''}`}>{toastMsg}</div>
      <div className={`adm-sb-overlay${sidebarOpen?' show':''}`} onClick={() => setSidebarOpen(false)} />

      {/* ── USER MODAL ── */}
      <div className={`adm-modal-overlay${modalOpen?' open':''}`} onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
        <div className="adm-modal-panel">
          <div className="adm-modal-header">
            <div>
              <div className="adm-modal-title">{activeUser?.name || 'User Details'}</div>
              <div style={{ fontSize:'.67rem', color:'var(--text-sec)', marginTop:2 }}>{activeUser?.uid} · @{activeUser?.username}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {activeUser && <StatusBadge s={activeUser.status} />}
              <button className="adm-modal-close" onClick={closeModal}>
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="adm-tab-bar">
            {['basic','balance','referral','activity','transactions'].map(t => (
              <button key={t} className={`adm-tab-btn${activeTab===t?' active':''}`} onClick={() => setActiveTab(t)}>
                {t === 'basic' ? 'Basic Info' : t === 'balance' ? 'Balance & Investment' : t.charAt(0).toUpperCase()+t.slice(1)}
              </button>
            ))}
          </div>

          <div className="adm-modal-body">

            {/* ── BASIC INFO ── */}
            {activeTab === 'basic' && (
              <div className="adm-tab-pane active">
                <div className="adm-section-heading">Basic Information <span className="adm-section-heading-badge">Editable</span></div>
                <div className="adm-form-grid-2">
                  {[['Full Name','f-name','text','name'],['Username','f-username','text','username'],['Email Address','f-email','email','email'],['Phone Number','f-phone','text','phone'],['Country','f-country','text','country']].map(([lbl,id,type,key]) => (
                    <div key={id} className="adm-form-group">
                      <label className="adm-form-label">{lbl}</label>
                      <input className="adm-form-input" type={type} value={(formState as any)[key] ?? ''} onChange={e => setFormState(f => ({ ...f, [key]: e.target.value }))} />
                    </div>
                  ))}
                  <div className="adm-form-group">
                    <label className="adm-form-label">Account Status</label>
                    <select className="adm-form-input" value={formState.status ?? 'Active'} onChange={e => setFormState(f => ({ ...f, status: e.target.value }))}
                      style={{ appearance:'none', backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='6 9 12 15 18 9' stroke='%236b6459' stroke-width='1.8' fill='none'/%3E%3C/svg%3E\")", backgroundRepeat:'no-repeat', backgroundPosition:'right 10px center', backgroundSize:'16px', paddingRight:32, cursor:'pointer' }}>
                      <option>Active</option><option>Suspended</option><option>Pending</option>
                    </select>
                  </div>
                </div>
                <div className="adm-form-group">
                  <label className="adm-form-label">Joined Date</label>
                  <input className="adm-form-input" type="date" value={formState.joined?.split('T')[0] ?? ''} style={{ maxWidth:220 }} onChange={e => setFormState(f => ({ ...f, joined: e.target.value }))} />
                </div>
                <div style={{ padding:14, background:'rgba(184,147,90,.04)', border:'1px solid var(--border)', borderRadius:'var(--radius)', marginTop:4 }}>
                  <div style={{ fontSize:'.6rem', letterSpacing:'.12em', textTransform:'uppercase', color:'var(--text-sec)', marginBottom:4 }}>User ID</div>
                  <div style={{ fontFamily:'monospace', fontSize:'.82rem', color:'var(--ink)' }}>{activeUser?.uid || '—'}</div>
                </div>
              </div>
            )}

            {/* ── BALANCE ── */}
            {activeTab === 'balance' && (
              <div className="adm-tab-pane active">
                <div className="adm-section-heading">Balance &amp; Investment <span className="adm-section-heading-badge">Editable</span></div>
                <div className="adm-form-grid-2">
                  {[['Current Balance (USDT)','balance'],['Total Invested (USDT)','invested'],['Total Profit / Loss (USDT)','pnl'],['Total Withdrawn (USDT)','withdrawn']].map(([lbl,key]) => (
                    <div key={key} className="adm-form-group">
                      <label className="adm-form-label">{lbl}</label>
                      <input className="adm-form-input" type="number" step="0.01" value={(formState as any)[key] ?? 0} onChange={e => setFormState(f => ({ ...f, [key]: parseFloat(e.target.value) }))} />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:8, display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
                  {balOv.map(([lbl,val,col]) => (
                    <div key={lbl} style={{ padding:'12px 14px', background:'var(--cream)', border:'1px solid var(--border)', borderRadius:'var(--radius)' }}>
                      <div style={{ fontSize:'.58rem', letterSpacing:'.12em', textTransform:'uppercase', color:'var(--text-sec)' }}>{lbl}</div>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', color:col, marginTop:3 }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── REFERRAL ── */}
            {activeTab === 'referral' && (
              <div className="adm-tab-pane active">
                <div className="adm-section-heading">Referral Details <span className="adm-section-heading-badge">Editable</span></div>
                <div className="adm-form-grid-2" style={{ marginBottom:20 }}>
                  <div className="adm-form-group">
                    <label className="adm-form-label">Referral Count</label>
                    <input className="adm-form-input" type="number" value={activeUser?.refCount ?? 0} readOnly style={{ background:'var(--parchment)', opacity:.8 }} />
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-form-label">Referral Code</label>
                    <input className="adm-form-input" type="text" value={formState.refCode ?? ''} onChange={e => setFormState(f => ({ ...f, refCode: e.target.value }))} />
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-form-label">Referred By (UID)</label>
                    <input className="adm-form-input" type="text" placeholder="— none —" value={formState.referredBy ?? ''} onChange={e => setFormState(f => ({ ...f, referredBy: e.target.value || null }))} />
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-form-label">Total Referral Earnings (USDT)</label>
                    <input className="adm-form-input" type="number" step="0.01" value={formState.refEarn ?? 0} onChange={e => setFormState(f => ({ ...f, refEarn: parseFloat(e.target.value) }))} />
                  </div>
                </div>
                <div className="adm-section-heading" style={{ marginTop:0 }}>
                  Referred Users
                  <span style={{ background:'rgba(184,147,90,.1)', color:'var(--gold-d)', border:'1px solid var(--border)', borderRadius:100, padding:'2px 8px', fontSize:'.6rem', letterSpacing:'.1em' }}>
                    {activeUser?.refUsers.length ?? 0}
                  </span>
                </div>
                <div style={{ marginBottom:12 }}>
                  {(activeUser?.refUsers.length ?? 0) === 0
                    ? <div style={{ fontSize:'.75rem', color:'var(--text-sec)', padding:'4px 0' }}>No referred users yet.</div>
                    : activeUser?.refUsers.map((ru, i) => (
                      <span key={i} className="adm-ref-tag">
                        @{ru}
                        <button onClick={() => removeRefUser(i)} title="Remove">✕</button>
                      </span>
                    ))
                  }
                </div>
                <div className="adm-ref-input-row">
                  <input className="adm-form-input" type="text" placeholder="Add username…" style={{ flex:1 }}
                    value={newRefInput} onChange={e => setNewRefInput(e.target.value)}
                    onKeyDown={e => e.key==='Enter' && addRefUser()} />
                  <button className="adm-btn-ghost adm-btn-sm" onClick={addRefUser}>+ Add</button>
                </div>
              </div>
            )}

            {/* ── ACTIVITY ── */}
            {activeTab === 'activity' && (
              <div className="adm-tab-pane active">
                <div className="adm-section-heading">Seasons Joined</div>
                {(activeUser?.seasonsJoined.length ?? 0) === 0
                  ? <div style={{ fontSize:'.78rem', color:'var(--text-sec)', padding:'12px 0' }}>No seasons joined yet.</div>
                  : activeUser?.seasonsJoined.map((s,i) => (
                    <div key={i} className="adm-season-row">
                      <div>
                        <div style={{ fontSize:'.82rem', fontWeight:500, color:'var(--ink)' }}>{s.season}</div>
                        <div style={{ fontSize:'.65rem', color:'var(--text-sec)' }}>Invested: {fmtU(s.amount)}</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1rem', color:s.roi>=0?'var(--sage)':'var(--error)' }}>{s.roi>=0?'+':''}{s.roi}%</div>
                        <div style={{ fontSize:'.65rem', color:'var(--text-sec)' }}>{s.profit>=0?'+':''}{fmtU(Math.abs(s.profit))}</div>
                      </div>
                    </div>
                  ))
                }
                <div className="adm-divider" style={{ margin:'20px 0' }}/>
                <div className="adm-section-heading">Activity Summary</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
                  {actSummary.map(([lbl,val,col]) => (
                    <div key={lbl} style={{ padding:'12px 14px', background:'var(--cream)', border:'1px solid var(--border)', borderRadius:'var(--radius)' }}>
                      <div style={{ fontSize:'.58rem', letterSpacing:'.12em', textTransform:'uppercase', color:'var(--text-sec)' }}>{lbl}</div>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', color:col, marginTop:3 }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TRANSACTIONS ── */}
            {activeTab === 'transactions' && (
              <div className="adm-tab-pane active">
                <div style={{ display:'flex', gap:0, border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden', width:'fit-content', marginBottom:20 }}>
                  {[['all','All'],['deposit','Deposits'],['withdrawal','Withdrawals']].map(([val,lbl]) => (
                    <button key={val} className={`adm-tab-btn${txFilter===val?' active':''}`}
                      style={{ border:'none', borderRight:val!=='withdrawal'?'1px solid var(--border)':'none', borderRadius:0, margin:0, padding:'8px 16px' }}
                      onClick={() => setTxFilter(val)}>{lbl}</button>
                  ))}
                </div>
                {txList.length === 0
                  ? <div style={{ fontSize:'.78rem', color:'var(--text-sec)', padding:'12px 0' }}>No transactions found.</div>
                  : txList.map((t,i) => (
                    <div key={i} className="adm-tx-row">
                      <span className={`adm-badge ${t.type==='deposit'?'adm-b-deposit':'adm-b-withdraw'}`}>{t.type==='deposit'?'↓ Dep':'↑ Wd'}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'.95rem', color:'var(--ink)' }}>{fmtU(t.amount)} <span style={{ fontSize:'.65rem', color:'var(--text-sec)' }}>{t.network}</span></div>
                        <div style={{ fontSize:'.62rem', color:'var(--text-sec)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:200 }}>{t.id}</div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <span className={`adm-badge ${txStatusMap[t.status]||''}`}>{t.status}</span>
                        <div style={{ fontSize:'.62rem', color:'var(--text-sec)', marginTop:3 }}>{fmtDT(t.date)}</div>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

          </div>{/* /modal-body */}

          <div className="adm-modal-footer">
            <button
              className={activeUser?.status==='Suspended' ? 'adm-btn-sage adm-btn-sm' : 'adm-btn-danger adm-btn-sm'}
              onClick={toggleSuspend}>
              {activeUser?.status==='Suspended' ? 'Reactivate User' : 'Suspend User'}
            </button>
            <div style={{ flex:1 }}/>
            <button className="adm-btn-ghost" onClick={closeModal}>Cancel</button>
            <button className="adm-btn-primary" onClick={saveUser}>Save Changes</button>
          </div>
        </div>
      </div>

      {/* ── PAGE ── */}
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
            <div className="adm-header-right">
              <div className="adm-notif-btn" onClick={() => showToast('3 new notifications')}>
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

          {/* Content */}
          <div className="adm-page-wrapper">

            {/* Title */}
            <div className="adm-reveal" style={{ marginBottom:24, display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:14 }}>
              <div>
                <span className="adm-sec-label">Admin · SeasonRise Platform</span>
                <h1 className="adm-sec-title">User Management</h1>
                <p className="adm-sec-sub"><span className="adm-live-dot"/>{totalCount} registered users</p>
              </div>
              <div style={{ display:'flex', gap:8, alignSelf:'flex-end', flexWrap:'wrap' }}>
                <button className="adm-btn-ghost" onClick={exportCSV}>↓ Export CSV</button>
                <button className="adm-btn-primary" onClick={() => showToast('Create user — coming soon')}>+ Add User</button>
              </div>
            </div>

            {/* Filter bar */}
            <div className="adm-reveal adm-card" style={{ marginBottom:18 }}>
              <div style={{ padding:'14px 18px', display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                  <div className="adm-search-wrap-full" style={{ flex:1, minWidth:180 }}>
                    <div className="adm-search-icon" style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
                      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    </div>
                    <input className="adm-form-input" type="text" placeholder="Search by name, username, or email…" style={{ paddingLeft:34 }}
                      value={searchQ} onChange={e => { setSearchQ(e.target.value); setCurrentPage(1); }} />
                  </div>
                  <span style={{ fontSize:'.7rem', color:'var(--text-sec)', whiteSpace:'nowrap', flexShrink:0 }}>{totalCount} total users</span>
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
                  {[['all','All'],['Active','Active'],['Suspended','Suspended'],['Pending','Pending']].map(([val,lbl]) => (
                    <button key={val} className={`adm-filter-pill${statusFilter===val?' active':''}`}
                      onClick={() => { setStatusFilter(val); setCurrentPage(1); }}>{lbl}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="adm-reveal adm-card" style={{ overflow:'hidden' }}>
              <div className="adm-tbl-wrap">
                <table className="adm-dtbl" style={{ minWidth:860 }}>
                  <thead>
                    <tr>
                      <th>User</th><th>User ID</th><th>Username</th><th>Phone</th>
                      <th>Balance (USDT)</th><th>Total Invested</th><th>Joined</th><th>Status</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={9} style={{ textAlign:'center', padding:44 }}>Loading users...</td></tr>
                    ) : users.length === 0 ? (
                      <tr><td colSpan={9} style={{ textAlign:'center', padding:44, color:'var(--text-sec)', fontSize:'.8rem' }}>🔍 No users match your search.</td></tr>
                    ) : users.map((u,i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div className="adm-user-avi">{initials(u.name)}</div>
                            <div>
                              <div style={{ fontWeight:500, fontSize:'.82rem', color:'var(--ink)' }}>{u.name}</div>
                              <div style={{ fontSize:'.62rem', color:'var(--text-sec)' }}>{u.country}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontFamily:'monospace', fontSize:'.72rem', color:'var(--text-sec)' }}>{u.uid.slice(0,8)}...</td>
                        <td style={{ fontSize:'.78rem', color:'var(--charcoal)' }}>@{u.username}</td>
                        <td style={{ fontSize:'.75rem', color:'var(--text-sec)' }}>{u.phone}</td>
                        <td><div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1rem', color:'var(--ink)' }}>{fmtU(u.balance)}</div></td>
                        <td style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'.95rem', color:'var(--text-sec)' }}>{fmtU(u.invested)}</td>
                        <td style={{ fontSize:'.72rem', color:'var(--text-sec)', whiteSpace:'nowrap' }}>{fmtDate(u.joined)}</td>
                        <td><StatusBadge s={u.status} /></td>
                        <td><button className="adm-btn-gold adm-btn-sm" onClick={() => openModal(u)}>View</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{ padding:'14px 20px', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
                <span style={{ fontSize:'.7rem', color:'var(--text-sec)' }}>Page {currentPage} of {totalPages}</span>
                <div style={{ display:'flex', gap:6 }}>
                  <button className="adm-page-btn" onClick={() => setCurrentPage(p => Math.max(1,p-1))}>‹</button>
                  {Array.from({length:Math.min(5, totalPages)},(_,i)=> {
                    const pageNum = currentPage > 3 ? currentPage - 2 + i : i + 1;
                    if (pageNum > totalPages) return null;
                    return (
                      <button key={pageNum} className={`adm-page-btn${currentPage===pageNum?' active':''}`} onClick={() => setCurrentPage(pageNum)}>{pageNum}</button>
                    );
                  })}
                  <button className="adm-page-btn" onClick={() => setCurrentPage(p => Math.min(totalPages,p+1))}>›</button>
                </div>
              </div>
            </div>

          </div>{/* /page-wrapper */}
        </div>
      </div>
    </>
  );
}


