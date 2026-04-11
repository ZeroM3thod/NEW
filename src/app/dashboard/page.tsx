'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import UserSidebar from '@/components/UserSidebar'
import { createClient } from '@/utils/supabase/client'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window {
    Chart: any
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  /* ── State ── */
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [toastShow, setToastShow] = useState(false)
  const [displayBalance, setDisplayBalance] = useState('$0.00')
  const [progWidth, setProgWidth] = useState('0%')
  const [chartMode, setChartMode] = useState<'roi' | 'usdt'>('roi')
  const [chartReady, setChartReady] = useState(false)

  /* ── User & Data State ── */
  const [profile, setProfile] = useState<any>(null)
  const [activeInvestment, setActiveInvestment] = useState<any>(null)
  const [historyInvestments, setHistoryInvestments] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [allSeasons, setAllSeasons] = useState<any[]>([])
  const [referralStats, setReferralStats] = useState({ count: 0, earned: 0 })
  const [activeSeason, setActiveSeason] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  /* ── Refs ── */
  const bgCanvasRef = useRef<HTMLCanvasElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const balAnimRef = useRef<number>(0)
  const chartRef = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartInstance = useRef<any>(null)
  const balanceRef = useRef(0)

  /* ── Fetch Data ── */
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      // 1. Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profileData) {
        setProfile(profileData)
        balanceRef.current = profileData.balance || 0
        setDisplayBalance('$' + balanceRef.current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
      }

      // 2. Fetch Active Investment & Season
      const { data: investments } = await supabase
        .from('investments')
        .select('*, seasons(*)')
        .eq('user_id', user.id)
      
      if (investments) {
        const active = investments.find(inv => inv.status === 'active')
        setActiveInvestment(active)
        setHistoryInvestments(investments.filter(inv => inv.status === 'completed'))
        
        // Update progress bar if active investment exists
        if (active && active.seasons) {
          const start = new Date(active.seasons.start_date).getTime()
          const now = new Date().getTime()
          const diff = now - start
          const days = Math.floor(diff / (1000 * 60 * 60 * 24))
          const progress = Math.min(100, Math.max(0, (days / active.seasons.duration_days) * 100))
          setProgWidth(progress.toFixed(1) + '%')
        }
      }

      // 3. Fetch All Seasons (for the banner and stats)
      const { data: seasons } = await supabase
        .from('seasons')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (seasons) {
        setAllSeasons(seasons)
        const current = seasons.find(s => s.status === 'running') || seasons.find(s => s.status === 'open')
        setActiveSeason(current)
      }

      // 4. Fetch Referral Stats
      const { data: referrals } = await supabase
        .from('profiles')
        .select('id')
        .eq('referred_by', user.id)
      
      setReferralStats({
        count: referrals?.length || 0,
        earned: profileData?.profits_total || 0 // Re-using profits or similar if commission table not present
      })

      setLoading(false)
    }

    fetchData()
  }, [router, supabase])

  /* ── Helper for Days ── */
  const getDaysElapsed = (startDate: string) => {
    const start = new Date(startDate).getTime()
    const now = new Date().getTime()
    const diff = now - start
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  /* ── Toast ── */
  const showToast = useCallback((msg: string) => {
    setToastMsg('✓  ' + msg)
    setToastShow(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastShow(false), 3200)
  }, [])

  /* ── Balance animation ── */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const animBal = useCallback((target: number, dur = 1100) => {
    const from = balanceRef.current
    const t0 = performance.now()
    if (balAnimRef.current) cancelAnimationFrame(balAnimRef.current)
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1)
      const e = 1 - Math.pow(1 - p, 3)
      const v = from + (target - from) * e
      setDisplayBalance(
        '$' + v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','),
      )
      if (p < 1) {
        balAnimRef.current = requestAnimationFrame(tick)
      } else {
        balanceRef.current = target
      }
    }
    balAnimRef.current = requestAnimationFrame(tick)
  }, [])

  /* ── Background canvas ── */
  useEffect(() => {
    const bgC = bgCanvasRef.current
    if (!bgC) return
    const bgX = bgC.getContext('2d')
    if (!bgX) return
    type Candle = {
      x: number
      y: number
      w: number
      h: number
      up: boolean
      spd: number
      phase: number
      wick: number
    }
    type Wave = {
      pts: { x: number; y: number }[]
      spd: number
      phase: number
      amp: number
    }
    let BW = 0,
      BH = 0,
      candles: Candle[] = [],
      waves: Wave[] = [],
      bT = 0,
      animId = 0
    const initC = () => {
      candles = []
      const n = Math.max(8, Math.floor(BW / 52))
      for (let i = 0; i < n; i++)
        candles.push({
          x: (i / n) * BW + Math.random() * 30,
          y: BH * 0.28 + Math.random() * BH * 0.5,
          w: 10 + Math.random() * 7,
          h: 18 + Math.random() * 58,
          up: Math.random() > 0.42,
          spd: 0.18 + Math.random() * 0.35,
          phase: Math.random() * Math.PI * 2,
          wick: 7 + Math.random() * 18,
        })
    }
    const initW = () => {
      waves = []
      for (let i = 0; i < 4; i++) {
        const pts: { x: number; y: number }[] = []
        for (let x = 0; x <= BW; x += 38)
          pts.push({ x, y: BH * (0.18 + i * 0.17) + Math.random() * 55 })
        waves.push({
          pts,
          spd: 0.12 + i * 0.04,
          phase: i * 1.1,
          amp: 16 + i * 7,
        })
      }
    }
    const resize = () => {
      BW = bgC.width = window.innerWidth
      BH = bgC.height = window.innerHeight
      initC()
      initW()
    }
    const anim = () => {
      bgX.clearRect(0, 0, BW, BH)
      bT += 0.011
      waves.forEach((w, i) => {
        bgX.beginPath()
        w.pts.forEach((p, j) => {
          const y = p.y + Math.sin(bT * w.spd + j * 0.28 + w.phase) * w.amp
          if (j === 0) bgX.moveTo(p.x, y)
          else bgX.lineTo(p.x, y)
        })
        bgX.strokeStyle =
          i % 2 === 0 ? 'rgba(74,103,65,0.9)' : 'rgba(184,147,90,0.7)'
        bgX.lineWidth = 0.9
        bgX.stroke()
      })
      candles.forEach((c) => {
        const bob = Math.sin(bT * c.spd + c.phase) * 7,
          x = c.x,
          y = c.y + bob
        bgX.strokeStyle = 'rgba(28,28,28,0.9)'
        bgX.lineWidth = 0.9
        bgX.beginPath()
        bgX.moveTo(x + c.w / 2, y - c.wick)
        bgX.lineTo(x + c.w / 2, y + c.h + c.wick)
        bgX.stroke()
        bgX.fillStyle = c.up ? 'rgba(74,103,65,0.85)' : 'rgba(184,147,90,0.8)'
        bgX.fillRect(x, y, c.w, c.h)
        bgX.strokeStyle = c.up ? 'rgba(74,103,65,1)' : 'rgba(184,147,90,1)'
        bgX.lineWidth = 0.6
        bgX.strokeRect(x, y, c.w, c.h)
      })
      animId = requestAnimationFrame(anim)
    }
    window.addEventListener('resize', resize)
    resize()
    anim()
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animId)
    }
  }, [])

  /* ── Chart.js init ── */
  const initChart = useCallback(() => {
    if (!chartRef.current || !window.Chart || !profile) return
    const ctx = chartRef.current.getContext('2d')
    if (!ctx) return
    const grad = (c1: string, c2: string) => {
      const g = ctx.createLinearGradient(0, 0, 0, 200)
      g.addColorStop(0, c1)
      g.addColorStop(1, c2)
      return g
    }

    // Process real historical data for chart
    const historicalData = [...historyInvestments].sort((a, b) => new Date(a.seasons.start_date).getTime() - new Date(b.seasons.start_date).getTime())
    if (activeInvestment) historicalData.push(activeInvestment)

    const labels = historicalData.map(inv => inv.seasons.name.split(' ').map((word: string) => word[0]).join('') + (inv.status === 'active' ? ' est' : ''))
    const roiData = historicalData.map(inv => inv.status === 'active' ? parseFloat(inv.seasons.roi_range.split('–')[0]) : inv.seasons.final_roi || 0)

    chartInstance.current = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['S1', 'S2', 'S3'],
        datasets: [
          {
            data: roiData.length ? roiData : [0, 0, 0],
            fill: true,
            backgroundColor: grad('rgba(74,103,65,0.15)', 'rgba(74,103,65,0)'),
            borderColor: '#4a6741',
            borderWidth: 2,
            pointBackgroundColor: '#4a6741',
            pointBorderColor: '#faf7f2',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(28,28,28,0.92)',
            borderColor: 'rgba(184,147,90,0.3)',
            borderWidth: 1,
            titleColor: '#d4aa72',
            bodyColor: '#f6f1e9',
            titleFont: { family: 'DM Sans', size: 11, weight: '500' },
            bodyFont: { family: 'DM Sans', size: 12 },
            padding: 12,
            callbacks: { label: (c: { raw: number }) => `  ROI: +${c.raw}%` },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(184,147,90,0.06)', drawBorder: false },
            ticks: { color: '#9c9186', font: { family: 'DM Sans', size: 10 } },
          },
          y: {
            grid: { color: 'rgba(184,147,90,0.06)', drawBorder: false },
            ticks: {
              color: '#9c9186',
              font: { family: 'DM Sans', size: 10 },
              callback: (v: number) => v + '%',
            },
          },
        },
        interaction: { intersect: false, mode: 'index' },
      },
    })
  }, [profile, activeInvestment, historyInvestments])

  useEffect(() => {
    if (chartReady) initChart()
  }, [chartReady, initChart])

  /* ── Switch chart ── */
  const switchChart = useCallback((mode: 'roi' | 'usdt') => {
    if (!chartInstance.current || !chartRef.current) return
    const ctx = chartRef.current.getContext('2d')
    if (!ctx) return
    const grad = (c1: string, c2: string) => {
      const g = ctx.createLinearGradient(0, 0, 0, 200)
      g.addColorStop(0, c1)
      g.addColorStop(1, c2)
      return g
    }

    const historicalData = [...historyInvestments].sort((a, b) => new Date(a.seasons.start_date).getTime() - new Date(b.seasons.start_date).getTime())
    if (activeInvestment) historicalData.push(activeInvestment)

    const roiData = historicalData.map(inv => inv.status === 'active' ? parseFloat(inv.seasons.roi_range.split('–')[0]) : inv.seasons.final_roi || 0)
    const usdtData = historicalData.map(inv => inv.status === 'active' ? inv.amount * (parseFloat(inv.seasons.roi_range.split('–')[0]) / 100) : inv.amount * ((inv.seasons.final_roi || 0) / 100))

    const datasets = {
      roi: roiData.length ? roiData : [0,0,0],
      usdt: usdtData.length ? usdtData : [0,0,0],
    }
    
    chartInstance.current.data.datasets[0].data = datasets[mode]
    if (mode === 'usdt') {
      chartInstance.current.data.datasets[0].borderColor = '#b8935a'
      chartInstance.current.data.datasets[0].pointBackgroundColor = '#b8935a'
      chartInstance.current.data.datasets[0].backgroundColor = grad(
        'rgba(184,147,90,0.14)',
        'rgba(184,147,90,0)',
      )
    } else {
      chartInstance.current.data.datasets[0].borderColor = '#4a6741'
      chartInstance.current.data.datasets[0].pointBackgroundColor = '#4a6741'
      chartInstance.current.data.datasets[0].backgroundColor = grad(
        'rgba(74,103,65,0.15)',
        'rgba(74,103,65,0)',
      )
    }
    chartInstance.current.options.scales.y.ticks.callback = (v: number) =>
      mode === 'roi' ? v + '%' : '$' + v
    chartInstance.current.options.plugins.tooltip.callbacks.label = (c: {
      raw: number
    }) =>
      mode === 'roi'
        ? `  ROI: +${c.raw}%`
        : `  Profit: +$${c.raw.toLocaleString()}`
    chartInstance.current.update('active')
    setChartMode(mode)
  }, [activeInvestment, historyInvestments])

  /* ── ESC / scroll lock / reveal ── */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false)
      }
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [])
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('show')
            obs.unobserve(e.target)
          }
        }),
      { threshold: 0.12 },
    )
    document
      .querySelectorAll<HTMLElement>('.db-reveal')
      .forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  /* ── Copy referral ── */
  const copyRef = () => {
    const code = profile?.referral_code || 'VAULT-X'
    const fb = () => {
      const ta = document.createElement('textarea')
      ta.value = code
      ta.style.position = 'absolute'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
        showToast('Referral code copied')
      } catch {
        showToast('Copy failed')
      }
      document.body.removeChild(ta)
    }
    navigator.clipboard
      ?.writeText(code)
      .then(() => showToast('Referral code copied'))
      .catch(fb) ?? fb()
  }

  /* ════════════════════════════════════════════════ */
  if (loading) return <div className="db-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--txt2)', background: 'var(--cream)' }}>Loading Dashboard...</div>

  return (
    <>
      <Script
        src='https://cdn.jsdelivr.net/npm/chart.js'
        onReady={() => setChartReady(true)}
      />
      <canvas
        ref={bgCanvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          opacity: 0.055,
          width: '100%',
          height: '100%',
        }}
      />
      <div className={`db-toast${toastShow ? ' show' : ''}`}>{toastMsg}</div>
      <UserSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className='db-layout'>
        {/* MOBILE TOPBAR */}
        <div className='db-topbar'>
          <button className='db-hamburger' onClick={() => setSidebarOpen(true)}>
            <span />
            <span />
            <span />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className='db-logo-mark' style={{ width: 26, height: 26 }} />
            <span className='db-logo-text' style={{ fontSize: '1.15rem' }}>
              Vault<span>X</span>
            </span>
          </div>
          <div
            className='db-avatar'
            style={{
              width: 32,
              height: 32,
              fontSize: '.8rem',
              cursor: 'pointer',
            }}
            onClick={() => router.push('/profile')}
          >
            {profile?.first_name?.[0]}{profile?.last_name?.[0]}
          </div>
        </div>

        {/* MAIN */}
        <main className='db-main'>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            {/* HEADER */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                gap: 16,
                marginBottom: 28,
              }}
              className='db-reveal'
            >
              <div>
                <span className='db-label'>Overview</span>
                <h1
                  style={{
                    fontFamily: "'Cormorant Garamond',serif",
                    fontSize: 'clamp(1.6rem,4vw,2.2rem)',
                    fontWeight: 400,
                    color: 'var(--ink)',
                    lineHeight: 1.15,
                  }}
                >
                  Good morning,
                  <br />
                  <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>
                    {profile?.first_name}
                  </em>
                </h1>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexShrink: 0,
                }}
              >
                <div className='db-live-pill'>
                  <div className='db-live-dot' />
                  {activeInvestment ? `${activeInvestment.seasons.name} Live` : 'Not Joined'}
                </div>
              </div>
            </div>

            {/* BALANCE HERO */}
            <div
              className='db-balance-hero db-reveal'
              style={{ marginBottom: 20, transitionDelay: '.06s' }}
            >
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <div>
                  <div className='db-balance-label' style={{ marginBottom: 8 }}>
                    Total Portfolio · USDT
                  </div>
                  <div className='db-balance-num'>{displayBalance}</div>
                  <div className='db-balance-sub' style={{ marginTop: 8 }}>
                    <span style={{ color: '#6a8c60' }}>↑ +${profile?.profits_total?.toLocaleString() || '0'}</span>
                    &nbsp;·&nbsp;all-time profit&nbsp;·&nbsp;
                    <span style={{ color: 'var(--gold-l)' }}>
                      +{profile?.avg_roi || '0'}% avg ROI
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className='db-balance-label' style={{ marginBottom: 6 }}>
                    {activeInvestment?.seasons.name || 'No Active Season'}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Cormorant Garamond',serif",
                      fontSize: '1.9rem',
                      fontWeight: 300,
                      color: 'rgba(246,241,233,0.85)',
                    }}
                  >
                    {activeInvestment ? `Day ${getDaysElapsed(activeInvestment.seasons.start_date)}` : '—'}
                  </div>
                  <div className='db-balance-sub'>{activeInvestment ? `of ${activeInvestment.seasons.duration_days} days` : 'Not joined yet'}</div>
                </div>
              </div>
              <div style={{ marginTop: 24, position: 'relative', zIndex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '.7rem',
                    color: 'rgba(246,241,233,0.35)',
                    letterSpacing: '.06em',
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}
                >
                  <span>Season Progress</span>
                  <span style={{ color: 'var(--gold-l)' }}>{progWidth}</span>
                </div>
                <div className='db-prog-track'>
                  <div className='db-prog-fill' style={{ width: progWidth }} />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '.68rem',
                    color: 'rgba(246,241,233,0.25)',
                    marginTop: 6,
                  }}
                >
                  <span>Entry ${activeInvestment?.amount.toLocaleString() || '0'}</span>
                  <span>Target {activeInvestment?.seasons.roi_range || '...'}</span>
                </div>
              </div>
            </div>

            {/* STAT CARDS */}
            <div
              className='db-grid-4 db-reveal'
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4,1fr)',
                gap: 10,
                marginBottom: 20,
                transitionDelay: '.1s',
              }}
            >
              {(
                [
                  {
                    bg: 'rgba(184,147,90,0.1)',
                    stroke: 'var(--gold)',
                    icon: (
                      <>
                        <rect x='2' y='7' width='20' height='14' rx='2' />
                        <path d='M16 7V5a2 2 0 00-4 0v2' />
                      </>
                    ),
                    lbl: 'Invested',
                    val: `$${profile?.invested_total?.toLocaleString() || '0'}`,
                    sub: 'all seasons',
                    cls: 'db-stat-gold',
                  },
                  {
                    bg: 'rgba(74,103,65,0.1)',
                    stroke: 'var(--sage)',
                    icon: (
                      <path d='M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' />
                    ),
                    lbl: 'Withdrawable',
                    val: `$${profile?.withdrawable_total?.toLocaleString() || '0'}`,
                    sub: 'available now',
                    cls: 'db-stat-up',
                  },
                  {
                    bg: 'rgba(74,103,65,0.08)',
                    stroke: 'var(--sage-l)',
                    icon: (
                      <>
                        <polyline points='23 6 13.5 15.5 8.5 10.5 1 18' />
                        <polyline points='17 6 23 6 23 12' />
                      </>
                    ),
                    lbl: 'Total Profits',
                    val: `+$${profile?.profits_total?.toLocaleString() || '0'}`,
                    sub: 'all time',
                    cls: 'db-stat-up',
                  },
                  {
                    bg: 'rgba(184,147,90,0.08)',
                    stroke: 'var(--gold)',
                    icon: (
                      <>
                        <line x1='12' y1='20' x2='12' y2='10' />
                        <line x1='18' y1='20' x2='18' y2='4' />
                        <line x1='6' y1='20' x2='6' y2='16' />
                      </>
                    ),
                    lbl: 'Avg ROI',
                    val: `+${profile?.avg_roi || '0'}%`,
                    sub: `${historyInvestments.length} seasons`,
                    cls: 'db-stat-gold',
                  },
                ] as {
                  bg: string
                  stroke: string
                  icon: React.ReactNode
                  lbl: string
                  val: string
                  sub: string
                  cls: string
                }[]
              ).map((s, i) => (
                <div
                  key={i}
                  className='db-card db-card-hover'
                  style={{ padding: '18px 16px' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        background: s.bg,
                        borderRadius: 'var(--r)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg
                        width='13'
                        height='13'
                        fill='none'
                        stroke={s.stroke}
                        strokeWidth='1.8'
                        viewBox='0 0 24 24'
                      >
                        {s.icon}
                      </svg>
                    </div>
                    <span
                      style={{
                        fontSize: '.67rem',
                        letterSpacing: '.12em',
                        textTransform: 'uppercase',
                        color: 'var(--txt2)',
                      }}
                    >
                      {s.lbl}
                    </span>
                  </div>
                  <div className={`db-stat-num ${s.cls}`}>{s.val}</div>
                  <div
                    style={{
                      fontSize: '.7rem',
                      color: 'var(--txt3)',
                      marginTop: 5,
                    }}
                  >
                    {s.sub}
                  </div>
                </div>
              ))}
            </div>

            {/* ACTION BUTTONS */}
            <div
              className='db-grid-2 db-reveal'
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                marginBottom: 20,
                transitionDelay: '.13s',
              }}
            >
              <button
                className='db-btn db-btn-dark'
                onClick={() => router.push('/deposit')}
              >
                <span>+ Deposit</span>
              </button>
              <button
                className='db-btn db-btn-outline'
                onClick={() => router.push('/withdraw')}
              >
                Withdraw →
              </button>
            </div>

            {/* CHART + SEASONS */}
            <div
              className='db-mid-grid db-reveal'
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 14,
                marginBottom: 20,
              }}
            >
              {/* CHART */}
              <div className='db-card' style={{ padding: '22px 20px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 18,
                  }}
                >
                  <div>
                    <span className='db-label'>Performance</span>
                    <div
                      className='db-section-title'
                      style={{ fontSize: '1.1rem' }}
                    >
                      Profit Trend
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className={`db-chart-tab${chartMode === 'roi' ? ' active' : ''}`}
                      onClick={() => switchChart('roi')}
                    >
                      ROI%
                    </button>
                    <button
                      className={`db-chart-tab${chartMode === 'usdt' ? ' active' : ''}`}
                      onClick={() => switchChart('usdt')}
                    >
                      USDT
                    </button>
                  </div>
                </div>
                <div className='db-chart-wrap'>
                  <canvas ref={chartRef} />
                </div>
                <div className='db-divider' style={{ margin: '16px 0 14px' }} />
                <div
                  style={{ display: 'flex', justifyContent: 'space-between' }}
                >
                  {[
                    { l: 'Best', v: historyInvestments.length ? `S${historyInvestments.reduce((max, inv) => Math.max(max, (inv.seasons?.final_roi || 0)), 0)}` : 'N/A', c: 'var(--sage)' },
                    { l: 'Avg', v: `+${profile?.avg_roi || '0'}%`, c: 'var(--gold)' },
                    { l: 'Seasons', v: historyInvestments.length + (activeInvestment ? 1 : 0), c: 'var(--ink)' },
                  ].map((x, i) => (
                    <div
                      key={i}
                      style={{
                        textAlign:
                          i === 2 ? 'right' : i === 1 ? 'center' : 'left',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '.67rem',
                          textTransform: 'uppercase',
                          letterSpacing: '.1em',
                          color: 'var(--txt3)',
                        }}
                      >
                        {x.l}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Cormorant Garamond',serif",
                          fontSize: '1.1rem',
                          fontWeight: 500,
                          color: x.c,
                        }}
                      >
                        {x.v}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SEASONS */}
              <div className='db-card' style={{ padding: '22px 20px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 18,
                  }}
                >
                  <div>
                    <span className='db-label'>History</span>
                    <div
                      className='db-section-title'
                      style={{ fontSize: '1.1rem' }}
                    >
                      Seasons
                    </div>
                  </div>
                  <button
                    onClick={() => router.push('/season')}
                    style={{
                      fontSize: '.68rem',
                      letterSpacing: '.1em',
                      textTransform: 'uppercase',
                      color: 'var(--gold)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    All →
                  </button>
                </div>
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                  {historyInvestments.map((s, i) => (
                    <div key={i} className='db-season-row'>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 11,
                        }}
                      >
                        <div
                          className='db-season-badge'
                          style={{
                            background: 'rgba(74,103,65,0.1)',
                            border: '1px solid rgba(74,103,65,0.2)',
                            color: 'var(--sage)',
                          }}
                        >
                          {s.seasons.name.split(' ').map((word: string) => word[0]).join('')}
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: '.82rem',
                              fontWeight: 500,
                              color: 'var(--ink)',
                            }}
                          >
                            {s.seasons.name}
                          </div>
                          <div
                            style={{ fontSize: '.68rem', color: 'var(--txt3)' }}
                          >
                            {s.seasons.period}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontFamily: "'Cormorant Garamond',serif",
                            fontSize: '1.1rem',
                            color: 'var(--sage)',
                            fontWeight: 500,
                          }}
                        >
                          +{s.seasons.final_roi}%
                        </div>
                        <div
                          className={`db-tag db-tag-sage`}
                          style={{ marginTop: 3 }}
                        >
                          Done
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Active Investment */}
                  {activeInvestment && (
                    <div
                      className='db-season-row'
                      style={{
                        borderColor: 'rgba(184,147,90,0.25)',
                        background: 'rgba(184,147,90,0.04)',
                      }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 11 }}
                      >
                        <div
                          className='db-season-badge'
                          style={{
                            background: 'rgba(184,147,90,0.12)',
                            border: '1px solid rgba(184,147,90,0.35)',
                            color: 'var(--gold)',
                            position: 'relative',
                          }}
                        >
                          {activeInvestment.seasons.name.split(' ').map((word: string) => word[0]).join('')}
                          <div
                            className='db-live-dot'
                            style={{
                              position: 'absolute',
                              top: -3,
                              right: -3,
                              width: 6,
                              height: 6,
                              background: 'var(--sage)',
                            }}
                          />
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: '.82rem',
                              fontWeight: 500,
                              color: 'var(--ink)',
                            }}
                          >
                            {activeInvestment.seasons.name}
                          </div>
                          <div
                            style={{ fontSize: '.68rem', color: 'var(--txt3)' }}
                          >
                            Day {getDaysElapsed(activeInvestment.seasons.start_date)} / {activeInvestment.seasons.duration_days}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontFamily: "'Cormorant Garamond',serif",
                            fontSize: '1.1rem',
                            color: 'var(--gold-l)',
                            fontWeight: 500,
                          }}
                        >
                          {activeInvestment.seasons.roi_range}
                        </div>
                        <div
                          className='db-tag db-tag-live'
                          style={{ marginTop: 3 }}
                        >
                          Active
                        </div>
                      </div>
                    </div>
                  )}

                  {!activeInvestment && historyInvestments.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--txt3)', fontSize: '.8rem' }}>
                      No investment history yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* REFERRAL CARD */}
            <div
              className='db-card db-reveal'
              style={{
                padding: '24px 22px',
                marginBottom: 20,
                transitionDelay: '.18s',
              }}
            >
              <div
                className='db-ref-head-grid'
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  alignItems: 'start',
                  gap: 16,
                  marginBottom: 20,
                }}
              >
                <div>
                  <span className='db-label'>Passive Income</span>
                  <div className='db-section-title'>Referral Programme</div>
                  <div
                    style={{
                      fontSize: '.82rem',
                      color: 'var(--txt2)',
                      marginTop: 6,
                      lineHeight: 1.7,
                      fontWeight: 300,
                    }}
                  >
                    Earn {profile?.commission_rate || 7}% commission on every withdrawal made by your referred
                    investors — automatically credited to your wallet.
                  </div>
                </div>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    background: 'var(--ink)',
                    borderRadius: 'var(--r)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg
                    width='20'
                    height='20'
                    fill='none'
                    stroke='var(--gold)'
                    strokeWidth='1.6'
                    viewBox='0 0 24 24'
                  >
                    <path d='M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2' />
                    <circle cx='9' cy='7' r='4' />
                    <path d='M23 21v-2a4 4 0 00-3-3.87' />
                    <path d='M16 3.13a4 4 0 010 7.75' />
                  </svg>
                </div>
              </div>
              <div
                className='db-ref-copy-row'
                style={{ display: 'flex', gap: 8, marginBottom: 18 }}
              >
                <div className='db-ref-code'>{profile?.referral_code || 'VAULT-X'}</div>
                <button className='db-copy-btn' onClick={copyRef}>
                  Copy
                </button>
              </div>
              <div
                className='db-ref-stats-grid'
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3,1fr)',
                  gap: 2,
                }}
              >
                {[
                  { l: 'Referrals', v: referralStats.count.toString(), c: 'var(--ink)' },
                  { l: 'Earned', v: `$${referralStats.earned.toLocaleString()}`, c: 'var(--sage)' },
                  { l: 'Rate', v: `${profile?.commission_rate || 7}%`, c: 'var(--gold)' },
                ].map((r, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'var(--parchment)',
                      border: '1px solid var(--border)',
                      padding: '14px 16px',
                      borderRadius: 'var(--r)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '.67rem',
                        letterSpacing: '.1em',
                        textTransform: 'uppercase',
                        color: 'var(--txt3)',
                        marginBottom: 6,
                      }}
                    >
                      {r.l}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Cormorant Garamond',serif",
                        fontSize: '1.6rem',
                        fontWeight: 400,
                        color: r.c,
                      }}
                    >
                      {r.v}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* NOTICE STRIP */}
            {activeSeason && (
              <div
                className='db-reveal'
                style={{
                  background: 'var(--ink)',
                  borderRadius: 'var(--r-lg)',
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  flexWrap: 'wrap',
                  transitionDelay: '.22s',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '.68rem',
                      letterSpacing: '.16em',
                      textTransform: 'uppercase',
                      color: 'rgba(246,241,233,0.35)',
                      marginBottom: 5,
                    }}
                  >
                    {activeSeason.name} · {activeSeason.status === 'open' ? 'Entry Open' : 'Live'}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Cormorant Garamond',serif",
                      fontSize: '1.15rem',
                      fontWeight: 400,
                      color: 'var(--cream)',
                    }}
                  >
                    {activeSeason.status === 'open' 
                      ? `${getDaysElapsed(activeSeason.start_date) > 0 ? 0 : Math.abs(getDaysElapsed(activeSeason.start_date))} days remain to join ${activeSeason.name}. Pool at ${((activeSeason.current_pool / activeSeason.pool_cap) * 100).toFixed(1)}% capacity.`
                      : `${activeSeason.name} is currently running with ${((activeSeason.current_pool / activeSeason.pool_cap) * 100).toFixed(1)}% pool capacity.`
                    }
                  </div>
                </div>
                <button
                  className='db-btn db-btn-dark'
                  style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                  onClick={() => router.push('/season')}
                >
                  <span>Invest Now</span>
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  )
}
