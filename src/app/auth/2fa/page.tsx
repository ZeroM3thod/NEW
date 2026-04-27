'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

type ToastType = 'ok' | 'err' | '';
type Mode = 'totp' | 'backup';

export default function TwoFAVerifyPage() {
  const router = useRouter();
  const supabase = createClient();
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const animRef     = useRef<number>(0);
  const toastTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRefs   = useRef<(HTMLInputElement | null)[]>([]);

  const [digits, setDigits]           = useState(['', '', '', '', '', '']);
  const [backupCode, setBackupCode]   = useState('');
  const [mode, setMode]               = useState<Mode>('totp');
  const [remember, setRemember]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [toast, setToast]             = useState({ msg: '', type: '' as ToastType, show: false });
  const [shaking, setShaking]         = useState(false);
  const [userEmail, setUserEmail]     = useState('');

  /* ── Load user email ── */
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/auth/signin'); return; }
      setUserEmail(user.email || '');
    });
  }, [supabase, router]);

  /* ── Canvas BG (same as signin page) ── */
  useEffect(() => {
    const cvs = canvasRef.current; if (!cvs) return;
    const cx = cvs.getContext('2d')!;
    type Candle = { x: number; y: number; w: number; h: number; wick: number; up: boolean; spd: number; ph: number };
    type Wave   = { pts: { x: number; y: number }[]; spd: number; ph: number; amp: number; col: string; opa: string };
    let W = 0, H = 0, candles: Candle[] = [], waves: Wave[] = [], T = 0;
    const setup = () => {
      W = cvs.width = window.innerWidth; H = cvs.height = window.innerHeight;
      const n = Math.max(6, Math.floor(W / 50));
      candles = Array.from({ length: n }, (_, i) => ({
        x: (i / n) * W + 10 + Math.random() * 18,
        y: H * .15 + Math.random() * H * .68,
        w: 8 + Math.random() * 9,
        h: 14 + Math.random() * 72,
        wick: 6 + Math.random() * 22,
        up: Math.random() > .42,
        spd: .15 + Math.random() * .35,
        ph: Math.random() * Math.PI * 2,
      }));
      const pts = Math.ceil(W / 36) + 2;
      waves = [0, 1, 2, 3].map(i => ({
        pts: Array.from({ length: pts }, (_, j) => ({ x: j * 36, y: H * (.12 + i * .22) + Math.random() * 44 })),
        spd: .1 + i * .04, ph: i * 1.4, amp: 13 + i * 8,
        col: i % 2 === 0 ? 'rgba(74,103,65,' : 'rgba(184,147,90,',
        opa: i % 2 === 0 ? '.72)' : '.56)',
      }));
    };
    const draw = () => {
      cx.clearRect(0, 0, W, H); T += .011;
      waves.forEach(w => {
        cx.beginPath();
        w.pts.forEach((p, j) => {
          const y = p.y + Math.sin(T * w.spd + j * .3 + w.ph) * w.amp;
          j === 0 ? cx.moveTo(p.x, y) : cx.lineTo(p.x, y);
        });
        cx.strokeStyle = w.col + w.opa; cx.lineWidth = 1; cx.stroke();
      });
      candles.forEach(c => {
        const b = Math.sin(T * c.spd + c.ph) * 7, x = c.x, y = c.y + b;
        cx.strokeStyle = 'rgba(28,28,28,.8)'; cx.lineWidth = 1;
        cx.beginPath(); cx.moveTo(x + c.w / 2, y - c.wick); cx.lineTo(x + c.w / 2, y + c.h + c.wick); cx.stroke();
        cx.fillStyle = c.up ? 'rgba(74,103,65,.88)' : 'rgba(184,147,90,.82)';
        cx.fillRect(x, y, c.w, c.h); cx.strokeRect(x, y, c.w, c.h);
      });
      animRef.current = requestAnimationFrame(draw);
    };
    window.addEventListener('resize', setup); setup(); draw();
    return () => { window.removeEventListener('resize', setup); cancelAnimationFrame(animRef.current); };
  }, []);

  const showToast = useCallback((msg: string, type: ToastType = '') => {
    setToast({ msg, type, show: true });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 3500);
  }, []);

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 600);
  };

  /* ── OTP digit handling ── */
  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (newDigits.every(d => d !== '')) {
      submitCode(newDigits.join(''));
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleDigitPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      inputRefs.current[5]?.focus();
      submitCode(pasted);
    }
  };

  const submitCode = useCallback(async (code: string) => {
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, rememberDevice: remember }),
      });
      const data = await res.json();

      if (!res.ok) {
        triggerShake();
        setDigits(['', '', '', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
        showToast('✕ ' + (data.error || 'Invalid code.'), 'err');
      } else {
        if (data.usedBackupCode && data.backupCodesRemaining !== undefined) {
          showToast(`✓ Backup code used. ${data.backupCodesRemaining} remaining.`, 'ok');
        } else {
          showToast('✓ Identity verified!', 'ok');
        }

        // Fetch profile to determine redirect
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();
          const path = profile?.role === 'admin' ? '/admin/dashboard' : '/dashboard';
          setTimeout(() => router.push(path), 1000);
        }
      }
    } catch {
      showToast('✕ Network error. Please try again.', 'err');
    } finally {
      setLoading(false);
    }
  }, [loading, remember, supabase, router, showToast]);

  const handleBackupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = backupCode.trim().toUpperCase().replace(/\s/g, '');
    if (!code) { showToast('⚠ Enter your backup code.', 'err'); return; }
    await submitCode(code);
  };

  const isFilled = digits.every(d => d !== '');

  return (
    <>
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0, opacity: .055 }} />
      <div className={`toast${toast.show ? ' show' : ''}${toast.type ? ' ' + toast.type : ''}`}>{toast.msg}</div>

      <a className="back-btn" href="/auth/signin">
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
        Back to Login
      </a>

      <div className="page-shell">
        <div className="auth-card" style={{ animation: 'fadeView .35s ease both', maxWidth: 440 }}>
          {/* Logo */}
          <div className="card-logo">
            <div className="logo-icon" />
            <div className="logo-name">Valut<span>X</span></div>
          </div>

          {mode === 'totp' ? (
            <>
              {/* Shield Icon */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                <div style={{ width: 56, height: 56, background: 'rgba(184,147,90,.1)', border: '1px solid rgba(184,147,90,.25)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="26" height="30" viewBox="0 0 26 30" fill="none">
                    <path d="M13 2L2 7v8c0 7 5 13 11 14 6-1 11-7 11-14V7L13 2z" stroke="#b8935a" strokeWidth="1.4" strokeLinejoin="round" />
                    <path d="M8.5 15l3.2 3.2L18 10" stroke="#b8935a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              <h1 className="card-heading" style={{ textAlign: 'center', fontSize: 'clamp(1.3rem,4vw,1.7rem)' }}>Two-Factor<br />Authentication</h1>
              <p className="card-sub" style={{ textAlign: 'center' }}>
                Enter the 6-digit code from your authenticator app
                {userEmail && <><br /><strong style={{ color: 'var(--ink)' }}>{userEmail}</strong></>}
              </p>

              {/* OTP Digit Boxes */}
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    display: 'flex', gap: 8, justifyContent: 'center',
                    animation: shaking ? 'shake .5s ease' : 'none',
                  }}
                  onPaste={handleDigitPaste}
                >
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={el => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={e => handleDigitChange(i, e.target.value)}
                      onKeyDown={e => handleDigitKeyDown(i, e)}
                      autoFocus={i === 0}
                      style={{
                        width: 44, height: 54,
                        textAlign: 'center',
                        fontSize: '1.35rem',
                        fontWeight: 600,
                        fontFamily: "'Cormorant Garamond', serif",
                        background: 'var(--cream)',
                        border: `1.5px solid ${d ? 'var(--gold)' : 'var(--border)'}`,
                        borderRadius: 6,
                        outline: 'none',
                        color: 'var(--ink)',
                        transition: 'border-color .2s, box-shadow .2s',
                        boxShadow: d ? '0 0 0 3px rgba(184,147,90,.08)' : 'none',
                        caretColor: 'var(--gold)',
                      }}
                    />
                  ))}
                </div>

                {/* Progress dots */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 10 }}>
                  {digits.map((d, i) => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: d ? 'var(--gold)' : 'var(--parchment)',
                      border: '1px solid rgba(184,147,90,.3)',
                      transition: 'background .2s',
                    }} />
                  ))}
                </div>
              </div>

              {/* Remember device */}
              <label className="check-row" style={{ justifyContent: 'center', marginBottom: 16 }}>
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                <span className="check-label">Trust this device for 30 days</span>
              </label>

              {/* Manual verify button (shown if not auto-submitted) */}
              {isFilled && (
                <button
                  className="btn-primary"
                  disabled={loading}
                  onClick={() => submitCode(digits.join(''))}
                  style={{ marginBottom: 12 }}
                >
                  <span>{loading ? 'Verifying…' : 'Verify Identity →'}</span>
                </button>
              )}

              {!isFilled && (
                <div style={{ background: 'rgba(184,147,90,.05)', border: '1px solid var(--border)', borderRadius: 6, padding: '11px 14px', marginBottom: 12, textAlign: 'center' }}>
                  <span style={{ fontSize: '.72rem', color: 'var(--text-sec)', fontWeight: 300 }}>
                    Code auto-submits when all 6 digits are entered
                  </span>
                </div>
              )}

              {/* Switch to backup code */}
              <div className="switch-row" style={{ marginTop: 4 }}>
                Don't have access?&nbsp;
                <button className="switch-link" onClick={() => { setMode('backup'); setDigits(['', '', '', '', '', '']); }}>
                  Use a backup code →
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Backup code mode */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                <div style={{ width: 56, height: 56, background: 'rgba(74,103,65,.1)', border: '1px solid rgba(74,103,65,.25)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="22" height="28" viewBox="0 0 22 28" fill="none">
                    <rect x="1" y="1" width="20" height="26" rx="2" stroke="#4a6741" strokeWidth="1.4" />
                    <path d="M6 8h10M6 12h10M6 16h6" stroke="#4a6741" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              <h1 className="card-heading" style={{ textAlign: 'center', fontSize: '1.55rem' }}>Recovery Code</h1>
              <p className="card-sub" style={{ textAlign: 'center' }}>
                Enter one of the backup codes you saved when setting up 2FA. Each code can only be used once.
              </p>

              <form className="form-stack" onSubmit={handleBackupSubmit} noValidate>
                <div className="fg">
                  <label className="fl">Backup Code</label>
                  <input
                    className="fi"
                    type="text"
                    placeholder="XXXX-XXXX"
                    value={backupCode}
                    onChange={e => setBackupCode(e.target.value)}
                    autoFocus
                    style={{ textAlign: 'center', letterSpacing: '.18em', fontSize: '1rem', fontFamily: "'Cormorant Garamond',serif" }}
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={loading || !backupCode.trim()}>
                  <span>{loading ? 'Verifying…' : 'Verify with Backup Code →'}</span>
                </button>
              </form>

              <div className="switch-row" style={{ marginTop: 14 }}>
                <button className="switch-link" onClick={() => { setMode('totp'); setBackupCode(''); }}>
                  ← Use authenticator app
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="page-caption">© {new Date().getFullYear()} ValutX · Secured by 2FA</div>

      <style>{`
        @keyframes fadeView { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }
      `}</style>
    </>
  );
}
