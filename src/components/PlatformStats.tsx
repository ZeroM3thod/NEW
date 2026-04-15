'use client';
const statCards = [
  { trend: '↑ Active', number: '50', suffix: 'K+', desc: 'Verified Investors' },
  { trend: '↑ Growing', number: '10', suffix: 'M+', desc: 'USDT Total Invested' },
  { trend: 'Last Season', number: '28', suffix: '.4%', desc: 'Season 2 ROI' },
  { trend: 'All Time', number: '14.2', suffix: 'M+', desc: 'USDT Paid Out' },
];

export default function PlatformStats() {
  return (
    <>
      <section className="platform-stats">
        <div className="inner">
          <div className="stats-text reveal">
            <span className="section-label">Platform Performance</span>
            <h2 className="section-title">
              Numbers that
              <br />
              speak for themselves
            </h2>
            <p className="section-sub">
              Since our first season, we have maintained consistent returns, full
              transparency, and zero withdrawal failures.
            </p>
          </div>
          <div className="stats-grid reveal">
            {statCards.map((card, i) => (
              <div key={i} className="stat-card">
                <div className="stat-trend">{card.trend}</div>
                <div className="stat-number">
                  {card.number}
                  <span>{card.suffix}</span>
                </div>
                <div className="stat-desc">{card.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <style jsx>{`
        .platform-stats {
          padding: 100px 5%;
          background: var(--surface);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        .inner {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px 80px;
          align-items: center;
        }
        .stats-text .section-sub { max-width: 380px; }
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2px;
        }
        .stat-card {
          background: var(--cream);
          border: 1px solid var(--border);
          padding: 28px 24px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s;
        }
        .stat-card:hover { border-color: var(--gold); }
        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 2px;
          height: 0;
          background: var(--gold);
          transition: height 0.4s;
        }
        .stat-card:hover::before { height: 100%; }
        .stat-number {
          font-family: 'Cormorant Garamond', serif;
          font-size: 2.4rem;
          font-weight: 500;
          color: var(--ink);
          line-height: 1;
          margin-bottom: 8px;
        }
        .stat-number span { color: var(--gold); }
        .stat-desc {
          font-size: 0.75rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-secondary);
        }
        .stat-trend {
          position: absolute;
          top: 16px;
          right: 16px;
          font-size: 0.7rem;
          color: var(--sage);
          background: rgba(74, 103, 65, 0.08);
          padding: 3px 8px;
          border-radius: 100px;
        }
        @media (max-width: 900px) {
          .inner { grid-template-columns: 1fr; gap: 40px; }
        }
        @media (max-width: 560px) {
          .stats-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </>
  );
}
