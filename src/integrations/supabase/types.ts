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
      appointment_services: {
        Row: {
          appointment_id: string
          created_at: string
          duration: number
          id: string
          price: number
          service_id: string
          shop_id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          duration?: number
          id?: string
          price?: number
          service_id: string
          shop_id: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          duration?: number
          id?: string
          price?: number
          service_id?: string
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_services_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appt_services_appointment_fk"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appt_services_service_fk"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appt_services_shop_fk"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
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
          shop_id: string
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
          shop_id: string
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
          shop_id?: string
          staff_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["appointment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_fk"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_shop_fk"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_staff_fk"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
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
          shop_id: string
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
          shop_id: string
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
          shop_id?: string
          shop_name?: string
          sms_enabled?: boolean
          sms_provider_api?: string | null
          theme_style?: Database["public"]["Enums"]["theme_style"]
        }
        Relationships: [
          {
            foreignKeyName: "business_settings_shop_fk"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_settings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
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
          shop_id: string
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
          shop_id: string
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
          shop_id?: string
          tech_notes?: string | null
          total_spent?: number
        }
        Relationships: [
          {
            foreignKeyName: "clients_shop_fk"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          date: string
          description: string | null
          id: string
          recurrence_interval: string
          recurrence_parent_id: string | null
          shop_id: string
          status: Database["public"]["Enums"]["expense_status"]
        }
        Insert: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          recurrence_interval?: string
          recurrence_parent_id?: string | null
          shop_id: string
          status?: Database["public"]["Enums"]["expense_status"]
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          recurrence_interval?: string
          recurrence_parent_id?: string | null
          shop_id?: string
          status?: Database["public"]["Enums"]["expense_status"]
        }
        Relationships: [
          {
            foreignKeyName: "expenses_recurrence_parent_id_fkey"
            columns: ["recurrence_parent_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_shop_fk"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
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
          shop_id: string
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
          shop_id: string
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
          shop_id?: string
          sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_shop_fk"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invite_code: string
          shop_id: string
          staff_id: string
          status: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          invite_code?: string
          shop_id: string
          staff_id: string
          status?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invite_code?: string
          shop_id?: string
          staff_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_shop_fk"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_staff_fk"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sales: {
        Row: {
          created_at: string
          id: string
          inventory_id: string
          quantity: number
          sale_date: string
          shop_id: string
          total_amount: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_id: string
          quantity: number
          sale_date?: string
          shop_id: string
          total_amount: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          inventory_id?: string
          quantity?: number
          sale_date?: string
          shop_id?: string
          total_amount?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_sales_inventory_fk"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sales_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sales_shop_fk"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sales_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
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
          shop_id: string
        }
        Insert: {
          category_color?: string
          created_at?: string
          duration: number
          id?: string
          price?: number
          required_products?: Json | null
          service_name: string
          shop_id: string
        }
        Update: {
          category_color?: string
          created_at?: string
          duration?: number
          id?: string
          price?: number
          required_products?: Json | null
          service_name?: string
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_shop_fk"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          shop_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          shop_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          shop_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_members_shop_fk"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_members_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          owner_id: string | null
          slug: string
          theme_settings: Json | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string | null
          slug: string
          theme_settings?: Json | null
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string | null
          slug?: string
          theme_settings?: Json | null
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
          shop_id: string
          user_id: string | null
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
          shop_id: string
          user_id?: string | null
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
          shop_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_shop_fk"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_total: number
          appointment_id: string
          created_at: string
          id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          shop_id: string
          staff_commission: number
        }
        Insert: {
          amount_total?: number
          appointment_id: string
          created_at?: string
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          shop_id: string
          staff_commission?: number
        }
        Update: {
          amount_total?: number
          appointment_id?: string
          created_at?: string
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          shop_id?: string
          staff_commission?: number
        }
        Relationships: [
          {
            foreignKeyName: "transactions_appointment_fk"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_shop_fk"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
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
      accept_invitation: { Args: { _invite_code: string }; Returns: Json }
      auto_complete_past_appointments: { Args: never; Returns: undefined }
      create_shop: { Args: { _name: string; _slug: string }; Returns: string }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      get_user_shop_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      public_create_booking: {
        Args: {
          _email: string
          _end_time: string
          _first_name: string
          _last_name: string
          _phone: string
          _phone_normalized: string
          _service_id: string
          _shop_slug: string
          _staff_id: string
          _start_time: string
        }
        Returns: {
          appointment_id: string
          client_id: string
          shop_id: string
        }[]
      }
      public_get_booked_slots: {
        Args: { _date: string; _shop_slug: string }
        Returns: {
          end_time: string
          staff_id: string
          start_time: string
        }[]
      }
      public_lookup_client: {
        Args: { _phone: string; _phone_normalized: string; _shop_slug: string }
        Returns: {
          email: string
          first_name: string
          id: string
          last_name: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "staff"
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
      app_role: ["admin", "manager", "staff"],
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
