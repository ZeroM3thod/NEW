# ValutX — Product Requirements Document (PRD)
**Version:** 1.0  
**Stack:** Next.js 14 (App Router) · Supabase · Vercel  
**Prepared:** April 2026

---

## 1. Project Overview

ValutX is a structured USDT investment platform operating through defined seasonal investment cycles. Users deposit USDT, invest across seasons, and earn ROI. Admins manage seasons, approve deposits/withdrawals, and control platform settings including maintenance mode.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind-free (CSS Modules / inline) |
| Auth | Supabase Auth (email+password, JWT) |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage (QR codes, KYC docs) |
| Realtime | Supabase Realtime (deposit/withdrawal status updates) |
| Deployment | Vercel (frontend) + Supabase (hosted DB) |
| Email | Supabase Edge Functions → Resend API |

---

## 3. Supabase Database Schema

### 3.1 `profiles` (extends auth.users)
```sql
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL,
  full_name     TEXT,
  phone         TEXT,
  country       TEXT,
  role          TEXT DEFAULT 'user' CHECK (role IN ('user','admin')),
  status        TEXT DEFAULT 'active' CHECK (status IN ('active','suspended','pending')),
  referral_code TEXT UNIQUE NOT NULL,
  referred_by   UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 `wallets`
```sql
CREATE TABLE wallets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  balance         NUMERIC(18,2) DEFAULT 0,       -- withdrawable profit only
  deposit_locked  NUMERIC(18,2) DEFAULT 0,       -- locked deposit principal
  total_invested  NUMERIC(18,2) DEFAULT 0,
  total_withdrawn NUMERIC(18,2) DEFAULT 0,
  total_pnl       NUMERIC(18,2) DEFAULT 0,
  referral_earned NUMERIC(18,2) DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.3 `seasons`
```sql
CREATE TABLE seasons (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,                   -- e.g. "Season 5"
  season_number INT UNIQUE NOT NULL,
  entry_open    DATE NOT NULL,
  entry_close   DATE NOT NULL,                   -- last day to join
  run_start     DATE NOT NULL,                   -- day after entry_close
  run_end       DATE NOT NULL,
  roi_min       NUMERIC(5,2),
  roi_max       NUMERIC(5,2),
  final_roi     NUMERIC(5,2),                    -- set when closing
  pool_size     NUMERIC(18,2) NOT NULL,
  pool_filled   NUMERIC(18,2) DEFAULT 0,
  min_entry     NUMERIC(10,2) DEFAULT 30,
  max_entry     NUMERIC(10,2) DEFAULT 100000,
  status        TEXT DEFAULT 'upcoming'
                CHECK (status IN ('upcoming','open','running','closed')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

**Season Status Logic:**
- `upcoming` → entry_open is in the future
- `open` → between entry_open and entry_close (users can invest)
- `running` → between run_start and run_end (locked)
- `closed` → past run_end, final_roi set

**Homepage displays last 4 seasons:**
- 2 most recent `closed` seasons
- 1 most recent `running` season
- 1 most recent `open` season

### 3.4 `deposits`
```sql
CREATE TABLE deposits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id),
  amount      NUMERIC(18,2) NOT NULL CHECK (amount >= 30),
  network     TEXT NOT NULL CHECK (network IN ('TRC-20','ERC-20','BEP-20')),
  tx_hash     TEXT NOT NULL,
  status      TEXT DEFAULT 'pending'
              CHECK (status IN ('pending','confirmed','rejected')),
  rejection_reason TEXT,
  note        TEXT,
  admin_id    UUID REFERENCES profiles(id),
  confirmed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

**Deposit addresses (store in platform_settings or env):**
```
TRC-20: TXkPqV9sZbUmWHvCaZLfwBgY3qNxR8eKdM
ERC-20: 0x4aF3bC2e8f1D9Aa72cE63b5B87dF4e1C9Ab3D5E
BEP-20: 0x7bC9dE3F4a2B1c8Ef5A6D7e923cFb47D1aE8c9B
```

QR codes for each address: store as PNG in Supabase Storage bucket `qr-codes/` (pre-generated, public read).

