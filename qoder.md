Here's a thorough analysis of all bugs found, ordered by severity, with only the changed code snippets:

---

## Critical Bugs (Data Integrity)

### Bug 1 — `withdrawable_total` double-subtraction in `src/app/withdraw/page.tsx`

`withdrawable_total` in the DB is already set to `balance - locked` when a deposit is confirmed. The withdraw page then subtracts `lockedAmount` *again*, showing `balance - 2×locked`.

```typescript
// src/app/withdraw/page.tsx
// FIND and REPLACE this block (~line 175):
const currentBalance        = Number(userProfile?.balance)           || 0
const withdrawableTotal     = Number(userProfile?.withdrawable_total) || 0
// ── FIX 3: locked can never exceed the actual balance ──
const effectiveLockedAmount = Math.min(lockedAmount, currentBalance)
const effectiveWithdrawable = Math.max(0, withdrawableTotal - effectiveLockedAmount)

// REPLACE WITH:
const currentBalance        = Number(userProfile?.balance)           || 0
const withdrawableTotal     = Number(userProfile?.withdrawable_total) || 0
// withdrawable_total already = balance - locked - pending_withdrawals; don't subtract locked again
const effectiveLockedAmount = Math.min(lockedAmount, currentBalance)
const effectiveWithdrawable = withdrawableTotal   // ← was incorrectly subtracting lockedAmount twice
```

Also add a refresh when locks expire — add this `useEffect` after the existing lock timer effect:

```typescript
// src/app/withdraw/page.tsx — add after the lock countdown useEffect
useEffect(() => {
  // When all locks have expired, refresh profile so withdrawable_total is recalculated from server
  const allExpired = lockedDeposits.length > 0 &&
    lockedDeposits.every(d => new Date(d.lockedUntil).getTime() <= Date.now())
  if (allExpired) {
    fetchData()
  }
}, [lockedDeposits, fetchData])
```

---

### Bug 2 — Dashboard `approveWd` / `approveAll` never update user's balance

The dashboard's quick-approve only marks the withdrawal as approved but never deducts from the user's `balance`. The dedicated `/admin/withdraw` page does this correctly.

**Step 1** — Add `userId` to the `WdEntry` interface and mapping:

```typescript
// src/app/admin/dashboard/page.tsx
// FIND:
interface WdEntry {
  id: string; init: string; name: string; un: string;
  amt: string; wallet: string; date: string; season: string;
  status: 'pending' | 'approved' | 'rejected';
}

// REPLACE WITH:
interface WdEntry {
  id: string; init: string; name: string; un: string;
  amt: string; wallet: string; date: string; season: string;
  status: 'pending' | 'approved' | 'rejected';
  userId: string;   // ← ADD
}
```

**Step 2** — Map `userId` in the fetch:

```typescript
// src/app/admin/dashboard/page.tsx — inside fetchData(), the setWdState map:
// FIND:
setWdState(pndWd.map((w: any) => ({
  id: w.id,
  init: ...,
  // ...
  status: 'pending'
})));

// ADD userId to the mapped object:
setWdState(pndWd.map((w: any) => ({
  id: w.id,
  init: (w.profiles?.first_name?.[0] || '') + (w.profiles?.last_name?.[0] || ''),
  name: `${w.profiles?.first_name} ${w.profiles?.last_name}`,
  un: `@${w.profiles?.username}`,
  amt: `$${Number(w.amount).toLocaleString()}`,
  wallet: w.address,
  date: new Date(w.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
  season: 'Pending',
  status: 'pending',
  userId: w.user_id,   // ← ADD
})));
```

**Step 3** — Fix `approveWd` to deduct balance:

