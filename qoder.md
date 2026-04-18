Looking at the three bugs:

1. **Pool double-fill**: `confirmInvest` calls the RPC AND has a fallback update using stale state `s.poolFilled` — both can execute, causing double increment. Fix: fetch fresh `current_pool` then do a single direct update.

2. **Pool modal empty**: The Supabase join `profiles(...)` silently fails if the FK name isn't auto-detected. Fix: two-step fetch — investments first, then profiles separately.

3. **Locked > balance**: After a season loss (e.g. deposit $5000 → invest → -10% → balance $4500), the deposit row still records `locked_until` for $5000. Fix: cap displayed locked at `Math.min(lockedAmount, balance)`.

Here are the complete fixed files:Now I'll write all the fixed files:

**Fix 1 — `src/app/season/page.tsx`** (pool double-increment — only the `confirmInvest` function changes):

The key change is replacing the RPC + stale-fallback with a fresh-read single update. Here's the complete fixed `confirmInvest`:

```typescript
// REPLACE the entire confirmInvest function in src/app/season/page.tsx

const confirmInvest = async () => {
  if (!investId || !userProfile) return
  const s = seasons.find(x => x.id === investId)
  if (!s) return
  const amt = parseFloat(amountVal)

  if (!amt || isNaN(amt) || amt <= 0) {
    setAmountError('Please enter a valid amount.')
    showToast('⚠ Please enter a valid amount.')
    return
  }
  if (amt < s.min) {
    setAmountError(`Minimum entry is ${fmtUSDT(s.min)} USDT.`)
    showToast(`⚠ Minimum investment is ${fmtUSDT(s.min)} USDT.`)
    return
  }
  if (amt > s.max) {
    setAmountError(`Maximum entry is ${fmtUSDT(s.max)} USDT.`)
    showToast(`⚠ Maximum investment is ${fmtUSDT(s.max)} USDT.`)
    return
  }
  if (amt > Number(userProfile.balance)) {
    setAmountError('Insufficient balance.')
    showToast('⚠ Insufficient balance.')
    return
  }

  try {
    // ── FIX 1: read fresh current_pool BEFORE inserting so we get the
    //    real DB value, not stale component state, and do ONE update. ──
    const { data: freshSeasonRow } = await supabase
      .from('seasons')
      .select('current_pool')
      .eq('id', investId)
      .single()

    const freshFilled = Number(freshSeasonRow?.current_pool) || 0
    const remaining = s.pool - freshFilled
    if (remaining < amt) {
      showToast(`⚠ Only ${fmtUSDT(remaining)} USDT space left in this pool.`)
      return
    }

    // Insert investment record
    const { error: invError } = await supabase.from('investments').insert({
      user_id: userProfile.id, season_id: investId, amount: amt, status: 'active'
    })
    if (invError) throw invError

    // Deduct from user balance
    const newBalance = Number(userProfile.balance) - amt
    const newWithdrawable = Math.max(0, (Number(userProfile.withdrawable_total) || 0) - amt)
    const { error: profileError } = await supabase.from('profiles').update({
      balance: newBalance,
      withdrawable_total: newWithdrawable,
      invested_total: (Number(userProfile.invested_total) || 0) + amt,
    }).eq('id', userProfile.id)
    if (profileError) throw profileError

    // ── FIX 1: single pool update using the fresh value we already read ──
    const newPool = freshFilled + amt
    await supabase.from('seasons').update({ current_pool: newPool }).eq('id', investId)

    setModalState('success')
    showToast('✓ Investment confirmed!', 'ok')
    fetchData()
  } catch (err: any) {
    showToast(`⚠ Error: ${err.message || 'Transaction failed'}`)
  }
}
```

---

**Fix 2 — `src/app/admin/season/page.tsx`** (pool modal — only `openPoolModal` changes):

