SSB Arena update: Creator partnership program (links, click tracking, payouts)

1. Drag the folders "app", "components", "supabase" into the ROOT of your GitHub repo
   (confirm replacing app/layout.tsx, app/r/[code]/route.ts, app/api/admin/creators/route.ts,
   components/AdminCreators.tsx).
2. Supabase > SQL Editor: run supabase/migrations/20261122_referrals.sql (if not yet),
   then supabase/migrations/20261123_creator_clicks.sql.
3. ONE small edit in app/admin/page.tsx so you can reach it. Directly under the
   "ADMIN CONTROL PANEL" header block, add:
     <Link href="/admin/creators" className="block p-3 rounded-xl bg-amber-500 text-slate-950 text-xs font-black text-center">Creator Partnerships</Link>
   (Or just open yoursite/admin/creators directly.)
4. Also apply the Razorpay file changes from README-REFERRAL-UPDATE.txt (webhook and
   verify-subscription) if you have not, otherwise subscription commissions are not recorded.
Use: /admin/creators > fill name, Instagram handle, code, rate > Create > Copy link > send in DM.
