-- Trigger / maintenance functions must not be callable through the API
REVOKE EXECUTE ON FUNCTION public.actions_set_requester() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.backfill_spanish_films_to_productions() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.composers_seed_chat_channels() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.pair_ic_commission_sprint() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_action_calendar() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_composer_onboarding_calendar() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_contract_calendar() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_opp_action_calendar() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_opportunity_calendar() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_production_calendar() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_production_phase_calendar() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_production_to_spanish_films() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_spanish_film_to_production() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_target_account_calendar() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.ensure_composer_chat_channels(uuid) FROM anon, public;

-- Role checks: authenticated only
REVOKE EXECUTE ON FUNCTION public.current_user_is_big_c() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.current_user_is_big_c() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_composer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_composer_chat_channels(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_production_chat_channel(uuid, uuid) TO authenticated;