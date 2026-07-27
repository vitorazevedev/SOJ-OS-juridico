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
      ancoras: {
        Row: {
          ativo: boolean
          categoria: string
          codigo: string
          condicoes_disparo: string
          created_at: string
          especie: string
          gravidade_referencia: number
          id: string
          razao: string
          titulo: string
          updated_at: string
          versao: number
        }
        Insert: {
          ativo?: boolean
          categoria: string
          codigo: string
          condicoes_disparo: string
          created_at?: string
          especie: string
          gravidade_referencia: number
          id?: string
          razao: string
          titulo: string
          updated_at?: string
          versao?: number
        }
        Update: {
          ativo?: boolean
          categoria?: string
          codigo?: string
          condicoes_disparo?: string
          created_at?: string
          especie?: string
          gravidade_referencia?: number
          id?: string
          razao?: string
          titulo?: string
          updated_at?: string
          versao?: number
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          org_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      billing_receipts: {
        Row: {
          amount_cents: number
          description: string
          id: string
          issued_at: string
          org_id: string
        }
        Insert: {
          amount_cents: number
          description: string
          id?: string
          issued_at?: string
          org_id: string
        }
        Update: {
          amount_cents?: number
          description?: string
          id?: string
          issued_at?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_receipts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clause_risks: {
        Row: {
          analysis_id: string
          ancora_id: string | null
          category: string | null
          conclusao: string | null
          confianca: string | null
          created_at: string | null
          exposure_likely: number | null
          exposure_max: number | null
          exposure_min: number | null
          gravidade: number | null
          id: string
          impacto_identificado: Json | null
          justificativa_gravidade: string | null
          mitigacao: string | null
          onera_parte_representada: boolean | null
          original_text: string | null
          polaridade_parte_representada: number | null
          review_status: string | null
          reviewed_at: string | null
          score_foro_execucao: number | null
          score_prazo_reversibilidade: number | null
          score_simetria: number | null
          score_valor_exposto: number | null
          severity: string
          sort_order: number | null
          suggestion: string | null
          title: string
        }
        Insert: {
          analysis_id: string
          ancora_id?: string | null
          category?: string | null
          conclusao?: string | null
          confianca?: string | null
          created_at?: string | null
          exposure_likely?: number | null
          exposure_max?: number | null
          exposure_min?: number | null
          gravidade?: number | null
          id?: string
          impacto_identificado?: Json | null
          justificativa_gravidade?: string | null
          mitigacao?: string | null
          onera_parte_representada?: boolean | null
          original_text?: string | null
          polaridade_parte_representada?: number | null
          review_status?: string | null
          reviewed_at?: string | null
          score_foro_execucao?: number | null
          score_prazo_reversibilidade?: number | null
          score_simetria?: number | null
          score_valor_exposto?: number | null
          severity: string
          sort_order?: number | null
          suggestion?: string | null
          title: string
        }
        Update: {
          analysis_id?: string
          ancora_id?: string | null
          category?: string | null
          conclusao?: string | null
          confianca?: string | null
          created_at?: string | null
          exposure_likely?: number | null
          exposure_max?: number | null
          exposure_min?: number | null
          gravidade?: number | null
          id?: string
          impacto_identificado?: Json | null
          justificativa_gravidade?: string | null
          mitigacao?: string | null
          onera_parte_representada?: boolean | null
          original_text?: string | null
          polaridade_parte_representada?: number | null
          review_status?: string | null
          reviewed_at?: string | null
          score_foro_execucao?: number | null
          score_prazo_reversibilidade?: number | null
          score_simetria?: number | null
          score_valor_exposto?: number | null
          severity?: string
          sort_order?: number | null
          suggestion?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "clause_risks_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "contract_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clause_risks_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "contract_analyses_gated"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clause_risks_ancora_id_fkey"
            columns: ["ancora_id"]
            isOneToOne: false
            referencedRelation: "ancoras"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_analyses: {
        Row: {
          analyzed_at: string | null
          contract_id: string
          cost_usd: number | null
          created_at: string | null
          financial_impact: Json | null
          financial_total: number | null
          id: string
          indice_desequilibrio: number | null
          model_used: string | null
          parte_representada: string | null
          prompt_version: string | null
          risk_level: string | null
          risk_score: number | null
          status: string | null
          summary: string | null
          tokens_input: number | null
          tokens_output: number | null
        }
        Insert: {
          analyzed_at?: string | null
          contract_id: string
          cost_usd?: number | null
          created_at?: string | null
          financial_impact?: Json | null
          financial_total?: number | null
          id?: string
          indice_desequilibrio?: number | null
          model_used?: string | null
          parte_representada?: string | null
          prompt_version?: string | null
          risk_level?: string | null
          risk_score?: number | null
          status?: string | null
          summary?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Update: {
          analyzed_at?: string | null
          contract_id?: string
          cost_usd?: number | null
          created_at?: string | null
          financial_impact?: Json | null
          financial_total?: number | null
          id?: string
          indice_desequilibrio?: number | null
          model_used?: string | null
          parte_representada?: string | null
          prompt_version?: string | null
          risk_level?: string | null
          risk_score?: number | null
          status?: string | null
          summary?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_analyses_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_contents: {
        Row: {
          contract_id: string
          id: string
          ocr_applied: boolean | null
          parsed_at: string | null
          raw_text: string | null
          word_count: number | null
        }
        Insert: {
          contract_id: string
          id?: string
          ocr_applied?: boolean | null
          parsed_at?: string | null
          raw_text?: string | null
          word_count?: number | null
        }
        Update: {
          contract_id?: string
          id?: string
          ocr_applied?: boolean | null
          parsed_at?: string | null
          raw_text?: string | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_contents_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_obligations: {
        Row: {
          alert_sent_1: boolean | null
          alert_sent_15: boolean | null
          alert_sent_30: boolean | null
          alert_sent_7: boolean | null
          contract_id: string
          created_at: string | null
          description: string
          due_date: string | null
          id: string
          obligation_type: string | null
          org_id: string
          penalty_text: string | null
          recurrence: string | null
          responsible: string | null
          source: string | null
          status: string | null
          value_cents: number | null
        }
        Insert: {
          alert_sent_1?: boolean | null
          alert_sent_15?: boolean | null
          alert_sent_30?: boolean | null
          alert_sent_7?: boolean | null
          contract_id: string
          created_at?: string | null
          description: string
          due_date?: string | null
          id?: string
          obligation_type?: string | null
          org_id: string
          penalty_text?: string | null
          recurrence?: string | null
          responsible?: string | null
          source?: string | null
          status?: string | null
          value_cents?: number | null
        }
        Update: {
          alert_sent_1?: boolean | null
          alert_sent_15?: boolean | null
          alert_sent_30?: boolean | null
          alert_sent_7?: boolean | null
          contract_id?: string
          created_at?: string | null
          description?: string
          due_date?: string | null
          id?: string
          obligation_type?: string | null
          org_id?: string
          penalty_text?: string | null
          recurrence?: string | null
          responsible?: string | null
          source?: string | null
          status?: string | null
          value_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_obligations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_obligations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          contract_value_informed: number | null
          created_at: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          id: string
          name: string
          org_id: string
          page_count: number | null
          parsed_data: Json | null
          party: string | null
          status: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          contract_value_informed?: number | null
          created_at?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          name: string
          org_id: string
          page_count?: number | null
          parsed_data?: Json | null
          party?: string | null
          status?: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          contract_value_informed?: number | null
          created_at?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          name?: string
          org_id?: string
          page_count?: number | null
          parsed_data?: Json | null
          party?: string | null
          status?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      economic_indexes: {
        Row: {
          fetched_at: string | null
          id: string
          name: string
          period: string | null
          value: number
        }
        Insert: {
          fetched_at?: string | null
          id?: string
          name: string
          period?: string | null
          value: number
        }
        Update: {
          fetched_at?: string | null
          id?: string
          name?: string
          period?: string | null
          value?: number
        }
        Relationships: []
      }
      financial_impacts: {
        Row: {
          analysis_id: string
          calculated_at: string | null
          clause_risk_id: string
          contract_term: number | null
          contract_value: number | null
          exposure_likely: number | null
          exposure_max: number | null
          exposure_min: number | null
          formula_used: string | null
          id: string
          params_snapshot: Json | null
        }
        Insert: {
          analysis_id: string
          calculated_at?: string | null
          clause_risk_id: string
          contract_term?: number | null
          contract_value?: number | null
          exposure_likely?: number | null
          exposure_max?: number | null
          exposure_min?: number | null
          formula_used?: string | null
          id?: string
          params_snapshot?: Json | null
        }
        Update: {
          analysis_id?: string
          calculated_at?: string | null
          clause_risk_id?: string
          contract_term?: number | null
          contract_value?: number | null
          exposure_likely?: number | null
          exposure_max?: number | null
          exposure_min?: number | null
          formula_used?: string | null
          id?: string
          params_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_impacts_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "contract_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_impacts_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "contract_analyses_gated"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_impacts_clause_risk_id_fkey"
            columns: ["clause_risk_id"]
            isOneToOne: false
            referencedRelation: "clause_risks"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_parameters: {
        Row: {
          base_multiplier: number | null
          clause_type: string
          description: string | null
          formula_type: string
          id: string
          max_cap_pct: number | null
          updated_at: string | null
        }
        Insert: {
          base_multiplier?: number | null
          clause_type: string
          description?: string | null
          formula_type: string
          id?: string
          max_cap_pct?: number | null
          updated_at?: string | null
        }
        Update: {
          base_multiplier?: number | null
          clause_type?: string
          description?: string | null
          formula_type?: string
          id?: string
          max_cap_pct?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      generated_contracts: {
        Row: {
          content_docx: string | null
          created_at: string | null
          file_path: string | null
          id: string
          name: string | null
          org_id: string
          party_a: string | null
          party_b: string | null
          pre_risk_score: number | null
          sector: string | null
          template_id: string
          term_days: number | null
          value_cents: number | null
        }
        Insert: {
          content_docx?: string | null
          created_at?: string | null
          file_path?: string | null
          id?: string
          name?: string | null
          org_id: string
          party_a?: string | null
          party_b?: string | null
          pre_risk_score?: number | null
          sector?: string | null
          template_id: string
          term_days?: number | null
          value_cents?: number | null
        }
        Update: {
          content_docx?: string | null
          created_at?: string | null
          file_path?: string | null
          id?: string
          name?: string | null
          org_id?: string
          party_a?: string | null
          party_b?: string | null
          pre_risk_score?: number | null
          sector?: string | null
          template_id?: string
          term_days?: number | null
          value_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_contracts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      indice_desequilibrio_parametros: {
        Row: {
          corte_de_ruido: number
          created_at: string
          id: string
          lambda: number
          nota: string | null
          piso_alto: number
          piso_critico: number
          piso_medio: number
          versao: number
          vigente: boolean
        }
        Insert: {
          corte_de_ruido?: number
          created_at?: string
          id?: string
          lambda?: number
          nota?: string | null
          piso_alto?: number
          piso_critico?: number
          piso_medio?: number
          versao: number
          vigente?: boolean
        }
        Update: {
          corte_de_ruido?: number
          created_at?: string
          id?: string
          lambda?: number
          nota?: string | null
          piso_alto?: number
          piso_critico?: number
          piso_medio?: number
          versao?: number
          vigente?: boolean
        }
        Relationships: []
      }
      organizations: {
        Row: {
          blocked: boolean
          cnpj: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          plan_id: string
          plan_renews_at: string | null
          plan_status: string
          sector: string | null
          stripe_customer_id: string | null
          trial_ends_at: string | null
        }
        Insert: {
          blocked?: boolean
          cnpj?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          plan_id?: string
          plan_renews_at?: string | null
          plan_status?: string
          sector?: string | null
          stripe_customer_id?: string | null
          trial_ends_at?: string | null
        }
        Update: {
          blocked?: boolean
          cnpj?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          plan_id?: string
          plan_renews_at?: string | null
          plan_status?: string
          sector?: string | null
          stripe_customer_id?: string | null
          trial_ends_at?: string | null
        }
        Relationships: []
      }
      organizations_status_history: {
        Row: {
          blocked: boolean
          changed_at: string
          id: string
          org_id: string
          plan_status: string
          previous_blocked: boolean | null
          previous_plan_status: string | null
        }
        Insert: {
          blocked: boolean
          changed_at?: string
          id?: string
          org_id: string
          plan_status: string
          previous_blocked?: boolean | null
          previous_plan_status?: string | null
        }
        Update: {
          blocked?: boolean
          changed_at?: string
          id?: string
          org_id?: string
          plan_status?: string
          previous_blocked?: boolean | null
          previous_plan_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_status_history_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_clicks: {
        Row: {
          clicked_at: string
          id: string
          org_id: string | null
          user_id: string | null
        }
        Insert: {
          clicked_at?: string
          id?: string
          org_id?: string | null
          user_id?: string | null
        }
        Update: {
          clicked_at?: string
          id?: string
          org_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_clicks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      temp_org: {
        Row: {
          org_id: string | null
        }
        Insert: {
          org_id?: string | null
        }
        Update: {
          org_id?: string | null
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          category: string
          created_at: string | null
          id: string
          message: string
          org_id: string | null
          page_url: string | null
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          message: string
          org_id?: string | null
          page_url?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          message?: string
          org_id?: string | null
          page_url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_feedback_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          can_view_dev: boolean
          can_view_ponderum_team: boolean
          created_at: string | null
          email: string
          full_platform_access: boolean
          id: string
          is_ponderum_staff: boolean
          name: string | null
          onboarding_completed: boolean
          org_id: string
          phone: string | null
          role: string
          social_name: string | null
          staff_job_title: string | null
          terms_accepted_at: string | null
        }
        Insert: {
          can_view_dev?: boolean
          can_view_ponderum_team?: boolean
          created_at?: string | null
          email: string
          full_platform_access?: boolean
          id: string
          is_ponderum_staff?: boolean
          name?: string | null
          onboarding_completed?: boolean
          org_id: string
          phone?: string | null
          role?: string
          social_name?: string | null
          staff_job_title?: string | null
          terms_accepted_at?: string | null
        }
        Update: {
          can_view_dev?: boolean
          can_view_ponderum_team?: boolean
          created_at?: string | null
          email?: string
          full_platform_access?: boolean
          id?: string
          is_ponderum_staff?: boolean
          name?: string | null
          onboarding_completed?: boolean
          org_id?: string
          phone?: string | null
          role?: string
          social_name?: string | null
          staff_job_title?: string | null
          terms_accepted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          company: string | null
          created_at: string | null
          email: string
          id: string
          message: string | null
          name: string
          phone: string | null
          role: string | null
          source: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email: string
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          role?: string | null
          source?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          role?: string | null
          source?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      contract_analyses_gated: {
        Row: {
          analyzed_at: string | null
          contract_id: string | null
          cost_usd: number | null
          created_at: string | null
          financial_impact: Json | null
          financial_total: number | null
          id: string | null
          indice_desequilibrio: number | null
          model_used: string | null
          parte_representada: string | null
          prompt_version: string | null
          risk_level: string | null
          risk_score: number | null
          status: string | null
          summary: string | null
          tokens_input: number | null
          tokens_output: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_analyses_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_summary: {
        Row: {
          avg_risk_score: number | null
          org_id: string | null
          pending_obligations: number | null
          total_contracts: number | null
          total_exposure_cents: number | null
          urgent_obligations: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_admin_dashboard: { Args: never; Returns: Json }
      get_executive_dashboard: { Args: never; Returns: Json }
      get_org_id: { Args: never; Returns: string }
      get_support_stats: { Args: never; Returns: Json }
      list_contracts: { Args: never; Returns: Json }
      list_ponderum_staff: { Args: never; Returns: Json }
      list_recent_contracts: { Args: { p_limit?: number }; Returns: Json }
      list_staff_organizations: {
        Args: { p_page?: number; p_page_size?: number; p_search?: string }
        Returns: Json
      }
      recalcular_indice_desequilibrio: {
        Args: { p_analysis_id: string }
        Returns: number
      }
      staff_renew_org_subscription: {
        Args: { p_org_id: string }
        Returns: undefined
      }
      staff_set_org_blocked: {
        Args: { p_blocked: boolean; p_org_id: string }
        Returns: undefined
      }
      staff_set_org_plan_status: {
        Args: { p_org_id: string; p_status: string }
        Returns: undefined
      }
      staff_set_support_whatsapp: {
        Args: { p_number: string }
        Returns: undefined
      }
      staff_update_member_permissions:
        | {
            Args: {
              p_can_view_dev: boolean
              p_can_view_ponderum_team: boolean
              p_full_platform_access: boolean
              p_job_title: string
              p_user_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_can_view_dev: boolean
              p_can_view_ponderum_team: boolean
              p_full_platform_access: boolean
              p_job_title: string
              p_social_name?: string
              p_user_id: string
            }
            Returns: undefined
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
