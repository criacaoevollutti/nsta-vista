REVOKE EXECUTE ON FUNCTION public.admin_reorder_profiles(text, uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_reorder_profiles(text, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_reorder_profiles(text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reorder_profiles(text, uuid[]) TO service_role;