```typescript
// REPLACE openPoolModal in src/app/admin/season/page.tsx

const openPoolModal = useCallback(async (season: ActiveSeason | PrevSeason) => {
  setPoolSeason(season);
  setPoolModalOpen(true);
  setPoolLoading(true);
  setPoolSearch('');

  // ── FIX 2: two-step fetch avoids silent FK-join failures ──
  // Step 1: fetch investments
  const { data: investments, error: invErr } = await supabase
    .from('investments')
    .select('id, amount, status, created_at, user_id')
    .eq('season_id', season.id)
    .order('created_at', { ascending: false });

  if (invErr || !investments || investments.length === 0) {
    setPoolInvestors([]);
    setPoolLoading(false);
    return;
  }

  // Step 2: fetch profiles for all investors in one query
  const uniqueUserIds = [...new Set(investments.map(inv => inv.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, username, email')
    .in('id', uniqueUserIds);

  const profileMap = new Map((profiles || []).map(p => [p.id, p]));

  setPoolInvestors(
    investments.map((inv: any) => {
      const p = profileMap.get(inv.user_id);
      return {
        id:       inv.id,
        userId:   inv.user_id,
        amount:   Number(inv.amount),
        status:   inv.status,
        joinedAt: inv.created_at,
        name:     p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Unknown',
        username: p?.username || '—',
        email:    p?.email    || '—',
        init:     (p?.first_name?.[0] || '?') + (p?.last_name?.[0] || '?'),
      };
    })
  );

  setPoolLoading(false);
}, [supabase]);
```

---

**Fix 3a — `src/app/dashboard/page.tsx`** (lock capped at balance):

Find the block that computes `effectiveWithdrawable` and replace:

```typescript
// FIND this section in src/app/dashboard/page.tsx (near the bottom, before return):

  const balance        = Number(profile?.balance)        || 0
  const investedTotal  = Number(profile?.invested_total) || 0
  const withdrawable   = balance
  const profitsTotal   = Number(profile?.profits_total)  || 0
  const commRate       = Number(profile?.commission_rate) || 7
  const firstName      = profile?.first_name || profile?.username || 'Investor'
  const refCode        = profile?.referral_code || '—'
  const avgRoi         = computedAvgRoi

  // ── FIX 3: cap locked at current balance so it never exceeds what's there ──
  const effectiveLockedAmount   = Math.min(lockedAmount, balance)
  const effectiveWithdrawable   = Math.max(0, withdrawable - effectiveLockedAmount)
```

Then replace every reference to `lockedAmount` in the JSX with `effectiveLockedAmount`. Specifically these spots:

```tsx
{/* Banner at top: */}
{effectiveLockedAmount > 0 && (
  <div className='db-reveal' style={{ marginBottom: 16, transitionDelay: '.02s' }}>
    <div style={{ background:'rgba(155,90,58,.08)', border:'1px solid rgba(155,90,58,.3)', borderRadius:10, padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:34, height:34, background:'rgba(155,90,58,.12)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="16" height="16" fill="none" stroke="rgba(155,90,58,.9)" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize:'.8rem', fontWeight:500, color:'var(--ink)', marginBottom:2 }}>
            ${effectiveLockedAmount.toLocaleString(undefined, { minimumFractionDigits:2 })} USDT is security-locked
          </div>
          <div style={{ fontSize:'.68rem', color:'var(--txt2)' }}>
            You can invest these funds now · Withdrawal available after lock period
          </div>
        </div>
      </div>
      <button className='db-btn db-btn-outline' style={{ padding:'8px 16px', fontSize:'.7rem', whiteSpace:'nowrap' }}
        onClick={() => router.push('/season')}>
        <span>Invest Now</span>
      </button>
    </div>
  </div>
)}

{/* Balance hero sub-line: */}
{effectiveLockedAmount > 0 && (
  <div style={{ marginTop:8, fontSize:'.72rem', color:'rgba(246,241,233,0.5)', display:'flex', alignItems:'center', gap:6 }}>
    <svg width="11" height="11" fill="none" stroke="rgba(246,241,233,0.5)" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
    <span>Withdrawable now: <strong style={{ color:'rgba(246,241,233,0.75)' }}>${effectiveWithdrawable.toLocaleString(undefined, { minimumFractionDigits:2 })}</strong></span>
  </div>
)}

{/* Locked stat card (4th card in the grid) — use effectiveLockedAmount: */}
{
  bg: effectiveLockedAmount > 0 ? 'rgba(155,90,58,.1)' : 'rgba(74,103,65,.08)',
  svgColor: effectiveLockedAmount > 0 ? 'rgba(155,90,58,.9)' : 'var(--sage)',
  icon: effectiveLockedAmount > 0
    ? <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>
    : <><rect x="3" y="11" width="18" height="11" rx="2" opacity=".4"/><path d="M8 11V8a4 4 0 018 0" opacity=".4"/></>,
  lbl: 'Locked Amount',
  val: effectiveLockedAmount > 0 ? `$${effectiveLockedAmount.toLocaleString(undefined, { minimumFractionDigits:2 })}` : '$0.00',
  sub: effectiveLockedAmount > 0 ? `Available in ${lockCountdown || '—'}` : 'No funds locked',
  cls: '',
  chColor: effectiveLockedAmount > 0 ? 'rgba(155,90,58,.9)' : 'var(--sage)',
},
```