**On deposit confirmation:**
1. Add `amount` to `wallets.deposit_locked`
2. Record in `deposit_season_locks` table (see 3.6)

### 3.5 `withdrawals`
```sql
CREATE TABLE withdrawals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES profiles(id),
  amount           NUMERIC(18,2) NOT NULL CHECK (amount >= 30),
  wallet_address   TEXT NOT NULL,
  network          TEXT NOT NULL DEFAULT 'BEP-20',
  fee              NUMERIC(10,2) DEFAULT 0.5,
  amount_received  NUMERIC(18,2),
  tx_id            TEXT,
  status           TEXT DEFAULT 'pending'
                   CHECK (status IN ('pending','approved','rejected')),
  rejection_reason TEXT,
  note             TEXT,
  admin_id         UUID REFERENCES profiles(id),
  processed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
```

**Withdrawal rules:**
- Minimum amount: **$30 USDT**
- User can only withdraw from `wallets.balance` (profit), NOT from `wallets.deposit_locked`
- Deposit principal is unlocked after user completes **10 seasons** (see 3.6)
- On approval: deduct from `wallets.balance`, credit referrer 5%

### 3.6 `deposit_season_locks` (10-season lock tracking)
```sql
CREATE TABLE deposit_season_locks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id),
  deposit_id      UUID REFERENCES deposits(id),
  deposit_amount  NUMERIC(18,2) NOT NULL,
  seasons_required INT DEFAULT 10,
  seasons_completed INT DEFAULT 0,
  is_unlocked     BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

**Lock logic:**
- When deposit is confirmed → insert row, `seasons_completed = 0`
- When a season closes and user participated → increment `seasons_completed` for all their active locks
- When `seasons_completed >= 10` → set `is_unlocked = TRUE`, move amount from `wallets.deposit_locked` to `wallets.balance`
- "Participated" = has a row in `season_investments` for that season

### 3.7 `season_investments`
```sql
CREATE TABLE season_investments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id),
  season_id  UUID REFERENCES seasons(id),
  amount     NUMERIC(18,2) NOT NULL,
  roi_earned NUMERIC(18,2),
  status     TEXT DEFAULT 'active' CHECK (status IN ('active','completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, season_id)
);
```

**On season close (admin sets final_roi):**
1. For each investment: `roi_earned = amount * final_roi / 100`
2. Add `roi_earned` to `wallets.balance`
3. Increment `seasons_completed` in `deposit_season_locks` for participating users
4. Check if any locks are now fully unlocked (≥10 seasons)

### 3.8 `referral_commissions`
```sql
CREATE TABLE referral_commissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id   UUID REFERENCES profiles(id),
  referred_id   UUID REFERENCES profiles(id),
  withdrawal_id UUID REFERENCES withdrawals(id),
  amount        NUMERIC(18,2) NOT NULL,
  rate          NUMERIC(5,2) DEFAULT 5.00,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

**Commission trigger:** When withdrawal is approved by admin:
- `commission = withdrawal.amount * 0.05`
- Insert row, add commission to referrer's `wallets.balance`
- Mark as `paid`

### 3.9 `platform_settings`
```sql
CREATE TABLE platform_settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data:
INSERT INTO platform_settings VALUES
  ('maintenance_mode', 'false', NOW()),
  ('maintenance_end_time', '', NOW()),
  ('deposit_address_trc20', 'TXkPqV9sZbUmWHvCaZLfwBgY3qNxR8eKdM', NOW()),
  ('deposit_address_erc20', '0x4aF3bC2e8f1D9Aa72cE63b5B87dF4e1C9Ab3D5E', NOW()),
  ('deposit_address_bep20', '0x7bC9dE3F4a2B1c8Ef5A6D7e923cFb47D1aE8c9B', NOW()),
  ('total_investors', '50421', NOW()),
  ('total_invested', '104200000', NOW()),
  ('total_paid_out', '4200000', NOW()),
  ('last_season_roi', '+28.4%', NOW()),
  ('avg_season_roi', '+23.4%', NOW()),
  ('payout_rate', '99.8%', NOW()),
  ('referral_rate', '5%', NOW()),
  ('min_deposit', '30', NOW()),
  ('min_withdrawal', '30', NOW()),
  ('platform_name', 'ValutX', NOW()),
  ('support_email', 'support@Valutx.io', NOW()),
  ('telegram_handle', 'ValutXsupport', NOW());
```

### 3.10 `transactions` (unified ledger)
```sql
CREATE TABLE transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id),
  type        TEXT NOT NULL CHECK (type IN ('deposit','withdrawal','roi','commission','unlock')),
  amount      NUMERIC(18,2) NOT NULL,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','rejected')),
  reference_id UUID,   -- deposit_id / withdrawal_id / etc.
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Row-Level Security (RLS)

```sql
-- profiles: users see own, admins see all
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "admins_all" ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- wallets: users see own only
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_wallet" ON wallets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "admin_wallets" ON wallets FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- deposits/withdrawals: same pattern
-- seasons: read public, write admin only
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_seasons" ON seasons FOR SELECT USING (true);
CREATE POLICY "admin_write_seasons" ON seasons FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- platform_settings: read public, write admin only
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_settings" ON platform_settings FOR SELECT USING (true);
CREATE POLICY "admin_write_settings" ON platform_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
```

---

## 5. Authentication & Routing

### 5.1 Auth Flow
1. User signs up → Supabase creates `auth.users` row
2. Trigger creates `profiles` row + generates unique `referral_code`
3. Trigger creates `wallets` row with zero balances
4. On login → check `profiles.role`:
   - `user` → redirect to `/dashboard`
   - `admin` → redirect to `/admin/dashboard`
5. Middleware blocks admin routes from non-admin users

### 5.2 Next.js Middleware (`middleware.ts`)
```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  // Maintenance mode check
  const { data: setting } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'maintenance_mode')
    .single();

  const isMaintenance = setting?.value === 'true';
  const isAdminPath   = pathname.startsWith('/admin');
  const isMaintenancePage = pathname === '/maintenance';

  if (isMaintenance && !isAdminPath && !isMaintenancePage) {
    return NextResponse.redirect(new URL('/maintenance', req.url));
  }

  // Auth guard
  if (!session) {
    if (pathname.startsWith('/dashboard') || isAdminPath) {
      return NextResponse.redirect(new URL('/auth', req.url));
    }
    return res;
  }

  // Role guard: block users from /admin/*
  if (isAdminPath) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/((?!api|_next|fonts|favicon).*)'],
};
```

### 5.3 Supabase Trigger (auto-create profile + wallet)
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  ref_code TEXT;
  referrer_id UUID;
BEGIN
  -- Generate unique referral code
  ref_code := 'VX-' || UPPER(SUBSTRING(MD5(NEW.id::TEXT), 1, 6));

  -- Find referrer if code was passed as metadata
  IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    SELECT id INTO referrer_id FROM profiles
    WHERE referral_code = NEW.raw_user_meta_data->>'referral_code';
  END IF;

  INSERT INTO profiles (id, username, full_name, referral_code, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    ref_code,
    referrer_id
  );

  INSERT INTO wallets (user_id) VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

---

## 6. API Routes (Next.js Route Handlers)

### 6.1 Deposit
```
POST /api/deposit/submit
  body: { amount, network, tx_hash, note }
  → validates min $30, inserts into deposits (status=pending)
  → inserts into transactions

