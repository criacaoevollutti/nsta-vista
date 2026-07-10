CREATE OR REPLACE FUNCTION public.get_admin_data_by_pin(_pin text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin public.profiles%ROWTYPE;
  _profiles jsonb;
BEGIN
  IF _pin IS NULL OR _pin !~ '^[0-9]{4}$' THEN RETURN NULL; END IF;

  SELECT * INTO _admin
  FROM public.profiles
  WHERE access_pin = _pin
    AND is_admin = true;

  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', profile_rows.id,
    'name', profile_rows.name,
    'handle', profile_rows.handle,
    'avatar', profile_rows.avatar,
    'access_pin', profile_rows.access_pin,
    'is_admin', profile_rows.is_admin,
    'position', profile_rows.position,
    'post_count', profile_rows.post_count,
    'approval_counts', jsonb_build_object(
      'pending', profile_rows.pending_count,
      'approved', profile_rows.approved_count,
      'changes_requested', profile_rows.changes_requested_count
    )
  ) ORDER BY profile_rows.position ASC NULLS LAST, profile_rows.updated_at DESC), '[]'::jsonb)
  INTO _profiles
  FROM (
    SELECT
      p.id,
      p.name,
      p.handle,
      p.avatar,
      p.access_pin,
      p.is_admin,
      p.position,
      p.updated_at,
      COUNT(posts.id)::int AS post_count,
      COUNT(posts.id) FILTER (WHERE posts.approval_status = 'pending')::int AS pending_count,
      COUNT(posts.id) FILTER (WHERE posts.approval_status = 'approved')::int AS approved_count,
      COUNT(posts.id) FILTER (WHERE posts.approval_status = 'changes_requested')::int AS changes_requested_count
    FROM public.profiles p
    LEFT JOIN public.posts posts ON posts.user_id = p.id
    GROUP BY p.id
  ) AS profile_rows;

  RETURN jsonb_build_object('admin', to_jsonb(_admin) - 'access_pin', 'profiles', _profiles);
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_data_by_pin(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_data_by_pin(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reorder_profiles(text, uuid[]) TO anon, authenticated;