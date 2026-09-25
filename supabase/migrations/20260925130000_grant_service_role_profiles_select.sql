-- AgriN: deliver reads profiles.phone via service_role.
-- service_role bypasses RLS but still requires explicit table-level SELECT.
GRANT SELECT ON public.profiles TO service_role;