GET  /api/deposit/addresses
  → returns deposit addresses + QR code URLs from platform_settings & storage
```

### 6.2 Withdrawal
```
POST /api/withdrawal/submit
  body: { amount, wallet_address, network, note }
  → validates amount >= 30
  → validates user has enough wallets.balance (profit only, NOT deposit_locked)
  → inserts withdrawal (status=pending)
  → deducts amount from wallets.balance optimistically (or hold logic)

GET  /api/withdrawal/history
  → returns user's withdrawals
```

### 6.3 Admin — Deposit Management
```
GET    /api/admin/deposits       → list all deposits
PATCH  /api/admin/deposits/:id/confirm
  → set status=confirmed
  → add amount to wallets.deposit_locked
  → insert deposit_season_locks row
  → insert transaction

PATCH  /api/admin/deposits/:id/reject
  body: { reason }
  → set status=rejected
```

### 6.4 Admin — Withdrawal Management
```
GET    /api/admin/withdrawals
PATCH  /api/admin/withdrawals/:id/approve
  body: { tx_id }
  → set status=approved
  → confirm balance deducted
  → calculate 5% referral commission → add to referrer balance
  → insert referral_commission row

PATCH  /api/admin/withdrawals/:id/reject
  body: { reason }
```

### 6.5 Admin — Season Management
```
GET    /api/admin/seasons
POST   /api/admin/seasons         → create new season
PATCH  /api/admin/seasons/:id     → update season
PATCH  /api/admin/seasons/:id/close
  body: { final_roi }
  → set status=closed, final_roi
  → for each season_investment:
      roi_earned = amount * final_roi / 100
      add roi_earned to wallets.balance
      add roi_earned to wallets.total_pnl
  → increment seasons_completed in deposit_season_locks
  → unlock deposits where seasons_completed >= 10
      (move deposit_locked → balance)
