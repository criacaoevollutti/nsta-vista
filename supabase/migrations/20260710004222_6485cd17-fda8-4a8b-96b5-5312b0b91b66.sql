CREATE OR REPLACE FUNCTION public.storage_pin_name_valid(_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rest text;
  _uuid_txt text;
  _uuid uuid;
BEGIN
  IF _name IS NULL THEN RETURN false; END IF;
  IF position('pin/' in _name) <> 1 THEN RETURN false; END IF;
  _rest := substring(_name from 5);
  IF length(_rest) < 37 THEN RETURN false; END IF;
  IF substring(_rest from 37 for 1) <> '-' THEN RETURN false; END IF;
  _uuid_txt := substring(_rest from 1 for 36);
  BEGIN
    _uuid := _uuid_txt::uuid;
  EXCEPTION WHEN others THEN
    RETURN false;
  END;
  RETURN EXISTS (SELECT 1 FROM public.posts WHERE id = _uuid);
END;
$$;

GRANT EXECUTE ON FUNCTION public.storage_pin_name_valid(text) TO anon, authenticated;

DROP POLICY IF EXISTS "pin prefix anon read" ON storage.objects;
DROP POLICY IF EXISTS "pin prefix anon insert" ON storage.objects;
DROP POLICY IF EXISTS "pin prefix anon update" ON storage.objects;

CREATE POLICY "pin prefix anon read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = 'pin'
    AND public.storage_pin_name_valid(name)
  );

CREATE POLICY "pin prefix anon insert" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = 'pin'
    AND public.storage_pin_name_valid(name)
  );

CREATE POLICY "pin prefix anon update" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = 'pin'
    AND public.storage_pin_name_valid(name)
  )
  WITH CHECK (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = 'pin'
    AND public.storage_pin_name_valid(name)
  );