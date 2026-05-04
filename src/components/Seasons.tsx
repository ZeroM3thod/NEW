'use client';
import { useRouter } from 'next/navigation';

export default function Seasons() {
  const router = useRouter();

  return (
    <>
      <section className="seasons" id="seasons">
        <div className="seasons-inner">

          {/* ── HEADER ── */}
          <div className="seasons-header reveal">
            <div>
              <span className="section-label">Investment Seasons</span>
              <h2 className="section-title">Structured cycles,<br />predictable returns</h2>
            </div>
            <button className="btn-primary" onClick={() => router.push('/auth/signup')}>
              Join Season 111
            </button>
          </div>

          {/* ── GRID ── */}
          <div className="seasons-grid reveal">

            {/* Season One */}
            <div className="season-card">
              <div className="season-tag">Completed</div>
              <div className="season-name">Season 108</div>
               <div className="season-period">19 Apr 2026 — 24 Apr 2026</div>
              <div className="season-roi">+13.3%</div>
              <div className="season-roi-label">Final ROI</div>
              <div className="season-detail">
                <div className="season-detail-item">
                  <span>Total Pool</span>
                  <strong>$500K</strong>
                </div>
                <div className="season-detail-item">
                  <span>Investors</span>
                  <strong>19,200</strong>
                </div>
                <div className="season-detail-item">
                  <span>Duration</span>
                  <strong>4 Days</strong>
                </div>
              </div>
            </div>

            {/* Season Two */}
            <div className="season-card">
              <div className="season-tag">Completed</div>
              <div className="season-name">Season 109</div>
              <div className="season-period">26 Apr 2026 — 01 May 2026</div>
              <div className="season-roi">+21.6%</div>
              <div className="season-roi-label">Final ROI</div>
              <div className="season-detail">
                <div className="season-detail-item">
                  <span>Total Pool</span>
                  <strong>$500K</strong>
                </div>
                <div className="season-detail-item">
                  <span>Investors</span>
                  <strong>28,200</strong>
                </div>
                <div className="season-detail-item">
                  <span>Duration</span>
                  <strong>4 Days</strong>
                </div>
              </div>
            </div>

            {/* Season Three */}
            <div className="season-card">
              <div className="season-tag">Running</div>
              <div className="season-name">Season 110</div>
              <div className="season-period">3 May 2026 — 8 May 2026</div>
              <div className="season-roi">16%-32%</div>
              <div className="season-roi-label">Projected ROI Range</div>
              <div className="season-detail">
                <div className="season-detail-item">
                  <span>Total Pool</span>
                  <strong>$300K</strong>
                </div>
                <div className="season-detail-item">
                  <span>Investors</span>
                  <strong>34,800</strong>
                </div>
                <div className="season-detail-item">
                  <span>Duration</span>
                  <strong>4 Days</strong>
                </div>
              </div>
            </div>

            {/* Season Four — active / full-width on desktop */}
            <div className="season-card active season-card--full">
              <div className="season-tag">Now Open · Limited Slots</div>

              <div className="season4-body">
                <div>
                  <div className="season-name">Season 111</div>
                  <div className="season-period">
                   10 May 2026 — 15 May 2026 · Limited entry window
                  </div>
                  <div className="season-roi">12%-24%</div>
                  <div className="season-roi-label">Projected ROI Range</div>
                </div>
                <button
                  className="btn-primary season4-cta"
                  onClick={() => router.push('/season')}
                >
                  Invest Now
                </button>
              </div>

              <div className="season-detail season-detail--active">
                <div className="season-detail-item">
                  <span className="detail-label-dark">Min. Entry</span>
                  <strong>$30 USDT</strong>
                </div>
                <div className="season-detail-item">
                  <span className="detail-label-dark">Pool Cap</span>
                  <strong>$800K</strong>
                </div>
                <div className="season-detail-item">
                  <span className="detail-label-dark">Duration</span>
                  <strong>4 Days</strong>
                </div>
                <div className="season-detail-item">
                  <span className="detail-label-dark">Referral Bonus</span>
                  <strong>15% Profit Share</strong>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <style jsx>{`
        /* ── SECTION ── */
        .seasons {
          padding: 100px 5%;
        }
        .seasons-inner {
          max-width: 1200px;
          margin: 0 auto;
        }

        /* ── HEADER ── */
        .seasons-header {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: end;
          gap: 20px;
          margin-bottom: 56px;
        }

        /* ── GRID ── */
        .seasons-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2px;
        }

        /* ── CARD BASE ── */
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

        /* ── ACTIVE CARD ── */
        .season-card.active {
          background: var(--ink);
          border-color: var(--ink);
        }
        .season-card.active * { color: var(--cream) !important; }
        .season-card.active .season-tag {
          background: rgba(255,255,255,0.1);
          color: var(--gold-light) !important;
        }
        .season-card.active .season-roi {
          color: var(--gold-light) !important;
        }

        /* Season 4 spans all 3 cols on desktop */
        .season-card--full { grid-column: span 3; }

        /* ── CARD CONTENT ── */
        .season-tag {
          display: inline-block;
          font-size: 0.65rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 100px;
          background: rgba(184,147,90,0.1);
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

        /* ── DETAIL ROW ── */
        .season-detail {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          padding-top: 20px;
          border-top: 1px solid var(--border);
        }
        .season-card.active .season-detail {
          border-color: rgba(255,255,255,0.1);
        }
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
        .detail-label-dark {
          color: rgba(246,241,233,0.4) !important;
        }

        /* ── SEASON 4 TWO-COL BODY ── */
        .season4-body {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 20px;
          align-items: start;
        }
        .season4-cta {
          white-space: nowrap;
          padding: 12px 28px;
          flex-shrink: 0;
        }
        .season-detail--active {
          margin-top: 20px;
        }

        /* ═══════════════
           RESPONSIVE
        ═══════════════ */
        @media (max-width: 900px) {
          /* Header stacks */
          .seasons-header {
            grid-template-columns: 1fr;
          }

          /* All cards single column — Season 4 no longer spans */
          .seasons-grid {
            grid-template-columns: 1fr;
          }
          .season-card--full {
            grid-column: span 1;
          }

          /* Season 4 inner body stacks */
          .season4-body {
            grid-template-columns: 1fr;
          }
          .season4-cta {
            width: 100%;
            text-align: center;
          }
        }

        @media (max-width: 560px) {
          /* Wrap detail items into 2-col mini grid */
          .season-detail {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </>
  );
}