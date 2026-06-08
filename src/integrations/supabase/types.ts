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
      actions: {
        Row: {
          assignee_person_id: string | null
          created_at: string
          done: boolean
          done_at: string | null
          due_date: string | null
          id: string
          kind: string
          notes: string | null
          position: number
          subject_id: string
          subject_type: Database["public"]["Enums"]["calendar_subject_type"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_person_id?: string | null
          created_at?: string
          done?: boolean
          done_at?: string | null
          due_date?: string | null
          id?: string
          kind?: string
          notes?: string | null
          position?: number
          subject_id: string
          subject_type: Database["public"]["Enums"]["calendar_subject_type"]
          title: string
          updated_at?: string
        }
        Update: {
          assignee_person_id?: string | null
          created_at?: string
          done?: boolean
          done_at?: string | null
          due_date?: string | null
          id?: string
          kind?: string
          notes?: string | null
          position?: number
          subject_id?: string
          subject_type?: Database["public"]["Enums"]["calendar_subject_type"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      brand_assets: {
        Row: {
          created_at: string
          external_url: string | null
          id: string
          kind: string | null
          notes: string | null
          position: number
          storage_path: string | null
          title: string
        }
        Insert: {
          created_at?: string
          external_url?: string | null
          id?: string
          kind?: string | null
          notes?: string | null
          position?: number
          storage_path?: string | null
          title: string
        }
        Update: {
          created_at?: string
          external_url?: string | null
          id?: string
          kind?: string | null
          notes?: string | null
          position?: number
          storage_path?: string | null
          title?: string
        }
        Relationships: []
      }
      brand_guidelines: {
        Row: {
          body_md: string | null
          created_at: string
          id: string
          position: number
          section: string
          updated_at: string
          version: string | null
        }
        Insert: {
          body_md?: string | null
          created_at?: string
          id?: string
          position?: number
          section: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          body_md?: string | null
          created_at?: string
          id?: string
          position?: number
          section?: string
          updated_at?: string
          version?: string | null
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          assignee_person_id: string | null
          calendar_category: Database["public"]["Enums"]["calendar_category"]
          created_at: string
          end_date: string
          id: string
          kind: string
          note: string | null
          source_action_id: string | null
          source_composer_id: string | null
          source_contract_id: string | null
          source_kind: string | null
          source_opp_action_id: string | null
          source_opportunity_id: string | null
          source_production_id: string | null
          source_social_post_id: string | null
          source_sprint_id: string | null
          source_target_account_id: string | null
          start_date: string
          subject_id: string
          subject_type: Database["public"]["Enums"]["calendar_subject_type"]
          title: string | null
          updated_at: string
        }
        Insert: {
          assignee_person_id?: string | null
          calendar_category?: Database["public"]["Enums"]["calendar_category"]
          created_at?: string
          end_date: string
          id?: string
          kind?: string
          note?: string | null
          source_action_id?: string | null
          source_composer_id?: string | null
          source_contract_id?: string | null
          source_kind?: string | null
          source_opp_action_id?: string | null
          source_opportunity_id?: string | null
          source_production_id?: string | null
          source_social_post_id?: string | null
          source_sprint_id?: string | null
          source_target_account_id?: string | null
          start_date: string
          subject_id: string
          subject_type: Database["public"]["Enums"]["calendar_subject_type"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          assignee_person_id?: string | null
          calendar_category?: Database["public"]["Enums"]["calendar_category"]
          created_at?: string
          end_date?: string
          id?: string
          kind?: string
          note?: string | null
          source_action_id?: string | null
          source_composer_id?: string | null
          source_contract_id?: string | null
          source_kind?: string | null
          source_opp_action_id?: string | null
          source_opportunity_id?: string | null
          source_production_id?: string | null
          source_social_post_id?: string | null
          source_sprint_id?: string | null
          source_target_account_id?: string | null
          start_date?: string
          subject_id?: string
          subject_type?: Database["public"]["Enums"]["calendar_subject_type"]
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      case_studies: {
        Row: {
          client: string | null
          composer_id: string | null
          cover_path: string | null
          created_at: string
          external_url: string | null
          id: string
          metrics: string | null
          outcome: string | null
          problem: string | null
          proposal: string | null
          tags: string[]
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["case_study_visibility"]
          year: number | null
        }
        Insert: {
          client?: string | null
          composer_id?: string | null
          cover_path?: string | null
          created_at?: string
          external_url?: string | null
          id?: string
          metrics?: string | null
          outcome?: string | null
          problem?: string | null
          proposal?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["case_study_visibility"]
          year?: number | null
        }
        Update: {
          client?: string | null
          composer_id?: string | null
          cover_path?: string | null
          created_at?: string
          external_url?: string | null
          id?: string
          metrics?: string | null
          outcome?: string | null
          problem?: string | null
          proposal?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["case_study_visibility"]
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "case_studies_composer_id_fkey"
            columns: ["composer_id"]
            isOneToOne: false
            referencedRelation: "composers"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          composer_id: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["chat_channel_kind"]
          label: string
          position: number
          updated_at: string
        }
        Insert: {
          composer_id: string
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["chat_channel_kind"]
          label: string
          position?: number
          updated_at?: string
        }
        Update: {
          composer_id?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["chat_channel_kind"]
          label?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          attachments: Json
          author_name: string | null
          author_role: string | null
          author_user_id: string
          body: string | null
          channel_id: string
          composer_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          attachments?: Json
          author_name?: string | null
          author_role?: string | null
          author_user_id: string
          body?: string | null
          channel_id: string
          composer_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          attachments?: Json
          author_name?: string | null
          author_role?: string | null
          author_user_id?: string
          body?: string | null
          channel_id?: string
          composer_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
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
      composer_videos: {
        Row: {
          composer_id: string
          copyright: string | null
          created_at: string
          duration_seconds: number | null
          external_url: string | null
          id: string
          position: number
          poster_path: string | null
          storage_path: string | null
          title: string | null
          year: number | null
        }
        Insert: {
          composer_id: string
          copyright?: string | null
          created_at?: string
          duration_seconds?: number | null
          external_url?: string | null
          id?: string
          position?: number
          poster_path?: string | null
          storage_path?: string | null
          title?: string | null
          year?: number | null
        }
        Update: {
          composer_id?: string
          copyright?: string | null
          created_at?: string
          duration_seconds?: number | null
          external_url?: string | null
          id?: string
          position?: number
          poster_path?: string | null
          storage_path?: string | null
          title?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "composer_videos_composer_id_fkey"
            columns: ["composer_id"]
            isOneToOne: false
            referencedRelation: "composers"
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
      contract_counterparties: {
        Row: {
          contract_id: string
          created_at: string
          id: string
          name: string | null
          partner_company_id: string | null
          person_id: string | null
          position: number
          role: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string
          id?: string
          name?: string | null
          partner_company_id?: string | null
          person_id?: string | null
          position?: number
          role?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string
          id?: string
          name?: string | null
          partner_company_id?: string | null
          person_id?: string | null
          position?: number
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_counterparties_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_counterparties_partner_company_id_fkey"
            columns: ["partner_company_id"]
            isOneToOne: false
            referencedRelation: "production_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_counterparties_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          composer_id: string | null
          contract_type: string | null
          counterparty: string | null
          created_at: string
          end_date: string | null
          id: string
          language: Database["public"]["Enums"]["contract_language"]
          notes: string | null
          notice_date: string | null
          partner_company_id: string | null
          sign_status: Database["public"]["Enums"]["contract_sign_status"]
          signed_date: string | null
          signer_composer_id: string | null
          signer_name: string | null
          signer_person_id: string | null
          storage_path: string | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          composer_id?: string | null
          contract_type?: string | null
          counterparty?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          language?: Database["public"]["Enums"]["contract_language"]
          notes?: string | null
          notice_date?: string | null
          partner_company_id?: string | null
          sign_status?: Database["public"]["Enums"]["contract_sign_status"]
          signed_date?: string | null
          signer_composer_id?: string | null
          signer_name?: string | null
          signer_person_id?: string | null
          storage_path?: string | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          composer_id?: string | null
          contract_type?: string | null
          counterparty?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          language?: Database["public"]["Enums"]["contract_language"]
          notes?: string | null
          notice_date?: string | null
          partner_company_id?: string | null
          sign_status?: Database["public"]["Enums"]["contract_sign_status"]
          signed_date?: string | null
          signer_composer_id?: string | null
          signer_name?: string | null
          signer_person_id?: string | null
          storage_path?: string | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      deal_memo_eventos: {
        Row: {
          actor_email: string | null
          created_at: string
          deal_memo_id: string
          id: string
          payload: Json | null
          tipo_evento: Database["public"]["Enums"]["dm_evento_tipo"]
        }
        Insert: {
          actor_email?: string | null
          created_at?: string
          deal_memo_id: string
          id?: string
          payload?: Json | null
          tipo_evento: Database["public"]["Enums"]["dm_evento_tipo"]
        }
        Update: {
          actor_email?: string | null
          created_at?: string
          deal_memo_id?: string
          id?: string
          payload?: Json | null
          tipo_evento?: Database["public"]["Enums"]["dm_evento_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "deal_memo_eventos_deal_memo_id_fkey"
            columns: ["deal_memo_id"]
            isOneToOne: false
            referencedRelation: "deal_memos"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_memo_versiones: {
        Row: {
          comentarios_revision: string | null
          created_at: string
          deal_memo_id: string
          email_asunto: string
          email_cuerpo: string
          generada_por: Database["public"]["Enums"]["dm_version_origen"]
          id: string
          numero_version: number
          word_file_url: string | null
        }
        Insert: {
          comentarios_revision?: string | null
          created_at?: string
          deal_memo_id: string
          email_asunto: string
          email_cuerpo: string
          generada_por: Database["public"]["Enums"]["dm_version_origen"]
          id?: string
          numero_version: number
          word_file_url?: string | null
        }
        Update: {
          comentarios_revision?: string | null
          created_at?: string
          deal_memo_id?: string
          email_asunto?: string
          email_cuerpo?: string
          generada_por?: Database["public"]["Enums"]["dm_version_origen"]
          id?: string
          numero_version?: number
          word_file_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_memo_versiones_deal_memo_id_fkey"
            columns: ["deal_memo_id"]
            isOneToOne: false
            referencedRelation: "deal_memos"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_memos: {
        Row: {
          cliente_id: string | null
          contraparte_id: string | null
          created_at: string
          descripcion_uso: string | null
          destinatario_final_email: string
          estado: Database["public"]["Enums"]["deal_memo_estado"]
          fecha_envio: string | null
          fecha_limite_respuesta: string | null
          google_calendar_event_id: string | null
          google_calendar_reminder_event_id: string | null
          id: string
          importe_propuesto: number | null
          moneda: string
          notas_internas: string | null
          obra: string
          plantilla_id: string | null
          plazo_respuesta_dias: number
          referencia: string
          updated_at: string
          validador_final_id: string | null
          validador_interno_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          contraparte_id?: string | null
          created_at?: string
          descripcion_uso?: string | null
          destinatario_final_email: string
          estado?: Database["public"]["Enums"]["deal_memo_estado"]
          fecha_envio?: string | null
          fecha_limite_respuesta?: string | null
          google_calendar_event_id?: string | null
          google_calendar_reminder_event_id?: string | null
          id?: string
          importe_propuesto?: number | null
          moneda?: string
          notas_internas?: string | null
          obra: string
          plantilla_id?: string | null
          plazo_respuesta_dias?: number
          referencia: string
          updated_at?: string
          validador_final_id?: string | null
          validador_interno_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          contraparte_id?: string | null
          created_at?: string
          descripcion_uso?: string | null
          destinatario_final_email?: string
          estado?: Database["public"]["Enums"]["deal_memo_estado"]
          fecha_envio?: string | null
          fecha_limite_respuesta?: string | null
          google_calendar_event_id?: string | null
          google_calendar_reminder_event_id?: string | null
          id?: string
          importe_propuesto?: number | null
          moneda?: string
          notas_internas?: string | null
          obra?: string
          plantilla_id?: string | null
          plazo_respuesta_dias?: number
          referencia?: string
          updated_at?: string
          validador_final_id?: string | null
          validador_interno_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_memos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "dm_contactos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_memos_contraparte_id_fkey"
            columns: ["contraparte_id"]
            isOneToOne: false
            referencedRelation: "dm_contactos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_memos_plantilla_id_fkey"
            columns: ["plantilla_id"]
            isOneToOne: false
            referencedRelation: "dm_plantillas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_memos_validador_final_id_fkey"
            columns: ["validador_final_id"]
            isOneToOne: false
            referencedRelation: "dm_contactos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_memos_validador_interno_id_fkey"
            columns: ["validador_interno_id"]
            isOneToOne: false
            referencedRelation: "dm_contactos"
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
      dm_contactos: {
        Row: {
          created_at: string
          email: string
          empresa: string | null
          id: string
          nombre: string
          notas: string | null
          rol: string | null
          tipo: Database["public"]["Enums"]["dm_contacto_tipo"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          empresa?: string | null
          id?: string
          nombre: string
          notas?: string | null
          rol?: string | null
          tipo: Database["public"]["Enums"]["dm_contacto_tipo"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          empresa?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          rol?: string | null
          tipo?: Database["public"]["Enums"]["dm_contacto_tipo"]
          updated_at?: string
        }
        Relationships: []
      }
      dm_plantillas: {
        Row: {
          activa: boolean
          created_at: string
          descripcion: string | null
          email_asunto_template: string
          email_cuerpo_template: string
          email_firma: string
          id: string
          instrucciones_para_agente: string
          nombre: string
          updated_at: string
          word_template_url: string | null
        }
        Insert: {
          activa?: boolean
          created_at?: string
          descripcion?: string | null
          email_asunto_template: string
          email_cuerpo_template: string
          email_firma: string
          id?: string
          instrucciones_para_agente: string
          nombre: string
          updated_at?: string
          word_template_url?: string | null
        }
        Update: {
          activa?: boolean
          created_at?: string
          descripcion?: string | null
          email_asunto_template?: string
          email_cuerpo_template?: string
          email_firma?: string
          id?: string
          instrucciones_para_agente?: string
          nombre?: string
          updated_at?: string
          word_template_url?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          id: string
          kind: string | null
          notes: string | null
          position: number
          storage_path: string | null
          subject_id: string
          subject_type: Database["public"]["Enums"]["calendar_subject_type"]
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string | null
          notes?: string | null
          position?: number
          storage_path?: string | null
          subject_id: string
          subject_type: Database["public"]["Enums"]["calendar_subject_type"]
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string | null
          notes?: string | null
          position?: number
          storage_path?: string | null
          subject_id?: string
          subject_type?: Database["public"]["Enums"]["calendar_subject_type"]
          title?: string
          updated_at?: string
          url?: string | null
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
      marketing_decks: {
        Row: {
          audience: string | null
          created_at: string
          external_url: string | null
          id: string
          language: Database["public"]["Enums"]["marketing_language"]
          notes: string | null
          public_link: string | null
          purpose: Database["public"]["Enums"]["deck_purpose"]
          storage_path: string | null
          tags: string[]
          title: string
          updated_at: string
          version: string | null
        }
        Insert: {
          audience?: string | null
          created_at?: string
          external_url?: string | null
          id?: string
          language?: Database["public"]["Enums"]["marketing_language"]
          notes?: string | null
          public_link?: string | null
          purpose?: Database["public"]["Enums"]["deck_purpose"]
          storage_path?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          audience?: string | null
          created_at?: string
          external_url?: string | null
          id?: string
          language?: Database["public"]["Enums"]["marketing_language"]
          notes?: string | null
          public_link?: string | null
          purpose?: Database["public"]["Enums"]["deck_purpose"]
          storage_path?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          version?: string | null
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
          detected_date: string | null
          estimated_value: number | null
          expected_close_date: string | null
          id: string
          kind: Database["public"]["Enums"]["opportunity_kind"]
          last_contact_date: string | null
          notes: string | null
          partner_company_id: string | null
          partner_name: string | null
          probability_pct: number | null
          responsible_person_id: string | null
          statuses: Database["public"]["Enums"]["opportunity_status"][]
          target_production_id: string | null
          target_production_text: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          detected_date?: string | null
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["opportunity_kind"]
          last_contact_date?: string | null
          notes?: string | null
          partner_company_id?: string | null
          partner_name?: string | null
          probability_pct?: number | null
          responsible_person_id?: string | null
          statuses?: Database["public"]["Enums"]["opportunity_status"][]
          target_production_id?: string | null
          target_production_text?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          detected_date?: string | null
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["opportunity_kind"]
          last_contact_date?: string | null
          notes?: string | null
          partner_company_id?: string | null
          partner_name?: string | null
          probability_pct?: number | null
          responsible_person_id?: string | null
          statuses?: Database["public"]["Enums"]["opportunity_status"][]
          target_production_id?: string | null
          target_production_text?: string | null
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
          {
            foreignKeyName: "opportunities_target_production_id_fkey"
            columns: ["target_production_id"]
            isOneToOne: false
            referencedRelation: "productions"
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
      outreach_templates: {
        Row: {
          body_md: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["outreach_template_kind"]
          language: Database["public"]["Enums"]["marketing_language"]
          notes: string | null
          subject: string | null
          title: string
          updated_at: string
          variables: string[]
        }
        Insert: {
          body_md?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["outreach_template_kind"]
          language?: Database["public"]["Enums"]["marketing_language"]
          notes?: string | null
          subject?: string | null
          title: string
          updated_at?: string
          variables?: string[]
        }
        Update: {
          body_md?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["outreach_template_kind"]
          language?: Database["public"]["Enums"]["marketing_language"]
          notes?: string | null
          subject?: string | null
          title?: string
          updated_at?: string
          variables?: string[]
        }
        Relationships: []
      }
      people: {
        Row: {
          assistant_model: string
          assistant_persona: string | null
          composer_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_virtual_assistant: boolean
          notes: string | null
          phone: string | null
          role: Database["public"]["Enums"]["person_role"]
          updated_at: string
        }
        Insert: {
          assistant_model?: string
          assistant_persona?: string | null
          composer_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_virtual_assistant?: boolean
          notes?: string | null
          phone?: string | null
          role: Database["public"]["Enums"]["person_role"]
          updated_at?: string
        }
        Update: {
          assistant_model?: string
          assistant_persona?: string | null
          composer_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_virtual_assistant?: boolean
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
      press_clippings: {
        Row: {
          author: string | null
          composer_id: string | null
          created_at: string
          featured: boolean
          headline: string
          id: string
          language: Database["public"]["Enums"]["marketing_language"]
          notes: string | null
          outlet: string
          published_date: string | null
          screenshot_path: string | null
          tags: string[]
          updated_at: string
          url: string | null
        }
        Insert: {
          author?: string | null
          composer_id?: string | null
          created_at?: string
          featured?: boolean
          headline: string
          id?: string
          language?: Database["public"]["Enums"]["marketing_language"]
          notes?: string | null
          outlet: string
          published_date?: string | null
          screenshot_path?: string | null
          tags?: string[]
          updated_at?: string
          url?: string | null
        }
        Update: {
          author?: string | null
          composer_id?: string | null
          created_at?: string
          featured?: boolean
          headline?: string
          id?: string
          language?: Database["public"]["Enums"]["marketing_language"]
          notes?: string | null
          outlet?: string
          published_date?: string | null
          screenshot_path?: string | null
          tags?: string[]
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "press_clippings_composer_id_fkey"
            columns: ["composer_id"]
            isOneToOne: false
            referencedRelation: "composers"
            referencedColumns: ["id"]
          },
        ]
      }
      press_kits: {
        Row: {
          composer_id: string | null
          created_at: string
          external_url: string | null
          id: string
          language: Database["public"]["Enums"]["marketing_language"]
          notes: string | null
          public_link: string | null
          scope: Database["public"]["Enums"]["press_kit_scope"]
          storage_path: string | null
          title: string
          updated_at: string
          version: string | null
        }
        Insert: {
          composer_id?: string | null
          created_at?: string
          external_url?: string | null
          id?: string
          language?: Database["public"]["Enums"]["marketing_language"]
          notes?: string | null
          public_link?: string | null
          scope?: Database["public"]["Enums"]["press_kit_scope"]
          storage_path?: string | null
          title: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          composer_id?: string | null
          created_at?: string
          external_url?: string | null
          id?: string
          language?: Database["public"]["Enums"]["marketing_language"]
          notes?: string | null
          public_link?: string | null
          scope?: Database["public"]["Enums"]["press_kit_scope"]
          storage_path?: string | null
          title?: string
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "press_kits_composer_id_fkey"
            columns: ["composer_id"]
            isOneToOne: false
            referencedRelation: "composers"
            referencedColumns: ["id"]
          },
        ]
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
          holded_invoice_ref: string | null
          holded_url: string | null
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
          holded_invoice_ref?: string | null
          holded_url?: string | null
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
          holded_invoice_ref?: string | null
          holded_url?: string | null
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
          award_date: string | null
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
          nomination_date: string | null
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
          award_date?: string | null
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
          nomination_date?: string | null
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
          award_date?: string | null
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
          nomination_date?: string | null
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
      social_campaigns: {
        Row: {
          composer_id: string | null
          created_at: string
          end_date: string | null
          id: string
          name: string
          notes: string | null
          objective: string | null
          production_id: string | null
          start_date: string | null
          target_engagement: number | null
          target_leads: number | null
          target_reach: number | null
          updated_at: string
        }
        Insert: {
          composer_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          notes?: string | null
          objective?: string | null
          production_id?: string | null
          start_date?: string | null
          target_engagement?: number | null
          target_leads?: number | null
          target_reach?: number | null
          updated_at?: string
        }
        Update: {
          composer_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          objective?: string | null
          production_id?: string | null
          start_date?: string | null
          target_engagement?: number | null
          target_leads?: number | null
          target_reach?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_campaigns_composer_id_fkey"
            columns: ["composer_id"]
            isOneToOne: false
            referencedRelation: "composers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_campaigns_production_id_fkey"
            columns: ["production_id"]
            isOneToOne: false
            referencedRelation: "productions"
            referencedColumns: ["id"]
          },
        ]
      }
      social_copy_templates: {
        Row: {
          body_md: string | null
          channel: Database["public"]["Enums"]["social_channel"] | null
          created_at: string
          id: string
          language: string
          notes: string | null
          occasion: string | null
          title: string
          updated_at: string
          variables: string[]
        }
        Insert: {
          body_md?: string | null
          channel?: Database["public"]["Enums"]["social_channel"] | null
          created_at?: string
          id?: string
          language?: string
          notes?: string | null
          occasion?: string | null
          title: string
          updated_at?: string
          variables?: string[]
        }
        Update: {
          body_md?: string | null
          channel?: Database["public"]["Enums"]["social_channel"] | null
          created_at?: string
          id?: string
          language?: string
          notes?: string | null
          occasion?: string | null
          title?: string
          updated_at?: string
          variables?: string[]
        }
        Relationships: []
      }
      social_hashtag_sets: {
        Row: {
          channel: Database["public"]["Enums"]["social_channel"] | null
          created_at: string
          genre_id: string | null
          hashtags: string[]
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["social_channel"] | null
          created_at?: string
          genre_id?: string | null
          hashtags?: string[]
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["social_channel"] | null
          created_at?: string
          genre_id?: string | null
          hashtags?: string[]
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_hashtag_sets_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "av_genres"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_assets: {
        Row: {
          alt_text: string | null
          caption: string | null
          created_at: string
          external_url: string | null
          id: string
          kind: Database["public"]["Enums"]["social_asset_kind"]
          position: number
          post_id: string
          storage_path: string | null
        }
        Insert: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          external_url?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["social_asset_kind"]
          position?: number
          post_id: string
          storage_path?: string | null
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          external_url?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["social_asset_kind"]
          position?: number
          post_id?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_post_assets_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_metrics: {
        Row: {
          clicks: number | null
          comments: number | null
          id: string
          impressions: number | null
          likes: number | null
          measured_at: string
          notes: string | null
          post_id: string
          reach: number | null
          saves: number | null
          shares: number | null
          video_views: number | null
        }
        Insert: {
          clicks?: number | null
          comments?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          measured_at?: string
          notes?: string | null
          post_id: string
          reach?: number | null
          saves?: number | null
          shares?: number | null
          video_views?: number | null
        }
        Update: {
          clicks?: number | null
          comments?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          measured_at?: string
          notes?: string | null
          post_id?: string
          reach?: number | null
          saves?: number | null
          shares?: number | null
          video_views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "social_post_metrics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          brief: string | null
          campaign_id: string | null
          channel: Database["public"]["Enums"]["social_channel"]
          composer_id: string | null
          copy_ca: string | null
          copy_en: string | null
          copy_es: string | null
          created_at: string
          cta_label: string | null
          cta_url: string | null
          format: Database["public"]["Enums"]["social_format"]
          hashtags: string[]
          id: string
          notes: string | null
          owner_person_id: string | null
          parent_post_id: string | null
          production_id: string | null
          published_at: string | null
          published_url: string | null
          scheduled_for: string | null
          status: Database["public"]["Enums"]["social_post_status"]
          title: string | null
          updated_at: string
        }
        Insert: {
          brief?: string | null
          campaign_id?: string | null
          channel: Database["public"]["Enums"]["social_channel"]
          composer_id?: string | null
          copy_ca?: string | null
          copy_en?: string | null
          copy_es?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          format?: Database["public"]["Enums"]["social_format"]
          hashtags?: string[]
          id?: string
          notes?: string | null
          owner_person_id?: string | null
          parent_post_id?: string | null
          production_id?: string | null
          published_at?: string | null
          published_url?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["social_post_status"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          brief?: string | null
          campaign_id?: string | null
          channel?: Database["public"]["Enums"]["social_channel"]
          composer_id?: string | null
          copy_ca?: string | null
          copy_en?: string | null
          copy_es?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          format?: Database["public"]["Enums"]["social_format"]
          hashtags?: string[]
          id?: string
          notes?: string | null
          owner_person_id?: string | null
          parent_post_id?: string | null
          production_id?: string | null
          published_at?: string | null
          published_url?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["social_post_status"]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "social_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_composer_id_fkey"
            columns: ["composer_id"]
            isOneToOne: false
            referencedRelation: "composers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_owner_person_id_fkey"
            columns: ["owner_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_parent_post_id_fkey"
            columns: ["parent_post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_production_id_fkey"
            columns: ["production_id"]
            isOneToOne: false
            referencedRelation: "productions"
            referencedColumns: ["id"]
          },
        ]
      }
      target_accounts: {
        Row: {
          created_at: string
          decks_sent: number
          id: string
          last_contact_date: string | null
          name: string
          next_step: string | null
          next_step_date: string | null
          notes: string | null
          priority: Database["public"]["Enums"]["target_account_priority"]
          production_company_id: string | null
          responsible_person_id: string | null
          sector: string | null
          status: Database["public"]["Enums"]["target_account_status"]
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          decks_sent?: number
          id?: string
          last_contact_date?: string | null
          name: string
          next_step?: string | null
          next_step_date?: string | null
          notes?: string | null
          priority?: Database["public"]["Enums"]["target_account_priority"]
          production_company_id?: string | null
          responsible_person_id?: string | null
          sector?: string | null
          status?: Database["public"]["Enums"]["target_account_status"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          decks_sent?: number
          id?: string
          last_contact_date?: string | null
          name?: string
          next_step?: string | null
          next_step_date?: string | null
          notes?: string | null
          priority?: Database["public"]["Enums"]["target_account_priority"]
          production_company_id?: string | null
          responsible_person_id?: string | null
          sector?: string | null
          status?: Database["public"]["Enums"]["target_account_status"]
          updated_at?: string
          website?: string | null
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
      add_business_days: { Args: { _d: string; _n: number }; Returns: string }
      can_access_composer: { Args: { _composer_id: string }; Returns: boolean }
      current_user_is_admin: { Args: never; Returns: boolean }
      ensure_composer_chat_channels: {
        Args: { _composer_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      link_composer_to_user: {
        Args: { _composer_id: string }
        Returns: undefined
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
      calendar_category: "operativo" | "marketing" | "facturacion" | "personal"
      calendar_subject_type:
        | "person"
        | "production"
        | "opportunity"
        | "composer"
        | "contract"
        | "production_company"
        | "platform"
        | "festival"
        | "award"
        | "grant"
        | "campaign"
        | "media_outlet"
        | "media_coverage"
        | "public_appearance"
      case_study_visibility: "interna" | "externa"
      chat_channel_kind:
        | "general"
        | "producciones"
        | "oportunidades"
        | "facturacion"
        | "actas"
        | "calendario"
        | "contratos"
      composer_team_role:
        | "agente"
        | "manager"
        | "producer"
        | "comunicacion"
        | "facturacion"
        | "pagos"
        | "otro"
      contract_language: "ca" | "es" | "en"
      contract_sign_status:
        | "borrador"
        | "enviado"
        | "en_revision"
        | "firmado"
        | "vencido"
        | "cancelado"
      deal_memo_estado:
        | "borrador"
        | "generando"
        | "revision_interna"
        | "corrigiendo"
        | "revision_final"
        | "enviado"
        | "respondido"
        | "cerrado"
        | "cancelado"
      deck_purpose: "corto" | "largo" | "generico" | "por_cliente" | "sector"
      dm_contacto_tipo: "interno" | "cliente" | "contraparte" | "validador"
      dm_evento_tipo:
        | "creado"
        | "version_generada"
        | "enviado_a_revisor_interno"
        | "aprobado_revisor_interno"
        | "correcciones_solicitadas"
        | "enviado_a_validador_final"
        | "aprobado_final"
        | "enviado_a_destinatario"
        | "respuesta_recibida"
        | "reminder_enviado"
        | "cerrado"
      dm_version_origen: "agente_ia" | "correccion_humana"
      film_format:
        | "feature"
        | "series"
        | "doc"
        | "short"
        | "spot"
        | "game"
        | "other"
      marketing_language: "es" | "en" | "ca" | "fr" | "pt" | "other"
      opportunity_kind: "fichaje" | "pitch"
      opportunity_status:
        | "identificado"
        | "primer_contacto"
        | "propuesta_enviada"
        | "negociacion"
        | "cerrado"
        | "descartado"
      outreach_template_kind:
        | "cold"
        | "follow_up"
        | "propuesta_economica"
        | "nda"
        | "agradecimiento"
        | "otro"
      person_role:
        | "ic_team"
        | "composer"
        | "artist"
        | "supervisor"
        | "specialist"
        | "curator"
        | "other"
      press_kit_scope: "ic_global" | "compositor"
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
        | "compositor_confirmado"
        | "compositor_descartado"
        | "presupuesto_enviado"
        | "presupuesto_confirmado"
        | "contrato_enviado"
        | "contrato_negociacion"
        | "visuales_entregados"
        | "en_composicion"
        | "en_produccion"
        | "en_mezclas"
        | "entrega_parcial"
        | "entrega_total"
        | "entregables_completados"
        | "finalizada"
        | "estrenada"
        | "comunicado_estreno"
        | "nominada"
        | "premiada"
        | "comunicada_nominacion"
        | "comunicado_premio"
      representation_status:
        | "activo"
        | "pausa"
        | "en_negociacion"
        | "finalizado"
      representation_tier: "A" | "B" | "C" | "desarrollo" | "D" | "E"
      roster_role:
        | "composer"
        | "artist"
        | "supervisor"
        | "specialist"
        | "curator"
        | "other"
      social_asset_kind: "image" | "video" | "audio" | "gif" | "documento"
      social_channel:
        | "instagram"
        | "facebook"
        | "linkedin"
        | "youtube"
        | "tiktok"
        | "otra"
      social_format:
        | "feed"
        | "reel"
        | "story"
        | "carousel"
        | "video"
        | "live"
        | "articulo"
      social_post_status:
        | "borrador"
        | "en_revision"
        | "aprobado"
        | "programado"
        | "publicado"
        | "archivado"
      target_account_priority: "alta" | "media" | "baja"
      target_account_status:
        | "sin_contacto"
        | "contactado"
        | "reunion"
        | "propuesta_enviada"
        | "cliente_activo"
        | "en_pausa"
        | "descartado"
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
      calendar_category: ["operativo", "marketing", "facturacion", "personal"],
      calendar_subject_type: [
        "person",
        "production",
        "opportunity",
        "composer",
        "contract",
        "production_company",
        "platform",
        "festival",
        "award",
        "grant",
        "campaign",
        "media_outlet",
        "media_coverage",
        "public_appearance",
      ],
      case_study_visibility: ["interna", "externa"],
      chat_channel_kind: [
        "general",
        "producciones",
        "oportunidades",
        "facturacion",
        "actas",
        "calendario",
        "contratos",
      ],
      composer_team_role: [
        "agente",
        "manager",
        "producer",
        "comunicacion",
        "facturacion",
        "pagos",
        "otro",
      ],
      contract_language: ["ca", "es", "en"],
      contract_sign_status: [
        "borrador",
        "enviado",
        "en_revision",
        "firmado",
        "vencido",
        "cancelado",
      ],
      deal_memo_estado: [
        "borrador",
        "generando",
        "revision_interna",
        "corrigiendo",
        "revision_final",
        "enviado",
        "respondido",
        "cerrado",
        "cancelado",
      ],
      deck_purpose: ["corto", "largo", "generico", "por_cliente", "sector"],
      dm_contacto_tipo: ["interno", "cliente", "contraparte", "validador"],
      dm_evento_tipo: [
        "creado",
        "version_generada",
        "enviado_a_revisor_interno",
        "aprobado_revisor_interno",
        "correcciones_solicitadas",
        "enviado_a_validador_final",
        "aprobado_final",
        "enviado_a_destinatario",
        "respuesta_recibida",
        "reminder_enviado",
        "cerrado",
      ],
      dm_version_origen: ["agente_ia", "correccion_humana"],
      film_format: [
        "feature",
        "series",
        "doc",
        "short",
        "spot",
        "game",
        "other",
      ],
      marketing_language: ["es", "en", "ca", "fr", "pt", "other"],
      opportunity_kind: ["fichaje", "pitch"],
      opportunity_status: [
        "identificado",
        "primer_contacto",
        "propuesta_enviada",
        "negociacion",
        "cerrado",
        "descartado",
      ],
      outreach_template_kind: [
        "cold",
        "follow_up",
        "propuesta_economica",
        "nda",
        "agradecimiento",
        "otro",
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
      press_kit_scope: ["ic_global", "compositor"],
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
        "compositor_confirmado",
        "compositor_descartado",
        "presupuesto_enviado",
        "presupuesto_confirmado",
        "contrato_enviado",
        "contrato_negociacion",
        "visuales_entregados",
        "en_composicion",
        "en_produccion",
        "en_mezclas",
        "entrega_parcial",
        "entrega_total",
        "entregables_completados",
        "finalizada",
        "estrenada",
        "comunicado_estreno",
        "nominada",
        "premiada",
        "comunicada_nominacion",
        "comunicado_premio",
      ],
      representation_status: [
        "activo",
        "pausa",
        "en_negociacion",
        "finalizado",
      ],
      representation_tier: ["A", "B", "C", "desarrollo", "D", "E"],
      roster_role: [
        "composer",
        "artist",
        "supervisor",
        "specialist",
        "curator",
        "other",
      ],
      social_asset_kind: ["image", "video", "audio", "gif", "documento"],
      social_channel: [
        "instagram",
        "facebook",
        "linkedin",
        "youtube",
        "tiktok",
        "otra",
      ],
      social_format: [
        "feed",
        "reel",
        "story",
        "carousel",
        "video",
        "live",
        "articulo",
      ],
      social_post_status: [
        "borrador",
        "en_revision",
        "aprobado",
        "programado",
        "publicado",
        "archivado",
      ],
      target_account_priority: ["alta", "media", "baja"],
      target_account_status: [
        "sin_contacto",
        "contactado",
        "reunion",
        "propuesta_enviada",
        "cliente_activo",
        "en_pausa",
        "descartado",
      ],
    },
  },
} as const
