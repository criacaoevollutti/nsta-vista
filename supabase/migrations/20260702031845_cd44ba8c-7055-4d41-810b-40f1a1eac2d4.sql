
CREATE OR REPLACE FUNCTION public.admin_create_post_for(_admin_pin text, _target_id uuid, _position int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  INSERT INTO public.posts (user_id, media, thumb, type, status, title, caption, objective, notes, date, time, position, approval_status, client_comment)
  VALUES (_target_id, _placeholder, _placeholder, 'image', 'draft', 'Nova postagem', '', '', '', '', '', COALESCE(_position, _count), 'pending', '')
  RETURNING * INTO _new;

  RETURN to_jsonb(_new);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_post_for(text, uuid, int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_post(_admin_pin text, _post_id uuid, _patch jsonb)
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

  UPDATE public.posts SET
    media    = COALESCE(_patch->>'media', media),
    thumb    = COALESCE(_patch->>'thumb', thumb),
    type     = COALESCE(_patch->>'type', type),
    status   = COALESCE(_patch->>'status', status),
    title    = COALESCE(_patch->>'title', title),
    caption  = COALESCE(_patch->>'caption', caption),
    objective= COALESCE(_patch->>'objective', objective),
    notes    = COALESCE(_patch->>'notes', notes),
    date     = COALESCE(_patch->>'date', date),
    time     = COALESCE(_patch->>'time', time),
    updated_at = now()
  WHERE id = _post_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_post(text, uuid, jsonb) TO anon, authenticated;
