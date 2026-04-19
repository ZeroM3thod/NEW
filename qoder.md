Looking at the code, the issues are:
1. `backdrop-filter: blur(20px)` on `.adm-top-header` creates a full-page blur effect on mobile
2. The overlay z-index (250) vs sidebar (500) is fine, but the header's backdrop-filter creates a stacking context that bleeds
3. Need to ensure clean mobile renderingThe files aren't on the filesystem. I can see the issues clearly in the code — here are the exact changes needed:

**Problem 1:** `backdrop-filter: blur(20px)` on the header applies on mobile, blurring everything behind it.

**Problem 2:** There are **two overlays** — one in `AdminSidebar.tsx` and another in `dashboard/page.tsx`. The duplicate overlay blocks button clicks.

**Fix `src/app/admin/admin.css`** — change the header block:

```css
/* BEFORE */
.adm-top-header {
  position:sticky; top:0; z-index:300;
  background:rgba(246,241,233,0.96);
  backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px);
  border-bottom:1px solid var(--border);
  padding:0 24px; height:62px;
  display:flex; align-items:center; gap:14px;
  flex-shrink:0; width:100%; overflow:hidden;
}
@media(max-width:1023px) {
  .adm-top-header {
    background:#f6f1e9;
    backdrop-filter:none;
    -webkit-backdrop-filter:none;
  }
}

/* AFTER */
.adm-top-header {
  position:sticky; top:0; z-index:300;
  background:#f6f1e9;
  border-bottom:1px solid var(--border);
  padding:0 24px; height:62px;
  display:flex; align-items:center; gap:14px;
  flex-shrink:0; width:100%; overflow:hidden;
}
@media(min-width:1024px) {
  .adm-top-header {
    background:rgba(246,241,233,0.96);
    backdrop-filter:blur(20px);
    -webkit-backdrop-filter:blur(20px);
  }
}
```

**Fix `src/app/admin/dashboard/page.tsx`** — remove the duplicate overlay (the `AdminSidebar` already renders its own):

```tsx
/* REMOVE these two lines from the page JSX */
{/* Overlay */}
<div className={`adm-sb-overlay${sidebarOpen?' show':''}`} onClick={() => setSidebarOpen(false)} />
```

Do the same for `admin/withdraw/page.tsx`, `admin/deposit/page.tsx`, `admin/season/page.tsx`, `admin/user/page.tsx`, `admin/transaction/page.tsx`, and `admin/setting/page.tsx` — any admin page that renders its own `adm-sb-overlay` div outside the `AdminSidebar` component should have that duplicate overlay removed.

The `AdminSidebar` component already handles its own overlay internally, so the duplicates are unnecessary and cause the click-blocking issue on mobile.