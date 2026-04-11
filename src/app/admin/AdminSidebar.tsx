'use client';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface Props {
  open: boolean;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export default function AdminSidebar({ open, onClose, onToast }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [admin, setAdmin] = useState<any>(null);
  const [counts, setCounts] = useState({ withdraw: '0', deposit: '0', users: '0' });

  useEffect(() => {
    async function fetchAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setAdmin(profile);
      }
    }
    async function fetchCounts() {
      const { count: withdrawCount } = await supabase
        .from('withdrawals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      const { count: depositCount } = await supabase
        .from('deposits')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      setCounts({
        withdraw: withdrawCount?.toString() || '0',
        deposit: depositCount?.toString() || '0',
        users: userCount ? (userCount / 1000).toFixed(0) + 'K' : '0'
      });
    }
    fetchAdmin();
    fetchCounts();
  }, []);

  const go = (path: string) => { router.push(path); onClose(); };

  const navGroups = [
    {
      section: 'Main',
      items: [
        {
          id: 'dashboard', label: 'Dashboard', path: '/admin/dashboard', badge: null,
          svg: (<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></>),
        },
        {
          id: 'user', label: 'User Management', path: '/admin/user', badge: counts.users,
          svg: (<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>),
        },
        {
          id: 'season', label: 'Season Management', path: '/admin/season', badge: null,
          svg: (<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>),
        },
      ],
    },
    {
      section: 'Requests',
      items: [
        {
          id: 'withdraw', label: 'Withdraw Requests', path: '/admin/withdraw', badge: counts.withdraw !== '0' ? counts.withdraw : null,
          svg: (<path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>),
        },
        {
          id: 'deposit', label: 'Deposit Requests', path: '/admin/deposit', badge: counts.deposit !== '0' ? counts.deposit : null,
          svg: (<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></>),
        },
      ],
    },
    {
      section: 'Records',
      items: [
        {
          id: 'transactions', label: 'Transaction History', path: '/admin/transaction', badge: null,
          svg: (<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>),
        },
        {
          id: 'settings', label: 'Settings', path: '/admin/setting', badge: null,
          svg: (<><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></>),
        },
      ],
    },
  ] as { section: string; items: { id: string; label: string; path: string; badge: string | null; svg: React.ReactNode }[] }[];

  const isActive = (path: string) =>
    path !== '#' && (pathname === path || pathname.startsWith(path + '/'));

  const handleClick = (path: string, label: string) => {
    if (path === '#') { onToast('📌 ' + label + ' — coming soon'); onClose(); return; }
    go(path);
  };

  return (
    <aside className={`adm-sidebar${open ? ' open' : ''}`}>
      <div className="adm-sb-top">
        <div className="adm-sb-logo-mark" />
        <div>
          <div className="adm-sb-logo-text">Vault<span>X</span></div>
          <span className="adm-sb-admin-badge">Admin Panel</span>
        </div>
      </div>

      <nav className="adm-sb-nav">
        {navGroups.map(group => (
          <div key={group.section}>
            <span className="adm-sb-section-label">{group.section}</span>
            {group.items.map(item => (
              <button
                key={item.id}
                className={`adm-sb-item${isActive(item.path) ? ' active' : ''}`}
                onClick={() => handleClick(item.path, item.label)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  {item.svg}
                </svg>
                {item.label}
                {item.badge && <span className="adm-sb-badge">{item.badge}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="adm-sb-bottom">
        <div className="adm-sb-user">
          <div className="adm-sb-avatar">
            {admin ? `${admin.first_name[0]}${admin.last_name[0]}` : 'AD'}
          </div>
          <div>
            <div className="adm-sb-uname">{admin ? `${admin.first_name} ${admin.last_name}` : 'Admin User'}</div>
            <div className="adm-sb-role">{admin?.role === 'admin' ? 'Super Administrator' : 'Administrator'}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}