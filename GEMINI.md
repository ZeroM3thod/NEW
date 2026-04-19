Looking at the two bugs:

1. **Pool doubling**: The `confirmInvest` function calls `supabase.rpc('increment_season_pool')` explicitly, but your DB already has a trigger on the `investments` table insert that does the same — causing exactly 2× inflation. Fix: remove the explicit RPC call.

2. **Checkmark overlapping "Free" & time**: The `✓` badge is `position: absolute; right: 14px; top: 50%` which sits directly on top of the fee/time text on the right. Fix: move the checkmark into the right-side column as a top element instead of absolute-positioning it.

Here are the two targeted fixes:

**Fix 1 — `src/app/season/page.tsx` (remove the double pool increment)**Since I can't edit the files directly in your repo, here are the exact code changes:

---

**Fix 1 — `src/app/season/page.tsx`**

Find this block inside `confirmInvest` (around line where pool update happens) and **remove it entirely**:

```ts
// ❌ REMOVE THESE LINES (they double-count — a DB trigger already does this)
const { error: poolError } = await supabase.rpc('increment_season_pool', {
  p_season_id: investId,
  p_amount: amt,
})
if (poolError) console.error('Pool update error:', poolError)
```

The block before and after stays — only those 5 lines go.

---

**Fix 2 — `src/app/deposit/page.tsx`**

Find the network card's right-side block (the fee/time + absolute checkmark). Replace **both** the right-side div and the separate `{isSelected && ...}` checkmark with this single unified block:

```tsx
{/* ── BEFORE (remove both of these) ── */}
<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
  <span style={{...}}>
    {feeInfo.feeLabel}
  </span>
  <span style={{...}}>
    <svg .../>
    {feeInfo.time}
  </span>
</div>
{isSelected && (
  <div style={{
    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
    width: 22, height: 22, borderRadius: '50%', ...
  }}>✓</div>
)}
```

Replace with:

```tsx
{/* ── AFTER (unified right column, no overlap) ── */}
<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
  {isSelected ? (
    <div style={{
      width: 22, height: 22, borderRadius: '50%',
      background: 'var(--sage)', color: 'white',
      fontSize: '.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, boxShadow: '0 2px 6px rgba(74,103,65,.3)',
    }}>✓</div>
  ) : (
    <span style={{
      fontSize: '.58rem', letterSpacing: '.09em', textTransform: 'uppercase', fontWeight: 600,
      background: 'rgba(74,103,65,.1)', color: 'var(--sage)',
      border: '1px solid rgba(74,103,65,.2)', borderRadius: 100, padding: '3px 10px',
    }}>
      {feeInfo.feeLabel}
    </span>
  )}
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
```

**What changes:**
- The `✓` checkmark is now in the **same flex column** as the fee/time info — when selected it replaces the "Free" badge in that slot, with the time still showing below it. No absolute positioning, no overlap.
- Pool increment RPC removed so the DB trigger is the single source of truth for `current_pool`.