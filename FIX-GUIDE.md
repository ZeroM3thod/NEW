# ValutX Password Reset & Email Confirmation Fix Guide

## Problem Summary
1. Confirmation/reset links use localhost:3000 instead of Vercel URL
2. Forgot password link goes to home page instead of set-password page
3. Profile password change button doesn't work

---

## Fix 1: Supabase Dashboard Configuration (REQUIRED)

Go to: https://supabase.com/dashboard → Your Project → Authentication → URL Configuration

### Site URL
Set to your Vercel URL:
```
https://your-app-name.vercel.app
```

### Redirect URLs (add ALL of these)
```
https://your-app-name.vercel.app/**
https://your-app-name.vercel.app/auth/forget/password
https://your-app-name.vercel.app/auth/signin
https://your-app-name.vercel.app/dashboard
```

> ⚠️ This is the most important step. Without this, Supabase will
> use localhost in emails regardless of your code.

---

## Fix 2: Replace the set-password page

Replace the ENTIRE content of:
`src/app/auth/forget/password/page.tsx`

with the content from `forget-password-page.tsx` in this output.

### What changed:
- Added `supabase.auth.onAuthStateChange` to detect PASSWORD_RECOVERY event
- Changed `handleSubmit` to call `supabase.auth.updateUser({ password: pw })`
- Added invalid/expired link detection
- Added session verification before showing the form

---

## Fix 3: Fix Profile page password change

In `src/app/profile/page.tsx`, make these changes:

### 3a. Add state (near other useState declarations):
```typescript
const [pwResetSent, setPwResetSent] = useState(false);
```

### 3b. Add handler function (after showToast is defined):
```typescript
const handlePasswordChange = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    showToast('Could not find your email address.');
    return;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${window.location.origin}/auth/forget/password`,
  });

  if (error) {
    showToast('✕ ' + error.message);
  } else {
    showToast('✓ Password reset link sent to ' + user.email, 'ok');
    setPwResetSent(true);
    setTimeout(() => setPwResetSent(false), 30000);
  }
};
```

### 3c. Find and replace the "Change" button in the security section:

**FIND:**
```tsx
<button
  className='pf-btn-ghost'
  style={{ fontSize: '.7rem', padding: '7px 14px' }}
  onClick={() =>
    showToast(
      'Password reset link sent to your email.',
      'ok',
    )
  }
>
  Change
</button>
```

**REPLACE WITH:**
```tsx
<button
  className='pf-btn-ghost'
  style={{ fontSize: '.7rem', padding: '7px 14px' }}
  onClick={handlePasswordChange}
  disabled={pwResetSent}
>
  {pwResetSent ? 'Link Sent ✓' : 'Change'}
</button>
```

---

## Fix 4: Verify signin page redirectTo (should already be correct)

In `src/app/auth/signin/page.tsx`, the `handleForgot` function should have:
```typescript
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/auth/forget/password`,
});
```
✅ This uses `window.location.origin` which auto-detects the Vercel URL.

---

## How the full flow works after fixes:

1. User clicks "Forgot Password" on signin page
2. Supabase sends email with link pointing to your Vercel URL (after Dashboard fix)
3. Link looks like: `https://your-app.vercel.app/auth/forget/password#access_token=...&type=recovery`
4. New page.tsx detects the recovery session via `onAuthStateChange`
5. User sets new password → `supabase.auth.updateUser({ password })` is called
6. Password is updated in Supabase Auth database
7. User is redirected to sign in with new password

---

## Testing checklist after applying fixes:

- [ ] Supabase Dashboard: Site URL set to Vercel URL
- [ ] Supabase Dashboard: Redirect URLs include Vercel URL
- [ ] New `page.tsx` deployed to `/auth/forget/password/`
- [ ] Profile password "Change" button sends real email
- [ ] Clicking reset link goes to set-password page (not home)
- [ ] Setting new password actually works for login
