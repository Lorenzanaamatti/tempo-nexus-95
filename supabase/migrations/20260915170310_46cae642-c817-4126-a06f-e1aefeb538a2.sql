CREATE POLICY "pitch composers read own" ON public.oportunidades_pitch_composers
  FOR SELECT TO authenticated
  USING (public.can_access_composer(composer_id));

CREATE POLICY "pitches read own composer" ON public.oportunidades_pitches
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.oportunidades_pitch_composers pc
      WHERE pc.pitch_id = oportunidades_pitches.id
        AND public.can_access_composer(pc.composer_id)
    )
  );