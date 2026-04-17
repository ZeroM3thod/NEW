'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import UserSidebar from '@/components/UserSidebar'
import { createClient } from '@/utils/supabase/client'
import React from 'react'
import VaultXLoader from '@/components/VaultXLoader'

const ADDRESSES: Record<string, string> = {
  'TRC-20': 'TXkPqV9sZbUmWHvCaZLfwBgY3qNxR8eKdM',
  'ERC-20': '0x4aF3bC2e8f1D9Aa72cE63b5B87dF4e1C9Ab3D5E',
  'BEP-20': '0x7bC9dE3F4a2B1c8Ef5A6D7e923cFb47D1aE8c9B',
}

// Real QR code images
const QR_IMAGES: Record<string, string> = {
  'TRC-20': '/qr/trc20.jpg',
  'ERC-20': '/qr/erc20.jpg',
  'BEP-20': '/qr/bep20.jpg',
}

const NET_FEES: Record<string, { fee: number; time: string; feeLabel: string }> = {
  'TRC-20': { fee: 1, time: '1–3 minutes', feeLabel: '~1 USDT' },
  'ERC-20': { fee: 5, time: '2–5 minutes', feeLabel: '~5 USDT (gas varies)' },
  'BEP-20': { fee: 0.5, time: '1–2 minutes', feeLabel: '~0.5 USDT' },
}

interface DepHistory {
  id: string
  date: string
  amount: number
  network: string
  txnId: string
  status: 'approved' | 'pending' | 'rejected'
  fee: number
  receive: number
  reason?: string
}
interface DepState {
  amount: number
  network: string
  address: string
  fee: number
  receive: number
}

