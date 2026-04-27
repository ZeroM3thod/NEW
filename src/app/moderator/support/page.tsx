'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useModerator } from '@/context/ModeratorContext';

/* ══════════════════════════════════════════════
   SAMPLE DATA
══════════════════════════════════════════════ */
const MODERATOR = { name:'Marcus Reid', initials:'MR', id:'mod_001' };

const INITIAL_TICKETS = [
  {
    id:'TKT-8821', uid:'USR-50291',
    fullName:'Alexandra Fontaine', username:'@alex.fontaine',
    email:'alex.fontaine@gmail.com', phone:'+1 (617) 882-4491',
    subject:'Unable to withdraw funds — transaction stuck',
    category:'Withdrawal', priority:'high', status:'open',
    submittedDate:'2025-04-23',
    message:'Hi, I submitted a withdrawal request 3 days ago and it\'s still showing as "processing". The amount is $1,200 USDT. I have not received any update or confirmation email. My wallet address is correct. Please help resolve this urgently.',
    chat:[
      { from:'user', text:'Hi, I submitted a withdrawal request 3 days ago and it\'s still processing.', time:'2025-04-23 09:14' },
      { from:'admin', text:'Hello Alexandra, thank you for reaching out. I\'m looking into your withdrawal request right now. Could you please confirm your transaction ID?', time:'2025-04-23 09:31', by:MODERATOR },
      { from:'user', text:'The transaction ID is TXN-44810293. Please hurry, I need those funds.', time:'2025-04-23 09:45' }
    ],
    log:[
      { type:'created', text:'Ticket submitted by user', date:'2025-04-23 09:14', by:null },
      { type:'opened',  text:'Ticket opened and assigned to moderator', date:'2025-04-23 09:30', by:MODERATOR },
      { type:'replied', text:'Admin replied to ticket', date:'2025-04-23 09:31', by:MODERATOR }
    ]
  },
  {
    id:'TKT-8820', uid:'USR-48823',
    fullName:'James Okafor', username:'@j.okafor',
    email:'james.okafor@outlook.com', phone:'+44 7700 912 341',
    subject:'KYC rejected — documents are clear, need review',
    category:'KYC', priority:'high', status:'pending',
    submittedDate:'2025-04-22',
    message:'My KYC was rejected with a reason saying my ID image is blurry, but I have uploaded a very clear and high-resolution photo of my national ID. I believe there has been an error in the review. Please re-examine my submission.',
    chat:[
      { from:'user', text:'My KYC was rejected but my documents are perfectly clear. I need this re-reviewed.', time:'2025-04-22 14:53' }
    ],
    log:[
      { type:'created', text:'Ticket submitted by user', date:'2025-04-22 14:53', by:null }
    ]
  },
  {
    id:'TKT-8819', uid:'USR-47110',
    fullName:'Yuki Tanaka', username:'@yuki.tanaka',
    email:'yuki.tanaka@yahoo.co.jp', phone:'+81 90-3311-7728',
    subject:'How do I join Season 7 investment pool?',
    category:'Investment', priority:'low', status:'resolved',
    submittedDate:'2025-04-20',
    message:'Hello, I am interested in joining the Season 7 investment pool but I cannot find the option in my dashboard. My account is fully verified. Can you guide me through the process?',
    chat:[
      { from:'user', text:'I cannot find the Season 7 pool in my dashboard.', time:'2025-04-20 08:22' },
      { from:'admin', text:'Hi Yuki! The Season 7 pool is accessible from the "Invest" tab in your dashboard. Make sure your wallet is funded with at least the minimum investment amount of $100 USDT. Let me know if you need further help.', time:'2025-04-20 08:55', by:{name:'Sarah Chen',initials:'SC',id:'mod_002'} },
      { from:'user', text:'Found it! Thank you so much, that was very helpful.', time:'2025-04-20 09:10' }
    ],
    log:[
      { type:'created',  text:'Ticket submitted by user', date:'2025-04-20 08:22', by:null },
      { type:'opened',   text:'Ticket opened by moderator', date:'2025-04-20 08:50', by:{name:'Sarah Chen',initials:'SC',id:'mod_002'} },
      { type:'replied',  text:'Admin replied to ticket', date:'2025-04-20 08:55', by:{name:'Sarah Chen',initials:'SC',id:'mod_002'} },
      { type:'resolved', text:'Ticket marked as resolved', date:'2025-04-20 09:15', by:{name:'Sarah Chen',initials:'SC',id:'mod_002'} }
    ]
  },
  {
    id:'TKT-8818', uid:'USR-46802',
    fullName:'Priya Sharma', username:'@priya.sharma',
    email:'priya.sharma@protonmail.com', phone:'+91 98204 77332',
    subject:'Account locked after too many login attempts',
    category:'Account', priority:'medium', status:'open',
    submittedDate:'2025-04-19',
    message:'My account has been locked after I tried logging in multiple times while forgetting my password. I have since reset my password via email, but the account remains locked. I cannot access any of my investments.',
    chat:[
      { from:'user', text:'My account is locked even after resetting my password.', time:'2025-04-19 17:06' },
      { from:'admin', text:'Hi Priya, I can see your account was temporarily locked for security. I\'ve escalated this to our technical team to unlock it manually. Please allow 1–2 hours.', time:'2025-04-19 17:40', by:MODERATOR }
    ],
    log:[
      { type:'created', text:'Ticket submitted by user', date:'2025-04-19 17:06', by:null },
      { type:'opened',  text:'Ticket opened by moderator', date:'2025-04-19 17:38', by:MODERATOR },
      { type:'replied', text:'Admin replied to ticket', date:'2025-04-19 17:40', by:MODERATOR }
    ]
  },
  {
    id:'TKT-8817', uid:'USR-45501',
    fullName:'Carlos Mendoza', username:'@c.mendoza',
    email:'carlos.mendoza@icloud.com', phone:'+52 55 8811 4490',
    subject:'Incorrect ROI calculation for Season 5',
    category:'Investment', priority:'medium', status:'closed',
    submittedDate:'2025-04-18',
    message:'According to the terms, Season 5 promised a 12.5% ROI. However, my ROI shows only 11.8% in my transaction history. There seems to be a miscalculation. The invested amount was $500 USDT.',
    chat:[
      { from:'user', text:'The ROI on my Season 5 investment appears to be wrong — it\'s lower than what was promised.', time:'2025-04-18 10:14' },
      { from:'admin', text:'Hello Carlos, I\'ve reviewed your account and the ROI calculation. The difference is due to the pool not reaching 100% capacity, which slightly affects the final rate as per the terms. I have sent you a detailed breakdown to your email.', time:'2025-04-18 11:02', by:{name:'Sarah Chen',initials:'SC',id:'mod_002'} },
      { from:'user', text:'I got the email, that makes sense now. Thank you for the explanation.', time:'2025-04-18 11:45' }
    ],
    log:[
      { type:'created',  text:'Ticket submitted by user', date:'2025-04-18 10:14', by:null },
      { type:'opened',   text:'Ticket opened by moderator', date:'2025-04-18 10:58', by:{name:'Sarah Chen',initials:'SC',id:'mod_002'} },
      { type:'replied',  text:'Admin replied to ticket', date:'2025-04-18 11:02', by:{name:'Sarah Chen',initials:'SC',id:'mod_002'} },
      { type:'resolved', text:'Ticket marked as resolved', date:'2025-04-18 11:48', by:{name:'Sarah Chen',initials:'SC',id:'mod_002'} },
      { type:'closed',   text:'Ticket closed', date:'2025-04-18 12:00', by:{name:'Sarah Chen',initials:'SC',id:'mod_002'} }
    ]
  }
];

