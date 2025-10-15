-- Add attachments column to messages table (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'attachments'
  ) THEN
    ALTER TABLE messages ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;
    CREATE INDEX idx_messages_attachments ON messages USING GIN (attachments);
    COMMENT ON COLUMN messages.attachments IS 'Array of attachment objects: [{name: string, type: string, url: string, size: number}]';
  END IF;
END $$;