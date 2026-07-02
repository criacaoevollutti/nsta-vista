
CREATE OR REPLACE FUNCTION public.admin_update_profile(_admin_pin text, _target_id uuid, _patch jsonb)
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

  UPDATE public.profiles SET
    name       = COALESCE(_patch->>'name', name),
    handle     = COALESCE(_patch->>'handle', handle),
    category   = COALESCE(_patch->>'category', category),
    bio        = COALESCE(_patch->>'bio', bio),
    location   = COALESCE(_patch->>'location', location),
    site       = COALESCE(_patch->>'site', site),
    avatar     = COALESCE(_patch->>'avatar', avatar),
    followers  = COALESCE(_patch->>'followers', followers),
    following  = COALESCE((_patch->>'following')::int, following),
    updated_at = now()
  WHERE id = _target_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_profile(text, uuid, jsonb) TO anon, authenticated;
