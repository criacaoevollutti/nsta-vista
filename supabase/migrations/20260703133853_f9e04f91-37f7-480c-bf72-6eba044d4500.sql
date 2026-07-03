CREATE OR REPLACE FUNCTION public.admin_reorder_posts(_admin_pin text, _target_id uuid, _post_ids uuid[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _ok boolean; _id uuid; _i int := 0;
BEGIN
  IF _admin_pin IS NULL OR _admin_pin !~ '^[0-9]{4}$' THEN RETURN false; END IF;
  SELECT true INTO _ok FROM public.profiles WHERE access_pin = _admin_pin AND is_admin = true;
  IF NOT COALESCE(_ok, false) THEN RETURN false; END IF;

  FOREACH _id IN ARRAY _post_ids LOOP
    UPDATE public.posts SET position = _i, updated_at = now()
      WHERE id = _id AND user_id = _target_id;
    _i := _i + 1;
  END LOOP;
  RETURN true;
END;
$$;