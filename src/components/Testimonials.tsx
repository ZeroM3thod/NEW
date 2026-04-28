'use client';

const testimonials = [
  {
    initials: 'RM',
    name: 'Rafiqul Molla',
    role: 'Investor since Season 2 · Dhaka',
    roi: '+23.4%',
    text: 'I was skeptical at first — every platform promises returns. But ValutX delivered exactly what Season 2 projected. Withdrew 23.4% on top of my principal without a single issue. I am now in Season 4 with three times my original stake.',
  },
  {
    initials: 'SN',
    name: 'Sharmin Nahar',
    role: 'Referral Earner · Chittagong',
    roi: '+15% ×5',
    text: 'The referral system is genuinely passive income. I referred five colleagues from my office. Every time one of them profits, I get credited automatically. Last month alone I earned extra just from referrals.',
  },
  {
    initials: 'AH',
    name: 'Aminul Hossain',
    role: 'Investor since Season 1 · Sylhet',
    roi: '+28.1%',
    text: 'Season 2 gave me the confidence to invest more seriously. The platform is transparent — you see the pool size, the projected ROI, and the exact end date. That clarity is rare. Already locked in for Season 4.',
  },
  {
    initials: 'FK',
    name: 'Farzana Khanam',
    role: 'First-time Investor · Rajshahi',
    roi: '+18.2%',
    text: 'As a small investor starting with just $200, I appreciated that ValutX has no minimum pressure. The returns were proportional, the withdrawal was fast, and customer support actually responded within hours.',
  },
  {
    initials: 'MR',
    name: 'Mostafizur Rahman',
    role: 'International Investor · Khulna',
    roi: '+26.8%',
    text: 'I have used similar platforms in Malaysia and Singapore. ValutX is comparable in professionalism — maybe better in terms of communication. The season-based model removes emotional trading decisions entirely.',
  },
  {
    initials: 'NB',
    name: 'Nasreen Begum',
    role: 'Repeat Investor · Mymensingh',
    roi: '+27.9%',
    text: 'My husband and I both invested in Season 3 independently. We both received our returns on the same day, right at the 90-day mark. The consistency here is something we tell everyone in our circle about.',
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
