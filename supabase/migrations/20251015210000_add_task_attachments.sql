-- =====================================================
-- Migration: Add Task Attachments
-- Description: Adds file attachment support for tasks
-- =====================================================

-- =====================================================
-- 1. ADD ATTACHMENTS COLUMN TO TASKS
-- =====================================================

-- Add attachments JSONB column to tasks table
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Add index for attachments queries
CREATE INDEX IF NOT EXISTS idx_tasks_attachments ON tasks USING GIN (attachments);

-- =====================================================
-- 2. CREATE TASK-ATTACHMENTS STORAGE BUCKET
-- =====================================================

-- Create task-attachments bucket for file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-attachments',
  'task-attachments',
  false, -- Private bucket
  10485760, -- 10MB limit
  NULL -- Allow all file types
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 3. STORAGE POLICIES - TASK ATTACHMENTS
-- =====================================================

-- Users can view attachments in tasks they have access to
DROP POLICY IF EXISTS "Users can view task attachments" ON storage.objects;
CREATE POLICY "Users can view task attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'task-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can upload attachments to their own folder
DROP POLICY IF EXISTS "Users can upload task attachments" ON storage.objects;
CREATE POLICY "Users can upload task attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'task-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own attachments
DROP POLICY IF EXISTS "Users can delete task attachments" ON storage.objects;
CREATE POLICY "Users can delete task attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'task-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- 4. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN tasks.attachments IS 'File attachments for the task (JSONB array with name, type, url, size)';
