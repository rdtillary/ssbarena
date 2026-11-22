SSB Arena update: Share button + creator referral links (with commission tracking)

1. Drag the folders "app", "components", "lib", "supabase" into the ROOT of your GitHub repo
   (Add file > Upload files). Confirm replacing:
     app/api/razorpay/webhook/route.ts
     app/api/razorpay/verify-subscription/route.ts
2. Supabase > SQL Editor > run supabase/migrations/20261122_referrals.sql once.
3. Make these 7 small edits (GitHub pencil icon on each file):

 app/admin/page.tsx
   a) add import:   import { AdminCreators } from '@/components/AdminCreators';
   b) change   useState<'manage' | 'users'>('manage')
      to       useState<'manage' | 'users' | 'creators'>('manage')
   c) in the tab list add a line after  ['users', 'Users'],
                    ['creators', 'Creators'],
   d) under   {view === 'users' && <AdminUsers />}   add
                    {view === 'creators' && <AdminCreators />}
   e) change   className={view === 'users' ? 'hidden' : 'space-y-6'}
      to       className={view !== 'manage' ? 'hidden' : 'space-y-6'}

 app/page.tsx
   f) add import:   import { ShareButton } from '@/components/ShareButton';
      and directly under the "Contact Recommended Candidates" block (the
      {activeTab === 'home' && ( <button ...> )} one) add:
                    {activeTab === 'home' && <ShareButton />}
   g) in loadData, right after   setUser(currentUser);   add
                    if (currentUser) fetch('/api/referral/claim', { method: 'POST' }).catch(() => {});

4. Render redeploys. Open /admin > Creators > add a creator, copy their link (yoursite/r/code).

How it works
 - Creator link /r/<code> remembers the creator for 30 days (cookie).
 - When that visitor signs up (email or Google) the account is linked to the creator.
   Only accounts created in the last 3 days can be linked; a creator cannot refer their own email.
 - Every successful Razorpay payment of a referred user (first and every monthly renewal)
   adds commission = payment x creator %. The % is saved on each payment, so editing it
   later only affects future payments.
 - /admin > Creators shows signups, paying users, earned and unpaid. After you send the money
   (UPI etc.) press "Mark as paid".
 - Pausing a creator stops new signups through the link; existing referred users still earn.
 - Manual UPI approvals are not counted yet (their route was not in the files I had).
