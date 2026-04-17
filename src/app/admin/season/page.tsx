'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import AdminSidebar from '../AdminSidebar';
import VaultXLoader from '@/components/VaultXLoader';
import { createClient } from '@/utils/supabase/client';

/* ══════════════════════════════
   TYPES
══════════════════════════════ */
interface AutoClose { finalROI: number }
interface ActiveSeason {
  id: string; name: string; entryDate: string; finishDate: string;
  roi: string; pool: number; min: number; max: number;
  status: 'upcoming' | 'open' | 'running' | 'closed' | 'paused'; poolFilled: number; investors: number;
  dayStart: string; autoClose: AutoClose | null;
}
interface PrevSeason {
  id: string; name: string; entryDate: string; finishDate: string;
  roi: string; finalROI: number; pool: number; min: number; max: number;
}

/* ══════════════════════════════
   HELPERS
══════════════════════════════ */
function fmt(n: number) { return Number(n).toLocaleString('en-US') }
function fmtUSDT(n: number) {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return '$' + (n / 1_000).toFixed(0) + 'K';
  return '$' + fmt(n);
}
function fmtDate(d: string) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return d;
  }
}
function calcRunningDays(start: string, end: string) {
  if (!start || !end) return 0;
  const s = new Date(start), e = new Date(end);
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
}
function calcDaysCurrent(dayStart: string) {
  if (!dayStart) return 0;
  const s = new Date(dayStart), now = new Date();
  return Math.max(0, Math.round((now.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
}
function getRunStart(entryDate: string) {
  const d = new Date(entryDate);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}
function calcPeriodStr(entryDate: string, finishDate: string) {
  if (!entryDate || !finishDate) return '— Select dates above —';
  const ed = new Date(entryDate), fd = new Date(finishDate);
  if (fd <= ed) return '⚠ Finish date must be after entry date';
  const rs = new Date(ed); rs.setDate(rs.getDate() + 1);
  const days = calcRunningDays(rs.toISOString().split('T')[0], finishDate);
  return `${fmtDate(rs.toISOString().split('T')[0])} → ${fmtDate(finishDate)} (${days} days)`;
}
function countdownText(finishDate: string) {
  const target = new Date(finishDate);
  target.setHours(23, 59, 59, 999);
  const msLeft = target.getTime() - Date.now();
  if (msLeft <= 0) return 'Closing now…';
  const dLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
  const hLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return dLeft > 0
    ? `Closes in ${dLeft}d ${hLeft}h on ${fmtDate(finishDate)} at 23:59:59`
    : `Closes in ${hLeft}h on ${fmtDate(finishDate)} at 23:59:59`;
}

/* ══════════════════════════════
   COMPONENT
══════════════════════════════ */
export default function AdminSeasonPage() {
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast]             = useState({ msg: '', cls: '', show: false });
  const [active, setActive]           = useState<ActiveSeason[]>([]);
  const [prev,   setPrev]             = useState<PrevSeason[]>([]);
  const autoCloseTimers               = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const bgRef                         = useRef<HTMLCanvasElement>(null);
  const toastTimer                    = useRef<ReturnType<typeof setTimeout>>();

  // Season Modal state
  const [smOpen, setSmOpen]     = useState(false);
  const [smEditId, setSmEditId] = useState('');
  const [smTitle, setSmTitle]   = useState('Create New Season');
  const [smSub, setSmSub]       = useState('Fill in the details to launch a new season');
  const [smBtnTxt, setSmBtnTxt] = useState('Start Season');
  const [fName, setFName]       = useState('');
  const [fEntry, setFEntry]     = useState('');
  const [fFinish, setFFinish]   = useState('');
  const [fRoi, setFRoi]         = useState('');
  const [fPool, setFPool]       = useState('');
  const [fMin, setFMin]         = useState('');
  const [fMax, setFMax]         = useState('');

  // Close Modal state
  const [cmOpen, setCmOpen]       = useState(false);
  const [cmId, setCmId]           = useState('');
  const [cmName, setCmName]       = useState('');
  const [cmDates, setCmDates]     = useState('');
  const [cmRoi, setCmRoi]         = useState('');
  const [cmAuto, setCmAuto]       = useState(false);
  const [cmActiveRoi, setCmActiveRoi] = useState<number | null>(null);

  // Date Modal state
  const [dmOpen, setDmOpen]       = useState(false);
  const [dmId, setDmId]           = useState('');
  const [dmSub, setDmSub]         = useState('');
  const [dmDate, setDmDate]       = useState('');

  const [loading, setLoading] = useState(true);

  const [aggStats, setAggStats] = useState({
    avgROI: '+0%',
    totalPool: '$0'
  });

  /* ── Fetch Data ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: seasons, error } = await supabase.from('seasons').select('*').order('created_at', { ascending: false });
    
    if (error) {
      showToast('✕ Error fetching seasons', 'err');
    } else if (seasons) {
      const activeArr: ActiveSeason[] = [];
      const prevArr: PrevSeason[] = [];
      let totalPoolAll = 0;
      let totalROI = 0;
      let closedCount = 0;

      seasons.forEach(s => {
        totalPoolAll += Number(s.current_pool || 0);
        if (s.status === 'closed') {
          closedCount++;
          totalROI += Number(s.final_roi || 0);
          prevArr.push({
            id: s.id,
            name: s.name,
            entryDate: s.start_date || '',
            finishDate: s.end_date || '',
            roi: s.roi_range || '',
            finalROI: Number(s.final_roi) || 0,
            pool: Number(s.pool_cap) || 0,
            min: Number(s.min_entry) || 0,
            max: 50000 
          });
        } else {
          activeArr.push({
            id: s.id,
            name: s.name,
            entryDate: s.start_date || '',
            finishDate: s.end_date || '',
            roi: s.roi_range || '',
            pool: Number(s.pool_cap) || 0,
            min: Number(s.min_entry) || 0,
            max: 50000,
            status: s.status as any,
            poolFilled: (Number(s.current_pool) / Number(s.pool_cap)) * 100 || 0,
            investors: 0,
            dayStart: s.start_date || '',
            autoClose: null
          });
        }
      });

      setActive(activeArr);
      setPrev(prevArr);
      setAggStats({
        avgROI: `${(closedCount > 0 ? (totalROI / closedCount) : 0).toFixed(1)}%`,
        totalPool: fmtUSDT(totalPoolAll)
      });
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Toast ── */
  const showToast = useCallback((msg: string, cls = '') => {
    setToast({ msg, cls, show: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 3200);
  }, []);

  /* ── Scroll reveal ── */
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); }),
      { threshold: 0.05 }
    );
    document.querySelectorAll<HTMLElement>('.sm-reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [active, prev]);

  /* ── Pool bar animation ── */
  useEffect(() => {
    const t = setTimeout(() => {
      document.querySelectorAll<HTMLElement>('.sm-pool-fill').forEach(el => {
        const w = el.style.width; el.style.width = '0%';
        setTimeout(() => { el.style.width = w; }, 60);
      });
    }, 100);
    return () => clearTimeout(t);
  }, [active]);

  /* ── BG canvas ── */
  useEffect(() => {
    const cv = bgRef.current; if (!cv) return;
    const ctx = cv.getContext('2d')!;
    let W = 0, H = 0, candles: any[] = [], waves: any[] = [], t = 0, rafId = 0;
    const resize = () => {
      W = cv.width = window.innerWidth; H = cv.height = window.innerHeight;
      const cols = Math.floor(W / 28); candles = [];
      for (let i = 0; i < cols; i++) {
        candles.push({ x: i*28+14, open: H*.35+(Math.random()-.5)*H*.28, close: H*.35+(Math.random()-.5)*H*.28, high:0, low:0, speed:.003+Math.random()*.004, phase:Math.random()*Math.PI*2 });
      }
      candles.forEach(c => { c.high = Math.min(c.open,c.close)-Math.random()*H*.04; c.low = Math.max(c.open,c.close)+Math.random()*H*.04; });
      waves = Array.from({length:3},(_,i) => ({ amplitude:40+i*20, freq:.005+i*.002, speed:.0008+i*.0004, phase:i*Math.PI/1.5, yBase:H*(.3+i*.2) }));
    };
    const draw = () => {
      ctx.clearRect(0,0,W,H); t += .012;
      candles.forEach((c: any) => {
        const dy=Math.sin(t*c.speed*100+c.phase)*H*.015, o=c.open+dy, cl=c.close-dy;
        const bull=cl<o, col=bull?'rgba(74,103,65,1)':'rgba(155,58,58,1)', bH=Math.abs(o-cl)||2, bY=Math.min(o,cl);
        ctx.strokeStyle=col; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(c.x,c.high+dy); ctx.lineTo(c.x,bY); ctx.moveTo(c.x,bY+bH); ctx.lineTo(c.x,c.low+dy); ctx.stroke();
        ctx.fillStyle=col; ctx.fillRect(c.x-5,bY,10,bH||2);
      });
      waves.forEach((w: any, wi: number) => {
        ctx.beginPath(); ctx.strokeStyle=`rgba(184,147,90,${.4-wi*.08})`; ctx.lineWidth=1.2-wi*.2;
        for (let x=0; x<=W; x+=4) { const y=w.yBase+Math.sin(x*w.freq+t*w.speed*100+w.phase)*w.amplitude; x===0?ctx.moveTo(x,y):ctx.lineTo(x,y); }
        ctx.stroke();
      });
      rafId = requestAnimationFrame(draw);
    };
    window.addEventListener('resize', resize); resize(); draw();
    return () => { cancelAnimationFrame(rafId); window.removeEventListener('resize', resize); };
  }, []);

  /* ── Body lock ── */
  useEffect(() => {
    document.body.style.overflow = (sidebarOpen || smOpen || cmOpen || dmOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen, smOpen, cmOpen, dmOpen]);

  /* ── Auto-close scheduling ── */
  const cancelAutoClose = useCallback((id: string) => {
    if (autoCloseTimers.current[id]) { clearTimeout(autoCloseTimers.current[id]); delete autoCloseTimers.current[id]; }
  }, []);

  const executeAutoClose = useCallback(async (id: string) => {
    const s = active.find(x => x.id === id);
    if (!s || !s.autoClose) return;
    const roi = s.autoClose.finalROI;
    
    const { error } = await supabase.from('seasons').update({ status: 'closed', final_roi: roi }).eq('id', id);
    if (error) { showToast('✕ Auto-close failed', 'err'); return; }

    showToast(`⏰ ${s.name} auto-closed with +${roi}% ROI`, 'ok');
    fetchData();
    cancelAutoClose(id);
  }, [active, cancelAutoClose, fetchData, showToast, supabase]);

  const scheduleAutoClose = useCallback((s: ActiveSeason) => {
    cancelAutoClose(s.id);
    const target = new Date(s.finishDate);
    target.setHours(23, 59, 59, 999);
    const msUntil = target.getTime() - Date.now();
    if (msUntil <= 0) { executeAutoClose(s.id); return; }
    autoCloseTimers.current[s.id] = setTimeout(() => executeAutoClose(s.id), msUntil);
  }, [cancelAutoClose, executeAutoClose]);

  /* ── Season modal open ── */
  const openSeasonModal = (editId?: string) => {
    setFName(''); setFEntry(''); setFFinish(''); setFRoi(''); setFPool(''); setFMin(''); setFMax('');
    setSmEditId(editId || '');
    if (editId) {
      const s = [...active].find(x => x.id === editId) || prev.find(x => x.id === editId);
      if (!s) return;
      setSmTitle(`Edit ${s.name}`); setSmSub('Update season details'); setSmBtnTxt('Save Changes');
      setFName(s.name); setFEntry(s.entryDate.split('T')[0]); setFFinish(s.finishDate.split('T')[0]); setFRoi(s.roi);
      setFPool(String(s.pool)); setFMin(String(s.min)); setFMax(String(s.max || 50000));
    } else {
      setSmTitle('Create New Season'); setSmSub('Fill in the details to launch a new season'); setSmBtnTxt('Start Season');
    }
    setSmOpen(true);
  };

  const submitSeasonModal = async () => {
    if (!fName.trim()) { showToast('⚠ Please enter season name', 'err'); return; }
    if (!fEntry || !fFinish) { showToast('⚠ Please set entry and finish dates', 'err'); return; }
    if (new Date(fFinish) <= new Date(fEntry)) { showToast('⚠ Finish date must be after entry date', 'err'); return; }
    if (!fRoi.trim()) { showToast('⚠ Please enter expected ROI range', 'err'); return; }
    const pool = parseFloat(fPool), mn = parseFloat(fMin), mx = parseFloat(fMax);
    if (isNaN(pool) || pool <= 0) { showToast('⚠ Please enter a valid pool size', 'err'); return; }
    if (isNaN(mn) || mn <= 0 || isNaN(mx) || mx <= 0) { showToast('⚠ Please set min / max entry amounts', 'err'); return; }
    if (mn >= mx) { showToast('⚠ Minimum entry must be less than maximum', 'err'); return; }

    const seasonData = {
      name: fName,
      start_date: fEntry,
      end_date: fFinish,
      roi_range: fRoi,
      pool_cap: pool,
      min_entry: mn,
      status: smEditId ? undefined : 'open'
    };

    if (smEditId) {
      const { error } = await supabase.from('seasons').update(seasonData).eq('id', smEditId);
      if (error) { showToast('✕ Error updating season', 'err'); return; }
      showToast(`✓ Season updated`, 'ok');
    } else {
      const { error } = await supabase.from('seasons').insert([seasonData]);
      if (error) { showToast('✕ Error launching season', 'err'); return; }
      showToast(`✓ Season launched`, 'ok');
    }
    
    setSmOpen(false);
    fetchData();
  };

  /* ── Pause / resume ── */
  const togglePause = async (id: string) => {
    const s = active.find(x => x.id === id); if (!s) return;
    const newStatus = s.status === 'running' ? 'paused' : 'running';
    
    const { error } = await supabase.from('seasons').update({ status: newStatus }).eq('id', id);
    if (error) { showToast('✕ Error updating status', 'err'); return; }

    showToast(newStatus === 'running' ? `▶ ${s.name} resumed` : `⏸ ${s.name} paused`, 'ok');
    fetchData();
  };

  /* ── Date modal ── */
  const openDateModal = (id: string) => {
    const s = active.find(x => x.id === id); if (!s) return;
    setDmId(id); setDmSub(`Change finish date for ${s.name}`); setDmDate(s.finishDate.split('T')[0]); setDmOpen(true);
  };
  const confirmDateChange = async () => {
    const s = active.find(x => x.id === dmId);
    if (!s || !dmDate) { showToast('⚠ Please select a date', 'err'); return; }
    if (new Date(dmDate) <= new Date(s.entryDate)) { showToast('⚠ Date must be after entry date', 'err'); return; }
    
    const { error } = await supabase.from('seasons').update({ end_date: dmDate }).eq('id', dmId);
    if (error) { showToast('✕ Error updating date', 'err'); return; }

    setDmOpen(false);
    showToast(`✓ ${s.name} finish date updated to ${fmtDate(dmDate)}`, 'ok');
    fetchData();
  };

  /* ── Close modal ── */
  const openCloseModal = (id: string) => {
    const s = active.find(x => x.id === id); if (!s) return;
    setCmId(id); setCmName(s.name);
    setCmDates(`${fmtDate(s.entryDate)} → ${fmtDate(s.finishDate)}`);
    setCmRoi(s.autoClose ? String(s.autoClose.finalROI) : '');
    setCmAuto(!!s.autoClose); setCmActiveRoi(s.autoClose?.finalROI ?? null);
    setCmOpen(true);
  };
  const confirmCloseSeason = async () => {
    const roi = parseFloat(cmRoi);
    if (isNaN(roi)) { showToast('⚠ Please enter a Final ROI', 'err'); return; }
    const s = active.find(x => x.id === cmId); if (!s) return;
    
    if (cmAuto) {
      const updated = { ...s, autoClose: { finalROI: roi } };
      setActive(a => a.map(x => x.id === cmId ? updated : x));
      scheduleAutoClose(updated);
      setCmOpen(false);
      showToast(`⏰ Auto-Close set for ${s.name} — closes on ${fmtDate(s.finishDate)} with +${roi}% ROI`, 'ok');
    } else {
      setLoading(true);

      // 1. Fetch all active investments for this season
      const { data: investments, error: invErr } = await supabase
        .from('investments')
        .select('*')
        .eq('season_id', cmId)
        .eq('status', 'active');
      
      if (invErr) { showToast('✕ Error fetching investments', 'err'); setLoading(false); return; }

      // 2. Process payouts: return principal + profit to each investor
      if (investments && investments.length > 0) {
        for (const inv of investments) {
          const principal = Number(inv.amount);
          const profit = principal * (roi / 100);
          const totalReturn = principal + profit;

          // Fetch investor profile (need referred_by for commission)
          const { data: profile } = await supabase
            .from('profiles')
            .select('balance, profits_total, invested_total, referred_by')
            .eq('id', inv.user_id)
            .single();
          
          if (profile) {
            const newBalance = Number(profile.balance) + totalReturn;
            const newProfitsTotal = Number(profile.profits_total) + profit;
            const newInvestedTotal = Math.max(0, Number(profile.invested_total) - principal);

            // Update investor balance — withdrawable_total = balance (no lock)
            await supabase.from('profiles').update({
              balance: newBalance,
              withdrawable_total: newBalance,
              profits_total: newProfitsTotal,
              invested_total: newInvestedTotal,
            }).eq('id', inv.user_id);

            // Mark investment as completed
            await supabase.from('investments').update({ status: 'completed' }).eq('id', inv.id);

            // 3. Referral commission: 7% of PROFIT to referrer (not 7% of investment amount)
            if (profile.referred_by && profit > 0) {
              const REFERRAL_RATE = 0.07;
              const commission = profit * REFERRAL_RATE;

              const { data: referrer } = await supabase
                .from('profiles')
                .select('balance, referral_earned')
                .eq('id', profile.referred_by)
                .single();

              if (referrer) {
                const newRefBalance = Number(referrer.balance) + commission;
                await supabase.from('profiles').update({
                  balance: newRefBalance,
                  withdrawable_total: newRefBalance,  // withdrawable = full balance
                  referral_earned: (Number(referrer.referral_earned) || 0) + commission,
                }).eq('id', profile.referred_by);
              }
            }
          }
        }
      }

      // 4. Close the season and set final ROI
      const { error } = await supabase
        .from('seasons')
        .update({ status: 'closed', final_roi: roi })
        .eq('id', cmId);

      if (error) { showToast('✕ Error closing season', 'err'); setLoading(false); return; }
      
      setCmOpen(false);
      const count = investments?.length || 0;
      showToast(`✓ ${s.name} closed. Payouts processed for ${count} investor${count !== 1 ? 's' : ''}.`, 'ok');
      fetchData();
    }
  };
  const cancelAutoCloseUI = (id: string) => {
    cancelAutoClose(id);
    setActive(a => a.map(x => x.id === id ? { ...x, autoClose: null } : x));
    showToast(`✕ Auto-Close cancelled for ${active.find(x => x.id === id)?.name}`);
  };

  const periodDisplay = calcPeriodStr(fEntry, fFinish);

  return (
    <>
      {loading && <VaultXLoader pageName="Admin · Seasons" />}
      <canvas ref={bgRef} style={{ position:'fixed', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:0, opacity:.04 }} />

      {/* Toast */}
      <div className={`sm-toast${toast.show?' show':''}${toast.cls?' '+toast.cls:''}`}>{toast.msg}</div>

      {/* Overlay */}
      <div className={`adm-sb-overlay${sidebarOpen?' show':''}`} onClick={() => setSidebarOpen(false)} />

      {/* ── CREATE/EDIT SEASON MODAL ── */}
      <div className={`sm-modal-overlay${smOpen?' open':''}`} onClick={e => { if (e.target === e.currentTarget) setSmOpen(false); }}>
        <div className="sm-modal-box">
          <div className="sm-modal-header">
            <div>
              <div className="sm-modal-title">{smTitle}</div>
              <div style={{ fontSize:'.67rem', color:'var(--text-sec)', marginTop:2 }}>{smSub}</div>
            </div>
            <button className="sm-modal-close" onClick={() => setSmOpen(false)}>
              <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="sm-modal-body">
            <div style={{ display:'grid', gap:14 }}>
              <div className="sm-form-group">
                <label className="sm-form-label">Season Name</label>
                <input className="sm-form-input" type="text" placeholder="e.g. Season 8" value={fName} onChange={e => setFName(e.target.value)} />
              </div>
              <div className="sm-form-grid-2col">
                <div className="sm-form-group">
                  <label className="sm-form-label">Last Entry Date</label>
                  <input className="sm-form-input" type="date" value={fEntry} onChange={e => setFEntry(e.target.value)} />
                </div>
                <div className="sm-form-group">
                  <label className="sm-form-label">Finish Date</label>
                  <input className="sm-form-input" type="date" value={fFinish} onChange={e => setFFinish(e.target.value)} />
                </div>
              </div>
              <div className="sm-form-group">
                <label className="sm-form-label">Running Period <span style={{ color:'var(--gold)', marginLeft:4 }}>Auto-calculated</span></label>
                <div className="sm-period-display">{periodDisplay}</div>
              </div>
              <div className="sm-form-grid-2col">
                <div className="sm-form-group">
                  <label className="sm-form-label">Expected ROI Range</label>
                  <input className="sm-form-input" type="text" placeholder="e.g. 18% – 32%" value={fRoi} onChange={e => setFRoi(e.target.value)} />
                </div>
                <div className="sm-form-group">
                  <label className="sm-form-label">Total Pool Size (USDT)</label>
                  <input className="sm-form-input" type="number" placeholder="e.g. 5000000" value={fPool} onChange={e => setFPool(e.target.value)} />
                </div>
              </div>
              <div className="sm-form-grid-2col">
                <div className="sm-form-group">
                  <label className="sm-form-label">Minimum Entry (USDT)</label>
                  <input className="sm-form-input" type="number" placeholder="e.g. 100" value={fMin} onChange={e => setFMin(e.target.value)} />
                </div>
                <div className="sm-form-group">
                  <label className="sm-form-label">Maximum Entry (USDT)</label>
                  <input className="sm-form-input" type="number" placeholder="e.g. 50000" value={fMax} onChange={e => setFMax(e.target.value)} />
                </div>
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:6, flexWrap:'wrap' }}>
                <button className="sm-btn-ghost" onClick={() => setSmOpen(false)}>Cancel</button>
                <button className="sm-btn-primary" onClick={submitSeasonModal}>{smBtnTxt}</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CLOSE SEASON MODAL ── */}
      <div className={`sm-modal-overlay${cmOpen?' open':''}`} onClick={e => { if (e.target === e.currentTarget) setCmOpen(false); }}>
        <div className="sm-modal-box" style={{ maxWidth:480 }}>
          <div className="sm-modal-header">
            <div>
              <div className="sm-modal-title">Close Season</div>
              <div style={{ fontSize:'.67rem', color:'var(--text-sec)', marginTop:2 }}>Set Final ROI and choose close method</div>
            </div>
            <button className="sm-modal-close" onClick={() => setCmOpen(false)}>
              <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="sm-modal-body">
            <div style={{ display:'grid', gap:16 }}>
              <div style={{ padding:'12px 14px', background:'rgba(184,147,90,.05)', border:'1px solid var(--border)', borderRadius:'var(--radius)' }}>
                <div style={{ fontSize:'.67rem', color:'var(--text-sec)', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:3 }}>Closing Season</div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', color:'var(--ink)' }}>{cmName}</div>
                <div style={{ fontSize:'.67rem', color:'var(--text-sec)', marginTop:3 }}>{cmDates}</div>
              </div>
              <div className="sm-form-group">
                <label className="sm-form-label">Final ROI (%)</label>
                <input className="sm-form-input" type="number" placeholder="e.g. 24.5" step="0.1" value={cmRoi} onChange={e => { setCmRoi(e.target.value); setCmActiveRoi(null); }} />
              </div>
              <div>
                <div style={{ fontSize:'.65rem', letterSpacing:'.12em', textTransform:'uppercase', color:'var(--text-sec)', marginBottom:8 }}>Quick Set ROI</div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {[10, 5, 0, -5, -10].map(v => (
                    <button key={v} className={`sm-roi-quick-btn${cmActiveRoi===v?' active-roi':''}`}
                      onClick={() => { setCmRoi(String(v)); setCmActiveRoi(v); }}>
                      {v >= 0 ? '+' : ''}{v}%
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ height:1, background:'var(--border)' }} />
              <div>
                <div className="sm-check-wrap" onClick={() => setCmAuto(a => !a)}>
                  <div className={`sm-check-box${cmAuto?' checked':''}`}>
                    {cmAuto && <svg viewBox="0 0 10 8" style={{ width:9, height:7 }}><polyline points="1,4 3.5,6.5 9,1" style={{ fill:'none', stroke:'var(--cream)', strokeWidth:1.6, strokeLinecap:'round', strokeLinejoin:'round' }}/></svg>}
                  </div>
                  <div>
                    <div className="sm-check-label">Enable Auto-Close on Finish Date</div>
                    <div style={{ fontSize:'.66rem', color:'var(--text-sec)', marginTop:1 }}>Season will automatically close at 23:59:59 on the Finish Date with the Final ROI set above</div>
                  </div>
                </div>
                {cmAuto && (
                  <div className="sm-autoclose-info">
                    <svg style={{ display:'inline', width:11, height:11, stroke:'var(--sage)', fill:'none', strokeWidth:2, verticalAlign:'middle', marginRight:4 }} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8"/><line x1="12" y1="12" x2="12" y2="16"/></svg>
                    The season will <strong>not</strong> close immediately. It will remain active and automatically close at <strong>23:59:59 on the Finish Date</strong>.
                  </div>
                )}
                {!cmAuto && (
                  <div className="sm-autoclose-info warn">
                    <svg style={{ display:'inline', width:11, height:11, stroke:'var(--error)', fill:'none', strokeWidth:2, verticalAlign:'middle', marginRight:4 }} viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    This will <strong>immediately close</strong> the season right now. This action cannot be undone.
                  </div>
                )}
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end', flexWrap:'wrap', marginTop:4 }}>
                <button className="sm-btn-ghost" onClick={() => setCmOpen(false)}>Cancel</button>
                <button
                  onClick={confirmCloseSeason}
                  style={{
                    padding:'9px 22px', fontSize:'.75rem', letterSpacing:'.1em',
                    fontFamily:"'DM Sans',sans-serif", textTransform:'uppercase', cursor:'pointer', borderRadius:'var(--radius)', transition:'all .2s', border:'1px solid',
                    ...(cmAuto
                      ? { background:'rgba(74,103,65,.08)', borderColor:'rgba(74,103,65,.25)', color:'var(--sage)' }
                      : { background:'rgba(155,58,58,.07)', borderColor:'rgba(155,58,58,.18)', color:'var(--error)' })
                  }}>
                  {cmAuto ? 'Enable Auto-Close' : 'Close Season Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CHANGE DATE MODAL ── */}
      <div className={`sm-modal-overlay${dmOpen?' open':''}`} onClick={e => { if (e.target === e.currentTarget) setDmOpen(false); }}>
        <div className="sm-modal-box" style={{ maxWidth:400 }}>
          <div className="sm-modal-header">
            <div>
              <div className="sm-modal-title">Change Finish Date</div>
              <div style={{ fontSize:'.67rem', color:'var(--text-sec)', marginTop:2 }}>{dmSub}</div>
            </div>
            <button className="sm-modal-close" onClick={() => setDmOpen(false)}>
              <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="sm-modal-body">
            <div style={{ display:'grid', gap:14 }}>
              <div className="sm-form-group">
                <label className="sm-form-label">New Finish Date</label>
                <input className="sm-form-input" type="date" value={dmDate} onChange={e => setDmDate(e.target.value)} />
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end', flexWrap:'wrap' }}>
                <button className="sm-btn-ghost" onClick={() => setDmOpen(false)}>Cancel</button>
                <button className="sm-btn-primary" onClick={confirmDateChange}>Update Date</button>
              </div>
            </div>
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

          {/* Page Content */}
          <div className="sm-page-wrapper">

            {/* Page title */}
            <div className="sm-reveal" style={{ marginBottom:28, display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:14 }}>
              <div>
                <span className="sm-sec-label">Admin · SeasonRise Platform</span>
                <h1 className="sm-sec-title">Season Management</h1>
                <p className="sm-sec-sub"><span className="sm-live-dot"/>{active.length} seasons active · Last updated just now</p>
              </div>
              <div style={{ alignSelf:'flex-end' }}>
                <button className="sm-btn-primary" onClick={() => openSeasonModal()}>+ Create New Season</button>
              </div>
            </div>

            {/* Stat strip */}
            <div className="sm-reveal" style={{ display:'grid', gap:10, gridTemplateColumns:'repeat(2,1fr)', marginBottom:24 }}>
              <style>{`@media(min-width:640px){.sm-stats-strip{grid-template-columns:repeat(4,1fr)!important}}`}</style>
              {[
                ['Active Seasons', String(active.length), 'var(--ink)'],
                ['Total Seasons Run', String(active.length + prev.length), 'var(--ink)'],
                ['Avg Final ROI', aggStats.avgROI, 'var(--gold)'],
                ['Total Pool (All Seasons)', aggStats.totalPool, 'var(--ink)'],
              ].map(([lbl, val, col]) => (
                <div key={lbl} className="sm-card" style={{ padding:'16px 18px' }}>
                  <div style={{ fontSize:'.58rem', letterSpacing:'.12em', textTransform:'uppercase', color:'var(--text-sec)', marginBottom:4 }}>{lbl}</div>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.6rem', color:col }}>{val}</div>
                </div>
              ))}
            </div>

            {/* Active seasons */}
            <div className="sm-divider" style={{ marginTop:0 }} />
            <div className="sm-reveal">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
                <div>
                  <span className="sm-sec-label">Live</span>
                  <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:400, color:'var(--ink)' }}>Active Seasons</h2>
                </div>
                <span style={{ fontSize:'.7rem', color:'var(--text-sec)' }}>{active.length} season{active.length!==1?'s':''} running</span>
              </div>

              {loading ? (
                <div style={{ padding:40, textAlign:'center' }}>Loading seasons...</div>
              ) : active.length === 0 ? (
                <div className="sm-empty-state">
                  <span className="sm-empty-icon">📈</span>
                  <div>No active seasons at the moment.</div>
                  <div style={{ marginTop:8 }}>
                    <button className="sm-btn-ghost sm-btn-sm" onClick={() => openSeasonModal()}>Create First Season</button>
                  </div>
                </div>
              ) : (
                <div style={{ display:'grid', gap:14 }}>
                  {active.map(s => {
                    const runStart  = s.entryDate;
                    const totalDays = calcRunningDays(runStart, s.finishDate);
                    const curDay    = Math.min(calcDaysCurrent(s.dayStart), totalDays);
                    const dayPct    = totalDays > 0 ? Math.round(curDay / totalDays * 100) : 0;
                    const isRunning = s.status === 'running';
                    const hasAuto   = !!s.autoClose;

                    return (
                      <div key={s.id} className={`sm-season-card${s.status==='paused'?' paused':''}`}>
                        {/* Header row */}
                        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.18rem', fontWeight:500, color:'var(--ink)' }}>{s.name}</div>
                            <span className={`sm-badge ${isRunning?'sm-b-running':s.status==='open'?'sm-b-pending':'sm-b-paused'}`}>{s.status.toUpperCase()}</span>
                            {hasAuto && <span className="sm-badge sm-b-autoclose">⏰ Auto-Close Set</span>}
                          </div>
                          <div style={{ fontSize:'.68rem', color:'var(--text-sec)' }}>{fmtDate(s.entryDate)} → {fmtDate(s.finishDate)}</div>
                        </div>

                        {/* Auto-close banner */}
                        {hasAuto && (
                          <div className="sm-autoclose-banner">
                            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            <span><strong>Final ROI: +{s.autoClose!.finalROI}%</strong> &nbsp;·&nbsp; {countdownText(s.finishDate)}</span>
                            <button className="sm-btn-ghost sm-btn-sm" style={{ marginLeft:'auto', fontSize:'.6rem', padding:'3px 9px', color:'var(--error)', borderColor:'rgba(155,58,58,.25)' }}
                              onClick={() => cancelAutoCloseUI(s.id)}>Cancel Auto-Close</button>
                          </div>
                        )}

                        {/* Meta grid */}
                        <div className="sm-season-meta-grid">
                          {[
                            ['Start Date', fmtDate(s.entryDate), ''],
                            ['Finish Date', fmtDate(s.finishDate), ''],
                            ['Running Period', `${totalDays} days`, ''],
                            ['Expected ROI', s.roi, 'gold'],
                            ['Pool Size', fmtUSDT(s.pool), ''],
                            ['Min / Max Entry', `${fmtUSDT(s.min)} / ${fmtUSDT(s.max)}`, ''],
                          ].map(([lbl, val, cls]) => (
                            <div key={lbl}>
                              <div className="sm-meta-lbl">{lbl}</div>
                              <div className={`sm-meta-val${cls?' '+cls:''}`}>{val}</div>
                            </div>
                          ))}
                        </div>

                        {/* Progress bars */}
                        <div style={{ display:'grid', gap:10, gridTemplateColumns:'1fr 1fr', marginBottom:14 }}>
                          <div>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                              <span style={{ fontSize:'.6rem', letterSpacing:'.1em', textTransform:'uppercase', color:'var(--text-sec)' }}>Day Progress</span>
                              <span style={{ fontSize:'.6rem', color:'var(--text-sec)' }}>Day {curDay} / {totalDays}</span>
                            </div>
                            <div className="sm-pool-bar"><div className="sm-pool-fill" style={{ width:`${dayPct}%` }}/></div>
                          </div>
                          <div>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                              <span style={{ fontSize:'.6rem', letterSpacing:'.1em', textTransform:'uppercase', color:'var(--text-sec)' }}>Pool Filled</span>
                              <span style={{ fontSize:'.6rem', color:'var(--text-sec)' }}>{s.poolFilled.toFixed(1)}% · {fmt(s.investors)} investors</span>
                            </div>
                            <div className="sm-pool-bar"><div className="sm-pool-fill" style={{ width:`${s.poolFilled}%`, background:'linear-gradient(90deg,var(--sage),var(--sage-l))' }}/></div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="sm-season-actions">
                          <button className="sm-btn-sage sm-btn-sm" onClick={() => togglePause(s.id)}>
                            {isRunning ? '⏸ Pause Season' : '▶ Resume Season'}
                          </button>
                          <button className="sm-btn-ghost sm-btn-sm" onClick={() => openDateModal(s.id)}>📅 Change Finish Date</button>
                          <button className="sm-btn-ghost sm-btn-sm" onClick={() => openSeasonModal(s.id)}>✏ Edit</button>
                          <button className="sm-btn-danger sm-btn-sm" onClick={() => openCloseModal(s.id)}>
                            ✕ {hasAuto ? 'Update Close Settings' : 'Close Season'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Previous seasons */}
            <div className="sm-divider" />
            <div className="sm-reveal">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
                <div>
                  <span className="sm-sec-label">History</span>
                  <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:400, color:'var(--ink)' }}>Previous Seasons</h2>
                </div>
                <span style={{ fontSize:'.7rem', color:'var(--text-sec)' }}>{prev.length} completed season{prev.length!==1?'s':''}</span>
              </div>
              <div className="sm-card">
                {prev.length === 0 ? (
                  <div className="sm-empty-state">
                    <span className="sm-empty-icon">📋</span>
                    No previous seasons yet.
                  </div>
                ) : (
                  <div className="sm-tbl-wrap">
                    <table className="sm-dtbl" style={{ minWidth:640 }}>
                      <thead>
                        <tr>
                          <th>Season</th><th>Period</th><th>Running Days</th>
                          <th>Final ROI</th><th>Pool Size</th><th>Min / Max Entry</th>
                          <th>Status</th><th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prev.map(s => {
                          const rs   = s.entryDate;
                          const days = calcRunningDays(rs, s.finishDate);
                          const roiColor = s.finalROI >= 20 ? 'var(--sage)' : s.finalROI >= 10 ? 'var(--gold)' : 'var(--error)';
                          return (
                            <tr key={s.id}>
                              <td>
                                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1rem', fontWeight:500, color:'var(--ink)' }}>{s.name}</div>
                              </td>
                              <td>
                                <div style={{ fontSize:'.75rem', color:'var(--ink)' }}>{fmtDate(s.entryDate)}</div>
                                <div style={{ fontSize:'.65rem', color:'var(--text-sec)' }}>→ {fmtDate(s.finishDate)}</div>
                              </td>
                              <td style={{ fontSize:'.78rem', color:'var(--text-sec)' }}>{days} days</td>
                              <td>
                                <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.05rem', color:roiColor, fontWeight:500 }}>+{s.finalROI}%</span>
                              </td>
                              <td style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'.95rem', color:'var(--ink)' }}>{fmtUSDT(s.pool)}</td>
                              <td style={{ fontSize:'.72rem', color:'var(--text-sec)' }}>{fmtUSDT(s.min)} / {fmtUSDT(s.max)}</td>
                              <td><span className="sm-badge sm-b-closed">Closed</span></td>
                              <td><button className="sm-btn-ghost sm-btn-sm" onClick={() => openSeasonModal(s.id)}>Edit</button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

          </div>{/* /page-wrapper */}
        </div>{/* /main-area */}
      </div>
    </>
  );
}