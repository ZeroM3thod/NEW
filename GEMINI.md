/**
 * PATCH FOR: src/app/deposit/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * STEP 1: Add NET_ICONS constant right after NET_INFO constant (around line 30)
 * STEP 2: Replace the dp-network-grid map block (around line 290-320)
 */

// ── STEP 1: ADD THIS after NET_INFO ──────────────────────────────────────────

const NET_ICONS: Record<string, React.ReactNode> = {
  'TRC-20': (
    <svg viewBox="0 0 36 36" width="24" height="24" style={{display:'block'}}>
      <circle cx="18" cy="18" r="18" fill="rgba(232,66,61,0.14)"/>
      <polygon points="18,5 31,29 5,29" fill="none" stroke="#e8423d" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx="18" cy="23" r="3.2" fill="#e8423d"/>
    </svg>
  ),
  'ERC-20': (
    <svg viewBox="0 0 36 36" width="24" height="24" style={{display:'block'}}>
      <circle cx="18" cy="18" r="18" fill="rgba(98,126,234,0.14)"/>
      <path d="M18 6 L18 17 L27 21 Z" fill="#627EEA" opacity="0.7"/>
      <path d="M18 6 L9 21 L18 17 Z" fill="#627EEA" opacity="0.9"/>
      <path d="M18 24 L27 21 L18 30 Z" fill="#627EEA" opacity="0.45"/>
      <path d="M18 24 L9 21 L18 30 Z" fill="#627EEA" opacity="0.75"/>
      <path d="M18 17 L27 21 L18 24 L9 21 Z" fill="#627EEA"/>
    </svg>
  ),
  'BEP-20': (
    <svg viewBox="0 0 36 36" width="24" height="24" style={{display:'block'}}>
      <circle cx="18" cy="18" r="18" fill="rgba(240,185,11,0.14)"/>
      <rect x="15" y="7.5" width="6" height="6" rx="1" fill="#F0B90B" transform="rotate(45 18 10.5)"/>
      <rect x="7.5" y="15" width="6" height="6" rx="1" fill="#F0B90B" transform="rotate(45 10.5 18)"/>
      <rect x="15" y="15" width="6" height="6" rx="1" fill="#F0B90B" transform="rotate(45 18 18)"/>
      <rect x="22.5" y="15" width="6" height="6" rx="1" fill="#F0B90B" transform="rotate(45 25.5 18)"/>
      <rect x="15" y="22.5" width="6" height="6" rx="1" fill="#F0B90B" transform="rotate(45 18 25.5)"/>
    </svg>
  ),
}

// ── STEP 2: REPLACE the dp-network-grid div content ──────────────────────────
// Find: <div className='dp-network-grid'>  ...  </div>
// Replace with:

