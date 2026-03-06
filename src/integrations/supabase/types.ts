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
      alert_log: {
        Row: {
          alert_type: string | null
          id: string
          message: string | null
          product_id: string | null
          sent_at: string | null
          sent_to: string[] | null
        }
        Insert: {
          alert_type?: string | null
          id?: string
          message?: string | null
          product_id?: string | null
          sent_at?: string | null
          sent_to?: string[] | null
        }
        Update: {
          alert_type?: string | null
          id?: string
          message?: string | null
          product_id?: string | null
          sent_at?: string | null
          sent_to?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_status_view"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_settings: {
        Row: {
          alert_type: string
          created_at: string | null
          email_recipients: string[] | null
          id: string
          is_enabled: boolean | null
          last_sent_at: string | null
          notification_time: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          email_recipients?: string[] | null
          id?: string
          is_enabled?: boolean | null
          last_sent_at?: string | null
          notification_time?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          email_recipients?: string[] | null
          id?: string
          is_enabled?: boolean | null
          last_sent_at?: string | null
          notification_time?: string | null
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          last_message_at: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_message_at?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_message_at?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string | null
          id: string
          movement_type: string
          notes: string | null
          product_id: string | null
          quantity: number
          reason: string | null
          source: string
          user_email: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          movement_type: string
          notes?: string | null
          product_id?: string | null
          quantity: number
          reason?: string | null
          source: string
          user_email?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          reason?: string | null
          source?: string
          user_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_status_view"
            referencedColumns: ["id"]
          },
        ]
      }
      packaging_sizes: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string
          weight_grams: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          weight_grams: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          weight_grams?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          cost_price: number | null
          created_at: string | null
          critical_stock: number | null
          current_stock: number | null
          description: string | null
          flavor_notes: string | null
          id: string
          is_active: boolean | null
          minimum_stock: number | null
          name: string
          origin: string | null
          package_count: number | null
          packaging_size_id: string | null
          roast_level: string | null
          selling_price: number | null
          supplier_id: string | null
          unit: string | null
          updated_at: string | null
          woocommerce_product_id: number | null
          woocommerce_parent_id: number | null
        }
        Insert: {
          cost_price?: number | null
          created_at?: string | null
          critical_stock?: number | null
          current_stock?: number | null
          description?: string | null
          flavor_notes?: string | null
          id?: string
          is_active?: boolean | null
          minimum_stock?: number | null
          name: string
          origin?: string | null
          package_count?: number | null
          packaging_size_id?: string | null
          roast_level?: string | null
          selling_price?: number | null
          supplier_id?: string | null
          unit?: string | null
          updated_at?: string | null
          woocommerce_product_id?: number | null
          woocommerce_parent_id?: number | null
        }
        Update: {
          cost_price?: number | null
          created_at?: string | null
          critical_stock?: number | null
          current_stock?: number | null
          description?: string | null
          flavor_notes?: string | null
          id?: string
          is_active?: boolean | null
          minimum_stock?: number | null
          name?: string
          origin?: string | null
          package_count?: number | null
          packaging_size_id?: string | null
          roast_level?: string | null
          selling_price?: number | null
          supplier_id?: string | null
          unit?: string | null
          updated_at?: string | null
          woocommerce_product_id?: number | null
          woocommerce_parent_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_packaging_size_id_fkey"
            columns: ["packaging_size_id"]
            isOneToOne: false
            referencedRelation: "packaging_sizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_order_items: {
        Row: {
          id: string
          order_id: string | null
          product_id: string | null
          quantity: number
          total_price: number | null
          unit_price: number | null
        }
        Insert: {
          id?: string
          order_id?: string | null
          product_id?: string | null
          quantity: number
          total_price?: number | null
          unit_price?: number | null
        }
        Update: {
          id?: string
          order_id?: string | null
          product_id?: string | null
          quantity?: number
          total_price?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "supplier_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_status_view"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_orders: {
        Row: {
          actual_delivery_date: string | null
          created_at: string | null
          created_by: string | null
          email_body: string | null
          expected_delivery_date: string | null
          id: string
          notes: string | null
          order_date: string | null
          status: string | null
          supplier_id: string | null
          total_amount: number | null
        }
        Insert: {
          actual_delivery_date?: string | null
          created_at?: string | null
          created_by?: string | null
          email_body?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          status?: string | null
          supplier_id?: string | null
          total_amount?: number | null
        }
        Update: {
          actual_delivery_date?: string | null
          created_at?: string | null
          created_by?: string | null
          email_body?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          status?: string | null
          supplier_id?: string | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          average_delivery_days: number | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          minimum_order_value: number | null
          name: string
          notes: string | null
          phone: string | null
        }
        Insert: {
          average_delivery_days?: number | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          minimum_order_value?: number | null
          name: string
          notes?: string | null
          phone?: string | null
        }
        Update: {
          average_delivery_days?: number | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          minimum_order_value?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      sync_log: {
        Row: {
          direction: string | null
          error_details: Json | null
          error_message: string | null
          id: string
          new_value: string | null
          old_value: string | null
          product_id: string | null
          status: string | null
          sync_type: string
          synced_at: string | null
          woocommerce_order_id: number | null
          woocommerce_product_id: number | null
        }
        Insert: {
          direction?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          product_id?: string | null
          status?: string | null
          sync_type: string
          synced_at?: string | null
          woocommerce_order_id?: number | null
          woocommerce_product_id?: number | null
        }
        Update: {
          direction?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          product_id?: string | null
          status?: string | null
          sync_type?: string
          synced_at?: string | null
          woocommerce_order_id?: number | null
          woocommerce_product_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_status_view"
            referencedColumns: ["id"]
          },
        ]
      }
      woocommerce_settings: {
        Row: {
          auto_import_enabled: boolean | null
          consumer_key: string
          consumer_secret: string
          created_at: string | null
          id: string
          is_active: boolean | null
          last_import_at: string | null
          store_url: string
          webhook_secret: string | null
        }
        Insert: {
          auto_import_enabled?: boolean | null
          consumer_key: string
          consumer_secret: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_import_at?: string | null
          store_url: string
          webhook_secret?: string | null
        }
        Update: {
          auto_import_enabled?: boolean | null
          consumer_key?: string
          consumer_secret?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_import_at?: string | null
          store_url?: string
          webhook_secret?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      stock_status_view: {
        Row: {
          cost_price: number | null
          created_at: string | null
          critical_stock: number | null
          current_stock: number | null
          description: string | null
          flavor_notes: string | null
          id: string | null
          is_active: boolean | null
          minimum_stock: number | null
          name: string | null
          origin: string | null
          package_count: number | null
          packaging_size_id: string | null
          roast_level: string | null
          selling_price: number | null
          stock_status: string | null
          supplier_id: string | null
          unit: string | null
          updated_at: string | null
          woocommerce_product_id: number | null
          woocommerce_parent_id: number | null
        }
        Insert: {
          cost_price?: number | null
          created_at?: string | null
          critical_stock?: number | null
          current_stock?: number | null
          description?: string | null
          flavor_notes?: string | null
          id?: string | null
          is_active?: boolean | null
          minimum_stock?: number | null
          name?: string | null
          origin?: string | null
          package_count?: number | null
          packaging_size_id?: string | null
          roast_level?: string | null
          selling_price?: number | null
          stock_status?: never
          supplier_id?: string | null
          unit?: string | null
          updated_at?: string | null
          woocommerce_product_id?: number | null
          woocommerce_parent_id?: number | null
        }
        Update: {
          cost_price?: number | null
          created_at?: string | null
          critical_stock?: number | null
          current_stock?: number | null
          description?: string | null
          flavor_notes?: string | null
          id?: string | null
          is_active?: boolean | null
          minimum_stock?: number | null
          name?: string | null
          origin?: string | null
          package_count?: number | null
          packaging_size_id?: string | null
          roast_level?: string | null
          selling_price?: number | null
          stock_status?: never
          supplier_id?: string | null
          unit?: string | null
          updated_at?: string | null
          woocommerce_product_id?: number | null
          woocommerce_parent_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_packaging_size_id_fkey"
            columns: ["packaging_size_id"]
            isOneToOne: false
            referencedRelation: "packaging_sizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
