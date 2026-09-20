REVOKE EXECUTE ON FUNCTION public.sync_subvencion_hito() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.snapshot_subvencion_presentada() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_subvencion_children() FROM PUBLIC, anon, authenticated;