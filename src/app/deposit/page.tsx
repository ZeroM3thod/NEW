'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import UserSidebar from '@/components/UserSidebar'
import VaultXLoader from '@/components/VaultXLoader'
import { createClient } from '@/utils/supabase/client'
import React from 'react'

const ADDRESSES: Record<string, string> = {
  'TRC-20': 'TXkPqV9sZbUmWHvCaZLfwBgY3qNxR8eKdM',
  'ERC-20': '0x4aF3bC2e8f1D9Aa72cE63b5B87dF4e1C9Ab3D5E',
  'BEP-20': '0x7bC9dE3F4a2B1c8Ef5A6D7e923cFb47D1aE8c9B',
}

const QR_IMAGES: Record<string, string> = {
  'TRC-20': '/qr/trc20.jpg',
  'ERC-20': '/qr/erc20.jpg',
  'BEP-20': '/qr/bep20.jpg',
}

const NET_FEES: Record<string, { fee: number; time: string; feeLabel: string }> = {
  'TRC-20': { fee: 0, time: '1–3 minutes', feeLabel: 'Free' },
  'ERC-20': { fee: 0, time: '2–5 minutes', feeLabel: 'Free' },
  'BEP-20': { fee: 0, time: '1–2 minutes', feeLabel: 'Free' },
}

const NET_INFO: Record<string, { chain: string; color: string; desc: string }> = {
  'TRC-20': { chain: 'TRON Network', color: '#e8423d', desc: 'Fastest & cheapest — recommended' },
  'ERC-20': { chain: 'Ethereum Network', color: '#627EEA', desc: 'Most widely supported' },
  'BEP-20': { chain: 'BNB Smart Chain', color: '#F0B90B', desc: 'Low fees, fast confirmation' },
}

