
-- 1) Column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS access_pin TEXT;

-- Backfill existing rows with a unique 4-digit pin
DO $$
DECLARE r RECORD; new_pin TEXT;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE access_pin IS NULL LOOP
    LOOP
      new_pin := lpad((floor(random() * 10000))::int::text, 4, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE access_pin = new_pin);
    END LOOP;
    UPDATE public.profiles SET access_pin = new_pin WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.profiles
  ALTER COLUMN access_pin SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_access_pin_key ON public.profiles(access_pin);

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_access_pin_format CHECK (access_pin ~ '^[0-9]{4}$');

-- 2) Helper to generate a unique pin (admin use)
CREATE OR REPLACE FUNCTION public.generate_unique_pin()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_pin TEXT;
BEGIN
  LOOP
    new_pin := lpad((floor(random() * 10000))::int::text, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE access_pin = new_pin);
  END LOOP;
  RETURN new_pin;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.generate_unique_pin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_unique_pin() TO service_role;

-- 3) Update handle_new_user to auto-assign a pin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_pin TEXT;
BEGIN
  LOOP
    new_pin := lpad((floor(random() * 10000))::int::text, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE access_pin = new_pin);
  END LOOP;

  INSERT INTO public.profiles (id, name, handle, access_pin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'handle', split_part(NEW.email, '@', 1)),
    new_pin
  );
  RETURN NEW;
END;
$$;

-- 4) Public RPC: client fetches by PIN (read-only)
CREATE OR REPLACE FUNCTION public.get_profile_by_pin(_pin TEXT)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile public.profiles%ROWTYPE;
  _posts jsonb;
BEGIN
  IF _pin IS NULL OR _pin !~ '^[0-9]{4}$' THEN RETURN NULL; END IF;
  SELECT * INTO _profile FROM public.profiles WHERE access_pin = _pin;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.position), '[]'::jsonb)
    INTO _posts FROM public.posts p WHERE p.user_id = _profile.id;

  RETURN jsonb_build_object(
    'profile', to_jsonb(_profile) - 'access_pin',
    'posts', _posts
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_profile_by_pin(TEXT) TO anon, authenticated;

-- 5) Public RPC: client sets approval via PIN
CREATE OR REPLACE FUNCTION public.set_post_approval_by_pin(_pin TEXT, _post_id uuid, _status TEXT, _comment TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _owner uuid;
BEGIN
  IF _status NOT IN ('pending','approved','changes_requested') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  IF _pin IS NULL OR _pin !~ '^[0-9]{4}$' THEN RETURN false; END IF;

  SELECT id INTO _owner FROM public.profiles WHERE access_pin = _pin;
  IF _owner IS NULL THEN RETURN false; END IF;

  UPDATE public.posts
    SET approval_status = _status,
        client_comment = COALESCE(_comment, ''),
        updated_at = now()
    WHERE id = _post_id AND user_id = _owner;

  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_post_approval_by_pin(TEXT, uuid, TEXT, TEXT) TO anon, authenticated;
