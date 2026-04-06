'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Ticket { id:string;subject:string;category:string;priority:string;date:string;status:'open'|'pending'|'closed' }

const INIT_TICKETS: Ticket[] = [
  { id:'#TKT-A9X2K1', subject:'Withdrawal pending for 5 days',       category:'Withdrawal Issue', priority:'high',   date:'28 Mar 2025', status:'closed'  },
  { id:'#TKT-B3M7P2', subject:'Referral commission not credited',     category:'Referral',         priority:'medium', date:'15 Mar 2025', status:'closed'  },
  { id:'#TKT-C1L4Q8', subject:'Unable to complete KYC verification',  category:'KYC',              priority:'medium', date:'02 Mar 2025', status:'closed'  },
  { id:'#TKT-D6R2W5', subject:'Season 6 ROI calculation discrepancy', category:'Investment',       priority:'low',    date:'18 Feb 2025', status:'closed'  },
];

const FAQS = [
  { cat:'finance',  q:'How do I make a deposit?',                         a:'Navigate to the <strong>Deposit</strong> page from your dashboard. Select your preferred payment method (USDT-TRC20, USDT-ERC20, or BEP20), enter the amount, and transfer funds to the displayed wallet address. Deposits are credited within 15–30 minutes after 1 network confirmation.' },
  { cat:'finance',  q:'How long does a withdrawal take to process?',      a:'Withdrawal requests are reviewed by our team within <strong>2–3 business days</strong>. Once approved, funds are sent to your registered wallet address. Processing time on the blockchain is typically 5–30 minutes depending on network congestion.' },
  { cat:'invest',   q:'What is a Season and how does it work?',           a:'A Season is a fixed-duration investment pool with a predetermined ROI. You deposit USDT into an active Season, and at the end of the season period your principal plus ROI is returned to your account balance. Each Season has a maximum pool size — once filled, new entries are closed.' },
  { cat:'invest',   q:'Can I withdraw my investment before a Season ends?',a:'Investments in an active Season are <strong>locked for the full duration</strong>. Early withdrawals are not permitted to protect the integrity of returns for all participants. You can however withdraw your available balance (earnings and past returns) at any time.' },
  { cat:'invest',   q:'What is the minimum investment amount?',           a:'The minimum investment per Season entry is <strong>$100 USDT</strong>. There is no hard maximum, however each Season has a total pool cap. We recommend diversifying across multiple Seasons when larger amounts are involved.' },
  { cat:'referral', q:'How does the referral program work?',              a:'You earn <strong>5% commission</strong> on every USDT investment made by users you refer. Share your unique referral link or code — when a referred user registers and invests, your commission is automatically credited within 2–3 business days. Commissions are lifetime and apply to every investment your referral makes across all Seasons.' },
  { cat:'referral', q:'When is my referral commission paid out?',         a:'Referral commissions are added to your <strong>Pending Commission</strong> balance once a referred user\'s investment is confirmed. Funds move to your available balance within 2–3 business days and can then be withdrawn freely.' },
  { cat:'account',  q:'How do I verify my identity (KYC)?',              a:'Go to <strong>Settings → Identity Verification</strong>. You will need to upload a government-issued photo ID (passport, national ID, or driver\'s license) and a selfie holding your document. Verification is completed within 24–48 hours. KYC is required for withdrawals above $1,000 USDT.' },
  { cat:'account',  q:'Can I change my registered email address?',       a:'Yes. Visit <strong>Settings → Account</strong> and request an email change. A confirmation link will be sent to both your old and new email addresses. You must verify both within 24 hours for the change to take effect.' },
  { cat:'security', q:'What should I do if I suspect unauthorised access?', a:'Immediately change your password, enable two-factor authentication (2FA), and contact our support team. We recommend using a unique, strong password and enabling login notifications in your account settings.' },
  { cat:'security', q:'How do I enable two-factor authentication (2FA)?', a:'Go to <strong>Settings → Security</strong> and click <em>Enable 2FA</em>. Scan the QR code with Google Authenticator or Authy, then enter the 6-digit code to confirm. Once enabled, 2FA is required at every login and for withdrawal requests.' },
  { cat:'finance',  q:'Are there any fees for deposits or withdrawals?', a:'VaultX does not charge platform fees on deposits. For withdrawals, a small <strong>network gas fee</strong> is deducted depending on the blockchain used (TRC20 is cheapest). This fee covers blockchain transaction costs and is displayed before you confirm a withdrawal.' },
];

