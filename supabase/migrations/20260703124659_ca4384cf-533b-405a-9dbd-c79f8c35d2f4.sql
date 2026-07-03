ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS highlight_names jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS highlight_covers jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.admin_update_highlights(_admin_pin text, _target_id uuid, _names jsonb, _covers jsonb)
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
    highlight_names  = COALESCE(_names, highlight_names),
    highlight_covers = COALESCE(_covers, highlight_covers),
    updated_at = now()
  WHERE id = _target_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_highlights(text, uuid, jsonb, jsonb) TO authenticated, anon;