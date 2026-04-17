'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import UserSidebar from '@/components/UserSidebar'
import VaultXLoader from '@/components/VaultXLoader'
import { createClient } from '@/utils/supabase/client'

const COUNTRY_CODES = [
  { code: 'AF', name: 'Afghanistan', dial: '+93', flag: '🇦🇫' },
  { code: 'AL', name: 'Albania', dial: '+355', flag: '🇦🇱' },
  { code: 'DZ', name: 'Algeria', dial: '+213', flag: '🇩🇿' },
  { code: 'BD', name: 'Bangladesh', dial: '+880', flag: '🇧🇩' },
  { code: 'BE', name: 'Belgium', dial: '+32', flag: '🇧🇪' },
  { code: 'BR', name: 'Brazil', dial: '+55', flag: '🇧🇷' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { code: 'CN', name: 'China', dial: '+86', flag: '🇨🇳' },
  { code: 'EG', name: 'Egypt', dial: '+20', flag: '🇪🇬' },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { code: 'GH', name: 'Ghana', dial: '+233', flag: '🇬🇭' },
  { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' },
  { code: 'ID', name: 'Indonesia', dial: '+62', flag: '🇮🇩' },
  { code: 'IR', name: 'Iran', dial: '+98', flag: '🇮🇷' },
  { code: 'IQ', name: 'Iraq', dial: '+964', flag: '🇮🇶' },
  { code: 'IT', name: 'Italy', dial: '+39', flag: '🇮🇹' },
  { code: 'JP', name: 'Japan', dial: '+81', flag: '🇯🇵' },
  { code: 'JO', name: 'Jordan', dial: '+962', flag: '🇯🇴' },
  { code: 'KE', name: 'Kenya', dial: '+254', flag: '🇰🇪' },
  { code: 'KW', name: 'Kuwait', dial: '+965', flag: '🇰🇼' },
  { code: 'LB', name: 'Lebanon', dial: '+961', flag: '🇱🇧' },
  { code: 'MY', name: 'Malaysia', dial: '+60', flag: '🇲🇾' },
  { code: 'MV', name: 'Maldives', dial: '+960', flag: '🇲🇻' },
  { code: 'MX', name: 'Mexico', dial: '+52', flag: '🇲🇽' },
  { code: 'MA', name: 'Morocco', dial: '+212', flag: '🇲🇦' },
  { code: 'MM', name: 'Myanmar', dial: '+95', flag: '🇲🇲' },
  { code: 'NP', name: 'Nepal', dial: '+977', flag: '🇳🇵' },
  { code: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱' },
  { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
  { code: 'NO', name: 'Norway', dial: '+47', flag: '🇳🇴' },
  { code: 'OM', name: 'Oman', dial: '+968', flag: '🇴🇲' },
  { code: 'PK', name: 'Pakistan', dial: '+92', flag: '🇵🇰' },
  { code: 'PS', name: 'Palestine', dial: '+970', flag: '🇵🇸' },
  { code: 'PH', name: 'Philippines', dial: '+63', flag: '🇵🇭' },
  { code: 'PL', name: 'Poland', dial: '+48', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', dial: '+351', flag: '🇵🇹' },
  { code: 'QA', name: 'Qatar', dial: '+974', flag: '🇶🇦' },
  { code: 'RU', name: 'Russia', dial: '+7', flag: '🇷🇺' },
  { code: 'SA', name: 'Saudi Arabia', dial: '+966', flag: '🇸🇦' },
  { code: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬' },
  { code: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦' },
  { code: 'ES', name: 'Spain', dial: '+34', flag: '🇪🇸' },
  { code: 'LK', name: 'Sri Lanka', dial: '+94', flag: '🇱🇰' },
  { code: 'SE', name: 'Sweden', dial: '+46', flag: '🇸🇪' },
  { code: 'CH', name: 'Switzerland', dial: '+41', flag: '🇨🇭' },
  { code: 'TW', name: 'Taiwan', dial: '+886', flag: '🇹🇼' },
  { code: 'TZ', name: 'Tanzania', dial: '+255', flag: '🇹🇿' },
  { code: 'TH', name: 'Thailand', dial: '+66', flag: '🇹🇭' },
  { code: 'TN', name: 'Tunisia', dial: '+216', flag: '🇹🇳' },
  { code: 'TR', name: 'Turkey', dial: '+90', flag: '🇹🇷' },
  { code: 'AE', name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { code: 'UZ', name: 'Uzbekistan', dial: '+998', flag: '🇺🇿' },
  { code: 'VN', name: 'Vietnam', dial: '+84', flag: '🇻🇳' },
  { code: 'YE', name: 'Yemen', dial: '+967', flag: '🇾🇪' },
  { code: 'ZM', name: 'Zambia', dial: '+260', flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabwe', dial: '+263', flag: '🇿🇼' },
]

function parsePhoneNumber(phone: string): { dialCode: string; number: string } {
  if (!phone) return { dialCode: '+880', number: '' }
  const sortedCodes = [...COUNTRY_CODES].sort((a, b) => b.dial.length - a.dial.length)
  for (const country of sortedCodes) {
    if (phone.startsWith(country.dial)) {
      return { dialCode: country.dial, number: phone.slice(country.dial.length) }
    }
  }
  return { dialCode: '+880', number: phone }
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [toastCls, setToastCls] = useState('')
  const [toastShow, setToastShow] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const [profile, setProfile] = useState<any>(null)
  const [referrals, setReferrals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pwResetSent, setPwResetSent] = useState(false)
  // ── FIX: computed avg ROI from closed investments ──
  const [computedAvgRoi, setComputedAvgRoi] = useState<number | null>(null)

  const [fName, setFName] = useState('')
  const [fUn, setFUn] = useState('')
  const [fEm, setFEm] = useState('')
  const [fPh, setFPh] = useState('')
  const [fCo, setFCo] = useState('')
  const [fDialCode, setFDialCode] = useState('+880')
  const [fPhoneNumber, setFPhoneNumber] = useState('')

  const bgRef = useRef<HTMLCanvasElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const formCardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/signin')
          return
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()
        
        if (profileData) {
          setProfile(profileData)
          setFName(`${profileData.first_name} ${profileData.last_name}`)
          setFUn(profileData.username || '')
          setFEm(user.email || '')
          setFPh(profileData.phone_number || '')
          setFCo(profileData.country || '')
          const { dialCode, number } = parsePhoneNumber(profileData.phone_number)
          setFDialCode(dialCode)
          setFPhoneNumber(number)
        } else {
          setFEm(user.email || '')
        }

        // ── FIX: fetch investments to compute avg ROI from closed seasons ──
        const { data: investments } = await supabase
          .from('investments')
          .select('amount, status, seasons(final_roi, status)')
          .eq('user_id', user.id)

        if (investments) {
          const closedWithRoi = investments.filter((inv: any) =>
            inv.seasons?.status === 'closed' && inv.seasons?.final_roi != null
          )
          if (closedWithRoi.length > 0) {
            const sum = closedWithRoi.reduce((acc: number, inv: any) =>
              acc + Number(inv.seasons.final_roi), 0)
            setComputedAvgRoi(Math.round((sum / closedWithRoi.length) * 100) / 100)
          } else {
            setComputedAvgRoi(null) // no closed seasons yet
          }
        }

        const { data: referralData } = await supabase
          .from('profiles')
          .select('*')
          .eq('referred_by', user.id)
        
        setReferrals(referralData || [])
      } catch (err) {
        console.error('Profile page fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [router, supabase])

  const showToast = useCallback((msg: string, cls = '') => {
    setToastMsg('✓  ' + msg)
    setToastCls(cls)
    setToastShow(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastShow(false), 3000)
  }, [])

  const handlePasswordChange = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) { showToast('Could not find your email address.', 'err'); return }
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })
    if (error) {
      showToast('✕ ' + error.message, 'err')
    } else {
      showToast('✓ Password reset link sent to ' + user.email, 'ok')
      setPwResetSent(true)
      setTimeout(() => setPwResetSent(false), 30000)
    }
  }

  useEffect(() => {
    const cvs = bgRef.current; if (!cvs) return
    const cx = cvs.getContext('2d'); if (!cx) return
    type Candle = { x:number;y:number;w:number;h:number;wick:number;up:boolean;spd:number;ph:number }
    type Wave = { pts:{x:number;y:number}[];spd:number;ph:number;amp:number;color:string;opa:string }
    let W=0, H=0, candles:Candle[]=[], waves:Wave[]=[], T=0, animId=0
    const build = () => {
      const count = Math.max(6, Math.floor(W / 50))
      candles = Array.from({length:count},(_,i)=>({x:(i/count)*W+14+Math.random()*18,y:H*.2+Math.random()*H*.58,w:8+Math.random()*8,h:14+Math.random()*70,wick:6+Math.random()*20,up:Math.random()>.42,spd:.16+Math.random()*.36,ph:Math.random()*Math.PI*2}))
      const pts = Math.ceil(W / 36) + 2
      waves = [0,1,2,3].map(i=>({pts:Array.from({length:pts},(_,j)=>({x:j*36,y:H*(.15+i*.22)+Math.random()*45})),spd:.11+i*.04,ph:i*1.4,amp:14+i*8,color:i%2===0?'rgba(74,103,65,':'rgba(184,147,90,',opa:i%2===0?'0.7)':'0.55)'}))
    }
    const setup = () => { W=cvs.width=window.innerWidth; H=cvs.height=window.innerHeight; build() }
    const draw = () => {
      cx.clearRect(0,0,W,H); T+=.011
      waves.forEach(w=>{cx.beginPath();w.pts.forEach((p,j)=>{const y=p.y+Math.sin(T*w.spd+j*.3+w.ph)*w.amp;j===0?cx.moveTo(p.x,y):cx.lineTo(p.x,y)});cx.strokeStyle=w.color+w.opa;cx.lineWidth=1;cx.stroke()})
      candles.forEach(c=>{const bob=Math.sin(T*c.spd+c.ph)*7,x=c.x,y=c.y+bob;cx.strokeStyle='rgba(28,28,28,.8)';cx.lineWidth=1;cx.beginPath();cx.moveTo(x+c.w/2,y-c.wick);cx.lineTo(x+c.w/2,y+c.h+c.wick);cx.stroke();cx.fillStyle=c.up?'rgba(74,103,65,.88)':'rgba(184,147,90,.82)';cx.fillRect(x,y,c.w,c.h);cx.strokeRect(x,y,c.w,c.h)})
      animId=requestAnimationFrame(draw)
    }
    window.addEventListener('resize', setup); setup(); draw()
    return()=>{ window.removeEventListener('resize',setup); cancelAnimationFrame(animId) }
  }, [])

  useEffect(() => {
    const obs = new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('show')})},{threshold:.1})
    document.querySelectorAll<HTMLElement>('.pf-reveal').forEach(el=>obs.observe(el))
    return()=>obs.disconnect()
  }, [])

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return()=>{ document.body.style.overflow='' }
  }, [sidebarOpen])

  useEffect(() => {
    const h=(e:KeyboardEvent)=>{ if(e.key==='Escape')setSidebarOpen(false) }
    document.addEventListener('keydown', h)
    return()=>document.removeEventListener('keydown', h)
  }, [])

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { showToast('Please sign in again', 'err'); return }
    const [firstName, ...lastNameParts] = fName.split(' ')
    const lastName = lastNameParts.join(' ')
    const fullPhone = fPhoneNumber ? `${fDialCode}${fPhoneNumber}` : ''
    const { error } = await supabase
      .from('profiles')
      .update({ first_name:firstName, last_name:lastName, username:fUn, phone_number:fullPhone, country:fCo })
      .eq('id', user.id)
    if (error) {
      showToast(error.message, 'err')
    } else {
      setProfile({...profile, first_name:firstName, last_name:lastName, username:fUn, phone_number:fullPhone, country:fCo})
      setFPh(fullPhone)
      showToast('Profile saved successfully', 'ok')
    }
  }

  const resetForm = () => {
    if (profile) {
      setFName(`${profile.first_name} ${profile.last_name}`)
      setFUn(profile.username || '')
      setFCo(profile.country || '')
      const { dialCode, number } = parsePhoneNumber(profile.phone_number)
      setFDialCode(dialCode)
      setFPhoneNumber(number)
      setFPh(profile.phone_number || '')
    }
    showToast('Changes discarded')
  }

  const copyCode = () => {
    const code = profile?.referral_code || 'VAULT-X'
    const doShow = () => {
      setCopied(true)
      showToast('Referral code copied', 'ok')
      setTimeout(() => setCopied(false), 2500)
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(doShow).catch(doShow)
    } else doShow()
  }

  const scrollToForm = () => {
    formCardRef.current?.scrollIntoView({behavior:'smooth',block:'start'})
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/signin')
  }

  // ── FIX: avg ROI display helper ──
  const avgRoiDisplay = computedAvgRoi !== null
    ? `${computedAvgRoi >= 0 ? '+' : ''}${computedAvgRoi}%`
    : '—'

  const LockSVG = () => (
    <svg width='20' height='20' fill='none' stroke='var(--gold)' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' viewBox='0 0 24 24'>
      <rect x='3' y='11' width='18' height='11' rx='2' ry='2' fill='rgba(184,147,90,0.15)'/>
      <path d='M7 11V7a5 5 0 0110 0v4'/>
    </svg>
  )

  return (
    <>
      {loading && <VaultXLoader pageName="Profile" />}
      <canvas ref={bgRef} style={{position:'fixed',inset:0,zIndex:0,pointerEvents:'none',opacity:.055,width:'100%',height:'100%'}}/>
      <div className={`pf-toast${toastShow?' show':''}${toastCls?' '+toastCls:''}`}>{toastMsg}</div>
      <UserSidebar open={sidebarOpen} onClose={()=>setSidebarOpen(false)}/>

      <div className='pf-layout'>
        {/* MOBILE TOPBAR */}
        <div className='pf-topbar'>
          <button className='pf-hamburger' onClick={()=>setSidebarOpen(true)}><span/><span/><span/></button>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <div className='pf-logo-mark' style={{width:26,height:26}}/>
            <span className='pf-logo-text' style={{fontSize:'1.15rem'}}>Vault<span>X</span></span>
          </div>
          <div className='pf-avatar' style={{width:32,height:32,fontSize:'.8rem',cursor:'pointer'}} onClick={()=>router.push('/profile')}>
            {profile?.first_name?.[0]}{profile?.last_name?.[0]}
          </div>
        </div>

        <div className='pf-main'>
          <div style={{maxWidth:960,margin:'0 auto'}}>

            {/* HEADING */}
            <div className='pf-reveal' style={{marginBottom:24}}>
              <span className='pf-label'>Account</span>
              <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'clamp(1.6rem,4vw,2.2rem)',fontWeight:400,color:'var(--ink)',lineHeight:1.15}}>
                Good morning,<br/>
                <em style={{fontStyle:'italic',color:'var(--gold)'}}>{profile?.first_name || 'User'}</em>
              </h1>
            </div>

            {/* HERO CARD */}
            <div className='pf-hero-card pf-reveal' style={{transitionDelay:'.05s'}}>
              <div style={{position:'relative',flexShrink:0}}>
                <div className='pf-avatar-lg'>
                  {profile ? `${profile.first_name[0]}${profile.last_name[0]}` : '...'}
                  <div className='pf-online-dot'/>
                </div>
              </div>
              <div className='pf-hero-body'>
                <h2 className='pf-hero-name'>{profile ? `${profile.first_name} ${profile.last_name}` : 'Loading...'}</h2>
                <div className='pf-hero-uid'>
                  @{profile?.username} · Member since {profile ? new Date(profile.created_at).toLocaleDateString(undefined,{month:'short',year:'numeric'}) : '...'}
                </div>
                <div className='pf-meta-pills'>
                  <div className='pf-pill'>Balance <strong>${profile?.balance?.toLocaleString() || '0'}</strong></div>
                  {/* ── FIX: use computed avg ROI ── */}
                  <div className='pf-pill'>ROI <strong>{avgRoiDisplay}</strong></div>
                  <div className='pf-pill'>Season <strong>{profile?.active_season_id ? 'Active' : 'Not Joined'}</strong></div>
                  <div className='pf-pill'>Referred <strong>{referrals.length} users</strong></div>
                </div>
              </div>
              <div style={{display:'flex',gap:10,flexWrap:'wrap',flexShrink:0}}>
                <button className='pf-btn-ghost' onClick={scrollToForm}>Edit Profile</button>
                <button className='pf-btn-danger' onClick={handleLogout}>Logout</button>
              </div>
            </div>

            {/* TWO-COL */}
            <div className='pf-two-col'>
              {/* LEFT COL */}
              <div className='pf-col'>
                {/* PROFILE FORM */}
                <div className='pf-card pf-reveal' ref={formCardRef} style={{transitionDelay:'.08s'}}>
                  <div className='pf-cp' style={{paddingBottom:0}}>
                    <span className='pf-sec-label'>Personal Info</span>
                    <h2 className='pf-sec-title' style={{fontSize:'1.25rem',marginBottom:22}}>Edit Profile</h2>
                  </div>
                  <form onSubmit={saveProfile} className='pf-cp' style={{paddingTop:0}}>
                    <div className='pf-form-grid'>
                      {[['Full Name','pf-fn','text','name'],['Username','pf-un','text','username']].map(([lbl,id,type,key])=>(
                        <div key={id} className='pf-fg'>
                          <label className='pf-fl'>{lbl}</label>
                          <input className='pf-fi' type={type} value={(key==='name'?fName:fUn)} onChange={e=>key==='name'?setFName(e.target.value):setFUn(e.target.value)}/>
                        </div>
                      ))}
                      <div className='pf-fg pf-f-full'>
                        <label className='pf-fl'>Email Address</label>
                        <input className='pf-fi' type='email' value={fEm} readOnly style={{opacity:.6}}/>
                      </div>
                      <div className='pf-fg pf-f-full'>
                        <label className='pf-fl'>Phone Number</label>
                        <div style={{display:'flex',gap:0,border:'1px solid var(--border)',borderRadius:'var(--radius)',overflow:'hidden',background:'var(--cream)'}}>
                          <div style={{position:'relative',flexShrink:0}}>
                            <select value={fDialCode} onChange={e=>{setFDialCode(e.target.value);const f=COUNTRY_CODES.find(c=>c.dial===e.target.value);if(f)setFCo(f.name)}} style={{padding:'11px 28px 11px 10px',height:'100%',background:'var(--parchment)',border:'none',borderRight:'1px solid var(--border)',fontFamily:"'DM Sans',sans-serif",fontSize:'.82rem',color:'var(--ink)',outline:'none',cursor:'pointer',appearance:'none',WebkitAppearance:'none',minWidth:90}}>
                              {COUNTRY_CODES.map(c=><option key={c.code} value={c.dial}>{c.flag} {c.dial}</option>)}
                            </select>
                            <span style={{position:'absolute',right:7,top:'50%',transform:'translateY(-50%)',pointerEvents:'none',fontSize:'.6rem',color:'var(--text-secondary)'}}>▼</span>
                          </div>
                          <input className='pf-fi' type='tel' value={fPhoneNumber} onChange={e=>setFPhoneNumber(e.target.value)} placeholder='1712-345678' style={{border:'none',borderRadius:0,flex:1,background:'transparent'}}/>
                        </div>
                      </div>
                      <div className='pf-fg'>
                        <label className='pf-fl'>Country</label>
                        <select className='pf-fi' value={fCo} onChange={e=>{setFCo(e.target.value);const f=COUNTRY_CODES.find(c=>c.name===e.target.value);if(f)setFDialCode(f.dial)}} style={{appearance:'none',WebkitAppearance:'none',backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='6 9 12 15 18 9' stroke='%236b6459' stroke-width='1.8' fill='none'/%3E%3C/svg%3E\")",backgroundRepeat:'no-repeat',backgroundPosition:'right 12px center',backgroundSize:'16px',paddingRight:34,cursor:'pointer'}}>
                          <option value=''>Select your country…</option>
                          {COUNTRY_CODES.map(c=><option key={c.code} value={c.name}>{c.flag} {c.name}</option>)}
                        </select>
                      </div>
                      <div className='pf-fg'>
                        <label className='pf-fl'>Active Season</label>
                        <input className='pf-fi' type='text' value={profile?.active_season_id?'Active':'None'} readOnly/>
                      </div>
                      <div className='pf-f-full' style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:6}}>
                        <button type='submit' className='pf-btn-ink'>Save Changes</button>
                        <button type='button' className='pf-btn-ghost' onClick={resetForm}>Cancel</button>
                      </div>
                    </div>
                  </form>
                </div>

                {/* SECURITY */}
                <div className='pf-card pf-reveal pf-cp' style={{transitionDelay:'.12s'}}>
                  <span className='pf-sec-label'>Security</span>
                  <h2 className='pf-sec-title' style={{fontSize:'1.25rem',marginBottom:18}}>Account Security</h2>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    <div className='pf-sec-row'>
                      <div>
                        <div style={{fontSize:'.82rem',fontWeight:500,color:'var(--ink)',marginBottom:2}}>Password</div>
                        <div style={{fontSize:'.7rem',color:'var(--txt2)'}}>Last changed 45 days ago</div>
                      </div>
                      <button className='pf-btn-ghost' style={{fontSize:'.7rem',padding:'7px 14px'}} onClick={handlePasswordChange} disabled={pwResetSent}>
                        {pwResetSent?'Link Sent ✓':'Change'}
                      </button>
                    </div>
                    <div className='pf-lock-wrapper'>
                      <div className='pf-sec-row'>
                        <div>
                          <div style={{fontSize:'.82rem',fontWeight:500,color:'var(--ink)',marginBottom:2}}>Google Two-Factor Auth</div>
                          <div style={{fontSize:'.7rem',color:'var(--txt2)'}}>Extra layer of protection via Google Authenticator</div>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{fontSize:'.68rem',textTransform:'uppercase',letterSpacing:'.06em',color:'var(--sage)'}}>Enabled</span>
                          <div className='pf-toggle-track'><div className='pf-toggle-knob'/></div>
                        </div>
                      </div>
                      <div className='pf-lock-overlay'>
                        <div className='pf-lock-badge'><LockSVG/></div>
                        <div className='pf-lock-text-block'>
                          <span className='pf-lock-main'>Not available in your region</span>
                          <span className='pf-lock-hint'>Google 2FA is restricted for your account</span>
                        </div>
                      </div>
                    </div>
                    <div className='pf-lock-wrapper'>
                      <div className='pf-sec-row'>
                        <div>
                          <div style={{fontSize:'.82rem',fontWeight:500,color:'var(--ink)',marginBottom:2}}>KYC Verification</div>
                          <div style={{fontSize:'.7rem',color:'var(--txt2)'}}>Identity document verification</div>
                        </div>
                        <span className='pf-badge pf-b-act'>Verified</span>
                      </div>
                      <div className='pf-lock-overlay'>
                        <div className='pf-lock-badge'><LockSVG/></div>
                        <div className='pf-lock-text-block'>
                          <span className='pf-lock-main'>Not available in your region</span>
                          <span className='pf-lock-hint'>KYC verification is restricted for your account</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COL */}
              <div className='pf-col'>
                {/* REFERRAL */}
                <div className='pf-card pf-reveal pf-cp' style={{transitionDelay:'.1s'}}>
                  <span className='pf-sec-label'>Passive Income</span>
                  <h2 className='pf-sec-title' style={{fontSize:'1.25rem',marginBottom:6}}>Referral Program</h2>
                  <p style={{fontSize:'.78rem',color:'var(--txt2)',fontWeight:300,lineHeight:1.75,marginBottom:20}}>
                    Earn <strong style={{color:'var(--gold)'}}>5% commission</strong> automatically every time a referred user makes a withdrawal — no cap, no delays.
                  </p>
                  <span className='pf-sec-label'>Your Code</span>
                  <div className='pf-ref-code-box' style={{marginBottom:18}}>
                    <span className='pf-ref-code-val'>{profile?.referral_code || 'VAULT-X'}</span>
                    <button className={`pf-btn-copy${copied?' copied':''}`} onClick={copyCode}>
                      {copied?'Copied!':'Copy'}
                    </button>
                  </div>
                  <span className='pf-sec-label'>Statistics</span>
                  <div className='pf-stat-trio' style={{marginBottom:18}}>
                    <div className='pf-stat-cell'>
                      <div className='pf-stat-val'>${Number(profile?.referral_earned || 0).toLocaleString()}</div>
                      <div className='pf-stat-lbl'>Commission</div>
                    </div>
                    <div className='pf-stat-cell'>
                      <div className='pf-stat-val'>{referrals.length}</div>
                      <div className='pf-stat-lbl'>Referred</div>
                    </div>
                    <div className='pf-stat-cell'>
                      <div className='pf-stat-val'>{profile?.commission_rate || 7}<span>%</span></div>
                      <div className='pf-stat-lbl'>Rate</div>
                    </div>
                  </div>
                  <div style={{background:'rgba(184,147,90,.05)',border:'1px solid var(--border)',borderRadius:6,padding:'12px 14px',marginBottom:20}}>
                    <div style={{fontSize:'.68rem',color:'var(--txt2)',lineHeight:1.85,fontWeight:300}}>
                      📌 Share code → Friend invests → Friend withdraws → <strong style={{color:'var(--gold)'}}>You earn 5%</strong> credited automatically.
                    </div>
                  </div>

                  {/* Referred users table */}
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                    <span className='pf-sec-label' style={{marginBottom:0}}>Referred Users</span>
                    <span style={{fontSize:'.65rem',color:'var(--txt2)',letterSpacing:'.06em'}}>{referrals.length} total</span>
                  </div>
                  <div className='pf-tbl-wrap'>
                    <table className='pf-rtbl'>
                      <thead>
                        <tr><th>User</th><th>Balance</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {referrals.length === 0 ? (
                          <tr><td colSpan={3} style={{textAlign:'center',padding:'16px',color:'var(--txt2)',fontSize:'.78rem'}}>No referrals yet.</td></tr>
                        ) : referrals.slice(0, 5).map((u, i) => (
                          <tr key={i}>
                            <td>
                              <div className='pf-td-u'>
                                <div className='pf-td-av'>{u.first_name?.[0]}{u.last_name?.[0]}</div>
                                <div>
                                  <div className='pf-td-nm'>{u.first_name} {u.last_name?.[0]}.</div>
                                  <div className='pf-td-hd'>@{u.username}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{fontWeight:500,color:'var(--ink)'}}>${Number(u.balance||0).toLocaleString()}</td>
                            <td><span className='pf-badge pf-b-act'>active</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{marginTop:14,textAlign:'center'}}>
                    {/* ── FIX: navigate to referral page instead of opening modal ── */}
                    <button
                      className='pf-btn-ghost'
                      style={{width:'100%'}}
                      onClick={() => router.push('/referral')}
                    >
                      See Full List →
                    </button>
                  </div>
                </div>

                {/* WALLET */}
                <div className='pf-card pf-reveal pf-cp' style={{transitionDelay:'.14s'}}>
                  <span className='pf-sec-label'>Assets</span>
                  <h2 className='pf-sec-title' style={{fontSize:'1.25rem',marginBottom:16}}>Wallet Summary</h2>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    <div className='pf-wrow'><span className='pf-wrow-lbl'>Total Invested</span><span className='pf-wrow-val' style={{color:'var(--ink)'}}>${Number(profile?.invested_total||0).toLocaleString()}</span></div>
                    <div className='pf-wrow'><span className='pf-wrow-lbl'>Current Balance</span><span className='pf-wrow-val' style={{color:'var(--gold)'}}>${Number(profile?.balance||0).toLocaleString()}</span></div>
                    <div className='pf-wrow'><span className='pf-wrow-lbl'>Withdrawable</span><span className='pf-wrow-val' style={{color:'var(--sage)'}}>${Number(profile?.withdrawable_total||0).toLocaleString()}</span></div>
                    <div className='pf-wrow'><span className='pf-wrow-lbl'>Total Profits</span><span className='pf-wrow-val' style={{color:'var(--sage)'}}>+${Number(profile?.profits_total||0).toLocaleString()}</span></div>
                    <div className='pf-wrow'><span className='pf-wrow-lbl'>Referral Commission</span><span className='pf-wrow-val' style={{color:'var(--gold)'}}>+${Number(profile?.referral_earned||0).toLocaleString()}</span></div>
                    {/* ── FIX: show computed avg ROI ── */}
                    <div className='pf-wrow'><span className='pf-wrow-lbl'>Average Season ROI</span><span className='pf-wrow-val' style={{color: computedAvgRoi !== null && computedAvgRoi >= 0 ? 'var(--sage)' : computedAvgRoi !== null ? '#b05252' : 'var(--txt2)'}}>{avgRoiDisplay}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}