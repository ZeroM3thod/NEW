'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

type ToastType = 'ok' | 'err' | '';

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RX = /^[0-9]{10,11}$/;

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createClient();
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const animRef    = useRef<number>(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const unTimer    = useRef<ReturnType<typeof setTimeout>|null>(null);

  const [toast, setToast] = useState({msg:'',type:'' as ToastType,show:false});

  /* fields */
  const [rName, setRName]     = useState('');
  const [rNameCls, setRNameCls] = useState('');
  const [rNameMsg, setRNameMsg] = useState('');

  const [rUn, setRUn]         = useState('');
  const [rUnCls, setRUnCls]   = useState('');
  const [rUnMsg, setRUnMsg]   = useState('');
  const [rUnChecking, setRUnChecking] = useState(false);

  const [rEmail, setREmail]   = useState('');
  const [rEmailCls, setREmailCls] = useState('');
  const [rEmailMsg, setREmailMsg] = useState('');

  const [rPhone, setRPhone]   = useState('');
  const [rPhoneCls, setRPhoneCls] = useState('');
  const [rPhoneMsg, setRPhoneMsg] = useState('');

  const [rRef, setRRef]       = useState('');
  const [rRefCls, setRRefCls] = useState('');
  const [rRefMsg, setRRefMsg] = useState('');

  const [rPw, setRPw]         = useState('');
  const [rPwCls, setRPwCls]   = useState('');
  const [rPwMsg, setRPwMsg]   = useState('');
  const [rPwShow, setRPwShow] = useState(false);
  const [pwStrength, setPwStrength] = useState(0);

  const [rCpw, setRCpw]       = useState('');
  const [rCpwCls, setRCpwCls] = useState('');
  const [rCpwMsg, setRCpwMsg] = useState('');
  const [rCpwMsgType, setRCpwMsgType] = useState<'err'|'ok'>('ok');
  const [rCpwShow, setRCpwShow] = useState(false);

  const [rTerms, setRTerms]   = useState(false);
  const [rTermsMsg, setRTermsMsg] = useState('');
  const [rLoading, setRLoading]   = useState(false);

  /* BG Canvas */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setRRef(ref);
      // Wait a bit for profile data to load if needed, but here we just trigger blur check
      setTimeout(() => {
        const input = document.getElementById('rRef') as HTMLInputElement;
        if(input) input.focus();
      }, 500);
    }
  }, []);

  useEffect(() => {
    const cv=canvasRef.current; if(!cv)return;

    const cx = cv.getContext('2d')!;
    type Candle={x:number;y:number;w:number;h:number;wick:number;up:boolean;spd:number;ph:number};
    type Wave={pts:{x:number;y:number}[];spd:number;ph:number;amp:number;col:string;opa:string};
    let W=0,H=0,candles:Candle[]=[],waves:Wave[]=[],T=0;
    const setup=()=>{
      W=cv.width=window.innerWidth;H=cv.height=window.innerHeight;
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

  const showToast = useCallback((msg:string,type:ToastType='')=>{
    setToast({msg,type,show:true});
    if(toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current=setTimeout(()=>setToast(t=>({...t,show:false})),3500);
  },[]);

  const getStrength = (pw:string)=>{
    let s=0;
    if(pw.length>=8) s++;
    if(/[A-Z]/.test(pw)) s++;
    if(/[0-9]/.test(pw)) s++;
    if(/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };
  const strengthColor = (score:number)=>score<=1?'#b05252':score<=2?'#b8935a':'#4a6741';
  const strengthLabel = (score:number)=>['','Weak','Fair','Good','Strong'][score]||'';

  const handleUnInput = (val:string)=>{
    setRUn(val); setRUnCls(''); setRUnMsg(''); setRUnChecking(false);
    if(unTimer.current) clearTimeout(unTimer.current);
    const v=val.trim().toLowerCase();
    if(!v) return;
    if(v.length<3){setRUnCls('fi-err');setRUnMsg('⚠ Must be at least 3 characters.');return;}
    if(!/^[a-z0-9._]+$/.test(v)){setRUnCls('fi-err');setRUnMsg('⚠ Only letters, numbers, dots and underscores.');return;}
    setRUnChecking(true); setRUnMsg('Checking availability…');
    unTimer.current=setTimeout(async ()=>{
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', v)
        .maybeSingle();

      setRUnChecking(false);
      if(data){setRUnCls('fi-err');setRUnMsg('✕ Username taken. Try another.');}
      else if(error){setRUnCls('fi-err');setRUnMsg('✕ Error checking username.');}
      else{setRUnCls('fi-good');setRUnMsg('✓ Username available!');}
    },900);
  };

  const handleRefBlur = async ()=>{
    const val=rRef.trim();
    if(!val){setRRefMsg('');return;}
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('referral_code', val)
      .maybeSingle();

    if(data){setRRefCls('fi-good');setRRefMsg('✓ Valid referral code applied!');}
    else{setRRefCls('fi-err');setRRefMsg('✕ Invalid referral code.');}
  };

  const handleCpwInput=(val:string)=>{
    setRCpw(val);
    if(!val){setRCpwMsg('');return;}
    if(rPw===val){setRCpwCls('fi-good');setRCpwMsg('✓ Passwords match.');setRCpwMsgType('ok');}
    else{setRCpwCls('fi-err');setRCpwMsg('✕ Passwords do not match.');setRCpwMsgType('err');}
  };

  const handleRegister= async (e:React.FormEvent)=>{
    e.preventDefault();
    let valid=true;
    const name=rName.trim(),un=rUn.trim(),email=rEmail.trim(),phone=rPhone.trim(),pw=rPw,cpw=rCpw;
    if(!name||name.length<2){setRNameCls('fi-err');setRNameMsg('⚠ Please enter your full name.');valid=false;}else{setRNameCls('fi-good');setRNameMsg('');}
    if(!un||un.length<3){setRUnCls('fi-err');setRUnMsg('⚠ Username must be at least 3 characters.');valid=false;}
    if(!email){setREmailCls('fi-err');setREmailMsg('⚠ Email is required.');valid=false;}
    else if(!EMAIL_RX.test(email)){setREmailCls('fi-err');setREmailMsg('⚠ Enter a valid email address.');valid=false;}
    else{setREmailCls('fi-good');setREmailMsg('');}
    if(phone&&!PHONE_RX.test(phone.replace(/[-\s]/g,''))){setRPhoneCls('fi-err');setRPhoneMsg('⚠ Enter a valid 10–11 digit phone number.');valid=false;}
    if(!pw||pw.length<8){setRPwCls('fi-err');setRPwMsg('⚠ Password must be at least 8 characters.');valid=false;}
    if(!cpw){setRCpwCls('fi-err');setRCpwMsg('⚠ Please confirm your password.');setRCpwMsgType('err');valid=false;}
    else if(pw!==cpw){setRCpwCls('fi-err');setRCpwMsg('✕ Passwords do not match.');setRCpwMsgType('err');valid=false;}
    if(!rTerms){setRTermsMsg('⚠ You must accept the Terms & Conditions.');valid=false;}else setRTermsMsg('');
    if(!valid){showToast('⚠ Please fix the errors above.','err');return;}
    setRLoading(true);

    const [firstName, ...lastNameParts] = name.split(' ');
    const lastName = lastNameParts.join(' ');

    const { error } = await supabase.auth.signUp({
      email,
      password: pw,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          username: un,
          phone: phone,
          referral_by_code: rRef.trim() || null,
        }
      }
    });

    setRLoading(false);
    if (error) {
      showToast('✕ ' + error.message, 'err');
    } else {
      showToast('✓ Account created! Please check your email.', 'ok');
      setTimeout(() => router.push('/auth/signin'), 2500);
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

  return (
    <>
      <canvas ref={canvasRef} style={{position:'fixed',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0,opacity:.055}}/>
      <div className={`toast${toast.show?' show':''}${toast.type?' '+toast.type:''}`}>{toast.msg}</div>

      <a className="back-btn" href="/auth/signin">
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
        Back
      </a>

      <div className="page-shell">
        <div className="auth-card" style={{maxWidth:500,animation:'fadeView .35s ease both'}}>
          <div className="card-logo">
            <div className="logo-icon"/>
            <div className="logo-name">Vault<span>X</span></div>
          </div>
          <h1 className="card-heading">Create account</h1>
          <p className="card-sub">Join thousands of investors growing capital through structured seasons.</p>

          <form className="form-stack" onSubmit={handleRegister} noValidate>
            {/* Full Name */}
            <div className="fg">
              <label className="fl">Full Name</label>
              <input className={`fi${rNameCls?' '+rNameCls:''}`} type="text" placeholder="Rakib Kowshar" autoComplete="name"
                value={rName} onChange={e=>setRName(e.target.value)}/>
              {rNameMsg&&<div className="msg msg-err">{rNameMsg}</div>}
            </div>
            {/* Username */}
            <div className="fg">
              <label className="fl">Username</label>
              <input className={`fi${rUnCls?' '+rUnCls:''}`} type="text" placeholder="rakib.investor" autoComplete="off"
                value={rUn} onChange={e=>handleUnInput(e.target.value)}/>
              {rUnMsg&&(
                <div className={`msg ${rUnCls==='fi-err'?'msg-err':rUnCls==='fi-good'?'msg-ok':'msg-info'}`}>
                  {rUnChecking?<span className="un-checking"><span className="un-spinner"/>{rUnMsg}</span>:rUnMsg}
                </div>
              )}
            </div>
            {/* Email */}
            <div className="fg">
              <label className="fl">Email Address</label>
              <input className={`fi${rEmailCls?' '+rEmailCls:''}`} type="email" placeholder="you@example.com" autoComplete="email"
                value={rEmail} onChange={e=>setREmail(e.target.value)}/>
              {rEmailMsg&&<div className="msg msg-err">{rEmailMsg}</div>}
            </div>
            {/* Phone */}
            <div className="fg">
              <label className="fl">Phone Number</label>
              <div className="phone-row">
                <span className="phone-pfx">🇧🇩 +880</span>
                <input className={`fi${rPhoneCls?' '+rPhoneCls:''}`} type="tel" placeholder="1712-345678" autoComplete="tel"
                  value={rPhone} onChange={e=>setRPhone(e.target.value)}/>
              </div>
              {rPhoneMsg&&<div className="msg msg-err">{rPhoneMsg}</div>}
            </div>
            {/* Referral */}
            <div className="fg">
              <label className="fl">
                Referral Code <span style={{fontSize:'.6rem',color:'var(--gold)',letterSpacing:'.08em'}}>(Optional)</span>
              </label>
              <input className={`fi${rRefCls?' '+rRefCls:''}`} type="text" placeholder="e.g. RISE-RK-2025" autoComplete="off"
                value={rRef} onChange={e=>setRRef(e.target.value)} onBlur={handleRefBlur}/>
              {rRefMsg&&<div className={`msg ${rRefCls==='fi-good'?'msg-ok':'msg-err'}`}>{rRefMsg}</div>}
            </div>
            {/* Password */}
            <div className="fg">
              <label className="fl">Password</label>
              <div className="pw-wrap">
                <input className={`fi${rPwCls?' '+rPwCls:''}`} type={rPwShow?'text':'password'}
                  placeholder="Create a strong password" autoComplete="new-password"
                  value={rPw} onChange={e=>{setRPw(e.target.value);setPwStrength(getStrength(e.target.value));}}/>
                <button type="button" className="pw-eye" onClick={()=>setRPwShow(v=>!v)}>
                  {rPwShow?<EyeClosed/>:<EyeOpen/>}
                </button>
              </div>
              <div className="strength-bar">
                {[1,2,3,4].map(i=>(
                  <div key={i} className="strength-seg"
                    style={{background:rPw&&i<=pwStrength?strengthColor(pwStrength):'var(--parchment)'}}/>
                ))}
              </div>
              {rPw&&<div className={`msg ${pwStrength<=1?'msg-err':pwStrength<=2?'msg-info':'msg-ok'}`}>{strengthLabel(pwStrength)}</div>}
              {rPwMsg&&<div className="msg msg-err">{rPwMsg}</div>}
            </div>
            {/* Confirm Password */}
            <div className="fg">
              <label className="fl">Confirm Password</label>
              <div className="pw-wrap">
                <input className={`fi${rCpwCls?' '+rCpwCls:''}`} type={rCpwShow?'text':'password'}
                  placeholder="Repeat your password" autoComplete="new-password"
                  value={rCpw} onChange={e=>handleCpwInput(e.target.value)}/>
                <button type="button" className="pw-eye" onClick={()=>setRCpwShow(v=>!v)}>
                  {rCpwShow?<EyeClosed/>:<EyeOpen/>}
                </button>
              </div>
              {rCpwMsg&&<div className={`msg ${rCpwMsgType==='ok'?'msg-ok':'msg-err'}`}>{rCpwMsg}</div>}
            </div>
            {/* Terms */}
            <label className="check-row" style={{marginTop:2}}>
              <input type="checkbox" checked={rTerms} onChange={e=>{setRTerms(e.target.checked);if(e.target.checked)setRTermsMsg('');}}/>
              <span className="check-label">
                I agree to the <a onClick={()=>showToast('Terms & Conditions — coming soon.')}>Terms &amp; Conditions</a>
                {' '}and <a onClick={()=>showToast('Privacy Policy — coming soon.')}>Privacy Policy</a>
              </span>
            </label>
            {rTermsMsg&&<div className="msg msg-err">{rTermsMsg}</div>}

            <button type="submit" className="btn-primary" style={{marginTop:6}} disabled={rLoading}>
              <span>{rLoading?'Creating account…':'Create Account →'}</span>
            </button>
          </form>

          <div className="switch-row">
            Already have an account?&nbsp;
            <button className="switch-link" onClick={()=>router.push('/auth/signin')}>Sign in →</button>
          </div>
        </div>
      </div>

      <div className="page-caption">© 2025 VaultX · All rights reserved</div>

      <style>{`
        @keyframes fadeView { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
      `}</style>
    </>
  );
}