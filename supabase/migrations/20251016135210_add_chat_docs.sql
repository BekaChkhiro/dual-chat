-- Create documentation pages per chat

CREATE TABLE IF NOT EXISTS chat_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  order_index INT NOT NULL DEFAULT 1,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chat_docs
  ADD CONSTRAINT chat_docs_title_length CHECK (char_length(title) <= 200),
  ADD CONSTRAINT chat_docs_content_length CHECK (char_length(content) <= 20000);

CREATE INDEX IF NOT EXISTS idx_chat_docs_chat_id ON chat_docs(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_docs_order ON chat_docs(chat_id, order_index);

ALTER TABLE chat_docs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view docs" ON chat_docs;
CREATE POLICY "Members can view docs"
ON chat_docs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_members.chat_id = chat_docs.chat_id
      AND chat_members.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Staff can create docs" ON chat_docs;
CREATE POLICY "Staff can create docs"
ON chat_docs FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'team_member'))
  AND auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_members.chat_id = chat_docs.chat_id
      AND chat_members.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Authors or admins can update docs" ON chat_docs;
CREATE POLICY "Authors or admins can update docs"
ON chat_docs FOR UPDATE
USING (
  (auth.uid() = created_by OR has_role(auth.uid(), 'admin'))
  AND EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_members.chat_id = chat_docs.chat_id
      AND chat_members.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Authors or admins can delete docs" ON chat_docs;
CREATE POLICY "Authors or admins can delete docs"
ON chat_docs FOR DELETE
USING (
  (auth.uid() = created_by OR has_role(auth.uid(), 'admin'))
  AND EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_members.chat_id = chat_docs.chat_id
      AND chat_members.user_id = auth.uid()
  )
);

DROP TRIGGER IF EXISTS update_chat_docs_updated_at ON chat_docs;
CREATE TRIGGER update_chat_docs_updated_at
  BEFORE UPDATE ON chat_docs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE chat_docs IS 'Per-chat documentation pages';
