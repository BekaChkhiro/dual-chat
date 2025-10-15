import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env file
const envPath = join(__dirname, '.env');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

console.log('🔧 Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function setupStorage() {
  try {
    console.log('📦 Creating storage bucket...');

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return;
    }

    const bucketExists = buckets?.some(b => b.id === 'chat-attachments');

    if (bucketExists) {
      console.log('✅ Storage bucket "chat-attachments" already exists');
      return;
    }

    // Create bucket
    const { data, error } = await supabase.storage.createBucket('chat-attachments', {
      public: false,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: [
        'image/*',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]
    });

    if (error) {
      console.error('❌ Error creating bucket:', error);
      return;
    }

    console.log('✅ Storage bucket "chat-attachments" created successfully!');

    // Now run the SQL to add attachments column and policies
    console.log('\n📝 Now you need to run this SQL in Supabase Dashboard:');
    console.log('https://supabase.com/dashboard/project/' + envVars.VITE_SUPABASE_PROJECT_ID + '/sql\n');
    console.log(`
-- Add attachments column to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_attachments ON messages USING GIN (attachments);

-- RLS Policies for storage
CREATE POLICY "Chat members can view attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-attachments' AND
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.chat_members cm ON cm.chat_id = m.chat_id
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
    `);

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

setupStorage();
