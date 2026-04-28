'use client';

import { useEffect, useRef } from 'react';

const testimonials = [
  {
    initials: 'RM',
    name: 'Rafiqul Molla',
    role: 'Investor since 2024 · Dhaka, Bangladesh',
    roi: '+23.4%',
    text: 'I was skeptical at first — every platform promises returns. But ValutX delivered exactly what was projected. In just 4 days I withdrew 23.4% on top of my principal without a single issue. I have now reinvested three times my original stake.',
  },
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
    initials: 'AK',
    name: 'Andrei Kovalenko',
    role: 'Investor since 2024 · Toronto, Canada',
    roi: '+22.6%',
    text: 'A colleague in Dubai recommended ValutX to me. I tested it with a small amount first — 4 days later I had my principal plus 22.6% back in my wallet. I scaled up the next season. The short cycle is what makes this different from everything else.',
  },
  {
    initials: 'ET',
    name: 'Ethan Clarke',
    role: 'Investor since 2024 · London, UK',
    roi: '+20.9%',
    text: 'The UK market is saturated with investment noise. ValutX cuts through all of that — clear terms, short seasons, and actual payouts. I was fully paid out in 4 days with 20.9% gain. Already referred two friends from my trading group.',
  },
  {
    initials: 'HN',
    name: 'Hannah Nguyen',
    role: 'Investor since 2024 · Sydney, Australia',
    roi: '+24.5%',
    text: 'I joined on a recommendation from an online investing community. The 4-day season felt almost too short to believe — but the returns hit exactly as promised. ValutX has become my go-to platform for quick, high-confidence cycles.',
  },
  {
    initials: 'FM',
    name: 'Florian Müller',
    role: 'Investor since 2024 · Berlin, Germany',
    roi: '+23.0%',
    text: 'Germans are known for being careful with money, and rightly so. I spent two weeks researching ValutX before investing. Everything checked out — the mechanics are sound, the transparency is real, and my 23% return was on schedule.',
  },
  {
    initials: 'RV',
    name: 'Rohan Verma',
    role: 'Referral Earner · Mumbai, India',
    roi: '+15% refs',
    text: 'I built a small referral network across my city and the 15% commission on profits is no joke. Every season my referral income stacks on top of my own investment returns. ValutX is the most rewarding platform I have used in India.',
  },
  {
    initials: 'KA',
    name: 'Kwame Asante',
    role: 'Investor since 2024 · Lagos, Nigeria',
    roi: '+26.2%',
    text: 'Access to global investment platforms from Nigeria is not always easy. ValutX works seamlessly, pays out fast, and the 4-day season means my money is never tied up for long. I cleared 26.2% this season. Extremely satisfied.',
  },
  {
    initials: 'MC',
    name: 'Maria Cruz',
    role: 'Investor since 2024 · Manila, Philippines',
    roi: '+18.9%',
    text: 'I was introduced to ValutX through a Facebook group for OFW investors. The platform is clean, the instructions are clear, and the payout was faster than I expected. For someone investing remotely, that kind of reliability means everything.',
  },
  {
    initials: 'BR',
    name: 'Budi Rahardjo',
    role: 'Investor since 2024 · Jakarta, Indonesia',
    roi: '+22.1%',
    text: 'Indonesia has a growing investor community and ValutX is starting to get noticed here. I joined early and the experience has been exceptional. The 4-day cycle, the 22% returns, and the 15% referral commission — all exactly as described.',
  },
  {
    initials: 'CY',
    name: 'Can Yıldız',
    role: 'Investor since 2024 · Istanbul, Turkey',
    roi: '+24.8%',
    text: 'With currency volatility in Turkey, I needed a platform that moves fast. ValutX delivers in 4 days — no long lock-in periods, no vague timelines. My last season closed at 24.8%. I have told every investor I know about this platform.',
  },
  {
    initials: 'DG',
    name: 'Diego Guerrero',
    role: 'Investor since 2024 · Mexico City, Mexico',
    roi: '+20.3%',
    text: 'I come from a finance background and I was looking for platforms with clear mechanics and no hidden surprises. ValutX is exactly that. Pool size visible, ROI projected, season end date fixed. Withdrew 20.3% and came back for another round.',
  },
  {
    initials: 'SB',
    name: 'Sophie Bernard',
    role: 'Investor since 2024 · Paris, France',
    roi: '+23.7%',
    text: 'French investors are very selective about where they place capital. I appreciated the level of detail ValutX provides upfront — no ambiguity, no fine print surprises. My 4-day season returned 23.7% cleanly. Très satisfaisant.',
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
  const trackRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentRef = useRef(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const isMobile = () => window.innerWidth <= 900;

    const slide = () => {
      if (!isMobile()) return;
      const cards = track.querySelectorAll<HTMLElement>('.testi-card');
      if (!cards.length) return;
      currentRef.current = (currentRef.current + 1) % cards.length;
      const card = cards[currentRef.current];
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    };

    const start = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(slide, 3000);
    };

    const stop = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };

    start();
    track.addEventListener('touchstart', stop);
    track.addEventListener('touchend', () => setTimeout(start, 4000));

    return () => {
      stop();
      track.removeEventListener('touchstart', stop);
    };
  }, []);

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
          <div className="testi-grid reveal" ref={trackRef}>
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
          .testi-grid {
            display: flex;
            flex-direction: row;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
            gap: 12px;
            padding-bottom: 16px;
            scrollbar-width: none;
          }
          .testi-grid::-webkit-scrollbar { display: none; }
          .testi-card {
            flex: 0 0 82vw;
            max-width: 320px;
            scroll-snap-align: center;
          }
        }
      `}</style>
    </>
  );
}