ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS position integer;

WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY updated_at DESC) - 1 AS rn
  FROM public.profiles
)
UPDATE public.profiles p
SET position = r.rn
FROM ranked r
WHERE p.id = r.id
  AND p.position IS NULL;

CREATE OR REPLACE FUNCTION public.admin_reorder_profiles(_admin_pin text, _profile_ids uuid[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _ok boolean;
  _id uuid;
  _i int := 0;
BEGIN
  IF _admin_pin IS NULL OR _admin_pin !~ '^[0-9]{4}$' THEN
    RETURN false;
  END IF;

  SELECT true INTO _ok
  FROM public.profiles
  WHERE access_pin = _admin_pin
    AND is_admin = true;

  IF NOT COALESCE(_ok, false) THEN
    RETURN false;
  END IF;

  FOREACH _id IN ARRAY _profile_ids LOOP
    UPDATE public.profiles
    SET position = _i,
        updated_at = now()
    WHERE id = _id;
    _i := _i + 1;
  END LOOP;

  RETURN true;
END;
$$;