---

**Fix 3b — `src/app/deposit/page.tsx`** (lock capped at balance):

```typescript
// FIND the section near the top of DepositPage component and replace:

  // ── FIX 3: cap locked so it never exceeds current balance ──
  const currentBalance      = Number(userProfile?.balance) || 0
  const rawLockedAmount     = lockedDeposits
    .filter(d => new Date(d.lockedUntil).getTime() > Date.now())
    .reduce((sum, d) => sum + d.amount, 0)
  // lockedAmount in state might be stale; recompute capped version here
```

Then in the `useEffect` that computes countdowns, also update `lockedAmount` to be capped:

```typescript
// REPLACE the lock countdown useEffect:

  useEffect(() => {
    if (lockedDeposits.length === 0) {
      setLockCountdowns({})
      return
    }
    const tick = () => {
      const now = Date.now()
      const newCountdowns: Record<string, string> = {}
      let stillLockedTotal = 0

      lockedDeposits.forEach(d => {
        const ms = new Date(d.lockedUntil).getTime() - now
        if (ms > 0) {
          newCountdowns[d.id] = getCountdown(d.lockedUntil)
          stillLockedTotal += d.amount
        } else {
          newCountdowns[d.id] = 'Unlocked'
        }
      })

      // ── FIX 3: cap locked at the user's current balance ──
      const profileBalance = Number(userProfile?.balance) || 0
      const cappedLocked   = Math.min(stillLockedTotal, profileBalance)
      setLockCountdowns(newCountdowns)
      setLockedAmount(cappedLocked)
    }
    tick()
    countdownRef.current = setInterval(tick, 1000)
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [lockedDeposits, userProfile])   // ← add userProfile dependency
```

---

**Fix 3c — `src/app/withdraw/page.tsx`** (lock capped at balance):

```typescript
// REPLACE the locked-amount computation section in WithdrawPage:

  const currentBalance        = Number(userProfile?.balance)           || 0
  const withdrawableTotal     = Number(userProfile?.withdrawable_total) || 0
  // ── FIX 3: locked can never exceed the actual balance ──
  const effectiveLockedAmount = Math.min(lockedAmount, currentBalance)
  const effectiveWithdrawable = Math.max(0, withdrawableTotal - effectiveLockedAmount)
```

Then replace every reference to `lockedAmount` in the JSX with `effectiveLockedAmount`, and `effectiveWithdrawable` stays as is (it already uses the capped value). Key display spots:

