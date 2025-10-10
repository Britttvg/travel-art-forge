-- Create storage policies for generated-artworks bucket
-- Allow authenticated users to upload artworks
CREATE POLICY "Users can upload generated artworks"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'generated-artworks');

-- Allow public read access to generated artworks (since bucket is public)
CREATE POLICY "Public read access to generated artworks"
ON storage.objects
FOR SELECT
USING (bucket_id = 'generated-artworks');

-- Allow users to delete their own artworks
CREATE POLICY "Users can delete their own generated artworks"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'generated-artworks');