const stats = [
  { label: 'Active Investors', value: '50,000+' },
  { label: 'USDT Invested', value: '100M+' },
  { label: 'Season 3 ROI', value: '+28.4%' },
  { label: 'Paid Out', value: '$4.2M+' },
  { label: 'Referral Rate', value: '5% Per Withdrawal' },
  { label: 'On-Time Payouts', value: '99.8%' },
  { label: 'Season 4', value: 'Now Live' },
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
      <div className="stats-bar">
        <div className="stats-track">
          <TickerItems />
          {/* Duplicate for seamless loop */}
          <TickerItems />
        </div>
      </div>

      <style jsx>{`
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
          animation: scroll 25s linear infinite;
          width: max-content;
        }
        .stats-track:hover {
          animation-play-state: paused;
        }
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
        .stat-item strong {
          color: var(--gold-light);
        }
        .stat-sep {
          width: 4px;
          height: 4px;
          background: var(--gold);
          border-radius: 50%;
          opacity: 0.5;
          flex-shrink: 0;
        }
      `}</style>
    </>
  );
}
