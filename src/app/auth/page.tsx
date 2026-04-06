'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

/* ─── types ─────────────────────────────────────── */
type View = 'login' | 'register' | 'forgot';
type ToastType = 'ok' | 'err' | '';

interface FieldState {
  value: string;
  status: 'idle' | 'err' | 'good';
  msg: string;
}

function useField(init = ''): [FieldState, (v: string) => void, (msg: string) => void, () => void, () => void] {
  const [state, setState] = useState<FieldState>({ value: init, status: 'idle', msg: '' });
  const set = (value: string) => setState(s => ({ ...s, value }));
  const setErr = (msg: string) => setState(s => ({ ...s, status: 'err', msg }));
  const setOk = () => setState(s => ({ ...s, status: 'good', msg: '' }));
  const clear = () => setState(s => ({ ...s, status: 'idle', msg: '' }));
  return [state, set, setErr, setOk, clear];
}

/* ─── constants ─────────────────────────────────── */
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RX = /^[0-9]{10,11}$/;
const TAKEN_NAMES = ['admin', 'rakib', 'test', 'user', 'investor', 'support', 'seasonrise'];
const VALID_REFS = ['RISE-RK-2025', 'RISE-AB-2025', 'VAULT-X-2025'];

/* ─── main component ────────────────────────────── */
export default function AuthPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const [view, setView] = useState<View>('login');
  const [toast, setToast] = useState({ msg: '', type: '' as ToastType, show: false });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Login fields ── */
  const [lEmail, setLEmail, setLEmailErr, setLEmailOk, clearLEmail] = useField();
  const [lPw, setLPw, setLPwErr, setLPwOk, clearLPw] = useField();
  const [lRemember, setLRemember] = useState(false);
  const [lPwShow, setLPwShow] = useState(false);
  const [lLoading, setLLoading] = useState(false);

  /* ── Register fields ── */
  const [rName, setRName, setRNameErr, setRNameOk] = useField();
  const [rUn, setRUn, setRUnErr, setRUnOk, clearRUn] = useField();
  const [rUnMsg, setRUnMsg] = useState('');
  const [rUnStatus, setRUnStatus] = useState<'idle' | 'err' | 'good' | 'checking'>('idle');
  const [rEmail, setREmail, setREmailErr, setREmailOk] = useField();
  const [rPhone, setRPhone, setRPhoneErr, , clearRPhone] = useField();
  const [rRef, setRRef, setRRefErr, setRRefOk, clearRRef] = useField();
  const [rRefMsg, setRRefMsg] = useState('');
  const [rPw, setRPw, setRPwErr, setRPwOk] = useField();
  const [rPwShow, setRPwShow] = useState(false);
  const [pwStrength, setPwStrength] = useState(0);
  const [rCpw, setRCpw, setRCpwErr, setRCpwOk, clearRCpw] = useField();
  const [rCpwShow, setRCpwShow] = useState(false);
  const [rCpwMsg, setRCpwMsg] = useState('');
  const [rCpwMsgType, setRCpwMsgType] = useState<'err' | 'ok'>('ok');
  const [rTerms, setRTerms] = useState(false);
  const [rTermsMsg, setRTermsMsg] = useState('');
  const [rLoading, setRLoading] = useState(false);
  const unTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Forgot fields ── */
  const [fEmail, setFEmail, setFEmailErr, setFEmailOk] = useField();
  const [fLoading, setFLoading] = useState(false);
  const [fSentTo, setFSentTo] = useState('');
  const [fSuccess, setFSuccess] = useState(false);
  const [countdown, setCountdown] = useState('15:00');
  const cdTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ─── Canvas BG ───────────────────────────────── */
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const cx = cvs.getContext('2d')!;
    let W = 0, H = 0;
    interface Candle { x:number; y:number; w:number; h:number; wick:number; up:boolean; spd:number; ph:number; }
    interface Wave { pts:{x:number;y:number}[]; spd:number; ph:number; amp:number; col:string; opa:string; }
    let candles: Candle[] = [], waves: Wave[] = [], T = 0;

    function setup() {
      W = cvs!.width = window.innerWidth;
      H = cvs!.height = window.innerHeight;
      const n = Math.max(6, Math.floor(W / 50));
      candles = Array.from({ length: n }, (_, i) => ({
        x: (i / n) * W + 10 + Math.random() * 18,
        y: H * 0.15 + Math.random() * H * 0.68,
        w: 8 + Math.random() * 9, h: 14 + Math.random() * 72,
        wick: 6 + Math.random() * 22,
        up: Math.random() > 0.42,
        spd: 0.15 + Math.random() * 0.35,
        ph: Math.random() * Math.PI * 2,
      }));
      const pts = Math.ceil(W / 36) + 2;
      waves = [0, 1, 2, 3].map(i => ({
        pts: Array.from({ length: pts }, (_, j) => ({ x: j * 36, y: H * (0.12 + i * 0.22) + Math.random() * 44 })),
        spd: 0.1 + i * 0.04, ph: i * 1.4, amp: 13 + i * 8,
        col: i % 2 === 0 ? 'rgba(74,103,65,' : 'rgba(184,147,90,',
        opa: i % 2 === 0 ? '.72)' : '.56)',
      }));
    }

    function draw() {
      cx.clearRect(0, 0, W, H); T += 0.011;
      waves.forEach(w => {
        cx.beginPath();
        w.pts.forEach((p, j) => {
          const y = p.y + Math.sin(T * w.spd + j * 0.3 + w.ph) * w.amp;
          j === 0 ? cx.moveTo(p.x, y) : cx.lineTo(p.x, y);
        });
        cx.strokeStyle = w.col + w.opa; cx.lineWidth = 1; cx.stroke();
      });
      candles.forEach(c => {
        const b = Math.sin(T * c.spd + c.ph) * 7;
        const x = c.x, y = c.y + b;
        cx.strokeStyle = 'rgba(28,28,28,.8)'; cx.lineWidth = 1;
        cx.beginPath();
        cx.moveTo(x + c.w / 2, y - c.wick); cx.lineTo(x + c.w / 2, y + c.h + c.wick);
        cx.stroke();
        cx.fillStyle = c.up ? 'rgba(74,103,65,.88)' : 'rgba(184,147,90,.82)';
        cx.fillRect(x, y, c.w, c.h); cx.strokeRect(x, y, c.w, c.h);
      });
      animRef.current = requestAnimationFrame(draw);
    }
    window.addEventListener('resize', setup);
    setup(); draw();
    return () => { window.removeEventListener('resize', setup); cancelAnimationFrame(animRef.current); };
  }, []);

  /* ─── Toast ────────────────────────────────────── */
  const showToast = useCallback((msg: string, type: ToastType = '') => {
    setToast({ msg, type, show: true });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 3500);
  }, []);

  /* ─── View switch ───────────────────────────────── */
  const switchTo = (v: View) => {
    setView(v);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ─── Password strength ─────────────────────────── */
  const getStrength = (pw: string) => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };
  const strengthColor = (score: number) =>
    score <= 1 ? '#b05252' : score <= 2 ? '#b8935a' : '#4a6741';
  const strengthLabel = (score: number) =>
    ['', 'Weak', 'Fair', 'Good', 'Strong'][score] || '';

  /* ─── Username check ────────────────────────────── */
  const handleUnInput = (val: string) => {
    setRUn(val);
    setRUnStatus('idle');
    setRUnMsg('');
    if (unTimerRef.current) clearTimeout(unTimerRef.current);
    const v = val.trim().toLowerCase();
    if (!v) return;
    if (v.length < 3) { setRUnStatus('err'); setRUnMsg('⚠ Must be at least 3 characters.'); return; }
    if (!/^[a-z0-9._]+$/.test(v)) { setRUnStatus('err'); setRUnMsg('⚠ Only letters, numbers, dots and underscores.'); return; }
    setRUnStatus('checking');
    setRUnMsg('Checking availability…');
    unTimerRef.current = setTimeout(() => {
      if (TAKEN_NAMES.includes(v)) {
        setRUnStatus('err'); setRUnMsg('✕ Username taken. Try another.');
      } else {
        setRUnStatus('good'); setRUnMsg('✓ Username available!');
      }
    }, 900);
  };

  /* ─── Referral blur ─────────────────────────────── */
  const handleRefBlur = () => {
    const val = rRef.value.trim().toUpperCase();
    if (!val) { setRRefMsg(''); return; }
    if (VALID_REFS.includes(val)) {
      setRRefOk(); setRRefMsg('✓ Valid referral code applied!');
    } else {
      setRRefErr('✕ Invalid referral code.'); setRRefMsg('');
    }
  };

  /* ─── Confirm pw match ──────────────────────────── */
  const handleCpwInput = (val: string) => {
    setRCpw(val);
    if (!val) { setRCpwMsg(''); return; }
    if (rPw.value === val) {
      setRCpwOk(); setRCpwMsg('✓ Passwords match.'); setRCpwMsgType('ok');
    } else {
      setRCpwErr(''); setRCpwMsg('✕ Passwords do not match.'); setRCpwMsgType('err');
    }
  };

  /* ─── Countdown ─────────────────────────────────── */
  const startCountdown = (seconds: number) => {
    if (cdTimer.current) clearInterval(cdTimer.current);
    let s = seconds;
    cdTimer.current = setInterval(() => {
      s--;
      if (s <= 0) { clearInterval(cdTimer.current!); setCountdown('Expired'); return; }
      const m = Math.floor(s / 60);
      const r = s % 60;
      setCountdown(`${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`);
    }, 1000);
  };

  /* ─── Login submit ──────────────────────────────── */
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    clearLEmail(); clearLPw();
    let valid = true;
    const email = lEmail.value.trim();
    const pw = lPw.value;
    if (!email) { setLEmailErr('⚠ Email or phone is required.'); valid = false; }
    else if (!EMAIL_RX.test(email) && !PHONE_RX.test(email.replace('+880', ''))) { setLEmailErr('⚠ Enter a valid email or phone number.'); valid = false; }
    else setLEmailOk();
    if (!pw) { setLPwErr('⚠ Password is required.'); valid = false; }
    else if (pw.length < 6) { setLPwErr('⚠ Password must be at least 6 characters.'); valid = false; }
    else setLPwOk();
    if (!valid) return;
    setLLoading(true);
    setTimeout(() => {
      setLLoading(false);
      showToast('✓ Welcome back! Redirecting…', 'ok');
      setTimeout(() => router.push('/dashboard'), 1600);
    }, 1400);
  };

  /* ─── Register submit ───────────────────────────── */
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;
    const name = rName.value.trim();
    const un = rUn.value.trim();
    const email = rEmail.value.trim();
    const phone = rPhone.value.trim();
    const pw = rPw.value;
    const cpw = rCpw.value;

    if (!name || name.length < 2) { setRNameErr('⚠ Please enter your full name.'); valid = false; } else setRNameOk();
    if (!un || un.length < 3) { setRUnStatus('err'); setRUnMsg('⚠ Username must be at least 3 characters.'); valid = false; }
    else if (TAKEN_NAMES.includes(un.toLowerCase())) { setRUnStatus('err'); setRUnMsg('✕ Username already taken.'); valid = false; }
    if (!email) { setREmailErr('⚠ Email is required.'); valid = false; }
    else if (!EMAIL_RX.test(email)) { setREmailErr('⚠ Enter a valid email address.'); valid = false; }
    else setREmailOk();
    if (phone && !PHONE_RX.test(phone.replace(/[-\s]/g, ''))) { setRPhoneErr('⚠ Enter a valid 10–11 digit phone number.'); valid = false; }
    if (!pw || pw.length < 8) { setRPwErr('⚠ Password must be at least 8 characters.'); valid = false; }
    if (!cpw) { setRCpwMsg('⚠ Please confirm your password.'); setRCpwMsgType('err'); valid = false; }
    else if (pw !== cpw) { setRCpwMsg('✕ Passwords do not match.'); setRCpwMsgType('err'); valid = false; }
    if (!rTerms) { setRTermsMsg('⚠ You must accept the Terms & Conditions.'); valid = false; }
    else setRTermsMsg('');

    if (!valid) { showToast('⚠ Please fix the errors above.', 'err'); return; }
    setRLoading(true);
    setTimeout(() => {
      setRLoading(false);
      showToast('✓ Account created! Please sign in.', 'ok');
      setTimeout(() => switchTo('login'), 1800);
    }, 1500);
  };

  /* ─── Forgot submit ─────────────────────────────── */
  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    const email = fEmail.value.trim();
    if (!email) { setFEmailErr('⚠ Email is required.'); return; }
    if (!EMAIL_RX.test(email)) { setFEmailErr('⚠ Enter a valid email address.'); return; }
    setFEmailOk();
    setFLoading(true);
    setTimeout(() => {
      setFLoading(false);
      setFSentTo(email);
      setFSuccess(true);
      showToast('✓ Reset link sent to ' + email, 'ok');
      startCountdown(15 * 60);
    }, 1400);
  };

  /* ─── Input class helper ────────────────────────── */
  const cls = (status: 'idle' | 'err' | 'good') =>
    'fi' + (status === 'err' ? ' fi-err' : status === 'good' ? ' fi-good' : '');

  /* ─── Eye icon SVGs ─────────────────────────────── */
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

  /* ─── Back button handler ───────────────────────── */
  const handleBack = (e: React.MouseEvent) => {
    if (view !== 'login') { e.preventDefault(); switchTo('login'); }
    else { router.push('/'); }
  };

  /* ════════════════════════════════════════════════ */
  return (
    <>
      {/* Canvas BG */}
      <canvas ref={canvasRef} style={{ position:'fixed', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:0, opacity:0.055 }} />

      {/* Toast */}
      <div className={`toast${toast.show ? ' show' : ''}${toast.type ? ' ' + toast.type : ''}`}>
        {toast.msg}
      </div>

      {/* Back button */}
      <a className="back-btn" href="/" onClick={handleBack}>
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
        Back
      </a>

      {/* Page shell */}
      <div className="page-shell">

        {/* ── LOGIN VIEW ── */}
        <div className={`view auth-card${view === 'login' ? ' active' : ''}`}>
          <div className="card-logo">
            <div className="logo-icon" />
            <div className="logo-name">Vault<span>X</span></div>
          </div>
          <h1 className="card-heading">Welcome back</h1>
          <p className="card-sub">Sign in to your investment account</p>

          <form className="form-stack" onSubmit={handleLogin} noValidate>
            <div className="fg">
              <label className="fl" htmlFor="l-email">Email or Phone</label>
              <input className={cls(lEmail.status)} id="l-email" type="text"
                placeholder="email@example.com or 017XXXXXXXX" autoComplete="username"
                value={lEmail.value} onChange={e => setLEmail(e.target.value)} />
              {lEmail.msg && <div className="msg msg-err">{lEmail.msg}</div>}
            </div>

            <div className="fg">
              <label className="fl" htmlFor="l-pw">Password</label>
              <div className="pw-wrap">
                <input className={cls(lPw.status)} id="l-pw" type={lPwShow ? 'text' : 'password'}
                  placeholder="Your password" autoComplete="current-password"
                  value={lPw.value} onChange={e => setLPw(e.target.value)} />
                <button type="button" className="pw-eye" onClick={() => setLPwShow(v => !v)} aria-label="Toggle password">
                  {lPwShow ? <EyeClosed /> : <EyeOpen />}
                </button>
              </div>
              {lPw.msg && <div className="msg msg-err">{lPw.msg}</div>}
            </div>

            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'8px' }}>
              <label className="check-row">
                <input type="checkbox" checked={lRemember} onChange={e => setLRemember(e.target.checked)} />
                <span className="check-label">Remember me</span>
              </label>
              <button type="button" className="switch-link" onClick={() => switchTo('forgot')}>Forgot Password?</button>
            </div>

            <button type="submit" className="btn-primary" disabled={lLoading}>
              <span>{lLoading ? 'Signing in…' : 'Sign In'}</span>
            </button>
          </form>

          <div className="divider-text" style={{ marginTop:'18px' }}>or</div>
          <div className="switch-row" style={{ marginTop:'8px' }}>
            Don&apos;t have an account?&nbsp;
            <button className="switch-link" onClick={() => switchTo('register')}>Create one →</button>
          </div>
        </div>

        {/* ── REGISTER VIEW ── */}
        <div className={`view auth-card${view === 'register' ? ' active' : ''}`} style={{ maxWidth:'500px' }}>
          <div className="card-logo">
            <div className="logo-icon" />
            <div className="logo-name">Vault<span>X</span></div>
          </div>
          <h1 className="card-heading">Create account</h1>
          <p className="card-sub">Join thousands of investors growing capital through structured seasons.</p>

          <form className="form-stack" onSubmit={handleRegister} noValidate>
            <div className="fg">
              <label className="fl">Full Name</label>
              <input className={cls(rName.status)} type="text" placeholder="Rakib Kowshar" autoComplete="name"
                value={rName.value} onChange={e => setRName(e.target.value)} />
              {rName.msg && <div className="msg msg-err">{rName.msg}</div>}
            </div>

            <div className="fg">
              <label className="fl">Username</label>
              <input className={'fi' + (rUnStatus === 'err' ? ' fi-err' : rUnStatus === 'good' ? ' fi-good' : '')}
                type="text" placeholder="rakib.investor" autoComplete="off"
                value={rUn.value} onChange={e => handleUnInput(e.target.value)} />
              {rUnMsg && (
                <div className={`msg ${rUnStatus === 'err' ? 'msg-err' : rUnStatus === 'good' ? 'msg-ok' : 'msg-info'}`}>
                  {rUnStatus === 'checking'
                    ? <span className="un-checking"><span className="un-spinner" />{rUnMsg}</span>
                    : rUnMsg}
                </div>
              )}
            </div>

            <div className="fg">
              <label className="fl">Email Address</label>
              <input className={cls(rEmail.status)} type="email" placeholder="you@example.com" autoComplete="email"
                value={rEmail.value} onChange={e => setREmail(e.target.value)} />
              {rEmail.msg && <div className="msg msg-err">{rEmail.msg}</div>}
            </div>

            <div className="fg">
              <label className="fl">Phone Number</label>
              <div className="phone-row">
                <span className="phone-pfx">🇧🇩 +880</span>
                <input className={cls(rPhone.status)} type="tel" placeholder="1712-345678" autoComplete="tel"
                  value={rPhone.value} onChange={e => setRPhone(e.target.value)} />
              </div>
              {rPhone.msg && <div className="msg msg-err">{rPhone.msg}</div>}
            </div>

            <div className="fg">
              <label className="fl">
                Referral Code <span style={{ fontSize:'.6rem', color:'var(--gold)', letterSpacing:'.08em' }}>(Optional)</span>
              </label>
              <input className={cls(rRef.status)} type="text" placeholder="e.g. RISE-RK-2025" autoComplete="off"
                value={rRef.value} onChange={e => setRRef(e.target.value)} onBlur={handleRefBlur} />
              {rRefMsg && <div className={`msg ${rRef.status === 'good' ? 'msg-ok' : 'msg-err'}`}>{rRefMsg}</div>}
              {rRef.msg && <div className="msg msg-err">{rRef.msg}</div>}
            </div>

            <div className="fg">
              <label className="fl">Password</label>
              <div className="pw-wrap">
                <input className={cls(rPw.status)} type={rPwShow ? 'text' : 'password'}
                  placeholder="Create a strong password" autoComplete="new-password"
                  value={rPw.value}
                  onChange={e => { setRPw(e.target.value); setPwStrength(getStrength(e.target.value)); }} />
                <button type="button" className="pw-eye" onClick={() => setRPwShow(v => !v)} aria-label="Toggle password">
                  {rPwShow ? <EyeClosed /> : <EyeOpen />}
                </button>
              </div>
              <div className="strength-bar">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="strength-seg"
                    style={{ background: rPw.value && i <= pwStrength ? strengthColor(pwStrength) : 'var(--parchment)' }} />
                ))}
              </div>
              {rPw.value && (
                <div className={`msg ${pwStrength <= 1 ? 'msg-err' : pwStrength <= 2 ? 'msg-info' : 'msg-ok'}`}>
                  {strengthLabel(pwStrength)}
                </div>
              )}
              {rPw.msg && <div className="msg msg-err">{rPw.msg}</div>}
            </div>

            <div className="fg">
              <label className="fl">Confirm Password</label>
              <div className="pw-wrap">
                <input className={cls(rCpw.status)} type={rCpwShow ? 'text' : 'password'}
                  placeholder="Repeat your password" autoComplete="new-password"
                  value={rCpw.value} onChange={e => handleCpwInput(e.target.value)} />
                <button type="button" className="pw-eye" onClick={() => setRCpwShow(v => !v)} aria-label="Toggle password">
                  {rCpwShow ? <EyeClosed /> : <EyeOpen />}
                </button>
              </div>
              {rCpwMsg && <div className={`msg ${rCpwMsgType === 'ok' ? 'msg-ok' : 'msg-err'}`}>{rCpwMsg}</div>}
            </div>

            <label className="check-row" style={{ marginTop:'2px' }}>
              <input type="checkbox" checked={rTerms} onChange={e => { setRTerms(e.target.checked); if (e.target.checked) setRTermsMsg(''); }} />
              <span className="check-label">
                I agree to the <a onClick={() => showToast('Terms & Conditions — coming soon.')}>Terms &amp; Conditions</a>
                {' '}and <a onClick={() => showToast('Privacy Policy — coming soon.')}>Privacy Policy</a>
              </span>
            </label>
            {rTermsMsg && <div className="msg msg-err">{rTermsMsg}</div>}

            <button type="submit" className="btn-primary" style={{ marginTop:'6px' }} disabled={rLoading}>
              <span>{rLoading ? 'Creating account…' : 'Create Account →'}</span>
            </button>
          </form>

          <div className="switch-row">
            Already have an account?&nbsp;
            <button className="switch-link" onClick={() => switchTo('login')}>Sign in →</button>
          </div>
        </div>

        {/* ── FORGOT VIEW ── */}
        <div className={`view auth-card${view === 'forgot' ? ' active' : ''}`}>
          <div className="card-logo">
            <div className="logo-icon" />
            <div className="logo-name">Vault<span>X</span></div>
          </div>

          {/* Default state */}
          {!fSuccess && (
            <div id="forgot-default">
              <h1 className="card-heading">Reset password</h1>
              <p className="card-sub">Enter your email and we&apos;ll send a secure reset link to your inbox.</p>
              <form className="form-stack" onSubmit={handleForgot} noValidate>
                <div className="fg">
                  <label className="fl">Email Address</label>
                  <input className={cls(fEmail.status)} type="email" placeholder="you@example.com" autoComplete="email"
                    value={fEmail.value} onChange={e => setFEmail(e.target.value)} />
                  {fEmail.msg && <div className="msg msg-err">{fEmail.msg}</div>}
                </div>
                <div style={{ background:'rgba(184,147,90,.05)', border:'1px solid var(--border)', borderRadius:'6px', padding:'11px 13px' }}>
                  <div style={{ fontSize:'.71rem', color:'var(--text-sec)', lineHeight:1.75, fontWeight:300 }}>
                    🔒 The reset link is valid for <strong style={{ color:'var(--ink)' }}>15 minutes</strong> and can only be used once.
                  </div>
                </div>
                <button type="submit" className="btn-primary" disabled={fLoading}>
                  <span>{fLoading ? 'Sending…' : 'Send Reset Link →'}</span>
                </button>
              </form>
            </div>
          )}

          {/* Success state */}
          {fSuccess && (
            <div className="success-state show">
              <div className="success-icon">✉️</div>
              <div className="success-title">Check your inbox</div>
              <p className="success-body">
                We&apos;ve sent a secure reset link to{' '}
                <strong style={{ color:'var(--gold)' }}>{fSentTo}</strong>.<br />
                If it doesn&apos;t appear within a minute, check your spam folder.
              </p>
              <div style={{ background:'rgba(74,103,65,.06)', border:'1px solid rgba(74,103,65,.18)', borderRadius:'8px', padding:'13px 16px', width:'100%', textAlign:'center' }}>
                <div style={{ fontSize:'.68rem', letterSpacing:'.1em', textTransform:'uppercase', color:'var(--sage)', marginBottom:'2px' }}>Link expires in</div>
                <div style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:'1.8rem', fontWeight:400, color:'var(--ink)' }}>{countdown}</div>
              </div>
              <button className="btn-primary" style={{ marginTop:'4px' }}
                onClick={() => { startCountdown(15 * 60); showToast('✓ Link resent!', 'ok'); }}>
                <span>Resend Link</span>
              </button>
            </div>
          )}

          <div className="switch-row" style={{ marginTop:'18px' }}>
            <button className="switch-link" onClick={() => switchTo('login')}
              style={{ display:'inline-flex', alignItems:'center', gap:'5px' }}>
              ← Back to Login
            </button>
          </div>
        </div>

      </div>{/* /page-shell */}

      <div className="page-caption">© 2025 VaultX · All rights reserved</div>

      {/* ── ALL STYLES ── */}
      <style jsx global>{`
        :root {
          --ink:       #1c1c1c;
          --cream:     #f6f1e9;
          --parchment: #ede7da;
          --gold:      #b8935a;
          --gold-l:    #d4aa72;
          --gold-d:    #9a7a47;
          --sage:      #4a6741;
          --sage-l:    #6a8c60;
          --charcoal:  #2e2e2e;
          --surface:   #faf7f2;
          --border:    rgba(184,147,90,0.2);
          --border-s:  rgba(184,147,90,0.35);
          --text-sec:  #6b6459;
          --error:     #9b3a3a;
          --radius:    6px;
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; height: 100%; }
        body {
          font-family: 'DM Sans', sans-serif;
          background: var(--cream);
          color: var(--ink);
          min-height: 100svh;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }
        body::before {
          content: '';
          position: fixed; inset: 0; z-index: 1; pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.022'/%3E%3C/svg%3E");
          opacity: .42;
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: var(--parchment); }
        ::-webkit-scrollbar-thumb { background: var(--gold); border-radius: 10px; }
      `}</style>

      <style jsx>{`
        .page-shell {
          position: relative; z-index: 2;
          min-height: 100svh;
          display: flex; flex-direction: column;
          align-items: center; justify-content: flex-start;
          padding: 20px 16px 40px;
        }
        @media(min-width:640px) {
          .page-shell { justify-content: center; padding: 40px 20px; }
        }

        .back-btn {
          position: fixed; top: 20px; left: 20px; z-index: 100;
          display: flex; align-items: center; gap: 7px;
          background: rgba(246,241,233,0.9);
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--border); border-radius: 100px;
          padding: 8px 16px 8px 12px;
          font-size: .74rem; letter-spacing: .08em;
          text-transform: uppercase; color: var(--charcoal);
          cursor: pointer; text-decoration: none;
          transition: all .22s;
          box-shadow: 0 2px 12px rgba(28,28,28,.06);
        }
        .back-btn svg { width:14px; height:14px; stroke:var(--gold); stroke-width:2; fill:none; flex-shrink:0; }
        .back-btn:hover { border-color:var(--gold); color:var(--gold); }

        .auth-card {
          background: rgba(250,247,242,0.92);
          backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px);
          border: 1px solid var(--border); border-radius: 16px;
          width: 100%; max-width: 460px;
          padding: 36px 28px 32px;
          box-shadow: 0 4px 32px rgba(184,147,90,.07), 0 1px 0 rgba(255,255,255,.8) inset;
          position: relative; margin-top: 60px;
        }
        @media(min-width:640px) { .auth-card { padding:44px 40px 38px; margin-top:0; } }
        .auth-card::before {
          content: '';
          position: absolute; top: 0; left: 50%; transform: translateX(-50%);
          width: 40%; height: 2px;
          background: linear-gradient(90deg, transparent, var(--gold), transparent);
          border-radius: 0 0 4px 4px;
        }

        .card-logo { display:flex; flex-direction:column; align-items:center; margin-bottom:28px; }
        .logo-icon {
          width:40px; height:40px; background:var(--ink);
          border-radius:var(--radius);
          display:flex; align-items:center; justify-content:center;
          position:relative; overflow:hidden; margin-bottom:10px;
        }
        .logo-icon::after {
          content:'';
          position:absolute; bottom:7px; left:50%; transform:translateX(-50%);
          width:16px; height:1.5px; background:var(--gold); border-radius:2px;
          box-shadow: 0 -5px 0 var(--gold-l), 0 -10px 0 var(--cream);
        }
        .logo-name { font-family:'Cormorant Garamond',serif; font-size:1.45rem; font-weight:600; color:var(--ink); letter-spacing:.04em; }
        .logo-name span { color:var(--gold); }

        .card-heading { font-family:'Cormorant Garamond',serif; font-size:clamp(1.5rem,4vw,2rem); font-weight:400; line-height:1.15; color:var(--ink); margin-bottom:6px; }
        .card-sub { font-size:.8rem; color:var(--text-sec); font-weight:300; line-height:1.6; margin-bottom:26px; }

        .form-stack { display:flex; flex-direction:column; gap:14px; }
        .fg { display:flex; flex-direction:column; gap:5px; }
        .fl { font-size:.67rem; letter-spacing:.12em; text-transform:uppercase; color:var(--text-sec); }

        .fi {
          padding:11px 13px;
          background:var(--cream); border:1px solid var(--border);
          font-family:'DM Sans',sans-serif; font-size:.84rem; color:var(--ink);
          border-radius:var(--radius); outline:none;
          transition:border-color .2s, box-shadow .2s; width:100%;
        }
        .fi:focus { border-color:var(--gold); box-shadow:0 0 0 3px rgba(184,147,90,.08); }
        .fi::placeholder { color:#bbb4ac; }
        .fi-err  { border-color:var(--error) !important; box-shadow:0 0 0 3px rgba(155,58,58,.06) !important; }
        .fi-good { border-color:var(--sage) !important; box-shadow:0 0 0 3px rgba(74,103,65,.06) !important; }

        .pw-wrap { position:relative; }
        .pw-wrap .fi { padding-right:40px; }
        .pw-eye {
          position:absolute; right:12px; top:50%; transform:translateY(-50%);
          cursor:pointer; color:var(--text-sec); transition:color .2s;
          background:none; border:none; padding:2px;
          display:flex; align-items:center;
        }
        .pw-eye:hover { color:var(--gold); }

        .phone-row { display:flex; gap:8px; }
        .phone-pfx { padding:11px 12px; background:var(--parchment); border:1px solid var(--border); border-radius:var(--radius); font-size:.8rem; color:var(--text-sec); white-space:nowrap; flex-shrink:0; }
        .phone-row .fi { flex:1; }

        .msg { font-size:.71rem; letter-spacing:.03em; margin-top:2px; display:flex; align-items:center; gap:4px; min-height:16px; }
        .msg-err  { color:var(--error); }
        .msg-ok   { color:var(--sage); }
        .msg-info { color:var(--text-sec); }

        .check-row { display:flex; align-items:flex-start; gap:10px; cursor:pointer; }
        .check-row input[type="checkbox"] { width:16px; height:16px; flex-shrink:0; margin-top:2px; accent-color:var(--gold); cursor:pointer; }
        .check-label { font-size:.78rem; color:var(--text-sec); line-height:1.55; }
        .check-label a { color:var(--gold); text-decoration:underline; text-underline-offset:2px; cursor:pointer; }

        .btn-primary {
          width:100%; padding:13px;
          background:var(--ink); color:var(--cream);
          border:1px solid var(--ink);
          font-family:'DM Sans',sans-serif; font-size:.78rem; font-weight:400;
          letter-spacing:.1em; text-transform:uppercase;
          cursor:pointer; border-radius:var(--radius);
          transition:all .3s; position:relative; overflow:hidden; margin-top:4px;
        }
        .btn-primary::after {
          content:''; position:absolute; inset:0;
          background:var(--gold); transform:scaleX(0);
          transform-origin:left; transition:transform .35s ease; z-index:0;
        }
        .btn-primary span { position:relative; z-index:1; }
        .btn-primary:hover { border-color:var(--gold); }
        .btn-primary:hover::after { transform:scaleX(1); }
        .btn-primary:active { transform:scale(.97); }
        .btn-primary:disabled { opacity:.5; cursor:not-allowed; transform:none; }
        .btn-primary:disabled::after { display:none; }

        .switch-row { text-align:center; margin-top:20px; font-size:.78rem; color:var(--text-sec); }
        .switch-link {
          color:var(--gold); text-decoration:none; font-weight:500;
          cursor:pointer; transition:color .2s; border:none; background:none;
          font-family:'DM Sans',sans-serif; font-size:.78rem; padding:0; letter-spacing:0;
        }
        .switch-link:hover { color:var(--gold-d); text-decoration:underline; text-underline-offset:2px; }

        .divider-text { display:flex; align-items:center; gap:12px; margin:4px 0; color:var(--text-sec); font-size:.72rem; }
        .divider-text::before, .divider-text::after { content:''; flex:1; height:1px; background:var(--border); }

        .strength-bar { display:flex; gap:3px; margin-top:5px; }
        .strength-seg { flex:1; height:3px; border-radius:100px; background:var(--parchment); transition:background .3s; }

        .un-checking { display:inline-flex; align-items:center; gap:5px; }
        .un-spinner { width:10px; height:10px; border-radius:50%; border:1.5px solid var(--border); border-top-color:var(--gold); animation:spin .7s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }

        .success-state { display:flex; flex-direction:column; align-items:center; text-align:center; padding:10px 0 4px; gap:14px; }
        .success-icon { width:56px; height:56px; border-radius:50%; background:rgba(74,103,65,.1); border:1px solid rgba(74,103,65,.25); display:flex; align-items:center; justify-content:center; font-size:1.4rem; }
        .success-title { font-family:'Cormorant Garamond',serif; font-size:1.5rem; font-weight:400; color:var(--ink); }
        .success-body { font-size:.8rem; color:var(--text-sec); font-weight:300; line-height:1.75; max-width:300px; }

        .view { display:none; animation:fadeView .35s ease both; }
        .view.active { display:block; }
        @keyframes fadeView { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }

        .toast {
          position:fixed; top:20px; left:50%;
          transform:translateX(-50%) translateY(-90px);
          background:rgba(28,28,28,.97);
          border:1px solid rgba(184,147,90,.3); border-radius:10px;
          padding:11px 24px; z-index:9000; color:var(--gold);
          font-size:.76rem; letter-spacing:.06em;
          box-shadow:0 8px 28px rgba(0,0,0,.15);
          transition:transform .4s cubic-bezier(.16,1,.3,1);
          white-space:nowrap; pointer-events:none;
        }
        .toast.show { transform:translateX(-50%) translateY(0); }
        .toast.ok   { border-color:rgba(74,103,65,.4); color:var(--sage-l,#6a8c60); }
        .toast.err  { border-color:rgba(155,58,58,.4); color:#c97070; }

        .page-caption {
          position:fixed; bottom:16px; left:0; right:0;
          text-align:center; z-index:2;
          font-size:.65rem; letter-spacing:.08em;
          color:rgba(107,100,89,.45); pointer-events:none;
        }
      `}</style>
    </>
  );
}
