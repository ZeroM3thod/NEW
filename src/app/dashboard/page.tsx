'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import UserSidebar from '@/components/UserSidebar'
import { createClient } from '@/utils/supabase/client'

declare global {
  interface Window { Chart: any }
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

  const [profile, setProfile] = useState<any>(null)
  const [activeInvestment, setActiveInvestment] = useState<any>(null)
  const [historyInvestments, setHistoryInvestments] = useState<any[]>([])
  const [allSeasons, setAllSeasons] = useState<any[]>([])
  const [referralStats, setReferralStats] = useState({ count: 0, earned: 0 })
  const [activeSeason, setActiveSeason] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<any>(null)
  const bgCanvasRef = useRef<HTMLCanvasElement>(null)

  /* ── Fetch Data ── */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/auth/signin'); return }

        // 1. Profile — use maybeSingle to avoid throw on missing row
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (profileData) {
          setProfile(profileData)
          const bal = Number(profileData.balance) || 0
          setDisplayBalance('$' + bal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
        }

        // 2. Investments — safe join with null guard
        const { data: investments } = await supabase
          .from('investments')
          .select('*, seasons(*)')
          .eq('user_id', user.id)

        if (investments && investments.length > 0) {
          // Filter out any where seasons join is null
          const validInvestments = investments.filter(inv => inv.seasons != null)
          const active = validInvestments.find(inv => inv.status === 'active')
          setActiveInvestment(active || null)
          setHistoryInvestments(validInvestments.filter(inv => inv.status === 'completed'))

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

        // 3. Seasons
        const { data: seasons } = await supabase
          .from('seasons')
          .select('*')
          .order('created_at', { ascending: false })

        if (seasons) {
          setAllSeasons(seasons)
          const current = seasons.find(s => s.status === 'running') || seasons.find(s => s.status === 'open')
          setActiveSeason(current || null)
        }

        // 4. Referrals
        const { data: referrals } = await supabase
          .from('profiles')
          .select('id')
          .eq('referred_by', user.id)

        setReferralStats({
          count: referrals?.length || 0,
          earned: profileData?.profits_total || 0
        })
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router, supabase])

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

  /* ── Chart init ── */
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
          borderColor: '#4a6741',
          borderWidth: 2,
          pointBackgroundColor: '#4a6741',
          pointBorderColor: '#faf7f2',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.4,
        }],
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
            padding: 12,
            callbacks: { label: (c: { raw: number }) => `  ROI: +${c.raw}%` },
          },
        },
        scales: {
          x: { grid: { color: 'rgba(184,147,90,0.06)' }, ticks: { color: '#9c9186', font: { family: 'DM Sans', size: 10 } } },
          y: { grid: { color: 'rgba(184,147,90,0.06)' }, ticks: { color: '#9c9186', font: { family: 'DM Sans', size: 10 }, callback: (v: number) => v + '%' } },
        },
        interaction: { intersect: false, mode: 'index' },
      },
    })
  }, [historyInvestments])

  useEffect(() => { if (chartReady && !loading) initChart() }, [chartReady, loading, initChart])

  /* ── BG Canvas ── */
  useEffect(() => {
    const bgC = bgCanvasRef.current
    if (!bgC) return
    const bgX = bgC.getContext('2d')
    if (!bgX) return
    let BW = 0, BH = 0, candles: any[] = [], waves: any[] = [], bT = 0, animId = 0
    const resize = () => {
      BW = bgC.width = window.innerWidth
      BH = bgC.height = window.innerHeight
      const n = Math.max(8, Math.floor(BW / 52))
      candles = Array.from({ length: n }, (_, i) => ({
        x: (i / n) * BW + Math.random() * 30,
        y: BH * 0.28 + Math.random() * BH * 0.5,
        w: 10 + Math.random() * 7,
        h: 18 + Math.random() * 58,
        up: Math.random() > 0.42,
        spd: 0.18 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
        wick: 7 + Math.random() * 18,
      }))
      const pts = Math.ceil(BW / 36) + 2
      waves = Array.from({ length: 4 }, (_, i) => ({
        pts: Array.from({ length: pts }, (_, j) => ({ x: j * 36, y: BH * (0.18 + i * 0.17) + Math.random() * 55 })),
        spd: 0.12 + i * 0.04, phase: i * 1.1, amp: 16 + i * 7,
      }))
    }
    const anim = () => {
      bgX.clearRect(0, 0, BW, BH); bT += 0.011
      waves.forEach((w, i) => {
        bgX.beginPath()
        w.pts.forEach((p: any, j: number) => {
          const y = p.y + Math.sin(bT * w.spd + j * 0.28 + w.phase) * w.amp
          j === 0 ? bgX.moveTo(p.x, y) : bgX.lineTo(p.x, y)
        })
        bgX.strokeStyle = i % 2 === 0 ? 'rgba(74,103,65,0.9)' : 'rgba(184,147,90,0.7)'
        bgX.lineWidth = 0.9; bgX.stroke()
      })
      candles.forEach(c => {
        const bob = Math.sin(bT * c.spd + c.phase) * 7, x = c.x, y = c.y + bob
        bgX.strokeStyle = 'rgba(28,28,28,0.9)'; bgX.lineWidth = 0.9
        bgX.beginPath(); bgX.moveTo(x + c.w / 2, y - c.wick); bgX.lineTo(x + c.w / 2, y + c.h + c.wick); bgX.stroke()
        bgX.fillStyle = c.up ? 'rgba(74,103,65,0.85)' : 'rgba(184,147,90,0.8)'
        bgX.fillRect(x, y, c.w, c.h); bgX.strokeRect(x, y, c.w, c.h)
      })
      animId = requestAnimationFrame(anim)
    }
    window.addEventListener('resize', resize); resize(); anim()
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animId) }
  }, [])

  /* ── ESC / scroll lock / reveal ── */
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setSidebarOpen(false) }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [])
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('show'); obs.unobserve(e.target) } }),
      { threshold: 0.12 }
    )
    document.querySelectorAll<HTMLElement>('.db-reveal').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [loading])

  const copyRef = () => {
    const code = profile?.referral_code || ''
    if (!code) { showToast('No referral code yet'); return }
    navigator.clipboard?.writeText(code).then(() => showToast('Referral code copied')).catch(() => showToast('Copy failed'))
  }

  if (loading) {
    return (
      <div className="db-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--txt2)', background: 'var(--cream)' }}>
        Loading Dashboard…
      </div>
    )
  }

  const balance = Number(profile?.balance) || 0
  const investedTotal = Number(profile?.invested_total) || 0
  const withdrawable = Number(profile?.withdrawable_total) || 0
  const profitsTotal = Number(profile?.profits_total) || 0
  const avgRoi = Number(profile?.avg_roi) || 0
  const firstName = profile?.first_name || profile?.username || 'Investor'
  const refCode = profile?.referral_code || '—'
  const commRate = Number(profile?.commission_rate) || 7

  const activeSeasonDays = activeInvestment?.seasons?.duration_days || 90
  const activeSeasonStart = activeInvestment?.seasons?.start_date || null
  const activeSeasonName = activeInvestment?.seasons?.name || null
  const activeSeasonRoi = activeInvestment?.seasons?.roi_range || '—'
  const myInvestAmount = Number(activeInvestment?.amount) || 0
  const daysElapsed = activeSeasonStart ? getDaysElapsed(activeSeasonStart) : 0

  return (
    <>
      <Script src='https://cdn.jsdelivr.net/npm/chart.js' onReady={() => setChartReady(true)} />
      <canvas ref={bgCanvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.055, width: '100%', height: '100%' }} />
      <div className={`db-toast${toastShow ? ' show' : ''}`}>{toastMsg}</div>
      <UserSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className='db-layout'>
        {/* MOBILE TOPBAR */}
        <div className='db-topbar'>
          <button className='db-hamburger' onClick={() => setSidebarOpen(true)}><span /><span /><span /></button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className='db-logo-mark' style={{ width: 26, height: 26 }} />
            <span className='db-logo-text' style={{ fontSize: '1.15rem' }}>Vault<span>X</span></span>
          </div>
          <div className='db-avatar' style={{ width: 32, height: 32, fontSize: '.8rem', cursor: 'pointer' }} onClick={() => router.push('/profile')}>
            {(profile?.first_name?.[0] || '')[0]}{(profile?.last_name?.[0] || '')[0]}
          </div>
        </div>

        <main className='db-main'>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>

            {/* HEADER */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 28 }} className='db-reveal'>
              <div>
                <span className='db-label'>Overview</span>
                <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(1.6rem,4vw,2.2rem)', fontWeight: 400, color: 'var(--ink)', lineHeight: 1.15 }}>
                  Good morning,<br />
                  <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>{firstName}</em>
                </h1>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <div className='db-live-pill'>
                  <div className='db-live-dot' />
                  {activeSeasonName ? `${activeSeasonName} Live` : 'Not Joined'}
                </div>
              </div>
            </div>

            {/* BALANCE HERO */}
            <div className='db-balance-hero db-reveal' style={{ marginBottom: 20, transitionDelay: '.06s' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, position: 'relative', zIndex: 1 }}>
                <div>
                  <div className='db-balance-label' style={{ marginBottom: 8 }}>Total Portfolio · USDT</div>
                  <div className='db-balance-num'>{displayBalance}</div>
                  <div className='db-balance-sub' style={{ marginTop: 8 }}>
                    <span style={{ color: '#6a8c60' }}>↑ +${profitsTotal.toLocaleString()}</span>
                    &nbsp;·&nbsp;all-time profit&nbsp;·&nbsp;
                    <span style={{ color: 'var(--gold-l)' }}>+{avgRoi}% avg ROI</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className='db-balance-label' style={{ marginBottom: 6 }}>{activeSeasonName || 'No Active Season'}</div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.9rem', fontWeight: 300, color: 'rgba(246,241,233,0.85)' }}>
                    {activeSeasonStart ? `Day ${daysElapsed}` : '—'}
                  </div>
                  <div className='db-balance-sub'>{activeSeasonStart ? `of ${activeSeasonDays} days` : 'Not joined yet'}</div>
                </div>
              </div>
              <div style={{ marginTop: 24, position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.7rem', color: 'rgba(246,241,233,0.35)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                  <span>Season Progress</span>
                  <span style={{ color: 'var(--gold-l)' }}>{progWidth}</span>
                </div>
                <div className='db-prog-track'><div className='db-prog-fill' style={{ width: progWidth }} /></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.68rem', color: 'rgba(246,241,233,0.25)', marginTop: 6 }}>
                  <span>Entry ${myInvestAmount.toLocaleString()}</span>
                  <span>Target {activeSeasonRoi}</span>
                </div>
              </div>
            </div>

            {/* STAT CARDS */}
            <div className='db-grid-4 db-reveal' style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20, transitionDelay: '.1s' }}>
              {([
                { bg: 'rgba(184,147,90,0.1)', stroke: 'var(--gold)', icon: <><rect x='2' y='7' width='20' height='14' rx='2' /><path d='M16 7V5a2 2 0 00-4 0v2' /></>, lbl: 'Invested', val: `$${investedTotal.toLocaleString()}`, sub: 'all seasons', cls: 'db-stat-gold' },
                { bg: 'rgba(74,103,65,0.1)', stroke: 'var(--sage)', icon: <path d='M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' />, lbl: 'Withdrawable', val: `$${withdrawable.toLocaleString()}`, sub: 'available now', cls: 'db-stat-up' },
                { bg: 'rgba(74,103,65,0.08)', stroke: 'var(--sage-l)', icon: <><polyline points='23 6 13.5 15.5 8.5 10.5 1 18' /><polyline points='17 6 23 6 23 12' /></>, lbl: 'Total Profits', val: `+$${profitsTotal.toLocaleString()}`, sub: 'all time', cls: 'db-stat-up' },
                { bg: 'rgba(184,147,90,0.08)', stroke: 'var(--gold)', icon: <><line x1='12' y1='20' x2='12' y2='10' /><line x1='18' y1='20' x2='18' y2='4' /><line x1='6' y1='20' x2='6' y2='16' /></>, lbl: 'Avg ROI', val: `+${avgRoi}%`, sub: `${historyInvestments.length} seasons`, cls: 'db-stat-gold' },
              ] as { bg: string; stroke: string; icon: React.ReactNode; lbl: string; val: string; sub: string; cls: string }[]).map((s, i) => (
                <div key={i} className='db-card db-card-hover' style={{ padding: '18px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <div style={{ width: 26, height: 26, background: s.bg, borderRadius: 'var(--r)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width='13' height='13' fill='none' stroke={s.stroke} strokeWidth='1.8' viewBox='0 0 24 24'>{s.icon}</svg>
                    </div>
                    <span style={{ fontSize: '.67rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--txt2)' }}>{s.lbl}</span>
                  </div>
                  <div className={`db-stat-num ${s.cls}`}>{s.val}</div>
                  <div style={{ fontSize: '.7rem', color: 'var(--txt3)', marginTop: 5 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* ACTION BUTTONS */}
            <div className='db-grid-2 db-reveal' style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20, transitionDelay: '.13s' }}>
              <button className='db-btn db-btn-dark' onClick={() => router.push('/deposit')}><span>+ Deposit</span></button>
              <button className='db-btn db-btn-outline' onClick={() => router.push('/withdraw')}>Withdraw →</button>
            </div>

            {/* CHART + SEASONS */}
            <div className='db-mid-grid db-reveal' style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              {/* CHART */}
              <div className='db-card' style={{ padding: '22px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                  <div>
                    <span className='db-label'>Performance</span>
                    <div className='db-section-title' style={{ fontSize: '1.1rem' }}>Profit Trend</div>
                  </div>
                </div>
                <div className='db-chart-wrap'><canvas ref={chartRef} /></div>
                <div className='db-divider' style={{ margin: '16px 0 14px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  {[
                    { l: 'Best', v: historyInvestments.length ? `+${Math.max(...historyInvestments.map(i => Number(i.seasons?.final_roi) || 0))}%` : 'N/A', c: 'var(--sage)' },
                    { l: 'Avg', v: `+${avgRoi}%`, c: 'var(--gold)' },
                    { l: 'Seasons', v: historyInvestments.length + (activeInvestment ? 1 : 0), c: 'var(--ink)' },
                  ].map((x, i) => (
                    <div key={i} style={{ textAlign: i === 2 ? 'right' : i === 1 ? 'center' : 'left' }}>
                      <div style={{ fontSize: '.67rem', textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--txt3)' }}>{x.l}</div>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.1rem', fontWeight: 500, color: x.c }}>{x.v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SEASON HISTORY */}
              <div className='db-card' style={{ padding: '22px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                  <div>
                    <span className='db-label'>History</span>
                    <div className='db-section-title' style={{ fontSize: '1.1rem' }}>Seasons</div>
                  </div>
                  <button onClick={() => router.push('/season')} style={{ fontSize: '.68rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer' }}>All →</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {historyInvestments.length === 0 && !activeInvestment ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--txt3)', fontSize: '.8rem' }}>No investment history yet.</div>
                  ) : (
                    <>
                      {historyInvestments.map((s, i) => (
                        <div key={i} className='db-season-row'>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                            <div className='db-season-badge' style={{ background: 'rgba(74,103,65,0.1)', border: '1px solid rgba(74,103,65,0.2)', color: 'var(--sage)' }}>
                              {(s.seasons?.name || '').split(' ').map((w: string) => w[0]).join('')}
                            </div>
                            <div>
                              <div style={{ fontSize: '.82rem', fontWeight: 500, color: 'var(--ink)' }}>{s.seasons?.name || '—'}</div>
                              <div style={{ fontSize: '.68rem', color: 'var(--txt3)' }}>{s.seasons?.period || ''}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.1rem', color: 'var(--sage)', fontWeight: 500 }}>
                              +{s.seasons?.final_roi || 0}%
                            </div>
                            <div className='db-tag db-tag-sage' style={{ marginTop: 3 }}>Done</div>
                          </div>
                        </div>
                      ))}
                      {activeInvestment && (
                        <div className='db-season-row' style={{ borderColor: 'rgba(184,147,90,0.25)', background: 'rgba(184,147,90,0.04)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                            <div className='db-season-badge' style={{ background: 'rgba(184,147,90,0.12)', border: '1px solid rgba(184,147,90,0.35)', color: 'var(--gold)', position: 'relative' }}>
                              {(activeInvestment.seasons?.name || '').split(' ').map((w: string) => w[0]).join('')}
                              <div className='db-live-dot' style={{ position: 'absolute', top: -3, right: -3, width: 6, height: 6, background: 'var(--sage)' }} />
                            </div>
                            <div>
                              <div style={{ fontSize: '.82rem', fontWeight: 500, color: 'var(--ink)' }}>{activeInvestment.seasons?.name || '—'}</div>
                              <div style={{ fontSize: '.68rem', color: 'var(--txt3)' }}>Day {daysElapsed} / {activeSeasonDays}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.1rem', color: 'var(--gold-l)', fontWeight: 500 }}>{activeSeasonRoi}</div>
                            <div className='db-tag db-tag-live' style={{ marginTop: 3 }}>Active</div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* REFERRAL CARD */}
            <div className='db-card db-reveal' style={{ padding: '24px 22px', marginBottom: 20, transitionDelay: '.18s' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'start', gap: 16, marginBottom: 20 }}>
                <div>
                  <span className='db-label'>Passive Income</span>
                  <div className='db-section-title'>Referral Programme</div>
                  <div style={{ fontSize: '.82rem', color: 'var(--txt2)', marginTop: 6, lineHeight: 1.7, fontWeight: 300 }}>
                    Earn {commRate}% commission on every withdrawal made by your referred investors — automatically credited to your wallet.
                  </div>
                </div>
                <div style={{ width: 44, height: 44, background: 'var(--ink)', borderRadius: 'var(--r)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width='20' height='20' fill='none' stroke='var(--gold)' strokeWidth='1.6' viewBox='0 0 24 24'>
                    <path d='M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2'/><circle cx='9' cy='7' r='4'/>
                    <path d='M23 21v-2a4 4 0 00-3-3.87'/><path d='M16 3.13a4 4 0 010 7.75'/>
                  </svg>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                <div className='db-ref-code'>{refCode}</div>
                <button className='db-copy-btn' onClick={copyRef}>Copy</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2 }}>
                {[
                  { l: 'Referrals', v: referralStats.count.toString(), c: 'var(--ink)' },
                  { l: 'Earned', v: `$${Number(referralStats.earned).toLocaleString()}`, c: 'var(--sage)' },
                  { l: 'Rate', v: `${commRate}%`, c: 'var(--gold)' },
                ].map((r, i) => (
                  <div key={i} style={{ background: 'var(--parchment)', border: '1px solid var(--border)', padding: '14px 16px', borderRadius: 'var(--r)' }}>
                    <div style={{ fontSize: '.67rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--txt3)', marginBottom: 6 }}>{r.l}</div>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.6rem', fontWeight: 400, color: r.c }}>{r.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* NOTICE STRIP */}
            {activeSeason && (
              <div className='db-reveal' style={{ background: 'var(--ink)', borderRadius: 'var(--r-lg)', padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', transitionDelay: '.22s' }}>
                <div>
                  <div style={{ fontSize: '.68rem', letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(246,241,233,0.35)', marginBottom: 5 }}>
                    {activeSeason.name} · {activeSeason.status === 'open' ? 'Entry Open' : 'Live'}
                  </div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.15rem', fontWeight: 400, color: 'var(--cream)' }}>
                    {activeSeason.status === 'open'
                      ? `Entries open for ${activeSeason.name}. Pool at ${((Number(activeSeason.current_pool) / Number(activeSeason.pool_cap)) * 100).toFixed(1)}% capacity.`
                      : `${activeSeason.name} is currently running.`
                    }
                  </div>
                </div>
                <button className='db-btn db-btn-dark' style={{ whiteSpace: 'nowrap', flexShrink: 0 }} onClick={() => router.push('/season')}>
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