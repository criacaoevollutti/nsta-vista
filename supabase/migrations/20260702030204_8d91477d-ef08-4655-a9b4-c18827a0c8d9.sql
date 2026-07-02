
CREATE OR REPLACE FUNCTION public.admin_create_profile(_admin_pin text, _name text, _handle text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ok boolean;
  _new_id uuid := gen_random_uuid();
  _new_pin text;
  _clean_handle text;
BEGIN
  IF _admin_pin IS NULL OR _admin_pin !~ '^[0-9]{4}$' THEN RETURN NULL; END IF;
  SELECT true INTO _ok FROM public.profiles WHERE access_pin = _admin_pin AND is_admin = true;
  IF NOT COALESCE(_ok, false) THEN RETURN NULL; END IF;

  _clean_handle := lower(regexp_replace(COALESCE(NULLIF(_handle, ''), _name), '[^a-z0-9_]+', '', 'gi'));
  IF _clean_handle = '' THEN _clean_handle := 'empresa' || substr(_new_id::text, 1, 6); END IF;

  -- ensure unique handle
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE handle = _clean_handle) LOOP
    _clean_handle := _clean_handle || floor(random()*10)::int::text;
  END LOOP;

  LOOP
    _new_pin := lpad((floor(random() * 10000))::int::text, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE access_pin = _new_pin);
  END LOOP;

  INSERT INTO public.profiles (id, name, handle, access_pin, is_admin)
  VALUES (_new_id, COALESCE(NULLIF(_name, ''), 'Nova Empresa'), _clean_handle, _new_pin, false);

  RETURN jsonb_build_object('id', _new_id, 'name', COALESCE(NULLIF(_name, ''), 'Nova Empresa'), 'handle', _clean_handle, 'access_pin', _new_pin, 'is_admin', false, 'avatar', null);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_profile(text, text, text) TO anon, authenticated;
