import { supabase } from "@/integrations/supabase/client";

export async function fetchComposerRelations(composerId: string) {
      const [demos, films, awards, styles, genres, langs, docs, projects, agents, candidacies, productions, contracts] = await Promise.all([
        supabase.from("composer_demos").select("*").eq("composer_id", composerId).order("position"),
        supabase.from("composer_filmography").select("*").eq("composer_id", composerId).order("position"),
        supabase.from("composer_awards").select("*").eq("composer_id", composerId).order("position"),
        supabase.from("composer_styles").select("style_id").eq("composer_id", composerId),
        supabase.from("composer_genres").select("genre_id").eq("composer_id", composerId),
        supabase.from("composer_languages").select("language_code").eq("composer_id", composerId),
        supabase.from("composer_documents").select("*").eq("composer_id", composerId).order("position"),
        supabase.from("composer_projects").select("*").eq("composer_id", composerId).order("year", { ascending: false }),
        supabase.from("ic_team").select("id, full_name, email").eq("role", "ic_team").order("full_name"),
        (supabase as any)
          .from("opportunity_candidates")
          .select("id, note, created_at, opportunity:opportunities(id, title, statuses, partner_name, expected_close_date, estimated_value)")
          .eq("composer_id", composerId)
          .order("created_at", { ascending: false }),
        (async () => {
          const PROD_SELECT = "id, title, year, status, platform, director, premiere_date, delivery_date, fee_amount, ic_commission, ic_commission_pct, composer_id, billing_sprints:production_billing_sprints!production_billing_sprints_production_id_fkey(id, sprint_number, kind, label, amount, status, due_date, invoiced_date, paid_date, holded_invoice_ref, holded_url)";
          // También capturamos producciones donde esta persona figura como
          // supervisora musical (FK a people.id).
          const { data: personRowProd } = await supabase
            .from("people")
            .select("id")
            .eq("composer_id", composerId)
            .maybeSingle();
          const [direct, viaAssign, viaSupervisor] = await Promise.all([
            supabase.from("productions").select(PROD_SELECT).eq("composer_id", composerId),
            (supabase as any)
              .from("production_assignments")
              .select(`production:productions(${PROD_SELECT})`)
              .eq("composer_id", composerId),
            personRowProd?.id
              ? (supabase as any)
                  .from("productions")
                  .select(PROD_SELECT)
                  .eq("music_supervisor_person_id", personRowProd.id)
              : Promise.resolve({ data: [], error: null }),
          ]);
          const map = new Map<string, any>();
          (direct.data ?? []).forEach((p: any) => map.set(p.id, p));
          ((viaAssign.data ?? []) as any[]).forEach((row: any) => {
            if (row.production) map.set(row.production.id, row.production);
          });
          ((viaSupervisor.data ?? []) as any[]).forEach((p: any) => map.set(p.id, p));
          const arr = Array.from(map.values()).sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
          return { data: arr, error: direct.error ?? viaAssign.error };
        })(),
        supabase
          .from("contracts")
          .select("id, title, contract_type, sign_status, signed_date, end_date, notice_date")
          .or(`composer_id.eq.${composerId},signer_composer_id.eq.${composerId}`)
          .order("signed_date", { ascending: false, nullsFirst: false }),
      ]);
      // Películas ES vinculadas: a través de people.composer_id
      const { data: personRow } = await supabase
        .from("people")
        .select("id")
        .eq("composer_id", composerId)
        .maybeSingle();
      let spanishFilms: any[] = [];
      if (personRow?.id) {
        const { data: sf } = await supabase
          .from("spanish_films")
          .select("id, year, title, title_es, composer_person_id, music_supervisor_person_id, platform, directors")
          .or(
            `composer_person_id.eq.${personRow.id},music_supervisor_person_id.eq.${personRow.id}`,
          )
          .order("year", { ascending: false });
        spanishFilms = (sf ?? []).map((f: any) => ({
          ...f,
          role: f.composer_person_id === personRow.id ? "Compositor BSO" : "Supervisor musical",
        }));
      }
      return {
        demos: demos.data ?? [],
        films: films.data ?? [],
        awards: awards.data ?? [],
        styleIds: new Set((styles.data ?? []).map((r: any) => r.style_id)),
        genreIds: new Set((genres.data ?? []).map((r: any) => r.genre_id)),
        langCodes: new Set((langs.data ?? []).map((r: any) => r.language_code)),
        docs: docs.data ?? [],
        projects: projects.data ?? [],
        agents: agents.data ?? [],
        candidacies: (candidacies as any).data ?? [],
        productions: productions.data ?? [],
        contracts: contracts.data ?? [],
        spanishFilms,
      };
    }
