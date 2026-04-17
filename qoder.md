Looking at the two bugs:

**Bug 1:** User's `submitWithdrawal` deducts `balance` + `withdrawable_total`. Admin's `doApprove` then deducts `balance` a second time. `doReject` only restores `withdrawable_total` but never `balance`. Fix: submission deducts `withdrawable_total` only; admin approval deducts `balance`; rejection (already correct) restores `withdrawable_total`.

**Bug 2:** `doConfirm` blindly sets `withdrawable_total = newBalance`, ignoring any active locks. Fix: query remaining locked amounts and subtract them.

---

### Fix 1 — `src/app/withdraw/page.tsx`

Two targeted changes: the `effectiveWithdrawable` computation and the `submitWithdrawal` function.Here are the complete fixes as direct replacements:

---

### Fix 1 — `src/app/withdraw/page.tsx`

**Change A** — `effectiveWithdrawable` (find and replace these two lines near the bottom of the component, just before `return`):

```typescript
// ── BEFORE ──
const currentBalance        = Number(userProfile?.balance) || 0
const effectiveWithdrawable = Math.max(0, currentBalance - lockedAmount)

// ── AFTER ──
const currentBalance        = Number(userProfile?.balance)           || 0
const withdrawableTotal     = Number(userProfile?.withdrawable_total) || 0
// Base withdrawable on withdrawable_total (which already excludes pending
// withdrawal requests), then subtract any still-locked deposit amounts.
const effectiveWithdrawable = Math.max(0, withdrawableTotal - lockedAmount)
```

**Change B** — `submitWithdrawal` function (replace the entire function):

```typescript
const submitWithdrawal = async () => {
  if (!confirmDetails || !userProfile) return
  try {
    const { error } = await supabase.from('withdrawals').insert({
      user_id: userProfile.id,
      amount:  confirmDetails.amt,
      address: confirmDetails.addr,
      network: 'BEP-20',
      status:  'pending'
    })
    if (error) throw error

    // ── Only deduct withdrawable_total on submission ──────────────────────
    // `balance` is NOT touched here. It will be deducted by the admin only
    // when the withdrawal is approved, eliminating the double-deduction bug.
    // If the admin rejects the request, withdrawable_total is restored by
    // doReject() in the admin page (no balance change needed there either).
    const newWithdrawable = Math.max(
      0,
      (Number(userProfile.withdrawable_total) || 0) - confirmDetails.amt
    )
    const { error: profError } = await supabase
      .from('profiles')
      .update({ withdrawable_total: newWithdrawable })
      .eq('id', userProfile.id)

    if (profError) throw profError

    showToast('Withdrawal submitted · Pending admin approval')
    fetchData()
    setConfirmOpen(false)
    setWdAmt(''); setWdAddr(''); setWdNote('')
    setFsReq('—'); setFsRecv('—'); setSelectedChip(null)
  } catch (err: any) {
    showToast(`⚠ Error: ${err.message || 'Submission failed'}`)
  }
}
```

> **`src/app/admin/withdraw/page.tsx` needs no changes.** With the fix above, `doApprove` (which only deducts `balance`) is now the sole balance deduction point — correct. `doReject` (which only restores `withdrawable_total`) is also now correct — it undoes exactly what submission did.

---

### Fix 2 — `src/app/admin/deposit/page.tsx`

Replace the `doConfirm` function and the per-deposit loop inside `confirmAllPending`:

**`doConfirm` function (full replacement):**