```typescript
// src/app/admin/dashboard/page.tsx
// FIND approveWd and REPLACE with:
const approveWd = async (id: string) => {
  const w = wdState.find(x => x.id === id);
  if (!w || w.status !== 'pending') return;
  if (!confirm(`Approve ${w.amt} withdrawal for ${w.name}?`)) return;

  const { error } = await supabase.from('withdrawals').update({ status: 'approved' }).eq('id', id);
  if (error) { showToast('✕ Error approving withdrawal', 'err'); return; }

  // ← FIX: deduct from user's balance
  const rawAmt = Number(w.amt.replace(/[^0-9.]/g, ''));
  const { data: profile } = await supabase.from('profiles').select('balance').eq('id', w.userId).single();
  if (profile) {
    await supabase.from('profiles').update({ balance: Number(profile.balance) - rawAmt }).eq('id', w.userId);
  }

  setWdState(prev => prev.map(x => x.id === id ? { ...x, status: 'approved' } : x));
  setStats(s => ({ ...s, pendingWithdrawals: s.pendingWithdrawals - 1 }));
  showToast(`✓ ${w.amt} withdrawal approved for ${w.name}`, 'ok');
};
```

**Step 4** — Fix `approveAll` similarly:

```typescript
// src/app/admin/dashboard/page.tsx — REPLACE approveAll:
const approveAll = async () => {
  const pending = wdState.filter(w => w.status === 'pending');
  if (!pending.length) { showToast('No pending requests.'); return; }
  if (!confirm(`Approve all ${pending.length} pending withdrawals?`)) return;

  const ids = pending.map(p => p.id);
  const { error } = await supabase.from('withdrawals').update({ status: 'approved' }).in('id', ids);
  if (error) { showToast('✕ Error approving all withdrawals', 'err'); return; }

  // ← FIX: deduct each user's balance
  for (const p of pending) {
    const rawAmt = Number(p.amt.replace(/[^0-9.]/g, ''));
    const { data: prof } = await supabase.from('profiles').select('balance').eq('id', p.userId).single();
    if (prof) {
      await supabase.from('profiles').update({ balance: Number(prof.balance) - rawAmt }).eq('id', p.userId);
    }
  }

  setWdState(prev => prev.map(x => x.status === 'pending' ? { ...x, status: 'approved' } : x));
  setStats(s => ({ ...s, pendingWithdrawals: 0 }));
  showToast(`✓ All ${pending.length} withdrawals approved!`, 'ok');
};
```

---

### Bug 3 — Race condition in season pool update (`src/app/season/page.tsx`)

The current approach reads `current_pool`, then inserts the investment, then writes the new pool value. Two simultaneous investors can both read the same value and both add to it — resulting in an incorrect (lower) pool count.

Migration 11 already created the `increment_season_pool` RPC. Use it:

```typescript
// src/app/season/page.tsx — FIND inside confirmInvest(), the pool update block:
// DELETE these lines:
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

// ... (keep the investment insert and profile update)

// ── FIX 1: single pool update using the fresh value we already read ──
const newPool = freshFilled + amt
await supabase.from('seasons').update({ current_pool: newPool }).eq('id', investId)

// REPLACE THE ENTIRE BLOCK WITH:
// Atomically check and increment pool via the RPC function
const { data: freshSeasonRow } = await supabase
  .from('seasons')
  .select('current_pool, pool_cap')
  .eq('id', investId)
  .single()

const freshFilled  = Number(freshSeasonRow?.current_pool) || 0
const freshCap     = Number(freshSeasonRow?.pool_cap)     || s.pool
const remaining    = freshCap - freshFilled
if (remaining < amt) {
  showToast(`⚠ Only ${fmtUSDT(remaining)} USDT space left in this pool.`)
  return
}
// ... (investment insert and profile update stay here)

// Atomic pool increment (no read-modify-write race)
const { error: poolError } = await supabase.rpc('increment_season_pool', {
  p_season_id: investId,
  p_amount: amt,
})
if (poolError) console.error('Pool update error:', poolError)
```

---

## High Priority (Visual / Functional Breaks)

### Bug 4 — `sm-b-pending` CSS class missing (`src/app/admin/season/season.css`)

Open seasons get the class `sm-b-pending` in the JSX template but that class doesn't exist in the CSS, so the badge has no styling.

```css
/* src/app/admin/season/season.css — add after .sm-b-running: */
.sm-b-pending { background: rgba(184,147,90,.12); color: var(--gold-d); border: 1px solid var(--border) }
```

---



### Bug 6 — Auto-close timers leak on unmount (`src/app/admin/season/page.tsx`)

`autoCloseTimers.current` accumulates `setTimeout` handles that are never cleared when the component unmounts.

