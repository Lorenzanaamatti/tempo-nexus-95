
-- Índices para acelerar listados paginados/ordenados
CREATE INDEX IF NOT EXISTS idx_productions_title ON public.productions (title);
CREATE INDEX IF NOT EXISTS idx_productions_created_at ON public.productions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_productions_status ON public.productions (status);
CREATE INDEX IF NOT EXISTS idx_productions_year ON public.productions (year DESC);
CREATE INDEX IF NOT EXISTS idx_productions_composer_id ON public.productions (composer_id);

CREATE INDEX IF NOT EXISTS idx_opportunities_created_at ON public.opportunities (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_title ON public.opportunities (title);
CREATE INDEX IF NOT EXISTS idx_opportunities_responsible ON public.opportunities (responsible_person_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_expected_close ON public.opportunities (expected_close_date);

CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON public.contracts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_title ON public.contracts (title);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON public.contracts (end_date);
CREATE INDEX IF NOT EXISTS idx_contracts_composer_id ON public.contracts (composer_id);

CREATE INDEX IF NOT EXISTS idx_providers_name ON public.providers (name);
CREATE INDEX IF NOT EXISTS idx_providers_kind ON public.providers (kind);
CREATE INDEX IF NOT EXISTS idx_providers_created_at ON public.providers (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_people_full_name ON public.people (full_name);
CREATE INDEX IF NOT EXISTS idx_people_role ON public.people (role);
CREATE INDEX IF NOT EXISTS idx_people_created_at ON public.people (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_spanish_films_title ON public.spanish_films (title);
CREATE INDEX IF NOT EXISTS idx_spanish_films_year ON public.spanish_films (year DESC);
CREATE INDEX IF NOT EXISTS idx_spanish_films_release_date ON public.spanish_films (release_date DESC);
CREATE INDEX IF NOT EXISTS idx_spanish_films_needs_review ON public.spanish_films (needs_review);

CREATE INDEX IF NOT EXISTS idx_directors_full_name ON public.directors (full_name);
CREATE INDEX IF NOT EXISTS idx_production_companies_name ON public.production_companies (name);
CREATE INDEX IF NOT EXISTS idx_platforms_name ON public.platforms (name);

CREATE INDEX IF NOT EXISTS idx_composers_full_name ON public.composers (full_name);
CREATE INDEX IF NOT EXISTS idx_composers_tier ON public.composers (tier);
CREATE INDEX IF NOT EXISTS idx_composers_roster_role ON public.composers (roster_role);

CREATE INDEX IF NOT EXISTS idx_actions_assignee_due ON public.actions (assignee_person_id, due_date);
CREATE INDEX IF NOT EXISTS idx_actions_subject ON public.actions (subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_actions_done ON public.actions (done);

CREATE INDEX IF NOT EXISTS idx_calendar_events_start_date ON public.calendar_events (start_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_assignee ON public.calendar_events (assignee_person_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_subject ON public.calendar_events (subject_type, subject_id);

CREATE INDEX IF NOT EXISTS idx_target_accounts_status ON public.target_accounts (status);
CREATE INDEX IF NOT EXISTS idx_target_accounts_responsible ON public.target_accounts (responsible_person_id);
CREATE INDEX IF NOT EXISTS idx_target_accounts_next_step_date ON public.target_accounts (next_step_date);
CREATE INDEX IF NOT EXISTS idx_target_accounts_account_type ON public.target_accounts (account_type);

CREATE INDEX IF NOT EXISTS idx_candidacies_status ON public.candidacies (status);
CREATE INDEX IF NOT EXISTS idx_candidacies_received_at ON public.candidacies (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_candidacies_reviewer ON public.candidacies (reviewer_id);
