
-- Function to handle new user signup: creates org and user record
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
  org_name text;
  user_name text;
BEGIN
  org_name := COALESCE(NEW.raw_user_meta_data->>'org_name', 'Minha Organização');
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

  INSERT INTO public.organizations (name, plan_id, plan_status)
  VALUES (org_name, 'starter', 'trial')
  RETURNING id INTO new_org_id;

  INSERT INTO public.users (id, org_id, email, name, role)
  VALUES (NEW.id, new_org_id, NEW.email, user_name, 'admin');

  RETURN NEW;
END;
$$;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
