/* ═══════════════════════════════════════════════════════════════════
   VAULTX LOADER — COMPLETE INTEGRATION GUIDE
   ═══════════════════════════════════════════════════════════════════

   STEP 1 ── Save the component
   ────────────────────────────
   Copy VaultXLoader.tsx  →  src/components/VaultXLoader.tsx


   STEP 2 ── Update each page as shown below
   ══════════════════════════════════════════════════════════════════ */


/* ──────────────────────────────────────────────────────────────────
   src/app/page.tsx  (Home page)
   ────────────────────────────────────────────────────────────────── */

// ADD import at top:
import VaultXLoader from '@/components/VaultXLoader';

// WRAP content — return becomes:
export default function HomePage() {
  return (
    <>
      <VaultXLoader pageName="Home" />   {/* ← ADD */}
      <ScrollRevealInit />
      <BgCanvas />
      <Navbar />
      <main>...</main>
      <Footer />
    </>
  );
}


/* ──────────────────────────────────────────────────────────────────
   src/app/dashboard/page.tsx
   ────────────────────────────────────────────────────────────────── */

// ADD import at top:
import VaultXLoader from '@/components/VaultXLoader';

// FIND and DELETE this block entirely:
//   if (loading) {
//     return <div className='db-layout' style={{display:'flex',...}}>
//              Loading Dashboard…
//            </div>
//   }

// In the return statement, add as FIRST child:
return (
  <>
    {loading && <VaultXLoader pageName="Dashboard" />}   {/* ← ADD */}
    <Script ... />
    <canvas ref={bgCanvasRef} ... />
    {/* ...rest unchanged... */}
  </>
);


/* ──────────────────────────────────────────────────────────────────
   src/app/deposit/page.tsx
   ────────────────────────────────────────────────────────────────── */

// ADD import at top:
import VaultXLoader from '@/components/VaultXLoader';

// FIND and DELETE this block:
//   if (loading) return (
//     <div style={{display:'flex',alignItems:'center',...}}>
//       Loading...
//     </div>
//   )

// In return statement, add as FIRST child:
return (
  <>
    {loading && <VaultXLoader pageName="Deposit" />}   {/* ← ADD */}
    <canvas ref={bgRef} ... />
    {/* ...rest unchanged... */}
  </>
);


/* ──────────────────────────────────────────────────────────────────
   src/app/withdraw/page.tsx
   ────────────────────────────────────────────────────────────────── */

// ADD import at top:
import VaultXLoader from '@/components/VaultXLoader';

// FIND and DELETE:
//   if (loading) return (
//     <div style={{...}}>Loading...</div>
//   )

// In return statement, add as FIRST child:
return (
  <>
    {loading && <VaultXLoader pageName="Withdraw" />}   {/* ← ADD */}
    <canvas ref={bgRef} ... />
    {/* ...rest unchanged... */}
  </>
);


/* ──────────────────────────────────────────────────────────────────
   src/app/season/page.tsx
   ────────────────────────────────────────────────────────────────── */

// ADD import at top:
import VaultXLoader from '@/components/VaultXLoader';

// FIND and DELETE this block:
//   if (loading) return (
//     <div style={{...}}>
//       <div style={{textAlign:'center'}}>
//         <div style={{...}}>Loading Seasons…</div>
//         <div style={{...}}>Fetching your data</div>
//       </div>
//     </div>
//   )

// In return statement, add as FIRST child:
return (
  <>
    {loading && <VaultXLoader pageName="Seasons" />}   {/* ← ADD */}
    <canvas ref={bgRef} ... />
    {/* ...rest unchanged... */}
  </>
);


/* ──────────────────────────────────────────────────────────────────
   src/app/profile/page.tsx
   ────────────────────────────────────────────────────────────────── */

// ADD import at top:
import VaultXLoader from '@/components/VaultXLoader';

// ADD loading state (after existing state declarations):
const [loading, setLoading] = useState(true);

// In fetchData useEffect, set loading=false at the end:
//   } finally {
//     setLoading(false);    ← ADD
//   }

// In return statement, add as FIRST child:
return (
  <>
    {loading && <VaultXLoader pageName="Profile" />}   {/* ← ADD */}
    <canvas ref={bgRef} ... />
    {/* ...rest unchanged... */}
  </>
);


/* ──────────────────────────────────────────────────────────────────
   src/app/referral/page.tsx
   ────────────────────────────────────────────────────────────────── */

// ADD import at top:
import VaultXLoader from '@/components/VaultXLoader';

// FIND and DELETE:
//   if (loading) return (
//     <div style={{...}}>Loading...</div>
//   )

// In return statement, add as FIRST child:
return (
  <>
    {loading && <VaultXLoader pageName="Referral" />}   {/* ← ADD */}
    <div className={`rf-toast...`}>{toastMsg}</div>
    {/* ...rest unchanged... */}
  </>
);


/* ──────────────────────────────────────────────────────────────────
   src/app/support/page.tsx  (no existing loader)
   ────────────────────────────────────────────────────────────────── */

// ADD import at top:
import VaultXLoader from '@/components/VaultXLoader';

// ADD loading state after existing state declarations:
const [pageLoading, setPageLoading] = useState(true);

// In the existing fetchProfile useEffect, set it false after fetch:
//   useEffect(() => {
//     async function fetchProfile() {
//       ...
//       setProfile(data);
//       setPageLoading(false);   ← ADD
//     }
//     fetchProfile();
//   }, [supabase]);

// In return statement, add as FIRST child:
return (
  <>
    {pageLoading && <VaultXLoader pageName="Support" />}   {/* ← ADD */}
    <div className={`sp-toast...`}>{toastMsg}</div>
    {/* ...rest unchanged... */}
  </>
);


/* ──────────────────────────────────────────────────────────────────
   src/app/admin/dashboard/page.tsx
   ────────────────────────────────────────────────────────────────── */

// ADD import at top:
import VaultXLoader from '@/components/VaultXLoader';

// In return statement, add as FIRST child:
return (
  <>
    <VaultXLoader pageName="Admin · Dashboard" />   {/* ← ADD (shows once on mount) */}
    <canvas ref={bgCanvasRef} ... />
    {/* ...rest unchanged... */}
  </>
);


/* ──────────────────────────────────────────────────────────────────
   src/app/admin/user/page.tsx
   ────────────────────────────────────────────────────────────────── */

// ADD import, then in return:
//   {loading && <VaultXLoader pageName="Admin · Users" />}


/* ──────────────────────────────────────────────────────────────────
   src/app/admin/season/page.tsx
   ────────────────────────────────────────────────────────────────── */

// ADD import, then in return:
//   {loading && <VaultXLoader pageName="Admin · Seasons" />}


/* ──────────────────────────────────────────────────────────────────
   src/app/admin/deposit/page.tsx
   ────────────────────────────────────────────────────────────────── */

// ADD import, then in return:
//   {loading && <VaultXLoader pageName="Admin · Deposits" />}


/* ──────────────────────────────────────────────────────────────────
   src/app/admin/withdraw/page.tsx
   ────────────────────────────────────────────────────────────────── */

// ADD import, then in return:
//   {loading && <VaultXLoader pageName="Admin · Withdrawals" />}


/* ──────────────────────────────────────────────────────────────────
   src/app/admin/transaction/page.tsx
   ────────────────────────────────────────────────────────────────── */

// ADD import, then in return:
//   {loading && <VaultXLoader pageName="Admin · Transactions" />}