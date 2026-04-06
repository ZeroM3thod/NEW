'use client';

import { useRouter } from 'next/navigation';

export default function Hero() {
  const router = useRouter();

  const scrollToSeasons = () => {
    document.getElementById('seasons')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-badge">Season 4 Now Open — Limited Slots</div>
          <h1>
            Where Capital
            <br />
            Meets <em>Discipline</em>
          </h1>
          <p>
            VaultX runs structured investment seasons with defined entry periods,
            transparent ROI targets, and no hidden fees. Grow your wealth the
            intelligent way.
          </p>
          <div className="hero-cta">
            <button className="btn-lg" onClick={() => router.push('/auth')}>
              Start Investing
            </button>
            <button className="btn-outline-lg" onClick={scrollToSeasons}>
              View Seasons
            </button>
          </div>
        </div>
      </section>

      <style jsx>{`
        .hero {
          position: relative;
          z-index: 2;
          min-height: 100svh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 100px 5% 80px;
        }
        .hero-inner {
          max-width: 900px;
          width: 100%;
          text-align: center;
        }
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(184, 147, 90, 0.1);
          border: 1px solid rgba(184, 147, 90, 0.25);
          padding: 6px 16px;
          border-radius: 100px;
          font-size: 0.72rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 36px;
          animation: fadeUp 0.8s ease both;
        }
        .hero-badge::before {
          content: '';
          width: 6px;
          height: 6px;
          background: var(--gold);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        .hero h1 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(2.6rem, 7vw, 5rem);
          font-weight: 400;
          line-height: 1.12;
          letter-spacing: -0.01em;
          color: var(--ink);
          margin-bottom: 28px;
          animation: fadeUp 0.8s 0.1s ease both;
        }
        .hero h1 em {
          font-style: italic;
          color: var(--gold);
        }
        .hero p {
          font-size: clamp(0.9rem, 2.5vw, 1.05rem);
          color: var(--text-secondary);
          font-weight: 300;
          line-height: 1.8;
          max-width: 520px;
          margin: 0 auto 44px;
          animation: fadeUp 0.8s 0.2s ease both;
        }
        .hero-cta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          flex-wrap: wrap;
          animation: fadeUp 0.8s 0.3s ease both;
        }
        @media (max-width: 560px) {
          .hero-cta { flex-direction: column; width: 100%; }
        }
      `}</style>
    </>
  );
}
