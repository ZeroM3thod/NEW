'use client';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface Props {
  open: boolean;
  onClose: () => void;
  pendingKycCount?: number;
  openSupportCount?: number;
}

export default function ModeratorSidebar({ open, onClose, pendingKycCount = 0, openSupportCount = 0 }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [moderator, setModerator] = useState<any>(null);
  const [counts, setCounts] = useState({ kyc: 0, support: 0 });

  useEffect(() => {
    async function fetchModerator() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setModerator(profile);
      }
    }

    async function fetchCounts() {
      const { count: kycCount } = await supabase
        .from('kyc_submissions') // Assuming table name
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: supportCount } = await supabase
        .from('support_tickets') // Assuming table name
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'open']);

      setCounts({
        kyc: kycCount || 0,
        support: supportCount || 0
      });
    }

    fetchModerator();
    // fetchCounts(); // Commented out for now as we don't know the exact table names yet, using props if provided
  }, []);

  // Use props if provided, otherwise use fetched counts (if we had them)
  const pendingKyc = pendingKycCount || counts.kyc;
  const openSupport = openSupportCount || counts.support;

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  const go = (path: string) => {
    router.push(path);
    onClose();
  };

  return (
    <>
      <div className={`sb-overlay${open ? ' show' : ''}`} onClick={onClose} />
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sb-top">
          <div className="sb-logo-mark"></div>
          <div>
            <div className="sb-logo-text">Valut<span>X</span></div>
            <span className="sb-admin-badge">Admin Panel</span>
          </div>
        </div>

        <nav className="sb-nav">
          <span className="sb-section-label">Compliance</span>
          <button 
            className={`sb-item${isActive('/moderator/kyc') ? ' active' : ''}`}
            onClick={() => go('/moderator/kyc')}
          >
            <svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            KYC Management
            {pendingKyc > 0 && <span className="sb-badge">{pendingKyc}</span>}
          </button>

          <span className="sb-section-label">Help</span>
          <button 
            className={`sb-item${isActive('/moderator/support') ? ' active' : ''}`}
            onClick={() => go('/moderator/support')}
          >
            <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            Support Management
            {openSupport > 0 && <span className="sb-badge">{openSupport}</span>}
          </button>
        </nav>

        <div className="sb-bottom">
          <div className="sb-user">
            <div className="sb-avatar">
              {moderator ? `${moderator.first_name?.[0] || 'M'}${moderator.last_name?.[0] || 'R'}` : 'MR'}
            </div>
            <div>
              <div className="sb-uname">{moderator ? `${moderator.first_name} ${moderator.last_name || ''}` : 'Marcus Reid'}</div>
              <div className="sb-role">{moderator?.role === 'moderator' ? 'Moderator' : 'Support Moderator'}</div>
            </div>
          </div>
        </div>
      </aside>

      <style jsx>{`
        .sb-item {
          background: transparent;
          border: 1px solid transparent;
          width: 100%;
          text-align: left;
          font-family: inherit;
        }
      `}</style>
    </>
  );
}
