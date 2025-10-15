# Storage Bucket Setup Instructions

თუ ავატარის ატვირთვა არ მუშაობს, შეამოწმეთ შემდეგი:

## 1. შეამოწმეთ Migration გაშვებულია თუ არა

Migration ფაილი: `supabase/migrations/20251015190000_add_organizations_system.sql`

### Supabase Dashboard-ის გამოყენებით:

1. გადადით: https://supabase.com/dashboard
2. აირჩიეთ თქვენი პროექტი
3. **SQL Editor** → **New Query**
4. დააკოპირეთ და ჩასვით მთლიანი migration ფაილი
5. დააჭირეთ **Run**

## 2. Manual Storage Bucket შექმნა (თუ migration არ გაშვებულა)

### Avatars Bucket (Private):

1. Supabase Dashboard → **Storage**
2. **New Bucket**
3. დააყენეთ:
   - **Name**: `avatars`
   - **Public bucket**: ❌ **OFF** (Private!)
   - **File size limit**: 5 MB
   - **Allowed MIME types**: image/jpeg, image/jpg, image/png, image/gif, image/webp

### Organization Logos Bucket (Public):

1. **New Bucket**
2. დააყენეთ:
   - **Name**: `organization-logos`
   - **Public bucket**: ✅ **ON** (Public!)
   - **File size limit**: 5 MB
   - **Allowed MIME types**: image/jpeg, image/jpg, image/png, image/gif, image/webp

## 3. RLS Policies Setup

### Avatars Bucket Policies:

SQL Editor-ში გაუშვით:

```sql
-- Users can view their own avatar
CREATE POLICY "Users can view own avatar"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### Organization Logos Bucket Policies:

```sql
-- Anyone can view organization logos (public bucket)
CREATE POLICY "Anyone can view organization logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'organization-logos');

-- Organization owners/admins can upload logos
CREATE POLICY "Organization members can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'organization-logos' AND
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.user_id = auth.uid()
    AND organization_members.organization_id::text = (storage.foldername(name))[1]
    AND organization_members.role IN ('owner', 'admin')
  )
);

-- Organization owners/admins can update logos
CREATE POLICY "Organization members can update logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'organization-logos' AND
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.user_id = auth.uid()
    AND organization_members.organization_id::text = (storage.foldername(name))[1]
    AND organization_members.role IN ('owner', 'admin')
  )
);

-- Organization owners/admins can delete logos
CREATE POLICY "Organization members can delete logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'organization-logos' AND
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.user_id = auth.uid()
    AND organization_members.organization_id::text = (storage.foldername(name))[1]
    AND organization_members.role IN ('owner', 'admin')
  )
);
```

## 4. შემოწმება

Console-ში (F12 → Console) უნდა დაინახოთ:
- თუ წარმატებით აიტვირთა: "ავატარი აიტვირთა" ✅
- თუ შეცდომაა: შეცდომის დეტალები წითლად

### ყველაზე გავრცელებული შეცდომები:

1. **"Bucket not found"** → Storage bucket არ არის შექმნილი
2. **"new row violates row-level security policy"** → RLS policies არასწორია
3. **"File too large"** → ფაილი 5MB-ზე დიდია

## 5. გადამოწმება Supabase-ში

1. **Storage** → **avatars** bucket
2. უნდა დაინახოთ ფოლდერი თქვენი user ID-ით
3. შიგნით უნდა იყოს `avatar.jpg/png` ფაილი

## 6. სწრაფი ტესტი

თუ console-ში ხედავთ შეცდომას, გაამოწმეთ:

```javascript
// Browser Console-ში:
const { data, error } = await supabase.storage.listBuckets()
console.log('Buckets:', data, 'Error:', error)

// უნდა დაინახოთ 'avatars' და 'organization-logos' buckets
```

თუ buckets არ ჩანს → Migration არ გაშვებულა → გაუშვით Migration!