const CAT_LABELS: Record<string,string> = { account:'Account', invest:'Investing', finance:'Finance', referral:'Referral', security:'Security' };
const PRI_COLOR: Record<string,string> = { low:'var(--sage)', medium:'var(--gold)', high:'#9b3a3a', urgent:'#6b2020' };
const PRI_BG:    Record<string,string> = { low:'rgba(74,103,65,.08)', medium:'rgba(184,147,90,.08)', high:'rgba(155,58,58,.07)', urgent:'rgba(107,32,32,.07)' };
const PRI_BD:    Record<string,string> = { low:'rgba(74,103,65,.2)', medium:'var(--border)', high:'rgba(155,58,58,.18)', urgent:'rgba(107,32,32,.2)' };

export default function SupportPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastCls, setToastCls] = useState('');
  const [toastShow, setToastShow] = useState(false);
  const [faqCat, setFaqCat] = useState('all');
  const [faqSearch, setFaqSearch] = useState('');
  const [openFaq, setOpenFaq] = useState<number|null>(null);
  const [tickets, setTickets] = useState<Ticket[]>(INIT_TICKETS);
  // form state
  const [fCategory, setFCategory] = useState('');
  const [fSubject, setFSubject] = useState('');
  const [fMessage, setFMessage] = useState('');
  const [fPriority, setFPriority] = useState('low');
  const [formSuccess, setFormSuccess] = useState(false);
  const [ticketId, setTicketId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [catErr, setCatErr] = useState(false);
  const [subErr, setSubErr] = useState(false);
  const [msgErr, setMsgErr] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const ticketSectionRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((msg: string, cls = '') => {
    setToastMsg(msg); setToastCls(cls); setToastShow(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastShow(false), 2800);
  }, []);

  /* scroll reveal */
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); });
    }, { threshold: 0.06 });
    document.querySelectorAll<HTMLElement>('.sp-reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  /* body scroll lock */
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  /* ESC */
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setSidebarOpen(false); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  const getVisibleFaqs = () => FAQS.filter(f => {
    const catMatch = faqCat === 'all' || f.cat === faqCat;
    const q = faqSearch.toLowerCase();
    const textMatch = !q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q);
    return catMatch && textMatch;
  });

  const toggleFaq = (i: number) => setOpenFaq(openFaq === i ? null : i);

  const submitForm = () => {
    let valid = true;
    if (!fCategory) { setCatErr(true); valid = false; } else setCatErr(false);
    if (!fSubject.trim()) { setSubErr(true); valid = false; } else setSubErr(false);
    if (fMessage.trim().length < 20) { setMsgErr(true); valid = false; } else setMsgErr(false);
    if (!valid) { showToast('Please fill in all required fields.', 'err'); return; }
    setSubmitting(true);
    setTimeout(() => {
      const tid = 'TKT-' + Math.random().toString(36).slice(2,8).toUpperCase();
      setTicketId('#'+tid);
      setFormSuccess(true);
      setSubmitting(false);
      showToast('✓ Support ticket submitted!', 'ok');
      const catLabel = fCategory.charAt(0).toUpperCase()+fCategory.slice(1).replace('-',' ');
      setTickets(prev => [{ id:'#'+tid, subject:fSubject, category:catLabel, priority:fPriority, date:'Just now', status:'open' }, ...prev]);
    }, 1600);
  };

  const resetForm = () => {
    setFCategory(''); setFSubject(''); setFMessage(''); setFPriority('low');
    setFormSuccess(false); setCatErr(false); setSubErr(false); setMsgErr(false);
  };

  const navItems = [
    {id:'dashboard',label:'Dashboard',fn:()=>router.push('/dashboard'),svg:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>},
    {id:'seasons',  label:'Seasons',  fn:()=>router.push('/season'),   svg:<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>},
    {id:'deposit',  label:'Deposit',  fn:()=>router.push('/deposit'),  svg:<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></>},
    {id:'withdraw', label:'Withdraw', fn:()=>router.push('/withdraw'), svg:<><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></>},
    {id:'referral', label:'Referral', fn:()=>router.push('/referral'), svg:<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>},
    {id:'support',  label:'Support',  fn:()=>{},                       svg:<><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>},
  ] as {id:string;label:string;fn:()=>void;svg:React.ReactNode}[];

  const visibleFaqs = getVisibleFaqs();

  return (
    <>
      <div className={`sp-toast${toastShow?' show':''}${toastCls?' '+toastCls:''}`}>{toastMsg}</div>
      <div className={`sp-sb-overlay${sidebarOpen?' show':''}`} onClick={()=>setSidebarOpen(false)}/>

      {/* SIDEBAR */}
      <aside className={`sp-sidebar${sidebarOpen?' open':''}`}>
        <div className="sp-sidebar-logo">
          <a href="/" style={{textDecoration:'none',display:'flex',alignItems:'center'}}>
            <div className="sp-logo-mark"/><span className="sp-logo-text">Vault<span>X</span></span>
          </a>
        </div>
        <nav className="sp-sidebar-nav">
          {navItems.map(n=>(
            <button key={n.id} className={`sp-nav-item${n.id==='support'?' active':''}`} onClick={()=>{n.fn();setSidebarOpen(false);}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">{n.svg}</svg>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="sp-sidebar-footer">
          <div className="sp-user-row">
            <div className="sp-avatar">RK</div>
            <div><div className="sp-user-name">Rafiqul M.</div><div className="sp-user-tag">Season 4 Investor</div></div>
          </div>
        </div>
      </aside>

      <div className="sp-layout">
        {/* TOPBAR */}
        <div className="sp-mob-topbar">
          <button className="sp-mob-ham" onClick={()=>setSidebarOpen(o=>!o)}>
            <span/><span/><span/>
          </button>
          <div style={{position:'absolute',left:'50%',transform:'translateX(-50%)',display:'flex',alignItems:'center',gap:7,cursor:'pointer'}} onClick={()=>router.push('/')}>
            <div className="sp-logo-mark" style={{width:26,height:26}}/>
            <span className="sp-logo-text" style={{fontSize:'1.15rem'}}>Vault<span>X</span></span>
          </div>
          <div className="sp-mob-avatar" onClick={()=>router.push('/profile')}>RK</div>
        </div>

        <div className="sp-main-area">
          <div className="sp-content">

            {/* PAGE HEADER */}
            <div className="sp-reveal" style={{marginBottom:26}}>
              <span className="sp-sec-label">Help Center</span>
              <h1 className="sp-sec-title">Support</h1>
              <p className="sp-sec-sub">Find answers instantly or get in touch with our team.</p>
            </div>

            {/* SEARCH */}
            <div className="sp-reveal" style={{marginBottom:28}}>
              <div className="sp-search-wrap">
                <div className="sp-search-icon">
                  <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
                <input className="sp-search" type="text"
                  placeholder="Search FAQs — e.g. withdrawal, deposit, commission…"
                  value={faqSearch} onChange={e=>setFaqSearch(e.target.value)}/>
              </div>
            </div>

            {/* SUPPORT OPTIONS */}
            <div className="sp-reveal" style={{marginBottom:28}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:8}}>
                <div>
                  <span className="sp-sec-label" style={{marginBottom:2}}>Quick Access</span>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.1rem',color:'var(--ink)'}}>Contact Options</div>
                </div>
              </div>
              <div className="sp-support-grid">
                {/* Live Chat */}
                <div className="sp-support-opt" style={{opacity:.75,cursor:'not-allowed'}} onClick={()=>showToast('⚠ Live chat is currently unavailable.','err')}>
                  <div className="sp-support-opt-icon" style={{background:'rgba(155,58,58,.07)'}}>
                    <svg viewBox="0 0 24 24" style={{stroke:'#9b6a6a'}}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                  </div>
                  <div>
                    <div className="sp-support-opt-title">Live Chat</div>
                    <div className="sp-support-opt-desc">Chat with our support team in real time.</div>
                  </div>
                  <span className="sp-support-opt-badge offline">
                    <span style={{width:6,height:6,borderRadius:'50%',background:'#9b6a6a',display:'inline-block',marginRight:4}}/>
                    Not Available
                  </span>
                </div>
                {/* Email */}
                <div className="sp-support-opt" onClick={()=>showToast('📧 Opening email support…')}>
                  <div className="sp-support-opt-icon" style={{background:'rgba(184,147,90,.1)'}}>
                    <svg viewBox="0 0 24 24" style={{stroke:'var(--gold)'}}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  </div>
                  <div>
                    <div className="sp-support-opt-title">Email Support</div>
                    <div className="sp-support-opt-desc">Send us an email and get a reply within 24 hours.</div>
                  </div>
                  <span className="sp-support-opt-badge"><span className="sp-live-dot"/>Available</span>
                </div>
                {/* Telegram */}
                <div className="sp-support-opt" onClick={()=>{window.open('https://t.me/VaultXOfficial','_blank');showToast('📤 Opening Telegram…')}}>
                  <div className="sp-support-opt-icon" style={{background:'rgba(184,147,90,.08)'}}>
                    <svg viewBox="0 0 24 24" style={{stroke:'var(--gold-d)'}}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </div>
                  <div>
                    <div className="sp-support-opt-title">Telegram Support</div>
                    <div className="sp-support-opt-desc">Reach us instantly on our official Telegram channel.</div>
                  </div>
                  <span className="sp-support-opt-badge"><span className="sp-live-dot"/>Active</span>
                </div>
                {/* Ticket History */}
                <div className="sp-support-opt" onClick={()=>ticketSectionRef.current?.scrollIntoView({behavior:'smooth',block:'start'})}>
                  <div className="sp-support-opt-icon" style={{background:'rgba(28,28,28,.06)'}}>
                    <svg viewBox="0 0 24 24" style={{stroke:'var(--charcoal)'}}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  </div>
                  <div>
                    <div className="sp-support-opt-title">Ticket History</div>
                    <div className="sp-support-opt-desc">View all your past support tickets and their status.</div>
                  </div>
                  <span className="sp-support-opt-badge" style={{background:'rgba(28,28,28,.06)',color:'var(--text-sec)',borderColor:'rgba(28,28,28,.1)'}}>{tickets.length} Tickets</span>
                </div>
              </div>
            </div>

            <div className="sp-divider sp-reveal"/>

            {/* FAQ + FORM */}
            <div className="sp-two-col">

              {/* FAQ */}
              <div className="sp-reveal">
                <div style={{marginBottom:18}}>
                  <span className="sp-sec-label" style={{marginBottom:2}}>Self-Service</span>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.2rem',color:'var(--ink)',marginBottom:10}}>Frequently Asked Questions</div>
                  <div className="sp-faq-filter-row">
                    {[['all','All'],['account','Account'],['invest','Investing'],['finance','Finance'],['referral','Referral'],['security','Security']].map(([c,l])=>(
                      <button key={c} className={`sp-faq-pill${faqCat===c?' active':''}`} onClick={()=>{setFaqCat(c);setOpenFaq(null);}}>{l}</button>
                    ))}
                  </div>
                </div>
                <div className="sp-card" style={{overflow:'visible'}}>
                  <div className="sp-faq-list">
                    {visibleFaqs.length===0 ? (
                      <div className="sp-faq-empty">
                        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        No results found. Try a different search term or category.
                      </div>
                    ) : visibleFaqs.map((f,i)=>(
                      <div key={i} className="sp-faq-item">
                        <button className={`sp-faq-trigger${openFaq===i?' open':''}`} onClick={()=>toggleFaq(i)}>
                          <span className="sp-faq-q-text">{f.q}</span>
                          <span className="sp-faq-cat-tag">{CAT_LABELS[f.cat]||f.cat}</span>
                          <svg className="sp-faq-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                        <div className={`sp-faq-body${openFaq===i?' open':''}`}>
                          <div className="sp-faq-answer" dangerouslySetInnerHTML={{__html:f.a}}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CONTACT FORM */}
              <div className="sp-reveal">
                <div style={{marginBottom:18}}>
                  <span className="sp-sec-label" style={{marginBottom:2}}>Get Help</span>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.2rem',color:'var(--ink)'}}>Submit a Support Ticket</div>
                </div>
                <div className="sp-form-lock-wrap">
                  {/* LOCK OVERLAY */}
                  <div className="sp-form-lock-overlay">
                    <div className="sp-lock-icon-wrap">
                      <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                    </div>
                    <div className="sp-lock-chains">
                      <div className="sp-lock-chain-dot"/><div className="sp-lock-chain-dot"/><div className="sp-lock-chain-dot"/>
                    </div>
                    <div className="sp-lock-title">Service Unavailable</div>
                    <div className="sp-lock-message">Support ticket submission is not available in your country or region at this time.</div>
                    <div className="sp-lock-region-tag">
                      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>
                      Region Restricted
                    </div>
                  </div>
                  {/* FORM (dimmed) */}
                  <div className="sp-card" style={{opacity:.25,pointerEvents:'none',userSelect:'none'}}>
                    {!formSuccess ? (
                      <div className="sp-card-body">
                        <div className="sp-form-grid">
                          <div className="sp-form-group">
                            <label className="sp-form-label">Category <span>*</span></label>
                            <select className={`sp-form-select${catErr?' invalid':''}`} value={fCategory} onChange={e=>{setFCategory(e.target.value);setCatErr(false);}}>
                              <option value="" disabled>Select a category…</option>
                              <option value="deposit">Deposit Issue</option>
                              <option value="withdrawal">Withdrawal Issue</option>
                              <option value="investment">Investment / Season</option>
                              <option value="referral">Referral &amp; Commission</option>
                              <option value="account">Account &amp; Security</option>
                              <option value="kyc">KYC Verification</option>
                              <option value="technical">Technical Problem</option>
                              <option value="other">Other</option>
                            </select>
                            {catErr&&<div className="sp-form-error show">Please select a category.</div>}
                          </div>
                          <div className="sp-form-group">
                            <label className="sp-form-label">Subject <span>*</span></label>
                            <input className={`sp-form-input${subErr?' invalid':''}`} type="text" placeholder="Brief description of your issue…" maxLength={120}
                              value={fSubject} onChange={e=>{setFSubject(e.target.value);setSubErr(false);}}/>
                            {subErr&&<div className="sp-form-error show">Subject is required.</div>}
                          </div>
                          <div className="sp-form-group">
                            <label className="sp-form-label">Priority</label>
                            <div className="sp-priority-row">
                              {[['low','#6a8c60'],['medium','var(--gold)'],['high','#9b3a3a'],['urgent','#6b2020']].map(([v,c])=>(
                                <label key={v} className="sp-priority-opt">
                                  <input type="radio" name="priority" value={v} checked={fPriority===v} onChange={()=>setFPriority(v)}/>
                                  <span style={{display:'flex',alignItems:'center',gap:5}}>
                                    <span className="sp-priority-dot" style={{background:c}}/>
                                    {v.charAt(0).toUpperCase()+v.slice(1)}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="sp-form-group">
                            <label className="sp-form-label">Message <span>*</span></label>
                            <textarea className={`sp-form-textarea${msgErr?' invalid':''}`} placeholder="Describe your issue in detail…" maxLength={2000}
                              value={fMessage} onChange={e=>{setFMessage(e.target.value);setMsgErr(false);}}/>
                            <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
                              {msgErr&&<div className="sp-form-error show">Message must be at least 20 characters.</div>}
                              <div className="sp-form-hint" style={{marginLeft:'auto'}}>{fMessage.length} / 2000</div>
                            </div>
                          </div>
                          <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',paddingTop:4}}>
                            <button className="sp-btn-submit" onClick={submitForm} disabled={submitting}>
                              <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                              {submitting?'Sending…':'Submit Ticket'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="sp-form-success show">
                        <div className="sp-form-success-icon"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
                        <div className="sp-form-success-title">Ticket Submitted</div>
                        <div className="sp-ticket-id">{ticketId}</div>
                        <button className="sp-btn-ghost" style={{marginTop:12}} onClick={resetForm}>Submit Another</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="sp-divider sp-reveal"/>

            {/* TICKET HISTORY */}
            <div className="sp-reveal" ref={ticketSectionRef}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:10}}>
                <div>
                  <span className="sp-sec-label" style={{marginBottom:2}}>My Requests</span>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.2rem',color:'var(--ink)'}}>Ticket History</div>
                </div>
                <button className="sp-btn-ghost" onClick={()=>showToast('Exporting ticket history…')}>Export</button>
              </div>
              <div className="sp-card">
                <div className="sp-tbl-wrap">
                  <table className="sp-dtbl">
                    <thead>
                      <tr><th>Ticket ID</th><th>Subject</th><th>Category</th><th>Priority</th><th>Submitted</th><th>Status</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {tickets.map((t,i)=>(
                        <tr key={i}>
                          <td><span style={{fontFamily:'monospace',fontSize:'.72rem',color:'var(--gold)'}}>{t.id}</span></td>
                          <td><span style={{fontSize:'.78rem',fontWeight:500,color:'var(--ink)'}}>{t.subject}</span></td>
                          <td><span className="sp-td-sub">{t.category}</span></td>
                          <td>
                            <span style={{display:'inline-block',padding:'2px 9px',borderRadius:'100px',fontSize:'.6rem',letterSpacing:'.08em',textTransform:'uppercase',background:PRI_BG[t.priority],color:PRI_COLOR[t.priority],border:`1px solid ${PRI_BD[t.priority]}`}}>
                              {t.priority}
                            </span>
                          </td>
                          <td><span className="sp-td-sub">{t.date}</span></td>
                          <td>
                            <span className={`sp-badge sp-b-${t.status}`}>{t.status}</span>
                          </td>
                          <td>
                            <button className="sp-btn-ghost" style={{padding:'4px 12px',fontSize:'.62rem'}} onClick={()=>showToast(`Opening ticket ${t.id}…`)}>View</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile cards */}
                <div className="sp-ticket-cards" style={{padding:'14px 14px 8px'}}>
                  {tickets.map((t,i)=>(
                    <div key={i} className="sp-ticket-card">
                      <div className="sp-ticket-card-top">
                        <span className="sp-ticket-card-id">{t.id}</span>
                        <span className={`sp-badge sp-b-${t.status}`}>{t.status}</span>
                      </div>
                      <div className="sp-ticket-card-subject">{t.subject}</div>
                      <div className="sp-ticket-card-meta">
                        <span>{t.category}</span>
                        <span>·</span>
                        <span style={{display:'inline-block',padding:'2px 8px',borderRadius:'100px',fontSize:'.58rem',letterSpacing:'.08em',textTransform:'uppercase',background:PRI_BG[t.priority],color:PRI_COLOR[t.priority],border:`1px solid ${PRI_BD[t.priority]}`}}>{t.priority}</span>
                        <span>·</span>
                        <span>{t.date}</span>
                      </div>
                      <div className="sp-ticket-card-actions">
                        <button className="sp-btn-ghost" style={{padding:'5px 14px',fontSize:'.62rem'}} onClick={()=>showToast(`Opening ticket ${t.id}…`)}>View</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}