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
      composers: {
        Row: {
          address: string | null
          availability: Database["public"]["Enums"]["availability_status"]
          bio_long: string | null
          bio_short: string | null
          birth_year: number | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          email_secondary: string | null
          fee_range_id: string | null
          full_name: string
          id: string
          internal_notes: string | null
          next_available_on: string | null
          nif: string | null
          owner_email: string | null
          owner_user_id: string | null
          phone: string | null
          photo_path: string | null
          postal_code: string | null
          province: string | null
          reel_url: string | null
          search_tsv: unknown
          slug: string
          tags: string[]
          team_email: string | null
          team_name: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          availability?: Database["public"]["Enums"]["availability_status"]
          bio_long?: string | null
          bio_short?: string | null
          birth_year?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          email_secondary?: string | null
          fee_range_id?: string | null
          full_name: string
          id?: string
          internal_notes?: string | null
          next_available_on?: string | null
          nif?: string | null
          owner_email?: string | null
          owner_user_id?: string | null
          phone?: string | null
          photo_path?: string | null
          postal_code?: string | null
          province?: string | null
          reel_url?: string | null
          search_tsv?: unknown
          slug: string
          tags?: string[]
          team_email?: string | null
          team_name?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          availability?: Database["public"]["Enums"]["availability_status"]
          bio_long?: string | null
          bio_short?: string | null
          birth_year?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          email_secondary?: string | null
          fee_range_id?: string | null
          full_name?: string
          id?: string
          internal_notes?: string | null
          next_available_on?: string | null
          nif?: string | null
          owner_email?: string | null
          owner_user_id?: string | null
          phone?: string | null
          photo_path?: string | null
          postal_code?: string | null
          province?: string | null
          reel_url?: string | null
          search_tsv?: unknown
          slug?: string
          tags?: string[]
          team_email?: string | null
          team_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "composers_fee_range_id_fkey"
            columns: ["fee_range_id"]
            isOneToOne: false
            referencedRelation: "fee_ranges"
            referencedColumns: ["id"]
          },
        ]
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
      availability_status: "available" | "partial" | "unavailable"
      film_format:
        | "feature"
        | "series"
        | "doc"
        | "short"
        | "spot"
        | "game"
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
      availability_status: ["available", "partial", "unavailable"],
      film_format: [
        "feature",
        "series",
        "doc",
        "short",
        "spot",
        "game",
        "other",
      ],
    },
  },
} as const
