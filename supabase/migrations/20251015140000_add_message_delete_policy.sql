-- Add UPDATE policy for messages
-- Users can only edit their own messages
CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  USING (
    auth.uid() = sender_id
  )
  WITH CHECK (
    auth.uid() = sender_id
  );

-- Add DELETE policy for messages
-- Users can only delete their own messages
CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  USING (
    auth.uid() = sender_id
  );
