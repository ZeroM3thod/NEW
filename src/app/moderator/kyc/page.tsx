'use client';
import { useState, useEffect, useMemo } from 'react';
import { useModerator } from '@/context/ModeratorContext';

interface HistoryEntry {
  type: string;
  text: string;
  date: string;
  by: { name: string; initials: string; id: string } | null;
  reason?: string | null;
}

interface KycItem {
  id: string;
  uid: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  dob: string;
  idNumber: string;
  idType: string;
  country: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  submittedDate: string;
  status: 'pending' | 'approved' | 'rejected';
  idFrontUrl: string | null;
  idBackUrl: string | null;
  selfieUrl: string | null;
  history: HistoryEntry[];
}

const MODERATOR = { name: 'Marcus Reid', initials: 'MR', id: 'mod_001' };

const INITIAL_KYC_DATA: KycItem[] = [
  {
    id: 'KYC-10041', uid: 'USR-50291',
    fullName: 'Alexandra Fontaine', username: '@alex.fontaine',
    email: 'alex.fontaine@gmail.com', phone: '+1 (617) 882-4491',
    dob: '1992-03-15', idNumber: 'P-A28847391',
    idType: 'Passport', country: 'United States',
    address1: '74 Marlborough Street', address2: 'Apt 3B',
    city: 'Boston', state: 'Massachusetts', zip: '02116',
    submittedDate: '2025-04-22', status: 'pending',
    idFrontUrl: null, idBackUrl: null, selfieUrl: null,
    history: [{ type:'submitted', text:'Application submitted by user', date:'2025-04-22 09:14', by:null }]
  },
  {
    id: 'KYC-10040', uid: 'USR-48823',
    fullName: 'James Okafor', username: '@j.okafor',
    email: 'james.okafor@outlook.com', phone: '+44 7700 912 341',
    dob: '1988-11-04', idNumber: 'NI-GB-334812',
    idType: 'National ID', country: 'United Kingdom',
    address1: '12 Notting Hill Gate', address2: 'Flat 7',
    city: 'London', state: 'England', zip: 'W11 3JE',
    submittedDate: '2025-04-21', status: 'pending',
    idFrontUrl: null, idBackUrl: null, selfieUrl: null,
    history: [{ type:'submitted', text:'Application submitted by user', date:'2025-04-21 14:53', by:null }]
  },
  {
    id: 'KYC-10039', uid: 'USR-47110',
    fullName: 'Yuki Tanaka', username: '@yuki.tanaka',
    email: 'yuki.tanaka@yahoo.co.jp', phone: '+81 90-3311-7728',
    dob: '1995-07-22', idNumber: 'DL-JP-19954412',
    idType: 'Driving Licence', country: 'Japan',
    address1: '3-14-8 Shibuya', address2: '',
    city: 'Tokyo', state: 'Tokyo Metropolis', zip: '150-0002',
    submittedDate: '2025-04-20', status: 'approved',
    idFrontUrl: null, idBackUrl: null, selfieUrl: null,
    history: [
      { type:'submitted', text:'Application submitted by user', date:'2025-04-20 08:22', by:null },
      { type:'approved', text:'KYC approved by moderator', date:'2025-04-20 11:47', by:MODERATOR, reason:null }
    ]
  },
  {
    id: 'KYC-10038', uid: 'USR-46802',
    fullName: 'Priya Sharma', username: '@priya.sharma',
    email: 'priya.sharma@protonmail.com', phone: '+91 98204 77332',
    dob: '1997-02-09', idNumber: 'NI-IN-9902-7733',
    idType: 'National ID', country: 'India',
    address1: '45 MG Road', address2: 'Block C, 2nd Floor',
    city: 'Bangalore', state: 'Karnataka', zip: '560001',
    submittedDate: '2025-04-19', status: 'rejected',
    idFrontUrl: null, idBackUrl: null, selfieUrl: null,
    history: [
      { type:'submitted', text:'Application submitted by user', date:'2025-04-19 17:06', by:null },
      { type:'rejected', text:'KYC rejected by moderator', date:'2025-04-19 20:33', by:MODERATOR, reason:'ID image is blurry and unreadable. Please resubmit with a clear, high-quality photo.' }
    ]
  },
  {
    id: 'KYC-10037', uid: 'USR-45501',
    fullName: 'Carlos Mendoza', username: '@c.mendoza',
    email: 'carlos.mendoza@icloud.com', phone: '+52 55 8811 4490',
    dob: '1990-06-30', idNumber: 'P-MX-G29011944',
    idType: 'Passport', country: 'Mexico',
    address1: 'Av. Insurgentes Sur 1602', address2: 'Piso 8',
    city: 'Mexico City', state: 'CDMX', zip: '03940',
    submittedDate: '2025-04-18', status: 'approved',
    idFrontUrl: null, idBackUrl: null, selfieUrl: null,
    history: [
      { type:'submitted', text:'Application submitted by user', date:'2025-04-18 10:14', by:null },
      { type:'approved', text:'KYC approved by moderator', date:'2025-04-18 14:22', by:{ name:'Sarah Chen', initials:'SC', id:'mod_002' }, reason:null }
    ]
  },
  {
    id: 'KYC-10036', uid: 'USR-44193',
    fullName: 'Elena Volkov', username: '@e.volkov',
    email: 'elena.volkov@gmail.com', phone: '+7 916 321 5544',
    dob: '1993-12-17', idNumber: 'NI-RU-7743-2291',
    idType: 'National ID', country: 'Russia',
    address1: 'ul. Arbat 22', address2: 'kv. 14',
    city: 'Moscow', state: 'Moscow Oblast', zip: '119002',
    submittedDate: '2025-04-17', status: 'pending',
    idFrontUrl: null, idBackUrl: null, selfieUrl: null,
    history: [{ type:'submitted', text:'Application submitted by user', date:'2025-04-17 13:38', by:null }]
  },
  {
    id: 'KYC-10035', uid: 'USR-43880',
    fullName: 'Noah Williams', username: '@noah.w',
    email: 'noah.williams@hey.com', phone: '+1 (404) 553-9921',
    dob: '1991-08-11', idNumber: 'DL-US-GA-8812-004',
    idType: 'Driving Licence', country: 'United States',
    address1: '890 Peachtree Street NE', address2: '',
    city: 'Atlanta', state: 'Georgia', zip: '30309',
    submittedDate: '2025-04-16', status: 'rejected',
    idFrontUrl: null, idBackUrl: null, selfieUrl: null,
    history: [
      { type:'submitted', text:'Application submitted by user', date:'2025-04-16 08:50', by:null },
      { type:'rejected', text:'KYC rejected by moderator', date:'2025-04-16 09:15', by:{ name:'Sarah Chen', initials:'SC', id:'mod_002' }, reason:'Selfie does not match the ID document photo. Please ensure the selfie clearly shows your face.' }
    ]
  },
  {
    id: 'KYC-10034', uid: 'USR-42200',
    fullName: 'Fatima Al-Rashid', username: '@f.alrashid',
    email: 'fatima.alrashid@gmail.com', phone: '+971 50 442 8813',
    dob: '1994-05-03', idNumber: 'P-UAE-784-1994-1234567',
    idType: 'Passport', country: 'UAE',
    address1: 'Building 5, Sheikh Zayed Road', address2: 'Apartment 1204',
    city: 'Dubai', state: 'Dubai Emirate', zip: '00000',
    submittedDate: '2025-04-15', status: 'approved',
    idFrontUrl: null, idBackUrl: null, selfieUrl: null,
    history: [
      { type:'submitted', text:'Application submitted by user', date:'2025-04-15 11:29', by:null },
      { type:'approved', text:'KYC approved by moderator', date:'2025-04-15 15:44', by:MODERATOR, reason:null }
    ]
  },
  {
    id: 'KYC-10033', uid: 'USR-40987',
    fullName: 'Liam O\'Brien', username: '@liam.obrien',
    email: 'liam.obrien@eircom.net', phone: '+353 85 770 4412',
    dob: '1989-09-28', idNumber: 'NI-IE-33801-99',
    idType: 'National ID', country: 'Ireland',
    address1: '17 Grafton Street', address2: '',
    city: 'Dublin', state: 'County Dublin', zip: 'D02 R590',
    submittedDate: '2025-04-14', status: 'pending',
    idFrontUrl: null, idBackUrl: null, selfieUrl: null,
    history: [{ type:'submitted', text:'Application submitted by user', date:'2025-04-14 16:07', by:null }]
  },
  {
    id: 'KYC-10032', uid: 'USR-39874',
    fullName: 'Mei Zhang', username: '@mei.zhang',
    email: 'mei.zhang@163.com', phone: '+86 138 0013 8000',
    dob: '1996-01-14', idNumber: 'NI-CN-110105199601140012',
    idType: 'National ID', country: 'China',
    address1: 'No. 88 Wangfujing Street', address2: 'Suite 401',
    city: 'Beijing', state: 'Beijing Municipality', zip: '100006',
    submittedDate: '2025-04-13', status: 'approved',
    idFrontUrl: null, idBackUrl: null, selfieUrl: null,
    history: [
      { type:'submitted', text:'Application submitted by user', date:'2025-04-13 07:55', by:null },
      { type:'approved', text:'KYC approved by moderator', date:'2025-04-13 10:30', by:{ name:'Sarah Chen', initials:'SC', id:'mod_002' }, reason:null }
    ]
  }
];

