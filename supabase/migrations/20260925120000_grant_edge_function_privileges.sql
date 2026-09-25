-- AgriN: grant Edge Function (service_role) privileges on tables written by Edge Functions.
-- service_role bypasses RLS but still requires explicit table-level GRANTs.
GRANT SELECT, INSERT, UPDATE ON public.diagnoses TO service_role;
GRANT UPDATE ON public.profiles TO service_role;