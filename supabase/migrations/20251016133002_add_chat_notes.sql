-- Create notes table for chats (project notes)

CREATE TABLE IF NOT EXISTS chat_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Constraints
ALTER TABLE chat_notes
  ADD CONSTRAINT chat_notes_content_length CHECK (char_length(content) <= 2000);

-- RLS
ALTER TABLE chat_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view notes" ON chat_notes;
CREATE POLICY "Members can view notes"
ON chat_notes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_members.chat_id = chat_notes.chat_id
      AND chat_members.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Staff can create notes" ON chat_notes;
CREATE POLICY "Staff can create notes"
ON chat_notes FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'team_member'))
  AND EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_members.chat_id = chat_notes.chat_id
      AND chat_members.user_id = auth.uid()
  )
  AND auth.uid() = created_by
);

DROP POLICY IF EXISTS "Authors or admins can update notes" ON chat_notes;
CREATE POLICY "Authors or admins can update notes"
ON chat_notes FOR UPDATE
USING (
  (auth.uid() = created_by OR has_role(auth.uid(), 'admin'))
  AND EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_members.chat_id = chat_notes.chat_id
      AND chat_members.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Authors or admins can delete notes" ON chat_notes;
CREATE POLICY "Authors or admins can delete notes"
ON chat_notes FOR DELETE
USING (
  (auth.uid() = created_by OR has_role(auth.uid(), 'admin'))
  AND EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_members.chat_id = chat_notes.chat_id
      AND chat_members.user_id = auth.uid()
  )
);

-- updated_at trigger
DROP TRIGGER IF EXISTS update_chat_notes_updated_at ON chat_notes;
CREATE TRIGGER update_chat_notes_updated_at
  BEFORE UPDATE ON chat_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE chat_notes IS 'Free-form project notes per chat';
