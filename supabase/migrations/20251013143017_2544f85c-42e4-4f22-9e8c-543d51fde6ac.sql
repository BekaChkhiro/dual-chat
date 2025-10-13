-- Create trigger for auto-assigning role and profile on new user signup, and backfill roles for existing users
BEGIN;

-- Ensure the signup trigger is in place
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: assign team_member role to existing users missing it
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'team_member'::public.app_role
FROM auth.users u
LEFT JOIN public.user_roles r
  ON r.user_id = u.id AND r.role = 'team_member'
WHERE r.user_id IS NULL;

COMMIT;