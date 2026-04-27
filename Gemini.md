Bug 1 — Focus jumps to OTP when typing password: All step components (DisableConfirmStep, etc.) are defined as const functions inside the parent component body. Every time parent state updates (typing password triggers setDisablePassword), React sees a new function reference and completely unmounts + remounts the step component, firing autoFocus again on the OTP input.
Bug 2 — Can't disable 2FA: Same root cause — component remounting corrupts the form flow and breaks ref assignments mid-interaction.
Bug 3 — Disable route uses createBrowserClient server-side: Minor but unsafe pattern.





errors-  ▲ Next.js 14.2.35
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Starting...
 ✓ Ready in 3.3s
 ○ Compiling /src/middleware ...
 ✓ Compiled /src/middleware in 1047ms (124 modules)
 ○ Compiling /profile/security/2fa ...
 ✓ Compiled /profile in 18.5s (592 modules)
 GET /profile/security/2fa 200 in 19463ms
 ○ Compiling /api/auth/2fa/status ...
 ✓ Compiled /api/auth/2fa/status in 1011ms (680 modules)
 GET /api/auth/2fa/status 200 in 2005ms
 GET /api/auth/2fa/status 200 in 493ms
 ○ Compiling /api/auth/2fa/disable ...
 ✓ Compiled /api/auth/2fa/disable in 774ms (690 modules)
2FA disable error: Error: @supabase/ssr: createBrowserClient in non-browser runtimes (including Next.js pre-rendering mode) was not initialized cookie options that specify getAll and setAll functions (deprecated: alternatively use get, set and remove), but they were needed
    at setAll (webpack-internal:///(rsc)/./node_modules/@supabase/ssr/dist/module/cookies.js:120:19)
    at Object.setItem (webpack-internal:///(rsc)/./node_modules/@supabase/ssr/dist/module/cookies.js:193:31)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async setItemAsync (webpack-internal:///(rsc)/./node_modules/@supabase/auth-js/dist/module/lib/helpers.js:132:5)
    at async SupabaseAuthClient._saveSession (webpack-internal:///(rsc)/./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:3990:13)
    at async SupabaseAuthClient.signInWithPassword (webpack-internal:///(rsc)/./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:842:17)
    at async POST (webpack-internal:///(rsc)/./src/app/api/auth/2fa/disable/route.ts:42:40)
    at async C:\Users\KHAN GADGET\Desktop\NEW\node_modules\next\dist\compiled\next-server\app-route.runtime.dev.js:6:57228
    at async eT.execute (C:\Users\KHAN GADGET\Desktop\NEW\node_modules\next\dist\compiled\next-server\app-route.runtime.dev.js:6:46851)
    at async eT.handle (C:\Users\KHAN GADGET\Desktop\NEW\node_modules\next\dist\compiled\next-server\app-route.runtime.dev.js:6:58760)
    at async doRender (C:\Users\KHAN GADGET\Desktop\NEW\node_modules\next\dist\server\base-server.js:1366:42)
    at async cacheEntry.responseCache.get.routeKind (C:\Users\KHAN GADGET\Desktop\NEW\node_modules\next\dist\server\base-server.js:1588:28)
    at async DevServer.renderToResponseWithComponentsImpl (C:\Users\KHAN GADGET\Desktop\NEW\node_modules\next\dist\server\base-server.js:1496:28)
    at async DevServer.renderPageComponent (C:\Users\KHAN GADGET\Desktop\NEW\node_modules\next\dist\server\base-server.js:1924:24)
    at async DevServer.renderToResponseImpl (C:\Users\KHAN GADGET\Desktop\NEW\node_modules\next\dist\server\base-server.js:1962:32)
    at async DevServer.pipeImpl (C:\Users\KHAN GADGET\Desktop\NEW\node_modules\next\dist\server\base-server.js:922:25)
    at async NextNodeServer.handleCatchallRenderRequest (C:\Users\KHAN GADGET\Desktop\NEW\node_modules\next\dist\server\next-server.js:272:17)
    at async DevServer.handleRequestImpl (C:\Users\KHAN GADGET\Desktop\NEW\node_modules\next\dist\server\base-server.js:818:17)
    at async C:\Users\KHAN GADGET\Desktop\NEW\node_modules\next\dist\server\dev\next-dev-server.js:339:20
    at async Span.traceAsyncFn (C:\Users\KHAN GADGET\Desktop\NEW\node_modules\next\dist\trace\trace.js:154:20)
    at async DevServer.handleRequest (C:\Users\KHAN GADGET\Desktop\NEW\node_modules\next\dist\server\dev\next-dev-server.js:336:24)
    at async invokeRender (C:\Users\KHAN GADGET\Desktop\NEW\node_modules\next\dist\server\lib\router-server.js:179:21)
    at async handleRequest (C:\Users\KHAN GADGET\Desktop\NEW\node_modules\next\dist\server\lib\router-server.js:359:24)
    at async requestHandlerImpl (C:\Users\KHAN GADGET\Desktop\NEW\node_modules\next\dist\server\lib\router-server.js:383:13)
    at async Server.requestListener (C:\Users\KHAN GADGET\Desktop\NEW\node_modules\next\dist\server\lib\start-server.js:141:13)
 POST /api/auth/2fa/disable 500 in 1770ms