```tsx
{/* Balance badge locked line: */}
{effectiveLockedAmount > 0 ? (
  <div>
    <div style={{ fontSize:'.68rem', letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(246,241,233,0.3)', marginBottom:4 }}>Total Balance</div>
    <div style={{ fontSize:'.82rem', color:'rgba(246,241,233,0.7)', letterSpacing:'.04em' }}>${currentBalance.toLocaleString(undefined, { minimumFractionDigits:2 })}</div>
    <div style={{ fontSize:'.7rem', color:'rgba(155,90,58,.7)', marginTop:2, display:'flex', alignItems:'center', gap:4, justifyContent:'flex-end' }}>
      🔒 ${effectiveLockedAmount.toLocaleString(undefined, { minimumFractionDigits:2 })} locked · available in {lockCountdowns[soonestLock?.id || ''] || '—'}
    </div>
  </div>
) : (...)}

{/* Lock warning banner: */}
{effectiveLockedAmount > 0 && (
  <div ...>
    ${effectiveLockedAmount.toLocaleString(undefined, { minimumFractionDigits:2 })} USDT is security-locked
    ...
  </div>
)}

{/* Amount chips disabled condition: */}
disabled={v > effectiveWithdrawable}

{/* Available balance display: */}
<span>Available: <strong>${effectiveWithdrawable.toLocaleString(undefined, { minimumFractionDigits:2 })}</strong></span>

{/* Locked sub-text: */}
{effectiveLockedAmount > 0 && (
  <span>🔒 ${effectiveLockedAmount.toLocaleString(...)} locked (unlocks in {lockCountdowns[soonestLock?.id || ''] || '—'})</span>
)}

{/* Disable submit button when nothing to withdraw: */}
disabled={effectiveWithdrawable < 10}

{/* Locked row in summary: */}
{effectiveLockedAmount > 0 && (
  <div className='wd-detail-row' style={{ borderBottom:'none' }}>
    <span className='wd-detail-key'>Locked (unavailable)</span>
    <span className='wd-detail-val' style={{ color:'rgba(155,90,58,.8)' }}>
      🔒 ${effectiveLockedAmount.toLocaleString(...)} · available {lockCountdowns[...] || '—'}
    </span>
  </div>
)}
```

Also update the withdraw `useEffect` that tracks locked amounts:

```typescript
// REPLACE lock countdown useEffect in withdraw/page.tsx:

  useEffect(() => {
    if (lockedDeposits.length === 0) {
      setLockCountdowns({})
      setLockedAmount(0)
      return
    }
    const tick = () => {
      const now = Date.now()
      const newCountdowns: Record<string, string> = {}
      let stillLockedRaw = 0
      let anyStillLocked = false

      lockedDeposits.forEach(d => {
        const ms = new Date(d.lockedUntil).getTime() - now
        if (ms > 0) {
          newCountdowns[d.id] = getLockCountdown(d.lockedUntil)
          stillLockedRaw += d.amount
          anyStillLocked = true
        } else {
          newCountdowns[d.id] = 'Unlocked'
        }
      })

      // ── FIX 3: cap locked at the user's current balance ──
      const profileBalance = Number(userProfile?.balance) || 0
      setLockCountdowns(newCountdowns)
      setLockedAmount(Math.min(stillLockedRaw, profileBalance))

      if (!anyStillLocked) {
        if (lockTimerRef.current) clearInterval(lockTimerRef.current)
      }
    }
    tick()
    lockTimerRef.current = setInterval(tick, 1000)
    return () => { if (lockTimerRef.current) clearInterval(lockTimerRef.current) }
  }, [lockedDeposits, userProfile])   // ← add userProfile dependency
```

---

**Summary of all 3 fixes:**

| Bug | Root cause | Fix |
|-----|-----------|-----|
| Pool fills double | `s.poolFilled` (stale state) used in fallback that runs alongside RPC | Fetch fresh `current_pool` from DB → single direct update |
| Pool modal empty | Supabase implicit FK join silently returns null profiles | Two-step: fetch investments → fetch profiles with `.in('id', userIds)` |
| Locked > balance | `lockedAmount` stored raw deposit value, never capped | `effectiveLockedAmount = Math.min(lockedAmount, balance)` everywhere |