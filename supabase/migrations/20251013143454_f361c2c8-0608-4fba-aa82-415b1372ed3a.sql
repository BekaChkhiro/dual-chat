BEGIN;

-- Allow creators to view their chats immediately (even before membership row exists)
DROP POLICY IF EXISTS "Members can view their chats" ON public.chats;
CREATE POLICY "Members can view their chats"
ON public.chats
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_members cm
    WHERE cm.chat_id = chats.id AND cm.user_id = auth.uid()
  )
  OR chats.created_by = auth.uid()
);

-- Strengthen INSERT: ensure creator is the authenticated user and has a team/admin role
DROP POLICY IF EXISTS "Team members can create chats" ON public.chats;
CREATE POLICY "Team members can create chats"
ON public.chats
FOR INSERT
WITH CHECK (
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'team_member'))
  AND created_by = auth.uid()
);

COMMIT;