'use client';

const testimonials = [
 {
    initials: 'JM',
    name: 'James Mitchell',
    role: 'Investor since 2024 · Texas, USA',
    roi: '+21.7%',
    text: 'I have tried a dozen investment platforms in the States. ValutX stands out because of the transparency — you know exactly when the season ends and what to expect. Got my 21.7% in 4 days flat. Already compounding into the next round.',
  },
  {
    initials: 'OA',
    name: 'Omar Al-Rashidi',
    role: 'Investor since 2024 · Dubai, UAE',
    roi: '+25.3%',
    text: 'In Dubai the investment culture is fast-paced and we expect results, not promises. ValutX matched that energy perfectly. The 4-day season is ideal for someone like me who does not want capital locked up for months. Solid platform.',
  },
  {
    initials: 'LC',
    name: 'Lucas Carvalho',
    role: 'Investor since 2024 · São Paulo, Brazil',
    roi: '+19.8%',
    text: 'Finding a trustworthy international platform from Brazil is not easy. ValutX made the process smooth from deposit to withdrawal. The 4-day turnaround is incredible — I have reinvested four times already since joining in 2024.',
  },
  {
    initials: 'WL',
    name: 'Wei Liang',
    role: 'Referral Earner · Kuala Lumpur, Malaysia',
    roi: '+15% refs',
    text: 'The referral program alone is worth it. I brought in six friends from my network and I earn 15% of their profits automatically every season. Combined with my own returns, ValutX has become a serious income stream for me.',
  },
  {
    initials: 'PS',
    name: 'Priya Subramaniam',
    role: 'Investor since 2024 · Singapore',
    roi: '+27.1%',
    text: 'Singapore investors are particular about due diligence. What won me over was the visible pool size, the fixed end date, and the clear ROI projection before you even commit. Withdrew 27.1% after just 4 days. Reinvested immediately.',
  },
  {
    initials: 'RM',
    name: 'Rafiqul Molla',
    role: 'Investor since 2024 · Dhaka, Bangladesh',
    roi: '+23.4%',
    text: 'I was skeptical at first — every platform promises returns. But ValutX delivered exactly what was projected. In just 4 days I withdrew 23.4% on top of my principal without a single issue. I have now reinvested three times my original stake.',
  },
{
  initials: 'TO',
  name: 'Tunde Okafor',
  role: 'Investor since 2024 · Johannesburg, South Africa',
  roi: '+21.4%',
  text: 'South Africa has no shortage of investment scams, so I did my research thoroughly before committing. ValutX passed every check — transparent pool, fixed end date, real payouts. My 4-day season closed at 21.4% and the withdrawal was instant. I am in for the long run.',
},
];

export default function Testimonials() {
  return (
    <>
      <section className="testimonials">
        <div className="testi-inner">
          <div className="testi-header reveal">
            <span className="section-label">Testimonials</span>
            <h2 className="section-title">Words from our investors</h2>
            <p className="section-sub">
              Real people, real returns. Here is what our community has to say.
            </p>
          </div>
          <div className="testi-grid reveal">
            {testimonials.map((t, i) => (
              <div key={i} className="testi-card">
                <div className="testi-stars">
                  {'★★★★★'.split('').map((star, j) => (
                    <span key={j}>{star}</span>
                  ))}
                </div>
                <p className="testi-text">&ldquo;{t.text}&rdquo;</p>
                <div className="testi-author">
                  <div className="testi-avatar">{t.initials}</div>
                  <div>
                    <div className="testi-name">{t.name}</div>
                    <div className="testi-role">{t.role}</div>
                  </div>
                  <div className="testi-roi">{t.roi}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <style jsx>{`
        .testimonials {
          padding: 100px 5%;
          background: var(--surface);
        }
        .testi-inner { max-width: 1200px; margin: 0 auto; }
        .testi-header { text-align: center; margin-bottom: 60px; }
        .testi-header :global(.section-sub) { max-width: 400px; margin: 14px auto 0; }
        .testi-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2px;
        }
        .testi-card {
          background: var(--cream);
          border: 1px solid var(--border);
          padding: 32px 28px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s;
        }
        .testi-card:hover { border-color: var(--gold); }
        .testi-card::before {
          content: '\u201C';
          position: absolute;
          top: -10px;
          right: 20px;
          font-family: 'Cormorant Garamond', serif;
          font-size: 8rem;
          font-weight: 600;
          color: rgba(184, 147, 90, 0.07);
          line-height: 1;
          pointer-events: none;
        }
        .testi-stars {
          display: flex;
          gap: 3px;
          margin-bottom: 18px;
        }
        .testi-stars span { color: var(--gold); font-size: 0.8rem; }
        .testi-text {
          font-size: 0.85rem;
          color: var(--ink);
          line-height: 1.8;
          font-weight: 300;
          margin-bottom: 24px;
          font-style: italic;
        }
        .testi-author {
          display: flex;
          align-items: center;
          gap: 12px;
          border-top: 1px solid var(--border);
          padding-top: 20px;
        }
        .testi-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--parchment);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Cormorant Garamond', serif;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--gold);
          flex-shrink: 0;
        }
        .testi-name { font-size: 0.82rem; font-weight: 500; color: var(--ink); }
        .testi-role { font-size: 0.72rem; color: var(--text-secondary); letter-spacing: 0.04em; }
        .testi-roi {
          margin-left: auto;
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.4rem;
          font-weight: 500;
          color: var(--sage);
        }
        @media (max-width: 900px) {
          .testi-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}
