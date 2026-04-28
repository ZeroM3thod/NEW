
'use client'

import React, { useEffect, useState, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import './partner.css'

/* ─── TYPES ────────────────────────────────────────── */
interface Season {
  name: string
  period: string
  deposit: number
  pnl: number
  pnlPct: string
}

interface ReferredUser {
  id: number
  name: string
  username: string
  email: string
  phone: string
  kyc: 'verified' | 'not verified'
  status: 'active' | 'pending' | 'suspended'
  totalDeposit: number
  joined: string
  initials: string
  seasons: Season[]
}

/* ─── DATA ──────────────────────────────────────────── */
const INITIAL_USERS: ReferredUser[] = [
  {
    id: 1,
    name: 'Sophia Hartmann',
    username: 'sophiah',
    email: 'sophia.h@email.com',
    phone: '+1 (555) 210-4432',
    kyc: 'verified',
    status: 'active',
    totalDeposit: 12500,
    joined: '12 Jan 2025',
    initials: 'SH',
    seasons: [
      { name: 'Season 5', period: 'Sep–Nov 2024', deposit: 3000, pnl: 690, pnlPct: '+23%' },
      { name: 'Season 6', period: 'Nov 2024–Jan 2025', deposit: 4500, pnl: 1080, pnlPct: '+24%' },
      { name: 'Season 7', period: 'Jan–Mar 2025', deposit: 5000, pnl: 1350, pnlPct: '+27%' },
    ]
  },
  {
    id: 2,
    name: 'Marcus Obinna',
    username: 'marcobi',
    email: 'marcus.ob@gmail.com',
    phone: '+44 7700 112233',
    kyc: 'verified',
    status: 'active',
    totalDeposit: 8800,
    joined: '02 Feb 2025',
    initials: 'MO',
    seasons: [
      { name: 'Season 6', period: 'Nov 2024–Jan 2025', deposit: 3800, pnl: 912, pnlPct: '+24%' },
      { name: 'Season 7', period: 'Jan–Mar 2025', deposit: 5000, pnl: 1350, pnlPct: '+27%' },
    ]
  },
  {
    id: 3,
    name: 'Priya Nair',
    username: 'priyanair',
    email: 'priya.nair@proton.me',
    phone: '+91 98765 43210',
    kyc: 'not verified',
    status: 'pending',
    totalDeposit: 2000,
    joined: '18 Feb 2025',
    initials: 'PN',
    seasons: [
      { name: 'Season 7', period: 'Jan–Mar 2025', deposit: 2000, pnl: 540, pnlPct: '+27%' },
    ]
  },
  {
    id: 4,
    name: 'Ethan Kowalski',
    username: 'ethanK',
    email: 'ethan.k@outlook.com',
    phone: '+48 600 123 456',
    kyc: 'verified',
    status: 'suspended',
    totalDeposit: 5200,
    joined: '25 Jan 2025',
    initials: 'EK',
    seasons: [
      { name: 'Season 5', period: 'Sep–Nov 2024', deposit: 2200, pnl: 506, pnlPct: '+23%' },
      { name: 'Season 6', period: 'Nov 2024–Jan 2025', deposit: 3000, pnl: -420, pnlPct: '-14%' },
    ]
  },
  {
    id: 5,
    name: 'Lena Fischer',
    username: 'lena_f',
    email: 'lena.f@web.de',
    phone: '+49 170 9988776',
    kyc: 'verified',
    status: 'active',
    totalDeposit: 15000,
    joined: '08 Jan 2025',
    initials: 'LF',
    seasons: [
      { name: 'Season 5', period: 'Sep–Nov 2024', deposit: 5000, pnl: 1150, pnlPct: '+23%' },
      { name: 'Season 6', period: 'Nov 2024–Jan 2025', deposit: 5000, pnl: 1200, pnlPct: '+24%' },
      { name: 'Season 7', period: 'Jan–Mar 2025', deposit: 5000, pnl: 1350, pnlPct: '+27%' },
    ]
  },
  {
    id: 6,
    name: 'James Waweru',
    username: 'jwaweru',
    email: 'james.w@safaricom.ke',
    phone: '+254 712 345 678',
    kyc: 'not verified',
    status: 'active',
    totalDeposit: 3200,
    joined: '14 Mar 2025',
    initials: 'JW',
    seasons: [
      { name: 'Season 7', period: 'Jan–Mar 2025', deposit: 3200, pnl: 864, pnlPct: '+27%' },
    ]
  },
  {
    id: 7,
    name: 'Aisha Al-Farsi',
    username: 'aishaf',
    email: 'aisha.alfarsi@gmail.com',
    phone: '+971 50 123 4567',
    kyc: 'verified',
    status: 'active',
    totalDeposit: 22000,
    joined: '30 Dec 2024',
    initials: 'AA',
    seasons: [
      { name: 'Season 5', period: 'Sep–Nov 2024', deposit: 7000, pnl: 1610, pnlPct: '+23%' },
      { name: 'Season 6', period: 'Nov 2024–Jan 2025', deposit: 8000, pnl: 1920, pnlPct: '+24%' },
      { name: 'Season 7', period: 'Jan–Mar 2025', deposit: 7000, pnl: 1890, pnlPct: '+27%' },
    ]
  },
  {
    id: 8,
    name: 'Dmitri Volkov',
    username: 'dvolkov',
    email: 'd.volkov@yandex.ru',
    phone: '+7 916 555 0101',
    kyc: 'not verified',
    status: 'pending',
    totalDeposit: 0,
    joined: '19 Mar 2025',
    initials: 'DV',
    seasons: []
  },
  {
    id: 9,
    name: 'Camille Dupont',
    username: 'camille_d',
    email: 'camille.d@orange.fr',
    phone: '+33 6 12 34 56 78',
    kyc: 'verified',
    status: 'active',
    totalDeposit: 9700,
    joined: '05 Feb 2025',
    initials: 'CD',
    seasons: [
      { name: 'Season 6', period: 'Nov 2024–Jan 2025', deposit: 4700, pnl: 1128, pnlPct: '+24%' },
      { name: 'Season 7', period: 'Jan–Mar 2025', deposit: 5000, pnl: 1350, pnlPct: '+27%' },
    ]
  },
  {
    id: 10,
    name: 'Ravi Sharma',
    username: 'ravisharma',
    email: 'ravi.sharma@indiamail.in',
    phone: '+91 70005 67890',
    kyc: 'verified',
    status: 'active',
    totalDeposit: 6000,
    joined: '22 Feb 2025',
    initials: 'RS',
    seasons: [
      { name: 'Season 7', period: 'Jan–Mar 2025', deposit: 6000, pnl: 1620, pnlPct: '+27%' },
    ]
  },
]

export default function PartnerProgramPage() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  /* ─── STATE ────────────────────────────────────────── */
  const [searchQuery, setSearchQuery] = useState('')
  const [currentFilter, setCurrentFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState<ReferredUser | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: string; show: boolean }>({
    msg: '',
    type: '',
    show: false,
  })

  /* ─── BACKGROUND CANVAS ────────────────────────────── */
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return

    let animationId: number

    function resize() {
      if (!c) return
      c.width = window.innerWidth
      c.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const pts = Array.from({ length: 28 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 140 + 40,
      a: Math.random() * Math.PI * 2,
      s: Math.random() * 0.0003 + 0.0001
    }))

    function draw() {
      if (!ctx || !c) return
      ctx.clearRect(0, 0, c.width, c.height)
      pts.forEach(p => {
        p.a += p.s
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r)
        grd.addColorStop(0, 'rgba(184,147,90,.55)')
        grd.addColorStop(1, 'rgba(184,147,90,0)')
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = grd
        ctx.fill()
      })
      animationId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  /* ─── REVEAL ANIMATION ─────────────────────────────── */
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('vis')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.06 })

    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  /* ─── UTILS ────────────────────────────────────────── */
  function showToast(msg: string, type = '') {
    setToast({ msg, type, show: true })
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 2800)
  }

  function formatUSDT(n: number) {
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(2) + 'M'
    if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'K'
    return '$' + n.toFixed(2)
  }

  function formatUSDTFull(n: number) {
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const copyText = (val: string, msg: string) => {
    navigator.clipboard.writeText(val).then(() => {
      showToast('✓ ' + msg, 'ok')
    }).catch(() => {
      const ta = document.createElement('textarea')
      ta.value = val
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      showToast('✓ ' + msg, 'ok')
    })
  }

  const shareLink = (platform: string) => {
    const link = 'https://valutx.io/join?ref=VLX-A7K2-PRO'
    const msgs: Record<string, string> = {
      whatsapp: `Join me on ValutX and start earning!\n${link}`,
      telegram: `Join ValutX — the premium investment platform.\n${link}`,
      email: `mailto:?subject=Join%20ValutX&body=Join%20me%20on%20ValutX%3A%20${encodeURIComponent(link)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent('Earning on ValutX — join via my link: ' + link)}`
    }
    if (platform === 'email' || platform === 'twitter') {
      window.open(platform === 'email' ? msgs.email : msgs.twitter, '_blank')
    } else {
      showToast('✓ Link ready to share via ' + platform + '!', 'ok')
    }
  }

  /* ─── FILTERING ────────────────────────────────────── */
  const filteredUsers = useMemo(() => {
    return INITIAL_USERS.filter(u => {
      // status filter
      if (currentFilter === 'active' && u.status !== 'active') return false
      if (currentFilter === 'suspended' && u.status !== 'suspended') return false
      if (currentFilter === 'verified' && u.kyc !== 'verified') return false
      if (currentFilter === 'unverified' && u.kyc !== 'not verified') return false
      // search
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim()
        const hay = [u.name, u.username, u.email, u.phone, u.status, u.kyc].join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [searchQuery, currentFilter])

  /* ─── TOTALS ────────────────────────────────────────── */
  const totals = useMemo(() => {
    const turnover = INITIAL_USERS.reduce((s, u) => s + u.totalDeposit, 0)
    const commission = turnover * 0.15
    const totalCount = INITIAL_USERS.length
    const activeCount = INITIAL_USERS.filter(u => u.status === 'active').length
    return { turnover, commission, totalCount, activeCount }
  }, [])

  /* ─── MODAL ─────────────────────────────────────────── */
  const openModal = (u: ReferredUser) => {
    setSelectedUser(u)
    document.body.style.overflow = 'hidden'
  }

  const closeModal = () => {
    setSelectedUser(null)
    document.body.style.overflow = ''
  }

  return (
    <div className="partner-page">
      {/* BG Canvas */}
      <canvas id="bg-canvas-partner" ref={canvasRef}></canvas>

      {/* Toast */}
      <div id="toast-partner" className={`${toast.show ? 'show' : ''} ${toast.type}`}>
        {toast.msg}
      </div>

      <div className="page-wrap">
        {/* TOP STRIP */}
        <div className="top-strip">
          <button className="back-pill" onClick={() => router.back()}>
            <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <div className="strip-logo">
            <div className="strip-logo-mark"></div>
            <div className="strip-logo-text">Valut<span>X</span></div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="partner-content">

          {/* PAGE HEADER */}
          <div className="reveal" style={{ marginBottom: '26px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="sec-label">Partner Program · SeasonRise Platform</span>
              <h1 className="sec-title">Referral Dashboard</h1>
              <p className="sec-sub"><span className="live-dot"></span>Your referral network is active · Earning 15% commission</p>
            </div>
            <div style={{ alignSelf: 'flex-end' }}>
              <div className="commission-badge">
                <span className="dot"></span>
                15% Commission Rate — Active
              </div>
            </div>
          </div>

          {/* REFERRAL LINK CARD */}
          <div className="ref-card reveal" style={{ transitionDelay: '.04s', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '18px' }}>
              <div>
                <div className="sec-label" style={{ marginBottom: '2px' }}>Your Partner Links</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', fontWeight: 400, color: 'var(--ink)' }}>Share & Earn</div>
                <div style={{ fontSize: '.75rem', color: 'var(--text-sec)', marginTop: '3px' }}>Every user who joins through your link earns you 15% of their total deposits.</div>
              </div>
              <div className="qr-box">
                <div className="qr-inner"></div>
              </div>
            </div>

            <div className="ref-grid">
              <div>
                <div className="ref-field-label">Referral Code</div>
                <div className="ref-field-box">
                  <div className="ref-field-val mono">VLX-A7K2-PRO</div>
                  <button className="btn-copy" onClick={() => copyText('VLX-A7K2-PRO', 'Referral code copied!')}>Copy Code</button>
                </div>
              </div>
              <div>
                <div className="ref-field-label">Referral Link</div>
                <div className="ref-field-box">
                  <div className="ref-field-val" style={{ fontSize: '.72rem', color: 'var(--text-sec)' }}>https://valutx.io/join?ref=VLX-A7K2-PRO</div>
                  <button className="btn-copy" onClick={() => copyText('https://valutx.io/join?ref=VLX-A7K2-PRO', 'Referral link copied!')}>Copy Link</button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '.67rem', color: 'var(--text-sec)', letterSpacing: '.04em' }}>Share via:</span>
              <button className="btn-share" onClick={() => shareLink('whatsapp')} style={{ fontSize: '.67rem', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '.04em', padding: 0, textDecoration: 'underline', textUnderlineOffset: '2px' }}>WhatsApp</button>
              <button className="btn-share" onClick={() => shareLink('telegram')} style={{ fontSize: '.67rem', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '.04em', padding: 0, textDecoration: 'underline', textUnderlineOffset: '2px' }}>Telegram</button>
              <button className="btn-share" onClick={() => shareLink('email')} style={{ fontSize: '.67rem', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '.04em', padding: 0, textDecoration: 'underline', textUnderlineOffset: '2px' }}>Email</button>
              <button className="btn-share" onClick={() => shareLink('twitter')} style={{ fontSize: '.67rem', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '.04em', padding: 0, textDecoration: 'underline', textUnderlineOffset: '2px' }}>X / Twitter</button>
            </div>
          </div>

          {/* PERFORMANCE OVERVIEW CARDS */}
          <div className="stats-grid reveal" style={{ transitionDelay: '.08s' }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(184,147,90,.08)' }}>
                <svg viewBox="0 0 24 24" style={{ stroke: 'var(--gold)' }}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
              </div>
              <div className="stat-val">{formatUSDT(totals.turnover)}</div>
              <div className="stat-lbl">Total Turnover</div>
              <div className="stat-change ch-neu">Sum of all referred deposits</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(74,103,65,.08)' }}>
                <svg viewBox="0 0 24 24" style={{ stroke: 'var(--sage)' }}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              </div>
              <div className="stat-val" style={{ color: 'var(--sage)' }}>{formatUSDT(totals.commission)}</div>
              <div className="stat-lbl">Total Commission (15%)</div>
              <div className="stat-change ch-up">↑ Lifetime earnings</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(28,28,28,.06)' }}>
                <svg viewBox="0 0 24 24" style={{ stroke: 'var(--charcoal)' }}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
              </div>
              <div className="stat-val">{totals.totalCount}</div>
              <div className="stat-lbl">Total Referred Users</div>
              <div className="stat-change ch-neu">All time referrals</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(74,103,65,.08)' }}>
                <svg viewBox="0 0 24 24" style={{ stroke: 'var(--sage)' }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div className="stat-val">{totals.activeCount}</div>
              <div className="stat-lbl">Active Referred Users</div>
              <div className="stat-change ch-up">Currently investing</div>
            </div>
          </div>

          {/* REFERRED USERS TABLE */}
          <div className="table-card reveal" style={{ transitionDelay: '.12s' }}>
            <div className="table-head">
              <div>
                <div className="table-title">Referred Users</div>
                <div className="table-sub">Showing {filteredUsers.length} of {INITIAL_USERS.length} referred users</div>
              </div>
            </div>

            <div className="toolbar">
              <div className="search-wrap">
                <div className="search-icon">
                  <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
                <input
                  className="search-input"
                  type="text"
                  placeholder="Search users…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="filter-btns">
                {['all', 'active', 'suspended', 'verified', 'unverified'].map(f => (
                  <button
                    key={f}
                    className={`filter-btn ${currentFilter === f ? 'active' : ''}`}
                    onClick={() => setCurrentFilter(f)}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              <div className="tbl-count">{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</div>
            </div>

            <div className="tbl-wrap">
              <table className="dtbl">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>KYC</th>
                    <th>Status</th>
                    <th>Total Deposit</th>
                    <th>Commission (15%)</th>
                    <th>Joined</th>
                    <th>Activities</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => {
                    const comm = u.totalDeposit * 0.15
                    const statusClass = u.status === 'active' ? 'b-active' : u.status === 'suspended' ? 'b-suspended' : 'b-pending'
                    const kycClass = u.kyc === 'verified' ? 'b-verified' : 'b-unverified'
                    return (
                      <tr key={u.id} onClick={() => openModal(u)}>
                        <td>
                          <div className="td-user">
                            <div className="td-av">{u.initials}</div>
                            <div><div className="td-name">{u.name}</div></div>
                          </div>
                        </td>
                        <td><span className="td-sub">@{u.username}</span></td>
                        <td><span className="td-sub">{u.email}</span></td>
                        <td><span className="td-sub">{u.phone}</span></td>
                        <td><span className={`badge ${kycClass}`}>{u.kyc === 'verified' ? '✓ Verified' : 'Unverified'}</span></td>
                        <td><span className={`badge ${statusClass}`}>{u.status}</span></td>
                        <td style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', fontWeight: 500, color: 'var(--ink)' }}>{formatUSDTFull(u.totalDeposit)}</td>
                        <td style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--sage)', fontWeight: 500 }}>{formatUSDTFull(comm)}</td>
                        <td><span className="td-sub">{u.joined}</span></td>
                        <td>
                          <span className="badge b-pending" style={{ fontSize: '.56rem' }}>{u.seasons.length} Season{u.seasons.length !== 1 ? 's' : ''}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className="empty-state">
                  <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                  <div>No referred users match your search or filter.</div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedUser && (
        <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal-box">
            <div className="modal-header">
              <div>
                <div className="modal-title">{selectedUser.name}</div>
                <div style={{ fontSize: '.7rem', color: 'var(--text-sec)', marginTop: '2px' }}>@{selectedUser.username} · Joined {selectedUser.joined}</div>
              </div>
              <div className="modal-close" onClick={closeModal}>
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>
            </div>
            <div className="modal-body">
              <div className="info-grid">
                <div className="info-cell">
                  <div className="info-lbl">Email</div>
                  <div className="info-val">{selectedUser.email}</div>
                </div>
                <div className="info-cell">
                  <div className="info-lbl">Phone</div>
                  <div className="info-val">{selectedUser.phone}</div>
                </div>
                <div className="info-cell">
                  <div className="info-lbl">KYC Status</div>
                  <div className="info-val" style={{ marginTop: '3px' }}>
                    <span className={`badge ${selectedUser.kyc === 'verified' ? 'b-verified' : 'b-unverified'}`}>
                      {selectedUser.kyc === 'verified' ? '✓ Verified' : 'Not Verified'}
                    </span>
                  </div>
                </div>
                <div className="info-cell">
                  <div className="info-lbl">Account Status</div>
                  <div className="info-val" style={{ marginTop: '3px' }}>
                    <span className={`badge ${selectedUser.status === 'active' ? 'b-active' : selectedUser.status === 'suspended' ? 'b-suspended' : 'b-pending'}`}>
                      {selectedUser.status}
                    </span>
                  </div>
                </div>
                <div className="info-cell">
                  <div className="info-lbl">Total Deposit</div>
                  <div className="info-val" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem' }}>{formatUSDTFull(selectedUser.totalDeposit)}</div>
                </div>
                <div className="info-cell">
                  <div className="info-lbl">Commission Earned (15%)</div>
                  <div className="info-val" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', color: 'var(--sage)' }}>{formatUSDTFull(selectedUser.totalDeposit * 0.15)}</div>
                </div>
              </div>

              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: 'var(--ink)' }}>Season Activity</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="badge b-pending" style={{ fontSize: '.58rem' }}>{selectedUser.seasons.length} Season{selectedUser.seasons.length !== 1 ? 's' : ''}</span>
                  {selectedUser.seasons.length > 0 && (
                    <span style={{ fontSize: '.75rem', fontWeight: 500, color: selectedUser.seasons.reduce((s, ss) => s + ss.pnl, 0) >= 0 ? 'var(--sage)' : '#9b3a3a' }}>
                      {selectedUser.seasons.reduce((s, ss) => s + ss.pnl, 0) >= 0 ? '+' : ''}
                      {formatUSDTFull(selectedUser.seasons.reduce((s, ss) => s + ss.pnl, 0))} Total P&L
                    </span>
                  )}
                </div>
              </div>

              <div className="seasons-list">
                {selectedUser.seasons.length > 0 ? selectedUser.seasons.map((s, idx) => (
                  <div className="season-row" key={idx}>
                    <div>
                      <div className="season-name">{s.name}</div>
                      <div className="season-period">{s.period}</div>
                    </div>
                    <div>
                      <div className="season-deposit" style={{ fontSize: '.85rem', color: 'var(--text-sec)' }}>Deposited</div>
                      <div className="season-deposit">{formatUSDTFull(s.deposit)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '.6rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-sec)', textAlign: 'right' }}>P&amp;L</div>
                      <div className={`season-pnl ${s.pnl >= 0 ? 'profit' : 'loss'}`}>{s.pnl >= 0 ? '+' : ''}{formatUSDTFull(s.pnl)} ({s.pnlPct})</div>
                    </div>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', padding: '24px 0', fontSize: '.82rem', color: 'var(--text-sec)' }}>No season activity yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
