
ALTER TABLE public.productions
  ADD CONSTRAINT productions_composer_fk FOREIGN KEY (composer_id) REFERENCES public.composers(id) ON DELETE SET NULL;

ALTER TABLE public.productions
  ADD CONSTRAINT productions_negotiator_fk FOREIGN KEY (negotiator_person_id) REFERENCES public.people(id) ON DELETE SET NULL;

ALTER TABLE public.production_documents
  ADD CONSTRAINT production_documents_production_fk FOREIGN KEY (production_id) REFERENCES public.productions(id) ON DELETE CASCADE;
