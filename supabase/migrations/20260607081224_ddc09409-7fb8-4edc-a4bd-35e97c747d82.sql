
CREATE POLICY "chat attachments read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-attachments' AND (
      public.current_user_is_admin()
      OR public.can_access_composer(((storage.foldername(name))[1])::uuid)
    )
  );

CREATE POLICY "chat attachments insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments' AND (
      public.current_user_is_admin()
      OR public.can_access_composer(((storage.foldername(name))[1])::uuid)
    )
  );

CREATE POLICY "chat attachments delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-attachments' AND (
      public.current_user_is_admin()
      OR public.can_access_composer(((storage.foldername(name))[1])::uuid)
    )
  );
