'use client';
import { useRouter, usePathname } from 'next/navigation';

interface Props {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  {
    id: 'dashboard', label: 'Dashboard', href: '/dashboard',
    svg: (<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>),
  },
  {
    id: 'seasons', label: 'Seasons', href: '/season',
    svg: (<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>),
  },
  {
    id: 'deposit', label: 'Deposit', href: '/deposit',
    svg: (<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></>),
  },
  {
    id: 'withdraw', label: 'Withdraw', href: '/withdraw',
    svg: (<><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></>),
  },
  {
    id: 'referral', label: 'Referral', href: '/referral',
    svg: (<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>),
  },
  {
    id: 'support', label: 'Support', href: '/support',
    svg: (<><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>),
  },
];

export default function UserSidebar({ open, onClose }: Props) {
  const router   = useRouter();
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const go = (href: string) => { router.push(href); onClose(); };

  return (
    <>
      <div className={`usr-sb-overlay${open ? ' open' : ''}`} onClick={onClose} />
      <aside className={`usr-sidebar${open ? ' open' : ''}`}>
        <div className="usr-sb-logo">
          <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <div className="usr-logo-mark" />
            <span className="usr-logo-text">Vault<span>X</span></span>
          </a>
        </div>
        <nav className="usr-sb-nav">
          {navItems.map(n => (
            <button
              key={n.id}
              className={`usr-nav-item${isActive(n.href) ? ' active' : ''}`}
              onClick={() => go(n.href)}
            >
              <svg fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                {n.svg}
              </svg>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="usr-sb-footer">
          <div className="usr-user-row" onClick={() => go('/profile')} style={{ cursor: 'pointer' }}>
            <div className="usr-avatar">RK</div>
            <div>
              <div className="usr-user-name">Rafiqul M.</div>
              <div className="usr-user-tag">Season 4 Investor</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}