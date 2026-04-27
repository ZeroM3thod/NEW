'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import UserSidebar from '@/components/UserSidebar'
import ValutXLoader from '@/components/ValutXLoader'
import { createClient } from '@/utils/supabase/client'

const PER_PAGE = 10

export default function ReferralPage() {
  const router = useRouter()
  const supabase = createClient()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [hamOpen, setHamOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [toastCls, setToastCls] = useState('')
  const [toastShow, setToastShow] = useState(false)
  const [refTab, setRefTab] = useState<'link' | 'code'>('link')
  const [linkCopied, setLinkCopied] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [milestoneWidth, setMilestoneWidth] = useState('0%')
  const [ringOffset, setRingOffset] = useState(188)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [profile, setProfile] = useState<any>(null)
  const [referrals, setReferrals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const showToast = useCallback((msg: string, cls = '') => {
    setToastMsg(msg)
    setToastCls(cls)
    setToastShow(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastShow(false), 2800)
  }, [])

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/signin'); return }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    setProfile(profileData)

    // ✅ Step 1: Fetch referred user profiles (include status)
    const { data: refUsers } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, username, created_at, status')
      .eq('referred_by', user.id)

    if (!refUsers || refUsers.length === 0) {
      setReferrals([])
      setLoading(false)
      return
    }

    // ✅ Step 2: Fetch all investments for referred users with season data
    const refUserIds = refUsers.map(u => u.id)
    const { data: refInvestments } = await supabase
      .from('investments')
      .select('user_id, amount, status, seasons:season_id(id, final_roi, status)')
      .in('user_id', refUserIds)

    const allInvs = refInvestments || []

    // ✅ Step 3: Map each referred user with correct profit/commission
    const mapped = refUsers.map(u => {
      const userInvs = allInvs.filter(inv => inv.user_id === u.id)

      const totalInvested = userInvs.reduce((sum: number, inv: any) =>
        sum + Number(inv.amount || 0), 0)

      // ✅ Only count profit from CLOSED seasons
      const totalProfit = userInvs.reduce((sum: number, inv: any) => {
        // Handle both object and array response from Supabase
        const season = Array.isArray(inv.seasons) ? inv.seasons[0] : inv.seasons
        if (season && season.status === 'closed' && season.final_roi != null) {
          return sum + (Number(inv.amount) * Number(season.final_roi) / 100)
        }
        return sum
      }, 0)

      // ✅ Commission = % of profit (not invested amount)
      const commissionRate = profileData?.commission_rate || 7
      const commission = totalProfit * (commissionRate / 100)

      return {
        name: `${u.first_name} ${u.last_name}`,
        un: u.username ? `@${u.username}` : u.id.slice(0, 8),
        init: (u.first_name?.[0] || '') + (u.last_name?.[0] || ''),
        joined: new Date(u.created_at).toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric'
        }),
        invested: totalInvested,
        profit: totalProfit,
        comm: commission,
        status: totalInvested > 0 ? 'active' : (u.status || 'pending'),
      }
    })

    setReferrals(mapped)

    // ✅ Step 4: Update commission rate based on milestone
    const count = refUsers.length
    let newRate = 7
    let target = 50

    if (count >= 50) { newRate = 12; target = 100 }
    else if (count >= 25) { newRate = 10; target = 50 }
    else if (count >= 10) { newRate = 8; target = 25 }

    if (newRate !== profileData?.commission_rate) {
      await supabase.from('profiles').update({ commission_rate: newRate }).eq('id', user.id)
      setProfile((prev: any) => ({ ...prev, commission_rate: newRate }))
    }

    const progress = Math.min(100, (count / target) * 100)
    setMilestoneWidth(`${progress}%`)
    setRingOffset(2 * Math.PI * 30 * (1 - progress / 100))

    setLoading(false)
  }, [router, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => { entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis') }) },
      { threshold: 0.06 }
    )
    document.querySelectorAll<HTMLElement>('.rf-reveal').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [loading])

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSidebarOpen(false); setHamOpen(false) }
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [])

  const copyRef = (type: 'link' | 'code') => {
    if (!profile) return
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://valutx.business'
    const text = type === 'link'
      ? `${baseUrl}/auth/signup?ref=${profile.referral_code}`
      : profile.referral_code
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => {})
    if (type === 'link') { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2200) }
    else { setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2200) }
    showToast(type === 'link' ? '🔗 Referral link copied!' : '📋 Referral code copied!', 'ok')
  }

  const shareVia = (platform: string) => {
    if (!profile) return
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://valutx.business'
    const link = `${baseUrl}/auth/signup?ref=${profile.referral_code}`
    const msg = `Join ValutX and invest with me! ${link}`
    const urls: Record<string, string> = {
      WhatsApp: `https://wa.me/?text=${encodeURIComponent(msg)}`,
      Telegram: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Join ValutX!')}`,
      Twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}`,
      Email: `mailto:?subject=Join%20ValutX&body=${encodeURIComponent(msg)}`,
    }
    if (urls[platform]) window.open(urls[platform], '_blank')
    showToast(`📤 Opening ${platform}…`)
  }

  const getFiltered = () =>
    filter === 'all' ? referrals : referrals.filter(r => r.status === filter)

  const filtered = getFiltered()
  const totalPages = Math.ceil(filtered.length / PER_PAGE) || 1
  const start = (page - 1) * PER_PAGE
  const slice = filtered.slice(start, start + PER_PAGE)
  const goPage = (n: number) => { if (n >= 1 && n <= totalPages) setPage(n) }

  const BadgeComp = ({ status }: { status: string }) => (
    <span className={`rf-badge rf-b-${status}`}>{status}</span>
  )

  // ✅ Totals from actual profits
  const totalComm = referrals.reduce((sum, r) => sum + r.comm, 0)
  const totalProfit = referrals.reduce((sum, r) => sum + r.profit, 0)
  const thisMonthCount = referrals.filter(r => {
    const joined = new Date(r.joined)
    const now = new Date()
    return joined.getMonth() === now.getMonth() && joined.getFullYear() === now.getFullYear()
  }).length

  return (
    <>
      {loading && <ValutXLoader pageName="Referral" />}
      <div className={`rf-toast${toastShow ? ' show' : ''}${toastCls ? ' ' + toastCls : ''}`}>{toastMsg}</div>

      <UserSidebar open={sidebarOpen} onClose={() => { setSidebarOpen(false); setHamOpen(false) }} />

      <div className='rf-layout'>
        <div className='rf-topbar'>
          <button
            className={`rf-ham-btn${hamOpen ? ' is-open' : ''}`}
            onClick={() => { setSidebarOpen(o => !o); setHamOpen(o => !o) }}
          >
            <span /><span /><span />
          </button>
          <div
            style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            onClick={() => router.push('/')}
          >
            <div className='rf-logo-mark' style={{ width: 26, height: 26 }} />
            <span className='rf-logo-text' style={{ fontSize: '1.15rem' }}>Valut<span>X</span></span>
          </div>
          <div className='rf-topbar-avatar' onClick={() => router.push('/profile')}>
            {profile?.first_name?.[0]}{profile?.last_name?.[0]}
          </div>
        </div>

        <main className='rf-main'>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div className='rf-reveal' style={{ marginBottom: 22 }}>
              <span className='rf-sec-label'>My Account</span>
              <h1 className='rf-sec-title'>Referral Program</h1>
              <p className='rf-sec-sub'>
                Invite friends and earn {profile?.commission_rate || 7}% commission on every profit they make.
              </p>
            </div>

            <div className='rf-hero rf-reveal' style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.1rem', fontWeight: 400, color: 'var(--ink)', marginBottom: 3 }}>
                    Your Unique Referral Details
                  </div>
                  <div style={{ fontSize: '.7rem', color: 'var(--text-sec)' }}>
                    Share your link or code — both lead to the same reward
                  </div>
                </div>
                <span className='rf-badge rf-b-active' style={{ alignSelf: 'flex-start' }}>
                  <span className='rf-live-dot' />Active
                </span>
              </div>

              <div className='rf-tabs'>
                <button className={`rf-tab${refTab === 'link' ? ' active' : ''}`} onClick={() => setRefTab('link')}>Referral Link</button>
                <button className={`rf-tab${refTab === 'code' ? ' active' : ''}`} onClick={() => setRefTab('code')}>Referral Code</button>
              </div>

              {refTab === 'link' ? (
                <div>
                  <div className='rf-link-row'>
                    <input className='rf-link-input' type='text' readOnly
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/signup?ref=${profile?.referral_code}`} />
                    <button className={`rf-btn-copy${linkCopied ? ' copied' : ''}`} onClick={() => copyRef('link')}>
                      {linkCopied ? '✓ Copied!' : 'Copy Link'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className='rf-link-row'>
                    <span className='rf-code-display'>{profile?.referral_code}</span>
                    <button className={`rf-btn-copy${codeCopied ? ' copied' : ''}`} onClick={() => copyRef('code')}>
                      {codeCopied ? '✓ Copied!' : 'Copy Code'}
                    </button>
                  </div>
                </div>
              )}

              <div className='rf-share-row'>
                <span style={{ fontSize: '.65rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-sec)', flexShrink: 0 }}>Share via:</span>
                {['WhatsApp', 'Telegram', 'Twitter', 'Email'].map(p => (
                  <button key={p} className='rf-share-btn' onClick={() => shareVia(p)}>{p}</button>
                ))}
              </div>
            </div>

            {/* ✅ Stats with real data */}
            <div className='rf-stats-grid rf-reveal' style={{ marginBottom: 14 }}>
              {[
                {
                  icon: (<><path d='M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2' /><circle cx='9' cy='7' r='4' /></>),
                  bg: 'rgba(184,147,90,.1)', sc: 'var(--gold)',
                  val: referrals.length.toString(), lbl: 'Total Referred',
                  ch: <>{thisMonthCount > 0 ? `+${thisMonthCount}` : '0'} this month</>, cup: thisMonthCount > 0,
                },
                {
                  icon: (<path d='M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' />),
                  bg: 'rgba(74,103,65,.1)', sc: 'var(--sage)',
                  val: `$${(profile?.referral_earned || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  lbl: 'Total Commission', ch: <>From referrals' profits</>, cup: false, vc: 'var(--sage)',
                },
                {
                  icon: (<><circle cx='12' cy='12' r='10' /><path d='M15 9.354a4 4 0 10-4 6.292' /></>),
                  bg: 'rgba(184,147,90,.08)', sc: 'var(--gold-d)',
                  val: `${profile?.commission_rate || 7}%`, lbl: 'Commission Rate',
                  ch: 'Of referrals\' profits', cup: false, vc: 'var(--gold)',
                },
                {
                  icon: (<><circle cx='12' cy='12' r='10' /><polyline points='12 6 12 12 16 14' /></>),
                  bg: 'rgba(155,58,58,.07)', sc: '#9b6a3a',
                  val: '$0.00', lbl: 'Pending Commission',
                  ch: 'Processing · 2–3 days', cup: false, vc: '#9b6a3a',
                },
              ].map((s, i) => (
                <div key={i} className='rf-stat-card'>
                  <div className='rf-stat-icon' style={{ background: s.bg }}>
                    <svg viewBox='0 0 24 24' width='18' height='18' fill='none' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' style={{ stroke: s.sc }}>
                      {s.icon}
                    </svg>
                  </div>
                  <div className='rf-stat-val' style={s.vc ? { color: s.vc } : {}}>{s.val}</div>
                  <div className='rf-stat-lbl'>{s.lbl}</div>
                  <div className={`rf-stat-change ${s.cup ? 'rf-ch-up' : 'rf-ch-neu'}`} style={!s.cup && s.vc ? { color: s.vc } : {}}>{s.ch}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14, marginBottom: 14 }} className='rf-reveal' id='rf-info-grid'>
              <div className='rf-how-card'>
                <span className='rf-sec-label' style={{ marginBottom: 4 }}>Program Details</span>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.05rem', color: 'var(--ink)' }}>
                  How the Referral Program Works
                </div>
                <div className='rf-steps-grid'>
                  {[
                    { n: '1', t: 'Share Your Link', d: 'Copy your unique referral link or code and share it with friends, colleagues, or your audience.' },
                    { n: '2', t: 'They Register & Invest', d: 'Your referral signs up using your link and makes their first investment into any active season.' },
                    { n: '3', t: 'You Earn Commission', d: `Receive ${profile?.commission_rate || 7}% of every PROFIT your referral earns from their investments, credited automatically.` },
                  ].map(s => (
                    <div key={s.n} className='rf-step-item'>
                      <div className='rf-step-num'>{s.n}</div>
                      <div>
                        <div className='rf-step-title'>{s.t}</div>
                        <div className='rf-step-desc'>{s.d}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }} id='rf-side-panels'>
                <div className='rf-how-card' style={{ padding: '18px 16px' }}>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.02rem', color: 'var(--ink)', marginBottom: 14 }}>
                    Referral Milestone
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div className='rf-milestone-ring'>
                      <svg viewBox='0 0 70 70'>
                        <circle className='rf-ring-bg' cx='35' cy='35' r='30' />
                        <circle className='rf-ring-fill' cx='35' cy='35' r='30' style={{ strokeDashoffset: ringOffset }} />
                      </svg>
                      <div className='rf-ring-label'>
                        <span>{referrals.length}</span>
                        <span className='rf-ring-sublabel'>of {referrals.length >= 50 ? '100' : '50'}</span>
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '.76rem', fontWeight: 500, color: 'var(--ink)', marginBottom: 3 }}>
                        Next Reward at {referrals.length >= 50 ? '100' : '50'} Referrals
                      </div>
                      <div style={{ fontSize: '.68rem', color: 'var(--text-sec)', marginBottom: 8 }}>
                        {referrals.length >= 50 ? 100 - referrals.length : 50 - referrals.length} more to unlock bonus rate.
                      </div>
                      <div className='rf-prog-bar'>
                        <div className='rf-prog-fill' style={{ width: milestoneWidth }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className='rf-divider rf-reveal' />

            {/* TABLE */}
            <div className='rf-table-card rf-reveal'>
              <div className='rf-table-head'>
                <div>
                  <div className='rf-table-title'>Referred Users</div>
                  <div className='rf-table-sub'>All users who signed up through your referral link or code</div>
                </div>
                <div className='rf-filter-row'>
                  {[['all', `All (${referrals.length})`], ['active', 'Active'], ['pending', 'Pending']].map(([f, lbl]) => (
                    <button key={f} className={`rf-filter-pill${filter === f ? ' active' : ''}`}
                      onClick={() => { setFilter(f); setPage(1) }}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Desktop table */}
              <div className='rf-tbl-wrap'>
                <table className='rf-dtbl'>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Joined Date</th>
                      <th>Total Profits</th>
                      <th>Commission ({profile?.commission_rate || 7}%)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slice.length === 0 ? (
                      <tr>
                        <td colSpan={5}>
                          <div className='rf-empty-state'>No {filter} referrals yet.</div>
                        </td>
                      </tr>
                    ) : slice.map((r, i) => (
                      <tr key={i}>
                        <td>
                          <div className='rf-td-user'>
                            <div className='rf-td-av'>{r.init}</div>
                            <div>
                              <div className='rf-td-name'>{r.name}</div>
                              <div className='rf-td-sub'>{r.un}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className='rf-td-sub'>{r.joined}</span></td>
                        <td>
                          <span style={{ fontFamily: "'Cormorant Garamond',serif", color: r.profit > 0 ? 'var(--sage)' : 'var(--ink)' }}>
                            ${r.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontFamily: "'Cormorant Garamond',serif", color: r.comm > 0 ? 'var(--sage)' : 'var(--ink)' }}>
                            +${r.comm.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td><BadgeComp status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card view */}
              <div className='rf-mob-cards'>
                {slice.length === 0 ? (
                  <div className='rf-empty-state'>No {filter} referrals yet.</div>
                ) : slice.map((r, i) => (
                  <div key={i} className='rf-mob-card'>
                    <div className='rf-mob-card-top'>
                      <div className='rf-mob-card-user'>
                        <div className='rf-td-av'>{r.init}</div>
                        <div>
                          <div className='rf-td-name'>{r.name}</div>
                          <div className='rf-td-sub'>{r.un}</div>
                        </div>
                      </div>
                      <BadgeComp status={r.status} />
                    </div>
                    <div className='rf-mob-row'>
                      <span className='rf-mob-key'>Joined</span>
                      <span style={{ fontSize: '.75rem', color: 'var(--ink)' }}>{r.joined}</span>
                    </div>
                    <div className='rf-mob-row'>
                      <span className='rf-mob-key'>Total Profits</span>
                      <span style={{ fontFamily: "'Cormorant Garamond',serif", color: r.profit > 0 ? 'var(--sage)' : 'var(--ink)', fontSize: '.95rem' }}>
                        ${r.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className='rf-mob-row' style={{ borderBottom: 'none' }}>
                      <span className='rf-mob-key'>Commission ({profile?.commission_rate || 7}%)</span>
                      <span style={{ fontFamily: "'Cormorant Garamond',serif", color: r.comm > 0 ? 'var(--sage)' : 'var(--ink)', fontSize: '.95rem' }}>
                        +${r.comm.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className='rf-pagination'>
                <div className='rf-page-info'>
                  Showing {start + 1}–{Math.min(start + PER_PAGE, filtered.length)} of {filtered.length} users
                </div>
                <div className='rf-page-btns'>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                    <button key={n} className={`rf-page-btn${page === n ? ' active' : ''}`} onClick={() => goPage(n)}>{n}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}