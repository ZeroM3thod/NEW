'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import UserSidebar from '@/components/UserSidebar'
import { createClient } from '@/utils/supabase/client'
import React from 'react'

const ADDRESSES: Record<string, string> = {
  'TRC-20': 'TXkPqV9sZbUmWHvCaZLfwBgY3qNxR8eKdM',
  'ERC-20': '0x4aF3bC2e8f1D9Aa72cE63b5B87dF4e1C9Ab3D5E',
  'BEP-20': '0x7bC9dE3F4a2B1c8Ef5A6D7e923cFb47D1aE8c9B',
}
const NET_FEES: Record<string, { fee: number; time: string; feeLabel: string }> = {
  'TRC-20': { fee: 0, time: '1–3 minutes', feeLabel: 'Free' },
  'ERC-20': { fee: 0, time: '2–5 minutes', feeLabel: 'Free' },
  'BEP-20': { fee: 0, time: '1–2 minutes', feeLabel: 'Free' },
}

interface DepHistory {
  id: string
  date: string
  amount: number
  fee: number
  receive: number
  network: string
  wallet: string
  status: 'approved' | 'pending' | 'rejected'
  note: string
  reason?: string
  lockedUntil?: string | null
  unlockEmailSent?: boolean
}
interface DepState {
  amount: number
  network: string
  address: string
  fee: number
  receive: number
}

function pad2(n: number) { return String(n).padStart(2, '0') }

