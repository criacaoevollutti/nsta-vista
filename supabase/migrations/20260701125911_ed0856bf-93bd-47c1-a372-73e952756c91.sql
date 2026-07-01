
-- Allow profiles to exist without an auth.users row (clients no longer sign in)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ALTER COLUMN access_pin DROP NOT NULL;

-- Auto-generate a unique 4-digit PIN when a profile is inserted without one
CREATE OR REPLACE FUNCTION public.assign_profile_pin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_pin TEXT;
BEGIN
  IF NEW.access_pin IS NULL OR NEW.access_pin = '' THEN
    LOOP
      new_pin := lpad((floor(random() * 10000))::int::text, 4, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE access_pin = new_pin);
    END LOOP;
    NEW.access_pin := new_pin;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_profile_pin_trigger ON public.profiles;
CREATE TRIGGER assign_profile_pin_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.assign_profile_pin();
