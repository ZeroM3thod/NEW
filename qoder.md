Here are all the parts that need changing:

---

## 1. Database — Update Default Rate

Run in Supabase SQL Editor:

```sql
-- Update default for new users
ALTER TABLE public.profiles ALTER COLUMN commission_rate SET DEFAULT 15.0;

-- Update all existing users to 15%
UPDATE public.profiles SET commission_rate = 15.0;

-- Fix the trigger default
-- (already handled by the ALTER above, but update handle_new_user too)
```

---

## 2. `src/app/referral/page.tsx` — Remove Auto-Increment Logic

Find and **delete** this entire block (~line 100–115):

```tsx
// ❌ REMOVE THIS ENTIRE BLOCK
const count = refUsers.length
let newRate = 7
if (count >= 50) newRate = 12
else if (count >= 25) newRate = 10
else if (count >= 10) newRate = 8

if (newRate !== profileData?.commission_rate) {
  await supabase.from('profiles').update({ commission_rate: newRate }).eq('id', user.id)
  setProfile((prev: any) => ({ ...prev, commission_rate: newRate }))
}
```

Replace with nothing — just delete it entirely.

---

## 3. `src/app/referral/page.tsx` — Fix Description Text

Find:
```tsx
Invite friends and earn {profile?.commission_rate || 7}% commission on every profit they make.
```

Replace with:
```tsx
Invite friends and earn 15% commission on every profit they make.
```

And find:
```tsx
{`Receive ${profile?.commission_rate || 7}% of every PROFIT your referral earns from their investments, credited automatically.`}
```

Replace with:
```tsx
{`Receive 15% of every PROFIT your referral earns from their investments, credited automatically.`}
```

---

## 4. `src/app/dashboard/page.tsx` — Fix Commission Display

Find:
```tsx
const commRate = Number(profile?.commission_rate) || 7
```

Replace with:
```tsx
const commRate = 15
```

---

## 5. `src/app/profile/page.tsx` — Fix Commission Display

Find (two places):
```tsx
Earn <strong style={{ color: 'var(--gold)' }}>7% commission</strong>
```
```tsx
{profile?.commission_rate || 7}%
```

Replace with:
```tsx
Earn <strong style={{ color: 'var(--gold)' }}>15% commission</strong>
```
```tsx
15%
```

---

## 6. `vaultx_final_schema.sql` — Fix Trigger Default

In the `handle_new_user` function, find:
```sql
commission_rate,
...
7.0,
```

Change `7.0` to `15.0`.

---

## 7. `src/app/referral/partner/page.tsx` — Fix Hardcoded 8%

This page has hardcoded `8%` in several places. Find and replace all instances:

```tsx
// Change all of these:
'8% Commission Rate — Active'
'Earning 8% commission'
'Every user who joins through your link earns you 8%'
u.totalDeposit * 0.08
const comm = u.totalDeposit * 0.08
Commission (8%)

// To:
'15% Commission Rate — Active'
'Earning 15% commission'
'Every user who joins through your link earns you 15%'
u.totalDeposit * 0.15
const comm = u.totalDeposit * 0.15
Commission (15%)
```

---

## Summary of Changes

| File | Change |
|------|--------|
| SQL | Default `commission_rate` → `15.0`, update all existing rows |
| `referral/page.tsx` | Remove auto-increment block, fix % text |
| `dashboard/page.tsx` | `commRate = 15` |
| `profile/page.tsx` | Display `15%` |
| `referral/partner/page.tsx` | Replace all `8%` / `0.08` with `15%` / `0.15` |

The key change is **removing the auto-increment block** in `referral/page.tsx` — that's what was overwriting the rate on every page load.