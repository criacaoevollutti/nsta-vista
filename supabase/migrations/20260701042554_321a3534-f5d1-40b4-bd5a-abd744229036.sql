
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'client');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Grant admin role on signup for fixed email
CREATE OR REPLACE FUNCTION public.grant_admin_for_fixed_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) = 'criacaoevollutti@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_grant_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_admin_for_fixed_email();

-- If admin already exists, grant now
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE lower(email) = 'criacaoevollutti@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Extend profiles with share token
ALTER TABLE public.profiles
  ADD COLUMN share_token uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX profiles_share_token_idx ON public.profiles(share_token);

-- Extend posts with approval fields
ALTER TABLE public.posts
  ADD COLUMN approval_status text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending','approved','changes_requested')),
  ADD COLUMN client_comment text NOT NULL DEFAULT '';

-- Admin policies (view + manage everything)
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert any profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all posts" ON public.posts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all posts" ON public.posts
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert any post" ON public.posts
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete any post" ON public.posts
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Public token-based access via SECURITY DEFINER RPCs
CREATE OR REPLACE FUNCTION public.get_shared_profile(_token uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _profile public.profiles%ROWTYPE;
  _posts jsonb;
BEGIN
  SELECT * INTO _profile FROM public.profiles WHERE share_token = _token;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.position), '[]'::jsonb)
    INTO _posts FROM public.posts p WHERE p.user_id = _profile.id;

  RETURN jsonb_build_object(
    'profile', to_jsonb(_profile),
    'posts', _posts
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_post_approval(
  _token uuid, _post_id uuid, _status text, _comment text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _owner uuid;
BEGIN
  IF _status NOT IN ('pending','approved','changes_requested') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;

  SELECT id INTO _owner FROM public.profiles WHERE share_token = _token;
  IF _owner IS NULL THEN RETURN false; END IF;

  UPDATE public.posts
    SET approval_status = _status,
        client_comment = COALESCE(_comment, ''),
        updated_at = now()
    WHERE id = _post_id AND user_id = _owner;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_profile(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_post_approval(uuid, uuid, text, text) TO anon, authenticated;
