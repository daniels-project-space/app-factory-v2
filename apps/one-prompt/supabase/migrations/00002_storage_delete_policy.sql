-- Allow users to delete their own photos from the journal-photos bucket.
-- This enables proper cleanup when journal entries are deleted and satisfies
-- the GDPR right-to-erasure requirement when accounts are deleted.
CREATE POLICY "Users can delete own photos" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'journal-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
