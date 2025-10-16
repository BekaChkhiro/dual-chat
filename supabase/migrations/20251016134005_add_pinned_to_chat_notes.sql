-- Add pinned flag to chat_notes

ALTER TABLE chat_notes
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_chat_notes_pinned ON chat_notes(pinned);

