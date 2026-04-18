Looking at the `openPoolModal` function in `season/page.tsx`, the issue is clear: it's querying `created_at` from the `investments` table, but that table uses `joined_at` as the date column. When Supabase tries to `ORDER BY created_at` on a non-existent column, it returns an error — triggering the early return that sets empty investors.The file is provided in context only. Here's the exact fix — replace the `openPoolModal` function in `src/app/admin/season/page.tsx`:

**Root cause:** The `investments` table uses `joined_at` as its date column, but the pool modal was querying `.select('... created_at ...')` and `.order('created_at', ...)`. Since `created_at` doesn't exist on that table, Supabase returned an error, triggering the early-return that set investors to `[]`.

Replace the `/* ── Pool Modal Fetch ── */` block with:

```typescript
/* ── Pool Modal Fetch ── */
const openPoolModal = useCallback(async (season: ActiveSeason | PrevSeason) => {
  setPoolSeason(season);
  setPoolModalOpen(true);
  setPoolLoading(true);
  setPoolSearch('');
  setPoolInvestors([]);

  // Step 1: fetch investments — investments table uses `joined_at`, not `created_at`
  const { data: investments, error: invErr } = await supabase
    .from('investments')
    .select('id, amount, status, joined_at, user_id')
    .eq('season_id', season.id)
    .order('joined_at', { ascending: false });

  if (invErr) {
    console.error('Pool investors fetch error:', invErr);
    setPoolLoading(false);
    return;
  }

  if (!investments || investments.length === 0) {
    setPoolLoading(false);
    return;
  }

  // Step 2: fetch profiles for all investors in one query
  const uniqueUserIds = [...new Set(investments.map((inv: any) => inv.user_id))];
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, username, email')
    .in('id', uniqueUserIds);

  if (profErr) console.error('Pool profiles fetch error:', profErr);

  const profileMap = new Map<string, any>(
    (profiles || []).map((p: any) => [p.id, p])
  );

  setPoolInvestors(
    investments.map((inv: any) => {
      const p = profileMap.get(inv.user_id);
      return {
        id:       inv.id,
        userId:   inv.user_id,
        amount:   Number(inv.amount),
        status:   inv.status,
        joinedAt: inv.joined_at,          // ← was inv.created_at (wrong column)
        name:     p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Unknown',
        username: p?.username || '—',
        email:    p?.email    || '—',
        init:     `${p?.first_name?.[0] || '?'}${p?.last_name?.[0] || '?'}`,
      };
    })
  );

  setPoolLoading(false);
}, [supabase]);
```

**Two changes made:**
1. `.select('id, amount, status, joined_at, user_id')` — `joined_at` instead of `created_at`
2. `.order('joined_at', { ascending: false })` — same fix
3. `joinedAt: inv.joined_at` — mapping the correct field