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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          client_id: string
          created_at: string
          end_time: string
          id: string
          internal_notes: string | null
          is_paid: boolean
          reminder_sent: boolean
          service_id: string | null
          staff_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["appointment_status"]
        }
        Insert: {
          client_id: string
          created_at?: string
          end_time: string
          id?: string
          internal_notes?: string | null
          is_paid?: boolean
          reminder_sent?: boolean
          service_id?: string | null
          staff_id?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["appointment_status"]
        }
        Update: {
          client_id?: string
          created_at?: string
          end_time?: string
          id?: string
          internal_notes?: string | null
          is_paid?: boolean
          reminder_sent?: boolean
          service_id?: string | null
          staff_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["appointment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: {
          apifon_sender_id: string | null
          brand_color_primary: string
          created_at: string
          google_review_url: string | null
          id: string
          logo_url: string | null
          operating_hours: Json | null
          shop_name: string
          sms_enabled: boolean
          sms_provider_api: string | null
          theme_style: Database["public"]["Enums"]["theme_style"]
        }
        Insert: {
          apifon_sender_id?: string | null
          brand_color_primary?: string
          created_at?: string
          google_review_url?: string | null
          id?: string
          logo_url?: string | null
          operating_hours?: Json | null
          shop_name?: string
          sms_enabled?: boolean
          sms_provider_api?: string | null
          theme_style?: Database["public"]["Enums"]["theme_style"]
        }
        Update: {
          apifon_sender_id?: string | null
          brand_color_primary?: string
          created_at?: string
          google_review_url?: string | null
          id?: string
          logo_url?: string | null
          operating_hours?: Json | null
          shop_name?: string
          sms_enabled?: boolean
          sms_provider_api?: string | null
          theme_style?: Database["public"]["Enums"]["theme_style"]
        }
        Relationships: []
      }
      clients: {
        Row: {
          birthday: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          last_visit: string | null
          nameday_date: string | null
          personal_preferences: string | null
          phone_mobile: string
          tech_notes: string | null
          total_spent: number
        }
        Insert: {
          birthday?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          last_visit?: string | null
          nameday_date?: string | null
          personal_preferences?: string | null
          phone_mobile: string
          tech_notes?: string | null
          total_spent?: number
        }
        Update: {
          birthday?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          last_visit?: string | null
          nameday_date?: string | null
          personal_preferences?: string | null
          phone_mobile?: string
          tech_notes?: string | null
          total_spent?: number
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          date: string
          description: string | null
          id: string
          status: Database["public"]["Enums"]["expense_status"]
        }
        Insert: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["expense_status"]
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["expense_status"]
        }
        Relationships: []
      }
      inventory: {
        Row: {
          cost_price: number
          created_at: string
          current_stock: number
          id: string
          min_stock_level: number
          product_name: string
          retail_price: number
          sku: string | null
        }
        Insert: {
          cost_price?: number
          created_at?: string
          current_stock?: number
          id?: string
          min_stock_level?: number
          product_name: string
          retail_price?: number
          sku?: string | null
        }
        Update: {
          cost_price?: number
          created_at?: string
          current_stock?: number
          id?: string
          min_stock_level?: number
          product_name?: string
          retail_price?: number
          sku?: string | null
        }
        Relationships: []
      }
      product_sales: {
        Row: {
          created_at: string
          id: string
          inventory_id: string
          quantity: number
          sale_date: string
          total_amount: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_id: string
          quantity: number
          sale_date?: string
          total_amount: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          inventory_id?: string
          quantity?: number
          sale_date?: string
          total_amount?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_sales_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category_color: string
          created_at: string
          duration: number
          id: string
          price: number
          required_products: Json | null
          service_name: string
        }
        Insert: {
          category_color?: string
          created_at?: string
          duration: number
          id?: string
          price?: number
          required_products?: Json | null
          service_name: string
        }
        Update: {
          category_color?: string
          created_at?: string
          duration?: number
          id?: string
          price?: number
          required_products?: Json | null
          service_name?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          commission_rate: number
          created_at: string
          email: string | null
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          phone: string
          role: string
        }
        Insert: {
          commission_rate?: number
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          is_active?: boolean
          last_name: string
          phone?: string
          role?: string
        }
        Update: {
          commission_rate?: number
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          phone?: string
          role?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_total: number
          appointment_id: string
          created_at: string
          id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          staff_commission: number
        }
        Insert: {
          amount_total?: number
          appointment_id: string
          created_at?: string
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          staff_commission?: number
        }
        Update: {
          amount_total?: number
          appointment_id?: string
          created_at?: string
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          staff_commission?: number
        }
        Relationships: [
          {
            foreignKeyName: "transactions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      appointment_status:
        | "Pending"
        | "Confirmed"
        | "Cancelled"
        | "No-Show"
        | "Completed"
      expense_category:
        | "Rent"
        | "Electricity"
        | "Water"
        | "Products"
        | "Salaries"
        | "Marketing"
        | "Other"
      expense_status: "Paid" | "Pending"
      payment_method: "Cash" | "Card" | "Revolut" | "Stripe"
      theme_style: "Minimal" | "Industrial" | "Modern" | "Classic"
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
      appointment_status: [
        "Pending",
        "Confirmed",
        "Cancelled",
        "No-Show",
        "Completed",
      ],
      expense_category: [
        "Rent",
        "Electricity",
        "Water",
        "Products",
        "Salaries",
        "Marketing",
        "Other",
      ],
      expense_status: ["Paid", "Pending"],
      payment_method: ["Cash", "Card", "Revolut", "Stripe"],
      theme_style: ["Minimal", "Industrial", "Modern", "Classic"],
    },
  },
} as const
