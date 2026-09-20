ALTER FUNCTION public.next_billing_order_number() SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.next_billing_order_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_billing_order_number() TO authenticated, service_role;