```

### 6.6 Admin — Settings
```
GET    /api/admin/settings        → get all platform_settings
PATCH  /api/admin/settings        → update any setting key/value

PATCH  /api/admin/settings/maintenance
  body: { enabled: boolean, end_time?: ISO string }
  → updates maintenance_mode and maintenance_end_time
  → when enabled=true, all non-admin traffic goes to /maintenance
  → countdown on /maintenance reads maintenance_end_time from settings
```

### 6.7 Public
```
GET  /api/seasons/public          → returns last 4 seasons (2 closed, 1 running, 1 open)
GET  /api/stats/public            → returns homepage stats from platform_settings
```

---

## 7. Maintenance Mode — Functional Specification

### Admin Settings Page (`/admin/setting`)
The maintenance toggle in the Web Settings page is the **only** functional feature currently enabled.

**Enable flow:**
1. Admin sets duration (days/hours/minutes/seconds)
2. Frontend computes `end_time = now + duration`
3. `PATCH /api/admin/settings/maintenance` → sets `maintenance_mode=true`, `maintenance_end_time=<ISO>`
4. Middleware reads this on every request
5. All non-admin users redirected to `/maintenance`
6. `/maintenance` page reads `maintenance_end_time` and shows live countdown

**Auto-disable:**
- Supabase Edge Function (cron every minute) checks if `maintenance_end_time` is past → sets `maintenance_mode=false`
- Or: middleware checks and auto-disables inline

**Preview button:** opens `/maintenance` in new tab (admin bypasses via header cookie `x-admin-bypass=true`)

---

## 8. Deposit Addresses & QR Codes

### Static QR Codes
Pre-generate QR codes for each network address and store in Supabase Storage:

```
supabase storage bucket: qr-codes (public)
  qr-trc20.png  → for TRC-20 address
  qr-erc20.png  → for ERC-20 address
  qr-bep20.png  → for BEP-20 address
