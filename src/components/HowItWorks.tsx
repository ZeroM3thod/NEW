'use client';

const steps = [
  {
    num: '01',
    title: 'Create Your Account',
    desc: 'Register in under two minutes. Verify your identity and set your investment preferences.',
  },
  {
    num: '02',
    title: 'Choose Your Season',
    desc: 'Select an open season, review its projected ROI and pool details, and decide your entry amount.',
  },
  {
    num: '03',
    title: 'Deposit USDT',
    desc: 'Fund your position via USDT (TRC-20 , ERC-20 or BEP-20). Your investment is locked in for the season duration.',
  },
  {
    num: '04',
    title: 'Withdraw Profits',
    desc: 'At season close, withdraw your earned returns — directly to your wallet.',
  },
];

export default function HowItWorks() {
  return (
    <>
      <section className="how-it-works">
        <div className="hiw-inner">
          <div className="hiw-header reveal">
            <div>
              <span className="section-label">Process</span>
              <h2 className="section-title">
                Simple steps,
                <br />
                serious results
              </h2>
            </div>
            <p className="section-sub" style={{ color: 'rgba(246,241,233,0.45)' }}>
              No complexity. No jargon. Just a clear, proven system that has
              delivered returns across three consecutive seasons.
            </p>
          </div>
          <div className="hiw-steps reveal">
            {steps.map((s) => (
              <div key={s.num} className="step">
                <div className="step-num">{s.num}</div>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <style jsx>{`
        .how-it-works {
          padding: 100px 5%;
          background: var(--ink);
        }
        .hiw-inner { max-width: 1200px; margin: 0 auto; }
        .hiw-inner :global(.section-label) { color: var(--gold); }
        .hiw-inner :global(.section-title) { color: var(--cream); }

        .hiw-header {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: start;
          margin-bottom: 70px;
        }
        .hiw-steps {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2px;
        }
        .step {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 32px 24px;
          transition: all 0.3s;
        }
        .step:hover {
          background: rgba(184, 147, 90, 0.08);
          border-color: rgba(184, 147, 90, 0.2);
        }
        .step-num {
          font-family: 'Cormorant Garamond', serif;
          font-size: 3rem;
          font-weight: 300;
          color: rgba(184, 147, 90, 0.25);
          line-height: 1;
          margin-bottom: 16px;
        }
        .step h4 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.1rem;
          font-weight: 500;
          color: var(--cream);
          margin-bottom: 10px;
        }
        .step p {
          font-size: 0.8rem;
          color: rgba(246, 241, 233, 0.5);
          line-height: 1.7;
          font-weight: 300;
        }
        @media (max-width: 900px) {
          .hiw-steps { grid-template-columns: 1fr 1fr; }
          .hiw-header { grid-template-columns: 1fr; gap: 24px; }
        }
        @media (max-width: 560px) {
          .hiw-steps { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}
