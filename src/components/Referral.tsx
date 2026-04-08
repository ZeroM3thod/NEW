'use client';
import { useRouter } from 'next/navigation';



const refCards = [
  {
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--gold)">
        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
      </svg>
    ),
    title: 'You refer a friend',
    sub: 'They sign up and invest in a season',
    badge: null,
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--gold)">
        <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-7 3a2 2 0 110 4 2 2 0 010-4zm4 12H8v-.75C8 15.45 10 14 12 14s4 1.45 4 3.25V18z" />
      </svg>
    ),
    title: 'They make Profits',
    sub: 'At the end of their investment season',
    badge: null,
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--gold)">
        <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
      </svg>
    ),
    title: 'You earn instantly',
    sub: '7% of their Profits, auto-credited',
    badge: '7%',
  },
];

export default function Referral() {
  const router = useRouter();
  

  return (
    <>
      <section className="referral">
        <div className="referral-inner">
          <div className="reveal">
            <span className="section-label">Referral Programme</span>
            <h2 className="section-title">
              Earn while
              <br />
              others grow
            </h2>
            <p className="section-sub">
              Every time someone you referred makes a profit, you earn 7% of
              that amount — automatically, with no limits.
            </p>
            <br />
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              Share your unique referral code. When your referee make
              profits, 7% is credited to your VaultX wallet instantly. Stack
              referrals with no cap — the more you refer, the more you passively
              earn.
            </p>
            <br />
            <button
              className="btn-lg"
              style={{ marginTop: '8px' }}
              onClick={() => router.push('/auth')}
            >
              Get My Referral Code
            </button>
          </div>

          <div className="referral-visual reveal">
            {refCards.map((card, i) => (
              <div key={i} className="ref-card">
                <div className="ref-icon">{card.icon}</div>
                <div className="ref-info">
                  <strong>{card.title}</strong>
                  <span>{card.sub}</span>
                </div>
                {card.badge && <div className="ref-badge">{card.badge}</div>}
              </div>
            ))}
            <div className="commission-box">
              <div className="commission-num">7%</div>
              <div className="commission-text">
                <strong>Commission Per Referral</strong>
                <span>
                  No cap. No delays. Paid automatically
                  <br />
                  to your VaultX wallet.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        .referral {
          padding: 100px 5%;
          background: var(--parchment);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        .referral-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: center;
        }
        .referral-visual {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .ref-card {
          background: var(--cream);
          border: 1px solid var(--border);
          padding: 22px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: all 0.3s;
        }
        .ref-card:hover {
          border-color: var(--gold);
          transform: translateX(6px);
        }
        .ref-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--radius);
          background: var(--ink);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .ref-info { flex: 1; }
        .ref-info strong {
          display: block;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--ink);
          margin-bottom: 2px;
        }
        .ref-info span {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        .ref-badge {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.4rem;
          font-weight: 500;
          color: var(--sage);
        }
        .commission-box {
          background: var(--ink);
          padding: 32px 28px;
          margin-top: 2px;
          border: 1px solid var(--ink);
          display: flex;
          align-items: center;
          gap: 24px;
        }
        .commission-num {
          font-family: 'Cormorant Garamond', serif;
          font-size: 3.5rem;
          font-weight: 300;
          color: var(--gold-light);
          line-height: 1;
        }
        .commission-text strong {
          display: block;
          color: var(--cream);
          font-size: 0.9rem;
          margin-bottom: 4px;
        }
        .commission-text span {
          font-size: 0.75rem;
          color: rgba(246, 241, 233, 0.5);
          line-height: 1.6;
        }
        @media (max-width: 900px) {
          .referral-inner { grid-template-columns: 1fr; gap: 40px; }
        }
      `}</style>
    </>
  );
}
