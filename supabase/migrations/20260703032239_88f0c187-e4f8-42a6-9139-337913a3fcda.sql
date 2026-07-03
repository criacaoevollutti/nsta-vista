CREATE OR REPLACE FUNCTION public.admin_delete_profile(_admin_pin text, _target_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _ok boolean;
BEGIN
  IF _admin_pin IS NULL OR _admin_pin !~ '^[0-9]{4}$' THEN RETURN false; END IF;
  SELECT true INTO _ok FROM public.profiles WHERE access_pin = _admin_pin AND is_admin = true;
  IF NOT COALESCE(_ok, false) THEN RETURN false; END IF;

  DELETE FROM public.posts WHERE user_id = _target_id;
  DELETE FROM public.profiles WHERE id = _target_id AND is_admin = false;
  RETURN FOUND;
END;
$function$;