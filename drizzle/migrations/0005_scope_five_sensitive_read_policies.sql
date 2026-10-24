-- Restrict only the five exposed SELECT policies. Preserve all rows, grants,
-- role assignments, write policies and existing parent-post visibility.
ALTER POLICY "sales_document_compositions read"
ON public.sales_document_compositions
USING (public.current_user_is_staff());

ALTER POLICY "sales_document_composition_items read"
ON public.sales_document_composition_items
USING (public.current_user_is_staff());

ALTER POLICY "sales_document_outputs read"
ON public.sales_document_outputs
USING (public.current_user_is_staff());

-- Staff keep their operational access. Roster users inherit precisely the
-- visibility of the parent post through its existing RLS policy.
ALTER POLICY "social_post_assets read"
ON public.social_post_assets
USING (
  public.current_user_is_staff()
  OR EXISTS (
    SELECT 1 FROM public.social_posts AS post
    WHERE post.id = social_post_assets.post_id
  )
);

ALTER POLICY "social_post_metrics read"
ON public.social_post_metrics
USING (
  public.current_user_is_staff()
  OR EXISTS (
    SELECT 1 FROM public.social_posts AS post
    WHERE post.id = social_post_metrics.post_id
  )
);