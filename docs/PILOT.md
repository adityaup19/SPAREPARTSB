# Internal Pilot Runbook

## Access and roles

The website is the only place users and roles are managed. Supabase Auth proves
identity; the `AppUser` table decides who may enter and what they may do, and it
is read on every request, so changes apply instantly without a redeploy.

- Workers can view/search, scan/receive, and move parts.
- Managers can additionally edit inventory, import/export, manage projects, and
  manage reservations.
- Admins can additionally delete records and administer users.

Admins invite people from **User Admin**, where they can also change a role,
disable or reactivate an account, and remove a user. Invitation links return
through `/auth/callback` so the person sets their own password.

A signed-in identity with no `AppUser` row has no access at all, so creating a
user directly in Supabase Authentication grants nothing. Public sign-up should
still be disabled in Supabase as a second line of defence.

### First administrator only

`ADMIN_EMAILS` is a one-time bootstrap. On sign-in, a listed email is promoted to
Admin only when the database contains zero active admins. After that first admin
exists the variable has no effect and can be deleted from Vercel; it can never
re-promote anyone, including a user who was demoted or removed.

To recover from losing every admin, set `ADMIN_EMAILS` again and sign in.

## Required production configuration

Set `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`,
and `OCR_DAILY_USER_LIMIT` in Vercel, plus `ADMIN_EMAILS` for the first sign-in
only. Never set `ALLOW_DEMO_SEED` in production.

In Supabase Auth URL Configuration, set the site URL to the Vercel production
URL and allow `https://<production-host>/auth/callback`.

## Database exposure

Application tables are reachable only through the app. Row level security is on
for every table in `public` with no policies, and the `anon` and `authenticated`
API roles hold no grants, so the Supabase Data API cannot read or write
inventory even though the anon key is public. Prisma connects as the table
owner and is exempt from RLS. Confirm after any schema change:

```sql
select relname, relrowsecurity from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r';

select grantee, table_name from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated');
```

The first query must report `true` for all tables and the second must return no
rows. Never add RLS policies for `anon` on these tables.

## Release

1. Confirm Supabase automated backups are enabled and take a manual backup
   before schema changes.
2. Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, and
   `npm run build`.
3. Run `npm run db:migrate:deploy` against production.
4. Deploy the same Git commit to Vercel.
5. Sign in as Admin and check `/api/health`, dashboard totals, inventory search,
   photo scan, receiving, reservation creation, and Audit History.

## Recovery

- Application rollback: redeploy the prior known-good Vercel commit.
- Data recovery: restore the Supabase backup to a new project first, validate
  counts and reservations, then switch Vercel database variables.
- Never run the demo seed against a shared pilot database.
- If a key is exposed, rotate it in Supabase/OpenAI and Vercel immediately.

## Monitoring

- `/api/health` is Admin-only and checks database connectivity.
- Vercel logs are structured JSON for application events.
- Configure Vercel alerts and OpenAI budget alerts before inviting users.
- Review Audit History for unexpected quantity changes, exports, or user-role
  changes.
