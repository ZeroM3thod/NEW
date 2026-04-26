'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import UserSidebar from '@/components/UserSidebar'
import VaultXLoader from '@/components/VaultXLoader'
import { createClient } from '@/utils/supabase/client'

interface WdHistory {
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
}
interface PendingWd {
  amt: number
  addr: string
  note: string
  recv: string
  shortAddr: string
}
interface LockedDeposit {
  id: string
  amount: number
  lockedUntil: string
}

function pad2(n: number) { return String(n).padStart(2, '0') }

function getLockCountdown(lockedUntil: string): string {
  const ms = new Date(lockedUntil).getTime() - Date.now()
  if (ms <= 0) return 'Unlocked'
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

export default function WithdrawPage() {
  const router = useRouter()
  const supabase = createClient()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [hamburgerOpen, setHamburgerOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [toastShow, setToastShow] = useState(false)
  const [wdAmt, setWdAmt] = useState('')
  const [wdAddr, setWdAddr] = useState('')
  const [wdNote, setWdNote] = useState('')
  const [fsReq, setFsReq] = useState('—')
  const [fsRecv, setFsRecv] = useState('—')
  const [selectedChip, setSelectedChip] = useState<number | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmDetails, setConfirmDetails] = useState<PendingWd | null>(null)
  const [history, setHistory] = useState<WdHistory[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [modalEntry, setModalEntry] = useState<WdHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)

  // Locked deposit tracking
  const [lockedDeposits, setLockedDeposits] = useState<LockedDeposit[]>([])
  const [lockedAmount, setLockedAmount] = useState(0)
  const [lockCountdowns, setLockCountdowns] = useState<Record<string, string>>({})

  // FIX: Track pending withdrawals total separately so we can subtract from available
  const [pendingWithdrawalsTotal, setPendingWithdrawalsTotal] = useState(0)

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bgRef = useRef<HTMLCanvasElement>(null)
  const lockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const showToast = useCallback((msg: string) => {
    setToastMsg('✓  ' + msg)
    setToastShow(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastShow(false), 3200)
  }, [])

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/signin'); return }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setUserProfile(profile)

    // Fetch locked deposits (approved, locked_until > NOW())
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
      setLockedAmount(lockedArr.reduce((sum, d) => sum + d.amount, 0))
    } else {
      setLockedDeposits([])
      setLockedAmount(0)
    }

    // FIX: Fetch pending withdrawals total so we can subtract from available
    const { data: pendingWds } = await supabase
      .from('withdrawals')
      .select('amount')
      .eq('user_id', user.id)
      .eq('status', 'pending')

    const pendingTotal = pendingWds?.reduce((sum: number, w: any) => sum + Number(w.amount), 0) || 0
    setPendingWithdrawalsTotal(pendingTotal)

    const { data: wdHistory } = await supabase
      .from('withdrawals').select('*').eq('user_id', user.id).order('created_at', { ascending: false })

    if (wdHistory) {
      const mapped: WdHistory[] = wdHistory.map(w => ({
        id: w.id.slice(0, 8).toUpperCase(),
        date: new Date(w.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        amount: w.amount,
        fee: 0,
        receive: w.amount,
        network: w.network || 'BEP-20',
        wallet: w.address.length > 20 ? w.address.slice(0, 10) + '...' + w.address.slice(-6) : w.address,
        status: w.status,
        note: w.note || '',
        reason: w.rejection_reason
      }))
      setHistory(mapped)
    }
    setLoading(false)
  }, [router, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  // Lock countdown timer
  useEffect(() => {
    if (lockedDeposits.length === 0) {
      setLockCountdowns({})
      setLockedAmount(0)
      return
    }
    const tick = () => {
      const now = Date.now()
      const newCountdowns: Record<string, string> = {}
      let stillLockedRaw = 0
      let anyStillLocked = false

      lockedDeposits.forEach(d => {
        const ms = new Date(d.lockedUntil).getTime() - now
        if (ms > 0) {
          newCountdowns[d.id] = getLockCountdown(d.lockedUntil)
          stillLockedRaw += d.amount
          anyStillLocked = true
        } else {
          newCountdowns[d.id] = 'Unlocked'
        }
      })

      const profileBalance = Number(userProfile?.balance) || 0
      setLockCountdowns(newCountdowns)
      setLockedAmount(Math.min(stillLockedRaw, profileBalance))

      if (!anyStillLocked) {
        if (lockTimerRef.current) clearInterval(lockTimerRef.current)
      }
    }
    tick()
    lockTimerRef.current = setInterval(tick, 1000)
    return () => { if (lockTimerRef.current) clearInterval(lockTimerRef.current) }
  }, [lockedDeposits, userProfile])

  useEffect(() => {
    const allExpired = lockedDeposits.length > 0 &&
      lockedDeposits.every((d: LockedDeposit) => new Date(d.lockedUntil).getTime() <= Date.now())
    if (allExpired) {
      fetchData()
    }
  }, [lockedDeposits, fetchData])

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
    document.querySelectorAll<HTMLElement>('.wd-reveal').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [loading])

  useEffect(() => {
    document.body.style.overflow = sidebarOpen || confirmOpen || modalOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen, confirmOpen, modalOpen])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setModalOpen(false); setConfirmOpen(false); setSidebarOpen(false); setHamburgerOpen(false) }
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [])

  // ── FIX: Correct withdrawable calculation ──────────────────────────────────
  // RULE: Users can only withdraw profits (season profits + referral earnings).
  //       Locked deposit principal cannot be withdrawn during the 60-day lock.
  //       After lock expires, principal is also withdrawable.
  //
  // Formula: withdrawable = balance - locked_deposits - pending_withdrawals
  //
  // We do NOT use withdrawable_total from the DB because it gets incorrectly
  // set to full balance when seasons close (including locked deposit principal).
  // Instead we compute it directly from live data fetched above.
  // ──────────────────────────────────────────────────────────────────────────
  const currentBalance        = Number(userProfile?.balance) || 0
  const effectiveLockedAmount = Math.min(lockedAmount, currentBalance)

  // The true withdrawable amount: balance minus still-locked deposits minus pending withdrawal requests
  const effectiveWithdrawable = Math.max(0, currentBalance - effectiveLockedAmount - pendingWithdrawalsTotal)

  const isPending = (userProfile?.status || 'active').toLowerCase() === 'pending'

  const onAmtChange = (v: string) => {
    setWdAmt(v)
    const amt = parseFloat(v) || 0
    setFsReq(amt > 0 ? amt + ' USDT' : '—')
    setFsRecv(amt > 0 ? amt.toFixed(2) + ' USDT' : '—')
    setSelectedChip(null)
  }

  const selectAmt = (v: number) => {
    setSelectedChip(v); setWdAmt(String(v)); onAmtChange(String(v)); setSelectedChip(v)
  }

  const openConfirm = () => {
    const amt = parseFloat(wdAmt)
    const addr = wdAddr.trim()
    const note = wdNote.trim()
    if (!amt || amt < 10) { showToast('Please enter a valid amount (min $10)'); return }
    if (amt > effectiveWithdrawable) {
      if (lockedAmount > 0 && amt <= currentBalance) {
        showToast(`⚠ $${effectiveLockedAmount.toLocaleString()} is locked. Only profits are withdrawable: $${effectiveWithdrawable.toLocaleString()}`)
      } else {
        showToast(`Amount exceeds available balance ($${effectiveWithdrawable.toLocaleString()})`)
      }
      return
    }
    if (!addr) { showToast('Please enter your wallet address'); return }
    if (addr.length < 26) { showToast('Wallet address seems invalid'); return }
    const recv = amt.toFixed(2)
    const shortAddr = addr.length > 20 ? addr.slice(0, 10) + '...' + addr.slice(-6) : addr
    setConfirmDetails({ amt, addr, note, recv, shortAddr })
    setConfirmOpen(true)
  }

  const submitWithdrawal = async () => {
    if (!confirmDetails || !userProfile) return
    try {
      // FIX: Include note in the withdrawal insert
      const { error } = await supabase.from('withdrawals').insert({
        user_id: userProfile.id,
        amount:  confirmDetails.amt,
        address: confirmDetails.addr,
        network: 'BEP-20',
        note:    confirmDetails.note || null,   // ← FIXED: save user's note to DB
        status:  'pending'
      })
      if (error) throw error

      // Decrease withdrawable_total so we track pending requests
      const newWithdrawable = Math.max(
        0,
        (Number(userProfile.withdrawable_total) || 0) - confirmDetails.amt
      )
      const { error: profError } = await supabase
        .from('profiles')
        .update({ withdrawable_total: newWithdrawable })
        .eq('id', userProfile.id)

      if (profError) throw profError

      showToast('Withdrawal submitted · Pending admin approval')
      fetchData()
      setConfirmOpen(false)
      setWdAmt(''); setWdAddr(''); setWdNote('')
      setFsReq('—'); setFsRecv('—'); setSelectedChip(null)
    } catch (err: any) {
      showToast(`⚠ Error: ${err.message || 'Submission failed'}`)
    }
  }

  // Earliest locking deposit countdown
  const soonestLock = lockedDeposits
    .filter(d => new Date(d.lockedUntil).getTime() > Date.now())
    .sort((a, b) => new Date(a.lockedUntil).getTime() - new Date(b.lockedUntil).getTime())[0]

  return (
    <>
      {loading && <VaultXLoader pageName="Withdraw" />}
      <canvas ref={bgRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.055, width: '100%', height: '100%' }} />
      <div className={`wd-toast${toastShow ? ' show' : ''}`}>{toastMsg}</div>
      <UserSidebar open={sidebarOpen} onClose={() => { setSidebarOpen(false); setHamburgerOpen(false) }} />

      <div className='wd-layout'>
        <div className='wd-topbar'>
          <button className={`wd-hamburger${hamburgerOpen ? ' is-open' : ''}`}
            onClick={() => { setSidebarOpen(o => !o); setHamburgerOpen(o => !o) }}>
            <span /><span /><span />
          </button>
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className='wd-logo-mark' style={{ width: 26, height: 26 }} />
            <span className='wd-logo-text' style={{ fontSize: '1.15rem' }}>Vault<span>X</span></span>
          </div>
          <div className='wd-avatar' style={{ width: 32, height: 32, fontSize: '.8rem', cursor: 'pointer' }} onClick={() => router.push('/profile')}>
            {userProfile?.first_name?.[0]}{userProfile?.last_name?.[0]}
          </div>
        </div>

        <main className='wd-main'>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <div style={{ marginBottom: 28 }} className='wd-reveal'>
              <span className='wd-label'>Transactions</span>
              <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(1.6rem,4vw,2.2rem)', fontWeight: 400, color: 'var(--ink)', lineHeight: 1.15 }}>
                Request a <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Withdrawal</em>
              </h1>
            </div>

            {/* PENDING STATUS BANNER */}
            {isPending && (
              <div className='wd-reveal' style={{ marginBottom: 16 }}>
                <div style={{
                  background: 'rgba(184,147,90,.08)', border: '1px solid rgba(184,147,90,.3)',
                  borderRadius: 'var(--r-lg)', padding: '14px 18px',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <svg width="16" height="16" fill="none" stroke="var(--gold)" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <div>
                    <div style={{ fontSize: '.8rem', fontWeight: 500, color: 'var(--ink)', marginBottom: 2 }}>
                      Account Pending — Withdrawals Restricted
                    </div>
                    <div style={{ fontSize: '.7rem', color: 'var(--txt2)' }}>
                      Your account is under review. Withdrawals are disabled until an admin activates your account. Please contact support.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* BALANCE BADGE */}
            <div className='wd-bal-badge wd-reveal' style={{ marginBottom: effectiveLockedAmount > 0 ? 12 : 20, transitionDelay: '.04s' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, position: 'relative', zIndex: 1 }}>
                <div>
                  <div style={{ fontSize: '.68rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(246,241,233,0.4)', marginBottom: 6 }}>
                    Available for Withdrawal
                    {pendingWithdrawalsTotal > 0 && (
                      <span style={{ marginLeft: 8, color: 'rgba(184,147,90,0.6)', fontSize: '.6rem' }}>
                        (${pendingWithdrawalsTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} pending)
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontSize: '2.2rem', background: 'linear-gradient(135deg,#f6f1e9,#d4aa72,#f6f1e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    ${effectiveWithdrawable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '.75rem', color: 'rgba(246,241,233,0.4)', marginTop: 4 }}>Profits only · Locked principal excluded</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {effectiveLockedAmount > 0 ? (
                    <div>
                      <div style={{ fontSize: '.68rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(246,241,233,0.3)', marginBottom: 4 }}>Total Balance</div>
                      <div style={{ fontSize: '.82rem', color: 'rgba(246,241,233,0.7)', letterSpacing: '.04em' }}>${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      <div style={{ fontSize: '.7rem', color: 'rgba(155,90,58,.7)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                        <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                        ${effectiveLockedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} locked · available in {lockCountdowns[soonestLock?.id || ''] || '—'}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '.68rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(246,241,233,0.3)', marginBottom: 4 }}>Network</div>
                      <div style={{ fontSize: '.82rem', color: 'rgba(246,241,233,0.7)', letterSpacing: '.04em' }}>BEP-20</div>
                      <div style={{ fontSize: '.7rem', color: 'rgba(246,241,233,0.3)', marginTop: 2 }}>USDT only</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* LOCK WARNING BANNER */}
            {effectiveLockedAmount > 0 && (
              <div className='wd-reveal' style={{ marginBottom: 20 }}>
                <div style={{
                  background: 'rgba(155,90,58,.08)', border: '1px solid rgba(155,90,58,.3)',
                  borderRadius: 'var(--r-lg)', padding: '14px 18px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <svg width="16" height="16" fill="none" stroke="rgba(155,90,58,.9)" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                    <div style={{ fontSize: '.8rem', fontWeight: 500, color: 'var(--ink)' }}>
                      ${effectiveLockedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT deposit is security-locked
                    </div>
                  </div>
                  {/* FIX: Clear explanation of what IS withdrawable */}
                  <div style={{ fontSize: '.72rem', color: 'var(--txt2)', lineHeight: 1.7, marginBottom: 10 }}>
                    Your deposited principal is locked for 60 days from approval. <strong>You can only withdraw your profits</strong> (season returns + referral commissions) during this period. The locked principal becomes available after the 60-day hold.
                  </div>
                  <div style={{ padding: '10px 14px', background: 'rgba(74,103,65,.06)', border: '1px solid rgba(74,103,65,.18)', borderRadius: 'var(--r)', marginBottom: 10 }}>
                    <div style={{ fontSize: '.7rem', color: 'var(--sage)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <span>✓ Withdrawable now (profits only):</span>
                      <strong style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem' }}>
                        ${effectiveWithdrawable.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT
                      </strong>
                    </div>
                  </div>
                  {lockedDeposits.filter(d => new Date(d.lockedUntil).getTime() > Date.now()).length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {lockedDeposits
                        .filter(d => new Date(d.lockedUntil).getTime() > Date.now())
                        .map(d => (
                          <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(155,90,58,.06)', border: '1px solid rgba(155,90,58,.15)', borderRadius: 'var(--r)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(155,90,58,.7)', flexShrink: 0 }} />
                              <span style={{ fontSize: '.72rem', color: 'var(--txt2)' }}>
                                Deposit <span style={{ fontFamily: 'monospace', fontSize: '.68rem' }}>{d.id.slice(0, 8).toUpperCase()}</span>
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '.9rem', color: 'var(--ink)' }}>
                                ${d.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                              <span style={{ fontSize: '.68rem', letterSpacing: '.08em', color: 'rgba(155,90,58,.9)', fontWeight: 500, minWidth: 36 }}>
                                {lockCountdowns[d.id] || '...'}
                              </span>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  )}
                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => router.push('/season')}
                      style={{ padding: '7px 14px', background: 'var(--ink)', color: 'var(--cream)', border: 'none', borderRadius: 'var(--r)', fontSize: '.68rem', letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}
                    >
                      Invest Locked Funds →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* WITHDRAWAL FORM */}
            <div className='wd-card wd-reveal' style={{ padding: '28px 24px', marginBottom: 20, transitionDelay: '.08s' }}>
              <span className='wd-label'>New Request</span>
              <div className='wd-section-title' style={{ fontSize: '1.15rem', marginBottom: 22 }}>Withdrawal Details</div>

              <div style={{ marginBottom: 18 }}>
                <label className='wd-form-label'>Withdrawal Amount (USDT)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {[100, 250, 500, 1000].map(v => (
                    <button key={v} className={`wd-amt-chip${selectedChip === v ? ' selected' : ''}`}
                      onClick={() => selectAmt(v)}
                      disabled={v > effectiveWithdrawable}
                      style={{ opacity: v > effectiveWithdrawable ? 0.4 : 1 }}>
                      ${v.toLocaleString()}
                    </button>
                  ))}
                </div>
                <input className='wd-form-input' type='number' placeholder='Enter amount e.g. 300' min='10' value={wdAmt} onChange={e => onAmtChange(e.target.value)} />
                <div style={{ fontSize: '.7rem', color: 'var(--txt3)', marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  <span>Minimum: $10</span>
                  <span>Available (profits): <strong style={{ color: 'var(--sage)' }}>${effectiveWithdrawable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
                  {effectiveLockedAmount > 0 && (
                    <span style={{ color: 'rgba(155,90,58,.8)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                      ${effectiveLockedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} locked principal (not withdrawable yet)
                    </span>
                  )}
                  {pendingWithdrawalsTotal > 0 && (
                    <span style={{ color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      ⏳ ${pendingWithdrawalsTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} pending approval
                    </span>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label className='wd-form-label'>Receiving Wallet Address</label>
                <input className='wd-form-input' type='text' placeholder='Enter your USDT BEP-20 wallet address' value={wdAddr} onChange={e => setWdAddr(e.target.value)} />
                <div style={{ fontSize: '.7rem', color: 'var(--txt3)', marginTop: 5 }}>Only USDT on BNB Smart Chain (BEP-20) is supported.</div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label className='wd-form-label'>Network</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--parchment)', border: '1px solid var(--border)', borderRadius: 'var(--r)' }}>
                  <div style={{ width: 28, height: 28, background: 'rgba(240,185,11,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.65rem', fontWeight: 700, color: '#f0b90b', flexShrink: 0 }}>BNB</div>
                  <div>
                    <div style={{ fontSize: '.82rem', fontWeight: 500, color: 'var(--ink)' }}>BNB Smart Chain — BEP-20</div>
                    <div style={{ fontSize: '.7rem', color: 'var(--txt3)' }}>Fee: Free · Time: 1–2 minutes</div>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <span className='wd-tag' style={{ background: 'rgba(74,103,65,0.1)', border: '1px solid rgba(74,103,65,0.2)', color: 'var(--sage)', fontSize: '.62rem' }}>Only</span>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 22 }}>
                <label className='wd-form-label'>Note <span style={{ fontSize: '.7rem', color: 'var(--txt3)', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(optional — visible to admin)</span></label>
                <textarea className='wd-form-input' placeholder='Any note for this withdrawal (e.g. reason, reference)' value={wdNote} onChange={e => setWdNote(e.target.value)} />
              </div>

              <div style={{ padding: '14px 16px', background: 'var(--parchment)', border: '1px solid var(--border)', borderRadius: 'var(--r)', marginBottom: 20 }}>
                <div className='wd-detail-row'><span className='wd-detail-key'>You Request</span><span className='wd-detail-val'>{fsReq}</span></div>
                <div className='wd-detail-row'><span className='wd-detail-key'>Transaction Fee</span><span className='wd-detail-val' style={{ color: 'var(--sage)' }}>Free</span></div>
                <div className='wd-detail-row'><span className='wd-detail-key'>You Receive</span><span className='wd-detail-val' style={{ color: 'var(--sage)', fontWeight: 600 }}>{fsRecv}</span></div>
                {effectiveLockedAmount > 0 && (
                  <div className='wd-detail-row'>
                    <span className='wd-detail-key'>Locked principal</span>
                    <span className='wd-detail-val' style={{ color: 'rgba(155,90,58,.8)', display: 'flex', alignItems: 'center', gap: 4, fontSize: '.76rem' }}>
                      <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                      ${effectiveLockedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} · unlocks in {lockCountdowns[soonestLock?.id || ''] || '—'}
                    </span>
                  </div>
                )}
                {pendingWithdrawalsTotal > 0 && (
                  <div className='wd-detail-row' style={{ borderBottom: 'none' }}>
                    <span className='wd-detail-key'>Pending withdrawals</span>
                    <span className='wd-detail-val' style={{ color: 'var(--gold)', fontSize: '.76rem' }}>
                      ${pendingWithdrawalsTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} awaiting approval
                    </span>
                  </div>
                )}
              </div>

              <div className='wd-warn-box' style={{ marginBottom: 20 }}>
                ⚠ Only your profits (season returns + referral commissions) are withdrawable. Locked deposit principal cannot be withdrawn during the 60-day security hold. Please double-check your wallet address before submitting.
              </div>

              <button
                className='wd-btn wd-btn-dark'
                style={{ width: '100%', opacity: (effectiveWithdrawable < 10 || isPending) ? 0.55 : 1 }}
                onClick={openConfirm}
                disabled={effectiveWithdrawable < 10 || isPending}
              >
                <span>{isPending ? 'Account Pending — Withdrawals Disabled' : 'Request Withdrawal →'}</span>
              </button>

              {effectiveWithdrawable < 10 && effectiveLockedAmount > 0 && currentBalance > effectiveLockedAmount && (
                <div style={{ textAlign: 'center', marginTop: 10, fontSize: '.72rem', color: 'rgba(74,103,65,.8)' }}>
                  No profits to withdraw yet · Invest locked funds to earn returns
                </div>
              )}
              {effectiveWithdrawable < 10 && effectiveLockedAmount > 0 && currentBalance <= effectiveLockedAmount && (
                <div style={{ textAlign: 'center', marginTop: 10, fontSize: '.72rem', color: 'rgba(155,90,58,.8)' }}>
                  Deposit locked for 60 days · Principal available in {lockCountdowns[soonestLock?.id || ''] || '—'}
                </div>
              )}
            </div>

            {/* WITHDRAWAL HISTORY */}
            <div style={{ marginTop: 36 }} className='wd-reveal'>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <span className='wd-label'>Records</span>
                  <div className='wd-section-title' style={{ fontSize: '1.15rem' }}>Withdrawal History</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {history.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 32, color: 'var(--txt3)', fontSize: '.82rem' }}>No withdrawal records yet.</div>
                ) : history.map((d, i) => (
                  <div key={i} className='wd-hist-row'>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                      <div style={{ width: 34, height: 34, background: 'rgba(74,103,65,0.08)', border: '1px solid var(--border)', borderRadius: 'var(--r)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width='14' height='14' fill='none' stroke='var(--sage)' strokeWidth='1.8' viewBox='0 0 24 24'><line x1='12' y1='5' x2='12' y2='19' /><polyline points='19 12 12 19 5 12' /></svg>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '.82rem', fontWeight: 500, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          {d.id} <span className={`wd-tag wd-tag-${d.status}`}>{d.status}</span>
                        </div>
                        <div style={{ fontSize: '.7rem', color: 'var(--txt3)', marginTop: 2 }}>
                          {d.date} · {d.wallet}
                          {d.note && <span style={{ marginLeft: 6, color: 'var(--gold)', fontStyle: 'italic' }}>· "{d.note}"</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.1rem', color: 'var(--ink)', fontWeight: 500 }}>−${d.amount.toLocaleString()}</div>
                      <button onClick={() => { setModalEntry(d); setModalOpen(true) }}
                        style={{ fontSize: '.68rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 2 }}>
                        View →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* CONFIRM MODAL */}
      <div className={`wd-confirm-overlay${confirmOpen ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) setConfirmOpen(false) }}>
        <div className='wd-confirm-box'>
          <div style={{ marginBottom: 20 }}>
            <span className='wd-label'>Review</span>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.3rem', fontWeight: 400, color: 'var(--ink)' }}>Confirm Withdrawal</div>
          </div>
          {confirmDetails && (
            <div style={{ padding: '14px 16px', background: 'var(--parchment)', border: '1px solid var(--border)', borderRadius: 'var(--r)', marginBottom: 16 }}>
              <div className='wd-detail-row'><span className='wd-detail-key'>Amount</span><span className='wd-detail-val'>{confirmDetails.amt} USDT</span></div>
              <div className='wd-detail-row'><span className='wd-detail-key'>Fee</span><span className='wd-detail-val' style={{ color: 'var(--sage)' }}>Free</span></div>
              <div className='wd-detail-row'><span className='wd-detail-key'>You Receive</span><span className='wd-detail-val' style={{ color: 'var(--sage)' }}>{confirmDetails.recv} USDT</span></div>
              <div className='wd-detail-row'><span className='wd-detail-key'>To Wallet</span><span className='wd-detail-val' style={{ fontSize: '.76rem' }}>{confirmDetails.shortAddr}</span></div>
              <div className='wd-detail-row' style={confirmDetails.note ? {} : { borderBottom: 'none' }}><span className='wd-detail-key'>Network</span><span className='wd-detail-val'>BNB Smart Chain</span></div>
              {confirmDetails.note && (
                <div className='wd-detail-row' style={{ borderBottom: 'none' }}>
                  <span className='wd-detail-key'>Note</span>
                  <span className='wd-detail-val' style={{ fontSize: '.78rem', maxWidth: 200, textAlign: 'right' }}>{confirmDetails.note}</span>
                </div>
              )}
            </div>
          )}
          <div className='wd-warn-box' style={{ marginBottom: 20, fontSize: '.75rem' }}>
            Once submitted, this request cannot be cancelled. Funds will be sent to your provided wallet address after admin approval.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className='wd-btn wd-btn-outline' style={{ flex: 1 }} onClick={() => setConfirmOpen(false)}>Cancel</button>
            <button className='wd-btn wd-btn-dark' style={{ flex: 1 }} onClick={submitWithdrawal}><span>Confirm</span></button>
          </div>
        </div>
      </div>

      {/* DETAIL MODAL */}
      <div className={`wd-modal-overlay${modalOpen ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}>
        <div className='wd-modal-sheet'>
          <div className='wd-modal-handle' />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <span className='wd-label'>Transaction</span>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.3rem', fontWeight: 400 }}>Withdrawal Details</div>
            </div>
            <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', fontSize: '1.4rem', lineHeight: 1 }}>×</button>
          </div>
          {modalEntry && (
            <>
              <div style={{ padding: '14px 16px', background: 'var(--parchment)', border: '1px solid var(--border)', borderRadius: 'var(--r)', marginBottom: 16 }}>
                <div className='wd-detail-row'><span className='wd-detail-key'>Transaction ID</span><span className='wd-detail-val'>{modalEntry.id}</span></div>
                <div className='wd-detail-row'><span className='wd-detail-key'>Status</span><span className='wd-detail-val'><span className={`wd-tag wd-tag-${modalEntry.status}`} style={{ fontSize: '.72rem' }}>{modalEntry.status}</span></span></div>
                <div className='wd-detail-row'><span className='wd-detail-key'>Date</span><span className='wd-detail-val'>{modalEntry.date}</span></div>
                <div className='wd-detail-row'><span className='wd-detail-key'>Amount Requested</span><span className='wd-detail-val'>{modalEntry.amount} USDT</span></div>
                <div className='wd-detail-row'><span className='wd-detail-key'>Transaction Fee</span><span className='wd-detail-val' style={{ color: 'var(--sage)' }}>Free</span></div>
                <div className='wd-detail-row'><span className='wd-detail-key'>Amount to Receive</span><span className='wd-detail-val' style={{ color: 'var(--sage)' }}>{modalEntry.amount} USDT</span></div>
                <div className='wd-detail-row'><span className='wd-detail-key'>Network</span><span className='wd-detail-val'>{modalEntry.network}</span></div>
                <div className='wd-detail-row' style={modalEntry.note ? {} : { borderBottom: 'none' }}>
                  <span className='wd-detail-key'>Wallet</span>
                  <span className='wd-detail-val' style={{ fontSize: '.76rem', wordBreak: 'break-all', maxWidth: 180, textAlign: 'right' }}>{modalEntry.wallet}</span>
                </div>
                {/* FIX: Display note in user's detail modal */}
                {modalEntry.note && (
                  <div className='wd-detail-row' style={{ borderBottom: 'none' }}>
                    <span className='wd-detail-key'>Note</span>
                    <span className='wd-detail-val' style={{ fontSize: '.78rem', maxWidth: 200, textAlign: 'right', fontStyle: 'italic' }}>{modalEntry.note}</span>
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
          <button className='wd-btn wd-btn-outline' style={{ width: '100%', marginTop: 20 }} onClick={() => setModalOpen(false)}>Close</button>
        </div>
      </div>
    </>
  )
}