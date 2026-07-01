
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.grant_admin_for_fixed_email() FROM anon, authenticated, public;

CREATE POLICY "Block client inserts on user_roles"
  ON public.user_roles FOR INSERT TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "Block client updates on user_roles"
  ON public.user_roles FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "Block client deletes on user_roles"
  ON public.user_roles FOR DELETE TO anon, authenticated
  USING (false);
