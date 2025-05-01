-- Enable RLS on the bucket (required for policies)
UPDATE storage.buckets SET public = false WHERE id = 'user-avatars';

-- Create a policy for uploads (example: authenticated users can upload)
CREATE POLICY "Allow authenticated uploads" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'user-avatars'
);

-- Create a policy for reads (public or authenticated)
CREATE POLICY "Allow public reads"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'user-avatars'
);