```typescript
// src/app/admin/season/page.tsx — add this useEffect (anywhere after the ref is declared):
useEffect(() => {
  return () => {
    // Clear all pending auto-close timers on unmount
    Object.values(autoCloseTimers.current).forEach(clearTimeout)lll
  }
}, [])
```

---

### Bug 7 — Global loader shown when opening user detail modal (`src/app/admin/user/page.tsx`)

`openModal` sets `setLoading(true)` which triggers the full-page `<VaultXLoader>` overlay every time an admin clicks "View" on a user row.

```typescript
// src/app/admin/user/page.tsx
// ADD a separate state for modal loading (near the other useState declarations):
const [modalLoading, setModalLoading] = useState(false)

// FIND openModal and change the two loading calls:
const openModal = async (u: User) => {
  setModalLoading(true)   // ← was setLoading(true)
  // ... all the fetches ...
  setModalOpen(true)
  setModalLoading(false)  // ← was setLoading(false)
}
```

Then update the JSX inside the modal to use `modalLoading`:

```tsx
// src/app/admin/user/page.tsx — inside the modal body, wrap with:
<div className="adm-modal-body">
  {modalLoading ? (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-sec)', fontSize: '.82rem' }}>
      Loading user data…
    </div>
  ) : (
    <>
      {/* existing tab panes */}
    </>
  )}
</div>
```

---

## Medium Priority (Performance / UX)

### Bug 8 — Hardcoded chart data in admin transaction page (`src/app/admin/transaction/page.tsx`)

The deposit/withdrawal chart uses static dummy data from March–April regardless of actual transactions.

```typescript
// src/app/admin/transaction/page.tsx — REPLACE the chart useEffect with:
useEffect(() => {
  import('chart.js/auto').then(({ default: Chart }) => {
    if (!chartRef.current) return
    chartInst.current?.destroy()
    const ctx = chartRef.current.getContext('2d')!

    // Build last-7-days buckets from real allTx
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d
    })
    const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    const labels = days.map(fmt)

    const conf = days.map(d => allTx
      .filter(t => t.type === 'deposit' && t.status === 'Approved' &&
        new Date(t.date).toDateString() === d.toDateString())
      .reduce((s, t) => s + t.amount, 0))

    const pend = days.map(d => allTx
      .filter(t => t.type === 'deposit' && t.status === 'Pending' &&
        new Date(t.date).toDateString() === d.toDateString())
      .reduce((s, t) => s + t.amount, 0))

    const rej = days.map(d => allTx
      .filter(t => t.type === 'withdrawal' && t.status === 'Rejected' &&
        new Date(t.date).toDateString() === d.toDateString())
      .reduce((s, t) => s + t.amount, 0))

    const total = { dep: conf.reduce((a, b) => a + b, 0), wd: pend.reduce((a, b) => a + b, 0) }
    setChartTotals({
      dep: '$' + Math.round(total.dep / 1000) + 'K',
      wd:  '$' + Math.round(total.wd  / 1000) + 'K',
      net: '$' + Math.round((total.dep - total.wd) / 1000) + 'K',
    })

    const g1 = ctx.createLinearGradient(0,0,0,175); g1.addColorStop(0,'rgba(74,103,65,.18)'); g1.addColorStop(1,'rgba(74,103,65,0)')
    const g2 = ctx.createLinearGradient(0,0,0,175); g2.addColorStop(0,'rgba(184,147,90,.18)'); g2.addColorStop(1,'rgba(184,147,90,0)')
    const g3 = ctx.createLinearGradient(0,0,0,175); g3.addColorStop(0,'rgba(155,58,58,.14)'); g3.addColorStop(1,'rgba(155,58,58,0)')

    chartInst.current = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [
        { label: 'Approved', data: conf, fill: true, backgroundColor: g1, borderColor: 'rgba(74,103,65,.85)', borderWidth: 2, pointBackgroundColor: 'rgba(74,103,65,.9)', pointBorderColor: '#faf7f2', pointBorderWidth: 2, pointRadius: 3, tension: .42 },
        { label: 'Pending',  data: pend, fill: true, backgroundColor: g2, borderColor: 'rgba(184,147,90,.85)', borderWidth: 2, pointBackgroundColor: 'rgba(184,147,90,.9)', pointBorderColor: '#faf7f2', pointBorderWidth: 2, pointRadius: 3, tension: .42 },
        { label: 'Rejected', data: rej,  fill: true, backgroundColor: g3, borderColor: 'rgba(155,58,58,.75)', borderWidth: 2, pointBackgroundColor: 'rgba(155,58,58,.9)', pointBorderColor: '#faf7f2', pointBorderWidth: 2, pointRadius: 3, tension: .42 },
      ]},
      options: { responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(28,28,28,.96)', borderColor: 'rgba(184,147,90,.3)', borderWidth: 1, titleColor: '#d4aa72', bodyColor: '#f6f1e9', padding: 10, callbacks: { label: (c: any) => `  ${c.dataset.label}: $${c.raw.toLocaleString()}` } } },
        scales: { x: { grid: { color: 'rgba(184,147,90,.06)' }, ticks: { color: '#6b6459', font: { family: 'DM Sans', size: 9 } } }, y: { grid: { color: 'rgba(184,147,90,.06)' }, ticks: { color: '#6b6459', font: { family: 'DM Sans', size: 9 }, callback: (v: any) => '$' + (v >= 1000 ? (v/1000).toFixed(1)+'K' : v) } } },
        interaction: { intersect: false, mode: 'index' } }
    })
  })
  return () => { chartInst.current?.destroy() }
}, [allTx])  // ← re-renders when real data loads
```

