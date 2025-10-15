-- =====================================================
-- Migration: Add Tasks and Project Management
-- Description: Adds task management system with project description for chats
-- =====================================================

-- =====================================================
-- 1. ADD PROJECT DESCRIPTION TO CHATS
-- =====================================================

-- Add project_description column to chats table
ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS project_description TEXT;

-- Add constraint for project_description length (max 5000 characters)
ALTER TABLE chats
  ADD CONSTRAINT project_description_length_check CHECK (char_length(project_description) <= 5000);

-- =====================================================
-- 2. CREATE TASK STATUS ENUM
-- =====================================================

-- Create task_status enum type
DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('to_start', 'in_progress', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 3. CREATE TASKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status task_status DEFAULT 'to_start' NOT NULL,
  due_date DATE,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add constraint for title length (must not be empty, max 200 characters)
ALTER TABLE tasks
  ADD CONSTRAINT title_not_empty CHECK (char_length(trim(title)) > 0),
  ADD CONSTRAINT title_length_check CHECK (char_length(title) <= 200);

-- Add constraint for description length (max 2000 characters)
ALTER TABLE tasks
  ADD CONSTRAINT description_length_check CHECK (char_length(description) <= 2000);

-- Enable RLS on tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for querying tasks by chat
CREATE INDEX IF NOT EXISTS idx_tasks_chat_id ON tasks(chat_id);

-- Index for querying tasks by assignee
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);

-- Index for querying tasks by status
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Index for querying tasks by due_date
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- Index for querying tasks by creator
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);

-- Composite index for common query patterns (chat + status)
CREATE INDEX IF NOT EXISTS idx_tasks_chat_status ON tasks(chat_id, status);

-- =====================================================
-- 5. RLS POLICIES - TASKS
-- =====================================================

-- Members can view tasks in chats they belong to
DROP POLICY IF EXISTS "Members can view tasks in their chats" ON tasks;
CREATE POLICY "Members can view tasks in their chats"
ON tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_members.chat_id = tasks.chat_id
    AND chat_members.user_id = auth.uid()
  )
);

-- Team members and admins can create tasks in chats they belong to
DROP POLICY IF EXISTS "Staff can create tasks" ON tasks;
CREATE POLICY "Staff can create tasks"
ON tasks FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'team_member'))
  AND auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_members.chat_id = tasks.chat_id
    AND chat_members.user_id = auth.uid()
  )
);

-- Task creators, assignees, and admins can update tasks
DROP POLICY IF EXISTS "Staff can update tasks" ON tasks;
CREATE POLICY "Staff can update tasks"
ON tasks FOR UPDATE
USING (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'team_member'))
  AND (
    -- Task creator can update
    auth.uid() = created_by
    OR
    -- Task assignee can update (mainly status)
    auth.uid() = assignee_id
    OR
    -- Admins can update any task
    has_role(auth.uid(), 'admin')
  )
  AND EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_members.chat_id = tasks.chat_id
    AND chat_members.user_id = auth.uid()
  )
);

-- Task creators and admins can delete tasks
DROP POLICY IF EXISTS "Staff can delete tasks" ON tasks;
CREATE POLICY "Staff can delete tasks"
ON tasks FOR DELETE
USING (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'team_member'))
  AND (
    -- Task creator can delete
    auth.uid() = created_by
    OR
    -- Admins can delete any task
    has_role(auth.uid(), 'admin')
  )
  AND EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_members.chat_id = tasks.chat_id
    AND chat_members.user_id = auth.uid()
  )
);

-- =====================================================
-- 6. TRIGGER FOR UPDATED_AT
-- =====================================================

-- Trigger for tasks updated_at
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE tasks IS 'Project management tasks associated with chats';
COMMENT ON COLUMN tasks.chat_id IS 'The chat/project this task belongs to';
COMMENT ON COLUMN tasks.title IS 'Task title (required, max 200 characters)';
COMMENT ON COLUMN tasks.description IS 'Detailed task description (optional, max 2000 characters)';
COMMENT ON COLUMN tasks.status IS 'Current status: to_start, in_progress, completed, or failed';
COMMENT ON COLUMN tasks.due_date IS 'Task due date (optional)';
COMMENT ON COLUMN tasks.assignee_id IS 'User assigned to complete this task (optional)';
COMMENT ON COLUMN tasks.created_by IS 'User who created the task';
COMMENT ON COLUMN chats.project_description IS 'Description of the project/chat purpose (max 5000 characters)';
