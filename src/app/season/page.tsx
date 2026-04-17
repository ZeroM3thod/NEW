'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import UserSidebar from '@/components/UserSidebar'
import VaultXLoader from '@/components/VaultXLoader'
import { createClient } from '@/utils/supabase/client'

// ─── P&L helpers ────────────────────────────────────────────────────────────
const fmtPnL   = (n: number) => n >= 0
  ? `+$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits:2, maximumFractionDigits:2 })}`
  : `-$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits:2, maximumFractionDigits:2 })}`

const pnlColor = (n: number) => n >= 0 ? 'var(--sage)' : '#b05252'
// ────────────────────────────────────────────────────────────────────────────

/* ── Types ── */
interface ActiveSeason {
  id: string
  name: string
  status: string
  statusLabel: string
  statusClass: string
  period: string
  entryCloseDate: Date | null
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
  roiSign: string
  finalRoi: number | null
  myInv: string
  myPL: string
  plSign: string
  dbStatus: string
  mySeasonId: string | null
}

function pad(n: number) { return String(n).padStart(2, '0') }

function fmtShortDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function computePeriod(s: any): string {
  if (s.period && s.period.trim()) return s.period.trim()
  if (s.start_date && s.end_date) {
    return `${fmtShortDate(s.start_date)} → ${fmtShortDate(s.end_date)}`
  }
  if (s.start_date) return `From ${fmtShortDate(s.start_date)}`
  return '—'
}

