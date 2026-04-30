'use client';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import UserSidebar from '@/components/UserSidebar';
import ValutXLoader from '@/components/ValutXLoader';
import { createClient } from '@/utils/supabase/client';

interface ChatMsg { from: 'user' | 'admin'; text: string; time: string; by?: { name: string; initials: string } }
interface Ticket {
  id: string; 
  ticket_id: string; 
  subject: string; 
  category: string; 
  priority: string;
  created_at: string; 
  status: 'open' | 'pending' | 'closed' | 'resolved';
  message?: string;
  messages?: any[];
}

const FAQS = [
  { cat: 'finance', q: 'How do I make a deposit?', a: 'Navigate to the <strong>Deposit</strong> page from your dashboard. Select your preferred network (USDT-TRC20, ERC20, or BEP20), enter the amount, and transfer funds to the displayed wallet address. Deposits are credited within 15–30 minutes after 1 confirmation.' },
  { cat: 'finance', q: 'How long does a withdrawal take?', a: 'Withdrawal requests are reviewed within <strong>2–3 business days</strong>. Once approved, funds are sent to your registered wallet. Blockchain processing is typically 5–30 minutes.' },
  { cat: 'invest', q: 'What is a Season and how does it work?', a: 'A Season is a fixed-duration investment pool with a predetermined ROI. You deposit USDT, and at season end your principal plus ROI is returned. Each Season has a pool cap — once filled, new entries close.' },
  { cat: 'invest', q: 'Can I withdraw before a Season ends?', a: 'Investments are <strong>locked for the full duration</strong>. Early withdrawals are not permitted. You can however withdraw your available balance (past returns) at any time.' },
  { cat: 'invest', q: 'What is the minimum investment?', a: 'The minimum per Season entry is <strong>$100 USDT</strong>. There is no hard maximum, though each Season has a total pool cap.' },
  { cat: 'referral', q: 'How does the referral program work?', a: 'Earn <strong>5% commission</strong> on every USDT investment made by users you refer. When a referred user registers and invests, your commission is automatically credited within 2–3 business days. Commissions are lifetime.' },
  { cat: 'referral', q: 'When is my referral commission paid?', a: 'Commissions are added to your <strong>Pending Commission</strong> balance once a referred user\'s investment is confirmed. Funds move to your available balance within 2–3 business days.' },
  { cat: 'account', q: 'How do I verify my identity (KYC)?', a: 'Go to <strong>Settings → Identity Verification</strong>. Upload a government-issued photo ID and a selfie. Verification completes within 24–48 hours. KYC is required for withdrawals above $1,000 USDT.' },
  { cat: 'account', q: 'Can I change my registered email?', a: 'Yes. Visit <strong>Settings → Account</strong> and request an email change. A confirmation link is sent to both addresses. Verify both within 24 hours.' },
  { cat: 'security', q: 'What if I suspect unauthorised access?', a: 'Immediately change your password, enable 2FA, and contact our support team. Use a unique, strong password and enable login notifications in account settings.' },
  { cat: 'security', q: 'How do I enable two-factor authentication (2FA)?', a: 'Go to <strong>Settings → Security</strong> and click Enable 2FA. Scan the QR code with Google Authenticator or Authy, enter the 6-digit code to confirm. 2FA is then required at every login.' },
  { cat: 'finance', q: 'Are there fees for deposits or withdrawals?', a: 'ValutX does not charge platform fees on deposits. For withdrawals, a small <strong>network gas fee</strong> is deducted depending on the blockchain used (TRC20 is cheapest).' },
];

const CAT_LABELS: Record<string, string> = { account: 'Account', invest: 'Investing', finance: 'Finance', referral: 'Referral', security: 'Security' };

