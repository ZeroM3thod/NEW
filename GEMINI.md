PS C:\Users\KHAN GADGET\Desktop\NEW> npm run build

> vaultx-nextjs@0.1.0 build
> next build

  ▲ Next.js 14.2.35
  - Environments: .env.local

   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types  .Failed to compile.

./src/app/admin/season/page.tsx:332:34
Type error: Cannot find name 'setFEntryClose'.

  330 |   /* ── Season modal open ── */
  331 |   const openSeasonModal = (editId?: string) => {
> 332 |     setFName(''); setFEntry(''); setFEntryClose(''); setFFinish(''); setFRoi(''); setFPool(''); setFMin(''); setFMax('');
      |                                  ^
  333 |     setSmEditId(editId || '');
  334 |     if (editId) {
  335 |       const s = [...active].find(x => x.id === editId) || (prev.find(x => x.id === editId) as any);
Next.js build worker exited with code: 1 and signal: null
PS C:\Users\KHAN GADGET\Desktop\NEW> 