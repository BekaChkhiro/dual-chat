-- Create chat invitations table for pending invites
CREATE TABLE public.chat_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(chat_id, email)
);

-- Enable RLS
ALTER TABLE public.chat_invitations ENABLE ROW LEVEL SECURITY;

-- Team members can view invitations for their chats
CREATE POLICY "Team can view chat invitations"
ON public.chat_invitations
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'team_member')
);

-- Team members can create invitations
CREATE POLICY "Team can create invitations"
ON public.chat_invitations
FOR INSERT
WITH CHECK (
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'team_member'))
  AND invited_by = auth.uid()
);

-- Team members can delete pending invitations
CREATE POLICY "Team can delete pending invitations"
ON public.chat_invitations
FOR DELETE
USING (
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'team_member'))
  AND accepted_at IS NULL
);

-- Index for faster lookups
CREATE INDEX idx_chat_invitations_token ON public.chat_invitations(token);
CREATE INDEX idx_chat_invitations_email ON public.chat_invitations(email);
CREATE INDEX idx_chat_invitations_expires ON public.chat_invitations(expires_at);