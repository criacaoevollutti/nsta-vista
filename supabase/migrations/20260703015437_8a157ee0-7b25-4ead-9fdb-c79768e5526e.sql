CREATE OR REPLACE FUNCTION public.admin_update_post(_admin_pin text, _post_id uuid, _patch jsonb)
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

  UPDATE public.posts SET
    media    = COALESCE(_patch->>'media', media),
    thumb    = COALESCE(_patch->>'thumb', thumb),
    type     = COALESCE(_patch->>'type', type),
    status   = COALESCE(_patch->>'status', status),
    title    = COALESCE(_patch->>'title', title),
    caption  = COALESCE(_patch->>'caption', caption),
    objective= COALESCE(_patch->>'objective', objective),
    notes    = COALESCE(_patch->>'notes', notes),
    date     = COALESCE(NULLIF(_patch->>'date','')::date, date),
    time     = COALESCE(NULLIF(_patch->>'time',''), time),
    approval_status = COALESCE(_patch->>'approval_status', approval_status),
    client_comment  = COALESCE(_patch->>'client_comment', client_comment),
    updated_at = now()
  WHERE id = _post_id;
  RETURN FOUND;
END;
$function$;