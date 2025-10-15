-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false);

-- Enable RLS on storage bucket
CREATE POLICY "Chat members can view attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-attachments' AND
  EXISTS (
    SELECT 1 FROM messages m
    JOIN chat_members cm ON cm.chat_id = m.chat_id
    WHERE m.id::text = (storage.foldername(name))[1]
    AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Chat members can upload attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add attachments column to messages table
ALTER TABLE messages
ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;

-- Create index for better query performance
CREATE INDEX idx_messages_attachments ON messages USING GIN (attachments);

-- Add comment to explain attachment structure
COMMENT ON COLUMN messages.attachments IS 'Array of attachment objects: [{name: string, type: string, url: string, size: number}]';
