PS C:\Users\KHAN GADGET\Desktop\NEW> npm run build

> vaultx-nextjs@0.1.0 build
> next build

  ▲ Next.js 14.2.35
  - Environments: .env.local

   Creating an optimized production build ...
Failed to compile.

./src/app/admin/dashboard/page.tsx
Error: 
  x the name `VaultXLoader` is defined multiple times
   ,-[C:\Users\KHAN GADGET\Desktop\NEW\src\app\admin\dashboard\page.tsx:2:1]
 2 | import { useEffect, useRef, useState, useCallback } from 'react';
 3 | import { useRouter } from 'next/navigation';
 4 | import AdminSidebar from '../AdminSidebar';
 5 | import VaultXLoader from '@/components/VaultXLoader';
   :        ^^^^^^|^^^^^
   :              `-- previous definition of `VaultXLoader` here
 6 | import { createClient } from '@/utils/supabase/client';
 7 | import VaultXLoader from '@/components/VaultXLoader';
   :        ^^^^^^|^^^^^
   :              `-- `VaultXLoader` redefined here
 8 |
 9 | /* ── Types ── */
 9 | interface WdEntry {
   `----

Import trace for requested module:
./src/app/admin/dashboard/page.tsx

./src/app/admin/deposit/page.tsx
Error:
  x the name `VaultXLoader` is defined multiple times
   ,-[C:\Users\KHAN GADGET\Desktop\NEW\src\app\admin\deposit\page.tsx:1:1]
 1 | 'use client';
 2 | import { useEffect, useRef, useState, useCallback } from 'react';
 3 | import AdminSidebar from '../AdminSidebar';
 4 | import VaultXLoader from '@/components/VaultXLoader';
   :        ^^^^^^|^^^^^
   :              `-- previous definition of `VaultXLoader` here
 5 | import { createClient } from '@/utils/supabase/client';
 6 | import VaultXLoader from '@/components/VaultXLoader';
   :        ^^^^^^|^^^^^
   :              `-- `VaultXLoader` redefined here
 7 |
 8 | /* ══════════════════════════════
 8 |    TYPES
   `----

Import trace for requested module:
./src/app/admin/deposit/page.tsx

./src/app/admin/season/page.tsx
Error:
  x the name `VaultXLoader` is defined multiple times
   ,-[C:\Users\KHAN GADGET\Desktop\NEW\src\app\admin\season\page.tsx:1:1]
 1 | 'use client';
 2 | import { useEffect, useRef, useState, useCallback } from 'react';
 3 | import AdminSidebar from '../AdminSidebar';
 4 | import VaultXLoader from '@/components/VaultXLoader';
   :        ^^^^^^|^^^^^
   :              `-- previous definition of `VaultXLoader` here
 5 | import { createClient } from '@/utils/supabase/client';
 6 | import VaultXLoader from '@/components/VaultXLoader';
   :        ^^^^^^|^^^^^
   :              `-- `VaultXLoader` redefined here
 7 |
 8 | /* ══════════════════════════════
 8 |    TYPES
   `----

Import trace for requested module:
./src/app/admin/season/page.tsx

./src/app/admin/transaction/page.tsx
Error:
  x the name `VaultXLoader` is defined multiple times
   ,-[C:\Users\KHAN GADGET\Desktop\NEW\src\app\admin\transaction\page.tsx:1:1]
 1 | 'use client';
 2 | import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
 3 | import AdminSidebar from '../AdminSidebar';
 4 | import VaultXLoader from '@/components/VaultXLoader';
   :        ^^^^^^|^^^^^
   :              `-- previous definition of `VaultXLoader` here
 5 | import { createClient } from '@/utils/supabase/client';
 6 | import VaultXLoader from '@/components/VaultXLoader';
   :        ^^^^^^|^^^^^
   :              `-- `VaultXLoader` redefined here
 7 |
 8 | /* ══ TYPES ══ */
 8 | type TxStatus = 'Pending' | 'Approved' | 'Completed' | 'Rejected';
   `----

Import trace for requested module:
./src/app/admin/transaction/page.tsx

./src/app/admin/user/page.tsx
Error:
  x the name `VaultXLoader` is defined multiple times
   ,-[C:\Users\KHAN GADGET\Desktop\NEW\src\app\admin\user\page.tsx:2:1]
 2 | import { useEffect, useRef, useState, useCallback } from 'react';
 3 | import { useRouter } from 'next/navigation';
 4 | import AdminSidebar from '../AdminSidebar';
 5 | import VaultXLoader from '@/components/VaultXLoader';
   :        ^^^^^^|^^^^^
   :              `-- previous definition of `VaultXLoader` here
 6 | import { createClient } from '@/utils/supabase/client';
 7 | import VaultXLoader from '@/components/VaultXLoader';
   :        ^^^^^^|^^^^^
   :              `-- `VaultXLoader` redefined here
 8 |
 9 | /* ══════════════════════════════
 9 |    HELPERS
   `----

Import trace for requested module:
./src/app/admin/user/page.tsx


> Build failed because of webpack errors
PS C:\Users\KHAN GADGET\Desktop\NEW> 