export default function SupportPage() {
  const router = useRouter();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastCls, setToastCls] = useState('');
  const [toastShow, setToastShow] = useState(false);
  const [faqCat, setFaqCat] = useState('all');
  const [faqSearch, setFaqSearch] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');

  const [fCategory, setFCategory] = useState('');
  const [catErr, setCatErr] = useState(false);
  const [fSubject, setFSubject] = useState('');
  const [subErr, setSubErr] = useState(false);
  const [fPriority, setFPriority] = useState('low');
  const [fMessage, setFMessage] = useState('');
  const [msgErr, setMsgErr] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [newTicketId, setNewTicketId] = useState('');

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ticketRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  const [ticketDetails, setTicketDetails] = useState<any>(null);

  const showToast = useCallback((msg: string, cls = '') => {
    setToastMsg(msg); setToastCls(cls); setToastShow(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastShow(false), 2800);
  }, []);

  const fetchTickets = useCallback(async () => {
    const res = await fetch('/api/support/tickets');
    const data = await res.json();
    if (!data.error) setTickets(data);
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(data);
        await fetchTickets();

        // Global listener for ticket updates (to keep list/history fresh)
        const globalChannel = supabase
          .channel(`user-tickets-${user.id}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'support_tickets',
            filter: `user_id=eq.${user.id}`
          }, () => {
            fetchTickets();
          })
          .subscribe();
        
        return () => { supabase.removeChannel(globalChannel); };
      }
      setPageLoading(false);
    }
    init();
  }, [supabase, fetchTickets]);

  useEffect(() => {
    if (activeTicketId) {
      const fetchDetails = async () => {
        const res = await fetch(`/api/support/tickets/${activeTicketId}`);
        const data = await res.json();
        if (!data.error) setTicketDetails(data);
      };
      fetchDetails();

      const channel = supabase
        .channel(`ticket-${activeTicketId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'ticket_messages', 
          filter: `ticket_id=eq.${activeTicketId}` 
        }, async (payload) => {
          const { data: newMsg } = await supabase
            .from('ticket_messages')
            .select('*, sender:sender_id(first_name, last_name, role)')
            .eq('id', payload.new.id)
            .single();
          
          if (newMsg) {
            setTicketDetails((prev: any) => {
              if (prev?.id !== activeTicketId) return prev;
              
              // Avoid duplicates from optimistic update by ID
              if (prev.messages?.some((m: any) => m.id === newMsg.id)) return prev;
              
              // Also check for optimistic message by content if ID is different
              const isDuplicate = prev.messages?.some((m: any) => 
                m.isOptimistic && 
                m.message === newMsg.message && 
                m.sender_id === newMsg.sender_id
              );
              
              if (isDuplicate) {
                // Replace optimistic with real
                return {
                  ...prev,
                  messages: prev.messages.map((m: any) => 
                    (m.isOptimistic && m.message === newMsg.message && m.sender_id === newMsg.sender_id) ? newMsg : m
                  )
                };
              }

              return {
                ...prev,
                messages: [...(prev?.messages || []), newMsg]
              };
            });
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
          filter: `id=eq.${activeTicketId}`
        }, (payload) => {
          setTicketDetails((prev: any) => {
            if (prev?.id !== activeTicketId) return prev;
            return {
              ...prev,
              status: payload.new.status
            };
          });
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    } else {
      setTicketDetails(null);
    }
  }, [activeTicketId, supabase]);

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); });
    }, { threshold: 0.06 });
    document.querySelectorAll<HTMLElement>('.sp-reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [tickets]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen || !!activeTicketId ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen, activeTicketId]);

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [ticketDetails?.messages]);

  const visibleFaqs = FAQS.filter(f => {
    const catMatch = faqCat === 'all' || f.cat === faqCat;
    const q = faqSearch.toLowerCase();
    return catMatch && (!q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));
  });

  const resetForm = () => {
    setFCategory(''); setCatErr(false);
    setFSubject(''); setSubErr(false);
    setFPriority('low');
    setFMessage(''); setMsgErr(false);
    setFormSuccess(false); setNewTicketId('');
  };

  const submitForm = async () => {
    let hasErr = false;
    if (!fCategory) { setCatErr(true); hasErr = true; }
    if (!fSubject.trim()) { setSubErr(true); hasErr = true; }
    if (fMessage.trim().length < 20) { setMsgErr(true); hasErr = true; }
    if (hasErr) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: fSubject,
          category: fCategory,
          priority: fPriority,
          message: fMessage
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setNewTicketId(data.ticket_id);
      setFormSuccess(true);
      await fetchTickets();
      showToast('✓ Ticket submitted successfully.', 'ok');
    } catch (err: any) {
      showToast(err.message, 'err');
    } finally {
      setSubmitting(false);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || !activeTicketId || !ticketDetails) return;
    if (ticketDetails.status === 'closed') { showToast('This ticket is closed.', 'err'); return; }

    const msgText = chatInput;
    setChatInput('');

    // Optimistic Update
    const tempId = 'opt-' + Math.random().toString(36).substr(2, 9);
    const optimisticMsg = {
      id: tempId,
      message: msgText,
      created_at: new Date().toISOString(),
      sender_id: profile?.id,
      isOptimistic: true,
      sender: {
        id: profile?.id,
        first_name: profile?.first_name,
        last_name: profile?.last_name,
        role: profile?.role
      }
    };

    setTicketDetails((prev: any) => ({
      ...prev,
      messages: [...(prev?.messages || []), optimisticMsg]
    }));

    try {
      const res = await fetch(`/api/support/tickets/${activeTicketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msgText })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      // Replace optimistic message with real one
      setTicketDetails((prev: any) => ({
        ...prev,
        messages: prev.messages?.map((m: any) => m.id === tempId ? { ...data, sender: optimisticMsg.sender } : m)
      }));
    } catch (err: any) {
      showToast(err.message, 'err');
      // Rollback optimistic update
      setTicketDetails((prev: any) => ({
        ...prev,
        messages: prev.messages?.filter((m: any) => m.id !== tempId)
      }));
    }
  };

  const statusCls = (s: string) => s === 'open' ? 'sp-b-open' : s === 'resolved' ? 'sp-b-resolved' : s === 'closed' ? 'sp-b-closed' : 'sp-b-pending';
  const statusDotCls = (s: string) => s === 'open' ? 'sp-dot-open' : s === 'resolved' ? 'sp-dot-resolved' : s === 'closed' ? 'sp-dot-closed' : 'sp-dot-pending';
  const prioCls = (p: string) => p === 'high' ? 'sp-b-high' : p === 'low' ? 'sp-b-low' : 'sp-b-medium';
  const formatDate = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatTime = (s: string) => new Date(s).toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '');

  return (
    <>
      {pageLoading && <ValutXLoader pageName="Support" />}
      <div className={`sp-toast${toastShow ? ' show' : ''}${toastCls ? ' ' + toastCls : ''}`}>{toastMsg}</div>

      <UserSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className='sp-layout'>

        {/* MOBILE TOPBAR */}
        <div className="sp-topbar">
          <button className="sp-ham" onClick={() => setSidebarOpen(o => !o)}>
            <span /><span /><span />
          </button>
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => router.push('/')}>
            <div className="sp-logo-mark" style={{ width: 26, height: 26 }} />
            <span className="sp-logo-text" style={{ fontSize: '1.15rem' }}>Valut<span>X</span></span>
          </div>
          <div className="sp-mob-avatar" onClick={() => router.push('/profile')}>
            {profile ? `${profile.first_name[0]}${profile.last_name[0]}` : '...'}
          </div>
        </div>

        <main className="sp-main">
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>

            {/* PAGE HEADER */}
            <div className="sp-reveal" style={{ marginBottom: 22 }}>
              <span className="sp-sec-label">Help Center</span>
              <h1 className="sp-sec-title">Support</h1>
              <p className="sp-sec-sub">Find answers instantly or get in touch with our team.</p>
            </div>

            {/* SEARCH */}
            <div className="sp-reveal" style={{ marginBottom: 24 }}>
              <div className="sp-search-wrap">
                <div className="sp-search-icon">
                  <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                </div>
                <input className="sp-search" type="text"
                  placeholder="Search FAQs — withdrawal, deposit, commission…"
                  value={faqSearch} onChange={e => setFaqSearch(e.target.value)} />
              </div>
            </div>

            {/* CONTACT OPTIONS */}
            <div className="sp-reveal" style={{ marginBottom: 24 }}>
              <div style={{ marginBottom: 12 }}>
                <span className="sp-sec-label" style={{ marginBottom: 2 }}>Quick Access</span>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.05rem', color: 'var(--ink)' }}>Contact Options</div>
              </div>
              <div className="sp-support-grid">
                <div className="sp-support-opt" onClick={() => { 
                  ticketRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  showToast('Scrolling to Get Help...');
                }}>
                  <div className="sp-support-opt-icon" style={{ background: 'rgba(155,58,58,.07)' }}>
                    <svg viewBox="0 0 24 24" style={{ stroke: '#9b6a6a' }}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                  </div>
                  <div>
                    <div className="sp-support-opt-title">Live Chat</div>
                    <div className="sp-support-opt-desc">Chat with our support team in real time.</div>
                  </div>
                  <span className="sp-support-opt-badge"><span className="sp-live-dot" />Available</span>
                </div>

                <div className="sp-support-opt" onClick={() => { showToast('📧 Opening email client…'); window.location.href = 'mailto:valutxsupport@duck.com?subject=Support%20Request'; }}>
                  <div className="sp-support-opt-icon" style={{ background: 'rgba(184,147,90,.1)' }}>
                    <svg viewBox="0 0 24 24" style={{ stroke: 'var(--gold)' }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                  </div>
                  <div>
                    <div className="sp-support-opt-title">Email Support</div>
                    <div className="sp-support-opt-desc">valutxsupport@duck.com</div>
                  </div>
                  <span className="sp-support-opt-badge"><span className="sp-live-dot" />Available</span>
                </div>

                <div className="sp-support-opt" onClick={() => { window.open('https://t.me/ValutXsupport', '_blank'); showToast('📤 Opening Telegram…'); }}>
                  <div className="sp-support-opt-icon" style={{ background: 'rgba(184,147,90,.08)' }}>
                    <svg viewBox="0 0 24 24" style={{ stroke: 'var(--gold-d)' }}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                  </div>
                  <div>
                    <div className="sp-support-opt-title">Telegram Support</div>
                    <div className="sp-support-opt-desc">Reach us on our official channel.</div>
                  </div>
                  <span className="sp-support-opt-badge"><span className="sp-live-dot" />Active</span>
                </div>

                <div className="sp-support-opt" onClick={() => ticketRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                  <div className="sp-support-opt-icon" style={{ background: 'rgba(28,28,28,.06)' }}>
                    <svg viewBox="0 0 24 24" style={{ stroke: 'var(--charcoal)' }}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                  </div>
                  <div>
                    <div className="sp-support-opt-title">Ticket History</div>
                    <div className="sp-support-opt-desc">View all your past support tickets.</div>
                  </div>
                  <span className="sp-support-opt-badge" style={{ background: 'rgba(184,147,90,.1)', color: 'var(--gold)', borderColor: 'var(--border)' }}>{tickets.length} Tickets</span>
                </div>
              </div>
            </div>

            <div className="sp-divider sp-reveal" />

            {/* FAQ + FORM */}
            <div className="sp-two-col">

              {/* FAQ */}
              <div className="sp-reveal">
                <div style={{ marginBottom: 16 }}>
                  <span className="sp-sec-label" style={{ marginBottom: 2 }}>Self-Service</span>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.15rem', color: 'var(--ink)', marginBottom: 10 }}>Frequently Asked Questions</div>
                  <div className="sp-faq-filter-row">
                    {[['all', 'All'], ['account', 'Account'], ['invest', 'Investing'], ['finance', 'Finance'], ['referral', 'Referral'], ['security', 'Security']].map(([c, l]) => (
                      <button key={c} className={`sp-faq-pill${faqCat === c ? ' active' : ''}`} onClick={() => { setFaqCat(c); setOpenFaq(null); }}>{l}</button>
                    ))}
                  </div>
                </div>
                <div className="sp-card" style={{ overflow: 'visible' }}>
                  <div className="sp-faq-list">
                    {visibleFaqs.length === 0 ? (
                      <div className="sp-faq-empty">
                        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        No results found. Try a different search or category.
                      </div>
                    ) : visibleFaqs.map((f, i) => (
                      <div key={i} className="sp-faq-item">
                        <button className={`sp-faq-trigger${openFaq === i ? ' open' : ''}`} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                          <span className="sp-faq-q-text">{f.q}</span>
                          <span className="sp-faq-cat-tag">{CAT_LABELS[f.cat] || f.cat}</span>
                          <svg className="sp-faq-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" /></svg>
                        </button>
                        <div className={`sp-faq-body${openFaq === i ? ' open' : ''}`}>
                          <div className="sp-faq-answer" dangerouslySetInnerHTML={{ __html: f.a }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CONTACT FORM */}
              <div className="sp-reveal">
                <div style={{ marginBottom: 16 }}>
                  <span className="sp-sec-label" style={{ marginBottom: 2 }}>Get Help</span>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.15rem', color: 'var(--ink)' }}>Submit a Support Ticket</div>
                </div>
                <div className="sp-card">
                  {!formSuccess ? (
                    <div className="sp-card-body">
                      <div className="sp-form-grid">
                        <div className="sp-form-group">
                          <label className="sp-form-label">Category <span>*</span></label>
                          <select className={`sp-form-select${catErr ? ' invalid' : ''}`} value={fCategory} onChange={e => { setFCategory(e.target.value); setCatErr(false); }}>
                            <option value="" disabled>Select a category…</option>
                            <option value="Deposit">Deposit Issue</option>
                            <option value="Withdrawal">Withdrawal Issue</option>
                            <option value="Investment">Investment / Season</option>
                            <option value="Referral">Referral &amp; Commission</option>
                            <option value="Account">Account &amp; Security</option>
                            <option value="KYC">KYC Verification</option>
                            <option value="Technical">Technical Problem</option>
                            <option value="Other">Other</option>
                          </select>
                          {catErr && <div className="sp-form-error show">Please select a category.</div>}
                        </div>
                        <div className="sp-form-group">
                          <label className="sp-form-label">Subject <span>*</span></label>
                          <input className={`sp-form-input${subErr ? ' invalid' : ''}`} type="text" placeholder="Brief description…" maxLength={120}
                            value={fSubject} onChange={e => { setFSubject(e.target.value); setSubErr(false); }} />
                          {subErr && <div className="sp-form-error show">Subject is required.</div>}
                        </div>
                        <div className="sp-form-group">
                          <label className="sp-form-label">Priority</label>
                          <div className="sp-priority-row">
                            {[['low', '#6a8c60'], ['medium', 'var(--gold)'], ['high', '#9b3a3a'], ['urgent', '#6b2020']].map(([v, c]) => (
                              <label key={v} className="sp-priority-opt">
                                <input type="radio" name="sp-priority" value={v} checked={fPriority === v} onChange={() => setFPriority(v)} />
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span className="sp-priority-dot" style={{ background: c }} />
                                  {v.charAt(0).toUpperCase() + v.slice(1)}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="sp-form-group">
                          <label className="sp-form-label">Message <span>*</span></label>
                          <textarea className={`sp-form-textarea${msgErr ? ' invalid' : ''}`} placeholder="Describe your issue in detail…" maxLength={2000}
                            value={fMessage} onChange={e => { setFMessage(e.target.value); setMsgErr(false); }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                            {msgErr && <div className="sp-form-error show">Min 20 characters required.</div>}
                            <div className="sp-form-hint" style={{ marginLeft: 'auto' }}>{fMessage.length} / 2000</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button className="sp-btn-submit" onClick={submitForm} disabled={submitting}>
                            <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                            {submitting ? 'Sending…' : 'Submit Ticket'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="sp-form-success show">
                      <div className="sp-form-success-icon"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg></div>
                      <div className="sp-form-success-title">Ticket Submitted</div>
                      <div className="sp-ticket-id">{newTicketId}</div>
                      <p style={{ fontSize: '.74rem', color: 'var(--text-sec)', marginBottom: 16 }}>Our team will get back to you shortly.</p>
                      <button className="sp-btn-ghost" onClick={() => { setActiveTicketId(tickets[0]?.id || null); resetForm(); }}>View Ticket</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="sp-divider sp-reveal" />

            {/* TICKET HISTORY */}
            <div ref={ticketRef} className="sp-reveal">
              <div style={{ marginBottom: 16 }}>
                <span className="sp-sec-label" style={{ marginBottom: 2 }}>My Requests</span>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.15rem', color: 'var(--ink)' }}>Ticket History</div>
              </div>

              {tickets.length === 0 ? (
                <div className="sp-card">
                  <div className="sp-empty-state">
                    <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                    <p>No tickets yet. Submit a request above.</p>
                  </div>
                </div>
              ) : (
                <div className="sp-ticket-list">
                  {tickets.map(t => (
                    <div key={t.id} className="sp-ticket-row" onClick={() => setActiveTicketId(t.id)}>
                      <div className="sp-ticket-row-left">
                        <div className="sp-ticket-row-icon">
                          <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div className="sp-ticket-row-subject">{t.subject}</div>
                          <div className="sp-ticket-row-meta">
                            <span className="sp-mono">{t.ticket_id}</span>
                            <span>·</span>
                            <span>{t.category}</span>
                            <span>·</span>
                            <span>{formatDate(t.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="sp-ticket-row-right">
                        <span className={`sp-badge ${prioCls(t.priority)}`}>{t.priority}</span>
                        <span className={`sp-badge ${statusCls(t.status)}`}>
                          <span className={`sp-dot ${statusDotCls(t.status)}`} />
                          {t.status}
                        </span>
                        <span className="sp-ticket-arrow">→</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </main>
      </div>

      {/* TICKET DETAIL MODAL */}
      {activeTicketId && ticketDetails && (
        <div className="sp-modal-overlay" onClick={e => e.target === e.currentTarget && setActiveTicketId(null)}>
          <div className="sp-modal-box">

            {/* Modal Header */}
            <div className="sp-modal-header">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="sp-modal-title">{ticketDetails.subject}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  <span className="sp-mono" style={{ fontSize: '.66rem', color: 'var(--text-sec)' }}>{ticketDetails.ticket_id}</span>
                  <span className={`sp-badge ${statusCls(ticketDetails.status)}`}>
                    <span className={`sp-dot ${statusDotCls(ticketDetails.status)}`} />{ticketDetails.status}
                  </span>
                  <span className={`sp-badge ${prioCls(ticketDetails.priority)}`}>{ticketDetails.priority} priority</span>
                </div>
              </div>
              <button className="sp-modal-close" onClick={() => setActiveTicketId(null)}>
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <div className="sp-modal-body">

              {/* Ticket Details */}
              <div className="sp-modal-section">
                <div className="sp-modal-section-title">Ticket Details</div>
                <div className="sp-modal-detail-grid">
                  <div className="sp-modal-field"><div className="sp-modal-field-label">Ticket ID</div><div className="sp-modal-field-value sp-mono">{ticketDetails.ticket_id}</div></div>
                  <div className="sp-modal-field"><div className="sp-modal-field-label">Category</div><div className="sp-modal-field-value">{ticketDetails.category}</div></div>
                  <div className="sp-modal-field"><div className="sp-modal-field-label">Priority</div><div className="sp-modal-field-value">{ticketDetails.priority}</div></div>
                  <div className="sp-modal-field"><div className="sp-modal-field-label">Submitted</div><div className="sp-modal-field-value">{formatDate(ticketDetails.created_at)}</div></div>
                </div>
              </div>

              {/* Live Chat */}
              <div className="sp-modal-section">
                <div className="sp-modal-section-title">Your Messages</div>
                <div className="sp-chat-wrap">
                  <div className="sp-chat-messages" ref={chatMessagesRef}>
                    {ticketDetails.messages?.map((m: any, i: number) => {
                      const isAdmin = m.sender?.role !== 'user';
                      const sender = isAdmin ? m.sender : profile;
                      const initials = ((sender?.first_name?.[0] || '') + (sender?.last_name?.[0] || '')).toUpperCase() || '?';
                      return (
                        <div className={`sp-bubble-wrap ${isAdmin ? 'user' : 'admin'}`} key={i}>
                          <div className={`sp-bubble-av ${isAdmin ? 'sp-av-admin' : 'sp-av-user'}`}>{initials}</div>
                          <div>
                            <div className={`sp-bubble ${isAdmin ? 'user' : 'admin'}`}>{m.message}</div>
                            <div className="sp-bubble-time">{formatTime(m.created_at)}{isAdmin ? ` · ${sender?.first_name} ${sender?.last_name}` : ''}</div>
                          </div>
                        </div>
                      );
                    })}
                    {(!ticketDetails.messages || ticketDetails.messages.length === 0) && (
                      <div style={{ textAlign: 'center', padding: '24px 16px', fontSize: '.76rem', color: 'var(--text-sec)' }}>
                        No messages yet.
                      </div>
                    )}
                  </div>
                  <div className="sp-chat-footer">
                    <input
                      className="sp-chat-input"
                      type="text"
                      placeholder={ticketDetails.status === 'closed' ? 'Ticket is closed — contact us via email or Telegram.' : 'Type a message…'}
                      disabled={ticketDetails.status === 'closed'}
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendChat()}
                    />
                    <button className="sp-chat-send" disabled={ticketDetails.status === 'closed'} onClick={sendChat}>
                      <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
