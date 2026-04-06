'use client';

import { useState } from 'react';

const contactItems = [
  {
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="var(--gold)">
        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
      </svg>
    ),
    title: 'Email Support',
    detail: (
      <>
        support@vaultx.io
        <br />
        Typically within 4–8 hours
      </>
    ),
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="var(--gold)">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
      </svg>
    ),
    title: 'Headquarters',
    detail: (
      <>
        Dhaka, Bangladesh
        <br />
        Remote operations globally
      </>
    ),
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="var(--gold)">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
      </svg>
    ),
    title: 'Community Channel',
    detail: (
      <>
        Join 50,000+ investors on Telegram
        <br />
        @VaultXOfficial
      </>
    ),
  },
];

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    }, 1200);
  };

  return (
    <>
      <section className="contact" id="contact">
        <div className="contact-inner">
          {/* Info side */}
          <div className="reveal">
            <span className="section-label">Contact Us</span>
            <h2 className="section-title">
              We respond
              <br />
              within 24 hours
            </h2>
            <p className="section-sub">
              Have a question about a season, a withdrawal, or your referral
              earnings? Reach out — our team is available every day.
            </p>
            <br />
            <div className="contact-info">
              {contactItems.map((item, i) => (
                <div key={i} className="contact-item">
                  <div className="contact-item-icon">{item.icon}</div>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form side */}
          <div className="reveal">
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input type="text" placeholder="Rafiqul" required />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input type="text" placeholder="Molla" required />
                </div>
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" placeholder="you@example.com" required />
              </div>
              <div className="form-group">
                <label>Subject</label>
                <select>
                  <option>Season 4 Investment Query</option>
                  <option>Withdrawal Support</option>
                  <option>Referral Programme</option>
                  <option>Account Verification</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea placeholder="Describe your inquiry..." />
              </div>
              <button type="submit" className="form-submit" disabled={loading}>
                {loading ? 'Sending…' : submitted ? 'Message Sent ✓' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </section>

      <style jsx>{`
        .contact {
          padding: 100px 5%;
          background: var(--parchment);
          border-top: 1px solid var(--border);
        }
        .contact-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: start;
        }
        .contact-info { display: flex; flex-direction: column; gap: 24px; }
        .contact-item {
          display: flex;
          gap: 14px;
          align-items: start;
          padding-bottom: 24px;
          border-bottom: 1px solid var(--border);
        }
        .contact-item:last-child { border-bottom: none; }
        .contact-item-icon {
          width: 36px;
          height: 36px;
          border-radius: var(--radius);
          background: var(--ink);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .contact-item strong {
          display: block;
          font-size: 0.8rem;
          font-weight: 500;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }
        .contact-item span {
          font-size: 0.8rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .contact-form { display: flex; flex-direction: column; gap: 14px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group label {
          font-size: 0.7rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-secondary);
        }
        .form-group input,
        .form-group textarea,
        .form-group select {
          padding: 12px 14px;
          background: var(--cream);
          border: 1px solid var(--border);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.85rem;
          color: var(--ink);
          border-radius: var(--radius);
          outline: none;
          transition: border-color 0.2s;
          -webkit-appearance: none;
        }
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus { border-color: var(--gold); }
        .form-group textarea { resize: vertical; min-height: 110px; }

        .form-submit {
          width: 100%;
          padding: 14px;
          background: var(--ink);
          color: var(--cream);
          border: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.82rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          border-radius: var(--radius);
          transition: background 0.25s;
          margin-top: 4px;
        }
        .form-submit:hover:not(:disabled) { background: var(--gold); }
        .form-submit:disabled { opacity: 0.7; cursor: not-allowed; }

        @media (max-width: 900px) {
          .contact-inner { grid-template-columns: 1fr; gap: 48px; }
        }
        @media (max-width: 560px) {
          .form-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}
