
-- ============ DEAL MEMOS: admin-only ============
DROP POLICY IF EXISTS "auth_all_deal_memos" ON public.deal_memos;
DROP POLICY IF EXISTS "auth_all_dm_versiones" ON public.deal_memo_versiones;
DROP POLICY IF EXISTS "auth_all_dm_eventos" ON public.deal_memo_eventos;
DROP POLICY IF EXISTS "auth_all_dm_contactos" ON public.dm_contactos;
DROP POLICY IF EXISTS "auth_all_dm_plantillas" ON public.dm_plantillas;

CREATE POLICY "deal_memos admin all" ON public.deal_memos
  FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE POLICY "dm_versiones admin all" ON public.deal_memo_versiones
  FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE POLICY "dm_eventos admin all" ON public.deal_memo_eventos
  FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE POLICY "dm_contactos admin all" ON public.dm_contactos
  FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE POLICY "dm_plantillas admin all" ON public.dm_plantillas
  FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

-- ============ ADMIN-ONLY READ for internal tables ============
DROP POLICY IF EXISTS "actions read" ON public.actions;
CREATE POLICY "actions read" ON public.actions FOR SELECT TO authenticated
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "documents read" ON public.documents;
CREATE POLICY "documents read" ON public.documents FOR SELECT TO authenticated
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "pva read authenticated" ON public.person_verifier_assignments;
CREATE POLICY "pva read" ON public.person_verifier_assignments FOR SELECT TO authenticated
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "target_accounts read" ON public.target_accounts;
CREATE POLICY "target_accounts read" ON public.target_accounts FOR SELECT TO authenticated
  USING (public.current_user_is_admin());

-- ============ COMPOSER-SCOPED READ ============
DROP POLICY IF EXISTS "case_studies read" ON public.case_studies;
CREATE POLICY "case_studies read" ON public.case_studies FOR SELECT TO authenticated
  USING (
    public.current_user_is_admin()
    OR (composer_id IS NOT NULL AND public.can_access_composer(composer_id))
  );

DROP POLICY IF EXISTS "calendar_events read" ON public.calendar_events;
CREATE POLICY "calendar_events read" ON public.calendar_events FOR SELECT TO authenticated
  USING (
    public.current_user_is_admin()
    OR (source_composer_id IS NOT NULL AND public.can_access_composer(source_composer_id))
    OR (subject_type = 'composer' AND public.can_access_composer(subject_id))
  );

DROP POLICY IF EXISTS "prod_assign read" ON public.production_assignments;
CREATE POLICY "prod_assign read" ON public.production_assignments FOR SELECT TO authenticated
  USING (
    public.current_user_is_admin()
    OR (composer_id IS NOT NULL AND public.can_access_composer(composer_id))
  );

DROP POLICY IF EXISTS "prod_documents read" ON public.production_documents;
CREATE POLICY "prod_documents read" ON public.production_documents FOR SELECT TO authenticated
  USING (
    public.current_user_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.productions p
       WHERE p.id = production_documents.production_id
         AND p.composer_id IS NOT NULL
         AND public.can_access_composer(p.composer_id)
    )
  );

-- ============ REALTIME: channel subscription authorization ============
-- Topic format used by the app: 'chat-msg-<chat_channels.id>'
-- Allow SELECT on realtime.messages only when the user can access the channel.
DROP POLICY IF EXISTS "chat realtime subscribe" ON realtime.messages;
CREATE POLICY "chat realtime subscribe" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.chat_channels c
      WHERE realtime.topic() = 'chat-msg-' || c.id::text
        AND public.can_access_composer(c.composer_id)
    )
  );
