'use client';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useModerator } from '@/context/ModeratorContext';
import { createClient } from '@/utils/supabase/client';

export default function SupportManagementPage() {
  const supabase = createClient();
  const { searchQuery, showToast, moderator } = useModerator();
  const [tickets, setTickets] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [ticketDetails, setTicketDetails] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  const fetchTickets = useCallback(async () => {
    const res = await fetch('/api/support/tickets');
    const data = await res.json();
    if (!data.error) setTickets(data);
  }, []);

  useEffect(() => {
    fetchTickets();

    // Global listener for ticket updates (to keep list/stats fresh)
    const globalChannel = supabase
      .channel('global-tickets')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'support_tickets'
      }, () => {
        fetchTickets();
      })
      .subscribe();

    return () => { supabase.removeChannel(globalChannel); };
  }, [fetchTickets, supabase]);

  useEffect(() => {
    if (activeTicketId) {
      const fetchDetails = async () => {
        const res = await fetch(`/api/support/tickets/${activeTicketId}`);
        const data = await res.json();
        if (!data.error) setTicketDetails(data);
      };
      fetchDetails();

      const channel = supabase
        .channel(`mod-ticket-${activeTicketId}`)
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
              // Avoid duplicates if optimistic update already added it
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
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_logs',
          filter: `ticket_id=eq.${activeTicketId}`
        }, async (payload) => {
          const { data: newLog } = await supabase
            .from('ticket_logs')
            .select('*, performer:performed_by(first_name, last_name)')
            .eq('id', payload.new.id)
            .single();

          if (newLog) {
            setTicketDetails((prev: any) => {
              if (prev?.id !== activeTicketId) return prev;
              if (prev.logs?.some((l: any) => l.id === newLog.id)) return prev;
              return {
                ...prev,
                logs: [newLog, ...(prev?.logs || [])]
              };
            });
          }
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    } else {
      setTicketDetails(null);
    }
  }, [activeTicketId, supabase]);

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
      const matchSearch = !q || t.ticket_id.toLowerCase().includes(q) 
        || (t.profiles?.first_name + ' ' + t.profiles?.last_name).toLowerCase().includes(q)
        || t.profiles?.username?.toLowerCase().includes(q) 
        || t.subject.toLowerCase().includes(q);
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

  const formatTime = (s: string) => {
    return new Date(s).toLocaleString('en-GB', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }).replace(',', '');
  };

  const statusCls = (s: string) => s === 'open' ? 'b-open' : s === 'resolved' ? 'b-resolved' : s === 'closed' ? 'b-closed' : 'b-pending';
  const statusDot = (s: string) => s === 'open' ? 'dot-open' : s === 'resolved' ? 'dot-resolved' : s === 'closed' ? 'dot-closed' : 'dot-pending';
  const prioCls = (p: string) => p === 'high' ? 'b-high' : p === 'low' ? 'b-low' : 'b-medium';
  const prioDot = (p: string) => p === 'high' ? 'pdot-high' : p === 'low' ? 'pdot-low' : 'pdot-medium';

  const setStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/support/tickets/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      showToast(`Status updated to ${newStatus}.`, newStatus === 'resolved' ? 'ok' : 'info');
    } catch (err: any) {
      showToast(err.message, 'err');
    }
  };

  const sendChat = async (id: string) => {
    if (!replyText.trim()) return;
    if (ticketDetails?.status === 'closed') {
      showToast('Re-open the ticket before replying.', 'err');
      return;
    }

    const msgText = replyText;
    setReplyText('');

    // Optimistic Update
    const tempId = 'opt-' + Math.random().toString(36).substr(2, 9);
    const optimisticMsg = {
      id: tempId,
      message: msgText,
      created_at: new Date().toISOString(),
      sender_id: moderator?.id,
      isOptimistic: true,
      sender: {
        id: moderator?.id,
        first_name: moderator?.first_name || 'You',
        last_name: moderator?.last_name || '',
        role: moderator?.role || 'moderator'
      }
    };

    setTicketDetails((prev: any) => ({
      ...prev,
      messages: [...(prev?.messages || []), optimisticMsg]
    }));

    try {
      const res = await fetch(`/api/support/tickets/${id}/messages`, {
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

      showToast('Reply sent successfully.', 'ok');
    } catch (err: any) {
      showToast(err.message, 'err');
      // Rollback
      setTicketDetails((prev: any) => ({
        ...prev,
        messages: prev.messages?.filter((m: any) => m.id !== tempId)
      }));
    }
  };

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [ticketDetails?.messages]);

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
                const fullName = (t.profiles?.first_name || '') + ' ' + (t.profiles?.last_name || '');
                const ini = fullName.split(' ').map((n: string)=>n[0]).join('').slice(0,2).toUpperCase();
                return (
                  <tr key={t.id}>
                    <td><span className="td-sub detail-mono">{t.ticket_id}</span></td>
                    <td>
                      <div className="td-user">
                        <div className="td-av">{ini}</div>
                        <div><div className="td-name">{fullName}</div><div className="td-sub">@{t.profiles?.username}</div></div>
                      </div>
                    </td>
                    <td className="hide-sm" style={{ maxWidth:200 }}>
                      <div style={{ fontSize:'.78rem',color:'var(--ink)',fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:180 }} title={t.subject}>{t.subject}</div>
                    </td>
                    <td className="hide-md"><span className="td-sub">{t.category}</span></td>
                    <td className="hide-md"><span className={`badge ${prioCls(t.priority)}`}><span className={`prio-dot ${prioDot(t.priority)}`}></span>{t.priority}</span></td>
                    <td className="hide-md"><span className="td-sub">{formatDate(t.created_at)}</span></td>
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
      {activeTicketId && ticketDetails && (
        <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && setActiveTicketId(null)}>
          <div className="modal-box">
            <div className="modal-header">
              <div style={{ flex:1,minWidth:0 }}>
                <div className="modal-title">{ticketDetails.subject}</div>
                <div style={{ display:'flex',alignItems:'center',gap:8,marginTop:5,flexWrap:'wrap' }}>
                  <span style={{ fontSize:'.66rem',color:'var(--text-sec)',fontFamily:'monospace' }}>{ticketDetails.ticket_id}</span>
                  <span className={`badge ${statusCls(ticketDetails.status)}`}>{ticketDetails.status}</span>
                  <span className={`badge ${prioCls(ticketDetails.priority)}`}>{ticketDetails.priority} priority</span>
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
                  <div className="detail-field"><div className="detail-label">Full Name</div><div className="detail-value">{ticketDetails.profiles?.first_name} {ticketDetails.profiles?.last_name}</div></div>
                  <div className="detail-field"><div className="detail-label">Username</div><div className="detail-value">@{ticketDetails.profiles?.username}</div></div>
                  <div className="detail-field"><div className="detail-label">Email</div><div className="detail-value">{ticketDetails.profiles?.email}</div></div>
                  <div className="detail-field"><div className="detail-label">Phone</div><div className="detail-value">{ticketDetails.profiles?.phone_number}</div></div>
                </div>
              </div>

              {/* Ticket Info */}
              <div className="detail-section">
                <div className="detail-section-title">Ticket Information</div>
                <div className="detail-grid-3">
                  <div className="detail-field"><div className="detail-label">Ticket ID</div><div className="detail-value detail-mono">{ticketDetails.ticket_id}</div></div>
                  <div className="detail-field"><div className="detail-label">Category</div><div className="detail-value">{ticketDetails.category}</div></div>
                  <div className="detail-field"><div className="detail-label">Priority</div><div className="detail-value">{ticketDetails.priority}</div></div>
                  <div className="detail-field"><div className="detail-label">Submitted Date</div><div className="detail-value">{formatDate(ticketDetails.created_at)}</div></div>
                  <div className="detail-field"><div className="detail-label">Status</div><div className="detail-value">{ticketDetails.status}</div></div>
                  <div className="detail-field"><div className="detail-label">User ID</div><div className="detail-value detail-mono">{ticketDetails.user_id}</div></div>
                </div>
              </div>

              {/* Live Chat */}
              <div className="detail-section">
                <div className="detail-section-title">Live Chat</div>
                <div className="chat-wrap">
                  <div className="chat-messages" ref={chatMessagesRef}>
                    {ticketDetails.messages?.map((m: any, i: number) => {
                      const isAdmin = m.sender?.role !== 'user';
                      const sender = isAdmin ? m.sender : ticketDetails.profiles;
                      const ini = ((sender?.first_name?.[0] || '') + (sender?.last_name?.[0] || '')).toUpperCase() || '?';
                      return (
                        <div className={`bubble-wrap ${isAdmin ? 'admin' : 'user'}`} key={i}>
                          <div className={`bubble-av ${isAdmin?'admin-av':'user-av'}`}>{ini}</div>
                          <div>
                            <div className={`bubble ${isAdmin ? 'admin' : 'user'}`}>{m.message}</div>
                            <div className="bubble-time">{formatTime(m.created_at)}{isAdmin ? ` · ${sender?.first_name} ${sender?.last_name}` : ''}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="chat-footer">
                    <input 
                      className="chat-input" 
                      type="text"
                      placeholder={ticketDetails.status === 'closed' ? 'Ticket is closed — re-open to reply…' : 'Type a reply…'}
                      disabled={ticketDetails.status === 'closed'}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendChat(ticketDetails.id)}
                    />
                    <button className="btn-send" disabled={ticketDetails.status === 'closed'} onClick={() => sendChat(ticketDetails.id)}>Send</button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="detail-section">
                <div className="detail-section-title">Actions</div>
                <div className="action-row">
                  {ticketDetails.status === 'pending' && <button className="btn-open" onClick={() => setStatus(ticketDetails.id, 'open')}>→ Mark as Open</button>}
                  {(ticketDetails.status === 'pending' || ticketDetails.status === 'open') && <button className="btn-resolve" onClick={() => setStatus(ticketDetails.id, 'resolved')}>✓ Mark as Resolved</button>}
                  {ticketDetails.status !== 'closed' && <button className="btn-close-ticket" onClick={() => setStatus(ticketDetails.id, 'closed')}>✕ Close Ticket</button>}
                  {(ticketDetails.status === 'closed' || ticketDetails.status === 'resolved') && <button className="btn-open" onClick={() => setStatus(ticketDetails.id, 'open')}>↺ Re-open Ticket</button>}
                </div>
              </div>

              {/* Activity Log */}
              <div className="detail-section">
                <div className="detail-section-title">Activity Log</div>
                <div className="history-log">
                  {ticketDetails.logs?.map((l: any, i: number) => {
                    const logDetails = typeof l.details === 'string' ? JSON.parse(l.details) : l.details;
                    return (
                      <div className="log-entry" key={i}>
                        <div className={`log-dot ${l.action}`}></div>
                        <div style={{ flex:1 }}>
                          <div className="log-text">
                            <strong>{logDetails?.text || l.action.replace('_', ' ')}</strong>
                            {l.performer && <> &mdash; <span style={{ color:'var(--gold-d)' }}>{l.performer.first_name} {l.performer.last_name}</span></>}
                          </div>
                          <div className="log-time">{formatTime(l.created_at)}</div>
                        </div>
                      </div>
                    );
                  })}
                  {(!ticketDetails.logs || ticketDetails.logs.length === 0) && (
                    <div style={{ textAlign: 'center', padding: '12px', fontSize: '.7rem', color: 'var(--text-sec)' }}>
                      No activity logs yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