export default function SupportManagementPage() {
  const { searchQuery, showToast } = useModerator();
  const [tickets, setTickets] = useState(INITIAL_TICKETS);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  const activeTicket = useMemo(() => tickets.find(t => t.id === activeTicketId), [tickets, activeTicketId]);

  const stats = useMemo(() => {
    return {
      total: tickets.length,
      pending: tickets.filter(t => t.status === 'pending').length,
      open: tickets.filter(t => t.status === 'open').length,
      resolved: tickets.filter(t => t.status === 'resolved').length,
      closed: tickets.filter(t => t.status === 'closed').length,
    };
  }, [tickets]);

  const filteredData = useMemo(() => {
    return tickets.filter(t => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || t.id.toLowerCase().includes(q) || t.fullName.toLowerCase().includes(q)
        || t.username.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
      return matchSearch && matchStatus && matchPriority;
    });
  }, [tickets, searchQuery, statusFilter, priorityFilter]);

  const formatDate = (s: string) => {
    if (!s) return '—';
    const d = new Date(s);
    return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  };

  const nowStr = () => {
    return new Date().toLocaleString('en-GB', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }).replace(',', '');
  };

  const statusCls = (s: string) => s === 'open' ? 'b-open' : s === 'resolved' ? 'b-resolved' : s === 'closed' ? 'b-closed' : 'b-pending';
  const statusDot = (s: string) => s === 'open' ? 'dot-open' : s === 'resolved' ? 'dot-resolved' : s === 'closed' ? 'dot-closed' : 'dot-pending';
  const prioCls = (p: string) => p === 'high' ? 'b-high' : p === 'low' ? 'b-low' : 'b-medium';
  const prioDot = (p: string) => p === 'high' ? 'pdot-high' : p === 'low' ? 'pdot-low' : 'pdot-medium';

  const setStatus = (id: string, newStatus: string) => {
    setTickets(prev => prev.map(t => {
      if (t.id === id) {
        const prevStatus = t.status;
        const logType = newStatus === 'open' ? 'opened' : newStatus === 'resolved' ? 'resolved' : newStatus === 'closed' ? 'closed' : 'opened';
        const logText = newStatus === 'open'
          ? (prevStatus === 'closed' || prevStatus === 'resolved' ? 'Ticket re-opened by moderator' : 'Ticket marked as open')
          : newStatus === 'resolved' ? 'Ticket marked as resolved'
          : 'Ticket closed';
        
        return {
          ...t,
          status: newStatus as any,
          log: [...t.log, { type: logType, text: logText, date: nowStr(), by: MODERATOR }]
        };
      }
      return t;
    }));
    showToast(`Status updated to ${newStatus}.`, newStatus === 'resolved' ? 'ok' : 'info');
  };

  const sendChat = (id: string) => {
    if (!replyText.trim()) return;
    const t = tickets.find(x => x.id === id);
    if (!t) return;
    if (t.status === 'closed') {
      showToast('Re-open the ticket before replying.', 'err');
      return;
    }

    const msg = { from: 'admin', text: replyText, time: nowStr(), by: MODERATOR };
    
    setTickets(prev => prev.map(t => {
      if (t.id === id) {
        const newStatus = t.status === 'pending' ? 'open' : t.status;
        const newLog = [...t.log];
        if (t.status === 'pending') {
          newLog.push({ type: 'opened', text: 'Ticket opened by moderator', date: nowStr(), by: MODERATOR });
        }
        newLog.push({ type: 'replied', text: 'Admin replied to ticket', date: nowStr(), by: MODERATOR });
        
        return {
          ...t,
          status: newStatus as any,
          chat: [...t.chat, msg],
          log: newLog
        };
      }
      return t;
    }));

    setReplyText('');
    showToast('Reply sent successfully.', 'ok');
  };

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [activeTicket?.chat]);

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); obs.unobserve(e.target); } });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [tickets]);

  return (
    <>
      {/* PAGE TITLE */}
      <div className="reveal" style={{ marginBottom:28 }}>
        <span className="sec-label">Help Desk · Tickets</span>
        <h1 className="sec-title">Support Management</h1>
        <p className="sec-sub">View, respond to, and manage all user support tickets.</p>
      </div>

      {/* STAT CARDS */}
      <div className="stats-grid reveal" style={{ marginBottom:24 }}>
        {[
          { icon: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>, val: stats.total, lbl: 'Total Tickets', bg: 'rgba(184,147,90,.1)', color: 'var(--gold)' },
          { icon: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>, val: stats.pending, lbl: 'Pending', bg: 'rgba(184,147,90,.1)', color: 'var(--gold)' },
          { icon: <><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="13" y2="14"/></>, val: stats.open, lbl: 'Open', bg: 'rgba(59,130,246,.08)', color: '#2563eb' },
          { icon: <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>, val: stats.resolved, lbl: 'Resolved', bg: 'rgba(74,103,65,.1)', color: 'var(--sage)' },
          { icon: <><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></>, val: stats.closed, lbl: 'Closed', bg: 'rgba(28,28,28,.06)', color: 'var(--text-sec)' },
        ].map((s, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-icon" style={{ background:s.bg, color:s.color }}>
              <svg viewBox="0 0 24 24">{s.icon}</svg>
            </div>
            <div className="stat-val">{s.val}</div>
            <div className="stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* TABLE */}
      <div className="table-card reveal">
        <div className="table-head">
          <div>
            <div className="table-title">Support Tickets</div>
            <div className="table-sub">Showing {filteredData.length} of {tickets.length} tickets</div>
          </div>
          <div className="filter-bar">
            <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Tickets</option>
              <option value="pending">Pending</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select className="filter-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
        <div className="tbl-wrap">
          <table className="dtbl">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>User</th>
                <th className="hide-sm">Subject</th>
                <th className="hide-md">Category</th>
                <th className="hide-md">Priority</th>
                <th className="hide-md">Submitted</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map(t => {
                const ini = t.fullName.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
                return (
                  <tr key={t.id}>
                    <td><span className="td-sub detail-mono">{t.id}</span></td>
                    <td>
                      <div className="td-user">
                        <div className="td-av">{ini}</div>
                        <div><div className="td-name">{t.fullName}</div><div className="td-sub">{t.username}</div></div>
                      </div>
                    </td>
                    <td className="hide-sm" style={{ maxWidth:200 }}>
                      <div style={{ fontSize:'.78rem',color:'var(--ink)',fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:180 }} title={t.subject}>{t.subject}</div>
                    </td>
                    <td className="hide-md"><span className="td-sub">{t.category}</span></td>
                    <td className="hide-md"><span className={`badge ${prioCls(t.priority)}`}><span className={`prio-dot ${prioDot(t.priority)}`}></span>{t.priority}</span></td>
                    <td className="hide-md"><span className="td-sub">{formatDate(t.submittedDate)}</span></td>
                    <td><span className={`badge ${statusCls(t.status)}`}><span className={`status-dot ${statusDot(t.status)}`}></span>{t.status}</span></td>
                    <td><button className="btn-view" onClick={() => setActiveTicketId(t.id)}>View →</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredData.length === 0 && (
          <div className="empty-state">
            <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            <p>No tickets match your search or filter.</p>
          </div>
        )}
      </div>

      {/* TICKET DETAIL MODAL */}
      {activeTicket && (
        <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && setActiveTicketId(null)}>
          <div className="modal-box">
            <div className="modal-header">
              <div style={{ flex:1,minWidth:0 }}>
                <div className="modal-title">{activeTicket.subject}</div>
                <div style={{ display:'flex',alignItems:'center',gap:8,marginTop:5,flexWrap:'wrap' }}>
                  <span style={{ fontSize:'.66rem',color:'var(--text-sec)',fontFamily:'monospace' }}>{activeTicket.id}</span>
                  <span className={`badge ${statusCls(activeTicket.status)}`}>{activeTicket.status}</span>
                  <span className={`badge ${prioCls(activeTicket.priority)}`}>{activeTicket.priority} priority</span>
                </div>
              </div>
              <button className="modal-close" onClick={() => setActiveTicketId(null)}>
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              {/* User Details */}
              <div className="detail-section">
                <div className="detail-section-title">User Details</div>
                <div className="detail-grid">
                  <div className="detail-field"><div className="detail-label">Full Name</div><div className="detail-value">{activeTicket.fullName}</div></div>
                  <div className="detail-field"><div className="detail-label">Username</div><div className="detail-value">{activeTicket.username}</div></div>
                  <div className="detail-field"><div className="detail-label">Email</div><div className="detail-value">{activeTicket.email}</div></div>
                  <div className="detail-field"><div className="detail-label">Phone</div><div className="detail-value">{activeTicket.phone}</div></div>
                </div>
              </div>

              {/* Ticket Info */}
              <div className="detail-section">
                <div className="detail-section-title">Ticket Information</div>
                <div className="detail-grid-3">
                  <div className="detail-field"><div className="detail-label">Ticket ID</div><div className="detail-value detail-mono">{activeTicket.id}</div></div>
                  <div className="detail-field"><div className="detail-label">Category</div><div className="detail-value">{activeTicket.category}</div></div>
                  <div className="detail-field"><div className="detail-label">Priority</div><div className="detail-value">{activeTicket.priority}</div></div>
                  <div className="detail-field"><div className="detail-label">Submitted Date</div><div className="detail-value">{formatDate(activeTicket.submittedDate)}</div></div>
                  <div className="detail-field"><div className="detail-label">Status</div><div className="detail-value">{activeTicket.status}</div></div>
                  <div className="detail-field"><div className="detail-label">User ID</div><div className="detail-value detail-mono">{activeTicket.uid}</div></div>
                </div>
              </div>

              {/* User Message */}
              <div className="detail-section">
                <div className="detail-section-title">User Message</div>
                <div className="msg-box">{activeTicket.message}</div>
              </div>

              {/* Live Chat */}
              <div className="detail-section">
                <div className="detail-section-title">Live Chat</div>
                <div className="chat-wrap">
                  <div className="chat-messages" ref={chatMessagesRef}>
                    {activeTicket.chat.map((m, i) => {
                      const isAdmin = m.from === 'admin';
                      const ini = isAdmin ? (m.by ? m.by.initials : 'AD') : activeTicket.fullName.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
                      return (
                        <div className={`bubble-wrap ${m.from}`} key={i}>
                          <div className={`bubble-av ${isAdmin?'admin-av':'user-av'}`}>{ini}</div>
                          <div>
                            <div className={`bubble ${m.from}`}>{m.text}</div>
                            <div className="bubble-time">{m.time}{isAdmin&&m.by?' · '+m.by.name:''}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="chat-footer">
                    <input 
                      className="chat-input" 
                      type="text"
                      placeholder={activeTicket.status === 'closed' ? 'Ticket is closed — re-open to reply…' : 'Type a reply…'}
                      disabled={activeTicket.status === 'closed'}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendChat(activeTicket.id)}
                    />
                    <button className="btn-send" disabled={activeTicket.status === 'closed'} onClick={() => sendChat(activeTicket.id)}>Send</button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="detail-section">
                <div className="detail-section-title">Actions</div>
                <div className="action-row">
                  {activeTicket.status === 'pending' && <button className="btn-open" onClick={() => setStatus(activeTicket.id, 'open')}>→ Mark as Open</button>}
                  {(activeTicket.status === 'pending' || activeTicket.status === 'open') && <button className="btn-resolve" onClick={() => setStatus(activeTicket.id, 'resolved')}>✓ Mark as Resolved</button>}
                  {activeTicket.status !== 'closed' && <button className="btn-close-ticket" onClick={() => setStatus(activeTicket.id, 'closed')}>✕ Close Ticket</button>}
                  {(activeTicket.status === 'closed' || activeTicket.status === 'resolved') && <button className="btn-open" onClick={() => setStatus(activeTicket.id, 'open')}>↺ Re-open Ticket</button>}
                </div>
              </div>

              {/* Activity Log */}
              <div className="detail-section">
                <div className="detail-section-title">Activity Log</div>
                <div className="history-log">
                  {[...activeTicket.log].reverse().map((l, i) => (
                    <div className="log-entry" key={i}>
                      <div className={`log-dot ${l.type}`}></div>
                      <div style={{ flex:1 }}>
                        <div className="log-text">
                          <strong>{l.text}</strong>
                          {l.by && <> &mdash; <span style={{ color:'var(--gold-d)' }}>{l.by.name}</span></>}
                        </div>
                        <div className="log-time">{l.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
