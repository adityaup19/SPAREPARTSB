-- Close the Supabase Data API off from application tables.
--
-- Supabase publishes every table in `public` through PostgREST using the
-- browser-visible anon key. Row level security with no policies denies those
-- roles outright, while the app is unaffected because Prisma connects as the
-- table owner, which is exempt from RLS.

ALTER TABLE public."Part" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Reservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AppUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ScanUsage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- Remove the grants Supabase hands to API roles by default, so the tables are
-- unreachable even if RLS is later switched off by accident.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- Apply the same rule to tables added by future migrations.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
