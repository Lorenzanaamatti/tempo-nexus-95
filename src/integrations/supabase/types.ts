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
      budget_lines: {
        Row: {
          budget_id: string
          category: string | null
          concept: string
          created_at: string
          id: string
          irpf_rate: number
          net: number | null
          notes: string | null
          position: number
          quantity: number
          unit_price: number
          user_id: string
          vat_rate: number
        }
        Insert: {
          budget_id: string
          category?: string | null
          concept: string
          created_at?: string
          id?: string
          irpf_rate?: number
          net?: number | null
          notes?: string | null
          position?: number
          quantity?: number
          unit_price?: number
          user_id: string
          vat_rate?: number
        }
        Update: {
          budget_id?: string
          category?: string | null
          concept?: string
          created_at?: string
          id?: string
          irpf_rate?: number
          net?: number | null
          notes?: string | null
          position?: number
          quantity?: number
          unit_price?: number
          user_id?: string
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          created_at: string
          currency: string
          id: string
          name: string
          notes: string | null
          project_id: string | null
          scope: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          name: string
          notes?: string | null
          project_id?: string | null
          scope?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          name?: string
          notes?: string | null
          project_id?: string | null
          scope?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          budget_id: string | null
          created_at: string
          currency: string
          direction: Database["public"]["Enums"]["invoice_direction"]
          due_date: string | null
          id: string
          irpf: number
          issue_date: string
          issuer: string | null
          net: number
          notes: string | null
          number: string | null
          project_id: string | null
          receiver: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          total: number
          updated_at: string
          user_id: string
          vat: number
        }
        Insert: {
          budget_id?: string | null
          created_at?: string
          currency?: string
          direction?: Database["public"]["Enums"]["invoice_direction"]
          due_date?: string | null
          id?: string
          irpf?: number
          issue_date?: string
          issuer?: string | null
          net?: number
          notes?: string | null
          number?: string | null
          project_id?: string | null
          receiver?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          total?: number
          updated_at?: string
          user_id: string
          vat?: number
        }
        Update: {
          budget_id?: string | null
          created_at?: string
          currency?: string
          direction?: Database["public"]["Enums"]["invoice_direction"]
          due_date?: string | null
          id?: string
          irpf?: number
          issue_date?: string
          issuer?: string | null
          net?: number
          notes?: string | null
          number?: string | null
          project_id?: string | null
          receiver?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          total?: number
          updated_at?: string
          user_id?: string
          vat?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          artist: string | null
          color: string | null
          created_at: string
          id: string
          kind: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          artist?: string | null
          color?: string | null
          created_at?: string
          id?: string
          kind?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          artist?: string | null
          color?: string | null
          created_at?: string
          id?: string
          kind?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      invoice_direction: "income" | "expense"
      invoice_status: "pending" | "paid" | "grouped" | "overdue" | "draft"
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
      invoice_direction: ["income", "expense"],
      invoice_status: ["pending", "paid", "grouped", "overdue", "draft"],
    },
  },
} as const
