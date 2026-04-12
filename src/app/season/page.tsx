'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import UserSidebar from '@/components/UserSidebar'
import { createClient } from '@/utils/supabase/client'

/* ── Types ── */
interface ActiveSeason {
  id: string
  name: string
  status: string
  statusLabel: string
  statusClass: string
  period: string
  endDate: Date
  roi: string
  min: number
  max: number
  pool: number
  poolFilled: number
  joined: boolean
  myAmount: number
}
interface HistorySeason {
  id: string
  name: string
  period: string
  roi: string
  myInv: string
  myPL: string
  plSign: string
  status: 'active' | 'completed'
  mySeasonId: string | null
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}
function fmt(n: number) {
  return (
    '$' + (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : (n / 1e3).toFixed(0) + 'K')
  )
}

export default function SeasonPage() {
  const router = useRouter()
  const supabase = createClient()

  /* ── State ── */
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [toastCls, setToastCls] = useState('')
  const [toastShow, setToastShow] = useState(false)
  const [seasons, setSeasons] = useState<ActiveSeason[]>([])
  const [history, setHistory] = useState<HistorySeason[]>([])
  const [histTab, setHistTab] = useState<
    'all' | 'active' | 'completed' | 'mine'
  >('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalState, setModalState] = useState<'form' | 'success'>('form')
  const [investId, setInvestId] = useState<string | null>(null)
  const [amountVal, setAmountVal] = useState('')
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [countdowns, setCountdowns] = useState<Record<string, string>>({})
  const [poolWidths, setPoolWidths] = useState<Record<string, string>>({})

  /* ── Refs ── */
  const bgRef = useRef<HTMLCanvasElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── Toast ── */
  const showToast = useCallback((msg: string, cls = '') => {
    setToastMsg(msg)
    setToastCls(cls)
    setToastShow(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastShow(false), 3200)
  }, [])

  /* ── Fetch Data ── */
  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/signin')
      return
    }

    // 1. Fetch Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    setUserProfile(profile)

    // 2. Fetch All Seasons
    const { data: dbSeasons } = await supabase
      .from('seasons')
      .select('*')
      .order('created_at', { ascending: false })
    
    // 3. Fetch My Investments
    const { data: myInvestments } = await supabase
      .from('investments')
      .select('*, seasons(*)')
      .eq('user_id', user.id)

    if (dbSeasons) {
      const activeMapped: ActiveSeason[] = dbSeasons
        .filter(s => s.status === 'open' || s.status === 'running')
        .map(s => {
          const myInv = myInvestments?.find(inv => inv.season_id === s.id)
          return {
            id: s.id,
            name: s.name,
            status: s.status,
            statusLabel: s.status === 'open' ? 'Now Open' : 'Live',
            statusClass: s.status === 'open' ? 'sx-tag-open' : 'sx-tag-ending',
            period: s.period,
            endDate: new Date(s.end_date || Date.now() + 7 * 864e5),
            roi: s.roi_range,
            min: s.min_entry,
            max: s.pool_cap,
            pool: s.pool_cap,
            poolFilled: s.current_pool,
            joined: !!myInv,
            myAmount: myInv?.amount || 0
          }
        })
      setSeasons(activeMapped)

      const historyMapped: HistorySeason[] = dbSeasons.map(s => {
        const myInv = myInvestments?.find(inv => inv.season_id === s.id)
        return {
          id: s.id,
          name: s.name,
          period: s.period,
          roi: s.status === 'completed' ? `+${s.final_roi}%` : `${s.roi_range}% (est)`,
          myInv: myInv ? `$${myInv.amount.toLocaleString()}` : '—',
          myPL: s.status === 'completed' && myInv ? `+$${(myInv.amount * (s.final_roi / 100)).toFixed(2)}` : '—',
          plSign: s.status === 'completed' && myInv ? '+' : '0',
          status: s.status === 'completed' ? 'completed' : 'active',
          mySeasonId: myInv ? myInv.id : null
        }
      })
      setHistory(historyMapped)
    }

    setLoading(false)
  }, [router, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /* ── BG Canvas ── */
  useEffect(() => {
    const cvs = bgRef.current
    if (!cvs) return
    const cx = cvs.getContext('2d')
    if (!cx) return
    type Candle = {
      x: number
      y: number
      w: number
      h: number
      wick: number
      up: boolean
      spd: number
      ph: number
    }
    type Wave = {
      pts: { x: number; y: number }[]
      spd: number
      ph: number
      amp: number
      color: string
      opa: string
    }
    let W = 0,
      H = 0,
      candles: Candle[] = [],
      waves: Wave[] = [],
      T = 0,
      animId = 0
    const build = () => {
      const n = Math.max(6, Math.floor(W / 50))
      candles = Array.from({ length: n }, (_, i) => ({
        x: (i / n) * W + 12 + Math.random() * 18,
        y: H * 0.18 + Math.random() * H * 0.6,
        w: 8 + Math.random() * 9,
        h: 14 + Math.random() * 72,
        wick: 6 + Math.random() * 22,
        up: Math.random() > 0.42,
        spd: 0.15 + Math.random() * 0.35,
        ph: Math.random() * Math.PI * 2,
      }))
      const pts = Math.ceil(W / 36) + 2
      waves = [0, 1, 2, 3].map((i) => ({
        pts: Array.from({ length: pts }, (_, j) => ({
          x: j * 36,
          y: H * (0.14 + i * 0.22) + Math.random() * 44,
        })),
        spd: 0.1 + i * 0.04,
        ph: i * 1.4,
        amp: 13 + i * 8,
        color: i % 2 === 0 ? 'rgba(74,103,65,' : 'rgba(184,147,90,',
        opa: i % 2 === 0 ? '0.72)' : '0.56)',
      }))
    }
    const setup = () => {
      W = cvs.width = window.innerWidth
      H = cvs.height = window.innerHeight
      build()
    }
    const draw = () => {
      cx.clearRect(0, 0, W, H)
      T += 0.011
      waves.forEach((w) => {
        cx.beginPath()
        w.pts.forEach((p, j) => {
          const y = p.y + Math.sin(T * w.spd + j * 0.3 + w.ph) * w.amp
          j === 0 ? cx.moveTo(p.x, y) : cx.lineTo(p.x, y)
        })
        cx.strokeStyle = w.color + w.opa
        cx.lineWidth = 1
        cx.stroke()
      })
      candles.forEach((c) => {
        const bob = Math.sin(T * c.spd + c.ph) * 7,
          x = c.x,
          y = c.y + bob
        cx.strokeStyle = 'rgba(28,28,28,.8)'
        cx.lineWidth = 1
        cx.beginPath()
        cx.moveTo(x + c.w / 2, y - c.wick)
        cx.lineTo(x + c.w / 2, y + c.h + c.wick)
        cx.stroke()
        cx.fillStyle = c.up ? 'rgba(74,103,65,.88)' : 'rgba(184,147,90,.82)'
        cx.fillRect(x, y, c.w, c.h)
        cx.strokeRect(x, y, c.w, c.h)
      })
      animId = requestAnimationFrame(draw)
    }
    window.addEventListener('resize', setup)
    setup()
    draw()
    return () => {
      window.removeEventListener('resize', setup)
      cancelAnimationFrame(animId)
    }
  }, [])

  /* ── Pool bars animate ── */
  useEffect(() => {
    if (seasons.length > 0) {
      const widths: Record<string, string> = {}
      seasons.forEach((s) => {
        widths[s.id] = Math.round((s.poolFilled / s.pool) * 100) + '%'
      })
      setPoolWidths(widths)
    }
  }, [seasons])

  /* ── Countdown timers ── */
  useEffect(() => {
    const tick = () => {
      const cds: Record<string, string> = {}
      seasons.forEach((s) => {
        const diff = s.endDate.getTime() - Date.now()
        if (diff <= 0) {
          cds[s.id] = 'Closed'
          return
        }
        const d = Math.floor(diff / 864e5)
        const h = Math.floor((diff % 864e5) / 36e5)
        const m = Math.floor((diff % 36e5) / 6e4)
        const sec = Math.floor((diff % 6e4) / 1e3)
        cds[s.id] = `${d}d ${pad(h)}h ${pad(m)}m ${pad(sec)}s left to join`
      })
      setCountdowns(cds)
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [seasons])

  /* ── Scroll reveal ── */
  useEffect(() => {
    if (loading) return; // wait until content is rendered
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('vis')
        })
      },
      { threshold: 0.08 },
    )
    document
      .querySelectorAll<HTMLElement>('.sx-reveal')
      .forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [loading])

  /* ── Body scroll lock ── */
  useEffect(() => {
    document.body.style.overflow = sidebarOpen || modalOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen, modalOpen])

  /* ── ESC ── */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalOpen(false)
        setSidebarOpen(false)
      }
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [])

  /* ── Filtered history rows ── */
  const filteredHistory = history.filter((r) => {
    if (histTab === 'all') return true
    if (histTab === 'active') return r.status === 'active'
    if (histTab === 'completed') return r.status === 'completed'
    if (histTab === 'mine') return r.mySeasonId !== null
    return true
  })

  /* ── Open invest modal ── */
  const openInvest = (id: string) => {
    setInvestId(id)
    setAmountVal('')
    setModalState('form')
    setModalOpen(true)
  }

  /* ── Confirm investment ── */
  const confirmInvest = async () => {
    if (!investId || !userProfile) return
    const s = seasons.find((x) => x.id === investId)
    if (!s) return
    const amt = parseFloat(amountVal)
    if (!amt || isNaN(amt)) {
      showToast('⚠ Please enter an amount.')
      return
    }
    if (amt < s.min) {
      showToast(`⚠ Minimum investment is $${s.min.toLocaleString()}.`)
      return
    }
    if (amt > userProfile.balance) {
      showToast('⚠ Insufficient balance.')
      return
    }

    try {
      // 1. Create Investment
      const { error: invError } = await supabase
        .from('investments')
        .insert({
          user_id: userProfile.id,
          season_id: investId,
          amount: amt,
          status: 'active'
        })
      
      if (invError) throw invError

      // 2. Update Profile
      const { error: profError } = await supabase
        .from('profiles')
        .update({
          balance: userProfile.balance - amt,
          invested_total: userProfile.invested_total + amt
        })
        .eq('id', userProfile.id)
      
      if (profError) throw profError

      // 3. Update Season Pool (This might fail due to RLS, but we try)
      await supabase
        .from('seasons')
        .update({
          current_pool: s.poolFilled + amt
        })
        .eq('id', investId)

      setModalState('success')
      showToast('✓ Investment confirmed!', 'ok')
      fetchData() // Refresh data
    } catch (err: any) {
      showToast(`⚠ Error: ${err.message || 'Transaction failed'}`)
    }
  }

  const currentSeason = investId ? seasons.find((x) => x.id === investId) : null

  /* ════════════════════════════════════════ */
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--txt2)', background: 'var(--cream)' }}>Loading Seasons...</div>

  return (
    <>
      <canvas
        ref={bgRef}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0,
          opacity: 0.055,
        }}
      />

      <div
        className={`sx-toast${toastShow ? ' show' : ''}${toastCls ? ' ' + toastCls : ''}`}
      >
        {toastMsg}
      </div>

      <UserSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className='sx-layout'>
        <div className='sx-topbar'>
          <button className='sx-hamburger' onClick={() => setSidebarOpen(true)}>
            <span />
            <span />
            <span />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className='sx-logo-mark' style={{ width: 26, height: 26 }} />
            <span className='sx-logo-text' style={{ fontSize: '1.15rem' }}>
              Vault<span>X</span>
            </span>
          </div>
          <div
            className='sx-avatar'
            style={{
              width: 32,
              height: 32,
              fontSize: '.8rem',
              cursor: 'pointer',
            }}
            onClick={() => router.push('/profile')}
          >
            {userProfile?.first_name?.[0]}{userProfile?.last_name?.[0]}
          </div>
        </div>

        <main className='sx-main'>
          <div style={{ maxWidth: 1040, margin: '0 auto' }}>
            <div
              className='sx-reveal'
              style={{
                marginBottom: 32,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 14,
              }}
            >
              <div>
                <span className='sx-sec-label'>Platform</span>
                <h1 className='sx-sec-title'>Investment Seasons</h1>
                <p
                  style={{
                    fontSize: '.85rem',
                    color: 'var(--text-sec)',
                    fontWeight: 300,
                    marginTop: 8,
                    lineHeight: 1.7,
                    maxWidth: 480,
                  }}
                >
                  Join active seasons and grow your capital through structured,
                  time-bound investment cycles with transparent returns.
                </p>
              </div>
            </div>

            <div
              className='sx-reveal'
              style={{
                transitionDelay: '.04s',
                display: 'grid',
                gridTemplateColumns: 'repeat(2,1fr)',
                gap: 2,
                border: '1px solid var(--border)',
                borderRadius: 10,
                overflow: 'hidden',
                marginBottom: 36,
              }}
            >
              {[
                { lbl: 'Active Seasons', val: <>{seasons.length}</>, valStyle: {} },
                {
                  lbl: 'My Total Invested',
                  val: (
                    <>{`$${userProfile?.invested_total?.toLocaleString() || '0'}`}</>
                  ),
                  valStyle: { color: 'var(--gold)' },
                },
                {
                  lbl: 'Avg. Season ROI',
                  val: <>{userProfile?.avg_roi || '0'}%</>,
                  valStyle: { color: 'var(--sage)' },
                },
                {
                  lbl: 'Total Profit',
                  val: <>{`+$${userProfile?.profits_total?.toLocaleString() || '0'}`}</>,
                  valStyle: { color: 'var(--sage)' },
                },
              ].map((s, i) => (
                <div
                  key={i}
                  style={{
                    background: 'var(--surface)',
                    padding: '16px 18px',
                    borderRight:
                      i % 2 === 0 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div
                    style={{
                      fontSize: '.62rem',
                      letterSpacing: '.12em',
                      textTransform: 'uppercase',
                      color: 'var(--text-sec)',
                      marginBottom: 4,
                    }}
                  >
                    {s.lbl}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Cormorant Garamond',serif",
                      fontSize: '1.6rem',
                      fontWeight: 400,
                      lineHeight: 1,
                      ...s.valStyle,
                    }}
                  >
                    {s.val}
                  </div>
                </div>
              ))}
            </div>

            <div
              className='sx-reveal'
              style={{
                transitionDelay: '.08s',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div>
                <span className='sx-sec-label'>Currently Running</span>
                <h2
                  style={{
                    fontFamily: "'Cormorant Garamond',serif",
                    fontSize: 'clamp(1.2rem,3vw,1.7rem)',
                    fontWeight: 400,
                    color: 'var(--ink)',
                  }}
                >
                  Active Seasons
                </h2>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '.72rem',
                  color: 'var(--text-sec)',
                }}
              >
                <span className='sx-live-dot' />{seasons.length} seasons live
              </div>
            </div>

            <div
              className='sx-seasons-grid sx-reveal'
              style={{ transitionDelay: '.12s' }}
            >
              {seasons.map((s) => {
                const pct = Math.round((s.poolFilled / s.pool) * 100)
                return (
                  <div key={s.id} className='sx-season-card'>
                    <div className='sx-sc-head'>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 10,
                        }}
                      >
                        <span className='sx-sc-name'>{s.name}</span>
                        <span className={`sx-tag ${s.statusClass}`}>
                          {s.statusLabel}
                        </span>
                      </div>
                      <div className='sx-countdown-lbl'>
                        Entry window closes in
                      </div>
                      <div className='sx-countdown'>
                        {countdowns[s.id] || '—'}
                      </div>
                    </div>
                    <div className='sx-sc-body'>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 10,
                          marginBottom: 10,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: '.62rem',
                              letterSpacing: '.1em',
                              textTransform: 'uppercase',
                              color: 'var(--text-sec)',
                              marginBottom: 3,
                            }}
                          >
                            Projected ROI
                          </div>
                          <div className='sx-roi-val'>
                            {s.roi}
                            <span
                              style={{
                                fontSize: '1rem',
                                color: 'var(--text-sec)',
                              }}
                            >
                              %
                            </span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div
                            style={{
                              fontSize: '.62rem',
                              letterSpacing: '.1em',
                              textTransform: 'uppercase',
                              color: 'var(--text-sec)',
                              marginBottom: 3,
                            }}
                          >
                            Period
                          </div>
                          <div
                            style={{
                              fontSize: '.82rem',
                              color: 'var(--ink)',
                              fontWeight: 500,
                            }}
                          >
                            {s.period}
                          </div>
                        </div>
                      </div>
                      <div className='sx-detail-grid'>
                        <div className='sx-detail-item'>
                          <span>Min. Entry</span>
                          <strong>${s.min.toLocaleString()}</strong>
                        </div>
                        <div className='sx-detail-item'>
                          <span>Max. Entry</span>
                          <strong>{fmt(s.max)}</strong>
                        </div>
                        <div
                          className='sx-detail-item'
                          style={{ gridColumn: 'span 2' }}
                        >
                          <span>Total Pool · {pct}% filled</span>
                          <strong>
                            {fmt(s.poolFilled)} / {fmt(s.pool)}
                          </strong>
                          <div className='sx-pool-bar'>
                            <div
                              className='sx-pool-fill'
                              style={{ width: poolWidths[s.id] || '0%' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className='sx-sc-foot'>
                      {s.joined ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '.75rem',
                              color: 'var(--sage)',
                              fontWeight: 500,
                            }}
                          >
                            ✓ Invested ${s.myAmount.toLocaleString()}
                          </span>
                          <span
                            className='sx-tag sx-tag-open'
                            style={{ fontSize: '.6rem' }}
                          >
                            Joined
                          </span>
                        </div>
                      ) : (
                        <button
                          className='sx-btn-sage'
                          style={{ width: '100%', textAlign: 'center', opacity: s.status === 'open' ? 1 : 0.5 }}
                          disabled={s.status !== 'open'}
                          onClick={() => openInvest(s.id)}
                        >
                          {s.status === 'open' ? 'Invest Now →' : 'Closed'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className='sx-divider' />

            <div
              className='sx-reveal'
              style={{ transitionDelay: '.16s', marginBottom: 20 }}
            >
              <span className='sx-sec-label'>Record</span>
              <h2
                style={{
                  fontFamily: "'Cormorant Garamond',serif",
                  fontSize: 'clamp(1.2rem,3vw,1.7rem)',
                  fontWeight: 400,
                  color: 'var(--ink)',
                  marginBottom: 18,
                }}
              >
                All Seasons &amp; History
              </h2>
              <div className='sx-tabs'>
                {(
                  [
                    ['all', 'All Seasons'],
                    ['active', 'Active'],
                    ['completed', 'Completed'],
                    ['mine', 'My Investments'],
                  ] as [string, string][]
                ).map(([key, lbl]) => (
                  <button
                    key={key}
                    className={`sx-tab${histTab === key ? ' active' : ''}`}
                    onClick={() => setHistTab(key as typeof histTab)}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div
              className='sx-hist-wrap sx-reveal'
              style={{ transitionDelay: '.2s' }}
            >
              <table className='sx-htbl'>
                <thead>
                  <tr>
                    <th>Season</th>
                    <th>Period</th>
                    <th>ROI</th>
                    <th>My Investment</th>
                    <th>My Profit / Loss</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        style={{
                          textAlign: 'center',
                          padding: 32,
                          color: 'var(--text-sec)',
                          fontSize: '.82rem',
                        }}
                      >
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <div className='sx-td-sname'>{r.name}</div>
                        </td>
                        <td>
                          <div className='sx-td-period'>{r.period}</div>
                        </td>
                        <td
                          className={
                            r.plSign === '+'
                              ? 'sx-c-pos'
                              : r.plSign === '-'
                                ? 'sx-c-neg'
                                : 'sx-c-neu'
                          }
                        >
                          {r.roi}
                        </td>
                        <td>
                          {r.mySeasonId !== null ? (
                            <>
                              <span className='sx-my-tag'>mine</span> {r.myInv}
                            </>
                          ) : (
                            r.myInv
                          )}
                        </td>
                        <td
                          className={
                            r.plSign === '+'
                              ? 'sx-c-pos'
                              : r.plSign === '-'
                                ? 'sx-c-neg'
                                : 'sx-c-neu'
                          }
                        >
                          {r.myPL}
                        </td>
                        <td>
                          {r.status === 'active' ? (
                            <span className='sx-tag sx-tag-open'>Active</span>
                          ) : (
                            <span className='sx-tag sx-tag-done'>
                              Completed
                            </span>
                          )}
                        </td>
                        <td>
                          {r.status === 'active' ? (
                            <button
                              className='sx-btn-sage'
                              style={{
                                fontSize: '.7rem',
                                padding: '7px 14px',
                                whiteSpace: 'nowrap',
                              }}
                              onClick={() => openInvest(r.id)}
                            >
                              Invest Now
                            </button>
                          ) : (
                            <span
                              style={{
                                fontSize: '.72rem',
                                color: 'var(--text-sec)',
                              }}
                            >
                              Closed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      <div
        className={`sx-overlay${modalOpen ? ' open' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setModalOpen(false)
        }}
      >
        <div className='sx-modal-box'>
          <div className='sx-modal-hd'>
            <span className='sx-modal-ttl'>
              {modalState === 'form'
                ? currentSeason
                  ? `Join ${currentSeason.name}`
                  : 'Join Season'
                : 'Investment Confirmed'}
            </span>
            <button
              className='sx-modal-cls'
              onClick={() => setModalOpen(false)}
            >
              ✕
            </button>
          </div>

          {modalState === 'form' && currentSeason && (
            <>
              <div className='sx-modal-season-badge'>
                <div>
                  <div className='sx-modal-season-name'>
                    {currentSeason.name}
                  </div>
                  <div
                    style={{
                      fontSize: '.68rem',
                      color: 'var(--text-sec)',
                      marginTop: 2,
                    }}
                  >
                    {currentSeason.period}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontFamily: "'Cormorant Garamond',serif",
                      fontSize: '1.4rem',
                      fontWeight: 300,
                      color: 'var(--sage)',
                    }}
                  >
                    {currentSeason.roi}%
                  </div>
                  <div
                    style={{
                      fontSize: '.62rem',
                      letterSpacing: '.1em',
                      textTransform: 'uppercase',
                      color: 'var(--text-sec)',
                    }}
                  >
                    Projected ROI
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label
                  className='sx-fl'
                  style={{ display: 'block', marginBottom: 6 }}
                >
                  Investment Amount
                </label>
                <div className='sx-amount-input-wrap'>
                  <input
                    className='sx-fi'
                    type='number'
                    placeholder={`Min $${currentSeason.min} · Max $${currentSeason.pool.toLocaleString()}`}
                    min={currentSeason.min}
                    value={amountVal}
                    onChange={(e) => setAmountVal(e.target.value)}
                  />
                  <span className='sx-usdt'>USDT</span>
                </div>
                <div className='sx-modal-limits'>
                  <span>
                    Min:{' '}
                    <strong style={{ color: 'var(--ink)' }}>
                      $<span>{currentSeason.min.toLocaleString()}</span>
                    </strong>
                  </span>
                </div>
              </div>
              <div
                style={{
                  background: 'rgba(74,103,65,.05)',
                  border: '1px solid rgba(74,103,65,.14)',
                  borderRadius: 6,
                  padding: '11px 13px',
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    fontSize: '.7rem',
                    color: 'var(--text-sec)',
                    lineHeight: 1.8,
                    fontWeight: 300,
                  }}
                >
                  💡 Investment is locked for the season duration (90 days).
                  Referrer earns{' '}
                  <strong style={{ color: 'var(--gold)' }}>5%</strong> of your
                  withdrawal automatically.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  className='sx-btn-ink'
                  style={{ flex: 1, minWidth: 130, textAlign: 'center' }}
                  onClick={confirmInvest}
                >
                  Confirm Investment
                </button>
                <button
                  className='sx-btn-ghost'
                  style={{ flex: 1, minWidth: 100, textAlign: 'center' }}
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </>
          )}

          {modalState === 'success' && currentSeason && (
            <div
              className='sx-modal-success'
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '8px 0 4px',
              }}
            >
              <div style={{ fontSize: '2.2rem', marginBottom: 12 }}>✓</div>
              <div
                className='sx-big'
                style={{
                  fontFamily: "'Cormorant Garamond',serif",
                  fontSize: '1.8rem',
                  fontWeight: 300,
                  color: 'var(--ink)',
                  marginBottom: 8,
                }}
              >
                ${parseFloat(amountVal || '0').toLocaleString()} Invested!
              </div>
              <p
                style={{
                  fontSize: '.8rem',
                  color: 'var(--text-sec)',
                  lineHeight: 1.7,
                  fontWeight: 300,
                }}
              >
                Your investment in <strong>{currentSeason.name}</strong> has
                been confirmed. You will receive your returns at the end of the
                cycle.
              </p>
              <button
                className='sx-btn-ink'
                style={{ marginTop: 22, width: '100%' }}
                onClick={() => setModalOpen(false)}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