function getCountdown(lockedUntil: string): string {
  const ms = new Date(lockedUntil).getTime() - Date.now()
  if (ms <= 0) return 'Unlocked'
  const totalSec = Math.ceil(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${pad2(s)}`
}

export default function DepositPage() {
  const router = useRouter()
  const supabase = createClient()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [hamburgerOpen, setHamburgerOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [toastShow, setToastShow] = useState(false)
  const [step, setStepState] = useState(1)
  const [depState, setDepState] = useState<DepState>({
    amount: 0, network: '', address: '', fee: 0, receive: 0,
  })
  const [customAmt, setCustomAmt] = useState('')
  const [amtDisplay, setAmtDisplay] = useState('—')
  const [selectedChip, setSelectedChip] = useState<number | null>(null)
  const [selectedNet, setSelectedNet] = useState('')
  const [netInfoVisible, setNetInfoVisible] = useState(false)
  const [txnId, setTxnId] = useState('')
  const [history, setHistory] = useState<DepHistory[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [modalEntry, setModalEntry] = useState<DepHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [wallets, setWallets] = useState<Record<string, string>>({
    'USDT (BEP-20)': '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    'USDT (TRC-20)': 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  })

  // Lock countdown states
  const [lockCountdowns, setLockCountdowns] = useState<Record<string, string>>({})

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bgRef = useRef<HTMLCanvasElement>(null)
  const qrRef = useRef<HTMLCanvasElement>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const emailCheckRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const showToast = useCallback((msg: string) => {
    setToastMsg('✓  ' + msg)
    setToastShow(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastShow(false), 3200)
  }, [])

  // Check for deposits that just unlocked and send email notification
  const checkUnlockNotifications = useCallback(async (deposits: DepHistory[]) => {
    const nowLocked = deposits.filter(
      d => d.status === 'approved' && d.lockedUntil && !d.unlockEmailSent &&
           new Date(d.lockedUntil).getTime() < Date.now()
    )
    for (const dep of nowLocked) {
      try {
        await fetch('/api/unlock-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ depositId: dep.id }),
        })
        // Optimistically update local state
        setHistory(prev => prev.map(d =>
          d.id === dep.id ? { ...d, unlockEmailSent: true } : d
        ))
      } catch (err) {
        console.error('Failed to send unlock notification', err)
      }
    }
  }, [])

  const fetchData = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.push('/auth/signin'); return }
    setUser(authUser)

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()
    setUserProfile(profile)

    const { data: settings } = await supabase.from('settings').select('usdt_bep20_address, usdt_trc20_address').eq('id', 1).maybeSingle()
    if (settings) {
      setWallets({
        'USDT (BEP-20)': settings.usdt_bep20_address || '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        'USDT (TRC-20)': settings.usdt_trc20_address || 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      })
    }

    const { data: depHistory } = await supabase
      .from('deposits')
      .select('*')
      .eq('user_id', authUser.id)
      .order('created_at', { ascending: false })

   if (depHistory) {
  const mapped: DepHistory[] = depHistory.map((d: any) => ({
    id: d.id,
    date: new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    amount: d.amount,
    fee: 0,
    receive: d.amount,
    network: d.network || '—',
    wallet: d.tx_hash || '—',   // ← was "txnId", now "wallet" to match DepHistory type
    status: d.status,
    note: '',
    reason: d.rejection_reason,
    lockedUntil: d.locked_until || null,
    unlockEmailSent: d.unlock_email_sent || false,
  }))
      setHistory(mapped)
      // Check unlock notifications after loading
      checkUnlockNotifications(mapped)
    }
    setLoading(false)
  }, [router, supabase, checkUnlockNotifications])

  useEffect(() => { fetchData() }, [fetchData])

  // Countdown timer: update every second
  useEffect(() => {
    const tick = () => {
      const newCountdowns: Record<string, string> = {}
      let anyLocked = false
      history.forEach(d => {
        if (d.lockedUntil && d.status === 'approved') {
          const ms = new Date(d.lockedUntil).getTime() - Date.now()
          if (ms > 0) {
            newCountdowns[d.id] = getCountdown(d.lockedUntil)
            anyLocked = true
          } else {
            newCountdowns[d.id] = 'Unlocked'
          }
        }
      })
      setLockCountdowns(newCountdowns)
    }
    tick()
    countdownRef.current = setInterval(tick, 1000)
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [history])

  // Periodic check for unlock notifications (every 30 seconds)
  useEffect(() => {
    emailCheckRef.current = setInterval(() => {
      checkUnlockNotifications(history)
    }, 30000)
    return () => { if (emailCheckRef.current) clearInterval(emailCheckRef.current) }
  }, [history, checkUnlockNotifications])

  useEffect(() => {
    const cvs = bgRef.current; if (!cvs) return
    const cx = cvs.getContext('2d'); if (!cx) return
    type C = { x: number; y: number; w: number; h: number; wick: number; up: boolean; spd: number; ph: number }
    type W = { pts: { x: number; y: number }[]; spd: number; ph: number; amp: number; color: string; opa: string }
    let BW = 0, BH = 0, candles: C[] = [], waves: W[] = [], T = 0, aid = 0
    const build = () => {
      const n = Math.max(6, Math.floor(BW / 50))
      candles = Array.from({ length: n }, (_, i) => ({
        x: (i / n) * BW + 14 + Math.random() * 18, y: BH * 0.2 + Math.random() * BH * 0.58,
        w: 8 + Math.random() * 8, h: 14 + Math.random() * 70, wick: 6 + Math.random() * 20,
        up: Math.random() > 0.42, spd: 0.16 + Math.random() * 0.36, ph: Math.random() * Math.PI * 2,
      }))
      const pts = Math.ceil(BW / 36) + 2
      waves = [0, 1, 2, 3].map(i => ({
        pts: Array.from({ length: pts }, (_, j) => ({ x: j * 36, y: BH * (0.15 + i * 0.22) + Math.random() * 45 })),
        spd: 0.11 + i * 0.04, ph: i * 1.4, amp: 14 + i * 8,
        color: i % 2 === 0 ? 'rgba(74,103,65,' : 'rgba(184,147,90,',
        opa: i % 2 === 0 ? '0.7)' : '0.55)',
      }))
    }
    const setup = () => { BW = cvs.width = window.innerWidth; BH = cvs.height = window.innerHeight; build() }
    const draw = () => {
      cx.clearRect(0, 0, BW, BH); T += 0.011
      waves.forEach(w => {
        cx.beginPath()
        w.pts.forEach((p, j) => { const y = p.y + Math.sin(T * w.spd + j * 0.3 + w.ph) * w.amp; j === 0 ? cx.moveTo(p.x, y) : cx.lineTo(p.x, y) })
        cx.strokeStyle = w.color + w.opa; cx.lineWidth = 1; cx.stroke()
      })
      candles.forEach(c => {
        const bob = Math.sin(T * c.spd + c.ph) * 7, x = c.x, y = c.y + bob
        cx.strokeStyle = 'rgba(28,28,28,0.8)'; cx.lineWidth = 1
        cx.beginPath(); cx.moveTo(x + c.w / 2, y - c.wick); cx.lineTo(x + c.w / 2, y + c.h + c.wick); cx.stroke()
        cx.fillStyle = c.up ? 'rgba(74,103,65,0.88)' : 'rgba(184,147,90,0.82)'
        cx.fillRect(x, y, c.w, c.h); cx.strokeRect(x, y, c.w, c.h)
      })
      aid = requestAnimationFrame(draw)
    }
    window.addEventListener('resize', setup); setup(); draw()
    return () => { window.removeEventListener('resize', setup); cancelAnimationFrame(aid) }
  }, [])

  useEffect(() => {
    if (loading) return
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('show'); obs.unobserve(e.target) } }),
      { threshold: 0.12 }
    )
    document.querySelectorAll<HTMLElement>('.dp-reveal').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [step, loading])

  useEffect(() => {
    document.body.style.overflow = sidebarOpen || modalOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen, modalOpen])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setModalOpen(false); setSidebarOpen(false); setHamburgerOpen(false) }
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [])

  const drawQR = useCallback((addr: string) => {
    const canvas = qrRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const size = 100
    canvas.width = size; canvas.height = size
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size)
    const cell = size / 10
    for (let r = 0; r < 10; r++)
      for (let c = 0; c < 10; c++) {
        const ch = addr.charCodeAt((r * 10 + c) % addr.length)
        if (ch % 2 === 0 || (r < 3 && c < 3) || (r < 3 && c > 6) || (r > 6 && c < 3)) {
          ctx.fillStyle = '#1c1c1c'; ctx.fillRect(c * cell + 1, r * cell + 1, cell - 1, cell - 1)
        }
      }
    ;[[0, 0], [0, 7], [7, 0]].forEach(([r, c]) => {
      ctx.strokeStyle = '#1c1c1c'; ctx.lineWidth = 1.5
      ctx.strokeRect(c * cell + 0.5, r * cell + 0.5, cell * 3 - 0.5, cell * 3 - 0.5)
      ctx.fillStyle = '#fff'; ctx.fillRect(c * cell + 1.5, r * cell + 1.5, cell * 3 - 3, cell * 3 - 3)
      ctx.fillStyle = '#1c1c1c'; ctx.fillRect(c * cell + 2.5, r * cell + 2.5, cell * 3 - 6, cell * 3 - 6)
    })
  }, [])

  const setStep = (n: number) => {
    setStepState(n)
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
  }

  const goToStep2 = () => {
    const amt = depState.amount
    if (!amt || amt < 10) { showToast('Please enter a valid amount (min $10)'); return }
    setStep(2)
  }

  const goToStep3 = () => {
    if (!selectedNet) { showToast('Please select a network'); return }
    const addr = ADDRESSES[selectedNet]
    setDepState(s => ({ ...s, network: selectedNet, address: addr, fee: 0, receive: s.amount }))
    setTimeout(() => drawQR(addr), 100)
    setStep(3)
  }

  const goToStep4 = () => { setStep(4) }

  const confirmDeposit = async () => {
    if (!txnId.trim()) { showToast('Please enter your transaction ID'); return }
    if (txnId.trim().length < 10) { showToast('Transaction ID seems too short'); return }

    try {
      // Set locked_until to 5 minutes from NOW (deposit submission time)
      const lockedUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString()

      const { error } = await supabase.from('deposits').insert({
        user_id: user.id,
        amount: depState.amount,
        network: depState.network,
        tx_hash: txnId.trim(),
        status: 'pending',
        locked_until: lockedUntil,
        unlock_email_sent: false,
      })
      if (error) throw error

      showToast('Deposit submitted · Pending review · 5-min lock starts now')
      fetchData()

      setDepState({ amount: 0, network: '', address: '', fee: 0, receive: 0 })
      setCustomAmt(''); setTxnId(''); setAmtDisplay('—')
      setSelectedChip(null); setSelectedNet(''); setNetInfoVisible(false)
      setTimeout(() => setStep(1), 600)
    } catch (err: any) {
      showToast(`⚠ Error: ${err.message || 'Submission failed'}`)
    }
  }

  const copyAddress = () => {
    const addr = depState.address || ADDRESSES['TRC-20']
    if (navigator.clipboard?.writeText)
      navigator.clipboard.writeText(addr).then(() => showToast('Address copied')).catch(() => showToast('Copied'))
    else showToast('Address copied')
  }

  const stepLabels = ['Amount', 'Network', 'Payment', 'Confirm']
  const info = selectedNet ? NET_FEES[selectedNet] : null

  // Check if a deposit is currently locked
  const isLocked = (d: DepHistory): boolean => {
    return !!(d.lockedUntil && new Date(d.lockedUntil).getTime() > Date.now() && d.status === 'approved')
  }

  // Get total locked amount (only approved deposits)
  const lockedAmount = history
    .filter(d => isLocked(d))
    .reduce((sum, d) => sum + d.amount, 0)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--txt2)', background: 'var(--cream)' }}>
      Loading...
    </div>
  )

  return (
    <>
      <canvas ref={bgRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.055, width: '100%', height: '100%' }} />
      <div className={`dp-toast${toastShow ? ' show' : ''}`}>{toastMsg}</div>
      <UserSidebar open={sidebarOpen} onClose={() => { setSidebarOpen(false); setHamburgerOpen(false) }} />

      {/* Lock Notice Banner */}
      {lockedAmount > 0 && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 800,
          background: 'rgba(155,90,58,0.97)', borderBottom: '1px solid rgba(155,58,58,0.4)',
          padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          fontSize: '.75rem', letterSpacing: '.06em', color: '#f6e0d8',
        }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
          <span>
            <strong>${lockedAmount.toLocaleString()} USDT</strong> is currently locked — funds will be available for withdrawal after the 5-minute security hold.
          </span>
        </div>
      )}

      <div className='dp-layout' style={{ marginTop: lockedAmount > 0 ? 42 : 0 }}>
        {/* TOPBAR */}
        <div className='dp-topbar'>
          <button className={`dp-hamburger${hamburgerOpen ? ' is-open' : ''}`}
            onClick={() => { setSidebarOpen(o => !o); setHamburgerOpen(o => !o) }}>
            <span /><span /><span />
          </button>
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className='dp-logo-mark' style={{ width: 26, height: 26 }} />
            <span className='dp-logo-text' style={{ fontSize: '1.15rem' }}>Vault<span>X</span></span>
          </div>
          <div className='dp-avatar' style={{ width: 32, height: 32, fontSize: '.8rem', cursor: 'pointer' }} onClick={() => router.push('/profile')}>
            {userProfile ? `${userProfile.first_name?.[0]}${userProfile.last_name?.[0]}` : '...'}
          </div>
        </div>

        <main className='dp-main'>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            {/* PAGE HEADER */}
            <div style={{ marginBottom: 28 }} className='dp-reveal'>
              <span className='dp-label'>Transactions</span>
              <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(1.6rem,4vw,2.2rem)', fontWeight: 400, color: 'var(--ink)', lineHeight: 1.15 }}>
                Make a <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Deposit</em>
              </h1>
              {/* Lock info notice */}
              <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(184,147,90,.06)', border: '1px solid var(--border)', borderRadius: 'var(--r)', display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '.72rem', color: 'var(--txt2)' }}>
                <svg width="14" height="14" fill="none" stroke="var(--gold)" strokeWidth="1.8" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}>
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <span>
                  <strong style={{ color: 'var(--ink)' }}>5-minute security lock:</strong> Deposited funds are locked for 5 minutes after submission. During this time you can invest in seasons and earn profits, but cannot withdraw the deposited amount. Profits &amp; referral earnings remain withdrawable at any time.
                </span>
              </div>
            </div>

            {/* STEP INDICATOR */}
            <div className='dp-step-bar dp-reveal' style={{ transitionDelay: '.04s' }}>
              {stepLabels.map((lbl, i) => {
                const n = i + 1; const isDone = step > n; const isActive = step === n
                return (
                  <React.Fragment key={n}>
                    <div className='dp-step-item' style={n === 4 ? { flex: '0 0 auto' } : {}}>
                      <div className={`dp-step-dot${isDone ? ' done' : isActive ? ' active' : ''}`}>{isDone ? '✓' : n}</div>
                      <div className={`dp-step-label${isDone ? ' done' : isActive ? ' active' : ''}`}>{lbl}</div>
                    </div>
                    {n < 4 && <div className={`dp-step-line${step > n ? ' done' : ''}`} />}
                  </React.Fragment>
                )
              })}
            </div>

            {/* STEP 1 — AMOUNT */}
            <div className={`dp-card dp-section dp-reveal${step === 1 ? ' visible' : ''}`} style={{ padding: '28px 24px', marginBottom: 20, transitionDelay: '.08s' }}>
              <span className='dp-label'>Step 1 of 4</span>
              <div className='dp-section-title' style={{ fontSize: '1.15rem', marginBottom: 20 }}>Select Deposit Amount</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                {[100, 250, 500, 1000, 2000, 5000].map(v => (
                  <button key={v} className={`dp-amt-chip${selectedChip === v ? ' selected' : ''}`}
                    onClick={() => { setSelectedChip(v); setCustomAmt(String(v)); setDepState(s => ({ ...s, amount: v })); setAmtDisplay('$' + v.toLocaleString()) }}>
                    ${v.toLocaleString()}
                  </button>
                ))}
              </div>
              <div style={{ marginBottom: 6 }}>
                <label className='dp-form-label'>Or enter custom amount (USDT)</label>
                <input className='dp-form-input' type='number' placeholder='Enter amount e.g. 750' min='10' value={customAmt}
                  onChange={e => {
                    setCustomAmt(e.target.value)
                    const v = parseFloat(e.target.value) || 0
                    setDepState(s => ({ ...s, amount: v }))
                    setAmtDisplay(v > 0 ? '$' + v.toLocaleString() : '—')
                    setSelectedChip(null)
                  }} />
              </div>
              <div style={{ fontSize: '.72rem', color: 'var(--txt3)', marginBottom: 20 }}>Minimum deposit: $10 USDT</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--parchment)', border: '1px solid var(--border-s)', borderRadius: 'var(--r)', marginBottom: 20 }}>
                <div style={{ width: 32, height: 32, background: 'rgba(38,162,107,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem', fontWeight: 600, color: '#26a26b', flexShrink: 0 }}>₮</div>
                <div>
                  <div style={{ fontSize: '.82rem', fontWeight: 500, color: 'var(--ink)' }}>Tether USD — USDT</div>
                  <div style={{ fontSize: '.7rem', color: 'var(--txt3)' }}>Stablecoin · 1 USDT ≈ $1.00</div>
                </div>
                <div style={{ marginLeft: 'auto', fontFamily: "'Cormorant Garamond',serif", fontSize: '1.2rem', color: 'var(--gold)' }}>{amtDisplay}</div>
              </div>
              <button className='dp-btn dp-btn-dark' style={{ width: '100%' }} onClick={goToStep2}><span>Continue to Network Selection →</span></button>
            </div>

            {/* STEP 2 — NETWORK */}
            <div className={`dp-card dp-section dp-reveal${step === 2 ? ' visible' : ''}`} style={{ padding: '28px 24px', marginBottom: 20, transitionDelay: '.08s' }}>
              <div style={{ marginBottom: 4 }}>
                <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', fontSize: '.75rem', letterSpacing: '.08em', textTransform: 'uppercase', fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width='14' height='14' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><polyline points='15 18 9 12 15 6' /></svg>Back
                </button>
              </div>
              <span className='dp-label'>Step 2 of 4</span>
              <div className='dp-section-title' style={{ fontSize: '1.15rem', marginBottom: 20 }}>Select Network</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
                {['TRC-20', 'ERC-20', 'BEP-20'].map(net => (
                  <button key={net} className={`dp-net-pill${selectedNet === net ? ' selected' : ''}`}
                    onClick={() => { setSelectedNet(net); setNetInfoVisible(true) }}>
                    {net} <span style={{ color: 'var(--txt3)', fontSize: '.68rem' }}>· {net === 'TRC-20' ? 'TRON' : net === 'ERC-20' ? 'Ethereum' : 'BNB Smart Chain'}</span>
                  </button>
                ))}
              </div>
              {netInfoVisible && info && (
                <div style={{ display: 'block', padding: '14px 16px', background: 'var(--parchment)', border: '1px solid var(--border)', borderRadius: 'var(--r)', marginBottom: 20 }}>
                  <div className='dp-detail-row'><span className='dp-detail-key'>Network</span><span className='dp-detail-val'>{selectedNet}</span></div>
                  <div className='dp-detail-row'><span className='dp-detail-key'>Transaction Fee</span><span className='dp-detail-val' style={{ color: 'var(--sage)' }}>{info.feeLabel}</span></div>
                  <div className='dp-detail-row'><span className='dp-detail-key'>Confirmation Time</span><span className='dp-detail-val'>{info.time}</span></div>
                </div>
              )}
              <button className='dp-btn dp-btn-dark' style={{ width: '100%' }} onClick={goToStep3}><span>Continue to Payment Details →</span></button>
            </div>

            {/* STEP 3 — PAYMENT */}
            <div className={`dp-card dp-section dp-reveal${step === 3 ? ' visible' : ''}`} style={{ padding: '28px 24px', marginBottom: 20, transitionDelay: '.08s' }}>
              <div style={{ marginBottom: 4 }}>
                <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', fontSize: '.75rem', letterSpacing: '.08em', textTransform: 'uppercase', fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width='14' height='14' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><polyline points='15 18 9 12 15 6' /></svg>Back
                </button>
              </div>
              <span className='dp-label'>Step 3 of 4</span>
              <div className='dp-section-title' style={{ fontSize: '1.15rem', marginBottom: 20 }}>Send Payment</div>
              <div style={{ marginBottom: 18 }}>
                <label className='dp-form-label'>Deposit Address ({depState.network || selectedNet})</label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
                  <div className='dp-addr-box'>{depState.address || ADDRESSES['TRC-20']}</div>
                  <button className='dp-copy-btn' onClick={copyAddress}>Copy</button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
                <div className='dp-qr-wrap'><canvas ref={qrRef} width='100' height='100' /></div>
                <div style={{ fontSize: '.78rem', color: 'var(--txt3)', lineHeight: 1.7 }}>
                  Scan the QR code or copy the address above.<br />
                  Send <strong style={{ color: 'var(--ink)' }}>{depState.amount}</strong> USDT via <strong style={{ color: 'var(--ink)' }}>{depState.network}</strong> network.<br />
                  <span style={{ color: '#c0392b', fontSize: '.72rem' }}>⚠ Do not send other coins to this address.</span>
                </div>
              </div>
              <div style={{ padding: '14px 16px', background: 'var(--parchment)', border: '1px solid var(--border)', borderRadius: 'var(--r)', marginBottom: 20 }}>
                <div className='dp-detail-row'><span className='dp-detail-key'>You Send</span><span className='dp-detail-val'>{depState.amount} USDT</span></div>
                <div className='dp-detail-row'><span className='dp-detail-key'>Transaction Fee</span><span className='dp-detail-val' style={{ color: 'var(--sage)' }}>Free</span></div>
                <div className='dp-detail-row'><span className='dp-detail-key'>You Receive</span><span className='dp-detail-val' style={{ color: 'var(--sage)', fontWeight: 600 }}>{depState.amount} USDT</span></div>
                <div className='dp-detail-row'><span className='dp-detail-key'>Network</span><span className='dp-detail-val'>{depState.network}</span></div>
                <div className='dp-detail-row'><span className='dp-detail-key'>Estimated Time</span><span className='dp-detail-val'>{NET_FEES[depState.network || selectedNet]?.time || '—'}</span></div>
              </div>
              {/* Lock notice */}
              <div style={{ padding: '12px 14px', background: 'rgba(155,90,58,.06)', border: '1px solid rgba(155,90,58,.2)', borderRadius: 'var(--r)', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '.71rem', color: 'rgba(155,90,58,.9)' }}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}>
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <span>Once approved by admin, your deposit will be <strong>locked for 5 minutes</strong> before it can be withdrawn. You can still invest it in seasons immediately.</span>
              </div>
              <button className='dp-btn dp-btn-dark' style={{ width: '100%' }} onClick={goToStep4}><span>I've Sent the Payment →</span></button>
            </div>

            {/* STEP 4 — CONFIRM */}
            <div className={`dp-card dp-section dp-reveal${step === 4 ? ' visible' : ''}`} style={{ padding: '28px 24px', marginBottom: 20, transitionDelay: '.08s' }}>
              <div style={{ marginBottom: 4 }}>
                <button onClick={() => setStep(3)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', fontSize: '.75rem', letterSpacing: '.08em', textTransform: 'uppercase', fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width='14' height='14' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><polyline points='15 18 9 12 15 6' /></svg>Back
                </button>
              </div>
              <span className='dp-label'>Step 4 of 4</span>
              <div className='dp-section-title' style={{ fontSize: '1.15rem', marginBottom: 8 }}>Confirm Payment</div>
              <div style={{ fontSize: '.82rem', color: 'var(--txt2)', marginBottom: 22 }}>
                Enter your blockchain transaction ID to complete the deposit request.
              </div>
              <div style={{ marginBottom: 20 }}>
                <label className='dp-form-label'>Transaction ID / Hash</label>
                <input className='dp-form-input' type='text' placeholder='e.g. 0xabcd1234...ef56 or TXN hash' value={txnId} onChange={e => setTxnId(e.target.value)} />
                <div style={{ fontSize: '.7rem', color: 'var(--txt3)', marginTop: 6 }}>
                  Copy the transaction hash from your wallet or exchange after sending.
                </div>
              </div>
              <div style={{ padding: '14px 16px', background: 'var(--parchment)', border: '1px solid var(--border)', borderRadius: 'var(--r)', marginBottom: 20 }}>
                <div className='dp-detail-row'><span className='dp-detail-key'>Amount</span><span className='dp-detail-val'>{depState.amount} USDT</span></div>
                <div className='dp-detail-row'><span className='dp-detail-key'>Network</span><span className='dp-detail-val'>{depState.network}</span></div>
                <div className='dp-detail-row'><span className='dp-detail-key'>To Receive</span><span className='dp-detail-val' style={{ color: 'var(--sage)' }}>{depState.amount} USDT</span></div>
                <div className='dp-detail-row' style={{ borderBottom: 'none' }}>
                  <span className='dp-detail-key'>Security Lock</span>
                  <span className='dp-detail-val' style={{ color: 'rgba(155,90,58,.9)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                    5 minutes after approval
                  </span>
                </div>
              </div>
              <button className='dp-btn dp-btn-dark' style={{ width: '100%' }} onClick={confirmDeposit}><span>✓ Confirm Deposit</span></button>
            </div>

            {/* DEPOSIT HISTORY */}
            <div className='dp-reveal' style={{ marginTop: 36, transitionDelay: '.14s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <span className='dp-label'>Records</span>
                  <div className='dp-section-title' style={{ fontSize: '1.15rem' }}>Deposit History</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {history.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 32, color: 'var(--txt3)', fontSize: '.82rem' }}>No deposit records yet.</div>
                ) : history.map((d, i) => {
                  const locked = isLocked(d)
                  const countdown = lockCountdowns[d.id]
                  const wasLocked = d.lockedUntil && !locked && d.status === 'approved'
                  return (
                    <div key={i} className='dp-hist-row' style={{
                      borderColor: locked ? 'rgba(155,90,58,.35)' : undefined,
                      background: locked ? 'rgba(155,90,58,.03)' : undefined,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                        <div style={{
                          width: 34, height: 34,
                          background: locked ? 'rgba(155,90,58,.12)' : 'rgba(184,147,90,0.1)',
                          border: `1px solid ${locked ? 'rgba(155,90,58,.3)' : 'var(--border)'}`,
                          borderRadius: 'var(--r)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          {locked ? (
                            <svg width="14" height="14" fill="none" stroke="rgba(155,90,58,.9)" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                          ) : (
                            <svg width='14' height='14' fill='none' stroke='var(--gold)' strokeWidth='1.8' viewBox='0 0 24 24'><line x1='12' y1='19' x2='12' y2='5' /><polyline points='5 12 12 5 19 12' /></svg>
                          )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '.82rem', fontWeight: 500, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            {d.id.slice(0, 8).toUpperCase()}
                            <span className={`dp-tag dp-tag-${d.status}`}>{d.status}</span>
                            {locked && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'rgba(155,90,58,.1)', border: '1px solid rgba(155,90,58,.25)', borderRadius: 100, fontSize: '.58rem', letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(155,90,58,.9)' }}>
                                <svg width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                                Locked · {countdown}
                              </span>
                            )}
                            {wasLocked && !locked && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'rgba(74,103,65,.1)', border: '1px solid rgba(74,103,65,.2)', borderRadius: 100, fontSize: '.58rem', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--sage)' }}>
                                <svg width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" opacity=".4"/><path d="M8 11V8a4 4 0 018 0" opacity=".4"/></svg>
                                Unlocked
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '.7rem', color: 'var(--txt3)', marginTop: 2 }}>{d.date} · {d.network}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.1rem', color: 'var(--ink)', fontWeight: 500 }}>+${d.amount.toLocaleString()}</div>
                        <button onClick={() => { setModalEntry(d); setModalOpen(true) }}
                          style={{ fontSize: '.68rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 2 }}>
                          View →
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* TRANSACTION DETAIL MODAL */}
      <div className={`dp-modal-overlay${modalOpen ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}>
        <div className='dp-modal-sheet'>
          <div className='dp-modal-handle' />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <span className='dp-label'>Transaction</span>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.3rem', fontWeight: 400 }}>Deposit Details</div>
            </div>
            <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', fontSize: '1.4rem', lineHeight: 1 }}>×</button>
          </div>
          {modalEntry && (
            <>
              <div style={{ padding: '14px 16px', background: 'var(--parchment)', border: '1px solid var(--border)', borderRadius: 'var(--r)', marginBottom: 16 }}>
                <div className='dp-detail-row'><span className='dp-detail-key'>Transaction ID</span><span className='dp-detail-val'>{modalEntry.id}</span></div>
                <div className='dp-detail-row'><span className='dp-detail-key'>Status</span><span className='dp-detail-val'><span className={`dp-tag dp-tag-${modalEntry.status}`} style={{ fontSize: '.72rem' }}>{modalEntry.status}</span></span></div>
                <div className='dp-detail-row'><span className='dp-detail-key'>Date</span><span className='dp-detail-val'>{modalEntry.date}</span></div>
                <div className='dp-detail-row'><span className='dp-detail-key'>Amount Sent</span><span className='dp-detail-val'>{modalEntry.amount} USDT</span></div>
                <div className='dp-detail-row'><span className='dp-detail-key'>Transaction Fee</span><span className='dp-detail-val' style={{ color: 'var(--sage)' }}>Free</span></div>
                <div className='dp-detail-row'><span className='dp-detail-key'>Amount Received</span><span className='dp-detail-val' style={{ color: 'var(--sage)' }}>{modalEntry.amount} USDT</span></div>
                <div className='dp-detail-row'><span className='dp-detail-key'>Network</span><span className='dp-detail-val'>{modalEntry.network}</span></div>
                {/* Lock status row */}
                {modalEntry.lockedUntil && (
                  <div className='dp-detail-row' style={{ borderBottom: 'none' }}>
                    <span className='dp-detail-key'>Lock Status</span>
                    <span className='dp-detail-val' style={{ color: isLocked(modalEntry) ? 'rgba(155,90,58,.9)' : 'var(--sage)', display: 'flex', alignItems: 'center', gap: 4, fontSize: '.76rem' }}>
                      {isLocked(modalEntry) ? (
                        <>
                          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                          Locked · {lockCountdowns[modalEntry.id] || '—'}
                        </>
                      ) : (
                        <>
                          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" opacity=".4"/><path d="M8 11V8a4 4 0 018 0" opacity=".4"/></svg>
                          Unlocked
                        </>
                      )}
                    </span>
                  </div>
                )}
              </div>
              {modalEntry.status === 'rejected' && modalEntry.reason && (
                <div style={{ padding: '14px 16px', background: 'rgba(180,50,50,0.05)', border: '1px solid rgba(180,50,50,0.2)', borderRadius: 'var(--r)' }}>
                  <div style={{ fontSize: '.7rem', letterSpacing: '.1em', textTransform: 'uppercase', color: '#b43232', marginBottom: 6 }}>Rejection Reason</div>
                  <div style={{ fontSize: '.82rem', color: 'var(--ink)', lineHeight: 1.6 }}>{modalEntry.reason}</div>
                </div>
              )}
            </>
          )}
          <button className='dp-btn dp-btn-outline' style={{ width: '100%', marginTop: 20 }} onClick={() => setModalOpen(false)}>Close</button>
        </div>
      </div>
    </>
  )
}