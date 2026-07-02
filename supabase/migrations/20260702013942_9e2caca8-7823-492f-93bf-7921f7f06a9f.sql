
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
UPDATE public.profiles SET is_admin = true WHERE handle = 'evollutti';

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
  SELECT * INTO _admin FROM public.profiles WHERE access_pin = _pin AND is_admin = true;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'handle', p.handle,
    'avatar', p.avatar,
    'access_pin', p.access_pin,
    'is_admin', p.is_admin
  ) ORDER BY p.is_admin DESC, p.name), '[]'::jsonb)
  INTO _profiles FROM public.profiles p;

  RETURN jsonb_build_object('admin', to_jsonb(_admin) - 'access_pin', 'profiles', _profiles);
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_data_by_pin(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_data_by_pin(text) TO anon, authenticated;
