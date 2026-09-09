REVOKE ALL ON FUNCTION public.sync_company_to_partner() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_partner_to_company() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_production_phase_calendar() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.current_user_is_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_is_staff() TO authenticated;