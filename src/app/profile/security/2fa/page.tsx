'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import UserSidebar from '@/components/UserSidebar';
import ValutXLoader from '@/components/ValutXLoader';

/* ─────────────── TYPES ─────────────── */
type Step = 'status' | 'intro' | 'qr' | 'verify-setup' | 'backup-codes' | 'success' | 'disable-confirm';
type ToastT = 'ok' | 'err' | '';

/* ─────────────── HELPERS ─────────────── */
const OTPDigitInput = ({
  value, index, total, onchange, onkeydown, inputRef, shake,
}: {
  value: string; index: number; total: number;
  onchange: (i: number, v: string) => void;
  onkeydown: (i: number, e: React.KeyboardEvent) => void;
  inputRef: (el: HTMLInputElement | null) => void;
  shake: boolean;
}) => (
  <input
    ref={inputRef}
    type="text" inputMode="numeric" maxLength={1} value={value}
    onChange={e => onchange(index, e.target.value)}
    onKeyDown={e => onkeydown(index, e)}
    style={{
      width: 46, height: 56, textAlign: 'center', fontSize: '1.4rem', fontWeight: 600,
      fontFamily: "'Cormorant Garamond',serif", background: 'var(--cream)',
      border: `1.5px solid ${value ? 'var(--gold)' : 'var(--border)'}`,
      borderRadius: 6, outline: 'none', color: 'var(--ink)', transition: 'border-color .2s, box-shadow .2s',
      boxShadow: value ? '0 0 0 3px rgba(184,147,90,.09)' : 'none',
      animation: shake ? 'shake2fa .5s ease' : 'none',
    }}
  />
);