```

### Deposit Page Integration
On `/deposit`, step 3 (Payment) fetches from `/api/deposit/addresses`:
```json
{
  "TRC-20": {
    "address": "TWp8HQiAEygKcb6wiDSD4QJmCD7o7pdrK6",
    "qr_url": "https://<project>.supabase.co/storage/v1/object/public/qr-codes/qr-trc20.png"
  },
  "ERC-20": {
    "address": "0xa73e4002d2bd14f11b6637934ca5ae9af7c7c0e7",
    "qr_url": "https://<project>.supabase.co/storage/v1/object/public/qr-codes/qr-erc20.png"
  },
  "BEP-20": {
    "address": "0xa73e4002d2bd14f11b6637934ca5ae9af7c7c0e7",
    "qr_url": "https://<project>.supabase.co/storage/v1/object/public/qr-codes/qr-bep20.png"
  }
}
```

Replace the fake canvas QR in `deposit/page.tsx` with `<Image src={qr_url} />` from Supabase Storage.

---

## 9. Deposit Lock — 10 Season Rule

### Rule Summary
- When a user's deposit is **confirmed**, that deposit amount is **locked** in `wallets.deposit_locked`
- The user **cannot withdraw** the locked principal
- After the user **participates in 10 seasons** (has an active investment in 10 seasons that closed), the deposit unlocks
- Unlocked deposit moves from `wallets.deposit_locked` → `wallets.balance` and becomes withdrawable

### Participation Check
A season "counts" toward unlocking when:
- User has a `season_investments` row for that season
- That season's status becomes `closed`

### Partial Unlock Logic
Each deposit tracked separately. Example:
- User deposits $50 → locked, needs 10 seasons
- After 5 seasons → still locked
- After 10 seasons → $50 moved to balance

### Multiple deposits
Each deposit has its own `deposit_season_locks` row and its own 10-season counter. They unlock independently.

### Minimum deposit
`$30 USDT` (enforced client-side and server-side).

---

## 10. Withdrawal Rules Summary

| Rule | Value |
|---|---|
| Minimum withdrawal | $30 USDT |
| Source | Only `wallets.balance` (profit + unlocked deposits) |
| Locked deposit | NOT withdrawable until 10 seasons completed |
| Fee | ~0.5 USDT (network gas, deducted from received amount) |
| Referral commission | 5% of withdrawal amount paid to referrer |
| Processing time | 1–3 business days (manual admin approval) |
| Network | BEP-20 (BNB Smart Chain) only for withdrawals |

---

## 11. Season Homepage Display Logic

```typescript
// /api/seasons/public
async function getHomepageSeasons() {
  const closed  = await supabase.from('seasons')
    .select('*').eq('status','closed')
    .order('season_number','desc').limit(2);

  const running = await supabase.from('seasons')
    .select('*').eq('status','running')
    .order('season_number','desc').limit(1);

  const open    = await supabase.from('seasons')
    .select('*').eq('status','open')
    .order('season_number','desc').limit(1);

  return [...closed.data, ...running.data, ...open.data];
  // Display order: closed[0], closed[1], running[0], open[0]
}
```

The homepage `Seasons` component calls this API and renders dynamically. When admin creates a new season, the status auto-updates and the homepage reflects it within 60s (ISR revalidation).

---

## 12. Admin Dashboard Features (Backend Required)

### Season Management
- Create season → POST /api/admin/seasons
- Edit dates/ROI/pool → PATCH /api/admin/seasons/:id
- Pause/resume → PATCH (status toggle)
- Close season (set final ROI) → triggers ROI distribution + lock increment
- Auto-close via Supabase cron job at run_end date

### User Management
- View all users (paginated, searchable)
- Suspend/reactivate accounts
- Edit user profile fields
- View user wallet, investment history, referral tree

### Deposit Management
- View all pending/confirmed/rejected deposits
- Confirm deposit (with TX verification note)
- Reject with reason
- Bulk confirm

### Withdrawal Management
- View all pending withdrawals
- Approve (enter blockchain TX ID)
- Reject with reason
- Auto-trigger referral commission on approval

### Settings Page
- **Maintenance mode toggle** (functional — see section 7)
- Homepage stats editor (investors, ROI, paid out, etc.)
- Deposit addresses editor
- Platform info (name, email, telegram)
- All other toggles in the settings page are **currently disabled/cosmetic** — backend not implemented in v1

---

## 13. Realtime Notifications

Using Supabase Realtime:

```typescript
// User watches their deposit status
supabase
  .channel('deposit-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'deposits',
    filter: `user_id=eq.${userId}`,
  }, (payload) => {
    // Show toast: "Your deposit has been confirmed!" / "Rejected: [reason]"
  })
  .subscribe();
```

Same pattern for withdrawals. Toast notification displayed in dashboard.

---

## 14. Environment Variables (`.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>

# Deposit addresses (also stored in platform_settings)
NEXT_PUBLIC_DEPOSIT_TRC20=TWp8HQiAEygKcb6wiDSD4QJmCD7o7pdrK6
NEXT_PUBLIC_DEPOSIT_ERC20=0xa73e4002d2bd14f11b6637934ca5ae9af7c7c0e7
NEXT_PUBLIC_DEPOSIT_BEP20=0xa73e4002d2bd14f11b6637934ca5ae9af7c7c0e7

