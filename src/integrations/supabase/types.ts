export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      jira_issues: {
        Row: {
          assignee_account_id: string | null
          assignee_display_name: string | null
          cloud_id: string
          created_at: string
          created_at_jira: string | null
          description: string | null
          due_date: string | null
          id: string
          issue_key: string
          issue_type: string
          issue_url: string | null
          jira_issue_id: string
          priority_id: string | null
          priority_name: string | null
          project_key: string
          project_name: string
          reporter_account_id: string | null
          status_category: string | null
          status_name: string
          summary: string
          updated_at: string
          updated_at_jira: string | null
          user_id: string
        }
        Insert: {
          assignee_account_id?: string | null
          assignee_display_name?: string | null
          cloud_id: string
          created_at?: string
          created_at_jira?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          issue_key: string
          issue_type: string
          issue_url?: string | null
          jira_issue_id: string
          priority_id?: string | null
          priority_name?: string | null
          project_key: string
          project_name: string
          reporter_account_id?: string | null
          status_category?: string | null
          status_name: string
          summary: string
          updated_at?: string
          updated_at_jira?: string | null
          user_id: string
        }
        Update: {
          assignee_account_id?: string | null
          assignee_display_name?: string | null
          cloud_id?: string
          created_at?: string
          created_at_jira?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          issue_key?: string
          issue_type?: string
          issue_url?: string | null
          jira_issue_id?: string
          priority_id?: string | null
          priority_name?: string | null
          project_key?: string
          project_name?: string
          reporter_account_id?: string | null
          status_category?: string | null
          status_name?: string
          summary?: string
          updated_at?: string
          updated_at_jira?: string | null
          user_id?: string
        }
        Relationships: []
      }
      jira_oauth_tokens: {
        Row: {
          access_token: string
          cloud_id: string
          created_at: string
          expires_at: string | null
          id: string
          refresh_token: string | null
          scope: string
          site_url: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          cloud_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          scope: string
          site_url: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          cloud_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          scope?: string
          site_url?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      jira_projects: {
        Row: {
          cloud_id: string
          created_at: string
          id: string
          jira_project_id: string
          lead_account_id: string | null
          project_key: string
          project_name: string
          project_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cloud_id: string
          created_at?: string
          id?: string
          jira_project_id: string
          lead_account_id?: string | null
          project_key: string
          project_name: string
          project_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cloud_id?: string
          created_at?: string
          id?: string
          jira_project_id?: string
          lead_account_id?: string | null
          project_key?: string
          project_name?: string
          project_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      jira_sync_status: {
        Row: {
          cloud_id: string
          created_at: string
          error_message: string | null
          id: string
          issues_synced: number | null
          last_sync_at: string
          sync_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cloud_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          issues_synced?: number | null
          last_sync_at?: string
          sync_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cloud_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          issues_synced?: number | null
          last_sync_at?: string
          sync_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      slack_conversations: {
        Row: {
          conversation_id: string
          conversation_name: string | null
          conversation_purpose: string | null
          conversation_topic: string | null
          conversation_type: string
          created_at: string | null
          id: string
          is_archived: boolean | null
          is_member: boolean | null
          last_message_text: string | null
          last_message_ts: number | null
          member_count: number | null
          slack_team_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          conversation_id: string
          conversation_name?: string | null
          conversation_purpose?: string | null
          conversation_topic?: string | null
          conversation_type: string
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_member?: boolean | null
          last_message_text?: string | null
          last_message_ts?: number | null
          member_count?: number | null
          slack_team_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string
          conversation_name?: string | null
          conversation_purpose?: string | null
          conversation_topic?: string | null
          conversation_type?: string
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_member?: boolean | null
          last_message_text?: string | null
          last_message_ts?: number | null
          member_count?: number | null
          slack_team_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      slack_mentions: {
        Row: {
          conversation_id: string
          conversation_name: string | null
          conversation_type: string | null
          created_at: string | null
          id: string
          is_channel: boolean | null
          mentioned_by_user_id: string
          mentioned_by_username: string | null
          mentioned_user_id: string
          message_text: string | null
          message_ts: string
          permalink: string | null
          slack_created_at: string | null
          slack_team_id: string
          user_id: string | null
        }
        Insert: {
          conversation_id: string
          conversation_name?: string | null
          conversation_type?: string | null
          created_at?: string | null
          id?: string
          is_channel?: boolean | null
          mentioned_by_user_id: string
          mentioned_by_username?: string | null
          mentioned_user_id: string
          message_text?: string | null
          message_ts: string
          permalink?: string | null
          slack_created_at?: string | null
          slack_team_id: string
          user_id?: string | null
        }
        Update: {
          conversation_id?: string
          conversation_name?: string | null
          conversation_type?: string | null
          created_at?: string | null
          id?: string
          is_channel?: boolean | null
          mentioned_by_user_id?: string
          mentioned_by_username?: string | null
          mentioned_user_id?: string
          message_text?: string | null
          message_ts?: string
          permalink?: string | null
          slack_created_at?: string | null
          slack_team_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      slack_messages: {
        Row: {
          conversation_id: string
          created_at: string | null
          id: string
          message_id: string
          message_text: string | null
          message_ts: number
          message_type: string | null
          parent_user_id: string | null
          permalink: string | null
          slack_team_id: string
          slack_user_id: string
          thread_ts: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          id?: string
          message_id: string
          message_text?: string | null
          message_ts: number
          message_type?: string | null
          parent_user_id?: string | null
          permalink?: string | null
          slack_team_id: string
          slack_user_id: string
          thread_ts?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          id?: string
          message_id?: string
          message_text?: string | null
          message_ts?: number
          message_type?: string | null
          parent_user_id?: string | null
          permalink?: string | null
          slack_team_id?: string
          slack_user_id?: string
          thread_ts?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      slack_oauth_tokens: {
        Row: {
          access_token: string
          id: string
          installed_at: string | null
          scope: string
          slack_team_id: string
          slack_user_id: string
          user_id: string | null
        }
        Insert: {
          access_token: string
          id?: string
          installed_at?: string | null
          scope: string
          slack_team_id: string
          slack_user_id: string
          user_id?: string | null
        }
        Update: {
          access_token?: string
          id?: string
          installed_at?: string | null
          scope?: string
          slack_team_id?: string
          slack_user_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_slack_channels: {
        Args: { user_uuid: string }
        Returns: {
          conversation_id: string
          conversation_name: string
          conversation_type: string
          last_message_text: string
          last_message_ts: number
          member_count: number
          is_archived: boolean
        }[]
      }
      get_user_slack_info: {
        Args: { p_user_id: string }
        Returns: {
          slack_team_id: string
          slack_user_id: string
          access_token: string
          scope: string
        }[]
      }
      get_user_slack_mentions: {
        Args: { p_user_id: string; p_limit?: number }
        Returns: {
          id: string
          conversation_id: string
          conversation_name: string
          conversation_type: string
          is_channel: boolean
          message_ts: string
          message_text: string
          mentioned_by_user_id: string
          mentioned_by_username: string
          permalink: string
          slack_created_at: string
        }[]
      }
      get_user_slack_mentions_with_users: {
        Args: { p_user_id: string; p_limit?: number }
        Returns: {
          id: string
          conversation_id: string
          conversation_name: string
          conversation_type: string
          is_channel: boolean
          message_ts: string
          message_text: string
          mentioned_by_user_id: string
          mentioned_by_username: string
          permalink: string
          slack_created_at: string
        }[]
      }
      get_user_slack_team_info: {
        Args: { p_user_id: string }
        Returns: {
          slack_team_id: string
          slack_user_id: string
          team_name: string
        }[]
      }
      has_slack_connection: {
        Args: { p_user_id: string }
        Returns: boolean
      }
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
