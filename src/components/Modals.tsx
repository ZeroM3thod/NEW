'use client';

import { useModal } from '@/context/ModalContext';

function ModalOverlay({
  id,
  children,
  isActive,
}: {
  id: string;
  children: React.ReactNode;
  isActive: boolean;
}) {
  const { closeModal } = useModal();

  return (
    <div
      id={id}
      className={`modal-overlay${isActive ? ' active' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div className="modal">{children}</div>

      <style jsx>{`
        .modal-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(28, 28, 28, 0.7);
          z-index: 9999;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(6px);
          padding: 20px;
        }
        .modal-overlay.active { display: flex; }
        .modal {
          background: var(--cream);
          width: 100%;
          max-width: 420px;
          border-radius: var(--radius);
          overflow: hidden;
          animation: modalIn 0.3s ease;
        }
      `}</style>
    </div>
  );
}

function ModalHead({ title }: { title: string }) {
  const { closeModal } = useModal();
  return (
    <>
      <div className="modal-head">
        <h3>{title}</h3>
        <button className="modal-close" onClick={closeModal} aria-label="Close">
          ✕
        </button>
      </div>
      <style jsx>{`
        .modal-head {
          background: var(--ink);
          padding: 28px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .modal-head h3 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.4rem;
          font-weight: 400;
          color: var(--cream);
        }
        .modal-close {
          background: none;
          border: none;
          cursor: pointer;
          color: rgba(246, 241, 233, 0.4);
          font-size: 1.3rem;
          line-height: 1;
          transition: color 0.2s;
        }
        .modal-close:hover { color: var(--cream); }
      `}</style>
    </>
  );
}

function ModalInput({
  label,
  type,
  placeholder,
}: {
  label: string;
  type: string;
  placeholder: string;
}) {
  return (
    <>
      <div className="modal-input">
        <label>{label}</label>
        <input type={type} placeholder={placeholder} />
      </div>
      <style jsx>{`
        .modal-input { display: flex; flex-direction: column; gap: 6px; }
        .modal-input label {
          font-size: 0.68rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-secondary);
        }
        .modal-input input {
          padding: 12px 14px;
          background: var(--surface);
          border: 1px solid var(--border);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.85rem;
          color: var(--ink);
          border-radius: var(--radius);
          outline: none;
          transition: border-color 0.2s;
        }
        .modal-input input:focus { border-color: var(--gold); }
      `}</style>
    </>
  );
}

export function LoginModal() {
  const { activeModal, switchModal } = useModal();

  return (
    <ModalOverlay id="loginModal" isActive={activeModal === 'login'}>
      <ModalHead title="Welcome Back" />
      <div className="modal-body">
        <ModalInput label="Email Address" type="email" placeholder="you@example.com" />
        <ModalInput label="Password" type="password" placeholder="••••••••" />
        <button className="modal-submit">Sign In</button>
        <p className="modal-switch">
          Don&apos;t have an account?{' '}
          <a onClick={() => switchModal('signup')}>Create one</a>
        </p>
      </div>
      <style jsx>{`
        .modal-body {
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .modal-submit {
          width: 100%;
          padding: 13px;
          background: var(--ink);
          color: var(--cream);
          border: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.8rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          border-radius: var(--radius);
          transition: background 0.25s;
          margin-top: 4px;
        }
        .modal-submit:hover { background: var(--gold); }
        .modal-switch {
          text-align: center;
          font-size: 0.78rem;
          color: var(--text-secondary);
        }
        .modal-switch a {
          color: var(--gold);
          text-decoration: none;
          cursor: pointer;
          font-weight: 500;
        }
      `}</style>
    </ModalOverlay>
  );
}

export function SignupModal() {
  const { activeModal, switchModal } = useModal();

  return (
    <ModalOverlay id="signupModal" isActive={activeModal === 'signup'}>
      <ModalHead title="Create Account" />
      <div className="modal-body">
        <ModalInput label="Full Name" type="text" placeholder="Rafiqul Molla" />
        <ModalInput label="Email Address" type="email" placeholder="you@example.com" />
        <ModalInput label="Password" type="password" placeholder="Create a strong password" />
        <ModalInput
          label="Referral Code (Optional)"
          type="text"
          placeholder="Enter code to earn 5% bonus"
        />
        <button className="modal-submit">Get Started</button>
        <p className="modal-switch">
          Already have an account?{' '}
          <a onClick={() => switchModal('login')}>Sign in</a>
        </p>
      </div>
      <style jsx>{`
        .modal-body {
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .modal-submit {
          width: 100%;
          padding: 13px;
          background: var(--ink);
          color: var(--cream);
          border: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.8rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          border-radius: var(--radius);
          transition: background 0.25s;
          margin-top: 4px;
        }
        .modal-submit:hover { background: var(--gold); }
        .modal-switch {
          text-align: center;
          font-size: 0.78rem;
          color: var(--text-secondary);
        }
        .modal-switch a {
          color: var(--gold);
          text-decoration: none;
          cursor: pointer;
          font-weight: 500;
        }
      `}</style>
    </ModalOverlay>
  );
}
