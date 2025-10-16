-- Add 'review' status to task_status enum and update comments

DO $$
BEGIN
  -- Add new enum value if not present
  ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'review' AFTER 'in_progress';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Update documentation comment to reflect new value
COMMENT ON COLUMN tasks.status IS 'Current status: to_start, in_progress, review, completed, or failed';