/* ─────────────── PAGE ─────────────── */
export default function TwoFAManagePage() {
  const router  = useRouter();
  const supabase = createClient();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading]         = useState(true);
  const [toast, setToast]             = useState({ msg: '', type: '' as ToastT, show: false });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── 2FA status ── */
  const [is2FAEnabled, setIs2FAEnabled]       = useState(false);
  const [enabledAt, setEnabledAt]             = useState<string | null>(null);
  const [backupRemaining, setBackupRemaining] = useState(0);

  /* ── Setup state ── */
  const [step, setStep]               = useState<Step>('status');
  const [qrDataUrl, setQrDataUrl]     = useState('');
  const [secretFormatted, setSecretFormatted] = useState('');
  const [showManualKey, setShowManualKey] = useState(false);
  const [newBackupCodes, setNewBackupCodes] = useState<string[]>([]);
  const [backupAcked, setBackupAcked] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  /* ── Setup verify OTP ── */
  const [setupDigits, setSetupDigits] = useState(['', '', '', '', '', '']);
  const [setupShake, setSetupShake]   = useState(false);
  const setupRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* ── Disable flow ── */
  const [disablePassword, setDisablePassword]   = useState('');
  const [disableCode, setDisableCode]           = useState('');
  const [showDisablePassword, setShowDisablePassword] = useState(false);
  const [disableLoading, setDisableLoading]     = useState(false);

  const showToast = useCallback((msg: string, type: ToastT = '') => {
    setToast({ msg, type, show: true });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 3500);
  }, []);

  /* ── Fetch 2FA status on mount ── */
  useEffect(() => {
    async function loadStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth/signin'); return; }

      const res = await fetch('/api/auth/2fa/status');
      if (res.ok) {
        const data = await res.json();
        setIs2FAEnabled(data.enabled);
        setEnabledAt(data.enabledAt);
        setBackupRemaining(data.backupCodesRemaining);
      }
      setLoading(false);
    }
    loadStatus();
  }, [supabase, router]);

  /* ── Canvas animation ── */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cvs = canvasRef.current; if (!cvs) return;
    const cx = cvs.getContext('2d')!;
    let W = 0, H = 0, T = 0, id = 0;
    const setup = () => {
      W = cvs.width = window.innerWidth; H = cvs.height = window.innerHeight;
    };
    const draw = () => {
      cx.clearRect(0, 0, W, H); T += .01;
      cx.strokeStyle = `rgba(184,147,90,${.04 + Math.sin(T) * .01})`; cx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        cx.beginPath();
        for (let x = 0; x <= W; x += 40)
          x === 0 ? cx.moveTo(x, H * (.2 + i * .15) + Math.sin(T + x * .012 + i) * 22)
                  : cx.lineTo(x, H * (.2 + i * .15) + Math.sin(T + x * .012 + i) * 22);
        cx.stroke();
      }
      id = requestAnimationFrame(draw);
    };
    window.addEventListener('resize', setup); setup(); draw();
    return () => { window.removeEventListener('resize', setup); cancelAnimationFrame(id); };
  }, []);

  /* ── Start setup ── */
  const startSetup = async () => {
    setStep('qr');
    const res = await fetch('/api/auth/2fa/setup', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) { showToast('✕ ' + data.error, 'err'); setStep('status'); return; }
    setQrDataUrl(data.qrDataUrl);
    setSecretFormatted(data.secret);
  };

  /* ── Setup OTP digit handlers ── */
  const handleSetupDigit = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const nd = [...setupDigits]; nd[index] = value.slice(-1);
    setSetupDigits(nd);
    if (value && index < 5) setupRefs.current[index + 1]?.focus();
    if (nd.every(d => d)) verifySetupCode(nd.join(''));
  };

  const handleSetupKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !setupDigits[index] && index > 0) setupRefs.current[index - 1]?.focus();
  };

  const handleSetupPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (p.length === 6) { setSetupDigits(p.split('')); setupRefs.current[5]?.focus(); verifySetupCode(p); }
  };

  const verifySetupCode = async (code: string) => {
    const res = await fetch('/api/auth/2fa/enable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSetupShake(true); setTimeout(() => setSetupShake(false), 600);
      setSetupDigits(['', '', '', '', '', '']);
      setTimeout(() => setupRefs.current[0]?.focus(), 50);
      showToast('✕ ' + data.error, 'err');
    } else {
      setNewBackupCodes(data.backupCodes);
      setIs2FAEnabled(true);
      setStep('backup-codes');
    }
  };

  /* ── Copy backup codes ── */
  const copyBackupCodes = () => {
    const text = newBackupCodes.join('\n');
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 2500);
    showToast('✓ Backup codes copied!', 'ok');
  };

  const downloadBackupCodes = () => {
    const text = `ValutX — 2FA Backup Codes\nGenerated: ${new Date().toLocaleString()}\n\n${newBackupCodes.join('\n')}\n\nKeep these safe. Each code can only be used once.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'valutx-backup-codes.txt';
    a.click();
    showToast('✓ Backup codes downloaded', 'ok');
  };

  /* ── Disable 2FA ── */
  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword || !disableCode) {
      showToast('⚠ Password and 2FA code are both required.', 'err'); return;
    }
    setDisableLoading(true);
    const res = await fetch('/api/auth/2fa/disable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: disablePassword, code: disableCode }),
    });
    const data = await res.json();
    setDisableLoading(false);
    if (!res.ok) {
      showToast('✕ ' + data.error, 'err');
    } else {
      setIs2FAEnabled(false);
      setEnabledAt(null);
      setStep('status');
      showToast('✓ Two-factor authentication disabled.', 'ok');
      setDisablePassword(''); setDisableCode('');
    }
  };

  /* ─────────────── RENDER HELPERS ─────────────── */

  const StatusCard = () => (
    <div className="pf-card pf-cp" style={{ maxWidth: 640, margin: '0 auto' }}>
      <span className="pf-sec-label">Security</span>
      <h2 className="pf-sec-title" style={{ marginBottom: 6 }}>Two-Factor Authentication</h2>
      <p style={{ fontSize: '.8rem', color: 'var(--txt2)', fontWeight: 300, lineHeight: 1.75, marginBottom: 28 }}>
        Add an extra layer of security by requiring a one-time code from Google Authenticator whenever you sign in.
      </p>

      {/* Status indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 18px',
        background: is2FAEnabled ? 'rgba(74,103,65,.06)' : 'rgba(184,147,90,.05)',
        border: `1px solid ${is2FAEnabled ? 'rgba(74,103,65,.25)' : 'var(--border)'}`,
        borderRadius: 10, marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10,
            background: is2FAEnabled ? 'rgba(74,103,65,.12)' : 'rgba(184,147,90,.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {is2FAEnabled ? (
              <svg width="20" height="22" viewBox="0 0 20 22" fill="none">
                <path d="M10 2L2 5.5V10c0 5.5 3.5 10.5 8 12 4.5-1.5 8-6.5 8-12V5.5L10 2z" stroke="#4a6741" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M6.5 11l2.8 2.8L14 8" stroke="#4a6741" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
                <path d="M9 2L1 5.5V10c0 5.5 3.5 10.5 8 12 4.5-1.5 8-6.5 8-12V5.5L9 2z" stroke="#b8935a" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M9 9v4M9 15h.01" stroke="#b8935a" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </div>
          <div>
            <div style={{ fontSize: '.85rem', fontWeight: 500, color: 'var(--ink)', marginBottom: 2 }}>
              2FA is {is2FAEnabled ? 'enabled' : 'disabled'}
            </div>
            <div style={{ fontSize: '.7rem', color: 'var(--txt2)' }}>
              {is2FAEnabled
                ? `Enabled${enabledAt ? ` on ${new Date(enabledAt).toLocaleDateString()}` : ''} · ${backupRemaining} backup code${backupRemaining !== 1 ? 's' : ''} remaining`
                : 'Your account is protected by password only'}
            </div>
          </div>
        </div>
        <span className={`pf-badge ${is2FAEnabled ? 'pf-b-act' : 'pf-b-pend'}`}>
          {is2FAEnabled ? 'Active' : 'Off'}
        </span>
      </div>

      {/* How it works */}
      {!is2FAEnabled && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '.66rem', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>How it works</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['📲', 'Install Google Authenticator on your phone'],
              ['🔗', 'Scan the QR code to link your account'],
              ['🔢', 'Enter the 6-digit code each time you log in'],
            ].map(([icon, text]) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 6 }}>
                <span style={{ fontSize: '1rem' }}>{icon}</span>
                <span style={{ fontSize: '.78rem', color: 'var(--txt2)' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        {!is2FAEnabled ? (
          <button className="pf-btn-ink" onClick={() => setStep('intro')} style={{ flex: 1 }}>
            Set Up Two-Factor Auth →
          </button>
        ) : (
          <>
            <button
              className="pf-btn-ghost"
              onClick={() => setStep('disable-confirm')}
              style={{ flex: 1, borderColor: 'rgba(155,58,58,.3)', color: '#c0392b' }}
            >
              Disable 2FA
            </button>
          </>
        )}
        <button className="pf-btn-ghost" onClick={() => router.push('/profile')}>
          ← Back
        </button>
      </div>
    </div>
  );

  const IntroStep = () => (
    <div className="pf-card pf-cp" style={{ maxWidth: 580, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'rgba(184,147,90,.1)', border: '1px solid rgba(184,147,90,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <span style={{ fontSize: '1.8rem' }}>🔐</span>
        </div>
        <span className="pf-sec-label" style={{ justifyContent: 'center' }}>Step 1 of 3</span>
        <h2 className="pf-sec-title" style={{ marginBottom: 8, fontSize: '1.5rem' }}>Before you begin</h2>
        <p style={{ fontSize: '.8rem', color: 'var(--txt2)', lineHeight: 1.75 }}>
          You'll need an authenticator app installed on your phone. We recommend Google Authenticator.
        </p>
      </div>

      {/* App download links */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        {[
          { name: 'Google Authenticator', sub: 'iOS & Android', icon: '📱', url: 'https://support.google.com/accounts/answer/1066447' },
          { name: 'Microsoft Authenticator', sub: 'iOS & Android', icon: '🛡️', url: 'https://www.microsoft.com/en-us/security/mobile-authenticator-app' },
        ].map(app => (
          <a
            key={app.name}
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '14px 16px', background: 'var(--cream)', border: '1px solid var(--border)',
              borderRadius: 8, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, transition: 'border-color .2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <span style={{ fontSize: '1.4rem' }}>{app.icon}</span>
            <div>
              <div style={{ fontSize: '.76rem', fontWeight: 500, color: 'var(--ink)' }}>{app.name}</div>
              <div style={{ fontSize: '.65rem', color: 'var(--txt2)' }}>{app.sub}</div>
            </div>
          </a>
        ))}
      </div>

      <div style={{ background: 'rgba(74,103,65,.06)', border: '1px solid rgba(74,103,65,.2)', borderRadius: 8, padding: '12px 16px', marginBottom: 24 }}>
        <div style={{ fontSize: '.72rem', color: 'var(--sage)', lineHeight: 1.75 }}>
          ✓ Already have an authenticator app installed? You can proceed now.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="pf-btn-ink" onClick={startSetup} style={{ flex: 1 }}>Continue →</button>
        <button className="pf-btn-ghost" onClick={() => setStep('status')}>Cancel</button>
      </div>
    </div>
  );

  const QRStep = () => (
    <div className="pf-card pf-cp" style={{ maxWidth: 580, margin: '0 auto' }}>
      <span className="pf-sec-label">Step 2 of 3</span>
      <h2 className="pf-sec-title" style={{ marginBottom: 8, fontSize: '1.4rem' }}>Scan QR Code</h2>
      <p style={{ fontSize: '.8rem', color: 'var(--txt2)', lineHeight: 1.75, marginBottom: 24 }}>
        Open your authenticator app and scan this QR code. It will add ValutX to your app.
      </p>

      {/* QR Code display */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        {qrDataUrl ? (
          <div style={{
            display: 'inline-block', padding: 16,
            background: '#faf7f2', border: '2px solid rgba(184,147,90,.3)',
            borderRadius: 12,
            boxShadow: '0 4px 20px rgba(184,147,90,.12)',
          }}>
            <img src={qrDataUrl} alt="2FA QR Code" style={{ width: 200, height: 200, display: 'block' }} />
          </div>
        ) : (
          <div style={{
            width: 232, height: 232, margin: '0 auto',
            background: 'var(--parchment)', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid var(--border)',
          }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--gold)', borderTopColor: 'transparent', animation: 'spin2fa .8s linear infinite' }} />
          </div>
        )}
      </div>

      {/* Manual key option */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => setShowManualKey(v => !v)}
          style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: '.75rem', cursor: 'pointer', letterSpacing: '.05em', textDecoration: 'underline', textUnderlineOffset: 2 }}
        >
          {showManualKey ? '▲ Hide manual key' : "▼ Can't scan? Enter key manually"}
        </button>

        {showManualKey && secretFormatted && (
          <div style={{
            marginTop: 12, padding: '14px 16px',
            background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 8,
          }}>
            <div style={{ fontSize: '.62rem', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--txt2)', marginBottom: 6 }}>Account name</div>
            <div style={{ fontSize: '.82rem', fontWeight: 500, color: 'var(--ink)', marginBottom: 12 }}>ValutX</div>
            <div style={{ fontSize: '.62rem', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--txt2)', marginBottom: 6 }}>Secret key</div>
            <div style={{ fontFamily: 'monospace', fontSize: '.9rem', color: 'var(--gold)', letterSpacing: '.12em', wordBreak: 'break-all', marginBottom: 8 }}>{secretFormatted}</div>
            <div style={{ fontSize: '.68rem', color: 'var(--txt2)' }}>Time-based (TOTP) · SHA1 · 6 digits · 30 seconds</div>
          </div>
        )}
      </div>

      <div style={{ background: 'rgba(184,147,90,.05)', border: '1px solid var(--border)', borderRadius: 8, padding: '11px 14px', marginBottom: 24 }}>
        <div style={{ fontSize: '.72rem', color: 'var(--txt2)', lineHeight: 1.7 }}>
          📋 After scanning, your authenticator app will show a 6-digit code that changes every 30 seconds.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="pf-btn-ink" onClick={() => setStep('verify-setup')} style={{ flex: 1 }}>
          I've Scanned It →
        </button>
        <button className="pf-btn-ghost" onClick={() => setStep('intro')}>← Back</button>
      </div>
    </div>
  );

  const VerifySetupStep = () => (
    <div className="pf-card pf-cp" style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
      <span className="pf-sec-label" style={{ justifyContent: 'center' }}>Step 3 of 3</span>
      <h2 className="pf-sec-title" style={{ marginBottom: 8, fontSize: '1.4rem' }}>Verify Setup</h2>
      <p style={{ fontSize: '.8rem', color: 'var(--txt2)', lineHeight: 1.75, marginBottom: 28 }}>
        Enter the 6-digit code currently shown in your authenticator app to confirm the setup worked.
      </p>

      <div style={{ marginBottom: 28 }}>
        <div
          style={{ display: 'flex', gap: 8, justifyContent: 'center' }}
          onPaste={e => {
            e.preventDefault();
            const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            if (p.length === 6) { setSetupDigits(p.split('')); verifySetupCode(p); }
          }}
        >
          {setupDigits.map((d, i) => (
            <OTPDigitInput
              key={i} value={d} index={i} total={6}
              onchange={handleSetupDigit}
              onkeydown={handleSetupKeyDown}
              inputRef={el => { setupRefs.current[i] = el; }}
              shake={setupShake}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 10 }}>
          {setupDigits.map((d, i) => (
            <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: d ? 'var(--gold)' : 'var(--parchment)', border: '1px solid rgba(184,147,90,.3)', transition: 'background .2s' }} />
          ))}
        </div>
      </div>

      <div style={{ background: 'rgba(184,147,90,.05)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
        <div style={{ fontSize: '.7rem', color: 'var(--txt2)', lineHeight: 1.7 }}>
          ⏱ Code refreshes every 30 seconds. Make sure your device's clock is accurate.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="pf-btn-ghost" onClick={() => setStep('qr')} style={{ flex: 1 }}>← Back to QR</button>
      </div>
    </div>
  );

  const BackupCodesStep = () => (
    <div className="pf-card pf-cp" style={{ maxWidth: 540, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(155,58,58,.1)', border: '1px solid rgba(155,58,58,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '1.2rem' }}>⚠️</span>
        </div>
        <div>
          <div style={{ fontSize: '.66rem', letterSpacing: '.16em', textTransform: 'uppercase', color: '#c0392b', marginBottom: 2 }}>Critical — Save These Now</div>
          <h2 className="pf-sec-title" style={{ fontSize: '1.3rem', marginBottom: 0 }}>Backup Codes</h2>
        </div>
      </div>

      <p style={{ fontSize: '.79rem', color: 'var(--txt2)', lineHeight: 1.75, marginBottom: 20 }}>
        If you ever lose access to your authenticator app, use one of these codes to sign in. <strong style={{ color: 'var(--ink)' }}>Each code works only once.</strong> Store them somewhere safe.
      </p>

      {/* Backup codes grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 6, padding: '16px', marginBottom: 16,
        background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 8,
      }}>
        {newBackupCodes.map((code, i) => (
          <div key={i} style={{
            fontFamily: 'monospace', fontSize: '.88rem',
            color: 'var(--ink)', letterSpacing: '.1em',
            padding: '7px 10px', background: 'var(--parchment)',
            borderRadius: 4, textAlign: 'center',
            border: '1px solid rgba(184,147,90,.15)',
          }}>
            {code}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          className="pf-btn-ghost"
          style={{ flex: 1, fontSize: '.72rem', padding: '9px 14px' }}
          onClick={copyBackupCodes}
        >
          {copiedBackup ? '✓ Copied!' : '📋 Copy All'}
        </button>
        <button
          className="pf-btn-ghost"
          style={{ flex: 1, fontSize: '.72rem', padding: '9px 14px' }}
          onClick={downloadBackupCodes}
        >
          ⬇ Download .txt
        </button>
      </div>

      {/* Acknowledgment */}
      <label className="check-row" style={{ marginBottom: 20, background: 'rgba(155,58,58,.05)', border: '1px solid rgba(155,58,58,.18)', borderRadius: 8, padding: '12px 14px' }}>
        <input type="checkbox" checked={backupAcked} onChange={e => setBackupAcked(e.target.checked)} />
        <span className="check-label" style={{ color: 'var(--ink)', fontSize: '.79rem' }}>
          I have saved my backup codes in a secure location.
        </span>
      </label>

      <button
        className="pf-btn-ink"
        disabled={!backupAcked}
        onClick={() => { setStep('success'); setIs2FAEnabled(true); }}
        style={{ width: '100%' }}
      >
        Done — Finish Setup →
      </button>
    </div>
  );

  const SuccessStep = () => (
    <div className="pf-card pf-cp" style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(74,103,65,.1)', border: '1px solid rgba(74,103,65,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg width="32" height="36" viewBox="0 0 32 36" fill="none">
            <path d="M16 2L2 8v10c0 9 6 17 14 18 8-1 14-9 14-18V8L16 2z" fill="rgba(74,103,65,.15)" stroke="#4a6741" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M10 18l4.5 4.5L22 13" stroke="#4a6741" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="pf-sec-title" style={{ fontSize: '1.6rem', marginBottom: 8 }}>2FA Enabled!</h2>
        <p style={{ fontSize: '.8rem', color: 'var(--txt2)', lineHeight: 1.75 }}>
          Your account is now protected with two-factor authentication. You'll be asked for a code each time you sign in.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {[
          ['✓', 'Authenticator app linked'],
          ['✓', 'Backup codes saved'],
          ['✓', 'Account secured'],
        ].map(([icon, text]) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(74,103,65,.05)', border: '1px solid rgba(74,103,65,.15)', borderRadius: 6 }}>
            <span style={{ color: 'var(--sage)', fontWeight: 500 }}>{icon}</span>
            <span style={{ fontSize: '.78rem', color: 'var(--txt2)' }}>{text}</span>
          </div>
        ))}
      </div>

      <button className="pf-btn-ink" onClick={() => { setStep('status'); setIs2FAEnabled(true); }} style={{ width: '100%' }}>
        ← Return to Security Settings
      </button>
    </div>
  );

  const DisableConfirmStep = () => (
    <div className="pf-card pf-cp" style={{ maxWidth: 480, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(155,58,58,.1)', border: '1px solid rgba(155,58,58,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
            <path d="M9 2L1 5.5V10c0 5.5 3.5 10.5 8 12 4.5-1.5 8-6.5 8-12V5.5L9 2z" stroke="#c0392b" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M9 8v5M9 15h.01" stroke="#c0392b" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: '.66rem', letterSpacing: '.16em', textTransform: 'uppercase', color: '#c0392b', marginBottom: 2 }}>Danger Zone</div>
          <h2 className="pf-sec-title" style={{ fontSize: '1.3rem', marginBottom: 0 }}>Disable 2FA</h2>
        </div>
      </div>

      <div style={{ background: 'rgba(155,58,58,.05)', border: '1px solid rgba(155,58,58,.18)', borderRadius: 8, padding: '12px 14px', marginBottom: 24 }}>
        <div style={{ fontSize: '.75rem', color: '#9b3a3a', lineHeight: 1.7 }}>
          Disabling 2FA will make your account less secure. You will only need a password to sign in.
        </div>
      </div>

      <form onSubmit={handleDisable} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="pf-fg">
          <label className="pf-fl">Current Password</label>
          <div style={{ position: 'relative' }}>
            <input
              className="pf-fi"
              type={showDisablePassword ? 'text' : 'password'}
              placeholder="Your account password"
              value={disablePassword}
              onChange={e => setDisablePassword(e.target.value)}
              style={{ paddingRight: 40 }}
            />
            <button
              type="button"
              onClick={() => setShowDisablePassword(v => !v)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt2)', fontSize: '.75rem' }}
            >
              {showDisablePassword ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        <div className="pf-fg">
          <label className="pf-fl">Current 2FA Code</label>
          <input
            className="pf-fi"
            type="text"
            inputMode="numeric"
            maxLength={9}
            placeholder="000000 or XXXX-XXXX backup code"
            value={disableCode}
            onChange={e => setDisableCode(e.target.value)}
            style={{ letterSpacing: '.1em', textAlign: 'center' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="submit"
            disabled={disableLoading || !disablePassword || !disableCode}
            style={{
              flex: 1, padding: '12px', background: 'rgba(155,58,58,.9)', color: '#fff',
              border: '1px solid rgba(155,58,58,.5)', borderRadius: 4,
              fontFamily: "'DM Sans',sans-serif", fontSize: '.75rem', letterSpacing: '.1em',
              textTransform: 'uppercase', cursor: 'pointer', opacity: (!disablePassword || !disableCode) ? .5 : 1,
              transition: 'opacity .2s, background .2s',
            }}
          >
            {disableLoading ? 'Disabling…' : 'Confirm Disable 2FA'}
          </button>
          <button type="button" className="pf-btn-ghost" onClick={() => setStep('status')}>Cancel</button>
        </div>
      </form>
    </div>
  );

  /* ─────────────── MAIN RENDER ─────────────── */
  return (
    <>
      {loading && <ValutXLoader pageName="Security" />}
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: .04, width: '100%', height: '100%' }} />
      <div className={`pf-toast${toast.show ? ' show' : ''}${toast.type ? ' ' + toast.type : ''}`}>{toast.msg}</div>
      <UserSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="pf-layout">
        {/* Mobile topbar */}
        <div className="pf-topbar">
          <button className="pf-hamburger" onClick={() => setSidebarOpen(true)}><span /><span /><span /></button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="pf-logo-mark" style={{ width: 26, height: 26 }} />
            <span className="pf-logo-text" style={{ fontSize: '1.15rem' }}>Valut<span>X</span></span>
          </div>
          <div style={{ width: 32 }} />
        </div>

        <div className="pf-main">
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: '.72rem', color: 'var(--txt2)' }}>
              <button onClick={() => router.push('/profile')} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: '.72rem', letterSpacing: '.06em' }}>Profile</button>
              <span>›</span>
              <span>Security</span>
              <span>›</span>
              <span style={{ color: 'var(--ink)' }}>Two-Factor Authentication</span>
            </div>

            {/* Step content */}
            {step === 'status'        && <StatusCard />}
            {step === 'intro'         && <IntroStep />}
            {step === 'qr'            && <QRStep />}
            {step === 'verify-setup'  && <VerifySetupStep />}
            {step === 'backup-codes'  && <BackupCodesStep />}
            {step === 'success'       && <SuccessStep />}
            {step === 'disable-confirm' && <DisableConfirmStep />}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin2fa { to { transform: rotate(360deg); } }
        @keyframes shake2fa {
          0%,100% { transform: translateX(0); }
          15%     { transform: translateX(-7px); }
          30%     { transform: translateX(7px); }
          45%     { transform: translateX(-5px); }
          60%     { transform: translateX(5px); }
        }
        /* Fix check-row in pf context */
        .check-row { display: flex; align-items: flex-start; gap: 10px; cursor: pointer; }
        .check-row input[type="checkbox"] { width: 16px; height: 16px; flex-shrink: 0; margin-top: 2px; accent-color: var(--gold); cursor: pointer; }
        .check-label { font-size: .78rem; color: var(--text-sec); line-height: 1.55; }
      `}</style>
    </>
  );
}
