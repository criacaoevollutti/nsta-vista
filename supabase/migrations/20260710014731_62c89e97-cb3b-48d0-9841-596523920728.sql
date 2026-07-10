
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.admin_set_profile_approved(_admin_pin text, _target_id uuid, _approved boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _ok boolean;
BEGIN
  IF _admin_pin IS NULL OR _admin_pin !~ '^[0-9]{4}$' THEN RETURN false; END IF;
  SELECT true INTO _ok FROM public.profiles WHERE access_pin = _admin_pin AND is_admin = true;
  IF NOT COALESCE(_ok, false) THEN RETURN false; END IF;
  UPDATE public.profiles SET approved = _approved, updated_at = now() WHERE id = _target_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_data_by_pin(_pin text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    'approved', profile_rows.approved,
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
      p.id, p.name, p.handle, p.avatar, p.access_pin, p.is_admin, p.approved, p.position, p.updated_at,
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
$function$;
