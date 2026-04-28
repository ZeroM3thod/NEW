  ▲ Next.js 14.2.35
  - Environments: .env.local

   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types  ..Failed to compile.

./src/app/profile/security/2fa/page.tsx:566:22
Type error: Cannot find name 'disableBackupCode'. Did you mean 'setDisableBackupCode'?

  564 |               type="text"
  565 |               placeholder="XXXX-XXXX"
> 566 |               value={disableBackupCode}
      |                      ^
  567 |               onChange={e => setDisableBackupCode(e.target.value)}
  568 |               autoFocus
  569 |               style={{ letterSpacing: '.14em', textAlign: 'center', fontSize: '.95rem', fontFamily: "'Cormorant Garamond',serif" }}
Next.js build worker exited with code: 1 and signal: null
PS C:\Users\KHAN GADGET\Desktop\NEW> 