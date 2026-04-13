PS C:\Users\KHAN GADGET\Desktop\NEW>
 *  History restored 

PS C:\Users\KHAN GADGET\Desktop\NEW> npm run dev

> vaultx-nextjs@0.1.0 dev
> next dev

  ▲ Next.js 14.2.35
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Starting...
 ✓ Ready in 6.5s
 ○ Compiling /src/middleware ...
 ✓ Compiled /src/middleware in 1201ms (124 modules)
 ○ Compiling / ...
 ✓ Compiled / in 9.7s (638 modules)
 GET / 200 in 11200ms
 ○ Compiling /api/contact ...
 ✓ Compiled /api/contact in 2.6s (391 modules)
 POST /api/contact 200 in 6452ms
<w> [webpack.cache.PackFileCacheStrategy] Serializing big strings (215kiB) impacts deserialization performance (consider using Buffer instead and decode when needed)
 ⨯ ./node_modules\next\dist\compiled\client-only\error.js
'client-only' cannot be imported from a Server Component module. It should only be used from a Client Component.

Import trace for requested module:
  ./node_modules\next\dist\compiled\client-only\error.js
  ./node_modules\styled-jsx\dist\index\index.js
  ./node_modules\styled-jsx\style.js
  ./src\components\StatsTicker.tsx
  ./src\app\page.tsx
 ○ Compiling /_error ...
 ⨯ ./node_modules\next\dist\compiled\client-only\error.js
'client-only' cannot be imported from a Server Component module. It should only be used from a Client Component.

Import trace for requested module:
  ./node_modules\next\dist\compiled\client-only\error.js
  ./node_modules\styled-jsx\dist\index\index.js
  ./node_modules\styled-jsx\style.js
  ./src\components\StatsTicker.tsx
  ./src\app\page.tsx
 GET / 500 in 7792ms