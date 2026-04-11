'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import AdminSidebar from '../AdminSidebar';
import { createClient } from '@/utils/supabase/client';

/* ══ TYPES ══ */
interface Stats {
  investors:string; lastROI:string; paidOut:string;
  invested:string; avgROI:string; payoutRate:string;
  totalSeasons:string; refRate:string;
}
interface PlatformInfo {
  name:string; tagline:string; email:string; telegram:string;
  hq:string; year:string; desc:string;
}

const DEFAULTS: Stats = {
  investors:'50000', lastROI:'+28.4%', paidOut:'4200000',
  invested:'104200000', avgROI:'+23.4%', payoutRate:'99.8%',
  totalSeasons:'3', refRate:'5%',
};
const PLATFORM_DEFAULTS: PlatformInfo = {
  name:'SeasonRise', tagline:'Where Capital Meets Discipline',
  email:'support@seasonrise.io', telegram:'SeasonRiseOfficial',
  hq:'Dhaka, Bangladesh', year:'2023',
  desc:'A structured investment platform operating through defined seasonal cycles with full transparency and consistent returns since 2023.',
};

function pad2(n:number){ return String(n).padStart(2,'0') }
function fmtLarge(n:number){ if(n>=1e9)return '$'+(n/1e9).toFixed(1)+'B+';if(n>=1e6)return '$'+(n/1e6).toFixed(1)+'M+';if(n>=1e3)return '$'+(n/1e3).toFixed(0)+'K+';return '$'+n.toLocaleString() }
function fmtNum(n:number){ if(n>=1e6)return(n/1e6).toFixed(1)+'M+';if(n>=1e3)return(n/1e3).toFixed(0)+'K+';return n.toLocaleString()+'+' }

function computePreview(s:Stats){
  const investors=parseInt(s.investors)||50000;
  const paidOut=parseFloat(s.paidOut)||4200000;
  const invested=parseFloat(s.invested)||104200000;
  const prevData=[
    {val:fmtNum(investors),   lbl:'Active Investors'},
    {val:fmtLarge(invested),  lbl:'USDT Invested'},
    {val:s.lastROI,           lbl:'Last Season ROI'},
    {val:fmtLarge(paidOut),   lbl:'Total Paid Out'},
    {val:s.avgROI,            lbl:'Avg Season ROI'},
    {val:s.payoutRate,        lbl:'On-Time Payouts'},
  ];
  const tickItems=[
    `<strong>${fmtNum(investors)}</strong> Active Investors`,
    `<strong>${fmtLarge(invested)}</strong> USDT Invested`,
    `Last Season ROI <strong>${s.lastROI}</strong>`,
    `<strong>${fmtLarge(paidOut)}</strong> Paid Out`,
    `Referral Rate <strong>${s.refRate}</strong>`,
    `Avg ROI <strong>${s.avgROI}</strong>`,
    `Payout Rate <strong>${s.payoutRate}</strong>`,
  ];
  return {investors,paidOut,invested,prevData,tickItems};
}

