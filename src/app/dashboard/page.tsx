'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import UserSidebar from '@/components/UserSidebar'
import ValutXLoader from '@/components/ValutXLoader'
import { createClient } from '@/utils/supabase/client'

declare global {
  interface Window { Chart: any }
}

const fmtPnL    = (n: number) => n >= 0
  ? `+$${Math.abs(n).toLocaleString()}`
  : `-$${Math.abs(n).toLocaleString()}`

const pnlColor  = (n: number) => n >= 0 ? 'var(--sage)'              : '#b05252'
const pnlArrow  = (n: number) => n >= 0 ? '↑'                        : '↓'
const pnlBg     = (n: number) => n >= 0 ? 'rgba(74,103,65,.08)'      : 'rgba(155,58,58,.07)'
const pnlStroke = (n: number) => n >= 0 ? 'var(--sage-l)'            : '#9b3a3a'
const pnlCls    = (n: number) => n >= 0 ? 'db-stat-up'               : 'db-stat-dn'

function pad2(n: number) { return String(n).padStart(2, '0') }

function getLockCountdown(lockedUntil: string): string {
  const ms = new Date(lockedUntil).getTime() - Date.now()
  if (ms <= 0) return ''
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

function getGreeting(): { text: string; emoji: string; sub: string } {
  const h = new Date().getHours()
  if (h >= 5 && h < 12)  return { text: 'Good morning',   emoji: '☀️', sub: 'Rise & grow your wealth' }
  if (h >= 12 && h < 17) return { text: 'Good afternoon', emoji: '🌤️', sub: 'Your portfolio awaits' }
  if (h >= 17 && h < 21) return { text: 'Good evening',   emoji: '🌇', sub: 'Let\'s review your gains' }
  return                         { text: 'Good night',     emoji: '🌙', sub: 'Rest well — money works for you' }
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [toastShow, setToastShow] = useState(false)
  const [displayBalance, setDisplayBalance] = useState('$0.00')
  const [progWidth, setProgWidth] = useState('0%')
  const [chartMode, setChartMode] = useState<'roi' | 'usdt'>('roi')
  const [chartReady, setChartReady] = useState(false)
  const [greeting] = useState(getGreeting)

  const [profile, setProfile] = useState<any>(null)
  const [activeInvestment, setActiveInvestment] = useState<any>(null)
  const [historyInvestments, setHistoryInvestments] = useState<any[]>([])
  const [allSeasons, setAllSeasons] = useState<any[]>([])
  const [referralStats, setReferralStats] = useState({ count: 0, earned: 0 })
  const [activeSeason, setActiveSeason] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [computedAvgRoi, setComputedAvgRoi] = useState(0)

  // Locked amount states
  const [lockedAmount, setLockedAmount] = useState(0)
  const [lockedDeposits, setLockedDeposits] = useState<Array<{ id: string; amount: number; lockedUntil: string }>>([])
  const [lockCountdown, setLockCountdown] = useState<string>('')

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<any>(null)
  const bgCanvasRef = useRef<HTMLCanvasElement>(null)
  const lockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/auth/signin'); return }

        const { data: profileData } = await supabase
          .from('profiles').select('*').eq('id', user.id).maybeSingle()

        if (profileData) {
          setProfile(profileData)
          const bal = Number(profileData.balance) || 0
          setDisplayBalance('$' + bal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
        }

        // Fetch locked deposits
        const { data: locked } = await supabase
          .from('deposits')
          .select('id, amount, locked_until')
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .gt('locked_until', new Date().toISOString())

        if (locked && locked.length > 0) {
          const lockedArr = locked.map((d: any) => ({
            id: d.id,
            amount: Number(d.amount),
            lockedUntil: d.locked_until,
          }))
          setLockedDeposits(lockedArr)
          const total = lockedArr.reduce((sum, d) => sum + d.amount, 0)
          setLockedAmount(total)
        } else {
          setLockedDeposits([])
          setLockedAmount(0)
        }

        const { data: investments } = await supabase
          .from('investments').select('*, seasons(*)').eq('user_id', user.id)

        if (investments && investments.length > 0) {
          const validInvestments = investments.filter(inv => inv.seasons != null)
          const active = validInvestments.find(inv =>
            inv.status === 'active' && inv.seasons?.status !== 'closed'
          )
          setActiveInvestment(active || null)

          const completed = validInvestments.filter(inv =>
            inv.status === 'completed' || inv.seasons?.status === 'closed'
          )
          setHistoryInvestments(completed)

          const closedWithRoi = completed.filter(inv =>
            inv.seasons?.status === 'closed' && inv.seasons?.final_roi != null
          )
          if (closedWithRoi.length > 0) {
            const sum = closedWithRoi.reduce((acc: number, inv: any) =>
              acc + Number(inv.seasons.final_roi), 0)
            setComputedAvgRoi(Math.round((sum / closedWithRoi.length) * 100) / 100)
          }

          if (active?.seasons) {
            const startDate = active.seasons.start_date
            if (startDate) {
              const start = new Date(startDate).getTime()
              const now = Date.now()
              const daysPassed = Math.floor((now - start) / (1000 * 60 * 60 * 24))
              const totalDays = active.seasons.duration_days || 90
              const progress = Math.min(100, Math.max(0, (daysPassed / totalDays) * 100))
              setProgWidth(progress.toFixed(1) + '%')
            }
          }
        }

        const { data: seasons } = await supabase
          .from('seasons').select('*').order('created_at', { ascending: false })

        if (seasons) {
          setAllSeasons(seasons)
          const current = seasons.find(s => s.status === 'running') || seasons.find(s => s.status === 'open')
          setActiveSeason(current || null)
        }

        const { data: referrals } = await supabase
          .from('profiles').select('id').eq('referred_by', user.id)

        setReferralStats({
          count: referrals?.length || 0,
          earned: Number((profileData as any)?.referral_earned) || 0
        })
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router, supabase])

  // Lock countdown timer
  useEffect(() => {
    if (lockedDeposits.length === 0) {
      setLockCountdown('')
      return
    }
    const tick = () => {
      const stillLocked = lockedDeposits.filter(d => new Date(d.lockedUntil).getTime() > Date.now())
      if (stillLocked.length === 0) {
        setLockedAmount(0)
        setLockCountdown('')
        if (lockTimerRef.current) clearInterval(lockTimerRef.current)
        return
      }
      stillLocked.sort((a, b) => new Date(a.lockedUntil).getTime() - new Date(b.lockedUntil).getTime())
      const earliest = stillLocked[0]
      const cd = getLockCountdown(earliest.lockedUntil)
      setLockCountdown(cd)
      const total = stillLocked.reduce((sum, d) => sum + d.amount, 0)
      setLockedAmount(total)
    }
    tick()
    lockTimerRef.current = setInterval(tick, 1000)
    return () => { if (lockTimerRef.current) clearInterval(lockTimerRef.current) }
  }, [lockedDeposits])

  const getDaysElapsed = (startDate: string) => {
    if (!startDate) return 0
    const diff = Date.now() - new Date(startDate).getTime()
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
  }

  const showToast = useCallback((msg: string) => {
    setToastMsg('✓  ' + msg)
    setToastShow(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastShow(false), 3200)
  }, [])

  const initChart = useCallback(() => {
    if (!chartRef.current || !window.Chart) return
    const ctx = chartRef.current.getContext('2d')
    if (!ctx) return

    const grad = (c1: string, c2: string) => {
      const g = ctx.createLinearGradient(0, 0, 0, 200)
      g.addColorStop(0, c1); g.addColorStop(1, c2); return g
    }

    const validHistory = historyInvestments.filter(inv => inv.seasons)
    const labels = validHistory.map(inv => {
      const name = inv.seasons?.name || 'Season'
      return name.split(' ').map((w: string) => w[0]).join('')
    })
    const roiData = validHistory.map(inv => Number(inv.seasons?.final_roi) || 0)

    if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null }

    chartInstance.current = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['—'],
        datasets: [{
          data: roiData.length ? roiData : [0],
          fill: true,
          backgroundColor: grad('rgba(74,103,65,0.15)', 'rgba(74,103,65,0)'),
          borderColor: '#4a6741', borderWidth: 2,
          pointBackgroundColor: '#4a6741', pointBorderColor: '#faf7f2',
          pointBorderWidth: 2, pointRadius: 5, pointHoverRadius: 7, tension: 0.4,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(28,28,28,0.92)', borderColor: 'rgba(184,147,90,0.3)',
            borderWidth: 1, titleColor: '#d4aa72', bodyColor: '#f6f1e9', padding: 12,
            callbacks: { label: (c: { raw: number }) => `  ROI: ${c.raw >= 0 ? '+' : ''}${c.raw}%` },
          },
        },
        scales: {
          x: { grid: { color: 'rgba(184,147,90,0.06)' }, ticks: { color: '#9c9186', font: { family: 'DM Sans', size: 10 } } },
          y: { grid: { color: 'rgba(184,147,90,0.06)' }, ticks: { color: '#9c9186', font: { family: 'DM Sans', size: 10 }, callback: (v: number) => (v >= 0 ? '+' : '') + v + '%' } },
        },
        interaction: { intersect: false, mode: 'index' },
      },
    })
  }, [historyInvestments])

  useEffect(() => { if (chartReady && !loading) initChart() }, [chartReady, loading, initChart])

  useEffect(() => {
    const bgC = bgCanvasRef.current; if (!bgC) return
    const bgX = bgC.getContext('2d'); if (!bgX) return
    let BW=0, BH=0, candles:any[]=[], waves:any[]=[], bT=0, animId=0
    const resize=()=>{
      BW=bgC.width=window.innerWidth; BH=bgC.height=window.innerHeight
      const n=Math.max(8,Math.floor(BW/52))
      candles=Array.from({length:n},(_,i)=>({x:(i/n)*BW+Math.random()*30,y:BH*.28+Math.random()*BH*.5,w:10+Math.random()*7,h:18+Math.random()*58,up:Math.random()>.42,spd:.18+Math.random()*.35,phase:Math.random()*Math.PI*2,wick:7+Math.random()*18}))
      const pts=Math.ceil(BW/36)+2
      waves=Array.from({length:4},(_,i)=>({pts:Array.from({length:pts},(_,j)=>({x:j*36,y:BH*(.18+i*.17)+Math.random()*55})),spd:.12+i*.04,phase:i*1.1,amp:16+i*7}))
    }
    const anim=()=>{
      bgX.clearRect(0,0,BW,BH); bT+=.011
      waves.forEach((w,i)=>{bgX.beginPath();w.pts.forEach((p:any,j:number)=>{const y=p.y+Math.sin(bT*w.spd+j*.28+w.phase)*w.amp;j===0?bgX.moveTo(p.x,y):bgX.lineTo(p.x,y)});bgX.strokeStyle=i%2===0?'rgba(74,103,65,0.9)':'rgba(184,147,90,0.7)';bgX.lineWidth=.9;bgX.stroke()})
      candles.forEach(c=>{const bob=Math.sin(bT*c.spd+c.phase)*7,x=c.x,y=c.y+bob;bgX.strokeStyle='rgba(28,28,28,0.9)';bgX.lineWidth=.9;bgX.beginPath();bgX.moveTo(x+c.w/2,y-c.wick);bgX.lineTo(x+c.w/2,y+c.h+c.wick);bgX.stroke();bgX.fillStyle=c.up?'rgba(74,103,65,0.85)':'rgba(184,147,90,0.8)';bgX.fillRect(x,y,c.w,c.h);bgX.strokeRect(x,y,c.w,c.h)})
      animId=requestAnimationFrame(anim)
    }
    window.addEventListener('resize',resize); resize(); anim()
    return()=>{ window.removeEventListener('resize',resize); cancelAnimationFrame(animId) }
  }, [])

  useEffect(() => {
    const h=(e:KeyboardEvent)=>{ if(e.key==='Escape')setSidebarOpen(false) }
    document.addEventListener('keydown',h)
    return()=>document.removeEventListener('keydown',h)
  }, [])

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return()=>{ document.body.style.overflow='' }
  }, [sidebarOpen])

  useEffect(() => {
    const obs=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('show');obs.unobserve(e.target)}}),{threshold:.12})
    document.querySelectorAll<HTMLElement>('.db-reveal').forEach(el=>obs.observe(el))
    return()=>obs.disconnect()
  }, [loading])

  const copyRef = () => {
    const code = profile?.referral_code || ''
    if (!code) { showToast('No referral code yet'); return }
    navigator.clipboard?.writeText(code).then(() => showToast('Referral code copied')).catch(() => showToast('Copy failed'))
  }

  const balance        = Number(profile?.balance)        || 0
  const investedTotal  = Number(profile?.invested_total) || 0
  const withdrawable   = balance
  const profitsTotal   = Number(profile?.profits_total)  || 0
  const commRate       = 15
  const firstName      = profile?.first_name || profile?.username || 'Investor'
  const refCode        = profile?.referral_code || '—'
  const avgRoi         = computedAvgRoi

  // ── FIX 3: cap locked at current balance so it never exceeds what's there ──
  const effectiveLockedAmount   = Math.min(lockedAmount, balance)
  const effectiveWithdrawable   = Math.max(0, withdrawable - effectiveLockedAmount)

  const activeSeasonDays  = activeInvestment?.seasons?.duration_days || 90
  const activeSeasonStart = activeInvestment?.seasons?.start_date    || null
  const activeSeasonName  = activeInvestment?.seasons?.name          || null
  const activeSeasonRoi   = activeInvestment?.seasons?.roi_range     || '—'
  const myInvestAmount    = Number(activeInvestment?.amount)         || 0
  const daysElapsed       = activeSeasonStart ? getDaysElapsed(activeSeasonStart) : 0

  const bestRoi = historyInvestments.length
    ? Math.max(...historyInvestments.map(i => Number(i.seasons?.final_roi) || 0))
    : null

  return (
    <>
      {loading && <ValutXLoader pageName="Dashboard" />}
      <Script src='https://cdn.jsdelivr.net/npm/chart.js' onReady={() => setChartReady(true)} />
      <canvas ref={bgCanvasRef} style={{position:'fixed',inset:0,zIndex:0,pointerEvents:'none',opacity:.055,width:'100%',height:'100%'}}/>
      <div className={`db-toast${toastShow?' show':''}`}>{toastMsg}</div>
      <UserSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Inline styles for greeting animation and mobile improvements */}
      <style>{`
        @keyframes greet-slide {
          from { opacity:0; transform:translateY(18px) scale(0.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes emoji-bounce {
          0%,100% { transform: translateY(0) rotate(0deg); }
          30%     { transform: translateY(-6px) rotate(-8deg); }
          60%     { transform: translateY(-3px) rotate(5deg); }
        }
        @keyframes sub-fade {
          from { opacity:0; transform:translateX(-10px); }
          to   { opacity:1; transform:translateX(0); }
        }
        .db-greeting-wrap {
          animation: greet-slide 0.7s cubic-bezier(.16,1,.3,1) both;
        }
        .db-greeting-emoji {
          display: inline-block;
          font-size: 1.6rem;
          animation: emoji-bounce 1.2s 0.5s ease both;
          margin-right: 8px;
          vertical-align: middle;
        }
        .db-greeting-text {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.6rem,5vw,2.4rem);
          font-weight: 400;
          color: var(--ink);
          line-height: 1.15;
        }
        .db-greeting-name {
          font-style: italic;
          color: var(--gold);
          position: relative;
        }
        .db-greeting-name::after {
          content: '';
          position: absolute;
          bottom: 1px;
          left: 0;
          width: 100%;
          height: 1px;
          background: linear-gradient(90deg, var(--gold), transparent);
          opacity: 0.5;
        }
        .db-greeting-sub {
          font-size: .72rem;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: var(--text-sec, #6b6459);
          margin-top: 6px;
          display: flex;
          align-items: center;
          gap: 7px;
          animation: sub-fade 0.6s 0.4s ease both;
          opacity: 0;
          animation-fill-mode: forwards;
        }
        .db-greeting-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--gold);
          opacity: 0.6;
          flex-shrink: 0;
        }

        /* ── Mobile improvements ── */
        @media (max-width: 900px) {
          /* Stat cards — more compact, better spacing */
          .db-grid-4 > div {
            padding: 14px 12px !important;
          }
          .db-stat-num {
            font-size: 1.5rem !important;
          }
          /* Balance hero better mobile layout */
          .db-balance-num {
            font-size: 2.4rem !important;
          }
          /* Action buttons stacked look better with slight gap */
          .db-grid-2 {
            gap: 8px !important;
          }
          /* Mobile topbar improved */
          .db-topbar {
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            background: rgba(246,241,233,0.95) !important;
            border-bottom: 1px solid rgba(184,147,90,0.2);
            padding: 0 16px;
          }
          /* Season rows look better on mobile */
          .db-season-row {
            padding: 12px 14px;
          }
          /* Referral section mobile */
          .db-ref-code-row {
            flex-direction: column;
          }
          .db-ref-code { width: 100%; }
          /* Charts slightly shorter on mobile */
          .db-chart-wrap { height: 150px !important; }
          /* Donut wrap on mobile */
          .db-donut-wrap { height: 120px !important; }
          /* Notice strip full width */
          .db-notice-strip {
            border-radius: 10px !important;
          }
        }
        @media (max-width: 500px) {
          .db-grid-4 {
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
          }
          .db-balance-num {
            font-size: 2rem !important;
          }
          .db-mid-grid {
            grid-template-columns: 1fr !important;
          }
        }
        /* Referral card mobile stat grid */
        @media (max-width: 400px) {
          .db-ref-stat-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>

      <div className='db-layout'>
        {/* MOBILE TOPBAR */}
        <div className='db-topbar'>
          <button className='db-hamburger' onClick={() => setSidebarOpen(true)}><span/><span/><span/></button>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <div className='db-logo-mark' style={{width:26,height:26}}/>
            <span className='db-logo-text' style={{fontSize:'1.15rem'}}>Valut<span>X</span></span>
          </div>
          <div className='db-avatar' style={{width:32,height:32,fontSize:'.8rem',cursor:'pointer'}} onClick={() => router.push('/profile')}>
            {(profile?.first_name?.[0]||'')}{(profile?.last_name?.[0]||'')}
          </div>
        </div>

        <main className='db-main'>
          <div style={{maxWidth:900,margin:'0 auto'}}>

            {/* HEADER — Time-based greeting */}
            <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16,marginBottom:28}} className='db-reveal db-greeting-wrap'>
              <div>
                <div style={{marginBottom:4}}>
                  <span className='db-greeting-emoji'>{greeting.emoji}</span>
                  <span className='db-greeting-text'>
                    {greeting.text},<br/>
                    <span className='db-greeting-name'>{firstName}</span>
                  </span>
                </div>
                <div className='db-greeting-sub'>
                  <span className='db-greeting-dot'/>
                  {greeting.sub}
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                <div className='db-live-pill'>
                  <div className='db-live-dot'/>
                  {activeSeasonName ? `${activeSeasonName} Live` : 'No Active Season'}
                </div>
              </div>
            </div>

            {/* LOCKED AMOUNT ALERT */}
            {effectiveLockedAmount > 0 && (
              <div className='db-reveal' style={{ marginBottom: 16, transitionDelay: '.02s' }}>
                <div style={{
                  background: 'rgba(155,90,58,.08)', border: '1px solid rgba(155,90,58,.3)',
                  borderRadius: 10, padding: '14px 18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  flexWrap: 'wrap', gap: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, background: 'rgba(155,90,58,.12)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="16" height="16" fill="none" stroke="rgba(155,90,58,.9)" strokeWidth="2" viewBox="0 0 24 24">
                        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: '.8rem', fontWeight: 500, color: 'var(--ink)', marginBottom: 2 }}>
                        ${effectiveLockedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT is security-locked
                      </div>
                      <div style={{ fontSize: '.68rem', color: 'var(--txt2)' }}>
                        You can invest these funds now · Withdrawal available in {lockCountdown || '—'}
                      </div>
                    </div>
                  </div>
                  <button className='db-btn db-btn-outline' style={{ padding: '8px 16px', fontSize: '.7rem', whiteSpace: 'nowrap' }}
                    onClick={() => router.push('/season')}>
                    <span>Invest Now</span>
                  </button>
                </div>
              </div>
            )}

            {/* BALANCE HERO */}
            <div className='db-balance-hero db-reveal' style={{marginBottom:20,transitionDelay:'.06s'}}>
              {/* Decorative corner accents */}
              <div style={{position:'absolute',top:16,left:16,width:20,height:20,borderTop:'1px solid rgba(184,147,90,0.4)',borderLeft:'1px solid rgba(184,147,90,0.4)',pointerEvents:'none',zIndex:1}}/>
              <div style={{position:'absolute',top:16,right:16,width:20,height:20,borderTop:'1px solid rgba(184,147,90,0.4)',borderRight:'1px solid rgba(184,147,90,0.4)',pointerEvents:'none',zIndex:1}}/>
              <div style={{position:'absolute',bottom:progWidth!=='0%'?52:16,left:16,width:20,height:20,borderBottom:'1px solid rgba(184,147,90,0.25)',borderLeft:'1px solid rgba(184,147,90,0.25)',pointerEvents:'none',zIndex:1}}/>
              <div style={{position:'absolute',bottom:progWidth!=='0%'?52:16,right:16,width:20,height:20,borderBottom:'1px solid rgba(184,147,90,0.25)',borderRight:'1px solid rgba(184,147,90,0.25)',pointerEvents:'none',zIndex:1}}/>

              {/* Top accent line */}
              <div style={{position:'absolute',top:0,left:'10%',right:'10%',height:'1.5px',background:'linear-gradient(90deg,transparent,rgba(184,147,90,0.5),transparent)',pointerEvents:'none'}}/>

              <div style={{display:'flex',flexWrap:'wrap',alignItems:'flex-start',justifyContent:'space-between',gap:16,position:'relative',zIndex:1}}>
                <div>
                  {/* Section label */}
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                    <div style={{width:16,height:1,background:'rgba(184,147,90,0.5)'}}/>
                    <div className='db-balance-label'>Total Portfolio · USDT</div>
                    <div style={{width:16,height:1,background:'rgba(184,147,90,0.5)'}}/>
                  </div>

                  {/* Main balance */}
                  <div className='db-balance-num'>
                    ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>

                  {/* P&L row */}
                  <div className='db-balance-sub' style={{marginTop:10,display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                    <span style={{
                      display:'inline-flex',alignItems:'center',gap:4,
                      background:`${pnlColor(profitsTotal)}22`,
                      border:`1px solid ${pnlColor(profitsTotal)}44`,
                      borderRadius:100,padding:'3px 10px',
                      color:pnlColor(profitsTotal),fontSize:'.72rem',letterSpacing:'.04em',
                    }}>
                      {pnlArrow(profitsTotal)} {fmtPnL(profitsTotal)}
                    </span>
                    <span style={{color:'rgba(246,241,233,0.35)',fontSize:'.68rem'}}>all-time profit</span>
                    {avgRoi !== 0 && (
                      <>
                        <span style={{color:'rgba(184,147,90,0.4)',fontSize:'.65rem'}}>·</span>
                        <span style={{
                          display:'inline-flex',alignItems:'center',gap:4,
                          background:'rgba(184,147,90,0.12)',border:'1px solid rgba(184,147,90,0.3)',
                          borderRadius:100,padding:'3px 10px',
                          color:'var(--gold-l)',fontSize:'.72rem',letterSpacing:'.04em',
                        }}>
                          {avgRoi >= 0 ? '+' : ''}{avgRoi}% avg ROI
                        </span>
                      </>
                    )}
                  </div>

                  {/* Locked amount line */}
                  {effectiveLockedAmount > 0 && (
                    <div style={{marginTop:10,fontSize:'.72rem',color:'rgba(246,241,233,0.45)',display:'flex',alignItems:'center',gap:6}}>
                      <svg width="12" height="12" fill="none" stroke="rgba(184,147,90,0.6)" strokeWidth="2" viewBox="0 0 24 24">
                        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                      </svg>
                      <span>Withdrawable now:&nbsp;
                        <strong style={{color:'rgba(246,241,233,0.75)',fontWeight:500}}>
                          ${effectiveWithdrawable.toLocaleString(undefined,{minimumFractionDigits:2})}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* Right: active season ROI */}
                {activeInvestment && activeSeasonName && (
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{
                      background:'rgba(255,255,255,0.06)',border:'1px solid rgba(184,147,90,0.2)',
                      borderRadius:10,padding:'14px 18px',
                    }}>
                      <div style={{fontSize:'.58rem',letterSpacing:'.18em',textTransform:'uppercase',color:'rgba(246,241,233,0.35)',marginBottom:6}}>
                        {activeSeasonName}
                      </div>
                      {/* FIX: removed the extra % — roi_range already contains % */}
                      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.8rem',fontWeight:300,color:'rgba(246,241,233,0.88)',lineHeight:1}}>
                        {activeSeasonRoi}
                      </div>
                      <div style={{fontSize:'.6rem',letterSpacing:'.1em',textTransform:'uppercase',color:'rgba(246,241,233,0.3)',marginTop:4}}>
                        Projected ROI
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Season progress bar */}
              {activeInvestment && activeSeasonStart && (
                <div style={{marginTop:22,position:'relative',zIndex:1}}>
                  {/* Progress label row */}
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'.65rem',color:'rgba(246,241,233,0.3)',letterSpacing:'.06em',textTransform:'uppercase',marginBottom:6,alignItems:'center'}}>
                    <div style={{display:'flex',alignItems:'center',gap:5}}>
                      <div style={{width:6,height:6,borderRadius:'50%',background:'var(--sage)',opacity:0.7,animation:'dbLivePulse 1.8s ease-in-out infinite'}}/>
                      <span>Season Progress</span>
                    </div>
                    <span style={{color:'var(--gold-l)',fontWeight:500}}>{progWidth}</span>
                  </div>
                  <div className='db-prog-track'><div className='db-prog-fill' style={{width:progWidth}}/></div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'.64rem',color:'rgba(246,241,233,0.2)',marginTop:5}}>
                    <span>Entry ${myInvestAmount.toLocaleString()}</span>
                    <span>Target {activeSeasonRoi}</span>
                  </div>
                </div>
              )}
            </div>

            {/* STAT CARDS */}
            <div className='db-grid-4 db-reveal' style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20,transitionDelay:'.1s'}}>
              {([
                {
                  bg:'rgba(184,147,90,0.1)', svgColor:'var(--gold)',
                  icon:<><rect x='2' y='7' width='20' height='14' rx='2'/><path d='M16 7V5a2 2 0 00-4 0v2'/></>,
                  lbl:'Invested', val:`$${investedTotal.toLocaleString()}`, sub:'all seasons', cls:'db-stat-gold',
                },
                {
                  bg:'rgba(74,103,65,0.1)', svgColor:'var(--sage)',
                  icon:<path d='M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6'/>,
                  lbl:'Withdrawable',
                  val:`$${effectiveWithdrawable.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                  sub: effectiveLockedAmount > 0 ? `$${effectiveLockedAmount.toLocaleString()} locked` : 'available now',
                  cls:'db-stat-up',
                },
                {
                  bg: pnlBg(profitsTotal), svgColor: pnlStroke(profitsTotal),
                  icon:<><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
                  lbl:'Total Profits', val: fmtPnL(profitsTotal), sub:'all time', cls: pnlCls(profitsTotal),
                },
                {
                  bg: effectiveLockedAmount > 0 ? 'rgba(155,90,58,.1)' : 'rgba(74,103,65,.08)',
                  svgColor: effectiveLockedAmount > 0 ? 'rgba(155,90,58,.9)' : 'var(--sage)',
                  icon: effectiveLockedAmount > 0
                    ? <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>
                    : <><rect x="3" y="11" width="18" height="11" rx="2" opacity=".4"/><path d="M8 11V8a4 4 0 018 0" opacity=".4"/></>,
                  lbl: 'Locked Amount',
                  val: effectiveLockedAmount > 0 ? `$${effectiveLockedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '$0.00',
                  sub: effectiveLockedAmount > 0 ? `Available in ${lockCountdown || '—'}` : 'No funds locked',
                  cls: '',
                  chColor: effectiveLockedAmount > 0 ? 'rgba(155,90,58,.9)' : 'var(--sage)',
                },
              ] as {bg:string;svgColor:string;icon:React.ReactNode;lbl:string;val:string;sub:string;cls:string;chColor?:string}[]).map((s,i) => (
                <div key={i} className='db-card db-card-hover' style={{padding:'18px 16px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
                    <div style={{width:26,height:26,background:s.bg,borderRadius:'var(--r)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <svg width='13' height='13' fill='none' stroke={s.svgColor} strokeWidth='1.8' viewBox='0 0 24 24'>{s.icon}</svg>
                    </div>
                    <span style={{fontSize:'.67rem',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--txt2)'}}>{s.lbl}</span>
                  </div>
                  <div className={`db-stat-num ${s.cls}`} style={s.chColor ? { color: s.chColor } : {}}>{s.val}</div>
                  <div style={{fontSize:'.7rem',color: s.chColor || 'var(--txt3)',marginTop:5}}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* ACTION BUTTONS */}
            <div className='db-grid-2 db-reveal' style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20,transitionDelay:'.13s'}}>
              <button className='db-btn db-btn-dark' onClick={() => router.push('/deposit')}><span>+ Deposit</span></button>
              <button className='db-btn db-btn-outline' onClick={() => router.push('/withdraw')}>Withdraw →</button>
            </div>

            {/* CHART + SEASONS */}
            <div className='db-mid-grid db-reveal' style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20}}>
              <div className='db-card' style={{padding:'22px 20px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
                  <div>
                    <span className='db-label'>Performance</span>
                    <div className='db-section-title' style={{fontSize:'1.1rem'}}>Profit Trend</div>
                  </div>
                </div>
                <div className='db-chart-wrap'><canvas ref={chartRef}/></div>
                <div className='db-divider' style={{margin:'16px 0 14px'}}/>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  {[
                    { l:'Best', v: bestRoi !== null ? `${bestRoi >= 0 ? '+' : ''}${bestRoi}%` : 'N/A', c: bestRoi !== null ? pnlColor(bestRoi) : 'var(--txt3)' },
                    { l:'Avg',  v: historyInvestments.length === 0 ? '—' : `${avgRoi >= 0 ? '+' : ''}${avgRoi}%`, c: historyInvestments.length === 0 ? 'var(--txt3)' : pnlColor(avgRoi) },
                    { l:'Seasons', v: historyInvestments.length + (activeInvestment ? 1 : 0), c:'var(--ink)' },
                  ].map((x,i)=>(
                    <div key={i} style={{textAlign:i===2?'right':i===1?'center':'left'}}>
                      <div style={{fontSize:'.67rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--txt3)'}}>{x.l}</div>
                      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.1rem',fontWeight:500,color:x.c}}>{x.v}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className='db-card' style={{padding:'22px 20px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
                  <div>
                    <span className='db-label'>History</span>
                    <div className='db-section-title' style={{fontSize:'1.1rem'}}>Seasons</div>
                  </div>
                  <button onClick={() => router.push('/season')} style={{fontSize:'.68rem',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--gold)',background:'none',border:'none',cursor:'pointer'}}>All →</button>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {historyInvestments.length === 0 && !activeInvestment ? (
                    <div style={{textAlign:'center',padding:'20px 0',color:'var(--txt3)',fontSize:'.8rem'}}>No investment history yet.</div>
                  ) : (
                    <>
                      {historyInvestments.map((s,i) => {
                        const roi = Number(s.seasons?.final_roi || 0)
                        return (
                          <div key={i} className='db-season-row'>
                            <div style={{display:'flex',alignItems:'center',gap:11}}>
                              <div className='db-season-badge' style={{background: pnlBg(roi), border:`1px solid ${pnlColor(roi)}33`, color: pnlColor(roi)}}>
                                {(s.seasons?.name||'').split(' ').map((w:string)=>w[0]).join('')}
                              </div>
                              <div>
                                <div style={{fontSize:'.82rem',fontWeight:500,color:'var(--ink)'}}>{s.seasons?.name||'—'}</div>
                                <div style={{fontSize:'.68rem',color:'var(--txt3)'}}>{s.seasons?.period||''}</div>
                              </div>
                            </div>
                            <div style={{textAlign:'right'}}>
                              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.1rem',color: pnlColor(roi),fontWeight:500}}>
                                {roi >= 0 ? '+' : ''}{roi}%
                              </div>
                              <div className='db-tag' style={{marginTop:3,background: pnlBg(roi),border:`1px solid ${pnlColor(roi)}33`,color: pnlColor(roi)}}>
                                {roi >= 0 ? 'Profit' : 'Loss'}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      {activeInvestment && (
                        <div className='db-season-row' style={{borderColor:'rgba(184,147,90,0.25)',background:'rgba(184,147,90,0.04)'}}>
                          <div style={{display:'flex',alignItems:'center',gap:11}}>
                            <div className='db-season-badge' style={{background:'rgba(184,147,90,0.12)',border:'1px solid rgba(184,147,90,0.35)',color:'var(--gold)',position:'relative'}}>
                              {(activeInvestment.seasons?.name||'').split(' ').map((w:string)=>w[0]).join('')}
                              <div className='db-live-dot' style={{position:'absolute',top:-3,right:-3,width:6,height:6,background:'var(--sage)'}}/>
                            </div>
                            <div>
                              <div style={{fontSize:'.82rem',fontWeight:500,color:'var(--ink)'}}>{activeInvestment.seasons?.name||'—'}</div>
                              <div style={{fontSize:'.68rem',color:'var(--txt3)'}}>
                                {activeInvestment.seasons?.status === 'running' ? `Day ${daysElapsed} · Running` : 'Entry Open'}
                              </div>
                            </div>
                          </div>
                          <div style={{textAlign:'right'}}>
                            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.1rem',color:'var(--gold-l)',fontWeight:500}}>{activeSeasonRoi}</div>
                            <div className='db-tag db-tag-live' style={{marginTop:3}}>Active</div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* REFERRAL CARD */}
            <div className='db-card db-reveal' style={{padding:'24px 22px',marginBottom:20,transitionDelay:'.18s'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr auto',alignItems:'start',gap:16,marginBottom:20}}>
                <div>
                  <span className='db-label'>Passive Income</span>
                  <div className='db-section-title'>Referral Programme</div>
                  <div style={{fontSize:'.82rem',color:'var(--txt2)',marginTop:6,lineHeight:1.7,fontWeight:300}}>
                    Earn {commRate}% commission on every <strong>profit</strong> earned by your referred investors — automatically credited to your wallet.
                  </div>
                </div>
                <div style={{width:44,height:44,background:'var(--ink)',borderRadius:'var(--r)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <svg width='20' height='20' fill='none' stroke='var(--gold)' strokeWidth='1.6' viewBox='0 0 24 24'>
                    <path d='M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2'/><circle cx='9' cy='7' r='4'/>
                    <path d='M23 21v-2a4 4 0 00-3-3.87'/><path d='M16 3.13a4 4 0 010 7.75'/>
                  </svg>
                </div>
              </div>
              <div style={{display:'flex',gap:8,marginBottom:18}} className='db-ref-copy-row'>
                <div className='db-ref-code'>{refCode}</div>
                <button className='db-copy-btn' onClick={copyRef}>Copy</button>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:2}} className='db-ref-stat-grid'>
                {[
                  {l:'Referrals',          v:referralStats.count.toString(), c:'var(--ink)'},
                  {l:'Commission Earned',  v:`$${referralStats.earned.toLocaleString()}`, c:'var(--sage)'},
                  {l:'Rate',               v:`${commRate}%`,                 c:'var(--gold)'},
                ].map((r,i) => (
                  <div key={i} style={{background:'var(--parchment)',border:'1px solid var(--border)',padding:'14px 16px',borderRadius:'var(--r)'}}>
                    <div style={{fontSize:'.67rem',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--txt3)',marginBottom:6}}>{r.l}</div>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.6rem',fontWeight:400,color:r.c}}>{r.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* NOTICE STRIP */}
            {activeSeason && (
              <div className='db-reveal db-notice-strip' style={{background:'var(--ink)',borderRadius:'var(--r-lg)',padding:'18px 22px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap',transitionDelay:'.22s'}}>
                <div>
                  <div style={{fontSize:'.68rem',letterSpacing:'.16em',textTransform:'uppercase',color:'rgba(246,241,233,.35)',marginBottom:5}}>
                    {activeSeason.name} · {activeSeason.status === 'open' ? 'Entry Open' : 'Live'}
                  </div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.15rem',fontWeight:400,color:'var(--cream)'}}>
                    {activeSeason.status === 'open'
                      ? `Entries open for ${activeSeason.name}. Pool at ${((Number(activeSeason.current_pool)/Number(activeSeason.pool_cap))*100).toFixed(1)}% capacity.`
                      : `${activeSeason.name} is currently running.`
                    }
                  </div>
                </div>
                {activeSeason.status === 'open' && (
                  <button className='db-btn db-btn-dark' style={{whiteSpace:'nowrap',flexShrink:0}} onClick={() => router.push('/season')}>
                    <span>Invest Now</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  )
}