export default function KycManagementPage() {
  const { searchQuery, showToast } = useModerator();
  const [kycData, setKycData] = useState<KycItem[]>(INITIAL_KYC_DATA);
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeKycId, setActiveKycId] = useState<string | null>(null);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const activeKyc = useMemo(() => kycData.find(k => k.id === activeKycId), [kycData, activeKycId]);

  const stats = useMemo(() => {
    return {
      total: kycData.length,
      pending: kycData.filter(k => k.status === 'pending').length,
      approved: kycData.filter(k => k.status === 'approved').length,
      rejected: kycData.filter(k => k.status === 'rejected').length,
    };
  }, [kycData]);

  const filteredData = useMemo(() => {
    return kycData.filter(k => {
      const matchSearch = !searchQuery ||
        k.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchFilter = statusFilter === 'all' || k.status === statusFilter;
      return matchSearch && matchFilter;
    });
  }, [kycData, searchQuery, statusFilter]);

  const formatDate = (str: string) => {
    if (!str) return '—';
    const d = new Date(str);
    return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  };

  const nowStr = () => {
    const d = new Date();
    return d.toLocaleString('en-GB', { year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit' }).replace(',','');
  };

  const approveKyc = (id: string) => {
    setKycData(prev => prev.map(k => {
      if (k.id === id) {
        return {
          ...k,
          status: 'approved' as const,
          history: [...k.history, { type: 'approved', text: 'KYC approved by moderator', date: nowStr(), by: MODERATOR, reason: null }]
        };
      }
      return k;
    }));
    showToast(`✓ KYC has been approved.`, 'ok');
  };

  const confirmReject = (id: string) => {
    if (!rejectReason.trim()) {
      showToast('Please write a rejection reason.', 'err');
      return;
    }
    setKycData(prev => prev.map(k => {
      if (k.id === id) {
        return {
          ...k,
          status: 'rejected' as const,
          history: [...k.history, { type: 'rejected', text: 'KYC rejected by moderator', date: nowStr(), by: MODERATOR, reason: rejectReason }]
        };
      }
      return k;
    }));
    showToast(`✕ KYC has been rejected.`, 'err');
    setShowRejectBox(false);
    setRejectReason('');
  };

  const reopenKyc = (id: string) => {
    setKycData(prev => prev.map(k => {
      if (k.id === id) {
        return {
          ...k,
          status: 'pending' as const,
          history: [...k.history, { type: 'reopened', text: 'Application re-opened for review', date: nowStr(), by: MODERATOR, reason: null }]
        };
      }
      return k;
    }));
    showToast(`↺ KYC re-opened for review.`, 'info');
  };

  const exportCSV = () => {
    const rows = [['ID','Full Name','Username','Email','Country','ID Type','Submitted','Status']];
    filteredData.forEach(k => rows.push([k.id, k.fullName, k.username, k.email, k.country, k.idType, k.submittedDate, k.status]));
    const csv  = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `kyc-applications-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported successfully.', 'ok');
  };

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); obs.unobserve(e.target); } });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [kycData]);

  return (
    <>
      {/* Page Header */}
      <div className="reveal" style={{ marginBottom:28 }}>
        <span className="sec-label">Compliance · Verification</span>
        <h1 className="sec-title">KYC Management</h1>
        <p className="sec-sub">Review, approve, and manage user identity verification submissions.</p>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid reveal" style={{ marginBottom:24 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background:'rgba(184,147,90,.1)', color:'var(--gold)' }}>
            <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
          </div>
          <div className="stat-val">{stats.total}</div>
          <div className="stat-lbl">Total Submissions</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background:'rgba(184,147,90,.1)', color:'var(--gold)' }}>
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="stat-val">{stats.pending}</div>
          <div className="stat-lbl">Pending Review</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background:'rgba(74,103,65,.1)', color:'var(--sage)' }}>
            <svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div className="stat-val">{stats.approved}</div>
          <div className="stat-lbl">Approved</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background:'rgba(155,58,58,.08)', color:'var(--error)' }}>
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div className="stat-val">{stats.rejected}</div>
          <div className="stat-lbl">Rejected</div>
        </div>
      </div>

      {/* Table Card */}
      <div className="table-card reveal">
        <div className="table-head">
          <div>
            <div className="table-title">KYC Applications</div>
            <div className="table-sub">Showing {filteredData.length} of {kycData.length} applications</div>
          </div>
          <div className="filter-bar">
            <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <button className="btn-ghost" onClick={exportCSV}>
              <svg style={{ width:12,height:12,stroke:'currentColor',fill:'none',strokeWidth:2,display:'inline',marginRight:4,verticalAlign:'middle' }} viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export
            </button>
          </div>
        </div>

        <div className="tbl-wrap">
          <table className="dtbl">
            <thead>
              <tr>
                <th>User</th>
                <th className="hide-sm">Username</th>
                <th className="hide-sm">Email</th>
                <th className="hide-md">ID Type</th>
                <th className="hide-md">Submitted</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map(k => {
                const initials = k.fullName.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
                const badgeCls = k.status === 'approved' ? 'b-approved' : k.status === 'rejected' ? 'b-rejected' : 'b-pending';
                const dotCls   = k.status === 'approved' ? 'dot-approved' : k.status === 'rejected' ? 'dot-rejected' : 'dot-pending';
                return (
                  <tr key={k.id}>
                    <td>
                      <div className="td-user">
                        <div className="td-av">{initials}</div>
                        <div>
                          <div className="td-name">{k.fullName}</div>
                          <div className="td-sub">{k.uid}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hide-sm"><span className="td-sub">{k.username}</span></td>
                    <td className="hide-sm"><span className="td-sub">{k.email}</span></td>
                    <td className="hide-md"><span className="td-sub">{k.idType}</span></td>
                    <td className="hide-md"><span className="td-sub">{formatDate(k.submittedDate)}</span></td>
                    <td>
                      <span className={`badge ${badgeCls}`}>
                        <span className={`status-dot ${dotCls}`}></span>{k.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn-view" onClick={() => setActiveKycId(k.id)}>View →</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredData.length === 0 && (
          <div className="empty-state">
            <svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            <p>No KYC applications match your search or filter.</p>
          </div>
        )}
      </div>

      {/* KYC Detail Modal */}
      {activeKyc && (
        <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && setActiveKycId(null)}>
          <div className="modal-box">
            <div className="modal-header">
              <div>
                <div className="modal-title">{activeKyc.fullName}</div>
                <div style={{ fontSize:'.68rem',color:'var(--text-sec)',marginTop:2 }}>{activeKyc.id} · {activeKyc.uid}</div>
              </div>
              <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                <span className={`badge ${activeKyc.status === 'approved' ? 'b-approved' : activeKyc.status === 'rejected' ? 'b-rejected' : 'b-pending'}`}>{activeKyc.status}</span>
                <button className="modal-close" onClick={() => setActiveKycId(null)}>
                  <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
            <div className="modal-body">
              {/* User Basic Information */}
              <div className="detail-section">
                <div className="detail-section-title">User Basic Information</div>
                <div className="detail-grid">
                  <div className="detail-field"><div className="detail-label">Full Name</div><div className="detail-value">{activeKyc.fullName}</div></div>
                  <div className="detail-field"><div className="detail-label">Email Address</div><div className="detail-value">{activeKyc.email}</div></div>
                  <div className="detail-field"><div className="detail-label">Username</div><div className="detail-value">{activeKyc.username}</div></div>
                  <div className="detail-field"><div className="detail-label">Phone Number</div><div className="detail-value">{activeKyc.phone}</div></div>
                </div>
              </div>

              {/* KYC Details */}
              <div className="detail-section">
                <div className="detail-section-title">KYC Details</div>
                <div className="detail-grid">
                  <div className="detail-field"><div className="detail-label">Full Name (on ID)</div><div className="detail-value">{activeKyc.fullName}</div></div>
                  <div className="detail-field"><div className="detail-label">Date of Birth</div><div className="detail-value">{formatDate(activeKyc.dob)}</div></div>
                  <div className="detail-field"><div className="detail-label">ID Type</div><div className="detail-value">{activeKyc.idType}</div></div>
                  <div className="detail-field"><div className="detail-label">ID Document Number</div><div className="detail-value detail-mono">{activeKyc.idNumber}</div></div>
                  <div className="detail-field"><div className="detail-label">Address Line 1</div><div className="detail-value">{activeKyc.address1}</div></div>
                  <div className="detail-field"><div className="detail-label">Address Line 2</div><div className="detail-value">{activeKyc.address2 || '—'}</div></div>
                  <div className="detail-field"><div className="detail-label">City</div><div className="detail-value">{activeKyc.city}</div></div>
                  <div className="detail-field"><div className="detail-label">State / Province</div><div className="detail-value">{activeKyc.state}</div></div>
                  <div className="detail-field"><div className="detail-label">Zip / Postal Code</div><div className="detail-value detail-mono">{activeKyc.zip}</div></div>
                  <div className="detail-field"><div className="detail-label">Country</div><div className="detail-value">{activeKyc.country}</div></div>
                  <div className="detail-field"><div className="detail-label">Submission Date</div><div className="detail-value">{formatDate(activeKyc.submittedDate)}</div></div>
                  <div className="detail-field"><div className="detail-label">Application ID</div><div className="detail-value detail-mono">{activeKyc.id}</div></div>
                </div>
              </div>

              {/* Uploaded Documents */}
              <div className="detail-section">
                <div className="detail-section-title">Uploaded Documents</div>
                <div className="img-grid-3">
                  {[
                    { url: activeKyc.idFrontUrl, label: 'ID Card — Front', icon: <><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><polyline points="21 15 16 10 5 21"/></> },
                    { url: activeKyc.idBackUrl, label: 'ID Card — Back', icon: <><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><polyline points="21 15 16 10 5 21"/></> },
                    { url: activeKyc.selfieUrl, label: 'Selfie Photo', icon: <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></> }
                  ].map((img, i) => (
                    <div key={i}>
                      <div className="img-preview-box" onClick={() => showToast(`Opening ${img.label} view…`)}>
                        {img.url ? <img src={img.url} alt={img.label} /> : (
                          <div className="img-placeholder">
                            <svg viewBox="0 0 24 24">{img.icon}</svg>
                            <span>{img.label}</span>
                          </div>
                        )}
                      </div>
                      <div className="img-label">{img.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Processed By */}
              {activeKyc.history.find(h => h.by) && (
                <div className="detail-section">
                  <div className="detail-section-title">Processed By</div>
                  <div style={{ display:'flex',alignItems:'center',gap:10,flexWrap:'wrap' }}>
                    <div className="mod-stamp">
                      <div className="mod-stamp-av">{activeKyc.history.find(h => h.by)?.by?.initials}</div>
                      {activeKyc.history.find(h => h.by)?.by?.name}
                    </div>
                    <span className="td-sub">· {activeKyc.history.find(h => h.by)?.date}</span>
                    <span className={`badge ${activeKyc.status === 'rejected' ? 'b-rejected' : 'b-approved'}`} style={{ fontSize:'.58rem' }}>{activeKyc.status === 'rejected' ? 'Rejected' : 'Approved'}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="detail-section">
                <div className="detail-section-title">{activeKyc.status === 'pending' ? 'Take Action' : 'Re-Review'}</div>
                <div className="action-row">
                  {activeKyc.status === 'pending' ? (
                    <>
                      <button className="btn-approve" onClick={() => approveKyc(activeKyc.id)}>✓ Approve</button>
                      <button className="btn-reject" onClick={() => setShowRejectBox(!showRejectBox)}>✕ Reject</button>
                    </>
                  ) : (
                    <button className="btn-reopen" onClick={() => reopenKyc(activeKyc.id)}>↺ Re-open for Review</button>
                  )}
                </div>
                {showRejectBox && (
                  <div className="reject-reason-wrap show">
                    <div style={{ marginBottom:8,fontSize:'.72rem',color:'var(--error)',letterSpacing:'.06em' }}>Write Rejection Reason:</div>
                    <textarea 
                      className="reason-textarea" 
                      placeholder="Explain why this KYC is being rejected…"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    ></textarea>
                    <div style={{ display:'flex',gap:8,marginTop:10 }}>
                      <button className="btn-reject" onClick={() => confirmReject(activeKyc.id)}>Confirm Rejection</button>
                      <button className="btn-ghost" onClick={() => setShowRejectBox(false)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Activity Log */}
              <div className="detail-section">
                <div className="detail-section-title">Activity Log</div>
                <div className="history-log">
                  {[...activeKyc.history].reverse().map((h, i) => (
                    <div className="log-entry" key={i}>
                      <div className={`log-dot ${h.type}`}></div>
                      <div style={{ flex:1 }}>
                        <div className="log-text">
                          <strong>{h.text}</strong>
                          {h.by && <> &mdash; <span style={{ color:'var(--gold-d)' }}>{h.by.name}</span></>}
                        </div>
                        {h.reason && <div className="log-reason">"{h.reason}"</div>}
                        <div className="log-time">{h.date}</div>
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