---

### Bug 9 — Middleware runs expensive DB queries on every API request (`src/middleware.ts`)

The middleware fetches both the user session and the settings row on every single request, including the `/api/contact` and `/api/unlock-notification` routes.

```typescript
// src/middleware.ts — add near the TOP of the middleware function, before any DB calls:
export async function middleware(request: NextRequest) {
  // Skip expensive middleware for API routes entirely
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }
  return await updateSession(request)
}
```

And inside `updateSession`, add a similar short-circuit at the very top:

```typescript
// src/middleware.ts — first lines of updateSession():
export async function updateSession(request: NextRequest) {
  // Static assets — skip all DB work
  const { pathname } = request.nextUrl
  if (pathname.startsWith('/_next') || pathname.startsWith('/api/') ||
      /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js)$/.test(pathname)) {
    return NextResponse.next({ request })
  }
  // ... rest of function unchanged
```

---

### Bug 10 — Email unlock check interval runs forever (`src/app/deposit/page.tsx`)

The 30-second interval that sends unlock notifications keeps firing even when there are no locked deposits.

```typescript
// src/app/deposit/page.tsx — REPLACE the email check useEffect:
useEffect(() => {
  // Only start the interval if there are deposits that could become unlockable
  const watchable = history.filter(
    d => d.status === 'approved' && d.lockedUntil && !d.unlockEmailSent
  )
  if (watchable.length === 0) return   // ← nothing to watch, don't start interval

  emailCheckRef.current = setInterval(() => {
    checkUnlockNotifications(history)
  }, 30000)
  return () => { if (emailCheckRef.current) clearInterval(emailCheckRef.current) }
}, [history, checkUnlockNotifications])
```

---

## Summary Table

| # | File | Severity | Issue |
|---|------|----------|-------|
| 1 | `withdraw/page.tsx` | 🔴 Critical | `withdrawable_total` double-subtracted |
| 2 | `admin/dashboard/page.tsx` | 🔴 Critical | `approveWd` / `approveAll` never deduct balance |
| 3 | `season/page.tsx` | 🔴 Critical | Race condition on pool update |
| 4 | `admin/season/season.css` | 🟠 High | `sm-b-pending` class missing |

| 6 | `admin/season/page.tsx` | 🟠 High | Auto-close timers never cleared on unmount |
| 7 | `admin/user/page.tsx` | 🟠 High | Global loader fires for every modal open |
| 8 | `admin/transaction/page.tsx` | 🟡 Medium | Chart uses hardcoded dummy data |
| 9 | `middleware.ts` | 🟡 Medium | DB queries run on every API/static request |
| 10 | `deposit/page.tsx` | 🟡 Medium | Email check interval never stops |