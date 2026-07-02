
DROP POLICY IF EXISTS "pin prefix anon read" ON storage.objects;
DROP POLICY IF EXISTS "pin prefix anon insert" ON storage.objects;
DROP POLICY IF EXISTS "pin prefix anon update" ON storage.objects;

CREATE POLICY "pin prefix anon read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] = 'pin');

CREATE POLICY "pin prefix anon insert" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = 'pin');

CREATE POLICY "pin prefix anon update" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] = 'pin')
  WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = 'pin');

CREATE OR REPLACE FUNCTION public.admin_delete_post(_admin_pin text, _post_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ok boolean;
BEGIN
  IF _admin_pin IS NULL OR _admin_pin !~ '^[0-9]{4}$' THEN RETURN false; END IF;
  SELECT true INTO _ok FROM public.profiles WHERE access_pin = _admin_pin AND is_admin = true;
  IF NOT COALESCE(_ok, false) THEN RETURN false; END IF;
  DELETE FROM public.posts WHERE id = _post_id;
  RETURN FOUND;
END;$$;
GRANT EXECUTE ON FUNCTION public.admin_delete_post(text, uuid) TO anon, authenticated;
