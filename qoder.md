# Deposit Page — Minimum Amount: $10 → $30

Apply these 3 changes in `src/app/deposit/page.tsx`:

---

## Change 1 — Validation toast message (in `goToStep2`)

**Find:**
```tsx
if (!amt || amt < 10) { showToast('Please enter a valid amount (min $10)'); return }
```
**Replace with:**
```tsx
if (!amt || amt < 30) { showToast('Please enter a valid amount (min $30)'); return }
```

---

## Change 2 — Input `min` attribute

**Find:**
```tsx
<input className='dp-form-input' type='number' placeholder='Enter amount e.g. 750' min='10' value={customAmt}
```
**Replace with:**
```tsx
<input className='dp-form-input' type='number' placeholder='Enter amount e.g. 750' min='30' value={customAmt}
```

---

## Change 3 — Helper text below input

**Find:**
```tsx
<div style={{ fontSize: '.7rem', color: 'var(--txt3)', marginTop: 5 }}>Minimum deposit: $10 USDT</div>
```
**Replace with:**
```tsx
<div style={{ fontSize: '.7rem', color: 'var(--txt3)', marginTop: 5 }}>Minimum deposit: $30 USDT</div>
```




# Withdraw Page — Minimum Amount: $10 → $30

Apply these 5 changes in `src/app/withdraw/page.tsx`:

---

## Change 1 — Validation toast message (in `openConfirm`)

**Find:**
```tsx
if (!amt || amt < 10) { showToast('Please enter a valid amount (min $10)'); return }
```
**Replace with:**
```tsx
if (!amt || amt < 30) { showToast('Please enter a valid amount (min $30)'); return }
```

---

## Change 2 — Input `min` attribute

**Find:**
```tsx
<input className='wd-form-input' type='number' placeholder='Enter amount e.g. 300' min='10' value={wdAmt} onChange={e => onAmtChange(e.target.value)} />
```
**Replace with:**
```tsx
<input className='wd-form-input' type='number' placeholder='Enter amount e.g. 300' min='30' value={wdAmt} onChange={e => onAmtChange(e.target.value)} />
```

---

## Change 3 — Helper text below input

**Find:**
```tsx
<span>Minimum: $10</span>
```
**Replace with:**
```tsx
<span>Minimum: $30</span>
```

---

## Change 4 — Submit button `disabled` condition (and opacity)

**Find (2 occurrences — update BOTH):**
```tsx
style={{ width: '100%', opacity: (effectiveWithdrawable < 10 || isPending) ? 0.55 : 1 }}
onClick={openConfirm}
disabled={effectiveWithdrawable < 10 || isPending}
```
**Replace with:**
```tsx
style={{ width: '100%', opacity: (effectiveWithdrawable < 30 || isPending) ? 0.55 : 1 }}
onClick={openConfirm}
disabled={effectiveWithdrawable < 30 || isPending}
```

---

## Change 5 — Helper messages below submit button (2 occurrences)

**Find:**
```tsx
{effectiveWithdrawable < 10 && effectiveLockedAmount > 0 && currentBalance > effectiveLockedAmount && (
```
**Replace with:**
```tsx
{effectiveWithdrawable < 30 && effectiveLockedAmount > 0 && currentBalance > effectiveLockedAmount && (
```

**Find:**
```tsx
{effectiveWithdrawable < 10 && effectiveLockedAmount > 0 && currentBalance <= effectiveLockedAmount && (
```
**Replace with:**
```tsx
{effectiveWithdrawable < 30 && effectiveLockedAmount > 0 && currentBalance <= effectiveLockedAmount && (
```