const NET_ICONS: Record<string, React.ReactNode> = {
  'TRC-20': (
    <svg viewBox="0 0 36 36" width="24" height="24" style={{display:'block'}}>
      <circle cx="18" cy="18" r="18" fill="rgba(232,66,61,0.14)"/>
      <polygon points="18,5 31,29 5,29" fill="none" stroke="#e8423d" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx="18" cy="23" r="3.2" fill="#e8423d"/>
    </svg>
  ),
  'ERC-20': (
    <svg viewBox="0 0 36 36" width="24" height="24" style={{display:'block'}}>
      <circle cx="18" cy="18" r="18" fill="rgba(98,126,234,0.14)"/>
      <path d="M18 6 L18 17 L27 21 Z" fill="#627EEA" opacity="0.7"/>
      <path d="M18 6 L9 21 L18 17 Z" fill="#627EEA" opacity="0.9"/>
      <path d="M18 24 L27 21 L18 30 Z" fill="#627EEA" opacity="0.45"/>
      <path d="M18 24 L9 21 L18 30 Z" fill="#627EEA" opacity="0.75"/>
      <path d="M18 17 L27 21 L18 24 L9 21 Z" fill="#627EEA"/>
    </svg>
  ),
  'BEP-20': (
    <svg viewBox="0 0 36 36" width="24" height="24" style={{display:'block'}}>
      <circle cx="18" cy="18" r="18" fill="rgba(240,185,11,0.14)"/>
      <rect x="15" y="7.5" width="6" height="6" rx="1" fill="#F0B90B" transform="rotate(45 18 10.5)"/>
      <rect x="7.5" y="15" width="6" height="6" rx="1" fill="#F0B90B" transform="rotate(45 10.5 18)"/>
      <rect x="15" y="15" width="6" height="6" rx="1" fill="#F0B90B" transform="rotate(45 18 18)"/>
      <rect x="22.5" y="15" width="6" height="6" rx="1" fill="#F0B90B" transform="rotate(45 25.5 18)"/>
      <rect x="15" y="22.5" width="6" height="6" rx="1" fill="#F0B90B" transform="rotate(45 18 25.5)"/>
    </svg>
  ),
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
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
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
  const [addrCopied, setAddrCopied] = useState(false)

  const [lockCountdowns, setLockCountdowns] = useState<Record<string, string>>({})
  const [lockedAmount, setLockedAmount] = useState(0)

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bgRef = useRef<HTMLCanvasElement>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const emailCheckRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const showToast = useCallback((msg: string) => {
    setToastMsg('✓  ' + msg)
    setToastShow(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastShow(false), 3200)
  }, [])

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

    const { data: locked } = await supabase
      .from('deposits')
      .select('id, amount, locked_until')
      .eq('user_id', authUser.id)
      .eq('status', 'approved')
      .gt('locked_until', new Date().toISOString())

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
        wallet: d.tx_hash || '—',
        status: d.status,
        note: '',
        reason: d.rejection_reason,
        lockedUntil: d.locked_until || null,
        unlockEmailSent: d.unlock_email_sent || false,
      }))
      setHistory(mapped)
      checkUnlockNotifications(mapped)
    }
    setLoading(false)
  }, [router, supabase, checkUnlockNotifications])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const tick = () => {
      const newCountdowns: Record<string, string> = {}
      let stillLockedTotal = 0

      history.forEach(d => {
        if (d.lockedUntil && d.status === 'approved') {
          const ms = new Date(d.lockedUntil).getTime() - Date.now()
          if (ms > 0) {
            newCountdowns[d.id] = getCountdown(d.lockedUntil)
            stillLockedTotal += d.amount
          } else {
            newCountdowns[d.id] = 'Unlocked'
          }
        }
      })

      // ── FIX 3: cap locked at the user's current balance ──
      const profileBalance = Number(userProfile?.balance) || 0
      const cappedLocked   = Math.min(stillLockedTotal, profileBalance)
      setLockCountdowns(newCountdowns)
      setLockedAmount(cappedLocked)
    }
    tick()
    countdownRef.current = setInterval(tick, 1000)
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [history, userProfile])   // ← add userProfile dependency

  useEffect(() => {
    // Only start the interval if there are deposits that could become unlockable
    const watchable = history.filter(
      (d: DepHistory) => d.status === 'approved' && d.lockedUntil && !d.unlockEmailSent
    )
    if (watchable.length === 0) return   // ← nothing to watch, don't start interval

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
    setAddrCopied(false)
    setStep(3)
  }

  const goToStep4 = () => { setStep(4) }

  const confirmDeposit = async () => {
    if (!txnId.trim()) { showToast('Please enter your transaction ID'); return }
    if (txnId.trim().length < 10) { showToast('Transaction ID seems too short'); return }

    try {
      const lockedUntil = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
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

      showToast('Deposit submitted · Pending review · 60-day lock starts on approval')
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
      navigator.clipboard.writeText(addr).then(() => { setAddrCopied(true); showToast('Address copied'); setTimeout(() => setAddrCopied(false), 2500) }).catch(() => showToast('Copied'))
    else showToast('Address copied')
  }

  const stepLabels = ['Amount', 'Network', 'Payment', 'Confirm']
  const info = selectedNet ? NET_FEES[selectedNet] : null

  const isLocked = (d: DepHistory): boolean => {
    return !!(d.lockedUntil && new Date(d.lockedUntil).getTime() > Date.now() && d.status === 'approved')
  }

  const netMeta = depState.network ? NET_INFO[depState.network] : null

  return (
    <>
      {loading && <VaultXLoader pageName="Deposit" />}
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
          <span><strong>${lockedAmount.toLocaleString()} USDT</strong> is currently locked — available for withdrawal after the 60-day security hold.</span>
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
              <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(184,147,90,.06)', border: '1px solid var(--border)', borderRadius: 'var(--r)', display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '.72rem', color: 'var(--txt2)' }}>
                <svg width="14" height="14" fill="none" stroke="var(--gold)" strokeWidth="1.8" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}>
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <span><strong style={{ color: 'var(--ink)' }}>60-day security lock:</strong> Deposited funds are locked for 60 days after admin approval. During this time you can invest in seasons and earn profits. Profits &amp; referral earnings are withdrawable at any time.</span>
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

            {/* ── STEP 1: AMOUNT ── */}
            <div className={`dp-card dp-section dp-reveal${step === 1 ? ' visible' : ''}`} style={{ padding: '24px', marginBottom: 20, transitionDelay: '.08s' }}>
              <span className='dp-label'>Step 1 of 4</span>
              <div className='dp-section-title' style={{ fontSize: '1.15rem', marginBottom: 18 }}>Select Deposit Amount</div>
              
              <div style={{ marginBottom: 16 }}>
                <label className='dp-form-label' style={{ marginBottom: 10 }}>Quick Select</label>
                <div className='dp-chips-grid'>
                  {[100, 250, 500, 1000, 2000, 5000].map(v => (
                    <button key={v} className={`dp-amt-chip${selectedChip === v ? ' selected' : ''}`}
                      onClick={() => { setSelectedChip(v); setCustomAmt(String(v)); setDepState(s => ({ ...s, amount: v })); setAmtDisplay('$' + v.toLocaleString()) }}>
                      <span className='dp-chip-val'>${v >= 1000 ? (v/1000)+'K' : v}</span>
                      <span className='dp-chip-usdt'>USDT</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 8 }}>
                <label className='dp-form-label'>Custom Amount (USDT)</label>
                <input className='dp-form-input' type='number' placeholder='Enter amount e.g. 750' min='10' value={customAmt}
                  onChange={e => {
                    setCustomAmt(e.target.value)
                    const v = parseFloat(e.target.value) || 0
                    setDepState(s => ({ ...s, amount: v }))
                    setAmtDisplay(v > 0 ? '$' + v.toLocaleString() : '—')
                    setSelectedChip(null)
                  }} />
                <div style={{ fontSize: '.7rem', color: 'var(--txt3)', marginTop: 5 }}>Minimum deposit: $10 USDT</div>
              </div>

              {/* Amount summary pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--parchment)', border: '1px solid var(--border-s)', borderRadius: 'var(--r)', marginBottom: 20, marginTop: 16 }}>
                <div style={{ width: 36, height: 36, background: 'rgba(38,162,107,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem', fontWeight: 700, color: '#26a26b', flexShrink: 0 }}>₮</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '.75rem', fontWeight: 500, color: 'var(--ink)' }}>Tether USD — USDT</div>
                  <div style={{ fontSize: '.67rem', color: 'var(--txt3)' }}>Stablecoin · 1 USDT ≈ $1.00</div>
                </div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.4rem', color: 'var(--gold)', fontWeight: 400 }}>{amtDisplay}</div>
              </div>

              <button className='dp-btn dp-btn-dark' style={{ width: '100%' }} onClick={goToStep2}><span>Continue →</span></button>
            </div>

            {/* ── STEP 2: NETWORK ── */}
            <div className={`dp-card dp-section dp-reveal${step === 2 ? ' visible' : ''}`} style={{ padding: '24px', marginBottom: 20, transitionDelay: '.08s' }}>
              <button onClick={() => setStep(1)} className='dp-back-btn'>
                <svg width='14' height='14' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><polyline points='15 18 9 12 15 6' /></svg>Back
              </button>
              <span className='dp-label'>Step 2 of 4</span>
              <div className='dp-section-title' style={{ fontSize: '1.15rem', marginBottom: 18 }}>Select Network</div>

              <div className='dp-network-grid'>
                {(['TRC-20', 'ERC-20', 'BEP-20'] as const).map(net => {
                  const meta = NET_INFO[net]
                  const feeInfo = NET_FEES[net]
                  const isSelected = selectedNet === net
                  const isTRC = net === 'TRC-20'
                  return (
                    <button
                      key={net}
                      className={`dp-net-card${isSelected ? ' selected' : ''}`}
                      onClick={() => { setSelectedNet(net); setNetInfoVisible(true) }}
                      style={{
                        background: isSelected
                          ? `linear-gradient(135deg, ${meta.color}10, var(--cream))`
                          : 'var(--cream)',
                        borderColor: isSelected ? meta.color : undefined,
                        position: 'relative',
                      }}
                    >
                      {/* Network icon */}
                      <div style={{
                        width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                        background: isSelected ? `${meta.color}22` : `${meta.color}10`,
                        border: `1.5px solid ${meta.color}${isSelected ? '55' : '25'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all .25s',
                      }}>
                        {NET_ICONS[net]}
                      </div>

                      {/* Network info */}
                      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '.88rem', fontWeight: 600, color: 'var(--ink)', letterSpacing: '.01em' }}>
                            {net}
                          </span>
                          {isTRC && (
                            <span style={{
                              fontSize: '.52rem', letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 600,
                              background: 'rgba(74,103,65,.1)', color: 'var(--sage)',
                              border: '1px solid rgba(74,103,65,.2)', borderRadius: 100, padding: '2px 7px',
                            }}>
                              Recommended
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '.73rem', fontWeight: 500, color: meta.color, marginBottom: 3 }}>
                          {meta.chain}
                        </div>
                        <div style={{ fontSize: '.67rem', color: 'var(--txt3)', lineHeight: 1.45 }}>
                          {meta.desc}
                        </div>
                      </div>

                      {/* Fee + confirmation time */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                        {isSelected ? (
                          <div style={{
                            width: 22, height: 22, borderRadius: '50%',
                            background: 'var(--sage)', color: 'white',
                            fontSize: '.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, boxShadow: '0 2px 6px rgba(74,103,65,.3)',
                          }}>✓</div>
                        ) : (
                          <span style={{
                            fontSize: '.58rem', letterSpacing: '.09em', textTransform: 'uppercase', fontWeight: 600,
                            background: 'rgba(74,103,65,.1)', color: 'var(--sage)',
                            border: '1px solid rgba(74,103,65,.2)', borderRadius: 100, padding: '3px 10px',
                          }}>
                            {feeInfo.feeLabel}
                          </span>
                        )}
                        <span style={{
                          fontSize: '.64rem', color: 'var(--txt3)',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <svg width="11" height="11" fill="none" stroke="var(--gold)" strokeWidth="1.8" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                          </svg>
                          {feeInfo.time}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>

              {!selectedNet && (
                <div style={{ padding: '12px 14px', background: 'rgba(184,147,90,.05)', border: '1px dashed var(--border)', borderRadius: 'var(--r)', textAlign: 'center', fontSize: '.75rem', color: 'var(--txt3)' }}>
                  Select a network above to continue
                </div>
              )}

              <button className='dp-btn dp-btn-dark' style={{ width: '100%', marginTop: 16 }} onClick={goToStep3}><span>Continue →</span></button>
            </div>

            {/* ── STEP 3: PAYMENT ── */}
            <div className={`dp-card dp-section dp-reveal${step === 3 ? ' visible' : ''}`} style={{ padding: '24px', marginBottom: 20, transitionDelay: '.08s' }}>
              <button onClick={() => setStep(2)} className='dp-back-btn'>
                <svg width='14' height='14' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><polyline points='15 18 9 12 15 6' /></svg>Back
              </button>
              <span className='dp-label'>Step 3 of 4</span>
              <div className='dp-section-title' style={{ fontSize: '1.15rem', marginBottom: 6 }}>Send Payment</div>
              {netMeta && (
                <div style={{ fontSize: '.72rem', color: 'var(--txt2)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: netMeta.color, display: 'inline-block', flexShrink: 0 }} />
                  Sending via <strong style={{ color: 'var(--ink)' }}>{depState.network || selectedNet}</strong> · {netMeta.chain}
                </div>
              )}

              {/* QR + Address layout */}
              <div className='dp-payment-layout' style={{ marginBottom: 18 }}>
                {/* QR Code */}
                <div className='dp-qr-container'>
                  <div className='dp-qr-frame'>
                    <div className='dp-qr-corner dp-qr-tl'/>
                    <div className='dp-qr-corner dp-qr-tr'/>
                    <div className='dp-qr-corner dp-qr-bl'/>
                    <div className='dp-qr-corner dp-qr-br'/>
                    {/* Real QR code image */}
                    <img
                      src={QR_IMAGES[depState.network || selectedNet]}
                      alt={`QR code for ${depState.network} deposit`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 2, display: 'block' }}
                    />
                  </div>
                  <div style={{ marginTop: 8, fontSize: '.62rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--txt3)', textAlign: 'center' }}>
                    Scan to pay
                  </div>
                </div>

                {/* Right side info */}
                <div>
                  <div style={{ marginBottom: 14 }}>
                    <label className='dp-form-label' style={{ marginBottom: 8 }}>Deposit Address</label>
                    <div className='dp-addr-box-new'>
                      <span className='dp-addr-text'>{depState.address || ADDRESSES['TRC-20']}</span>
                      <button className={`dp-copy-btn-sm${addrCopied ? ' copied' : ''}`} onClick={copyAddress}>
                        {addrCopied ? '✓ Copied' : (
                          <>
                            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                            </svg>
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className='dp-pay-summary'>
                    <div className='dp-pay-row' style={{ borderBottom: '1px solid rgba(184,147,90,.1)', paddingBottom: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: '.65rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--txt3)' }}>You Send</span>
                      <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.1rem', color: 'var(--ink)', fontWeight: 500 }}>{depState.amount} USDT</span>
                    </div>
                    <div className='dp-pay-row' style={{ borderBottom: '1px solid rgba(184,147,90,.1)', paddingBottom: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: '.65rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--txt3)' }}>Network Fee</span>
                      <span style={{ fontSize: '.82rem', color: 'var(--sage)', fontWeight: 500 }}>Free</span>
                    </div>
                    <div className='dp-pay-row' style={{ borderBottom: 'none' }}>
                      <span style={{ fontSize: '.65rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--txt3)' }}>You Receive</span>
                      <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.1rem', color: 'var(--sage)', fontWeight: 600 }}>{depState.amount} USDT</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Important notice */}
              <div style={{ padding: '11px 14px', background: 'rgba(155,58,58,.04)', border: '1px solid rgba(155,58,58,.15)', borderRadius: 'var(--r)', marginBottom: 16, fontSize: '.7rem', color: '#9b5a3a', lineHeight: 1.7, display: 'flex', gap: 8 }}>
                <span style={{ flexShrink: 0, fontSize: '1rem' }}>⚠</span>
                <span>Only send <strong>USDT</strong> using the <strong>{depState.network || selectedNet}</strong> network. Sending other coins or using wrong networks will result in permanent loss. Double-check the address before sending.</span>
              </div>

              {/* Lock notice */}
              <div style={{ padding: '10px 13px', background: 'rgba(155,90,58,.06)', border: '1px solid rgba(155,90,58,.2)', borderRadius: 'var(--r)', marginBottom: 18, fontSize: '.7rem', color: 'rgba(155,90,58,.9)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}>
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <span>Once approved by admin, your deposit will be <strong>locked for 60 days</strong> before withdrawal is available. You can still invest it in seasons immediately.</span>
              </div>

              <button className='dp-btn dp-btn-dark' style={{ width: '100%' }} onClick={goToStep4}><span>I've Sent the Payment →</span></button>
            </div>

            {/* ── STEP 4: CONFIRM ── */}
            <div className={`dp-card dp-section dp-reveal${step === 4 ? ' visible' : ''}`} style={{ padding: '24px', marginBottom: 20, transitionDelay: '.08s' }}>
              <button onClick={() => setStep(3)} className='dp-back-btn'>
                <svg width='14' height='14' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><polyline points='15 18 9 12 15 6' /></svg>Back
              </button>
              <span className='dp-label'>Step 4 of 4</span>
              <div className='dp-section-title' style={{ fontSize: '1.15rem', marginBottom: 8 }}>Confirm & Submit</div>
              <div style={{ fontSize: '.8rem', color: 'var(--txt2)', marginBottom: 20, lineHeight: 1.6 }}>
                Enter the blockchain transaction ID to complete your deposit request.
              </div>
              <div style={{ marginBottom: 20 }}>
                <label className='dp-form-label'>Transaction ID / Hash</label>
                <input className='dp-form-input' type='text' placeholder='e.g. 0xabcd1234…ef56 or TXN hash' value={txnId} onChange={e => setTxnId(e.target.value)} />
                <div style={{ fontSize: '.68rem', color: 'var(--txt3)', marginTop: 6 }}>
                  Copy the transaction hash from your wallet or exchange after sending.
                </div>
              </div>

              {/* Summary */}
              <div style={{ padding: '14px 16px', background: 'var(--parchment)', border: '1px solid var(--border)', borderRadius: 'var(--r)', marginBottom: 20 }}>
                {[
                  ['Amount', `${depState.amount} USDT`, 'var(--ink)'],
                  ['Network', depState.network, 'var(--ink)'],
                  ['To Receive', `${depState.amount} USDT`, 'var(--sage)'],
                  ['Security Lock', '60 days from approval', 'rgba(155,90,58,.9)'],
                ].map(([k, v, c]) => (
                  <div key={k} className='dp-detail-row'>
                    <span className='dp-detail-key'>{k}</span>
                    <span className='dp-detail-val' style={{ color: c }}>{v}</span>
                  </div>
                ))}
              </div>

              <button className='dp-btn dp-btn-dark' style={{ width: '100%' }} onClick={confirmDeposit}><span>✓ Confirm Deposit</span></button>
            </div>

            {/* ── DEPOSIT HISTORY ── */}
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
                          width: 36, height: 36,
                          background: locked ? 'rgba(155,90,58,.12)' : d.status === 'approved' ? 'rgba(74,103,65,.1)' : d.status === 'rejected' ? 'rgba(155,58,58,.08)' : 'rgba(184,147,90,0.1)',
                          border: `1px solid ${locked ? 'rgba(155,90,58,.3)' : 'var(--border)'}`,
                          borderRadius: 'var(--r)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          {locked ? (
                            <svg width="14" height="14" fill="none" stroke="rgba(155,90,58,.9)" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                          ) : d.status === 'approved' ? (
                            <svg width='14' height='14' fill='none' stroke='var(--sage)' strokeWidth='1.8' viewBox='0 0 24 24'><polyline points='20 6 9 17 4 12'/></svg>
                          ) : d.status === 'rejected' ? (
                            <svg width='14' height='14' fill='none' stroke='#9b3a3a' strokeWidth='1.8' viewBox='0 0 24 24'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg>
                          ) : (
                            <svg width='14' height='14' fill='none' stroke='var(--gold)' strokeWidth='1.8' viewBox='0 0 24 24'><circle cx='12' cy='12' r='10'/><polyline points='12 6 12 12 16 14'/></svg>
                          )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '.8rem', fontWeight: 500, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '.72rem' }}>{d.id.slice(0, 8).toUpperCase()}</span>
                            <span className={`dp-tag dp-tag-${d.status}`}>{d.status}</span>
                            {locked && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', background: 'rgba(155,90,58,.1)', border: '1px solid rgba(155,90,58,.25)', borderRadius: 100, fontSize: '.58rem', textTransform: 'uppercase', color: 'rgba(155,90,58,.9)' }}>
                                🔒 {countdown}
                              </span>
                            )}
                            {wasLocked && !locked && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', background: 'rgba(74,103,65,.1)', border: '1px solid rgba(74,103,65,.2)', borderRadius: 100, fontSize: '.58rem', textTransform: 'uppercase', color: 'var(--sage)' }}>
                                🔓 Unlocked
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '.68rem', color: 'var(--txt3)', marginTop: 3 }}>{d.date} · {d.network}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.15rem', color: 'var(--ink)', fontWeight: 500 }}>+${d.amount.toLocaleString()}</div>
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
            <button onClick={() => setModalOpen(false)} style={{ background: 'rgba(184,147,90,.1)', border: '1px solid var(--border)', borderRadius: 'var(--r)', cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: 'var(--txt2)' }}>×</button>
          </div>
          {modalEntry && (
            <>
              <div style={{ padding: '14px 16px', background: 'var(--parchment)', border: '1px solid var(--border)', borderRadius: 'var(--r)', marginBottom: 16 }}>
                {[
                  ['Transaction ID', modalEntry.id],
                  ['Status', null],
                  ['Date', modalEntry.date],
                  ['Amount Sent', `${modalEntry.amount} USDT`],
                  ['Network Fee', 'Free'],
                  ['Amount Received', `${modalEntry.amount} USDT`],
                  ['Network', modalEntry.network],
                ].map(([k, v]) => (
                  <div key={k as string} className='dp-detail-row'>
                    <span className='dp-detail-key'>{k}</span>
                    {k === 'Status' ? (
                      <span className={`dp-tag dp-tag-${modalEntry.status}`}>{modalEntry.status}</span>
                    ) : k === 'Network Fee' ? (
                      <span className='dp-detail-val' style={{ color: 'var(--sage)' }}>{v}</span>
                    ) : k === 'Amount Received' ? (
                      <span className='dp-detail-val' style={{ color: 'var(--sage)' }}>{v}</span>
                    ) : (
                      <span className='dp-detail-val' style={{ fontSize: '.76rem', wordBreak: 'break-all', maxWidth: 200, textAlign: 'right' }}>{v as string}</span>
                    )}
                  </div>
                ))}
                {modalEntry.lockedUntil && (
                  <div className='dp-detail-row' style={{ borderBottom: 'none' }}>
                    <span className='dp-detail-key'>Lock Status</span>
                    <span className='dp-detail-val' style={{ color: isLocked(modalEntry) ? 'rgba(155,90,58,.9)' : 'var(--sage)', fontSize: '.76rem' }}>
                      {isLocked(modalEntry) ? `🔒 Locked · ${lockCountdowns[modalEntry.id] || '—'}` : '🔓 Unlocked'}
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