export default function SeasonPage() {
  const router = useRouter()
  const supabase = createClient()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [toastCls, setToastCls] = useState('')
  const [toastShow, setToastShow] = useState(false)
  const [seasons, setSeasons] = useState<ActiveSeason[]>([])
  const [history, setHistory] = useState<HistorySeason[]>([])
  const [histTab, setHistTab] = useState<'all' | 'active' | 'completed' | 'mine'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalState, setModalState] = useState<'form' | 'success'>('form')
  const [investId, setInvestId] = useState<string | null>(null)
  const [amountVal, setAmountVal] = useState('')
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [countdowns, setCountdowns] = useState<Record<string, string>>({})
  const [countdownLabel, setCountdownLabel] = useState<Record<string, string>>({})
  const [poolWidths, setPoolWidths] = useState<Record<string, string>>({})
  const [computedAvgRoi, setComputedAvgRoi] = useState(0)

  const bgRef = useRef<HTMLCanvasElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const userId = useRef<string | null>(null)

  const showToast = useCallback((msg: string, cls = '') => {
    setToastMsg(msg); setToastCls(cls); setToastShow(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastShow(false), 3200)
  }, [])

  /* ── Fetch Data ── */
  const fetchData = useCallback(async (uid?: string) => {
    const resolvedUid = uid || userId.current
    if (!resolvedUid) return

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', resolvedUid).single()
    setUserProfile(profile)

    const { data: dbSeasons } = await supabase.from('seasons').select('*').order('created_at', { ascending: false })

    const { data: myInvestments } = await supabase
      .from('investments')
      .select('*, seasons(*)')
      .eq('user_id', resolvedUid)

    if (dbSeasons) {
      const activeMapped: ActiveSeason[] = dbSeasons
        .filter(s => s.status === 'open' || s.status === 'running')
        .map(s => {
          const myInv = myInvestments?.find(inv => inv.season_id === s.id)
          const poolCap    = Number(s.pool_cap) || 1000000
          const actualFilled = Number(s.current_pool) || 0
          return {
            id: s.id,
            name: s.name,
            status: s.status,
            statusLabel: s.status === 'open' ? 'Now Open' : 'Running',
            statusClass: s.status === 'open' ? 'sx-tag-open' : 'sx-tag-ending',
            period: computePeriod(s),
            entryCloseDate: s.entry_close_date ? new Date(s.entry_close_date) : null,
            endDate: new Date(s.end_date || Date.now() + 7 * 864e5),
            roi: s.roi_range || '',
            min: Number(s.min_entry) || 100,
            max: 50000,
            pool: poolCap,
            poolFilled: actualFilled,
            joined: !!myInv,
            myAmount: myInv ? Number(myInv.amount) : 0
          }
        })
      setSeasons(activeMapped)

      const historyMapped: HistorySeason[] = dbSeasons.map(s => {
        const myInv      = myInvestments?.find(inv => inv.season_id === s.id)
        const isClosed   = s.status === 'closed'
        const finalRoi   = isClosed && s.final_roi != null ? Number(s.final_roi) : null
        const profit     = (finalRoi !== null && myInv) ? Number(myInv.amount) * finalRoi / 100 : 0

        let roiStr  = '—'
        let roiSign = '0'
        if (isClosed && finalRoi !== null) {
          roiStr  = `${finalRoi >= 0 ? '+' : ''}${finalRoi}%`
          roiSign = finalRoi >= 0 ? '+' : '-'
        } else if (s.roi_range) {
          roiStr  = s.roi_range
          roiSign = '0'
        }

        return {
          id: s.id,
          name: s.name,
          period: computePeriod(s),          // ← FIXED: always compute from dates
          roi: roiStr,
          roiSign,
          finalRoi,
          myInv: myInv ? `$${Number(myInv.amount).toLocaleString()}` : '—',
          myPL: (isClosed && myInv && finalRoi !== null) ? fmtPnL(profit) : '—',
          plSign: (isClosed && myInv && finalRoi !== null) ? (profit >= 0 ? '+' : '-') : '0',
          dbStatus: s.status,
          mySeasonId: myInv ? myInv.id : null
        }
      })
      setHistory(historyMapped)

      const myClosedInvestments = historyMapped.filter(h =>
        h.dbStatus === 'closed' && h.finalRoi !== null && h.mySeasonId !== null
      )
      if (myClosedInvestments.length > 0) {
        const sum = myClosedInvestments.reduce((acc, h) => acc + (h.finalRoi || 0), 0)
        setComputedAvgRoi(Math.round((sum / myClosedInvestments.length) * 100) / 100)
      } else {
        setComputedAvgRoi(0)
      }
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/signin'); return }
      userId.current = user.id
      await fetchData(user.id)
    }
    init()
  }, [fetchData, router, supabase])

  /* ── Real-time updates ── */
  useEffect(() => {
    const channel = supabase
      .channel('season-invest-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seasons' }, () => { fetchData() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'investments' }, () => { fetchData() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, fetchData])

  /* ── BG Canvas ── */
  useEffect(() => {
    const cvs = bgRef.current; if (!cvs) return
    const cx = cvs.getContext('2d')!
    type Candle = { x:number;y:number;w:number;h:number;wick:number;up:boolean;spd:number;ph:number }
    type Wave = { pts:{x:number;y:number}[];spd:number;ph:number;amp:number;color:string;opa:string }
    let W=0, H=0, candles:Candle[]=[], waves:Wave[]=[], T=0, animId=0
    const build=()=>{
      const n=Math.max(6,Math.floor(W/50))
      candles=Array.from({length:n},(_,i)=>({x:(i/n)*W+12+Math.random()*18,y:H*.18+Math.random()*H*.6,w:8+Math.random()*9,h:14+Math.random()*72,wick:6+Math.random()*22,up:Math.random()>.42,spd:.15+Math.random()*.35,ph:Math.random()*Math.PI*2}))
      const pts=Math.ceil(W/36)+2
      waves=[0,1,2,3].map(i=>({pts:Array.from({length:pts},(_,j)=>({x:j*36,y:H*(.14+i*.22)+Math.random()*44})),spd:.1+i*.04,ph:i*1.4,amp:13+i*8,color:i%2===0?'rgba(74,103,65,':'rgba(184,147,90,',opa:i%2===0?'0.72)':'0.56)'}))
    }
    const setup=()=>{ W=cvs.width=window.innerWidth; H=cvs.height=window.innerHeight; build() }
    const draw=()=>{
      cx.clearRect(0,0,W,H); T+=.011
      waves.forEach(w=>{cx.beginPath();w.pts.forEach((p,j)=>{const y=p.y+Math.sin(T*w.spd+j*.3+w.ph)*w.amp;j===0?cx.moveTo(p.x,y):cx.lineTo(p.x,y)});cx.strokeStyle=w.color+w.opa;cx.lineWidth=1;cx.stroke()})
      candles.forEach(c=>{const bob=Math.sin(T*c.spd+c.ph)*7,x=c.x,y=c.y+bob;cx.strokeStyle='rgba(28,28,28,.8)';cx.lineWidth=1;cx.beginPath();cx.moveTo(x+c.w/2,y-c.wick);cx.lineTo(x+c.w/2,y+c.h+c.wick);cx.stroke();cx.fillStyle=c.up?'rgba(74,103,65,.88)':'rgba(184,147,90,.82)';cx.fillRect(x,y,c.w,c.h);cx.strokeRect(x,y,c.w,c.h)})
      animId=requestAnimationFrame(draw)
    }
    window.addEventListener('resize',setup); setup(); draw()
    return()=>{ window.removeEventListener('resize',setup); cancelAnimationFrame(animId) }
  }, [])

  /* ── Pool bars animate ── */
  useEffect(() => {
    if (seasons.length > 0) {
      const widths: Record<string,string> = {}
      seasons.forEach(s => {
        const pct = s.pool > 0 ? Math.min(100, (s.poolFilled / s.pool) * 100) : 0
        widths[s.id] = Math.round(pct) + '%'
      })
      setPoolWidths(widths)
    }
  }, [seasons])

  /* ── Countdown timers ── */
  useEffect(() => {
    const tick = () => {
      const cds: Record<string,string> = {}
      const labels: Record<string,string> = {}
      seasons.forEach(s => {
        const now = Date.now()
        if (s.status === 'open' && s.entryCloseDate) {
          const diff = s.entryCloseDate.getTime() - now
          if (diff > 0) {
            const d=Math.floor(diff/864e5), h=Math.floor((diff%864e5)/36e5), m=Math.floor((diff%36e5)/6e4), sec=Math.floor((diff%6e4)/1e3)
            cds[s.id] = `${d}d ${pad(h)}h ${pad(m)}m ${pad(sec)}s`
            labels[s.id] = 'Entry window closes in'
            return
          }
        }
        const diff = s.endDate.getTime() - now
        if (diff <= 0) { cds[s.id] = 'Ending'; labels[s.id] = 'Season finished'; return }
        const d=Math.floor(diff/864e5), h=Math.floor((diff%864e5)/36e5), m=Math.floor((diff%36e5)/6e4), sec=Math.floor((diff%6e4)/1e3)
        cds[s.id] = `${d}d ${pad(h)}h ${pad(m)}m ${pad(sec)}s`
        labels[s.id] = 'Season finishes in'
      })
      setCountdowns(cds)
      setCountdownLabel(labels)
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [seasons])

  /* ── Scroll reveal ── */
  useEffect(() => {
    if (loading) return
    const obs = new IntersectionObserver(e=>e.forEach(x=>{if(x.isIntersecting)x.target.classList.add('vis')}),{threshold:.08})
    document.querySelectorAll<HTMLElement>('.sx-reveal').forEach(el=>obs.observe(el))
    return()=>obs.disconnect()
  }, [loading])

  /* ── Body scroll lock ── */
  useEffect(() => {
    document.body.style.overflow = sidebarOpen || modalOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen, modalOpen])

  /* ── ESC ── */
  useEffect(() => {
    const h=(e:KeyboardEvent)=>{ if(e.key==='Escape'){setModalOpen(false);setSidebarOpen(false)} }
    document.addEventListener('keydown',h)
    return()=>document.removeEventListener('keydown',h)
  }, [])

  /* ── Filtered history rows ── */
  const filteredHistory = history.filter(r => {
    if (histTab === 'all')       return true
    if (histTab === 'active')    return r.dbStatus === 'open' || r.dbStatus === 'running'
    if (histTab === 'completed') return r.dbStatus === 'closed'
    if (histTab === 'mine')      return r.mySeasonId !== null
    return true
  })

  const openInvest = (id: string) => {
    setInvestId(id); setAmountVal(''); setModalState('form'); setModalOpen(true)
  }

  const confirmInvest = async () => {
    if (!investId || !userProfile) return
    const s = seasons.find(x => x.id === investId)
    if (!s) return
    const amt = parseFloat(amountVal)
    if (!amt || isNaN(amt))       { showToast('⚠ Please enter an amount.'); return }
    if (amt < s.min)              { showToast(`⚠ Minimum investment is $${s.min.toLocaleString()}.`); return }
    if (amt > userProfile.balance){ showToast('⚠ Insufficient balance.'); return }

    try {
      const { error: invError } = await supabase.from('investments').insert({
        user_id: userProfile.id, season_id: investId, amount: amt, status: 'active'
      })
      if (invError) throw invError

      const newBalance = userProfile.balance - amt
      const newWithdrawable = Math.max(0, (Number(userProfile.withdrawable_total) || 0) - amt)
      const { error: profileError } = await supabase.from('profiles').update({
        balance:            newBalance,
        withdrawable_total: newWithdrawable,
        invested_total:     (Number(userProfile.invested_total) || 0) + amt,
      }).eq('id', userProfile.id)
      if (profileError) throw profileError

      const { error: poolError } = await supabase.rpc('increment_season_pool', {
        p_season_id: investId,
        p_amount: amt
      })
      if (poolError) {
        const newPool = (s.poolFilled || 0) + amt
        await supabase.from('seasons').update({ current_pool: newPool }).eq('id', investId)
      }

      setModalState('success')
      showToast('✓ Investment confirmed!', 'ok')
      fetchData()
    } catch (err: any) {
      showToast(`⚠ Error: ${err.message || 'Transaction failed'}`)
    }
  }

  const currentSeason = investId ? seasons.find(x => x.id === investId) : null

  /* ── Stats ── */
  const myTotalInvested = userProfile?.invested_total || 0
  const myProfits       = userProfile?.profits_total  || 0

  return (
    <>
      {loading && <VaultXLoader pageName="Seasons" />}
      <canvas ref={bgRef} style={{position:'fixed',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0,opacity:.055}}/>
      <div className={`sx-toast${toastShow?' show':''}${toastCls?' '+toastCls:''}`}>{toastMsg}</div>
      <UserSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className='sx-layout'>
        <div className='sx-topbar'>
          <button className='sx-hamburger' onClick={() => setSidebarOpen(true)}><span/><span/><span/></button>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <div className='sx-logo-mark' style={{width:26,height:26}}/>
            <span className='sx-logo-text' style={{fontSize:'1.15rem'}}>Vault<span>X</span></span>
          </div>
          <div className='sx-avatar' style={{width:32,height:32,fontSize:'.8rem',cursor:'pointer'}} onClick={() => router.push('/profile')}>
            {userProfile?.first_name?.[0]}{userProfile?.last_name?.[0]}
          </div>
        </div>

        <main className='sx-main'>
          <div style={{maxWidth:1040,margin:'0 auto'}}>

            {/* PAGE HEADER */}
            <div className='sx-reveal' style={{marginBottom:28,display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:14}}>
              <div>
                <span className='sx-sec-label'>Platform</span>
                <h1 className='sx-sec-title'>Investment Seasons</h1>
                <p style={{fontSize:'.85rem',color:'var(--text-sec)',fontWeight:300,marginTop:8,lineHeight:1.7,maxWidth:480}}>
                  Join active seasons and grow your capital through structured, time-bound investment cycles with transparent returns.
                </p>
              </div>
            </div>

            {/* STATS STRIP */}
            <div className='sx-reveal sx-stats-strip' style={{transitionDelay:'.04s',marginBottom:36}}>
              {[
                {lbl:'Active Seasons',      val:<>{seasons.length}</>,                                                                 valStyle:{}},
                {lbl:'My Total Invested',   val:<>${Number(myTotalInvested).toLocaleString()}</>,                                       valStyle:{color:'var(--gold)'}},
                {lbl:'Avg. Season ROI',     val: history.filter(h=>h.dbStatus==='closed'&&h.mySeasonId).length === 0
                  ? <>—</>
                  : <>{computedAvgRoi >= 0 ? '+' : ''}{computedAvgRoi}%</>,                                                            valStyle:{color: pnlColor(computedAvgRoi)}},
                {lbl:'Total Profit / Loss', val:<>{fmtPnL(Number(myProfits))}</>,                                                       valStyle:{color: pnlColor(Number(myProfits))}},
              ].map((s,i) => (
                <div key={i} className='sx-stat-cell'>
                  <div className='sx-stat-lbl'>{s.lbl}</div>
                  <div className='sx-stat-val' style={s.valStyle}>{s.val}</div>
                </div>
              ))}
            </div>

            {/* ACTIVE SEASONS HEADER */}
            <div className='sx-reveal' style={{transitionDelay:'.08s',marginBottom:14,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
              <div>
                <span className='sx-sec-label'>Currently Running</span>
                <h2 className='sx-hist-section-title'>Active Seasons</h2>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:6,fontSize:'.72rem',color:'var(--text-sec)'}}>
                <span className='sx-live-dot'/>{seasons.length} season{seasons.length!==1?'s':''} live
              </div>
            </div>

            {/* ACTIVE SEASONS GRID */}
            <div className='sx-seasons-grid sx-reveal' style={{transitionDelay:'.12s'}}>
              {seasons.length === 0 ? (
                <div style={{padding:'40px 20px',textAlign:'center',color:'var(--text-sec)',fontSize:'.82rem',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10}}>
                  No active seasons at the moment.
                </div>
              ) : seasons.map(s => {
                const pct = s.pool > 0 ? Math.min(100, Math.round((s.poolFilled / s.pool) * 100)) : 0
                const isEntryExpired = s.entryCloseDate && s.entryCloseDate.getTime() <= Date.now()
                const isOpen    = s.status === 'open' && !isEntryExpired
                const isRunning = s.status === 'running' || (s.status === 'open' && isEntryExpired)

                return (
                  <div key={s.id} className='sx-season-card'>
                    <div className='sx-sc-head'>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                        <span className='sx-sc-name'>{s.name}</span>
                        <span className={`sx-tag ${s.statusClass}`}>{s.statusLabel}</span>
                      </div>
                      <div className='sx-countdown-lbl'>{countdownLabel[s.id] || (isOpen ? 'Entry window closes in' : 'Season finishes in')}</div>
                      <div className='sx-countdown'>{countdowns[s.id] || '—'}</div>
                    </div>

                    <div className='sx-sc-body'>
                      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:10,marginBottom:10}}>
                        <div>
                          <div style={{fontSize:'.62rem',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text-sec)',marginBottom:3}}>Projected ROI</div>
                          <div className='sx-roi-val'>{s.roi}<span style={{fontSize:'1rem',color:'var(--text-sec)'}}>%</span></div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontSize:'.62rem',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text-sec)',marginBottom:3}}>Period</div>
                          <div style={{fontSize:'.78rem',color:'var(--ink)',fontWeight:500,maxWidth:160,textAlign:'right',lineHeight:1.4}}>{s.period}</div>
                        </div>
                      </div>

                      <div className='sx-detail-grid'>
                        <div className='sx-detail-item'>
                          <span>Min. Entry</span>
                          <strong>${s.min.toLocaleString()}</strong>
                        </div>
                        <div className='sx-detail-item'>
                          <span>Max. Entry</span>
                          <strong>${s.max.toLocaleString()}</strong>
                        </div>
                        <div className='sx-detail-item' style={{gridColumn:'span 2'}}>
                          <span>Pool Filled · {pct}%</span>
                          <strong>${s.poolFilled.toLocaleString(undefined,{maximumFractionDigits:0})} / ${s.pool.toLocaleString()}</strong>
                          <div className='sx-pool-bar'><div className='sx-pool-fill' style={{width:poolWidths[s.id]||'0%'}}/></div>
                        </div>
                      </div>
                    </div>

                    <div className='sx-sc-foot'>
                      {s.joined ? (
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                          <span style={{fontSize:'.75rem',color:'var(--sage)',fontWeight:500}}>✓ Invested ${s.myAmount.toLocaleString()}</span>
                          <span className='sx-tag sx-tag-open' style={{fontSize:'.6rem'}}>Joined</span>
                        </div>
                      ) : isOpen ? (
                        <button className='sx-btn-sage' style={{width:'100%',textAlign:'center'}} onClick={() => openInvest(s.id)}>
                          Invest Now →
                        </button>
                      ) : isRunning ? (
                        <div style={{textAlign:'center',fontSize:'.75rem',color:'var(--gold)',fontWeight:500,padding:'4px 0'}}>
                          ⏱ Entry Closed · Season Running
                        </div>
                      ) : (
                        <div style={{textAlign:'center',fontSize:'.75rem',color:'var(--text-sec)',padding:'4px 0'}}>Closed</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className='sx-divider'/>

            {/* HISTORY HEADER */}
            <div className='sx-reveal' style={{transitionDelay:'.16s',marginBottom:20}}>
              <span className='sx-sec-label'>Record</span>
              <h2 className='sx-hist-section-title' style={{marginBottom:18}}>
                All Seasons &amp; History
              </h2>
              <div className='sx-tabs'>
                {([['all','All'],['active','Active'],['completed','Completed'],['mine','My Investments']] as [string,string][]).map(([key,lbl]) => (
                  <button key={key} className={`sx-tab${histTab===key?' active':''}`} onClick={() => setHistTab(key as typeof histTab)}>{lbl}</button>
                ))}
              </div>
            </div>

            {/* DESKTOP HISTORY TABLE */}
            <div className='sx-hist-wrap sx-reveal sx-hist-desktop' style={{transitionDelay:'.2s'}}>
              <table className='sx-htbl'>
                <thead>
                  <tr><th>Season</th><th>Period</th><th>ROI</th><th>My Investment</th><th>My Profit / Loss</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {filteredHistory.length === 0 ? (
                    <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'var(--text-sec)',fontSize:'.82rem'}}>No records found.</td></tr>
                  ) : filteredHistory.map(r => (
                    <tr key={r.id}>
                      <td><div className='sx-td-sname'>{r.name}</div></td>
                      <td>
                        <div style={{fontSize:'.75rem',color:'var(--ink)',lineHeight:1.45}}>
                          {r.period !== '—' ? r.period.split('→').map((part, i) => (
                            <span key={i}>
                              {i > 0 && <span style={{color:'var(--gold)',margin:'0 4px'}}>→</span>}
                              {part.trim()}
                            </span>
                          )) : '—'}
                        </div>
                      </td>
                      <td>
                        <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'.95rem',fontWeight:500,color: r.roiSign==='+'?'var(--sage)':r.roiSign==='-'?'#b05252':'var(--text-sec)'}}>
                          {r.roi}
                        </span>
                      </td>
                      <td>
                        {r.mySeasonId !== null ? (
                          <><span className='sx-my-tag'>mine</span> {r.myInv}</>
                        ) : r.myInv}
                      </td>
                      <td>
                        <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'.95rem',fontWeight:500,color: r.plSign==='+'?'var(--sage)':r.plSign==='-'?'#b05252':'var(--text-sec)'}}>
                          {r.myPL}
                        </span>
                      </td>
                      <td>
                        {r.dbStatus === 'closed' ? (
                          <span className='sx-tag sx-tag-done'>Closed</span>
                        ) : r.dbStatus === 'running' ? (
                          <span className='sx-tag sx-tag-ending'>Running</span>
                        ) : r.dbStatus === 'open' ? (
                          <span className='sx-tag sx-tag-open'>Open</span>
                        ) : (
                          <span className='sx-tag sx-tag-done'>Upcoming</span>
                        )}
                      </td>
                      <td>
                        {r.dbStatus === 'open' && !r.mySeasonId ? (
                          <button className='sx-btn-sage' style={{fontSize:'.7rem',padding:'7px 14px',whiteSpace:'nowrap'}} onClick={() => openInvest(r.id)}>
                            Invest Now
                          </button>
                        ) : r.dbStatus === 'running' ? (
                          <span style={{fontSize:'.72rem',color:'var(--gold)'}}>Entry Closed</span>
                        ) : r.dbStatus === 'closed' ? (
                          <span style={{fontSize:'.72rem',color:'var(--text-sec)'}}>Closed</span>
                        ) : (
                          <span style={{fontSize:'.72rem',color:'var(--text-sec)'}}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE HISTORY CARDS */}
            <div className='sx-hist-mobile sx-reveal' style={{transitionDelay:'.2s'}}>
              {filteredHistory.length === 0 ? (
                <div style={{textAlign:'center',padding:'32px 20px',color:'var(--text-sec)',fontSize:'.82rem',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10}}>
                  No records found.
                </div>
              ) : filteredHistory.map(r => (
                <div key={r.id} className='sx-hist-card'>
                  {/* Card Header */}
                  <div className='sx-hist-card-head'>
                    <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.05rem',fontWeight:500,color:'var(--ink)'}}>{r.name}</div>
                      {r.mySeasonId && <span className='sx-my-tag'>mine</span>}
                    </div>
                    <div>
                      {r.dbStatus === 'closed' ? (
                        <span className='sx-tag sx-tag-done'>Closed</span>
                      ) : r.dbStatus === 'running' ? (
                        <span className='sx-tag sx-tag-ending'>Running</span>
                      ) : (
                        <span className='sx-tag sx-tag-open'>Open</span>
                      )}
                    </div>
                  </div>

                  {/* Period row */}
                  <div className='sx-hist-card-period'>
                    <svg width="11" height="11" fill="none" stroke="var(--gold)" strokeWidth="1.8" viewBox="0 0 24 24" style={{flexShrink:0,marginTop:1}}>
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <span>{r.period}</span>
                  </div>

                  {/* Stats grid */}
                  <div className='sx-hist-card-grid'>
                    <div className='sx-hist-card-cell'>
                      <div className='sx-hist-card-label'>ROI</div>
                      <div className='sx-hist-card-value' style={{color: r.roiSign==='+'?'var(--sage)':r.roiSign==='-'?'#b05252':'var(--text-sec)'}}>
                        {r.roi}
                      </div>
                    </div>
                    <div className='sx-hist-card-cell'>
                      <div className='sx-hist-card-label'>My Investment</div>
                      <div className='sx-hist-card-value' style={{color:'var(--ink)'}}>{r.myInv}</div>
                    </div>
                    <div className='sx-hist-card-cell' style={{gridColumn:'span 2'}}>
                      <div className='sx-hist-card-label'>My Profit / Loss</div>
                      <div className='sx-hist-card-value' style={{color: r.plSign==='+'?'var(--sage)':r.plSign==='-'?'#b05252':'var(--text-sec)'}}>
                        {r.myPL}
                      </div>
                    </div>
                  </div>

                  {/* Action */}
                  {r.dbStatus === 'open' && !r.mySeasonId && (
                    <div style={{paddingTop:12,borderTop:'1px solid var(--border)'}}>
                      <button className='sx-btn-sage' style={{width:'100%',textAlign:'center',fontSize:'.72rem',padding:'10px'}} onClick={() => openInvest(r.id)}>
                        Invest Now →
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>
        </main>
      </div>

      {/* INVEST MODAL */}
      <div className={`sx-overlay${modalOpen?' open':''}`} onClick={e=>{if(e.target===e.currentTarget)setModalOpen(false)}}>
        <div className='sx-modal-box'>
          <div className='sx-modal-hd'>
            <span className='sx-modal-ttl'>
              {modalState==='form' ? (currentSeason ? `Join ${currentSeason.name}` : 'Join Season') : 'Investment Confirmed'}
            </span>
            <button className='sx-modal-cls' onClick={() => setModalOpen(false)}>✕</button>
          </div>

          {modalState === 'form' && currentSeason && (
            <>
              <div className='sx-modal-season-badge'>
                <div>
                  <div className='sx-modal-season-name'>{currentSeason.name}</div>
                  <div style={{fontSize:'.68rem',color:'var(--text-sec)',marginTop:2}}>{currentSeason.period}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.4rem',fontWeight:300,color:'var(--sage)'}}>{currentSeason.roi}%</div>
                  <div style={{fontSize:'.62rem',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text-sec)'}}>Projected ROI</div>
                </div>
              </div>
              <div style={{marginBottom:14}}>
                <label className='sx-fl' style={{display:'block',marginBottom:6}}>Investment Amount</label>
                <div className='sx-amount-input-wrap'>
                  <input className='sx-fi' type='number' placeholder={`Min $${currentSeason.min} · Available $${Number(userProfile?.balance || 0).toLocaleString()}`}
                    min={currentSeason.min} value={amountVal} onChange={e => setAmountVal(e.target.value)}/>
                  <span className='sx-usdt'>USDT</span>
                </div>
                <div className='sx-modal-limits'>
                  <span>Min: <strong style={{color:'var(--ink)'}}>$<span>{currentSeason.min.toLocaleString()}</span></strong></span>
                  <span>Available: <strong style={{color:'var(--gold)'}}>$<span>{Number(userProfile?.balance || 0).toLocaleString()}</span></strong></span>
                </div>
              </div>
              <div style={{background:'rgba(74,103,65,.05)',border:'1px solid rgba(74,103,65,.14)',borderRadius:6,padding:'11px 13px',marginBottom:18}}>
                <div style={{fontSize:'.7rem',color:'var(--text-sec)',lineHeight:1.8,fontWeight:300}}>
                  💡 Investment is locked for the season duration. Your referrer earns commission on your profits upon season close.
                </div>
              </div>
              <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                <button className='sx-btn-ink' style={{flex:1,minWidth:130,textAlign:'center'}} onClick={confirmInvest}>Confirm Investment</button>
                <button className='sx-btn-ghost' style={{flex:1,minWidth:100,textAlign:'center'}} onClick={() => setModalOpen(false)}>Cancel</button>
              </div>
            </>
          )}

          {modalState === 'success' && currentSeason && (
            <div style={{textAlign:'center',padding:'8px 0 4px'}}>
              <div style={{fontSize:'2.2rem',marginBottom:12}}>✓</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.8rem',fontWeight:300,color:'var(--ink)',marginBottom:8}}>
                ${parseFloat(amountVal||'0').toLocaleString()} Invested!
              </div>
              <p style={{fontSize:'.8rem',color:'var(--text-sec)',lineHeight:1.7,fontWeight:300}}>
                Your investment in <strong>{currentSeason.name}</strong> has been confirmed. You will receive your returns at the end of the cycle.
              </p>
              <button className='sx-btn-ink' style={{marginTop:22,width:'100%'}} onClick={() => setModalOpen(false)}>Done</button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}