-- Assign initial roles to existing users
-- First user (beka) as admin
-- Second user (webinfinity) as team_member

INSERT INTO user_roles (user_id, role) VALUES
  ('7d9d9212-0282-4764-897f-966c3b41f863', 'admin'),
  ('cd9e4b79-7da9-4c2b-88b0-ac2c1c4b229e', 'team_member')
ON CONFLICT (user_id, role) DO NOTHING;
