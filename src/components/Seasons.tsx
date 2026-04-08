'use client';

import { useRouter } from 'next/navigation';

const pastSeasons = [
  {
    tag: 'Completed',
    name: 'Season One',
    period: 'Jan 2023 — Apr 2023',
    roi: '+18.2%',
    roiLabel: 'Final ROI',
    details: [
      { label: 'Total Pool', value: '$12M' },
      { label: 'Investors', value: '8,400' },
      { label: 'Duration', value: '90 Days' },
    ],
  },
  {
    tag: 'Completed',
    name: 'Season Two',
    period: 'Jun 2023 — Sep 2023',
    roi: '+23.7%',
    roiLabel: 'Final ROI',
    details: [
      { label: 'Total Pool', value: '$31M' },
      { label: 'Investors', value: '19,200' },
      { label: 'Duration', value: '90 Days' },
    ],
  },
  {
    tag: 'Runing',
    name: 'Season Three',
    period: 'Nov 2023 — Feb 2024',
    roi: '+24–32%',
    roiLabel: 'Expected ROI',
    details: [
      { label: 'Total Pool', value: '$57M' },
      { label: 'Investors', value: '34,800' },
      { label: 'Duration', value: '90 Days' },
    ],
  },
];

export default function Seasons() {
  const router = useRouter();

  return (
    <>
      <section className="seasons" id="seasons">
        <div className="seasons-inner">
          <div className="seasons-header reveal">
            <div>
              <span className="section-label">Investment Seasons</span>
              <h2 className="section-title">
                Structured cycles,
                <br />
                predictable returns
              </h2>
            </div>
            <button className="btn-primary" onClick={() => router.push('/auth')}>
              Join Season 4
            </button>
          </div>

          <div className="seasons-grid reveal">
            {pastSeasons.map((s, i) => (
              <div key={i} className="season-card">
                <div className="season-tag">{s.tag}</div>
                <div className="season-name">{s.name}</div>
                <div className="season-period">{s.period}</div>
                <div className="season-roi">{s.roi}</div>
                <div className="season-roi-label">{s.roiLabel}</div>
                <div className="season-detail">
                  {s.details.map((d, j) => (
                    <div key={j} className="season-detail-item">
                      <span>{d.label}</span>
                      <strong>{d.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Active Season 4 */}
            <div className="season-card active season-card--full">
              <div className="season-tag">Now Open · Limited Slots</div>
              <div className="season4-body">
                <div>
                  <div className="season-name">Season Four</div>
                  <div className="season-period">
                    May 2025 — Aug 2025 · Entries close in 18 days
                  </div>
                  <div className="season-roi">+24–32%</div>
                  <div className="season-roi-label">Projected ROI Range</div>
                </div>
                <button
                  className="btn-primary"
                  style={{ whiteSpace: 'nowrap', padding: '12px 28px' }}
                  onClick={() => router.push('/auth')}
                >
                  Invest Now
                </button>
              </div>
              <div className="season-detail" style={{ marginTop: '20px' }}>
                {[
                  { label: 'Min. Entry', value: '$100 USDT' },
                  { label: 'Pool Cap', value: '$80M' },
                  { label: 'Duration', value: '90 Days' },
                  { label: 'Referral Bonus', value: '5% / Withdrawal' },
                ].map((d, i) => (
                  <div key={i} className="season-detail-item">
                    <span style={{ color: 'rgba(246,241,233,0.4)' }}>{d.label}</span>
                    <strong>{d.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        .seasons { padding: 100px 5%; }
        .seasons-inner { max-width: 1200px; margin: 0 auto; }
        .seasons-header {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: end;
          gap: 20px;
          margin-bottom: 56px;
        }
        .seasons-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2px;
        }
        .season-card {
          background: var(--surface);
          border: 1px solid var(--border);
          padding: 36px 28px;
          position: relative;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.35s;
        }
        .season-card::after {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--ink);
          opacity: 0;
          transition: opacity 0.35s;
          z-index: 0;
        }
        .season-card:hover::after { opacity: 0.03; }
        .season-card > * { position: relative; z-index: 1; }
        .season-card.active {
          background: var(--ink);
          border-color: var(--ink);
        }
        .season-card.active * { color: var(--cream) !important; }
        .season-card.active .season-tag {
          background: rgba(255, 255, 255, 0.1);
          color: var(--gold-light) !important;
        }
        .season-card.active .season-roi { color: var(--gold-light) !important; }
        .season-card--full { grid-column: span 3; }

        .season-tag {
          display: inline-block;
          font-size: 0.65rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 100px;
          background: rgba(184, 147, 90, 0.1);
          color: var(--gold);
          margin-bottom: 20px;
        }
        .season-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.6rem;
          font-weight: 500;
          color: var(--ink);
          margin-bottom: 6px;
        }
        .season-period {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-bottom: 28px;
          letter-spacing: 0.05em;
        }
        .season-roi {
          font-family: 'Cormorant Garamond', serif;
          font-size: 2.8rem;
          font-weight: 300;
          color: var(--sage);
          line-height: 1;
          margin-bottom: 4px;
        }
        .season-roi-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-secondary);
          margin-bottom: 24px;
        }
        .season-detail {
          display: flex;
          justify-content: space-between;
          padding-top: 20px;
          border-top: 1px solid var(--border);
        }
        .season-card.active .season-detail { border-color: rgba(255, 255, 255, 0.1); }
        .season-detail-item span {
          display: block;
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }
        .season-detail-item strong {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--ink);
        }
        .season4-body {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 20px;
          align-items: start;
        }

        @media (max-width: 900px) {
          .seasons-grid { grid-template-columns: 1fr; }
          .seasons-header { grid-template-columns: 1fr; }
          .season-card--full { grid-column: span 1; }
          .season4-body { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}
