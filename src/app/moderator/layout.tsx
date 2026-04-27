'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import ModeratorSidebar from '@/components/ModeratorSidebar';
import { createClient } from '@/utils/supabase/client';
import { ModeratorProvider } from '@/context/ModeratorContext';
import './moderator.css';

export default function ModeratorLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: string; show: boolean }>({ msg: '', type: '', show: false });
  const [moderator, setModerator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/signin');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profile?.role !== 'moderator' && profile?.role !== 'admin') {
        router.push('/dashboard');
        return;
      }
      setModerator(profile);
      setLoading(false);
    }
    checkAuth();
  }, [router, supabase]);

  const showToast = (msg: string, type: 'ok' | 'err' | 'info' = 'info') => {
    setToast({ msg, type, show: true });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/signin');
  };

  const getSearchPlaceholder = () => {
    if (pathname.includes('/kyc')) return 'Search by name, username, email…';
    if (pathname.includes('/support')) return 'Search by ticket ID, name, or subject…';
    return 'Search…';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f6f1e9', color: '#1c1c1c' }}>
        Loading...
      </div>
    );
  }

  return (
    <ModeratorProvider 
      showToast={showToast} 
      toast={toast} 
      searchQuery={searchQuery} 
      setSearchQuery={setSearchQuery}
    >
      <div className="moderator-body">
        <div id="toast" className={toast.show ? `show ${toast.type}` : ''}>{toast.msg}</div>
        
        <div className="layout">
          <ModeratorSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          
          <div className="main-area">
            <header className="top-header">
              <div className="ham-btn" onClick={() => setSidebarOpen(true)}>
                <span></span><span></span><span></span>
              </div>
              
              <div className="search-wrap">
                <div className="search-icon">
                  <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
                <input 
                  className="search-input" 
                  type="text" 
                  placeholder={getSearchPlaceholder()}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="header-right">
                <div className="notif-btn" onClick={() => showToast('No new notifications')}>
                  <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                  <div className="notif-dot"></div>
                </div>
                <div className="header-avatar">
                  {moderator ? `${moderator.first_name?.[0] || 'M'}${moderator.last_name?.[0] || 'R'}` : 'MR'}
                </div>
                <div className="header-uinfo">
                  <div className="header-uname">
                    {moderator ? `${moderator.first_name} ${moderator.last_name || ''}` : 'Marcus Reid'}
                  </div>
                  <div className="header-role">
                    {pathname.includes('/kyc') ? 'KYC Moderator' : 'Support Moderator'}
                  </div>
                </div>
                <button className="btn-logout" onClick={handleLogout}>Logout</button>
              </div>
            </header>

            <main className="content">
              {children}
            </main>
          </div>
        </div>
      </div>
    </ModeratorProvider>
  );
}
