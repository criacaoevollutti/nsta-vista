
CREATE TABLE public.client_credentials (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_credentials TO authenticated;
GRANT ALL ON public.client_credentials TO service_role;

ALTER TABLE public.client_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view credentials"
  ON public.client_credentials FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert credentials"
  ON public.client_credentials FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update credentials"
  ON public.client_credentials FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete credentials"
  ON public.client_credentials FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_client_credentials_updated
  BEFORE UPDATE ON public.client_credentials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