export default function DepositPage() {
  const router = useRouter()
  const supabase = createClient()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [hamburgerOpen, setHamburgerOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [toastShow, setToastShow] = useState(false)
  const [step, setStepState] = useState(1)
  const [depState, setDepState] = useState<DepState>({ amount: 0, network: '', address: '', fee: 0, receive: 0 })
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

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bgRef = useRef<HTMLCanvasElement>(null)

  const showToast = useCallback((msg: string) => {
    setToastMsg('✓  ' + msg)
    setToastShow(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastShow(false), 3200)
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

    const { data: depHistory } = await supabase.from('deposits').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false })
    if (depHistory) {
      const mapped: DepHistory[] = depHistory.map(d => ({
        id: d.id.slice(0, 8).toUpperCase(),
        date: new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        amount: d.amount,
        network: d.network,
        txnId: d.tx_hash,
        status: d.status,
        fee: NET_FEES[d.network]?.fee || 0,
        receive: d.amount - (NET_FEES[d.network]?.fee || 0),
        reason: d.rejection_reason
      }))
      setHistory(mapped)
    }
    setLoading(false)
  }, [router, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const cvs = bgRef.current; if (!cvs) return
    const cx = cvs.getContext('2d')!
    type C = { x:number;y:number;w:number;h:number;wick:number;up:boolean;spd:number;ph:number }
    type W = { pts:{x:number;y:number}[];spd:number;ph:number;amp:number;color:string;opa:string }
    let BW=0,BH=0,candles:C[]=[],waves:W[]=[],T=0,aid=0
    const build=()=>{
      const n=Math.max(6,Math.floor(BW/50))
      candles=Array.from({length:n},(_,i)=>({x:(i/n)*BW+14+Math.random()*18,y:BH*0.2+Math.random()*BH*0.58,w:8+Math.random()*8,h:14+Math.random()*70,wick:6+Math.random()*20,up:Math.random()>0.42,spd:0.16+Math.random()*0.36,ph:Math.random()*Math.PI*2}))
      const pts=Math.ceil(BW/36)+2
      waves=[0,1,2,3].map(i=>({pts:Array.from({length:pts},(_,j)=>({x:j*36,y:BH*(0.15+i*0.22)+Math.random()*45})),spd:0.11+i*0.04,ph:i*1.4,amp:14+i*8,color:i%2===0?'rgba(74,103,65,':'rgba(184,147,90,',opa:i%2===0?'0.7)':'0.55)'}))
    }
    const setup=()=>{BW=cvs.width=window.innerWidth;BH=cvs.height=window.innerHeight;build()}
    const draw=()=>{
      cx.clearRect(0,0,BW,BH);T+=0.011
      waves.forEach(w=>{cx.beginPath();w.pts.forEach((p,j)=>{const y=p.y+Math.sin(T*w.spd+j*0.3+w.ph)*w.amp;j===0?cx.moveTo(p.x,y):cx.lineTo(p.x,y)});cx.strokeStyle=w.color+w.opa;cx.lineWidth=1;cx.stroke()})
      candles.forEach(c=>{const bob=Math.sin(T*c.spd+c.ph)*7,x=c.x,y=c.y+bob;cx.strokeStyle='rgba(28,28,28,0.8)';cx.lineWidth=1;cx.beginPath();cx.moveTo(x+c.w/2,y-c.wick);cx.lineTo(x+c.w/2,y+c.h+c.wick);cx.stroke();cx.fillStyle=c.up?'rgba(74,103,65,0.88)':'rgba(184,147,90,0.82)';cx.fillRect(x,y,c.w,c.h);cx.strokeRect(x,y,c.w,c.h)})
      aid=requestAnimationFrame(draw)
    }
    window.addEventListener('resize',setup);setup();draw()
    return()=>{window.removeEventListener('resize',setup);cancelAnimationFrame(aid)}
  }, [])

  useEffect(() => {
    if (loading) return
    const obs=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('show');obs.unobserve(e.target)}}),{threshold:0.12})
    document.querySelectorAll<HTMLElement>('.dp-reveal').forEach(el=>obs.observe(el))
    return()=>obs.disconnect()
  }, [step, loading])

  useEffect(() => {
    document.body.style.overflow = sidebarOpen||modalOpen ? 'hidden' : ''
    return()=>{document.body.style.overflow=''}
  }, [sidebarOpen, modalOpen])

  useEffect(() => {
    const h=(e:KeyboardEvent)=>{if(e.key==='Escape'){setModalOpen(false);setSidebarOpen(false);setHamburgerOpen(false)}}
    document.addEventListener('keydown',h)
    return()=>document.removeEventListener('keydown',h)
  }, [])

  const setStep=(n:number)=>{setStepState(n);setTimeout(()=>window.scrollTo({top:0,behavior:'smooth'}),50)}

  const goToStep2=()=>{
    const amt=depState.amount
    if(!amt||amt<10){showToast('Please enter a valid amount (min $10)');return}
    setStep(2)
  }

  const goToStep3=()=>{
    if(!selectedNet){showToast('Please select a network');return}
    const info=NET_FEES[selectedNet]
    const addr=ADDRESSES[selectedNet]
    const receive=Math.max(0,depState.amount-info.fee)
    setDepState(s=>({...s,network:selectedNet,address:addr,fee:info.fee,receive}))
    setStep(3)
  }

  const goToStep4=()=>setStep(4)

  const confirmDeposit=async()=>{
    if(!txnId.trim()){showToast('Please enter your transaction ID');return}
    if(txnId.trim().length<10){showToast('Transaction ID seems too short');return}
    try {
      const{error}=await supabase.from('deposits').insert({user_id:user.id,amount:depState.amount,network:depState.network,tx_hash:txnId.trim(),status:'pending'})
      if(error)throw error
      showToast('Deposit submitted · Pending review')
      fetchData()
      setDepState({amount:0,network:'',address:'',fee:0,receive:0})
      setCustomAmt('');setTxnId('');setAmtDisplay('—');setSelectedChip(null);setSelectedNet('');setNetInfoVisible(false)
      setTimeout(()=>setStep(1),600)
    }catch(err:any){showToast(`⚠ Error: ${err.message||'Submission failed'}`)}
  }

  const copyAddress=()=>{
    const addr=depState.address||ADDRESSES['TRC-20']
    if(navigator.clipboard?.writeText) navigator.clipboard.writeText(addr).then(()=>showToast('Address copied')).catch(()=>showToast('Copied'))
    else showToast('Address copied')
  }

  const stepLabels=['Amount','Network','Payment','Confirm']
  const info=selectedNet?NET_FEES[selectedNet]:null

  return (
    <>
      {loading && <VaultXLoader pageName="Deposit" />}
      <canvas ref={bgRef} style={{position:'fixed',inset:0,zIndex:0,pointerEvents:'none',opacity:0.055,width:'100%',height:'100%'}}/>
      <div className={`dp-toast${toastShow?' show':''}`}>{toastMsg}</div>
      <UserSidebar open={sidebarOpen} onClose={()=>{setSidebarOpen(false);setHamburgerOpen(false)}}/>

      <div className='dp-layout'>
        {/* TOPBAR */}
        <div className='dp-topbar'>
          <button className={`dp-hamburger${hamburgerOpen?' is-open':''}`} onClick={()=>{setSidebarOpen(o=>!o);setHamburgerOpen(o=>!o)}}>
            <span/><span/><span/>
          </button>
          <div style={{position:'absolute',left:'50%',transform:'translateX(-50%)',display:'flex',alignItems:'center',gap:6}}>
            <div className='dp-logo-mark' style={{width:26,height:26}}/>
            <span className='dp-logo-text' style={{fontSize:'1.15rem'}}>Vault<span>X</span></span>
          </div>
          <div className='dp-avatar' style={{width:32,height:32,fontSize:'.8rem',cursor:'pointer'}} onClick={()=>router.push('/profile')}>
            {userProfile?`${userProfile.first_name?.[0]}${userProfile.last_name?.[0]}`:'...'}
          </div>
        </div>

        <main className='dp-main'>
          <div style={{maxWidth:760,margin:'0 auto'}}>

            {/* PAGE HEADER */}
            <div style={{marginBottom:28}} className='dp-reveal'>
              <span className='dp-label'>Transactions</span>
              <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'clamp(1.6rem,4vw,2.2rem)',fontWeight:400,color:'var(--ink)',lineHeight:1.15}}>
                Make a <em style={{fontStyle:'italic',color:'var(--gold)'}}>Deposit</em>
              </h1>
              {/* Mobile balance pill */}
              {userProfile && (
                <div className='dp-mob-balance'>
                  <svg width="12" height="12" fill="none" stroke="var(--gold)" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-4 0v2"/></svg>
                  Balance: <strong style={{color:'var(--gold)'}}>${Number(userProfile.balance||0).toLocaleString(undefined,{minimumFractionDigits:2})}</strong>
                </div>
              )}
            </div>

            {/* STEP INDICATOR */}
            <div className='dp-step-bar dp-reveal' style={{transitionDelay:'.04s'}}>
              {stepLabels.map((lbl,i)=>{
                const n=i+1,isDone=step>n,isActive=step===n
                return (
                  <React.Fragment key={n}>
                    <div className='dp-step-item' style={n===4?{flex:'0 0 auto'}:{}}>
                      <div className={`dp-step-dot${isDone?' done':isActive?' active':''}`}>{isDone?'✓':n}</div>
                      <div className={`dp-step-label${isDone?' done':isActive?' active':''}`}>{lbl}</div>
                    </div>
                    {n<4&&<div className={`dp-step-line${step>n?' done':''}`}/>}
                  </React.Fragment>
                )
              })}
            </div>

            {/* STEP 1 — AMOUNT */}
            <div className={`dp-card dp-section dp-reveal${step===1?' visible':''}`} style={{padding:'28px 24px',marginBottom:20,transitionDelay:'.08s'}}>
              <span className='dp-label'>Step 1 of 4</span>
              <div className='dp-section-title' style={{fontSize:'1.15rem',marginBottom:20}}>Select Deposit Amount</div>

              {/* Quick amount chips */}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:'.65rem',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--txt2)',marginBottom:10}}>Quick Select</div>
                <div className='dp-chips-grid'>
                  {[100,250,500,1000,2000,5000].map(v=>(
                    <button key={v} className={`dp-amt-chip${selectedChip===v?' selected':''}`}
                      onClick={()=>{setSelectedChip(v);setCustomAmt(String(v));setDepState(s=>({...s,amount:v}));setAmtDisplay('$'+v.toLocaleString())}}>
                      <span className='dp-chip-val'>${v.toLocaleString()}</span>
                      <span className='dp-chip-usdt'>USDT</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{marginBottom:6}}>
                <label className='dp-form-label'>Or enter custom amount</label>
                <div style={{position:'relative'}}>
                  <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--gold)',fontFamily:"'Cormorant Garamond',serif",fontSize:'1rem',fontWeight:500,pointerEvents:'none'}}>$</span>
                  <input className='dp-form-input' type='number' placeholder='0.00' min='10' style={{paddingLeft:28}}
                    value={customAmt} onChange={e=>{setCustomAmt(e.target.value);const v=parseFloat(e.target.value)||0;setDepState(s=>({...s,amount:v}));setAmtDisplay(v>0?'$'+v.toLocaleString():'—');setSelectedChip(null)}}/>
                  <span style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',fontSize:'.7rem',letterSpacing:'.08em',textTransform:'uppercase',color:'var(--txt3)',pointerEvents:'none'}}>USDT</span>
                </div>
                <div style={{fontSize:'.7rem',color:'var(--txt3)',marginTop:5}}>Minimum deposit: $10 USDT</div>
              </div>

              {/* Summary pill */}
              <div className='dp-summary-pill'>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:32,height:32,background:'rgba(38,162,107,0.15)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.7rem',fontWeight:700,color:'#26a26b',flexShrink:0}}>₮</div>
                  <div>
                    <div style={{fontSize:'.82rem',fontWeight:500,color:'var(--ink)'}}>Tether USD — USDT</div>
                    <div style={{fontSize:'.7rem',color:'var(--txt3)'}}>Stablecoin · 1 USDT ≈ $1.00</div>
                  </div>
                </div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.4rem',color:'var(--gold)',fontWeight:400}}>{amtDisplay}</div>
              </div>

              <button className='dp-btn dp-btn-dark' style={{width:'100%'}} onClick={goToStep2}>
                <span>Continue to Network →</span>
              </button>
            </div>

            {/* STEP 2 — NETWORK */}
            <div className={`dp-card dp-section dp-reveal${step===2?' visible':''}`} style={{padding:'28px 24px',marginBottom:20,transitionDelay:'.08s'}}>
              <div style={{marginBottom:4}}>
                <button onClick={()=>setStep(1)} className='dp-back-btn'>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
                  Back
                </button>
              </div>
              <span className='dp-label'>Step 2 of 4</span>
              <div className='dp-section-title' style={{fontSize:'1.15rem',marginBottom:20}}>Select Network</div>

              <div className='dp-network-grid'>
                {[
                  {net:'TRC-20',chain:'TRON',icon:'T',color:'#e84142',desc:'Fastest & cheapest'},
                  {net:'BEP-20',chain:'BNB Smart Chain',icon:'B',color:'#f0b90b',desc:'Low fees'},
                  {net:'ERC-20',chain:'Ethereum',icon:'E',color:'#627eea',desc:'Most secure'},
                ].map(({net,chain,icon,color,desc})=>(
                  <button key={net} className={`dp-net-card${selectedNet===net?' selected':''}`}
                    onClick={()=>{setSelectedNet(net);setNetInfoVisible(true)}}>
                    <div className='dp-net-icon' style={{background:`${color}18`,border:`1px solid ${color}33`}}>
                      <span style={{color,fontWeight:700,fontSize:'.8rem',fontFamily:'monospace'}}>{icon}</span>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:500,fontSize:'.84rem',color:'var(--ink)'}}>{net}</div>
                      <div style={{fontSize:'.65rem',color:'var(--txt3)'}}>{chain}</div>
                    </div>
                    <div className='dp-net-badge'>{desc}</div>
                    {selectedNet===net&&<div className='dp-net-check'>✓</div>}
                  </button>
                ))}
              </div>

              {netInfoVisible&&info&&(
                <div className='dp-net-info-box'>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
                    {[['Network',selectedNet],['Est. Fee',info.feeLabel],['Confirmation',info.time]].map(([k,v])=>(
                      <div key={k} style={{textAlign:'center',flex:1}}>
                        <div style={{fontSize:'.6rem',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--txt3)',marginBottom:3}}>{k}</div>
                        <div style={{fontSize:'.82rem',fontWeight:500,color:'var(--ink)'}}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button className='dp-btn dp-btn-dark' style={{width:'100%'}} onClick={goToStep3}>
                <span>Continue to Payment →</span>
              </button>
            </div>

            {/* STEP 3 — PAYMENT */}
            <div className={`dp-card dp-section dp-reveal${step===3?' visible':''}`} style={{padding:'28px 24px',marginBottom:20,transitionDelay:'.08s'}}>
              <div style={{marginBottom:4}}>
                <button onClick={()=>setStep(2)} className='dp-back-btn'>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
                  Back
                </button>
              </div>
              <span className='dp-label'>Step 3 of 4</span>
              <div className='dp-section-title' style={{fontSize:'1.15rem',marginBottom:20}}>Send Payment</div>

              {/* QR + Address layout */}
              <div className='dp-payment-layout'>
                {/* Real QR code image */}
                <div className='dp-qr-container'>
                  <div style={{fontSize:'.6rem',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--txt3)',marginBottom:8,textAlign:'center'}}>
                    Scan QR Code
                  </div>
                  <div className='dp-qr-frame'>
                    {depState.network&&QR_IMAGES[depState.network]?(
                      <img
                        src={QR_IMAGES[depState.network||selectedNet]}
                        alt={`${depState.network||selectedNet} QR Code`}
                        style={{width:'100%',height:'100%',objectFit:'contain',borderRadius:4,display:'block'}}
                      />
                    ):(
                      <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--txt3)',fontSize:'.7rem'}}>
                        Loading…
                      </div>
                    )}
                    <div className='dp-qr-corner dp-qr-tl'/>
                    <div className='dp-qr-corner dp-qr-tr'/>
                    <div className='dp-qr-corner dp-qr-bl'/>
                    <div className='dp-qr-corner dp-qr-br'/>
                  </div>
                  <div style={{fontSize:'.62rem',color:'var(--txt3)',textAlign:'center',marginTop:8,letterSpacing:'.04em'}}>
                    {depState.network||selectedNet} Network
                  </div>
                </div>

                {/* Address & info */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{marginBottom:14}}>
                    <label className='dp-form-label'>Deposit Address ({depState.network||selectedNet})</label>
                    <div className='dp-addr-box-new'>
                      <div className='dp-addr-text'>{depState.address||ADDRESSES['TRC-20']}</div>
                      <button className='dp-copy-btn-sm' onClick={copyAddress}>
                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                        Copy
                      </button>
                    </div>
                  </div>

                  {/* Summary table */}
                  <div className='dp-pay-summary'>
                    {[
                      ['You Send', `${depState.amount} USDT`],
                      ['Network Fee', NET_FEES[depState.network||selectedNet]?.feeLabel||'—'],
                      ['You Receive', `${depState.receive.toFixed(2)} USDT`],
                      ['Est. Time', NET_FEES[depState.network||selectedNet]?.time||'—'],
                    ].map(([k,v],i)=>(
                      <div key={k} className='dp-pay-row' style={i===2?{borderBottom:'none'}:{}}>
                        <span className='dp-detail-key'>{k}</span>
                        <span className='dp-detail-val' style={i===2?{color:'var(--sage)',fontWeight:600}:i===1?{color:'var(--gold)'}:{}}>{v}</span>
                      </div>
                    ))}
                  </div>

                  <div className='dp-warn-pill'>
                    ⚠ Only send USDT via {depState.network||selectedNet}. Wrong assets cannot be recovered.
                  </div>
                </div>
              </div>

              <button className='dp-btn dp-btn-dark' style={{width:'100%',marginTop:20}} onClick={goToStep4}>
                <span>I've Sent the Payment →</span>
              </button>
            </div>

            {/* STEP 4 — CONFIRM */}
            <div className={`dp-card dp-section dp-reveal${step===4?' visible':''}`} style={{padding:'28px 24px',marginBottom:20,transitionDelay:'.08s'}}>
              <div style={{marginBottom:4}}>
                <button onClick={()=>setStep(3)} className='dp-back-btn'>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
                  Back
                </button>
              </div>
              <span className='dp-label'>Step 4 of 4</span>
              <div className='dp-section-title' style={{fontSize:'1.15rem',marginBottom:8}}>Confirm Payment</div>
              <div style={{fontSize:'.82rem',color:'var(--txt2)',marginBottom:22}}>Enter your blockchain transaction ID to complete the deposit request.</div>

              <div style={{marginBottom:20}}>
                <label className='dp-form-label'>Transaction ID / Hash</label>
                <div style={{position:'relative'}}>
                  <input className='dp-form-input' type='text' placeholder='0xabcd1234...ef56 or TXN hash'
                    value={txnId} onChange={e=>setTxnId(e.target.value)}/>
                </div>
                <div style={{fontSize:'.7rem',color:'var(--txt3)',marginTop:6}}>Copy the transaction hash from your wallet after sending.</div>
              </div>

              <div className='dp-pay-summary' style={{marginBottom:20}}>
                {[
                  ['Amount',`${depState.amount} USDT`],
                  ['Network',depState.network],
                  ['To Receive',`${depState.receive.toFixed(2)} USDT`],
                ].map(([k,v],i)=>(
                  <div key={k} className='dp-pay-row' style={i===2?{borderBottom:'none'}:{}}>
                    <span className='dp-detail-key'>{k}</span>
                    <span className='dp-detail-val' style={i===2?{color:'var(--sage)'}:{}}>{v}</span>
                  </div>
                ))}
              </div>

              <button className='dp-btn dp-btn-dark' style={{width:'100%'}} onClick={confirmDeposit}>
                <span>✓ Confirm Deposit</span>
              </button>
            </div>

            {/* DEPOSIT HISTORY */}
            <div className='dp-reveal' style={{marginTop:36,transitionDelay:'.14s'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                <div>
                  <span className='dp-label'>Records</span>
                  <div className='dp-section-title' style={{fontSize:'1.15rem'}}>Deposit History</div>
                </div>
                {history.length>0&&<span style={{fontSize:'.7rem',color:'var(--txt3)'}}>{history.length} records</span>}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {history.length===0?(
                  <div style={{textAlign:'center',padding:32,color:'var(--txt3)',fontSize:'.82rem',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10}}>
                    <div style={{fontSize:'1.8rem',marginBottom:8,opacity:.4}}>📥</div>
                    No deposit records yet.
                  </div>
                ):history.map((d,i)=>(
                  <div key={i} className='dp-hist-row'>
                    <div style={{display:'flex',alignItems:'center',gap:12,flex:1,minWidth:0}}>
                      <div className='dp-hist-icon'>
                        <svg width="14" height="14" fill="none" stroke="var(--gold)" strokeWidth="1.8" viewBox="0 0 24 24">
                          <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                        </svg>
                      </div>
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:'.82rem',fontWeight:500,color:'var(--ink)',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                          {d.id} <span className={`dp-tag dp-tag-${d.status}`}>{d.status}</span>
                        </div>
                        <div style={{fontSize:'.7rem',color:'var(--txt3)',marginTop:2}}>{d.date} · {d.network}</div>
                      </div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.1rem',color:'var(--ink)',fontWeight:500}}>+${d.amount.toLocaleString()}</div>
                      <button onClick={()=>{setModalEntry(d);setModalOpen(true)}} style={{fontSize:'.68rem',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--gold)',background:'none',border:'none',cursor:'pointer',marginTop:2}}>View →</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* MODAL */}
      <div className={`dp-modal-overlay${modalOpen?' open':''}`} onClick={e=>{if(e.target===e.currentTarget)setModalOpen(false)}}>
        <div className='dp-modal-sheet'>
          <div className='dp-modal-handle'/>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <div>
              <span className='dp-label'>Transaction</span>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.3rem',fontWeight:400}}>Deposit Details</div>
            </div>
            <button onClick={()=>setModalOpen(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--txt3)',fontSize:'1.4rem',lineHeight:1}}>×</button>
          </div>
          {modalEntry&&(
            <>
              <div style={{padding:'14px 16px',background:'var(--parchment)',border:'1px solid var(--border)',borderRadius:'var(--r)',marginBottom:16}}>
                {[
                  ['Transaction ID',modalEntry.id],
                  ['Status',null],
                  ['Date',modalEntry.date],
                  ['Amount Sent',`${modalEntry.amount} USDT`],
                  ['Fee',`${modalEntry.fee} USDT`],
                  ['Received',`${modalEntry.receive.toFixed(2)} USDT`],
                  ['Network',modalEntry.network],
                  ['TXN Hash',modalEntry.txnId],
                ].map(([k,v])=>(
                  <div key={k as string} className='dp-detail-row'>
                    <span className='dp-detail-key'>{k}</span>
                    <span className='dp-detail-val'>
                      {k==='Status'?<span className={`dp-tag dp-tag-${modalEntry.status}`}>{modalEntry.status}</span>:v}
                    </span>
                  </div>
                ))}
              </div>
              {modalEntry.status==='rejected'&&modalEntry.reason&&(
                <div style={{padding:'14px 16px',background:'rgba(180,50,50,0.05)',border:'1px solid rgba(180,50,50,0.2)',borderRadius:'var(--r)'}}>
                  <div style={{fontSize:'.7rem',letterSpacing:'.1em',textTransform:'uppercase',color:'#b43232',marginBottom:6}}>Rejection Reason</div>
                  <div style={{fontSize:'.82rem',color:'var(--ink)',lineHeight:1.6}}>{modalEntry.reason}</div>
                </div>
              )}
            </>
          )}
          <button className='dp-btn dp-btn-outline' style={{width:'100%',marginTop:20}} onClick={()=>setModalOpen(false)}>Close</button>
        </div>
      </div>
    </>
  )
}