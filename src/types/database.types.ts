export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: { action: string; created_at: string | null; entity_id: string | null; entity_type: string | null; id: string; metadata: Json | null; org_id: string | null; user_id: string | null }
        Insert: { action: string; created_at?: string | null; entity_id?: string | null; entity_type?: string | null; id?: string; metadata?: Json | null; org_id?: string | null; user_id?: string | null }
        Update: { action?: string; created_at?: string | null; entity_id?: string | null; entity_type?: string | null; id?: string; metadata?: Json | null; org_id?: string | null; user_id?: string | null }
        Relationships: [
          { foreignKeyName: "audit_logs_org_id_fkey"; columns: ["org_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ]
      }
      clause_risks: {
        Row: { analysis_id: string; category: string | null; created_at: string | null; exposure_likely: number | null; exposure_max: number | null; exposure_min: number | null; id: string; original_text: string | null; severity: string; sort_order: number | null; suggestion: string | null; title: string }
        Insert: { analysis_id: string; category?: string | null; created_at?: string | null; exposure_likely?: number | null; exposure_max?: number | null; exposure_min?: number | null; id?: string; original_text?: string | null; severity: string; sort_order?: number | null; suggestion?: string | null; title: string }
        Update: { analysis_id?: string; category?: string | null; created_at?: string | null; exposure_likely?: number | null; exposure_max?: number | null; exposure_min?: number | null; id?: string; original_text?: string | null; severity?: string; sort_order?: number | null; suggestion?: string | null; title?: string }
        Relationships: [
          { foreignKeyName: "clause_risks_analysis_id_fkey"; columns: ["analysis_id"]; isOneToOne: false; referencedRelation: "contract_analyses"; referencedColumns: ["id"] }
        ]
      }
      contract_analyses: {
        Row: { analyzed_at: string | null; contract_id: string; cost_usd: number | null; created_at: string | null; financial_impact: Json | null; financial_total: number | null; id: string; model_used: string | null; prompt_version: string | null; risk_level: string | null; risk_score: number | null; status: string | null; summary: string | null; tokens_input: number | null; tokens_output: number | null }
        Insert: { analyzed_at?: string | null; contract_id: string; cost_usd?: number | null; created_at?: string | null; financial_impact?: Json | null; financial_total?: number | null; id?: string; model_used?: string | null; prompt_version?: string | null; risk_level?: string | null; risk_score?: number | null; status?: string | null; summary?: string | null; tokens_input?: number | null; tokens_output?: number | null }
        Update: { analyzed_at?: string | null; contract_id?: string; cost_usd?: number | null; created_at?: string | null; financial_impact?: Json | null; financial_total?: number | null; id?: string; model_used?: string | null; prompt_version?: string | null; risk_level?: string | null; risk_score?: number | null; status?: string | null; summary?: string | null; tokens_input?: number | null; tokens_output?: number | null }
        Relationships: [
          { foreignKeyName: "contract_analyses_contract_id_fkey"; columns: ["contract_id"]; isOneToOne: false; referencedRelation: "contracts"; referencedColumns: ["id"] }
        ]
      }
      contract_contents: {
        Row: { contract_id: string; id: string; ocr_applied: boolean | null; parsed_at: string | null; raw_text: string | null; word_count: number | null }
        Insert: { contract_id: string; id?: string; ocr_applied?: boolean | null; parsed_at?: string | null; raw_text?: string | null; word_count?: number | null }
        Update: { contract_id?: string; id?: string; ocr_applied?: boolean | null; parsed_at?: string | null; raw_text?: string | null; word_count?: number | null }
        Relationships: [
          { foreignKeyName: "contract_contents_contract_id_fkey"; columns: ["contract_id"]; isOneToOne: false; referencedRelation: "contracts"; referencedColumns: ["id"] }
        ]
      }
      contract_obligations: {
        Row: { alert_sent_1: boolean | null; alert_sent_15: boolean | null; alert_sent_30: boolean | null; alert_sent_7: boolean | null; contract_id: string; created_at: string | null; description: string; due_date: string | null; id: string; obligation_type: string | null; org_id: string; penalty_text: string | null; recurrence: string | null; responsible: string | null; source: string | null; status: string | null; value_cents: number | null }
        Insert: { alert_sent_1?: boolean | null; alert_sent_15?: boolean | null; alert_sent_30?: boolean | null; alert_sent_7?: boolean | null; contract_id: string; created_at?: string | null; description: string; due_date?: string | null; id?: string; obligation_type?: string | null; org_id: string; penalty_text?: string | null; recurrence?: string | null; responsible?: string | null; source?: string | null; status?: string | null; value_cents?: number | null }
        Update: { alert_sent_1?: boolean | null; alert_sent_15?: boolean | null; alert_sent_30?: boolean | null; alert_sent_7?: boolean | null; contract_id?: string; created_at?: string | null; description?: string; due_date?: string | null; id?: string; obligation_type?: string | null; org_id?: string; penalty_text?: string | null; recurrence?: string | null; responsible?: string | null; source?: string | null; status?: string | null; value_cents?: number | null }
        Relationships: [
          { foreignKeyName: "contract_obligations_contract_id_fkey"; columns: ["contract_id"]; isOneToOne: false; referencedRelation: "contracts"; referencedColumns: ["id"] },
          { foreignKeyName: "contract_obligations_org_id_fkey"; columns: ["org_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ]
      }
      contracts: {
        Row: { contract_value_informed: number | null; created_at: string | null; file_name: string | null; file_path: string | null; file_size: number | null; file_type: string | null; id: string; name: string; org_id: string; page_count: number | null; parsed_data: Json | null; party: string | null; status: string; type: string | null; updated_at: string | null }
        Insert: { contract_value_informed?: number | null; created_at?: string | null; file_name?: string | null; file_path?: string | null; file_size?: number | null; file_type?: string | null; id?: string; name: string; org_id: string; page_count?: number | null; parsed_data?: Json | null; party?: string | null; status?: string; type?: string | null; updated_at?: string | null }
        Update: { contract_value_informed?: number | null; created_at?: string | null; file_name?: string | null; file_path?: string | null; file_size?: number | null; file_type?: string | null; id?: string; name?: string; org_id?: string; page_count?: number | null; parsed_data?: Json | null; party?: string | null; status?: string; type?: string | null; updated_at?: string | null }
        Relationships: [
          { foreignKeyName: "contracts_org_id_fkey"; columns: ["org_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ]
      }
      financial_impacts: {
        Row: { analysis_id: string; calculated_at: string | null; clause_risk_id: string; contract_term: number | null; contract_value: number | null; exposure_likely: number | null; exposure_max: number | null; exposure_min: number | null; formula_used: string | null; id: string; params_snapshot: Json | null }
        Insert: { analysis_id: string; calculated_at?: string | null; clause_risk_id: string; contract_term?: number | null; contract_value?: number | null; exposure_likely?: number | null; exposure_max?: number | null; exposure_min?: number | null; formula_used?: string | null; id?: string; params_snapshot?: Json | null }
        Update: { analysis_id?: string; calculated_at?: string | null; clause_risk_id?: string; contract_term?: number | null; contract_value?: number | null; exposure_likely?: number | null; exposure_max?: number | null; exposure_min?: number | null; formula_used?: string | null; id?: string; params_snapshot?: Json | null }
        Relationships: [
          { foreignKeyName: "financial_impacts_analysis_id_fkey"; columns: ["analysis_id"]; isOneToOne: false; referencedRelation: "contract_analyses"; referencedColumns: ["id"] },
          { foreignKeyName: "financial_impacts_clause_risk_id_fkey"; columns: ["clause_risk_id"]; isOneToOne: false; referencedRelation: "clause_risks"; referencedColumns: ["id"] }
        ]
      }
      financial_parameters: {
        Row: { base_multiplier: number | null; clause_type: string; description: string | null; formula_type: string; id: string; max_cap_pct: number | null; updated_at: string | null }
        Insert: { base_multiplier?: number | null; clause_type: string; description?: string | null; formula_type: string; id?: string; max_cap_pct?: number | null; updated_at?: string | null }
        Update: { base_multiplier?: number | null; clause_type?: string; description?: string | null; formula_type?: string; id?: string; max_cap_pct?: number | null; updated_at?: string | null }
        Relationships: []
      }
      economic_indexes: {
        Row: { fetched_at: string | null; id: string; name: string; period: string | null; value: number }
        Insert: { fetched_at?: string | null; id?: string; name: string; period?: string | null; value: number }
        Update: { fetched_at?: string | null; id?: string; name?: string; period?: string | null; value?: number }
        Relationships: []
      }
      generated_contracts: {
        Row: { content_docx: string | null; created_at: string | null; file_path: string | null; id: string; name: string | null; org_id: string; party_a: string | null; party_b: string | null; pre_risk_score: number | null; sector: string | null; template_id: string; term_days: number | null; value_cents: number | null }
        Insert: { content_docx?: string | null; created_at?: string | null; file_path?: string | null; id?: string; name?: string | null; org_id: string; party_a?: string | null; party_b?: string | null; pre_risk_score?: number | null; sector?: string | null; template_id: string; term_days?: number | null; value_cents?: number | null }
        Update: { content_docx?: string | null; created_at?: string | null; file_path?: string | null; id?: string; name?: string | null; org_id?: string; party_a?: string | null; party_b?: string | null; pre_risk_score?: number | null; sector?: string | null; template_id?: string; term_days?: number | null; value_cents?: number | null }
        Relationships: [
          { foreignKeyName: "generated_contracts_org_id_fkey"; columns: ["org_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ]
      }
      organizations: {
        Row: { blocked: boolean; cnpj: string | null; created_at: string | null; id: string; logo_url: string | null; name: string; plan_id: string; plan_status: string; sector: string | null; stripe_customer_id: string | null; trial_ends_at: string | null }
        Insert: { blocked?: boolean; cnpj?: string | null; created_at?: string | null; id?: string; logo_url?: string | null; name: string; plan_id?: string; plan_status?: string; sector?: string | null; stripe_customer_id?: string | null; trial_ends_at?: string | null }
        Update: { blocked?: boolean; cnpj?: string | null; created_at?: string | null; id?: string; logo_url?: string | null; name?: string; plan_id?: string; plan_status?: string; sector?: string | null; stripe_customer_id?: string | null; trial_ends_at?: string | null }
        Relationships: []
      }
      organizations_status_history: {
        Row: { id: string; org_id: string; previous_plan_status: string | null; plan_status: string; previous_blocked: boolean | null; blocked: boolean; changed_at: string }
        Insert: { id?: string; org_id: string; previous_plan_status?: string | null; plan_status: string; previous_blocked?: boolean | null; blocked: boolean; changed_at?: string }
        Update: { id?: string; org_id?: string; previous_plan_status?: string | null; plan_status?: string; previous_blocked?: boolean | null; blocked?: boolean; changed_at?: string }
        Relationships: []
      }
      waitlist: {
        Row: { id: string; name: string; email: string; phone: string | null; company: string | null; role: string | null; message: string | null; source: string | null; created_at: string | null }
        Insert: { id?: string; name: string; email: string; phone?: string | null; company?: string | null; role?: string | null; message?: string | null; source?: string | null; created_at?: string | null }
        Update: { id?: string; name?: string; email?: string; phone?: string | null; company?: string | null; role?: string | null; message?: string | null; source?: string | null; created_at?: string | null }
        Relationships: []
      }
      user_feedback: {
        Row: { id: string; org_id: string | null; user_id: string | null; category: string; message: string; page_url: string | null; created_at: string | null }
        Insert: { id?: string; org_id?: string | null; user_id?: string | null; category: string; message: string; page_url?: string | null; created_at?: string | null }
        Update: { id?: string; org_id?: string | null; user_id?: string | null; category?: string; message?: string; page_url?: string | null; created_at?: string | null }
        Relationships: [
          { foreignKeyName: "user_feedback_org_id_fkey"; columns: ["org_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
          { foreignKeyName: "user_feedback_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] }
        ]
      }
      users: {
        Row: { created_at: string | null; email: string; id: string; is_ponderum_staff: boolean; name: string | null; onboarding_completed: boolean; org_id: string; phone: string | null; role: string; terms_accepted_at: string | null }
        Insert: { created_at?: string | null; email: string; id: string; is_ponderum_staff?: boolean; name?: string | null; onboarding_completed?: boolean; org_id: string; phone?: string | null; role?: string; terms_accepted_at?: string | null }
        Update: { created_at?: string | null; email?: string; id?: string; is_ponderum_staff?: boolean; name?: string | null; onboarding_completed?: boolean; org_id?: string; phone?: string | null; role?: string; terms_accepted_at?: string | null }
        Relationships: [
          { foreignKeyName: "users_org_id_fkey"; columns: ["org_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ]
      }
    }
    Views: {
      dashboard_summary: {
        Row: { avg_risk_score: number | null; org_id: string | null; pending_obligations: number | null; total_contracts: number | null; total_exposure_cents: number | null; urgent_obligations: number | null }
        Relationships: []
      }
    }
    Functions: {
      get_org_id: { Args: Record<PropertyKey, never>; Returns: string }
      get_admin_dashboard: { Args: Record<PropertyKey, never>; Returns: Json }
      list_staff_organizations: { Args: { p_search?: string | null; p_page?: number; p_page_size?: number }; Returns: Json }
      staff_set_org_plan_status: { Args: { p_org_id: string; p_status: string }; Returns: undefined }
      staff_set_org_blocked: { Args: { p_org_id: string; p_blocked: boolean }; Returns: undefined }
      get_executive_dashboard: { Args: Record<PropertyKey, never>; Returns: Json }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
