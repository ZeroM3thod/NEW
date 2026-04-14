// ============================================================
// PROFILE PAGE PASSWORD CHANGE FIX
// In src/app/profile/page.tsx
// Find the security section with the "Change" button and
// replace the onClick with this actual implementation:
// ============================================================

// STEP 1: Add a state for password reset status near your other useState calls:
// const [pwResetSent, setPwResetSent] = useState(false);

// STEP 2: Add this handler function inside the component (after showToast is defined):
const handlePasswordChange = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    showToast('Could not find your email address.', 'err');
    return;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${window.location.origin}/auth/forget/password`,
  });

  if (error) {
    showToast('✕ ' + error.message, 'err');
  } else {
    showToast('✓ Password reset link sent to ' + user.email, 'ok');
    setPwResetSent(true);
    setTimeout(() => setPwResetSent(false), 30000); // Reset after 30s
  }
};

// STEP 3: Replace the "Change" button in the security section:
// FIND this in your profile page (around the password security row):
/*
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
*/

// REPLACE WITH:
/*
  <button
    className='pf-btn-ghost'
    style={{ fontSize: '.7rem', padding: '7px 14px' }}
    onClick={handlePasswordChange}
    disabled={pwResetSent}
  >
    {pwResetSent ? 'Link Sent ✓' : 'Change'}
  </button>
*/

export {};
