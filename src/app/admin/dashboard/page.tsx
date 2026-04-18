'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '../AdminSidebar';
import VaultXLoader from '@/components/VaultXLoader';
import { createClient } from '@/utils/supabase/client';

/* ── Types ── */
interface WdEntry {
  id: string; init: string; name: string; un: string;
  amt: string; wallet: string; date: string; season: string;
  status: 'pending' | 'approved' | 'rejected';
  userId: string;   // ← ADD
}
interface User {
  init: string; name: string; un: string; email: string;
  joined: string; balance: string; status: 'active' | 'new';
}
interface Season {
  name: string; period: string; roi: string; filled: number; investors: number; day: number; total: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toastMsg,    setToastMsg]    = useState('');
  const [toastType,   setToastType]   = useState('');
  const [toastShow,   setToastShow]   = useState(false);
  const [wdState,     setWdState]     = useState<WdEntry[]>([]);
  const [chartMode,   setChartMode]   = useState<'invested'|'users'>('invested');
  const [searchQ,     setSearchQ]     = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const mainChartRef  = useRef<HTMLCanvasElement>(null);
  const donutChartRef = useRef<HTMLCanvasElement>(null);
  const mainInstRef   = useRef<any>(null);
  const bgCanvasRef   = useRef<HTMLCanvasElement>(null);

  const [stats, setStats] = useState({
    totalUsers: '0',
    totalInvested: '$0',
    platformBalance: '$0',
    activeSeasons: '0',
    pendingWithdrawals: 0,
    totalPaidOut: '$0',
    avgSeasonROI: '0%',
    seasonsRun: '0',
    payoutRate: '0%'
  });
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [activeSeasons, setActiveSeasons] = useState<Season[]>([]);
  const [chartData, setChartData] = useState<{labels: string[], invested: number[], users: number[]}>({
    labels: [], invested: [], users: []
  });

  /* ── Fetch Data ── */
  const fetchData = useCallback(async () => {
    // 1. Basic Stats
    const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user');
    const { data: invData } = await supabase.from('investments').select('amount');
    const totalInv = invData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
    const { data: profData } = await supabase.from('profiles').select('balance');
    const totalBal = profData?.reduce((acc, curr) => acc + Number(curr.balance), 0) || 0;
    const { count: seasonCount } = await supabase.from('seasons').select('*', { count: 'exact', head: true }).in('status', ['open', 'running']);
    const { count: pendingWdCount } = await supabase.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending');

    // 2. Advanced Stats (Real-time)
    const { data: approvedWd } = await supabase.from('withdrawals').select('amount').eq('status', 'approved');
    const totalPaidOutValue = approvedWd?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

    const { data: closedSeasons } = await supabase.from('seasons').select('final_roi').eq('status', 'closed');
    const seasonsRunCount = closedSeasons?.length || 0;
    const avgROIValue = seasonsRunCount > 0 
      ? (closedSeasons?.reduce((acc, curr) => acc + Number(curr.final_roi || 0), 0) || 0) / seasonsRunCount 
      : 0;

    const { count: rejectedWdCount } = await supabase.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'rejected');
    const approvedWdCount = approvedWd?.length || 0;
    const payoutRateValue = (approvedWdCount + (rejectedWdCount || 0)) > 0
      ? (approvedWdCount / (approvedWdCount + (rejectedWdCount || 0))) * 100
      : 100;

    setStats({
      totalUsers: (userCount || 0).toLocaleString(),
      totalInvested:    '$' + (totalInv).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      platformBalance:  '$' + (totalBal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      activeSeasons:    String(seasonCount || 0),
      pendingWithdrawals: pendingWdCount || 0,
      totalPaidOut:     '$' + (totalPaidOutValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      avgSeasonROI:     `${avgROIValue >= 0 ? '+' : ''}${avgROIValue.toFixed(2)}%`,
      seasonsRun:       String(seasonsRunCount),
      payoutRate:       `${payoutRateValue.toFixed(2)}%`
    });

    // 3. Recent Users
    const { data: recUsers } = await supabase.from('profiles').select('*').eq('role', 'user').order('created_at', { ascending: false }).limit(7);
    if (recUsers) {
      setRecentUsers(recUsers.map(u => ({
        init: (u.first_name?.[0] || '') + (u.last_name?.[0] || ''),
        name: `${u.first_name} ${u.last_name}`,
        un: `@${u.username}`,
        email: u.email || '—',
        joined: new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        balance: `$${Number(u.balance).toLocaleString()}`,
        status: u.status || 'active'
      })));
    }

    // 4. Withdraw Requests
    const { data: pndWd } = await supabase.from('withdrawals').select('*, profiles(first_name, last_name, username)').eq('status', 'pending').order('created_at', { ascending: false }).limit(5);
    if (pndWd) {
      setWdState(pndWd.map((w: any) => ({
        id: w.id,
        init: (w.profiles?.first_name?.[0] || '') + (w.profiles?.last_name?.[0] || ''),
        name: `${w.profiles?.first_name} ${w.profiles?.last_name}`,
        un: `@${w.profiles?.username}`,
        amt: `$${Number(w.amount).toLocaleString()}`,
        wallet: w.address,
        date: new Date(w.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        season: 'Pending',
        status: 'pending',
        userId: w.user_id,   // ← ADD
      })));
    }

    // 5. Active Seasons
    const { data: seasons } = await supabase.from('seasons').select('*').in('status', ['open', 'running']).order('created_at', { ascending: false }).limit(3);
    if (seasons) {
      setActiveSeasons(seasons.map(s => {
        const start = s.start_date ? new Date(s.start_date) : new Date();
        const end = s.end_date ? new Date(s.end_date) : new Date();
        const now = new Date();
        const totalDays = s.duration_days || 90;
        const daysPassed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return {
          name: s.name,
          period: `${start.toLocaleDateString('en-GB', { month: 'short' })}–${end.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`,
          roi: s.roi_range || '20–30%',
          filled: (Number(s.current_pool) / Number(s.pool_cap)) * 100 || 0,
          investors: 0, 
          day: Math.max(0, Math.min(daysPassed, totalDays)),
          total: totalDays
        };
      }));
    }

    // 6. Dynamic Chart Data
    const { data: invHistory } = await supabase.from('investments').select('amount, joined_at').order('joined_at', { ascending: true });
    const { data: userHistory } = await supabase.from('profiles').select('created_at').eq('role', 'user').order('created_at', { ascending: true });

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const last8Months = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      last8Months.push({
        month: d.getMonth(),
        year: d.getFullYear(),
        label: monthNames[d.getMonth()]
      });
    }

    const investedByMonth = last8Months.map(m => {
      const total = invHistory?.filter(inv => {
        const id = new Date(inv.joined_at);
        return id.getMonth() === m.month && id.getFullYear() === m.year;
      }).reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      return total / 1000; // In K
    });

    const usersByMonth = last8Months.map(m => {
      const count = userHistory?.filter(u => {
        const ud = new Date(u.created_at);
        return ud.getMonth() === m.month && ud.getFullYear() === m.year;
      }).length || 0;
      return count;
    });

    setChartData({
      labels: last8Months.map(m => m.label),
      invested: investedByMonth,
      users: usersByMonth
    });

  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      { threshold: 0.07 }
    );
    document.querySelectorAll<HTMLElement>('.adm-reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  /* ── Body scroll lock ── */
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  /* ── BG Canvas ── */
  useEffect(() => {
    const cv = bgCanvasRef.current;
    if (!cv) return;
    const cx = cv.getContext('2d')!;
    let W = 0, H = 0, T = 0;
    let candles: any[] = [], waves: any[] = [];
    let rafId: number;

    const setup = () => {
      W = cv.width = window.innerWidth;
      H = cv.height = window.innerHeight;
      const n = Math.max(6, Math.floor(W / 52));
      candles = Array.from({ length: n }, (_, i) => ({
        x: (i / n) * W + 10 + Math.random() * 18,
        y: H * .12 + Math.random() * H * .75,
        w: 8 + Math.random() * 9, h: 14 + Math.random() * 70,
        wick: 6 + Math.random() * 22, up: Math.random() > .42,
        spd: .15 + Math.random() * .35, ph: Math.random() * Math.PI * 2,
      }));
      const pts = Math.ceil(W / 36) + 2;
      waves = [0,1,2,3].map(i => ({
        pts: Array.from({ length: pts }, (_, j) => ({ x: j*36, y: H*(.1+i*.24)+Math.random()*44 })),
        spd: .1+i*.04, ph: i*1.4, amp: 13+i*8,
        col: i%2===0 ? 'rgba(74,103,65,' : 'rgba(184,147,90,',
        opa: i%2===0 ? '.7)' : '.55)',
      }));
    };

    const draw = () => {
      cx.clearRect(0,0,W,H); T += .011;
      waves.forEach(w => {
        cx.beginPath();
        w.pts.forEach((p: any, j: number) => {
          const y = p.y + Math.sin(T*w.spd+j*.3+w.ph)*w.amp;
          j===0 ? cx.moveTo(p.x,y) : cx.lineTo(p.x,y);
        });
        cx.strokeStyle = w.col+w.opa; cx.lineWidth=1; cx.stroke();
      });
      candles.forEach(c => {
        const b = Math.sin(T*c.spd+c.ph)*7, x=c.x, y=c.y+b;
        cx.strokeStyle='rgba(28,28,28,.8)'; cx.lineWidth=1;
        cx.beginPath(); cx.moveTo(x+c.w/2,y-c.wick); cx.lineTo(x+c.w/2,y+c.h+c.wick); cx.stroke();
        cx.fillStyle = c.up?'rgba(74,103,65,.88)':'rgba(184,147,90,.82)';
        cx.fillRect(x,y,c.w,c.h); cx.strokeRect(x,y,c.w,c.h);
      });
      rafId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', setup);
    setup(); draw();
    return () => { cancelAnimationFrame(rafId); window.removeEventListener('resize', setup); };
  }, []);

  /* ── Charts ── */
  useEffect(() => {
    let donutInst: any;
    import('chart.js/auto').then(({ default: Chart }) => {
      /* Donut */
      if (donutChartRef.current) {
        donutInst = new Chart(donutChartRef.current, {
          type: 'doughnut',
          data: {
            labels: activeSeasons.map(s => s.name),
            datasets: [{
              data: activeSeasons.map(s => s.filled),
              backgroundColor: ['rgba(184,147,90,.85)','rgba(74,103,65,.8)','rgba(28,28,28,.7)'],
              borderColor: '#faf7f2', borderWidth: 3, hoverOffset: 6,
            }]
          },
          options: {
            responsive:true, maintainAspectRatio:false, cutout:'62%',
            plugins: {
              legend: { position:'bottom', labels:{ color:'#6b6459', font:{family:'DM Sans',size:10}, padding:12, boxWidth:10, boxHeight:10 } },
              tooltip: {
                backgroundColor:'rgba(28,28,28,.96)', borderColor:'rgba(184,147,90,.3)', borderWidth:1,
                titleColor:'#d4aa72', bodyColor:'#f6f1e9',
                callbacks: { label: (c: any) => `  ${c.label}: ${c.raw.toFixed(1)}% filled` }
              }
            }
          }
        });
      }
    });
    return () => { donutInst?.destroy(); };
  }, [activeSeasons]);

  /* ── Main chart ── */
  useEffect(() => {
    let inst: any;
    import('chart.js/auto').then(({ default: Chart }) => {
      if (!mainChartRef.current) return;
      mainInstRef.current?.destroy();
      const isInv = chartMode === 'invested';
      const data  = isInv ? chartData.invested : chartData.users;
      const label = isInv ? 'USDT Invested ($M)' : 'Users Registered';
      const color = isInv ? 'rgba(184,147,90,1)' : 'rgba(74,103,65,1)';
      const ctx   = mainChartRef.current.getContext('2d')!;
      const g     = ctx.createLinearGradient(0,0,0,260);
      g.addColorStop(0, color.replace('1)', '.18)')); g.addColorStop(1, color.replace('1)', '0)'));
      inst = new Chart(mainChartRef.current, {
        type: 'line',
        data: { labels: chartData.labels, datasets: [{ label, data, fill:true, backgroundColor:g, borderColor:color, borderWidth:2.5, pointBackgroundColor:color, pointBorderColor:'#faf7f2', pointBorderWidth:2, pointRadius:4, pointHoverRadius:6, tension:.42 }] },
        options: {
          responsive:true, maintainAspectRatio:false,
          plugins: {
            legend:{ display:false },
            tooltip:{ backgroundColor:'rgba(28,28,28,.96)', borderColor:'rgba(184,147,90,.3)', borderWidth:1, titleColor:'#d4aa72', bodyColor:'#f6f1e9', padding:12,
              callbacks:{ label:(c:any)=> isInv ? `  Invested: $${c.raw.toFixed(1)}M` : `  Users: ${c.raw.toLocaleString()}` }
            }
          },
          scales:{
            x:{ grid:{color:'rgba(184,147,90,.07)'}, ticks:{color:'#6b6459', font:{family:'DM Sans',size:10}} },
            y:{ grid:{color:'rgba(184,147,90,.07)'}, ticks:{color:'#6b6459', font:{family:'DM Sans',size:10}, callback:(v:any)=>isInv?'$'+v+'M':v.toLocaleString()} }
          },
          interaction:{ intersect:false, mode:'index' }
        }
      });
      mainInstRef.current = inst;
    });
    return () => { inst?.destroy(); };
  }, [chartMode, chartData]);

  /* ── Pool bars ── */
  useEffect(() => {
    const t = setTimeout(() => {
      document.querySelectorAll<HTMLElement>('.adm-pool-fill').forEach(el => {
        const w = el.style.width; el.style.width='0%';
        setTimeout(() => { el.style.width = w; }, 50);
      });
    }, 300);
    return () => clearTimeout(t);
  }, [activeSeasons]);

  /* ── WD helpers ── */
  const pendingCount = stats.pendingWithdrawals;

  const approveWd = async (id: string) => {
    const w = wdState.find(x => x.id === id);
    if (!w || w.status !== 'pending') return;
    if (!confirm(`Approve ${w.amt} withdrawal for ${w.name}?`)) return;
    
    const { error } = await supabase.from('withdrawals').update({ status: 'approved' }).eq('id', id);
    if (error) { showToast('✕ Error approving withdrawal', 'err'); return; }

    // ← FIX: deduct from user's balance
    const rawAmt = Number(w.amt.replace(/[^0-9.]/g, ''));
    const { data: profile } = await supabase.from('profiles').select('balance').eq('id', w.userId).single();
    if (profile) {
      await supabase.from('profiles').update({ balance: Number(profile.balance) - rawAmt }).eq('id', w.userId);
    }

    setWdState(prev => prev.map(x => x.id===id ? {...x, status:'approved'} : x));
    setStats(s => ({ ...s, pendingWithdrawals: s.pendingWithdrawals - 1 }));
    showToast(`✓ ${w.amt} withdrawal approved for ${w.name}`, 'ok');
  };

  const rejectWd = async (id: string) => {
    const w = wdState.find(x => x.id === id);
    if (!w || w.status !== 'pending') return;
    const reason = prompt(`Enter rejection reason for ${w.name}:`);
    if (reason === null) return;
    
    const { error } = await supabase.from('withdrawals').update({ status: 'rejected', rejection_reason: reason }).eq('id', id);
    if (error) { showToast('✕ Error rejecting withdrawal', 'err'); return; }

    setWdState(prev => prev.map(x => x.id===id ? {...x, status:'rejected'} : x));
    setStats(s => ({ ...s, pendingWithdrawals: s.pendingWithdrawals - 1 }));
    showToast(`✕ ${w.amt} withdrawal rejected for ${w.name}`, 'err');
  };

  const approveAll = async () => {
    const pending = wdState.filter(w => w.status === 'pending');
    if (!pending.length) { showToast('No pending requests.'); return; }
    if (!confirm(`Approve all ${pending.length} pending withdrawals?`)) return;
    
    const ids = pending.map(p => p.id);
    const { error } = await supabase.from('withdrawals').update({ status: 'approved' }).in('id', ids);
    if (error) { showToast('✕ Error approving all withdrawals', 'err'); return; }

    // ← FIX: deduct each user's balance
    for (const p of pending) {
      const rawAmt = Number(p.amt.replace(/[^0-9.]/g, ''));
      const { data: prof } = await supabase.from('profiles').select('balance').eq('id', p.userId).single();
      if (prof) {
        await supabase.from('profiles').update({ balance: Number(prof.balance) - rawAmt }).eq('id', p.userId);
      }
    }

    setWdState(prev => prev.map(x => x.status==='pending' ? {...x,status:'approved'} : x));
    setStats(s => ({ ...s, pendingWithdrawals: 0 }));
    showToast(`✓ All ${pending.length} withdrawals approved!`, 'ok');
  };

  const copyWallet = (addr: string) => {
    navigator.clipboard?.writeText(addr).catch(() => {});
    showToast('📋 Wallet address copied!');
  };

  /* ── Search filter ── */
  const filteredUsers = searchQ.trim()
    ? recentUsers.filter(u => [u.name, u.un, u.email].join(' ').toLowerCase().includes(searchQ.toLowerCase()))
    : recentUsers;

  return (
    <>
      <VaultXLoader pageName="Admin · Dashboard" />
      {/* BG canvas */}
      <canvas ref={bgCanvasRef} id="bg-canvas" style={{ position:'fixed', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:0, opacity:.04 }} />

      {/* Toast */}
      <div className={`adm-toast${toastShow?' show':''}${toastType?' '+toastType:''}`}>{toastMsg}</div>

      {/* Overlay */}
      <div className={`adm-sb-overlay${sidebarOpen?' show':''}`} onClick={() => setSidebarOpen(false)} />

      <div className="adm-layout">
        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onToast={showToast} />

        <div className="adm-main-area">
          {/* Header */}
          <header className="adm-top-header">
            <button className="adm-ham-btn" onClick={() => setSidebarOpen(o => !o)}>
              <span/><span/><span/>
            </button>
            <a className="adm-back-pill" href="/">
              <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
              Back
            </a>
            <div className="adm-search-wrap">
              <div className="adm-search-icon"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
              <input className="adm-search-input" type="text" placeholder="Search users…"
                value={searchQ} onChange={e => setSearchQ(e.target.value)} />
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
              <button className="adm-btn-logout" onClick={() => { showToast('Logging out…'); setTimeout(() => router.push('/'), 1400); }}>Logout</button>
            </div>
          </header>

          {/* Content */}
          <div className="adm-content">

            {/* Page title */}
            <div className="adm-reveal" style={{ marginBottom:28, display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
              <div>
                <span className="adm-sec-label">Admin · SeasonRise Platform</span>
                <h1 className="adm-sec-title">Dashboard Overview</h1>
                <p className="adm-sec-sub">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · <span className="adm-live-dot"/> Platform is live</p>
              </div>
              <div style={{ display:'flex', gap:8, alignSelf:'flex-end', flexWrap:'wrap' }}>
                <button className="adm-btn-ghost" onClick={() => showToast('Exporting report…')}>Export Report</button>
                <button className="adm-btn-ghost" onClick={() => { showToast('Refreshing data…'); fetchData(); }}>↻ Refresh</button>
              </div>
            </div>

            {/* Stats */}
            <div className="adm-stats-grid adm-reveal" style={{ marginBottom:20 }}>
              {[
                { bg:'rgba(28,28,28,.06)', svgColor:'var(--charcoal)', svg:<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>, val:stats.totalUsers, valSz:'1.6rem', lbl:'Total Users', change:'↑ Total', chCls:'adm-ch-up' },
                { bg:'rgba(184,147,90,.08)', svgColor:'var(--gold)', svg:<path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>, val:stats.totalInvested, valSz:'1.3rem', lbl:'USDT Invested', change:'↑ All time', chCls:'adm-ch-up' },
                { bg:'rgba(74,103,65,.08)', svgColor:'var(--sage)', svg:<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-4 0v2"/><line x1="12" y1="12" x2="12" y2="16"/><circle cx="12" cy="12" r="1" fill="var(--sage)"/></>, val:stats.platformBalance, valSz:'1.3rem', lbl:'Platform Balance', change:'↑ Healthy', chCls:'adm-ch-up' },
                { bg:'rgba(184,147,90,.08)', svgColor:'var(--gold)', svg:<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>, val:stats.activeSeasons, valSz:'1.6rem', lbl:'Active Seasons', change:'Live now', chCls:'adm-ch-neu' },
                { bg:'rgba(155,58,58,.06)', svgColor:'#9b3a3a', svg:<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>, val:String(pendingCount), valSz:'1.6rem', lbl:'Pending Withdrawals', change:'⚠ Requires action', chCls:'', chColor:'#9b3a3a' },
              ].map((s, i) => (
                <div key={i} className="adm-stat-card">
                  <div className="adm-stat-icon" style={{ background:s.bg }}>
                    <svg viewBox="0 0 24 24" style={{ stroke:s.svgColor }}>{s.svg}</svg>
                  </div>
                  <div className="adm-stat-val" style={{ fontSize:s.valSz }}>{s.val}</div>
                  <div className="adm-stat-lbl">{s.lbl}</div>
                  <div className={`adm-stat-change${s.chCls?' '+s.chCls:''}`} style={s.chColor?{color:s.chColor}:{}}>{s.change}</div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="adm-charts-grid adm-reveal" style={{ marginBottom:20 }}>
              <div className="adm-chart-card">
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:8, marginBottom:16 }}>
                  <div>
                    <div className="adm-chart-title">Platform Growth</div>
                    <div className="adm-chart-sub">Monthly invested USDT & user registrations · Last 8 months</div>
                  </div>
                  <div className="adm-mini-tabs">
                    <button className={`adm-mini-tab${chartMode==='invested'?' active':''}`} onClick={() => setChartMode('invested')}>Invested</button>
                    <button className={`adm-mini-tab${chartMode==='users'?' active':''}`}    onClick={() => setChartMode('users')}>Users</button>
                  </div>
                </div>
                <div className="adm-chart-wrap"><canvas ref={mainChartRef} /></div>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div className="adm-chart-card" style={{ flex:1 }}>
                  <div className="adm-chart-title" style={{ fontSize:'1rem' }}>Season Distribution</div>
                  <div className="adm-chart-sub">Pool allocation by season</div>
                  <div className="adm-donut-wrap"><canvas ref={donutChartRef} /></div>
                </div>
                <div className="adm-chart-card" style={{ padding:'16px 20px' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    {[
                      [stats.totalPaidOut, 'Total Paid Out'],
                      [stats.avgSeasonROI, 'Avg Season ROI'],
                      [stats.payoutRate,   'Payout Rate'],
                      [stats.seasonsRun,   'Seasons Run']
                    ].map(([v,l]) => (
                      <div key={l} className="adm-mini-stat"><div className="adm-mini-val">{v}</div><div className="adm-mini-lbl">{l}</div></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent users */}
            <div className="adm-reveal" style={{ marginBottom:20 }}>
              <div className="adm-table-card">
                <div className="adm-table-head">
                  <div>
                    <div className="adm-table-title">Recent Users</div>
                    <div className="adm-table-sub">Showing {filteredUsers.length} of {stats.totalUsers} users</div>
                  </div>
                  <a className="adm-view-all" onClick={() => router.push('/admin/user')}>View All →</a>
                </div>
                <div className="adm-tbl-wrap">
                  <table className="adm-dtbl">
                    <thead>
                      <tr><th>User</th><th>Username</th><th>Email</th><th>Joined</th><th>Balance</th><th>Status</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr><td colSpan={7} style={{ textAlign:'center', padding:'24px', color:'var(--text-sec)', fontSize:'.78rem' }}>No users match your search.</td></tr>
                      ) : filteredUsers.map((u, i) => (
                        <tr key={i}>
                          <td><div className="adm-td-user"><div className="adm-td-av">{u.init}</div><div><div className="adm-td-name">{u.name}</div></div></div></td>
                          <td><span className="adm-td-sub">{u.un}</span></td>
                          <td><span className="adm-td-sub">{u.email}</span></td>
                          <td><span className="adm-td-sub">{u.joined}</span></td>
                          <td style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'.95rem', color:'var(--gold)', fontWeight:500 }}>{u.balance}</td>
                          <td><span className={`adm-badge ${u.status==='active'?'adm-b-active':'adm-b-new'}`}>{u.status}</span></td>
                          <td><button className="adm-btn-ghost" style={{ fontSize:'.65rem', padding:'5px 10px' }} onClick={() => showToast(`Viewing ${u.name}…`)}>View</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Withdraw requests */}
            <div className="adm-reveal">
              <div className="adm-table-card">
                <div className="adm-table-head">
                  <div>
                    <div className="adm-table-title">Withdraw Requests</div>
                    <div className="adm-table-sub">Pending approval · {pendingCount} request{pendingCount!==1?'s':''}</div>
                  </div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <button className="adm-btn-ghost" style={{ fontSize:'.7rem' }} onClick={approveAll}>Approve All</button>
                    <a className="adm-view-all" onClick={() => router.push('/admin/withdraw')}>View All →</a>
                  </div>
                </div>
                <div className="adm-tbl-wrap">
                  <table className="adm-dtbl" style={{ minWidth:700 }}>
                    <thead>
                      <tr><th>User</th><th>Amount</th><th>Wallet</th><th>Date</th><th>Season</th><th>Status</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {wdState.length === 0 ? (
                        <tr><td colSpan={7} style={{ textAlign:'center', padding:'24px', color:'var(--text-sec)', fontSize:'.78rem' }}>No pending withdrawal requests.</td></tr>
                      ) : wdState.map(w => {
                        const short = w.wallet.substring(0,10) + '…' + w.wallet.slice(-4);
                        return (
                          <tr key={w.id}>
                            <td><div className="adm-td-user"><div className="adm-td-av">{w.init}</div><div><div className="adm-td-name">{w.name}</div><div className="adm-td-sub">{w.un}</div></div></div></td>
                            <td style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1rem', color:'var(--ink)', fontWeight:500 }}>{w.amt}</td>
                            <td><span className="adm-td-sub" style={{ fontFamily:'monospace', fontSize:'.72rem', cursor:'pointer' }} onClick={() => copyWallet(w.wallet)}>{short}</span></td>
                            <td><span className="adm-td-sub">{w.date}</span></td>
                            <td><span className="adm-badge adm-b-pending" style={{ fontSize:'.58rem' }}>{w.season}</span></td>
                            <td><span className={`adm-badge ${w.status==='pending'?'adm-b-pending':w.status==='approved'?'adm-b-approved':'adm-b-reject'}`}>{w.status}</span></td>
                            <td>
                              {w.status === 'pending' ? (
                                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                                  <button className="adm-btn-approve" onClick={() => approveWd(w.id)}>Approve</button>
                                  <button className="adm-btn-reject"  onClick={() => rejectWd(w.id)}>Reject</button>
                                </div>
                              ) : (
                                <span className="adm-td-sub">{w.status==='approved'?'Processed ✓':'Declined ✕'}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Season strip */}
            <div className="adm-divider" />
            <div style={{ marginBottom:10 }}>
              <div className="adm-table-title" style={{ marginBottom:12 }}>Active Seasons</div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {activeSeasons.length === 0 ? (
                  <div style={{ padding:'20px', textAlign:'center', color:'var(--text-sec)', fontSize:'.8rem' }}>No active seasons.</div>
                ) : activeSeasons.map((s, i) => {
                  const pct    = Math.round(s.filled);
                  const dayPct = Math.round(s.day / s.total * 100);
                  return (
                    <div key={i} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'18px 20px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:16, alignItems:'center', transition:'all .3s' }}
                      onMouseOver={e => (e.currentTarget.style.borderColor='rgba(184,147,90,.3)')}
                      onMouseOut={e  => (e.currentTarget.style.borderColor='var(--border)')}>
                      <div>
                        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', fontWeight:500, color:'var(--ink)', marginBottom:3 }}>{s.name}</div>
                        <div style={{ fontSize:'.7rem', color:'var(--text-sec)' }}>{s.period}</div>
                        <span className="adm-badge adm-b-active" style={{ marginTop:6, fontSize:'.58rem' }}>Live</span>
                      </div>
                      <div>
                        <div style={{ fontSize:'.62rem', letterSpacing:'.1em', textTransform:'uppercase', color:'var(--text-sec)', marginBottom:3 }}>Day Progress</div>
                        <div className="adm-pool-bar"><div className="adm-pool-fill" style={{ width:`${dayPct}%` }}/></div>
                        <div style={{ fontSize:'.68rem', color:'var(--text-sec)', marginTop:3 }}>Day {s.day} of {s.total}</div>
                      </div>
                      <div>
                        <div style={{ fontSize:'.62rem', letterSpacing:'.1em', textTransform:'uppercase', color:'var(--text-sec)', marginBottom:2 }}>Pool Filled · {pct}%</div>
                        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.15rem', color:'var(--gold)' }}>{s.roi} ROI</div>
                        <div style={{ fontSize:'.68rem', color:'var(--text-sec)' }}>{s.investors.toLocaleString()} investors</div>
                      </div>
                      <div><button className="adm-btn-ghost" style={{ whiteSpace:'nowrap' }} onClick={() => router.push('/admin/season')}>Manage →</button></div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>{/* /content */}
        </div>{/* /main-area */}
      </div>
    </>
  );
}