<div className='dp-network-grid'>
  {(['TRC-20', 'ERC-20', 'BEP-20'] as const).map(net => {
    const meta = NET_INFO[net]
    const feeInfo = NET_FEES[net]
    const isSelected = selectedNet === net
    const isTRC = net === 'TRC-20'
    return (
      <button
        key={net}
        className={`dp-net-card${isSelected ? ' selected' : ''}`}
        onClick={() => { setSelectedNet(net); setNetInfoVisible(true) }}
        style={{
          background: isSelected
            ? `linear-gradient(135deg, ${meta.color}10, var(--cream))`
            : 'var(--cream)',
          borderColor: isSelected ? meta.color : undefined,
          position: 'relative',
        }}
      >
        {/* Network icon */}
        <div style={{
          width: 52, height: 52, borderRadius: 12, flexShrink: 0,
          background: isSelected ? `${meta.color}22` : `${meta.color}10`,
          border: `1.5px solid ${meta.color}${isSelected ? '55' : '25'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .25s',
        }}>
          {NET_ICONS[net]}
        </div>

        {/* Network info */}
        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '.88rem', fontWeight: 600, color: 'var(--ink)', letterSpacing: '.01em' }}>
              {net}
            </span>
            {isTRC && (
              <span style={{
                fontSize: '.52rem', letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 600,
                background: 'rgba(74,103,65,.1)', color: 'var(--sage)',
                border: '1px solid rgba(74,103,65,.2)', borderRadius: 100, padding: '2px 7px',
              }}>
                Recommended
              </span>
            )}
          </div>
          <div style={{ fontSize: '.73rem', fontWeight: 500, color: meta.color, marginBottom: 3 }}>
            {meta.chain}
          </div>
          <div style={{ fontSize: '.67rem', color: 'var(--txt3)', lineHeight: 1.45 }}>
            {meta.desc}
          </div>
        </div>

        {/* Fee + confirmation time */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <span style={{
            fontSize: '.58rem', letterSpacing: '.09em', textTransform: 'uppercase', fontWeight: 600,
            background: 'rgba(74,103,65,.1)', color: 'var(--sage)',
            border: '1px solid rgba(74,103,65,.2)', borderRadius: 100, padding: '3px 10px',
          }}>
            {feeInfo.feeLabel}
          </span>
          <span style={{
            fontSize: '.64rem', color: 'var(--txt3)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <svg width="11" height="11" fill="none" stroke="var(--gold)" strokeWidth="1.8" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            {feeInfo.time}
          </span>
        </div>

        {/* Selected indicator */}
        {isSelected && (
          <div style={{
            position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
            width: 24, height: 24, borderRadius: '50%',
            background: 'var(--sage)', color: 'white',
            fontSize: '.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, boxShadow: '0 2px 8px rgba(74,103,65,.3)',
          }}>✓</div>
        )}
      </button>
    )
  })}
</div>





/**
 * PATCH FOR: src/app/dashboard/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * BUG FIX: "20% - 30%%" double-percent in the balance hero right panel
 * ENHANCEMENT: More decorated Total Portfolio hero card
 *
 * FIND this line (approx line 355):
 *   <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.6rem',fontWeight:300,color:'rgba(246,241,233,0.85)'}}>{activeSeasonRoi}%</div>
 *
 * REPLACE with:
 *   <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.6rem',fontWeight:300,color:'rgba(246,241,233,0.85)'}}>{activeSeasonRoi}</div>
 *
 * NOTE: roi_range from DB already contains "%" so appending another "%" creates "20% - 30%%"
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ENHANCED Balance Hero — replace the entire db-balance-hero div with this:
 */

<div className='db-balance-hero db-reveal' style={{marginBottom:20,transitionDelay:'.06s'}}>
  {/* Decorative corner accents */}
  <div style={{position:'absolute',top:16,left:16,width:20,height:20,borderTop:'1px solid rgba(184,147,90,0.4)',borderLeft:'1px solid rgba(184,147,90,0.4)',pointerEvents:'none',zIndex:1}}/>
  <div style={{position:'absolute',top:16,right:16,width:20,height:20,borderTop:'1px solid rgba(184,147,90,0.4)',borderRight:'1px solid rgba(184,147,90,0.4)',pointerEvents:'none',zIndex:1}}/>
  <div style={{position:'absolute',bottom:progWidth!=='0%'?52:16,left:16,width:20,height:20,borderBottom:'1px solid rgba(184,147,90,0.25)',borderLeft:'1px solid rgba(184,147,90,0.25)',pointerEvents:'none',zIndex:1}}/>
  <div style={{position:'absolute',bottom:progWidth!=='0%'?52:16,right:16,width:20,height:20,borderBottom:'1px solid rgba(184,147,90,0.25)',borderRight:'1px solid rgba(184,147,90,0.25)',pointerEvents:'none',zIndex:1}}/>

  {/* Top accent line */}
  <div style={{position:'absolute',top:0,left:'10%',right:'10%',height:'1.5px',background:'linear-gradient(90deg,transparent,rgba(184,147,90,0.5),transparent)',pointerEvents:'none'}}/>

  <div style={{display:'flex',flexWrap:'wrap',alignItems:'flex-start',justifyContent:'space-between',gap:16,position:'relative',zIndex:1}}>
    <div>
      {/* Section label */}
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
        <div style={{width:16,height:1,background:'rgba(184,147,90,0.5)'}}/>
        <div className='db-balance-label'>Total Portfolio · USDT</div>
        <div style={{width:16,height:1,background:'rgba(184,147,90,0.5)'}}/>
      </div>

      {/* Main balance */}
      <div className='db-balance-num'>
        ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>

      {/* P&L row */}
      <div className='db-balance-sub' style={{marginTop:10,display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
        <span style={{
          display:'inline-flex',alignItems:'center',gap:4,
          background:`${pnlColor(profitsTotal)}22`,
          border:`1px solid ${pnlColor(profitsTotal)}44`,
          borderRadius:100,padding:'3px 10px',
          color:pnlColor(profitsTotal),fontSize:'.72rem',letterSpacing:'.04em',
        }}>
          {pnlArrow(profitsTotal)} {fmtPnL(profitsTotal)}
        </span>
        <span style={{color:'rgba(246,241,233,0.35)',fontSize:'.68rem'}}>all-time profit</span>
        {avgRoi !== 0 && (
          <>
            <span style={{color:'rgba(184,147,90,0.4)',fontSize:'.65rem'}}>·</span>
            <span style={{
              display:'inline-flex',alignItems:'center',gap:4,
              background:'rgba(184,147,90,0.12)',border:'1px solid rgba(184,147,90,0.3)',
              borderRadius:100,padding:'3px 10px',
              color:'var(--gold-l)',fontSize:'.72rem',letterSpacing:'.04em',
            }}>
              {avgRoi >= 0 ? '+' : ''}{avgRoi}% avg ROI
            </span>
          </>
        )}
      </div>

      {/* Locked amount line */}
      {effectiveLockedAmount > 0 && (
        <div style={{marginTop:10,fontSize:'.72rem',color:'rgba(246,241,233,0.45)',display:'flex',alignItems:'center',gap:6}}>
          <svg width="12" height="12" fill="none" stroke="rgba(184,147,90,0.6)" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
          <span>Withdrawable now:&nbsp;
            <strong style={{color:'rgba(246,241,233,0.75)',fontWeight:500}}>
              ${effectiveWithdrawable.toLocaleString(undefined,{minimumFractionDigits:2})}
            </strong>
          </span>
        </div>
      )}
    </div>

    {/* Right: active season ROI */}
    {activeInvestment && activeSeasonName && (
      <div style={{textAlign:'right',flexShrink:0}}>
        <div style={{
          background:'rgba(255,255,255,0.06)',border:'1px solid rgba(184,147,90,0.2)',
          borderRadius:10,padding:'14px 18px',
        }}>
          <div style={{fontSize:'.58rem',letterSpacing:'.18em',textTransform:'uppercase',color:'rgba(246,241,233,0.35)',marginBottom:6}}>
            {activeSeasonName}
          </div>
          {/* FIX: removed the extra % — roi_range already contains % */}
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.8rem',fontWeight:300,color:'rgba(246,241,233,0.88)',lineHeight:1}}>
            {activeSeasonRoi}
          </div>
          <div style={{fontSize:'.6rem',letterSpacing:'.1em',textTransform:'uppercase',color:'rgba(246,241,233,0.3)',marginTop:4}}>
            Projected ROI
          </div>
        </div>
      </div>
    )}
  </div>

  {/* Season progress bar */}
  {activeInvestment && activeSeasonStart && (
    <div style={{marginTop:22,position:'relative',zIndex:1}}>
      {/* Progress label row */}
      <div style={{display:'flex',justifyContent:'space-between',fontSize:'.65rem',color:'rgba(246,241,233,0.3)',letterSpacing:'.06em',textTransform:'uppercase',marginBottom:6,alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:5}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'var(--sage)',opacity:0.7,animation:'dbLivePulse 1.8s ease-in-out infinite'}}/>
          <span>Season Progress</span>
        </div>
        <span style={{color:'var(--gold-l)',fontWeight:500}}>{progWidth}</span>
      </div>
      <div className='db-prog-track'><div className='db-prog-fill' style={{width:progWidth}}/></div>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:'.64rem',color:'rgba(246,241,233,0.2)',marginTop:5}}>
        <span>Entry ${myInvestAmount.toLocaleString()}</span>
        <span>Target {activeSeasonRoi}</span>
      </div>
    </div>
  )}
</div>