# QR code base URL
NEXT_PUBLIC_SUPABASE_STORAGE_URL=https://<project>.supabase.co/storage/v1/object/public
```

---

## 15. Vercel Deployment

### `vercel.json`
```json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "outputDirectory": ".next",
  "regions": ["sin1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase_url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase_anon_key"
  }
}
```

### ISR (Incremental Static Regeneration) for homepage
```typescript
// In app/page.tsx — revalidate every 60s so season changes reflect
export const revalidate = 60;
```

---

## 16. Supabase Edge Functions

### `process-season-close` (triggered by admin or cron)
```typescript
// Runs when admin closes a season
// 1. Calculate ROI for all investors
// 2. Credit to wallets.balance
// 3. Increment deposit_season_locks.seasons_completed
// 4. Unlock deposits where seasons_completed >= 10
// 5. Send notification emails via Resend
```

### `auto-close-maintenance` (cron: every 1 minute)
```typescript
// Check if maintenance_end_time is past
// If yes, set maintenance_mode = false
```

### `send-notification-email` (triggered by DB webhook)
```typescript
// On deposit confirmed/rejected → email user
// On withdrawal approved/rejected → email user
// Uses Resend API
```

---

## 17. Feature Flags (Web Settings)

All features in the admin Settings page except **Maintenance Mode** are `OFF` in v1:

| Feature | v1 Status |
|---|---|
| Maintenance Mode | ✅ Functional |
| Homepage stats editor | ✅ Functional (reads/writes platform_settings) |
| Platform info editor | ✅ Functional |
| Live Chat | ❌ Cosmetic only |
| Email Notifications toggle | ❌ Cosmetic only |
| KYC Verification toggle | ❌ Cosmetic only |
| 2FA toggle | ❌ Cosmetic only |
| Export reports | ❌ Cosmetic only |

---

## 18. Security Checklist

- [ ] RLS enabled on all tables
- [ ] Admin role verified server-side in every API route (not just middleware)
- [ ] Service role key only used in server-side route handlers (never exposed to client)
- [ ] Input validation on all amounts (min/max, numeric)
- [ ] TX hash deduplication (unique constraint on deposits.tx_hash)
- [ ] Rate limiting on `/api/deposit/submit` and `/api/withdrawal/submit` (Vercel Edge)
- [ ] CSRF protection (Next.js default + Supabase JWT)
- [ ] Admin routes return 403 if role !== admin (server check)

---

## 19. File Structure Changes Required

```
src/
  app/
    maintenance/
      page.tsx          ← NEW (converted from Maintenance.html)
      layout.tsx        ← NEW
    api/
      deposit/
        submit/route.ts
        addresses/route.ts
      withdrawal/
        submit/route.ts
        history/route.ts
      admin/
        deposits/
          route.ts
          [id]/confirm/route.ts
          [id]/reject/route.ts
        withdrawals/
          route.ts
          [id]/approve/route.ts
          [id]/reject/route.ts
        seasons/
          route.ts
          [id]/route.ts
          [id]/close/route.ts
        settings/
          route.ts
          maintenance/route.ts
        users/
          route.ts
          [id]/route.ts
      seasons/
        public/route.ts
      stats/
        public/route.ts
  lib/
    supabase/
      client.ts         ← browser client
      server.ts         ← server-side client (service role)
      middleware.ts     ← middleware client
  middleware.ts         ← route guard + maintenance check
```

---

## 20. Implementation Order (Recommended)

**Phase 1 — Foundation**
1. Supabase project setup, all tables, RLS
2. Auth (signup/login with role redirect)
3. Middleware (auth guard + admin guard)
4. Maintenance mode end-to-end

**Phase 2 — Core User Flow**
5. Deposit submission (with real addresses + QR images)
6. Admin deposit confirm/reject
7. Wallet balance update on confirmation
8. Withdrawal submission + admin approval
9. Referral commission on withdrawal

**Phase 3 — Season Engine**
10. Season CRUD (admin)
11. Season invest (user)
12. Season close → ROI distribution
13. 10-season deposit lock/unlock
14. Homepage season display from DB

**Phase 4 — Polish**
15. Realtime notifications
16. Email notifications (Resend)
17. Homepage stats from platform_settings
18. Admin settings page (homepage stats editor)
19. Supabase cron jobs (auto-close, maintenance)

---

*End of PRD — ValutX v1.0*