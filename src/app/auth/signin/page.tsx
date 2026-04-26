'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

type ToastType = 'ok' | 'err' | '';

export default function SignInPage() {
  const router = useRouter();
  const supabase = createClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [view, setView]       = useState<'login' | 'forgot'>('login');
  const [toast, setToast]     = useState({ msg: '', type: '' as ToastType, show: false });

  /* login fields */
  const [lEmail, setLEmail]   = useState('');
  const [lEmailCls, setLEmailCls] = useState('');
  const [lEmailMsg, setLEmailMsg] = useState('');
  const [lPw, setLPw]         = useState('');
  const [lPwCls, setLPwCls]   = useState('');
  const [lPwMsg, setLPwMsg]   = useState('');
  const [lPwShow, setLPwShow] = useState(false);
  const [lRemember, setLRemember] = useState(false);
  const [lLoading, setLLoading]   = useState(false);

  /* forgot fields */
  const [fEmail, setFEmail]     = useState('');
  const [fEmailCls, setFEmailCls] = useState('');
  const [fEmailMsg, setFEmailMsg] = useState('');
  const [fLoading, setFLoading]   = useState(false);
  const [fSuccess, setFSuccess]   = useState(false);
  const [fSentTo, setFSentTo]     = useState('');
  const [countdown, setCountdown] = useState('15:00');
  const cdTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  /* BG Canvas */
  useEffect(() => {
    const cvs = canvasRef.current; if (!cvs) return;
    const cx = cvs.getContext('2d')!;
    type Candle = { x:number;y:number;w:number;h:number;wick:number;up:boolean;spd:number;ph:number };
    type Wave   = { pts:{x:number;y:number}[];spd:number;ph:number;amp:number;col:string;opa:string };
    let W=0,H=0,candles:Candle[]=[],waves:Wave[]=[],T=0;
    const setup = () => {
      W = cvs.width = window.innerWidth; H = cvs.height = window.innerHeight;
      const n = Math.max(6, Math.floor(W/50));
      candles = Array.from({length:n},(_,i)=>({x:(i/n)*W+10+Math.random()*18,y:H*.15+Math.random()*H*.68,w:8+Math.random()*9,h:14+Math.random()*72,wick:6+Math.random()*22,up:Math.random()>.42,spd:.15+Math.random()*.35,ph:Math.random()*Math.PI*2}));
      const pts = Math.ceil(W/36)+2;
      waves = [0,1,2,3].map(i=>({pts:Array.from({length:pts},(_,j)=>({x:j*36,y:H*(.12+i*.22)+Math.random()*44})),spd:.1+i*.04,ph:i*1.4,amp:13+i*8,col:i%2===0?'rgba(74,103,65,':'rgba(184,147,90,',opa:i%2===0?'.72)':'.56)'}));
    };
    const draw = () => {
      cx.clearRect(0,0,W,H); T+=.011;
      waves.forEach(w=>{cx.beginPath();w.pts.forEach((p,j)=>{const y=p.y+Math.sin(T*w.spd+j*.3+w.ph)*w.amp;j===0?cx.moveTo(p.x,y):cx.lineTo(p.x,y)});cx.strokeStyle=w.col+w.opa;cx.lineWidth=1;cx.stroke()});
      candles.forEach(c=>{const b=Math.sin(T*c.spd+c.ph)*7,x=c.x,y=c.y+b;cx.strokeStyle='rgba(28,28,28,.8)';cx.lineWidth=1;cx.beginPath();cx.moveTo(x+c.w/2,y-c.wick);cx.lineTo(x+c.w/2,y+c.h+c.wick);cx.stroke();cx.fillStyle=c.up?'rgba(74,103,65,.88)':'rgba(184,147,90,.82)';cx.fillRect(x,y,c.w,c.h);cx.strokeRect(x,y,c.w,c.h)});
      animRef.current = requestAnimationFrame(draw);
    };
    window.addEventListener('resize', setup); setup(); draw();
    return () => { window.removeEventListener('resize',setup); cancelAnimationFrame(animRef.current); };
  }, []);

  const showToast = useCallback((msg:string, type:ToastType='') => {
    setToast({msg,type,show:true});
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(()=>setToast(t=>({...t,show:false})),3500);
  },[]);

  const switchTo = (v: 'login'|'forgot') => {
    setView(v); window.scrollTo({top:0,behavior:'smooth'});
    setLEmailCls(''); setLEmailMsg(''); setLPwCls(''); setLPwMsg('');
    setFEmailCls(''); setFEmailMsg('');
  };

  const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_RX = /^[0-9]{10,11}$/;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLEmailCls(''); setLEmailMsg(''); setLPwCls(''); setLPwMsg('');
    let valid = true;
    const email = lEmail.trim(), pw = lPw;
    if (!email) { setLEmailMsg('⚠ Email or phone is required.'); setLEmailCls('fi-err'); valid=false; }
    else if (!EMAIL_RX.test(email) && !PHONE_RX.test(email.replace('+880',''))) { setLEmailMsg('⚠ Enter a valid email.'); setLEmailCls('fi-err'); valid=false; }
    else { setLEmailCls('fi-good'); }
    if (!pw) { setLPwMsg('⚠ Password is required.'); setLPwCls('fi-err'); valid=false; }
    else if (pw.length<6) { setLPwMsg('⚠ Password must be at least 6 characters.'); setLPwCls('fi-err'); valid=false; }
    else { setLPwCls('fi-good'); }
    if (!valid) return;
    setLLoading(true);

    const { error, data: { user } } = await supabase.auth.signInWithPassword({
      email,
      password: pw,
    });

    setLLoading(false);
    if (error) {
      showToast('✕ ' + error.message, 'err');
      setLEmailCls('fi-err');
      setLPwCls('fi-err');
    } else if (user) {
      showToast('✓ Welcome back!', 'ok');
      
      try {
        // Check user role and redirect accordingly
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        
        if (profileError) {
          console.error('Profile fetch error:', profileError);
          showToast('Error loading profile. Redirecting...', 'err');
          setTimeout(() => router.push('/dashboard'), 1600);
          return;
        }
        
        const redirectPath = profile?.role === 'admin' ? '/admin/dashboard' : '/dashboard';
        console.log('Redirecting to:', redirectPath, 'Role:', profile?.role);
        setTimeout(() => router.push(redirectPath), 1600);
      } catch (err) {
        console.error('Redirect error:', err);
        showToast('Error during redirect. Please try again.', 'err');
      }
    }
  };

  const startCountdown = (seconds: number) => {
    if (cdTimer.current) clearInterval(cdTimer.current);
    let s = seconds;
    cdTimer.current = setInterval(()=>{
      s--;
      if (s<=0){clearInterval(cdTimer.current!);setCountdown('Expired');return;}
      const m=Math.floor(s/60),r=s%60;
      setCountdown(`${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`);
    },1000);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setFEmailCls(''); setFEmailMsg('');
    const email = fEmail.trim();
    if (!email){setFEmailMsg('⚠ Email is required.');setFEmailCls('fi-err');return;}
    if (!EMAIL_RX.test(email)){setFEmailMsg('⚠ Enter a valid email address.');setFEmailCls('fi-err');return;}
    setFEmailCls('fi-good');
    setFLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });

    setFLoading(false);
    if (error) {
      showToast('✕ ' + error.message, 'err');
      setFEmailCls('fi-err');
    } else {
      setFSentTo(email);
      setFSuccess(true);
      showToast('✓ Reset link sent to ' + email, 'ok');
      startCountdown(15 * 60);
    }
  };


  useEffect(()=>()=>{if(cdTimer.current)clearInterval(cdTimer.current)},[]);

  const EyeOpen = () => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
  const EyeClosed = () => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );

  return (
    <>
      <canvas ref={canvasRef} style={{position:'fixed',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0,opacity:.055}}/>

      <div className={`toast${toast.show?' show':''}${toast.type?' '+toast.type:''}`}>{toast.msg}</div>

      <a className="back-btn" href="/" onClick={e=>{if(view==='forgot'){e.preventDefault();switchTo('login')}else{router.push('/')}}}>
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
        {view==='forgot'?'Back to Login':'Back'}
      </a>

      <div className="page-shell">

        {/* ── LOGIN VIEW ── */}
        {view==='login'&&(
          <div className="auth-card" style={{animation:'fadeView .35s ease both'}}>
            <div className="card-logo">
              <div className="logo-icon"/>
              <div className="logo-name">Valut<span>X</span></div>
            </div>
            <h1 className="card-heading">Welcome back</h1>
            <p className="card-sub">Sign in to your investment account</p>

            <form className="form-stack" onSubmit={handleLogin} noValidate>
              <div className="fg">
                <label className="fl">Email</label>
                <input className={`fi${lEmailCls?' '+lEmailCls:''}`} type="text"
                  placeholder="email@example.com" autoComplete="username"
                  value={lEmail} onChange={e=>setLEmail(e.target.value)}/>
                {lEmailMsg&&<div className="msg msg-err">{lEmailMsg}</div>}
              </div>
              <div className="fg">
                <label className="fl">Password</label>
                <div className="pw-wrap">
                  <input className={`fi${lPwCls?' '+lPwCls:''}`} type={lPwShow?'text':'password'}
                    placeholder="Your password" autoComplete="current-password"
                    value={lPw} onChange={e=>setLPw(e.target.value)}/>
                  <button type="button" className="pw-eye" onClick={()=>setLPwShow(v=>!v)}>
                    {lPwShow?<EyeClosed/>:<EyeOpen/>}
                  </button>
                </div>
                {lPwMsg&&<div className="msg msg-err">{lPwMsg}</div>}
              </div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
                <label className="check-row">
                  <input type="checkbox" checked={lRemember} onChange={e=>setLRemember(e.target.checked)}/>
                  <span className="check-label">Remember me</span>
                </label>
                <button type="button" className="switch-link" onClick={()=>switchTo('forgot')}>Forgot Password?</button>
              </div>
              <button type="submit" className="btn-primary" disabled={lLoading}>
                <span>{lLoading?'Signing in…':'Sign In'}</span>
              </button>
            </form>

            <div className="divider-text" style={{marginTop:18}}>or</div>
            <div className="switch-row" style={{marginTop:8}}>
              Don&apos;t have an account?&nbsp;
              <button className="switch-link" onClick={()=>router.push('/auth/signup')}>Create one →</button>
            </div>
          </div>
        )}

        {/* ── FORGOT VIEW ── */}
        {view==='forgot'&&(
          <div className="auth-card" style={{animation:'fadeView .35s ease both'}}>
            <div className="card-logo">
              <div className="logo-icon"/>
              <div className="logo-name">Valut<span>X</span></div>
            </div>
            {!fSuccess?(
              <>
                <h1 className="card-heading">Reset password</h1>
                <p className="card-sub">Enter your email and we&apos;ll send a secure reset link to your inbox.</p>
                <form className="form-stack" onSubmit={handleForgot} noValidate>
                  <div className="fg">
                    <label className="fl">Email Address</label>
                    <input className={`fi${fEmailCls?' '+fEmailCls:''}`} type="email"
                      placeholder="you@example.com" autoComplete="email"
                      value={fEmail} onChange={e=>setFEmail(e.target.value)}/>
                    {fEmailMsg&&<div className="msg msg-err">{fEmailMsg}</div>}
                  </div>
                  <div style={{background:'rgba(184,147,90,.05)',border:'1px solid var(--border)',borderRadius:6,padding:'11px 13px'}}>
                    <div style={{fontSize:'.71rem',color:'var(--text-sec)',lineHeight:1.75,fontWeight:300}}>
                      🔒 The reset link is valid for <strong style={{color:'var(--ink)'}}>15 minutes</strong> and can only be used once.
                    </div>
                  </div>
                  <button type="submit" className="btn-primary" disabled={fLoading}>
                    <span>{fLoading?'Sending…':'Send Reset Link →'}</span>
                  </button>
                </form>
              </>
            ):(
              <div className="success-state">
                <div className="success-icon">✉️</div>
                <div className="success-title">Check your inbox</div>
                <p className="success-body">
                  We&apos;ve sent a secure reset link to{' '}
                  <strong style={{color:'var(--gold)'}}>{fSentTo}</strong>.<br/>
                  If it doesn&apos;t appear within a minute, check your spam folder.
                </p>
                <div style={{background:'rgba(74,103,65,.06)',border:'1px solid rgba(74,103,65,.18)',borderRadius:8,padding:'13px 16px',width:'100%',textAlign:'center'}}>
                  <div style={{fontSize:'.68rem',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--sage)',marginBottom:2}}>Link expires in</div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.8rem',fontWeight:400,color:'var(--ink)'}}>{countdown}</div>
                </div>
                <button className="btn-primary" style={{marginTop:4}} onClick={()=>{startCountdown(15*60);showToast('✓ Link resent!','ok');}}>
                  <span>Resend Link</span>
                </button>
              </div>
            )}
            <div className="switch-row" style={{marginTop:18}}>
              <button className="switch-link" onClick={()=>switchTo('login')} style={{display:'inline-flex',alignItems:'center',gap:5}}>
                ← Back to Login
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="page-caption">© 2024 ValutX · All rights reserved</div>

      <style>{`
        @keyframes fadeView { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
      `}</style>
    </>
  );
}