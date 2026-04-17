/* ═══════════════════════════════════════════════════════
   PATCH: Fix .db-topbar to match other user page topbars
   Replace the .db-topbar rule in src/app/dashboard/dashboard.css
═══════════════════════════════════════════════════════ */

/* OLD: */
.db-topbar {
  display: none;
  align-items: center; justify-content: space-between;
  padding: 14px 18px;
  background: rgba(246,241,233,0.92);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border);
  position: sticky; top: 0; z-index: 100;
}

/* NEW (matches deposit/withdraw/season/referral topbars): */
.db-topbar {
  display: none;
  align-items: center; justify-content: space-between;
  padding: 0 18px;
  height: 56px;
  background: #f6f1e9;
  border-bottom: 1px solid var(--border);
  position: sticky; top: 0; z-index: 600;
}