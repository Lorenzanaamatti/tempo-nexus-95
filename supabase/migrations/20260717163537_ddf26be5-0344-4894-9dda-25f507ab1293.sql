
CREATE TABLE public.candidacy_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidacy_id uuid NOT NULL REFERENCES public.candidacies(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidacy_files TO authenticated;
GRANT ALL ON public.candidacy_files TO service_role;

ALTER TABLE public.candidacy_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "IC can manage candidacy files"
  ON public.candidacy_files FOR ALL
  USING (public.current_user_is_admin() OR public.has_role(auth.uid(), 'team'))
  WITH CHECK (public.current_user_is_admin() OR public.has_role(auth.uid(), 'team'));

CREATE INDEX idx_candidacy_files_candidacy ON public.candidacy_files(candidacy_id);

-- Storage policies for candidacy-files bucket
CREATE POLICY "IC read candidacy-files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'candidacy-files' AND (public.current_user_is_admin() OR public.has_role(auth.uid(), 'team')));

CREATE POLICY "IC upload candidacy-files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'candidacy-files' AND (public.current_user_is_admin() OR public.has_role(auth.uid(), 'team')));

CREATE POLICY "IC update candidacy-files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'candidacy-files' AND (public.current_user_is_admin() OR public.has_role(auth.uid(), 'team')));

CREATE POLICY "IC delete candidacy-files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'candidacy-files' AND (public.current_user_is_admin() OR public.has_role(auth.uid(), 'team')));
