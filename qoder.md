I need to add status checks in two files: the withdraw page and the season page.The files are read-only. Here are the exact changes you need to make:

**File 1: `src/app/withdraw/page.tsx`**

Find this line (around line where `effectiveWithdrawable` is calculated):

```tsx
  const effectiveWithdrawable = Math.max(0, currentBalance - effectiveLockedAmount - pendingWithdrawalsTotal)
```

Add this right after it:

```tsx
  const isPending = (userProfile?.status || 'active').toLowerCase() === 'pending'
```

Then find the **BALANCE BADGE** section and add this banner right before it (before `{/* BALANCE BADGE */}`):

```tsx
{/* PENDING STATUS BANNER */}
{isPending && (
  <div className='wd-reveal' style={{ marginBottom: 16 }}>
    <div style={{
      background: 'rgba(184,147,90,.08)', border: '1px solid rgba(184,147,90,.3)',
      borderRadius: 'var(--r-lg)', padding: '14px 18px',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <svg width="16" height="16" fill="none" stroke="var(--gold)" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <div>
        <div style={{ fontSize: '.8rem', fontWeight: 500, color: 'var(--ink)', marginBottom: 2 }}>
          Account Pending — Withdrawals Restricted
        </div>
        <div style={{ fontSize: '.7rem', color: 'var(--txt2)' }}>
          Your account is under review. Withdrawals are disabled until an admin activates your account. Please contact support.
        </div>
      </div>
    </div>
  </div>
)}
```

Then find the `<button className='wd-btn wd-btn-dark' style={{ width: '100%'` and change it to:

```tsx
<button
  className='wd-btn wd-btn-dark'
  style={{ width: '100%', opacity: (effectiveWithdrawable < 10 || isPending) ? 0.55 : 1 }}
  onClick={openConfirm}
  disabled={effectiveWithdrawable < 10 || isPending}
>
  <span>{isPending ? 'Account Pending — Withdrawals Disabled' : 'Request Withdrawal →'}</span>
</button>
```

---

**File 2: `src/app/season/page.tsx`**

Find the `const currentSeason` line and add right after the `const myTotalInvested` / `myProfits` / `availableBalance` block:

```tsx
  const isPending = (userProfile?.status || 'active').toLowerCase() === 'pending'
```

Then in the active season card footer, find the `isOpen && !isFull` button:

```tsx
) : isOpen && !isFull ? (
  <button className='sx-btn-sage' style={{width:'100%',textAlign:'center'}} onClick={() => openInvest(s.id)}>
    Invest Now →
  </button>
```

Replace it with:

```tsx
) : isOpen && !isFull ? (
  isPending ? (
    <div style={{textAlign:'center',fontSize:'.75rem',color:'var(--gold)',fontWeight:500,padding:'4px 0'}}>
      ⏳ Account Pending · Investment Disabled
    </div>
  ) : (
    <button className='sx-btn-sage' style={{width:'100%',textAlign:'center'}} onClick={() => openInvest(s.id)}>
      Invest Now →
    </button>
  )
```

Also in the **history table** action column, find:

```tsx
{r.dbStatus==='open' && !r.mySeasonId && !r.isEntryExpired ? (
  <button className='sx-btn-sage' style={{fontSize:'.7rem',padding:'7px 14px',whiteSpace:'nowrap'}} onClick={() => openInvest(r.id)}>
    Invest Now
  </button>
```

Replace with:

```tsx
{r.dbStatus==='open' && !r.mySeasonId && !r.isEntryExpired ? (
  isPending ? (
    <span style={{fontSize:'.72rem',color:'var(--gold)'}}>Account Pending</span>
  ) : (
    <button className='sx-btn-sage' style={{fontSize:'.7rem',padding:'7px 14px',whiteSpace:'nowrap'}} onClick={() => openInvest(r.id)}>
      Invest Now
    </button>
  )
```

And in the **mobile history cards** Invest button, find:

```tsx
{r.dbStatus==='open' && !r.mySeasonId && !r.isEntryExpired && (
  <div style={{paddingTop:12,borderTop:'1px solid var(--border)'}}>
    <button className='sx-btn-sage' style={{width:'100%',textAlign:'center',fontSize:'.72rem',padding:'10px'}} onClick={() => openInvest(r.id)}>
      Invest Now →
    </button>
  </div>
)}
```

Replace with:

```tsx
{r.dbStatus==='open' && !r.mySeasonId && !r.isEntryExpired && (
  <div style={{paddingTop:12,borderTop:'1px solid var(--border)'}}>
    {isPending ? (
      <div style={{textAlign:'center',fontSize:'.72rem',color:'var(--gold)',padding:'6px 0',fontWeight:500}}>
        ⏳ Account Pending · Investment Disabled
      </div>
    ) : (
      <button className='sx-btn-sage' style={{width:'100%',textAlign:'center',fontSize:'.72rem',padding:'10px'}} onClick={() => openInvest(r.id)}>
        Invest Now →
      </button>
    )}
  </div>
)}
```

Also add a pending banner inside the **invest modal** form — at the very start of `{modalState === 'form' && currentSeason && (`, add this as the first child:

```tsx
{isPending && (
  <div style={{marginBottom:16,padding:'12px 14px',background:'rgba(184,147,90,.06)',border:'1px solid rgba(184,147,90,.25)',borderRadius:6,fontSize:'.75rem',color:'var(--gold)',lineHeight:1.7}}>
    ⏳ Your account is pending review. You cannot invest until an admin activates your account.
  </div>
)}
```

And disable the confirm button inside the modal — find `disabled={!!amountError || !amountVal || submitting}` and change to:

```tsx
disabled={!!amountError || !amountVal || submitting || isPending}
```

These changes ensure any user with `status = 'pending'` is blocked from both withdrawing and joining seasons, with clear messaging explaining why.