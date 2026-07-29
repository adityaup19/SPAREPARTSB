# Internal Pilot Runbook

## Access and roles

- Supabase Auth must have public sign-up disabled.
- `ADMIN_EMAILS` bootstraps the first administrator on first sign-in.
- Admins invite users from **User Admin**. Invitation links return through
  `/auth/callback` so the user can set a password.
- Workers can view/search, scan/receive, and move parts.
- Managers can additionally edit inventory, import/export, manage projects, and
  manage reservations.
- Admins can additionally delete records and administer users.

## Required production configuration

Set `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS`,
`OPENAI_API_KEY`, and `OCR_DAILY_USER_LIMIT` in Vercel. Never set
`ALLOW_DEMO_SEED` in production.

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