```typescript
const doConfirm = async (id: string) => {
  const d = deposits.find(x => x.id === id)
  if (!d) return

  // 1. Mark the deposit as approved
  const { error: depError } = await supabase
    .from('deposits')
    .update({ status: 'approved' })
    .eq('id', id)
  if (depError) { showToast('✕ Error confirming deposit', 'err'); return }

  // 2. Fetch the user's current balance
  const { data: profile } = await supabase
    .from('profiles')
    .select('balance')
    .eq('id', d.userId)
    .single()

  const newBalance = (Number(profile?.balance) || 0) + d.amt

  // 3. Determine how much of the NEW balance is still locked ─────────────
  //    a) Check whether THIS deposit's own lock window is still active.
  //       (The 5-min timer starts when the user submits, not when admin approves.)
  const now = new Date().toISOString()
  const { data: thisDeposit } = await supabase
    .from('deposits')
    .select('locked_until')
    .eq('id', id)
    .single()

  const thisDepositStillLocked =
    thisDeposit?.locked_until && thisDeposit.locked_until > now
  const thisDepositLockedAmt = thisDepositStillLocked ? d.amt : 0

  //    b) Any OTHER approved deposits for this user that are still locked.
  const { data: otherLocked } = await supabase
    .from('deposits')
    .select('amount')
    .eq('user_id', d.userId)
    .eq('status', 'approved')
    .gt('locked_until', now)
    .neq('id', id)

  const otherLockedTotal = (otherLocked || []).reduce(
    (sum, dep) => sum + Number(dep.amount),
    0
  )

  // 4. withdrawable = newBalance minus everything that is still locked
  const totalLocked    = thisDepositLockedAmt + otherLockedTotal
  const newWithdrawable = Math.max(0, newBalance - totalLocked)

  const { error: profError } = await supabase
    .from('profiles')
    .update({
      balance:            newBalance,
      withdrawable_total: newWithdrawable,
    })
    .eq('id', d.userId)

  if (profError) {
    showToast('✕ Error updating balance', 'err')
  } else {
    showToast(`✓ DEP ${id} confirmed — $${d.amt.toLocaleString()} USDT`, 'ok')
    fetchData()
  }
  closeModal()
}
```

**`confirmAllPending` function (full replacement):**

```typescript
const confirmAllPending = async () => {
  const rows = getFiltered().filter(d => d.status === 'pending')
  if (!rows.length) { showToast('No pending deposits in current view.'); return }
  const total = rows.reduce((s, d) => s + d.amt, 0)
  if (!confirm(`Confirm all ${rows.length} pending deposits? Total: $${total.toLocaleString()}`)) return

  const now = new Date().toISOString()

  for (const d of rows) {
    // Approve the deposit row
    await supabase.from('deposits').update({ status: 'approved' }).eq('id', d.id)

    // Fetch current balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', d.userId)
      .single()

    const newBalance = (Number(profile?.balance) || 0) + d.amt

    // Check this deposit's own lock
    const { data: thisDeposit } = await supabase
      .from('deposits')
      .select('locked_until')
      .eq('id', d.id)
      .single()

    const thisDepositStillLocked =
      thisDeposit?.locked_until && thisDeposit.locked_until > now
    const thisDepositLockedAmt = thisDepositStillLocked ? d.amt : 0

    // Check other still-locked approved deposits for the same user
    const { data: otherLocked } = await supabase
      .from('deposits')
      .select('amount')
      .eq('user_id', d.userId)
      .eq('status', 'approved')
      .gt('locked_until', now)
      .neq('id', d.id)

    const otherLockedTotal = (otherLocked || []).reduce(
      (sum, dep) => sum + Number(dep.amount),
      0
    )

    const totalLocked     = thisDepositLockedAmt + otherLockedTotal
    const newWithdrawable = Math.max(0, newBalance - totalLocked)

    await supabase
      .from('profiles')
      .update({
        balance:            newBalance,
        withdrawable_total: newWithdrawable,
      })
      .eq('id', d.userId)
  }

  showToast(`✓ ${rows.length} deposits confirmed!`, 'ok')
  fetchData()
}
```

---

**Summary of what each fix does:**

| | Before | After |
|---|---|---|
| User submits withdrawal | Deducts `balance` + `withdrawable_total` | Deducts `withdrawable_total` only |
| Admin approves withdrawal | Deducts `balance` again (double-spend) | Deducts `balance` (single, correct) |
| Admin rejects withdrawal | Restores `withdrawable_total`, `balance` stays wrong | Restores `withdrawable_total` (correct, balance was never touched) |
| Admin approves deposit | Sets `withdrawable_total = full newBalance` (ignores locks) | Sets `withdrawable_total = newBalance − still-locked amounts` |