export default function AdminSettingPage() {
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast]       = useState({msg:'',cls:'',show:false});
  const [activeTab, setActiveTab] = useState<'homepage'|'platform'>('homepage');
  const [stats, setStats]       = useState<Stats>({...DEFAULTS});
  const [platform, setPlatform] = useState<PlatformInfo>({...PLATFORM_DEFAULTS});
  const [saveBtnTxt, setSaveBtnTxt] = useState('Save Changes');
  const [saveBtnDis, setSaveBtnDis] = useState(false);
  const [lastSaved, setLastSaved]   = useState('Never');
  const [formSavedLbl, setFormSavedLbl] = useState('');
  const [roiErr, setRoiErr]     = useState(false);
  // maintenance
  const [maintOn, setMaintOn]   = useState(false);
  const [maintEndTime, setMaintEndTime] = useState<number|null>(null);
  const [countdown, setCountdown] = useState({d:'00',h:'00',m:'00',s:'00'});
  const [showDurBox, setShowDurBox] = useState(false);
  const [maintDur, setMaintDur] = useState({days:0,hours:0,minutes:0,seconds:0});
  const [durError, setDurError] = useState(false);
  const [durInputsInvalid, setDurInputsInvalid] = useState(false);
  // preview flash
  const [flashPrev, setFlashPrev] = useState(false);

  const bgRef    = useRef<HTMLCanvasElement>(null);
  const toastTimer=useRef<ReturnType<typeof setTimeout>>();
  const maintIntv=useRef<ReturnType<typeof setInterval>>();

  const showToast=useCallback((msg:string,cls='')=>{
    setToast({msg,cls,show:true});
    clearTimeout(toastTimer.current);
    toastTimer.current=setTimeout(()=>setToast(t=>({...t,show:false})),3400);
  },[]);

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase.from('settings').select('*').single();
      if (data) {
        setMaintOn(data.maintenance_mode);
        if (data.maintenance_ends_at) {
          setMaintEndTime(new Date(data.maintenance_ends_at).getTime());
        }
      }
    }
    fetchSettings();
  }, [supabase]);

  useEffect(()=>{
    if(maintOn&&maintEndTime){
      const tick=()=>{
        const remaining=Math.max(0,Math.floor((maintEndTime-Date.now())/1000));
        setCountdown({d:pad2(Math.floor(remaining/86400)),h:pad2(Math.floor((remaining%86400)/3600)),m:pad2(Math.floor((remaining%3600)/60)),s:pad2(remaining%60)});
        if(remaining<=0){
          clearInterval(maintIntv.current);
          disableMaintenance();
          showToast('✓ Maintenance period ended — platform is back online','ok');
        }
      };
      tick();
      maintIntv.current=setInterval(tick,1000);
    }
    return()=>clearInterval(maintIntv.current);
  }, [maintOn, maintEndTime, showToast]);

  function resetDefaults() {
    setStats({...DEFAULTS});
    setPlatform({...PLATFORM_DEFAULTS});
    showToast('Settings reset to defaults', 'ok');
  }

  async function saveStats() {
    setSaveBtnDis(true);
    setSaveBtnTxt('Saving...');
    // Simulated save
    setTimeout(() => {
      setSaveBtnDis(false);
      setSaveBtnTxt('Save Changes');
      setLastSaved(new Date().toLocaleTimeString());
      showToast('✓ Homepage statistics saved', 'ok');
    }, 800);
  }

  async function savePlatformInfo() {
    showToast('✓ Platform information saved', 'ok');
  }

  /* Maintenance */
  function toggleMaintenance(){
    if(maintOn){disableMaintenance();return}
    setShowDurBox(true);
  }
  function cancelMaintenance(){
    setShowDurBox(false);
    setMaintDur({days:0,hours:0,minutes:0,seconds:0});
    setDurError(false);setDurInputsInvalid(false);
  }
  async function confirmMaintenance(){
    const totalSec=maintDur.days*86400+maintDur.hours*3600+maintDur.minutes*60+maintDur.seconds;
    if(totalSec<=1){setDurError(true);setDurInputsInvalid(true);return}
    setDurError(false);setDurInputsInvalid(false);
    
    const endTime = new Date(Date.now() + totalSec * 1000).toISOString();
    
    const { error } = await supabase
      .from('settings')
      .update({ maintenance_mode: true, maintenance_ends_at: endTime })
      .eq('id', 1);

    if (error) {
      showToast('✕ Failed to enable maintenance mode', 'err');
    } else {
      setMaintOn(true);
      setMaintEndTime(Date.now()+totalSec*1000);
      setShowDurBox(false);
      showToast('⚠ Maintenance mode enabled — platform is now offline for visitors','err');
    }
  }
  async function disableMaintenance(){
    const { error } = await supabase
      .from('settings')
      .update({ maintenance_mode: false, maintenance_ends_at: null })
      .eq('id', 1);

    if (error) {
      showToast('✕ Failed to disable maintenance mode', 'err');
    } else {
      setMaintOn(false);
      setMaintEndTime(null);
      setCountdown({d:'00',h:'00',m:'00',s:'00'});
      clearInterval(maintIntv.current);
      showToast('✓ Maintenance mode disabled — platform is back online','ok');
    }
  }

  const {investors,paidOut,invested,prevData,tickItems} = computePreview(stats);
  const tickHTML=tickItems.map((t,i)=>`<div class="ws-tick-item">${t}</div>${i<tickItems.length-1?'<div class="ws-tick-sep"></div>':''}`).join('');
  const hasRoiErr = roiErr;

  return (
    <>
      <canvas ref={bgRef} style={{position:'fixed',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0,opacity:.04}}/>
      <div className={`ws-toast${toast.show?' show':''}${toast.cls?' '+toast.cls:''}`}>{toast.msg}</div>
      <div className={`adm-sb-overlay${sidebarOpen?' show':''}`} onClick={()=>setSidebarOpen(false)}/>

      <div className="adm-layout">
        <AdminSidebar open={sidebarOpen} onClose={()=>setSidebarOpen(false)} onToast={showToast}/>

        <div className="adm-main-area">
          <header className="adm-top-header" style={{padding:'0 14px'}}>
            <button className="adm-ham-btn" onClick={()=>setSidebarOpen(o=>!o)}><span/><span/><span/></button>
            <a className="adm-back-pill" href="/admin/dashboard">
              <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>Dashboard
            </a>
            <div style={{flex:1,minWidth:0}}/>
            <div className="adm-header-right">
              <div className="adm-notif-btn" onClick={()=>showToast('3 new notifications')}>
                <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                <div className="adm-notif-dot"/>
              </div>
              <div className="adm-header-avatar">AD</div>
              <div className="adm-header-uinfo">
                <div className="adm-header-uname">Admin User</div>
                <div className="adm-header-role">Super Administrator</div>
              </div>
              <button style={{padding:'6px 14px',background:'transparent',border:'1px solid var(--border)',color:'var(--text-sec)',fontFamily:"'DM Sans',sans-serif",fontSize:'.7rem',letterSpacing:'.07em',textTransform:'uppercase',cursor:'pointer',borderRadius:'var(--radius)',transition:'all .22s'}}
                onClick={()=>showToast('Logging out…')}>Logout</button>
            </div>
          </header>

          <div className="ws-content">
            <div className="ws-inner">

              {/* PAGE HEADER */}
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12,marginBottom:28}} className="ws-reveal">
                <div>
                  <span className="ws-sec-label">Admin · System</span>
                  <h1 className="ws-sec-title">Platform Settings</h1>
                  <p className="ws-sec-sub"><span className="ws-live-dot"/>Manage homepage statistics and platform configuration</p>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',alignSelf:'flex-end'}}>
                  <span className="ws-last-saved">Last saved: <strong>{lastSaved}</strong></span>
                  <button className="ws-btn-ghost" style={{padding:'8px 16px',fontSize:'.7rem'}} onClick={resetDefaults}>
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>Reset
                  </button>
                </div>
              </div>

              {/* TABS */}
              <div className="ws-settings-tab-row ws-reveal">
                <button className={`ws-stab${activeTab==='homepage'?' active':''}`} onClick={()=>setActiveTab('homepage')}>Homepage Stats</button>
                <button className={`ws-stab${activeTab==='platform'?' active':''}`} onClick={()=>setActiveTab('platform')}>Platform Info</button>
              </div>

              {/* ── TAB: HOMEPAGE ── */}
              {activeTab==='homepage'&&(
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr',gap:20,width:'100%',minWidth:0}}>

                    {/* Stats Form */}
                    <div className="ws-card ws-reveal">
                      <div className="ws-card-p">
                        <div className="ws-card-title">Homepage Statistics</div>
                        <div className="ws-card-sub">These values appear in the live stats ticker and hero section of your public homepage. Changes take effect immediately after saving.</div>
                        <div className="ws-form-grid">
                          {/* Investors */}
                          <div className="ws-fg">
                            <label className="ws-fl">Total Number of Investors</label>
                            <div className="ws-fi-wrap">
                              <input className="ws-fi" type="number" value={stats.investors} min="0" placeholder="50000" onChange={e=>setStats(s=>({...s,investors:e.target.value}))}/>
                              <span className="ws-fi-sfx">Users</span>
                            </div>
                            <span className="ws-fi-hint">Shows as <strong>{fmtNum(investors)}</strong> on homepage.</span>
                          </div>
                          {/* Last ROI */}
                          <div className="ws-fg">
                            <label className="ws-fl">Last Season ROI</label>
                            <div className="ws-fi-wrap">
                              <input className={`ws-fi${hasRoiErr?' invalid':stats.lastROI?' valid':''}`} type="text" value={stats.lastROI} placeholder="e.g. +28.4% or -5%" onChange={e=>setStats(s=>({...s,lastROI:e.target.value}))}/>
                            </div>
                            <span className="ws-fi-hint">Prefix with + or − for positive/negative ROI.</span>
                            {hasRoiErr&&<span className="ws-fi-error">Format must include % symbol.</span>}
                          </div>
                          {/* Paid out */}
                          <div className="ws-fg">
                            <label className="ws-fl">All Time Total USDT Paid Out</label>
                            <div className="ws-fi-wrap">
                              <span className="ws-fi-pfx">$</span>
                              <input className="ws-fi ws-fi-pfx-in" type="number" value={stats.paidOut} min="0" step="1000" onChange={e=>setStats(s=>({...s,paidOut:e.target.value}))}/>
                              <span className="ws-fi-sfx">USDT</span>
                            </div>
                            <span className="ws-fi-hint">Shows as <strong>{fmtLarge(paidOut)}</strong> on homepage.</span>
                          </div>
                          {/* Invested */}
                          <div className="ws-fg">
                            <label className="ws-fl">Total USDT Invested</label>
                            <div className="ws-fi-wrap">
                              <span className="ws-fi-pfx">$</span>
                              <input className="ws-fi ws-fi-pfx-in" type="number" value={stats.invested} min="0" step="100000" onChange={e=>setStats(s=>({...s,invested:e.target.value}))}/>
                              <span className="ws-fi-sfx">USDT</span>
                            </div>
                            <span className="ws-fi-hint">Shows as <strong>{fmtLarge(invested)}</strong> on homepage.</span>
                          </div>
                          {/* Avg ROI */}
                          <div className="ws-fg">
                            <label className="ws-fl">Average Season ROI</label>
                            <div className="ws-fi-wrap">
                              <input className="ws-fi" type="text" value={stats.avgROI} placeholder="e.g. +23.4%" onChange={e=>setStats(s=>({...s,avgROI:e.target.value}))}/>
                            </div>
                            <span className="ws-fi-hint">Average return across all completed seasons.</span>
                          </div>
                          {/* Payout Rate */}
                          <div className="ws-fg">
                            <label className="ws-fl">On-Time Payout Rate</label>
                            <div className="ws-fi-wrap">
                              <input className="ws-fi" type="text" value={stats.payoutRate} placeholder="e.g. 99.8%" onChange={e=>setStats(s=>({...s,payoutRate:e.target.value}))}/>
                            </div>
                            <span className="ws-fi-hint">Percentage of withdrawals processed on time.</span>
                          </div>
                          {/* Seasons */}
                          <div className="ws-fg">
                            <label className="ws-fl">Total Seasons Completed</label>
                            <div className="ws-fi-wrap">
                              <input className="ws-fi" type="number" value={stats.totalSeasons} min="0" onChange={e=>setStats(s=>({...s,totalSeasons:e.target.value}))}/>
                              <span className="ws-fi-sfx">Seasons</span>
                            </div>
                            <span className="ws-fi-hint">Number of fully closed/completed seasons.</span>
                          </div>
                          {/* Referral Rate */}
                          <div className="ws-fg">
                            <label className="ws-fl">Referral Commission Rate</label>
                            <div className="ws-fi-wrap">
                              <input className="ws-fi" type="text" value={stats.refRate} placeholder="e.g. 5%" onChange={e=>setStats(s=>({...s,refRate:e.target.value}))}/>
                              <span className="ws-fi-sfx">Per Withdrawal</span>
                            </div>
                            <span className="ws-fi-hint">Displayed in the referral section of the homepage.</span>
                          </div>
                        </div>
                        {/* Action row */}
                        <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',marginTop:24,paddingTop:22,borderTop:'1px solid var(--border)'}}>
                          <button className="ws-btn-ink" disabled={saveBtnDis} onClick={saveStats}>
                            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                            <span>{saveBtnTxt}</span>
                          </button>
                          <button className="ws-btn-ghost" onClick={resetDefaults}>
                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
                            Reset to Default
                          </button>
                          {formSavedLbl&&<span style={{color:'var(--sage)',fontSize:'.68rem',marginLeft:'auto'}}>{formSavedLbl}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Live Preview */}
                    <div className="ws-reveal">
                      <div style={{marginBottom:14}}>
                        <span className="ws-sec-label">Live Preview</span>
                        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.1rem',color:'var(--ink)'}}>Homepage Appearance</div>
                        <div style={{fontSize:'.72rem',color:'var(--text-sec)',marginTop:3}}>Updates in real-time as you edit the form above.</div>
                      </div>
                      <div className="ws-preview-card">
                        <div style={{marginBottom:20}}>
                          <div style={{fontSize:'.62rem',letterSpacing:'.14em',textTransform:'uppercase',color:'rgba(240,234,216,.35)',marginBottom:8}}>Stats Ticker Preview</div>
                          <div className="ws-ticker-wrap">
                            <div className="ws-ticker-inner" dangerouslySetInnerHTML={{__html:tickHTML+tickHTML}}/>
                          </div>
                        </div>
                        <div style={{fontSize:'.62rem',letterSpacing:'.14em',textTransform:'uppercase',color:'rgba(240,234,216,.35)',marginBottom:10}}>Stats Cards Preview</div>
                        <div className="ws-prev-grid">
                          {prevData.map(p=>(
                            <div key={p.lbl} className="ws-prev-cell">
                              <div className={`ws-prev-val${flashPrev?' updated':''}`}>{p.val}</div>
                              <div className="ws-prev-lbl">{p.lbl}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{marginTop:18,padding:'12px 16px',background:'rgba(184,147,90,.08)',border:'1px solid rgba(184,147,90,.18)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
                          {[['Last Season ROI',stats.lastROI,'var(--gold-l)'],['Avg Season ROI',stats.avgROI,'var(--sage-l)'],['Payout Rate',stats.payoutRate,'var(--cream)']].map(([lbl,val,col])=>(
                            <div key={lbl}>
                              <div style={{fontSize:'.62rem',letterSpacing:'.1em',textTransform:'uppercase',color:'rgba(240,234,216,.35)',marginBottom:3}}>{lbl}</div>
                              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.6rem',color:col,fontWeight:300}}>{val}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Maintenance Mode */}
                    <div className="ws-card ws-reveal" style={{borderColor:'rgba(155,58,58,.15)'}}>
                      <div className="ws-card-p">
                        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12,marginBottom:18}}>
                          <div>
                            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4,flexWrap:'wrap'}}>
                              <div className="ws-card-title" style={{marginBottom:0}}>Maintenance Mode</div>
                              <span className={`ws-maint-status ${maintOn?'on':'off'}`}>
                                <svg width="7" height="7" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="currentColor"/></svg>
                                {maintOn?'Maintenance Active':'Platform Online'}
                              </span>
                            </div>
                            <div className="ws-card-sub" style={{marginBottom:0}}>When enabled, all non-admin visitors see the maintenance page.</div>
                          </div>
                        </div>

                        <div className={`ws-toggle-wrap${maintOn?' danger-mode':''}`}>
                          <div className="ws-toggle-info">
                            <strong>Enable Maintenance Mode</strong>
                            <span>Show maintenance page to all non-admin visitors · Redirects to <code style={{fontSize:'.68rem',background:'rgba(184,147,90,.1)',padding:'1px 5px',borderRadius:3}}>/maintenance</code></span>
                          </div>
                          <div className={`ws-toggle-track${maintOn?' on':''}`} onClick={toggleMaintenance}>
                            <div className="ws-toggle-knob"/>
                          </div>
                        </div>

                        {/* Duration picker */}
                        {showDurBox&&!maintOn&&(
                          <div style={{display:'block',marginTop:14,padding:16,background:'rgba(155,58,58,.04)',border:'1px solid rgba(155,58,58,.18)',borderRadius:'var(--radius)'}}>
                            <div style={{fontSize:'.78rem',fontWeight:500,color:'var(--ink)',marginBottom:4}}>Set Maintenance Duration</div>
                            <div style={{fontSize:'.7rem',color:'var(--text-sec)',marginBottom:12}}>How long will maintenance last? Duration must be more than 1 second.</div>
                            <div className="ws-maint-timer-grid">
                              {(['days','hours','minutes','seconds'] as const).map(unit=>(
                                <div key={unit} className="ws-maint-timer-cell">
                                  <label htmlFor={`maint-${unit}`}>{unit.charAt(0).toUpperCase()+unit.slice(1)}</label>
                                  <input className={`ws-maint-timer-input${durInputsInvalid?' invalid':''}`} id={`maint-${unit}`} type="number" min="0" value={maintDur[unit]} onChange={e=>setMaintDur(d=>({...d,[unit]:parseInt(e.target.value)||0}))}/>
                                </div>
                              ))}
                            </div>
                            {durError&&<div style={{display:'block',fontSize:'.68rem',color:'var(--error)',marginBottom:10}}>⚠ Total duration must be more than 1 second.</div>}
                            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                              <button className="ws-btn-ink" style={{padding:'8px 18px',fontSize:'.72rem'}} onClick={confirmMaintenance}>
                                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                                <span>Confirm &amp; Enable</span>
                              </button>
                              <button className="ws-btn-ghost" style={{padding:'8px 16px',fontSize:'.72rem'}} onClick={cancelMaintenance}>Cancel</button>
                            </div>
                          </div>
                        )}

                        {/* Active maintenance info */}
                        {maintOn&&(
                          <div style={{display:'block',marginTop:14,padding:'14px 16px',background:'rgba(155,58,58,.05)',border:'1px solid rgba(155,58,58,.2)',borderRadius:'var(--radius)'}}>
                            <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                              <svg width="16" height="16" fill="none" stroke="var(--error)" strokeWidth="1.8" viewBox="0 0 24 24" style={{flexShrink:0,marginTop:1}}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:'.78rem',fontWeight:500,color:'var(--error)',marginBottom:8}}>Maintenance Mode is Active — Time Remaining</div>
                                <div className="ws-maint-countdown">
                                  {[['Days',countdown.d],['Hours',countdown.h],['Min',countdown.m],['Sec',countdown.s]].map(([lbl,val])=>(
                                    <div key={lbl} className="ws-cd-unit"><div className="ws-cd-num">{val}</div><div className="ws-cd-lbl">{lbl}</div></div>
                                  ))}
                                </div>
                                <div style={{fontSize:'.7rem',color:'var(--text-sec)',lineHeight:1.7}}>All public pages are redirecting to the maintenance page.<br/><strong style={{color:'var(--ink)'}}>Remember to disable this when maintenance is complete.</strong></div>
                              </div>
                            </div>
                            <div style={{marginTop:12,display:'flex',gap:8,flexWrap:'wrap'}}>
                              <button className="ws-btn-ghost" style={{padding:'7px 14px',fontSize:'.68rem'}} onClick={()=>showToast('Preview opened in new tab.')}>Preview Maintenance Page ↗</button>
                              <button className="ws-btn-danger" style={{padding:'7px 14px',fontSize:'.68rem'}} onClick={disableMaintenance}>Disable Maintenance Mode</button>
                            </div>
                          </div>
                        )}

                        {/* Normal info */}
                        {!maintOn&&!showDurBox&&(
                          <div style={{marginTop:14,padding:'12px 16px',background:'rgba(74,103,65,.05)',border:'1px solid rgba(74,103,65,.18)',borderRadius:'var(--radius)'}}>
                            <div style={{fontSize:'.72rem',color:'var(--sage)',lineHeight:1.7}}>✓ Platform is online and accessible to all visitors. Toggle above to enable maintenance mode when performing system updates.</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB: PLATFORM INFO ── */}
              {activeTab==='platform'&&(
                <div className="ws-card ws-reveal">
                  <div className="ws-card-p">
                    <div className="ws-card-title">Platform Information</div>
                    <div className="ws-card-sub">Update the platform's public-facing contact details, links, and branding text.</div>
                    <div className="ws-form-grid">
                      {([['Platform Name','p-name','text','name'],['Tagline','p-tagline','text','tagline'],['Support Email','p-email','email','email'],['Headquarters','p-hq','text','hq'],['Founded Year','p-year','number','year']] as [string,string,string,keyof PlatformInfo][]).map(([lbl,id,type,key])=>(
                        <div key={id} className="ws-fg">
                          <label className="ws-fl" htmlFor={id}>{lbl}</label>
                          <input className="ws-fi" type={type} id={id} value={platform[key]} placeholder={lbl} onChange={e=>setPlatform(p=>({...p,[key]:e.target.value}))}/>
                        </div>
                      ))}
                      {/* Telegram with prefix */}
                      <div className="ws-fg">
                        <label className="ws-fl" htmlFor="p-telegram">Telegram Channel</label>
                        <div className="ws-fi-wrap">
                          <span className="ws-fi-pfx" style={{fontSize:'.72rem'}}>@</span>
                          <input className="ws-fi ws-fi-pfx-in" type="text" id="p-telegram" value={platform.telegram} placeholder="YourChannel" onChange={e=>setPlatform(p=>({...p,telegram:e.target.value}))}/>
                        </div>
                      </div>
                      {/* Description */}
                      <div className="ws-fg ws-f-full">
                        <label className="ws-fl" htmlFor="p-desc">Platform Description</label>
                        <textarea className="ws-fi" id="p-desc" rows={3} style={{resize:'vertical',minHeight:80}} value={platform.desc} onChange={e=>setPlatform(p=>({...p,desc:e.target.value}))}/>
                      </div>
                    </div>
                    <div style={{marginTop:22,paddingTop:22,borderTop:'1px solid var(--border)',display:'flex',gap:12,flexWrap:'wrap'}}>
                      <button className="ws-btn-ink" onClick={savePlatformInfo}>
                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        <span>Save Platform Info</span>
                      </button>
                      <button className="ws-btn-ghost" onClick={()=>showToast('Preview opened in new tab.')}>Preview Homepage</button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
