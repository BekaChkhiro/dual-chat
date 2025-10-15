-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  false,
  10485760, -- 10MB
  ARRAY[
    'image/*',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage bucket
DROP POLICY IF EXISTS "Chat members can view attachments" ON storage.objects;
CREATE POLICY "Chat members can view attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-attachments' AND
  -- Users can view files in their own folder (user_id is first folder segment)
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Chat members can upload attachments" ON storage.objects;
CREATE POLICY "Chat members can upload attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete own attachments" ON storage.objects;
CREATE POLICY "Users can delete own attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add attachments column to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_attachments ON messages USING GIN (attachments);

-- Add comment to explain attachment structure
COMMENT ON COLUMN messages.attachments IS 'Array of attachment objects: [{name: string, type: string, url: string, size: number}]';
