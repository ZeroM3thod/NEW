// ============================================================
// PATCH FILE: 60-Day Deposit Lock System
// Apply these exact changes to the files listed below
// ============================================================


// ────────────────────────────────────────────────────────────
// FILE 1: src/app/deposit/page.tsx
// ────────────────────────────────────────────────────────────

// CHANGE A: Replace getCountdown function
// FIND (exact):
function getCountdown(lockedUntil: string): string {
  const ms = new Date(lockedUntil).getTime() - Date.now()
  if (ms <= 0) return 'Unlocked'
  const totalSec = Math.ceil(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${pad2(s)}`
}

// REPLACE WITH:
function getCountdown(lockedUntil: string): string {
  const ms = new Date(lockedUntil).getTime() - Date.now()
  if (ms <= 0) return 'Unlocked'
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}


// CHANGE B: Lock duration in confirmDeposit function
// FIND (exact):
      const lockedUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString()

// REPLACE WITH:
      const lockedUntil = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()


// CHANGE C: Toast after deposit submission
// FIND (exact):
      showToast('Deposit submitted · Pending review · 5-min lock starts now')

// REPLACE WITH:
      showToast('Deposit submitted · Pending review · 60-day lock starts on approval')


// CHANGE D: Step 1 info box text
// FIND (exact):
                <strong style={{ color: 'var(--ink)' }}>5-minute security lock:</strong> Deposited funds are locked for 5 minutes after submission. During this time you can invest in seasons. Profits &amp; referral earnings are withdrawable at any time.

// REPLACE WITH:
                <strong style={{ color: 'var(--ink)' }}>60-day security lock:</strong> Deposited funds are locked for 60 days after admin approval. During this time you can invest in seasons and earn profits. Profits &amp; referral earnings are withdrawable at any time.


// CHANGE E: Step 3 payment warning
// FIND (exact):
                Once approved by admin, your deposit will be <strong>locked for 5 minutes</strong> before withdrawal is available. You can invest it in seasons immediately.

// REPLACE WITH:
                Once approved by admin, your deposit will be <strong>locked for 60 days</strong> before direct withdrawal is available. You can still invest it in seasons immediately.


// CHANGE F: Step 4 confirmation detail row
// FIND (exact):
                  ['Security Lock', '5 min after approval', 'rgba(155,90,58,.9)'],

// REPLACE WITH:
                  ['Security Lock', '60 days from approval', 'rgba(155,90,58,.9)'],


// CHANGE G: Lock banner at top of page
// FIND (exact):
          You can invest these funds now · Withdrawal unlocks in {lockCountdown || '—'}

// REPLACE WITH:
          You can invest these funds now · Withdrawal available in {lockCountdown || '—'}


// CHANGE H: Unlock notification modal text
// FIND (exact):
                        You can invest these funds now · Withdrawal unlocks in {countdown}

// REPLACE WITH (if found):
                        You can invest these funds now · Withdrawal available in {countdown}


// ────────────────────────────────────────────────────────────
// FILE 2: src/app/dashboard/page.tsx
// ────────────────────────────────────────────────────────────

// CHANGE A: Replace getLockCountdown function
// FIND (exact):
function getLockCountdown(lockedUntil: string): string {
  const ms = new Date(lockedUntil).getTime() - Date.now()
  if (ms <= 0) return ''
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${m}:${pad2(s)}`
}

// REPLACE WITH:
function getLockCountdown(lockedUntil: string): string {
  const ms = new Date(lockedUntil).getTime() - Date.now()
  if (ms <= 0) return ''
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}


// CHANGE B: Locked amount alert subtext
// FIND (exact):
                      You can invest these funds now · Withdrawal unlocks in {lockCountdown || '—'}

// REPLACE WITH:
                      You can invest these funds now · Withdrawal available in {lockCountdown || '—'}


// CHANGE C: Locked amount description in balance hero
// FIND (exact):
                  <span>You can invest these funds now · Withdrawal unlocks after the 5-minute security hold.</span>

// REPLACE WITH (if found):
                  <span>You can invest these funds now · Withdrawal available after the 60-day security hold.</span>


// CHANGE D: Stat card "Locked Amount" sub-text
// FIND (exact):
                  sub: lockedAmount > 0 ? `Unlocks in ${lockCountdown || '—'}` : 'No funds locked',

// REPLACE WITH:
                  sub: lockedAmount > 0 ? `Available in ${lockCountdown || '—'}` : 'No funds locked',


// ────────────────────────────────────────────────────────────
// FILE 3: src/app/withdraw/page.tsx
// ────────────────────────────────────────────────────────────

// CHANGE A: Replace getLockCountdown function
// FIND (exact):
function getLockCountdown(lockedUntil: string): string {
  const ms = new Date(lockedUntil).getTime() - Date.now()
  if (ms <= 0) return 'Unlocked'
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${m}:${pad2(s)}`
}

// REPLACE WITH:
function getLockCountdown(lockedUntil: string): string {
  const ms = new Date(lockedUntil).getTime() - Date.now()
  if (ms <= 0) return 'Unlocked'
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}


// CHANGE B: Lock warning banner description
// FIND (exact):
                  Your recently deposited funds are locked for 5 minutes from deposit time. You can <strong>invest these funds in seasons</strong> and earn profits. Withdrawal of locked funds will be available once the timer expires.

// REPLACE WITH:
                  Your recently deposited funds are locked for 60 days from approval time. You can <strong>invest these funds in seasons</strong> and earn profits. Withdrawal of locked funds will be available after the 60-day period.


// CHANGE C: Balance hero locked text
// FIND (exact):
                        ${lockedAmount.toLocaleString()} locked · unlocks in {lockCountdowns[soonestLock?.id || ''] || '—'}

// REPLACE WITH:
                        ${lockedAmount.toLocaleString()} locked · available in {lockCountdowns[soonestLock?.id || ''] || '—'}


// CHANGE D: Form detail row for lock
// FIND (exact):
                      <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                      ${lockedAmount.toLocaleString()} · unlocks {lockCountdowns[soonestLock?.id || ''] || '—'}

// REPLACE WITH:
                      <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                      ${lockedAmount.toLocaleString()} · available {lockCountdowns[soonestLock?.id || ''] || '—'}


// CHANGE E: Locked funds timer in banner
// FIND (exact):
                    <span style={{ fontSize: '.68rem', color: 'var(--txt2)' }}>
                      You can invest these funds now · Withdrawal unlocks after the 5-minute security hold.

// REPLACE WITH:
                    <span style={{ fontSize: '.68rem', color: 'var(--txt2)' }}>
                      You can invest these funds now · Withdrawal available after the 60-day security hold.


// CHANGE F: Insufficient balance toast with lock message  
// FIND (exact):
          showToast(`⚠ $${lockedAmount.toLocaleString()} is locked. Effective withdrawable: $${effectiveWithdrawable.toLocaleString()}`)

// REPLACE WITH (no change needed — still correct)
// (leave as-is)


// CHANGE G: End of withdraw form — unlock timer text
// FIND (exact):
          Funds are locked · Unlocks in {lockCountdowns[soonestLock?.id || ''] || '—'}

// REPLACE WITH:
          Funds locked for 60 days · Available in {lockCountdowns[soonestLock?.id || ''] || '—'}


// ────────────────────────────────────────────────────────────
// FILE 4: src/app/api/unlock-notification/route.ts
// ────────────────────────────────────────────────────────────

// CHANGE A: Email subject line
// FIND (exact):
      subject: `✅ Your $${amount} USDT Deposit Has Been Unlocked — VaultX`,

// REPLACE WITH:
      subject: `✅ Your $${amount} USDT Deposit Lock Has Expired — VaultX`,


// CHANGE B: Email body — unlock description paragraph
// FIND (exact):
        Great news — your deposit has completed its 5-minute security verification period and the funds are now <strong style="color:#4a6741">fully available</strong> for withdrawal or further investment.

// REPLACE WITH:
        Great news — your deposit has completed its 60-day security lock period and the funds are now <strong style="color:#4a6741">fully available</strong> for withdrawal or further investment.


// CHANGE C: Email body — lock explanation
// FIND (exact):
          &#128274; <strong>What was the lock?</strong> All deposits are held for 5 minutes as a security measure. During this period you could invest and earn profits, but direct withdrawal of the deposited amount was paused. The lock has now lifted.

// REPLACE WITH:
          &#128274; <strong>What was the lock?</strong> All deposits are held for 60 days as a security measure. During this period you could invest and earn profits, but direct withdrawal of the deposited amount was paused. The lock has now lifted.