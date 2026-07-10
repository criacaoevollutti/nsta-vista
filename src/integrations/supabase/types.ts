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
      client_credentials: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          password: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          password: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          password?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_credentials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          approval_status: string
          caption: string
          carousel_images: Json
          client_comment: string
          created_at: string
          date: string
          id: string
          media: string
          notes: string
          objective: string
          position: number
          status: string
          thumb: string
          time: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: string
          caption?: string
          carousel_images?: Json
          client_comment?: string
          created_at?: string
          date?: string
          id?: string
          media?: string
          notes?: string
          objective?: string
          position?: number
          status?: string
          thumb?: string
          time?: string
          title?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: string
          caption?: string
          carousel_images?: Json
          client_comment?: string
          created_at?: string
          date?: string
          id?: string
          media?: string
          notes?: string
          objective?: string
          position?: number
          status?: string
          thumb?: string
          time?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          access_pin: string | null
          avatar: string
          bio: string
          category: string
          created_at: string
          followers: string
          following: number
          handle: string
          highlight_covers: Json
          highlight_names: Json
          id: string
          is_admin: boolean
          location: string
          name: string
          position: number | null
          posts_count: number | null
          share_token: string
          site: string
          updated_at: string
        }
        Insert: {
          access_pin?: string | null
          avatar?: string
          bio?: string
          category?: string
          created_at?: string
          followers?: string
          following?: number
          handle?: string
          highlight_covers?: Json
          highlight_names?: Json
          id?: string
          is_admin?: boolean
          location?: string
          name?: string
          position?: number | null
          posts_count?: number | null
          share_token?: string
          site?: string
          updated_at?: string
        }
        Update: {
          access_pin?: string | null
          avatar?: string
          bio?: string
          category?: string
          created_at?: string
          followers?: string
          following?: number
          handle?: string
          highlight_covers?: Json
          highlight_names?: Json
          id?: string
          is_admin?: boolean
          location?: string
          name?: string
          position?: number | null
          posts_count?: number | null
          share_token?: string
          site?: string
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
      admin_create_post_for: {
        Args: { _admin_pin: string; _position: number; _target_id: string }
        Returns: Json
      }
      admin_create_profile: {
        Args: { _admin_pin: string; _handle: string; _name: string }
        Returns: Json
      }
      admin_delete_post: {
        Args: { _admin_pin: string; _post_id: string }
        Returns: boolean
      }
      admin_delete_profile: {
        Args: { _admin_pin: string; _target_id: string }
        Returns: boolean
      }
      admin_reorder_posts: {
        Args: { _admin_pin: string; _post_ids: string[]; _target_id: string }
        Returns: boolean
      }
      admin_reorder_profiles: {
        Args: { _admin_pin: string; _profile_ids: string[] }
        Returns: boolean
      }
      admin_update_highlights: {
        Args: {
          _admin_pin: string
          _covers: Json
          _names: Json
          _target_id: string
        }
        Returns: boolean
      }
      admin_update_post: {
        Args: { _admin_pin: string; _patch: Json; _post_id: string }
        Returns: boolean
      }
      admin_update_profile: {
        Args: { _admin_pin: string; _patch: Json; _target_id: string }
        Returns: boolean
      }
      generate_unique_pin: { Args: never; Returns: string }
      get_admin_data_by_pin: { Args: { _pin: string }; Returns: Json }
      get_profile_by_pin: { Args: { _pin: string }; Returns: Json }
      get_shared_profile: { Args: { _token: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      set_post_approval: {
        Args: {
          _comment: string
          _post_id: string
          _status: string
          _token: string
        }
        Returns: boolean
      }
      set_post_approval_by_pin: {
        Args: {
          _comment: string
          _pin: string
          _post_id: string
          _status: string
        }
        Returns: boolean
      }
      storage_pin_name_valid: { Args: { _name: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "client"
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
      app_role: ["admin", "client"],
    },
  },
} as const
