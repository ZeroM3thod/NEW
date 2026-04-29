'use client';
import { useRouter } from 'next/navigation';

const features = [
  {icon:'⬛',title:'Season-Based Cycles',desc:'Defined entry and exit dates eliminate emotional decision-making and market timing pressure.'},
  {icon:'◈',title:'Full Transparency',desc:'Every season publishes its pool size, strategy summary, and projected return range before entries open.'},
  {icon:'◎',title:'USDT Settlement',desc:'All investments and payouts are in USDT. No currency risk, no conversion friction.'},
  {icon:'◇',title:'Zero Withdrawal Failures',desc:'Across 100+ seasons, every withdrawal has been processed on time — a record we intend to maintain.'},
];

export default function About() {
  const router = useRouter();
  return (
    <>
      <section className="about" id="about">
        <div className="about-inner">
          <div className="reveal">
            <span className="section-label">About ValutX</span>
            <h2 className="section-title">Built for discipline,<br/>not speculation</h2>
            <p className="section-sub">ValutX is a structured investment platform operating through defined seasonal cycles. We do not chase volatile markets. We apply systematic, rule-based strategies across diversified asset pools — and we share the results transparently.</p>
            <div className="about-features">
              {features.map((f,i)=>(
                <div key={i} className="about-feature">
                  <span className="feature-icon">{f.icon}</span>
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="about-aside reveal">
            <div className="aside-card">
              <span className="section-label">Season 110 is Live</span>
              <h3>Secure your position before entries close</h3>
              <p>Only 5 days remain in the Season 110 entry window. The pool cap is $250K. Current fill rate is at 46%. Once full, no further entries are accepted.</p>
              <button className="aside-cta" onClick={() => router.push('/signup')}>Open an Account</button>
              <div className="aside-note">Minimum investment: $30 USDT · No lock-in fees</div>
            </div>
          </div>
        </div>
      </section>
      <style jsx>{`
        .about{padding:100px 5%;background:var(--cream)}
        .about-inner{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:5fr 4fr;gap:80px;align-items:start}
        .about-features{display:grid;grid-template-columns:1fr 1fr;gap:2px;margin-top:40px}
        .about-feature{background:var(--surface);border:1px solid var(--border);padding:24px 20px;transition:all .3s}
        .about-feature:hover{border-color:var(--gold)}
        .feature-icon{font-size:1.1rem;margin-bottom:10px;display:block}
        .about-feature h4{font-family:'Cormorant Garamond',serif;font-size:1rem;font-weight:500;color:var(--ink);margin-bottom:6px}
        .about-feature p{font-size:.75rem;color:var(--text-secondary);line-height:1.7;font-weight:300}
        .about-aside{position:sticky;top:100px}
        .aside-card{background:var(--ink);padding:36px 32px;border:1px solid var(--ink)}
        .aside-card h3{font-family:'Cormorant Garamond',serif;font-size:1.5rem;font-weight:400;color:var(--cream);margin:8px 0 20px;line-height:1.3}
        .aside-card p{font-size:.8rem;color:rgba(246,241,233,.55);line-height:1.8;font-weight:300;margin-bottom:28px}
        .aside-cta{width:100%;padding:13px;background:var(--gold);border:none;color:var(--cream);font-family:'DM Sans',sans-serif;font-size:.8rem;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;border-radius:var(--radius);transition:opacity .2s}
        .aside-cta:hover{opacity:.85}
        .aside-note{margin-top:14px;text-align:center;font-size:.7rem;color:rgba(246,241,233,.3);letter-spacing:.05em}
        @media(max-width:900px){.about-inner{grid-template-columns:1fr;gap:40px}.about-aside{position:static}}
        @media(max-width:560px){.about-features{grid-template-columns:1fr}}
      `}</style>
    </>
  );
}