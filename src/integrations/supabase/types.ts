export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      av_genres: {
        Row: {
          id: string
          label_ca: string | null
          label_en: string | null
          label_es: string
          position: number
          slug: string
        }
        Insert: {
          id?: string
          label_ca?: string | null
          label_en?: string | null
          label_es: string
          position?: number
          slug: string
        }
        Update: {
          id?: string
          label_ca?: string | null
          label_en?: string | null
          label_es?: string
          position?: number
          slug?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          created_at: string
          end_date: string
          id: string
          kind: Database["public"]["Enums"]["availability_kind"]
          note: string | null
          source_sprint_id: string | null
          start_date: string
          subject_id: string
          subject_type: Database["public"]["Enums"]["calendar_subject_type"]
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          kind?: Database["public"]["Enums"]["availability_kind"]
          note?: string | null
          source_sprint_id?: string | null
          start_date: string
          subject_id: string
          subject_type: Database["public"]["Enums"]["calendar_subject_type"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          kind?: Database["public"]["Enums"]["availability_kind"]
          note?: string | null
          source_sprint_id?: string | null
          start_date?: string
          subject_id?: string
          subject_type?: Database["public"]["Enums"]["calendar_subject_type"]
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      composer_availability: {
        Row: {
          composer_id: string
          created_at: string
          end_date: string
          id: string
          kind: Database["public"]["Enums"]["availability_kind"]
          note: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          composer_id: string
          created_at?: string
          end_date: string
          id?: string
          kind?: Database["public"]["Enums"]["availability_kind"]
          note?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          composer_id?: string
          created_at?: string
          end_date?: string
          id?: string
          kind?: Database["public"]["Enums"]["availability_kind"]
          note?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      composer_awards: {
        Row: {
          composer_id: string
          created_at: string
          id: string
          note: string | null
          position: number
          title: string
          year: number | null
        }
        Insert: {
          composer_id: string
          created_at?: string
          id?: string
          note?: string | null
          position?: number
          title: string
          year?: number | null
        }
        Update: {
          composer_id?: string
          created_at?: string
          id?: string
          note?: string | null
          position?: number
          title?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "composer_awards_composer_id_fkey"
            columns: ["composer_id"]
            isOneToOne: false
            referencedRelation: "composers"
            referencedColumns: ["id"]
          },
        ]
      }
      composer_demos: {
        Row: {
          category: string | null
          composer_id: string
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          position: number
          title: string
          url: string | null
        }
        Insert: {
          category?: string | null
          composer_id: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          position?: number
          title: string
          url?: string | null
        }
        Update: {
          category?: string | null
          composer_id?: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          position?: number
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "composer_demos_composer_id_fkey"
            columns: ["composer_id"]
            isOneToOne: false
            referencedRelation: "composers"
            referencedColumns: ["id"]
          },
        ]
      }
      composer_documents: {
        Row: {
          composer_id: string
          created_at: string
          id: string
          kind: string | null
          notes: string | null
          position: number
          storage_path: string | null
          title: string
          url: string | null
        }
        Insert: {
          composer_id: string
          created_at?: string
          id?: string
          kind?: string | null
          notes?: string | null
          position?: number
          storage_path?: string | null
          title: string
          url?: string | null
        }
        Update: {
          composer_id?: string
          created_at?: string
          id?: string
          kind?: string | null
          notes?: string | null
          position?: number
          storage_path?: string | null
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "composer_documents_composer_id_fkey"
            columns: ["composer_id"]
            isOneToOne: false
            referencedRelation: "composers"
            referencedColumns: ["id"]
          },
        ]
      }
      composer_filmography: {
        Row: {
          composer_id: string
          country: string | null
          created_at: string
          director: string | null
          format: Database["public"]["Enums"]["film_format"]
          id: string
          position: number
          production_company: string | null
          title: string
          url: string | null
          year: number | null
        }
        Insert: {
          composer_id: string
          country?: string | null
          created_at?: string
          director?: string | null
          format?: Database["public"]["Enums"]["film_format"]
          id?: string
          position?: number
          production_company?: string | null
          title: string
          url?: string | null
          year?: number | null
        }
        Update: {
          composer_id?: string
          country?: string | null
          created_at?: string
          director?: string | null
          format?: Database["public"]["Enums"]["film_format"]
          id?: string
          position?: number
          production_company?: string | null
          title?: string
          url?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "composer_filmography_composer_id_fkey"
            columns: ["composer_id"]
            isOneToOne: false
            referencedRelation: "composers"
            referencedColumns: ["id"]
          },
        ]
      }
      composer_genres: {
        Row: {
          composer_id: string
          genre_id: string
        }
        Insert: {
          composer_id: string
          genre_id: string
        }
        Update: {
          composer_id?: string
          genre_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "composer_genres_composer_id_fkey"
            columns: ["composer_id"]
            isOneToOne: false
            referencedRelation: "composers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "composer_genres_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "av_genres"
            referencedColumns: ["id"]
          },
        ]
      }
      composer_languages: {
        Row: {
          composer_id: string
          language_code: string
        }
        Insert: {
          composer_id: string
          language_code: string
        }
        Update: {
          composer_id?: string
          language_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "composer_languages_composer_id_fkey"
            columns: ["composer_id"]
            isOneToOne: false
            referencedRelation: "composers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "composer_languages_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
      composer_photos: {
        Row: {
          composer_id: string
          copyright: string | null
          created_at: string
          id: string
          position: number
          storage_path: string
          year: number | null
        }
        Insert: {
          composer_id: string
          copyright?: string | null
          created_at?: string
          id?: string
          position?: number
          storage_path: string
          year?: number | null
        }
        Update: {
          composer_id?: string
          copyright?: string | null
          created_at?: string
          id?: string
          position?: number
          storage_path?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "composer_photos_composer_id_fkey"
            columns: ["composer_id"]
            isOneToOne: false
            referencedRelation: "composers"
            referencedColumns: ["id"]
          },
        ]
      }
      composer_projects: {
        Row: {
          agency_commission: number | null
          composer_id: string
          composer_profit: number | null
          created_at: string
          director: string | null
          id: string
          music_type: string | null
          net_margin: number | null
          notes: string | null
          platform: string | null
          position: number
          price_charged: number | null
          production: string
          production_company: string | null
          production_cost: number | null
          production_type: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          agency_commission?: number | null
          composer_id: string
          composer_profit?: number | null
          created_at?: string
          director?: string | null
          id?: string
          music_type?: string | null
          net_margin?: number | null
          notes?: string | null
          platform?: string | null
          position?: number
          price_charged?: number | null
          production: string
          production_company?: string | null
          production_cost?: number | null
          production_type?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          agency_commission?: number | null
          composer_id?: string
          composer_profit?: number | null
          created_at?: string
          director?: string | null
          id?: string
          music_type?: string | null
          net_margin?: number | null
          notes?: string | null
          platform?: string | null
          position?: number
          price_charged?: number | null
          production?: string
          production_company?: string | null
          production_cost?: number | null
          production_type?: string | null
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
      composer_styles: {
        Row: {
          composer_id: string
          style_id: string
        }
        Insert: {
          composer_id: string
          style_id: string
        }
        Update: {
          composer_id?: string
          style_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "composer_styles_composer_id_fkey"
            columns: ["composer_id"]
            isOneToOne: false
            referencedRelation: "composers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "composer_styles_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "music_styles"
            referencedColumns: ["id"]
          },
        ]
      }
      composer_team_assignments: {
        Row: {
          composer_id: string
          created_at: string
          id: string
          kpi_review: string | null
          kpi_review_date: string | null
          objectives: string | null
          person_id: string
          position: number
          role_other: string | null
          start_date: string | null
          team_role: Database["public"]["Enums"]["composer_team_role"]
          updated_at: string
        }
        Insert: {
          composer_id: string
          created_at?: string
          id?: string
          kpi_review?: string | null
          kpi_review_date?: string | null
          objectives?: string | null
          person_id: string
          position?: number
          role_other?: string | null
          start_date?: string | null
          team_role: Database["public"]["Enums"]["composer_team_role"]
          updated_at?: string
        }
        Update: {
          composer_id?: string
          created_at?: string
          id?: string
          kpi_review?: string | null
          kpi_review_date?: string | null
          objectives?: string | null
          person_id?: string
          position?: number
          role_other?: string | null
          start_date?: string | null
          team_role?: Database["public"]["Enums"]["composer_team_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "composer_team_assignments_composer_id_fkey"
            columns: ["composer_id"]
            isOneToOne: false
            referencedRelation: "composers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "composer_team_assignments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      composers: {
        Row: {
          address: string | null
          agent_person_id: string | null
          artistic_name: string | null
          availability: Database["public"]["Enums"]["availability_status"]
          bio_long: string | null
          bio_short: string | null
          birth_year: number | null
          career_notes: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          email_secondary: string | null
          fee_range_id: string | null
          full_name: string
          id: string
          internal_notes: string | null
          legal_name: string | null
          next_available_on: string | null
          nif: string | null
          owner_email: string | null
          owner_user_id: string | null
          phone: string | null
          photo_path: string | null
          portal_url: string | null
          postal_code: string | null
          province: string | null
          reel_url: string | null
          renewal_date: string | null
          representation_start_date: string | null
          representation_status: Database["public"]["Enums"]["representation_status"]
          roster_role: Database["public"]["Enums"]["roster_role"]
          search_tsv: unknown
          slug: string
          tags: string[]
          team_email: string | null
          team_name: string | null
          tier: Database["public"]["Enums"]["representation_tier"] | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          agent_person_id?: string | null
          artistic_name?: string | null
          availability?: Database["public"]["Enums"]["availability_status"]
          bio_long?: string | null
          bio_short?: string | null
          birth_year?: number | null
          career_notes?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          email_secondary?: string | null
          fee_range_id?: string | null
          full_name: string
          id?: string
          internal_notes?: string | null
          legal_name?: string | null
          next_available_on?: string | null
          nif?: string | null
          owner_email?: string | null
          owner_user_id?: string | null
          phone?: string | null
          photo_path?: string | null
          portal_url?: string | null
          postal_code?: string | null
          province?: string | null
          reel_url?: string | null
          renewal_date?: string | null
          representation_start_date?: string | null
          representation_status?: Database["public"]["Enums"]["representation_status"]
          roster_role?: Database["public"]["Enums"]["roster_role"]
          search_tsv?: unknown
          slug: string
          tags?: string[]
          team_email?: string | null
          team_name?: string | null
          tier?: Database["public"]["Enums"]["representation_tier"] | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          agent_person_id?: string | null
          artistic_name?: string | null
          availability?: Database["public"]["Enums"]["availability_status"]
          bio_long?: string | null
          bio_short?: string | null
          birth_year?: number | null
          career_notes?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          email_secondary?: string | null
          fee_range_id?: string | null
          full_name?: string
          id?: string
          internal_notes?: string | null
          legal_name?: string | null
          next_available_on?: string | null
          nif?: string | null
          owner_email?: string | null
          owner_user_id?: string | null
          phone?: string | null
          photo_path?: string | null
          portal_url?: string | null
          postal_code?: string | null
          province?: string | null
          reel_url?: string | null
          renewal_date?: string | null
          representation_start_date?: string | null
          representation_status?: Database["public"]["Enums"]["representation_status"]
          roster_role?: Database["public"]["Enums"]["roster_role"]
          search_tsv?: unknown
          slug?: string
          tags?: string[]
          team_email?: string | null
          team_name?: string | null
          tier?: Database["public"]["Enums"]["representation_tier"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "composers_agent_person_id_fkey"
            columns: ["agent_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "composers_fee_range_id_fkey"
            columns: ["fee_range_id"]
            isOneToOne: false
            referencedRelation: "fee_ranges"
            referencedColumns: ["id"]
          },
        ]
      }
      directors: {
        Row: {
          agent: string | null
          country: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          imdb_url: string | null
          notes: string | null
          phone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          agent?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          imdb_url?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          agent?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          imdb_url?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      fee_ranges: {
        Row: {
          code: string
          id: string
          label: string
          position: number
        }
        Insert: {
          code: string
          id?: string
          label: string
          position?: number
        }
        Update: {
          code?: string
          id?: string
          label?: string
          position?: number
        }
        Relationships: []
      }
      languages: {
        Row: {
          code: string
          label_ca: string | null
          label_en: string | null
          label_es: string
        }
        Insert: {
          code: string
          label_ca?: string | null
          label_en?: string | null
          label_es: string
        }
        Update: {
          code?: string
          label_ca?: string | null
          label_en?: string | null
          label_es?: string
        }
        Relationships: []
      }
      music_styles: {
        Row: {
          id: string
          label_ca: string | null
          label_en: string | null
          label_es: string
          position: number
          slug: string
        }
        Insert: {
          id?: string
          label_ca?: string | null
          label_en?: string | null
          label_es: string
          position?: number
          slug: string
        }
        Update: {
          id?: string
          label_ca?: string | null
          label_en?: string | null
          label_es?: string
          position?: number
          slug?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          created_at: string
          estimated_value: number | null
          id: string
          notes: string | null
          partner_company_id: string | null
          partner_name: string | null
          probability_pct: number | null
          responsible_person_id: string | null
          statuses: Database["public"]["Enums"]["opportunity_status"][]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          estimated_value?: number | null
          id?: string
          notes?: string | null
          partner_company_id?: string | null
          partner_name?: string | null
          probability_pct?: number | null
          responsible_person_id?: string | null
          statuses?: Database["public"]["Enums"]["opportunity_status"][]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          estimated_value?: number | null
          id?: string
          notes?: string | null
          partner_company_id?: string | null
          partner_name?: string | null
          probability_pct?: number | null
          responsible_person_id?: string | null
          statuses?: Database["public"]["Enums"]["opportunity_status"][]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_partner_company_id_fkey"
            columns: ["partner_company_id"]
            isOneToOne: false
            referencedRelation: "production_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_responsible_person_id_fkey"
            columns: ["responsible_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_actions: {
        Row: {
          created_at: string
          done: boolean
          done_at: string | null
          due_date: string | null
          id: string
          notes: string | null
          opportunity_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          done_at?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          opportunity_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          done?: boolean
          done_at?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          opportunity_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_actions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_candidates: {
        Row: {
          composer_id: string
          created_at: string
          id: string
          note: string | null
          opportunity_id: string
        }
        Insert: {
          composer_id: string
          created_at?: string
          id?: string
          note?: string | null
          opportunity_id: string
        }
        Update: {
          composer_id?: string
          created_at?: string
          id?: string
          note?: string | null
          opportunity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_candidates_composer_id_fkey"
            columns: ["composer_id"]
            isOneToOne: false
            referencedRelation: "composers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_candidates_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          composer_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          role: Database["public"]["Enums"]["person_role"]
          updated_at: string
        }
        Insert: {
          composer_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          role: Database["public"]["Enums"]["person_role"]
          updated_at?: string
        }
        Update: {
          composer_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["person_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_composer_id_fkey"
            columns: ["composer_id"]
            isOneToOne: true
            referencedRelation: "composers"
            referencedColumns: ["id"]
          },
        ]
      }
      platforms: {
        Row: {
          contact_name: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          contact_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          contact_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      production_assignments: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          note: string | null
          person_id: string
          production_id: string
          role_in_project: string | null
          start_date: string | null
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          note?: string | null
          person_id: string
          production_id: string
          role_in_project?: string | null
          start_date?: string | null
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          note?: string | null
          person_id?: string
          production_id?: string
          role_in_project?: string | null
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_assignments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_assignments_production_id_fkey"
            columns: ["production_id"]
            isOneToOne: false
            referencedRelation: "productions"
            referencedColumns: ["id"]
          },
        ]
      }
      production_billing_sprints: {
        Row: {
          amount: number | null
          created_at: string
          due_date: string | null
          id: string
          invoiced_date: string | null
          kind: Database["public"]["Enums"]["billing_sprint_kind"]
          label: string | null
          notes: string | null
          paid_date: string | null
          production_id: string
          sprint_number: number
          status: Database["public"]["Enums"]["billing_sprint_status"]
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          due_date?: string | null
          id?: string
          invoiced_date?: string | null
          kind: Database["public"]["Enums"]["billing_sprint_kind"]
          label?: string | null
          notes?: string | null
          paid_date?: string | null
          production_id: string
          sprint_number: number
          status?: Database["public"]["Enums"]["billing_sprint_status"]
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          due_date?: string | null
          id?: string
          invoiced_date?: string | null
          kind?: Database["public"]["Enums"]["billing_sprint_kind"]
          label?: string | null
          notes?: string | null
          paid_date?: string | null
          production_id?: string
          sprint_number?: number
          status?: Database["public"]["Enums"]["billing_sprint_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_billing_sprints_production_id_fkey"
            columns: ["production_id"]
            isOneToOne: false
            referencedRelation: "productions"
            referencedColumns: ["id"]
          },
        ]
      }
      production_companies: {
        Row: {
          address: string | null
          area_managers: string | null
          cif: string | null
          city: string | null
          contact_name: string | null
          contract_notes: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          legal_name: string | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          area_managers?: string | null
          cif?: string | null
          city?: string | null
          contact_name?: string | null
          contract_notes?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          legal_name?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          area_managers?: string | null
          cif?: string | null
          city?: string | null
          contact_name?: string | null
          contract_notes?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          legal_name?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      production_documents: {
        Row: {
          created_at: string
          id: string
          kind: string | null
          notes: string | null
          position: number
          production_id: string
          storage_path: string | null
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string | null
          notes?: string | null
          position?: number
          production_id: string
          storage_path?: string | null
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string | null
          notes?: string | null
          position?: number
          production_id?: string
          storage_path?: string | null
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_documents_production_fk"
            columns: ["production_id"]
            isOneToOne: false
            referencedRelation: "productions"
            referencedColumns: ["id"]
          },
        ]
      }
      productions: {
        Row: {
          color: string | null
          composer_id: string | null
          created_at: string
          delivery_date: string | null
          director: string | null
          director_id: string | null
          external_composer: string | null
          fee_amount: number | null
          ic_commission: number | null
          ic_commission_pct: number | null
          id: string
          imdb_url: string | null
          kind: string | null
          music_supervisor_name: string | null
          music_supervisor_person_id: string | null
          negotiator_person_id: string | null
          notes: string | null
          other_responsibles: string | null
          partner: string | null
          partner_company_id: string | null
          platform: string | null
          platform_id: string | null
          postproduction_supervisor_name: string | null
          postproduction_supervisor_person_id: string | null
          premiere_date: string | null
          production_company: string | null
          production_director_name: string | null
          production_director_person_id: string | null
          project_type: Database["public"]["Enums"]["production_kind"] | null
          status: Database["public"]["Enums"]["production_status"] | null
          title: string
          updated_at: string
          year: number | null
        }
        Insert: {
          color?: string | null
          composer_id?: string | null
          created_at?: string
          delivery_date?: string | null
          director?: string | null
          director_id?: string | null
          external_composer?: string | null
          fee_amount?: number | null
          ic_commission?: number | null
          ic_commission_pct?: number | null
          id?: string
          imdb_url?: string | null
          kind?: string | null
          music_supervisor_name?: string | null
          music_supervisor_person_id?: string | null
          negotiator_person_id?: string | null
          notes?: string | null
          other_responsibles?: string | null
          partner?: string | null
          partner_company_id?: string | null
          platform?: string | null
          platform_id?: string | null
          postproduction_supervisor_name?: string | null
          postproduction_supervisor_person_id?: string | null
          premiere_date?: string | null
          production_company?: string | null
          production_director_name?: string | null
          production_director_person_id?: string | null
          project_type?: Database["public"]["Enums"]["production_kind"] | null
          status?: Database["public"]["Enums"]["production_status"] | null
          title: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          color?: string | null
          composer_id?: string | null
          created_at?: string
          delivery_date?: string | null
          director?: string | null
          director_id?: string | null
          external_composer?: string | null
          fee_amount?: number | null
          ic_commission?: number | null
          ic_commission_pct?: number | null
          id?: string
          imdb_url?: string | null
          kind?: string | null
          music_supervisor_name?: string | null
          music_supervisor_person_id?: string | null
          negotiator_person_id?: string | null
          notes?: string | null
          other_responsibles?: string | null
          partner?: string | null
          partner_company_id?: string | null
          platform?: string | null
          platform_id?: string | null
          postproduction_supervisor_name?: string | null
          postproduction_supervisor_person_id?: string | null
          premiere_date?: string | null
          production_company?: string | null
          production_director_name?: string | null
          production_director_person_id?: string | null
          project_type?: Database["public"]["Enums"]["production_kind"] | null
          status?: Database["public"]["Enums"]["production_status"] | null
          title?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "productions_composer_fk"
            columns: ["composer_id"]
            isOneToOne: false
            referencedRelation: "composers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productions_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productions_music_supervisor_person_id_fkey"
            columns: ["music_supervisor_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productions_negotiator_fk"
            columns: ["negotiator_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productions_partner_company_id_fkey"
            columns: ["partner_company_id"]
            isOneToOne: false
            referencedRelation: "production_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productions_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productions_postproduction_supervisor_person_id_fkey"
            columns: ["postproduction_supervisor_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productions_production_director_person_id_fkey"
            columns: ["production_director_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          composer_id: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          composer_id?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          composer_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_composer: { Args: { _composer_id: string }; Returns: boolean }
      current_user_is_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "composer"
      availability_kind:
        | "libre"
        | "ocupado"
        | "vacaciones"
        | "personal"
        | "produccion"
        | "facturacion"
        | "pago"
        | "cobro"
      availability_status: "available" | "partial" | "unavailable"
      billing_sprint_kind: "trabajo" | "comision"
      billing_sprint_status: "pendiente" | "facturado" | "cobrado"
      calendar_subject_type: "person" | "production"
      composer_team_role:
        | "agente"
        | "manager"
        | "producer"
        | "comunicacion"
        | "facturacion"
        | "pagos"
        | "otro"
      film_format:
        | "feature"
        | "series"
        | "doc"
        | "short"
        | "spot"
        | "game"
        | "other"
      opportunity_status:
        | "identificado"
        | "primer_contacto"
        | "propuesta_enviada"
        | "negociacion"
        | "cerrado"
        | "descartado"
      person_role:
        | "ic_team"
        | "composer"
        | "artist"
        | "supervisor"
        | "specialist"
        | "curator"
        | "other"
      production_kind:
        | "cine"
        | "serie"
        | "plataforma"
        | "publicidad"
        | "videojuego"
        | "documental"
      production_status:
        | "pitch_enviado"
        | "negociacion"
        | "contrato_firmado"
        | "fechas_rodaje"
        | "fechas_montaje"
        | "entrega_visuales"
        | "corte_intermedio_1"
        | "corte_intermedio_2"
        | "corte_intermedio_3"
        | "entrega_musica"
        | "mezclas"
        | "sprint_1"
        | "sprint_2"
        | "sprint_3"
        | "sprint_4"
        | "sprint_5"
        | "sprint_6"
        | "facturado"
        | "cobrado"
      representation_status:
        | "activo"
        | "pausa"
        | "en_negociacion"
        | "finalizado"
      representation_tier: "A" | "B" | "C" | "desarrollo"
      roster_role:
        | "composer"
        | "artist"
        | "supervisor"
        | "specialist"
        | "curator"
        | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "composer"],
      availability_kind: [
        "libre",
        "ocupado",
        "vacaciones",
        "personal",
        "produccion",
        "facturacion",
        "pago",
        "cobro",
      ],
      availability_status: ["available", "partial", "unavailable"],
      billing_sprint_kind: ["trabajo", "comision"],
      billing_sprint_status: ["pendiente", "facturado", "cobrado"],
      calendar_subject_type: ["person", "production"],
      composer_team_role: [
        "agente",
        "manager",
        "producer",
        "comunicacion",
        "facturacion",
        "pagos",
        "otro",
      ],
      film_format: [
        "feature",
        "series",
        "doc",
        "short",
        "spot",
        "game",
        "other",
      ],
      opportunity_status: [
        "identificado",
        "primer_contacto",
        "propuesta_enviada",
        "negociacion",
        "cerrado",
        "descartado",
      ],
      person_role: [
        "ic_team",
        "composer",
        "artist",
        "supervisor",
        "specialist",
        "curator",
        "other",
      ],
      production_kind: [
        "cine",
        "serie",
        "plataforma",
        "publicidad",
        "videojuego",
        "documental",
      ],
      production_status: [
        "pitch_enviado",
        "negociacion",
        "contrato_firmado",
        "fechas_rodaje",
        "fechas_montaje",
        "entrega_visuales",
        "corte_intermedio_1",
        "corte_intermedio_2",
        "corte_intermedio_3",
        "entrega_musica",
        "mezclas",
        "sprint_1",
        "sprint_2",
        "sprint_3",
        "sprint_4",
        "sprint_5",
        "sprint_6",
        "facturado",
        "cobrado",
      ],
      representation_status: [
        "activo",
        "pausa",
        "en_negociacion",
        "finalizado",
      ],
      representation_tier: ["A", "B", "C", "desarrollo"],
      roster_role: [
        "composer",
        "artist",
        "supervisor",
        "specialist",
        "curator",
        "other",
      ],
    },
  },
} as const
