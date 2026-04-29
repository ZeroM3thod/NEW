'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/utils/supabase/client';

type ToastType = 'ok' | 'err' | '';

function SetPasswordContent() {
  const router       = useRouter();
  const supabase     = createClient();
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const animRef      = useRef<number>(0);
  const toastTimer   = useRef<ReturnType<typeof setTimeout>|null>(null);

  const [toast, setToast]         = useState({msg:'',type:'' as ToastType,show:false});
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [invalidLink, setInvalidLink] = useState(false);

  const [pw, setPw]         = useState('');
  const [pwCls, setPwCls]   = useState('');
  const [pwMsg, setPwMsg]   = useState('');
  const [pwShow, setPwShow] = useState(false);
  const [strength, setStrength] = useState(0);

  const [cpw, setCpw]       = useState('');
  const [cpwCls, setCpwCls] = useState('');
  const [cpwMsg, setCpwMsg] = useState('');
  const [cpwMsgType, setCpwMsgType] = useState<'ok'|'err'>('ok');
  const [cpwShow, setCpwShow] = useState(false);

  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);

  const [reqLen,   setReqLen]   = useState(false);
  const [reqUpper, setReqUpper] = useState(false);
  const [reqNum,   setReqNum]   = useState(false);
  const [reqSym,   setReqSym]   = useState(false);

  useEffect(() => {
    let settled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        settled = true;
        setSessionReady(true);
        setCheckingSession(false);
      }
    });

    // Also catch an already-active session (e.g. desktop where cookie was set)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        settled = true;
        setSessionReady(true);
        setCheckingSession(false);
      } else {
        setTimeout(() => {
          if (!settled) setCheckingSession(false);
        }, 3000);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Once checking is done with no session, mark as invalid
  useEffect(() => {
    if (!checkingSession && !sessionReady) {
      setInvalidLink(true);
    }
  }, [checkingSession, sessionReady]);

  /* BG Canvas */
  useEffect(()=>{
    const cvs=canvasRef.current;if(!cvs)return;
    const cx=cvs.getContext('2d')!;
    type Candle={x:number;y:number;w:number;h:number;wick:number;up:boolean;spd:number;ph:number};
    type Wave={pts:{x:number;y:number}[];spd:number;ph:number;amp:number;col:string;opa:string};
    let W=0,H=0,candles:Candle[]=[],waves:Wave[]=[],T=0;
    const setup=()=>{
      W=cvs.width=window.innerWidth;H=cvs.height=window.innerHeight;
      const n=Math.max(6,Math.floor(W/50));
      candles=Array.from({length:n},(_,i)=>({x:(i/n)*W+10+Math.random()*18,y:H*.15+Math.random()*H*.68,w:8+Math.random()*9,h:14+Math.random()*72,wick:6+Math.random()*22,up:Math.random()>.42,spd:.15+Math.random()*.35,ph:Math.random()*Math.PI*2}));
      const pts=Math.ceil(W/36)+2;
      waves=[0,1,2,3].map(i=>({pts:Array.from({length:pts},(_,j)=>({x:j*36,y:H*(.12+i*.22)+Math.random()*44})),spd:.1+i*.04,ph:i*1.4,amp:13+i*8,col:i%2===0?'rgba(74,103,65,':'rgba(184,147,90,',opa:i%2===0?'.72)':'.56)'}));
    };
    const draw=()=>{
      cx.clearRect(0,0,W,H);T+=.011;
      waves.forEach(w=>{cx.beginPath();w.pts.forEach((p,j)=>{const y=p.y+Math.sin(T*w.spd+j*.3+w.ph)*w.amp;j===0?cx.moveTo(p.x,y):cx.lineTo(p.x,y)});cx.strokeStyle=w.col+w.opa;cx.lineWidth=1;cx.stroke()});
      candles.forEach(c=>{const b=Math.sin(T*c.spd+c.ph)*7,x=c.x,y=c.y+b;cx.strokeStyle='rgba(28,28,28,.8)';cx.lineWidth=1;cx.beginPath();cx.moveTo(x+c.w/2,y-c.wick);cx.lineTo(x+c.w/2,y+c.h+c.wick);cx.stroke();cx.fillStyle=c.up?'rgba(74,103,65,.88)':'rgba(184,147,90,.82)';cx.fillRect(x,y,c.w,c.h);cx.strokeRect(x,y,c.w,c.h)});
      animRef.current=requestAnimationFrame(draw);
    };
    window.addEventListener('resize',setup);setup();draw();
    return()=>{window.removeEventListener('resize',setup);cancelAnimationFrame(animRef.current)};
  },[]);

  const showToast=useCallback((msg:string,type:ToastType='')=>{
    setToast({msg,type,show:true});
    if(toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current=setTimeout(()=>setToast(t=>({...t,show:false})),3500);
  },[]);

  const getScore=(p:string)=>{let s=0;if(p.length>=8)s++;if(/[A-Z]/.test(p))s++;if(/[0-9]/.test(p))s++;if(/[^A-Za-z0-9]/.test(p))s++;return s;};
  const strengthColor=(s:number)=>s<=1?'#b05252':s<=2?'#b8935a':'#4a6741';
  const strengthLabel=(s:number)=>['','Weak','Fair','Good','Strong'][s]||'';

  const handlePwChange=(val:string)=>{
    setPw(val);
    const sc=getScore(val);
    setStrength(sc);
    setReqLen(val.length>=8);
    setReqUpper(/[A-Z]/.test(val));
    setReqNum(/[0-9]/.test(val));
    setReqSym(/[^A-Za-z0-9]/.test(val));
    if(cpw) handleCpwChange(cpw,val);
  };

  const handleCpwChange=(val:string,currentPw?:string)=>{
    setCpw(val);
    const p=currentPw??pw;
    if(!val){setCpwMsg('');return;}
    if(p===val){setCpwCls('fi-good');setCpwMsg('✓ Passwords match.');setCpwMsgType('ok');}
    else{setCpwCls('fi-err');setCpwMsg('✕ Passwords do not match.');setCpwMsgType('err');}
  };

  const handleSubmit=async(e:React.FormEvent)=>{
    e.preventDefault();
    setPwCls('');setPwMsg('');setCpwCls('');setCpwMsg('');
    let valid=true;
    if(!pw||pw.length<8){setPwCls('fi-err');setPwMsg('⚠ Password must be at least 8 characters.');valid=false;}
    else if(!/[A-Z]/.test(pw)){setPwCls('fi-err');setPwMsg('⚠ Include at least one uppercase letter.');valid=false;}
    else if(!/[0-9]/.test(pw)){setPwCls('fi-err');setPwMsg('⚠ Include at least one number.');valid=false;}
    else{setPwCls('fi-good');}
    if(!cpw){setCpwCls('fi-err');setCpwMsg('⚠ Please confirm your new password.');setCpwMsgType('err');valid=false;}
    else if(pw!==cpw){setCpwCls('fi-err');setCpwMsg('✕ Passwords do not match.');setCpwMsgType('err');valid=false;}
    if(!valid){showToast('⚠ Please fix the errors above.','err');return;}

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password: pw });

    setLoading(false);

    if (error) {
      showToast('✕ ' + error.message, 'err');
      setPwCls('fi-err');
    } else {
      setSuccess(true);
      showToast('✓ Password updated successfully!','ok');
      await supabase.auth.signOut({ scope: 'others' });
    }
  };

  const EyeOpen=()=>(
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
  const EyeClosed=()=>(
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );

  // Show loading while checking session
  if (checkingSession) {
    return (
      <>
        <canvas ref={canvasRef} style={{position:'fixed',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0,opacity:.055}}/>
        <div className="page-shell">
          <div className="auth-card" style={{textAlign:'center',animation:'fadeView .35s ease both'}}>
            <div className="card-logo">
              <div className="logo-icon"/>
              <div className="logo-name">Valut<span style={{color:'var(--gold)'}}>X</span></div>
            </div>
            <div style={{padding:'20px 0',color:'var(--text-sec)',fontSize:'.85rem'}}>
              Verifying reset link…
            </div>
          </div>
        </div>
        <style>{`@keyframes fadeView { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }`}</style>
      </>
    );
  }

  // Show error if link is invalid/expired
  if (invalidLink) {
    return (
      <>
        <canvas ref={canvasRef} style={{position:'fixed',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0,opacity:.055}}/>
        <div className={`toast${toast.show?' show':''}${toast.type?' '+toast.type:''}`}>{toast.msg}</div>
        <a className="back-btn" href="/auth/signin">
          <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Login
        </a>
        <div className="page-shell">
          <div className="auth-card" style={{animation:'fadeView .35s ease both'}}>
            <div className="card-logo">
              <div className="logo-icon"/>
              <div className="logo-name">Valut<span style={{color:'var(--gold)'}}>X</span></div>
            </div>
            <div className="success-state">
              <div className="success-icon" style={{background:'rgba(155,58,58,.1)',border:'1px solid rgba(155,58,58,.25)'}}>⚠️</div>
              <div className="success-title">Link Expired or Invalid</div>
              <p className="success-body">
                This password reset link has expired or is invalid. Please request a new one.
              </p>
              <button className="btn-primary" style={{marginTop:4}} onClick={()=>router.push('/auth/signin')}>
                <span>Request New Link →</span>
              </button>
            </div>
          </div>
        </div>
        <div className="page-caption">© 2024 ValutX · All rights reserved</div>
        <style>{`@keyframes fadeView { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }`}</style>
      </>
    );
  }

  return (
    <>
      <canvas ref={canvasRef} style={{position:'fixed',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0,opacity:.055}}/>
      <div className={`toast${toast.show?' show':''}${toast.type?' '+toast.type:''}`}>{toast.msg}</div>

      <a className="back-btn" href="/auth/signin">
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Login
      </a>

      <div className="page-shell">
        <div className="auth-card" style={{animation:'fadeView .35s ease both'}}>
          <div className="card-logo">
            <div className="logo-icon"/>
            <div className="logo-name">Valut<span style={{color:'var(--gold)'}}>X</span></div>
          </div>

          {!success?(
            <>
              <h1 className="card-heading">Set new password</h1>
              <p className="card-sub">Choose a strong, unique password for your account.</p>

              <form className="form-stack" onSubmit={handleSubmit} noValidate>
                {/* New Password */}
                <div className="fg">
                  <label className="fl">New Password</label>
                  <div className="pw-wrap">
                    <input id="np-pw" className={`fi${pwCls?' '+pwCls:''}`} type={pwShow?'text':'password'}
                      placeholder="Create a strong password" autoComplete="new-password"
                      value={pw} onChange={e=>handlePwChange(e.target.value)}/>
                    <button type="button" className="pw-eye" onClick={()=>setPwShow(v=>!v)}>
                      {pwShow?<EyeClosed/>:<EyeOpen/>}
                    </button>
                  </div>
                  <div className="strength-bar">
                    {[1,2,3,4].map(i=>(
                      <div key={i} className="strength-seg"
                        style={{background:pw&&i<=strength?strengthColor(strength):'var(--parchment)'}}/>
                    ))}
                  </div>
                  {pw&&<div className={`msg ${strength<=1?'msg-err':strength<=2?'msg-info':'msg-ok'}`}>{strengthLabel(strength)}</div>}
                  {pwMsg&&<div className="msg msg-err">{pwMsg}</div>}
                </div>

                {/* Requirements */}
                {pw&&(
                  <div className="req-list">
                    {[
                      [reqLen,   'At least 8 characters'],
                      [reqUpper, 'One uppercase letter (A–Z)'],
                      [reqNum,   'One number (0–9)'],
                      [reqSym,   'One symbol (!@#$…)'],
                    ].map(([met,label])=>(
                      <div key={label as string} className="req-item">
                        <div className={`req-dot${met?' met':''}`}/>
                        <span style={{color:met?'var(--sage)':'var(--text-sec)'}}>{label as string}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Confirm Password */}
                <div className="fg">
                  <label className="fl">Confirm New Password</label>
                  <div className="pw-wrap">
                    <input id="np-cpw" className={`fi${cpwCls?' '+cpwCls:''}`} type={cpwShow?'text':'password'}
                      placeholder="Repeat your new password" autoComplete="new-password"
                      value={cpw} onChange={e=>handleCpwChange(e.target.value)}/>
                    <button type="button" className="pw-eye" onClick={()=>setCpwShow(v=>!v)}>
                      {cpwShow?<EyeClosed/>:<EyeOpen/>}
                    </button>
                  </div>
                  {cpwMsg&&<div className={`msg ${cpwMsgType==='ok'?'msg-ok':'msg-err'}`}>{cpwMsg}</div>}
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  <span>{loading?'Updating…':'Set New Password →'}</span>
                </button>
              </form>
            </>
          ):(
            <div className="success-state">
              <div className="success-icon">🔐</div>
              <div className="success-title">Password updated</div>
              <p className="success-body">
                Your password has been changed successfully.<br/>
                You can now sign in with your new credentials.
              </p>
              <div style={{background:'rgba(74,103,65,.06)',border:'1px solid rgba(74,103,65,.18)',borderRadius:8,padding:'13px 16px',width:'100%',textAlign:'center'}}>
                <div style={{fontSize:'.71rem',color:'var(--sage)',fontWeight:300,lineHeight:1.7}}>
                  ✓ All other active sessions have been logged out for your security.
                </div>
              </div>
              <button className="btn-primary" style={{marginTop:4}} onClick={()=>router.push('/auth/signin')}>
                <span>Go to Sign In →</span>
              </button>
            </div>
          )}

          {!success&&(
            <div className="switch-row" style={{marginTop:18}}>
              <button className="switch-link" onClick={()=>router.push('/auth/signin')} style={{display:'inline-flex',alignItems:'center',gap:5}}>
                ← Back to Login
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="page-caption">© 2024 ValutX · All rights reserved</div>

      <style>{`
        @keyframes fadeView { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
      `}</style>
    </>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <SetPasswordContent/>
    </Suspense>
  );
}