'use client';

const stats = [
  { label: 'Active Investors', value: '50,000+' },
  { label: 'USDT Invested', value: '100M+' },
  { label: 'Season 108 ROI', value: '+13.3%' },
  { label: 'Paid Out', value: '$14.2M+' },
  { label: 'Referral Rate', value: '15% Of Profit' },
  { label: 'On-Time Payouts', value: '99.8%' },
  { label: 'Season 110', value: 'Now Live' },
];

function TickerItems() {
  return (
    <>
      {stats.map((s, i) => (
        <span key={i} style={{ display: 'contents' }}>
          <div className="stat-item">
            <strong>{s.value}</strong> {s.label}
          </div>
          <div className="stat-sep" />
        </span>
      ))}
    </>
  );
}

export default function StatsTicker() {
  return (
    <>
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .stats-bar {
          position: relative;
          z-index: 2;
          background: var(--ink);
          padding: 16px 5%;
          overflow: hidden;
        }
        .stats-track {
          display: flex;
          gap: 60px;
          animation: ticker-scroll 25s linear infinite;
          width: max-content;
        }
        .stats-track:hover { animation-play-state: paused; }
        .stat-item {
          display: flex;
          align-items: center;
          gap: 10px;
          white-space: nowrap;
          color: var(--cream);
          font-size: 0.78rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .stat-item strong { color: var(--gold-light); }
        .stat-sep {
          width: 4px;
          height: 4px;
          background: var(--gold);
          border-radius: 50%;
          opacity: 0.5;
          flex-shrink: 0;
        }
      `}</style>
      <div className="stats-bar">
        <div className="stats-track">
          <TickerItems />
          <TickerItems />
        </div>
      </div>
    </>
  );
}