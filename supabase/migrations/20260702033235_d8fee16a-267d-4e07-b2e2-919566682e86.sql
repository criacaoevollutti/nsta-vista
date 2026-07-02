
-- Drop FK to auth.users (profiles are independent now)
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Fix create RPC: rely on defaults for date/time
CREATE OR REPLACE FUNCTION public.admin_create_post_for(_admin_pin text, _target_id uuid, _position integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _ok boolean;
  _count int;
  _new public.posts%ROWTYPE;
  _placeholder text := 'https://images.unsplash.com/photo-1520975693416-35a9c1e37e15?w=800';
BEGIN
  IF _admin_pin IS NULL OR _admin_pin !~ '^[0-9]{4}$' THEN RETURN NULL; END IF;
  SELECT true INTO _ok FROM public.profiles WHERE access_pin = _admin_pin AND is_admin = true;
  IF NOT COALESCE(_ok, false) THEN RETURN NULL; END IF;

  SELECT count(*) INTO _count FROM public.posts WHERE user_id = _target_id;
  IF _count >= 12 THEN RETURN NULL; END IF;

  INSERT INTO public.posts (user_id, media, thumb, type, title, position)
  VALUES (_target_id, _placeholder, _placeholder, 'image', 'Nova postagem', COALESCE(_position, _count))
  RETURNING * INTO _new;

  RETURN to_jsonb(_new);
END;
$function$;

-- Fix update RPC: coerce empty date string to keep current value
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
    updated_at = now()
  WHERE id = _post_id;
  RETURN FOUND;
END;
$function$;
