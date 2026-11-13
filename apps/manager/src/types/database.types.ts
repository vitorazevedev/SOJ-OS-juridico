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
      analysis_shadow_context: {
        Row: {
          analysis_id: string
          applicable: boolean | null
          business_nature: string | null
          confidence_document: number | null
          confidence_flow: number | null
          context_schema_version: string
          disclosing_parties: Json | null
          document_purpose: string | null
          document_type: string | null
          evidence_document: Json | null
          evidence_flow: Json | null
          extracted_at: string
          id: string
          modality: string | null
          negotiation_stage: string | null
          prompt_version: string
          receiving_parties: Json | null
          represented_party: string | null
          represented_party_also_discloses: boolean | null
          represented_party_role: string | null
          requires_confirmation_document: boolean
          requires_confirmation_flow: boolean
        }
        Insert: {
          analysis_id: string
          applicable?: boolean | null
          business_nature?: string | null
          confidence_document?: number | null
          confidence_flow?: number | null
          context_schema_version?: string
          disclosing_parties?: Json | null
          document_purpose?: string | null
          document_type?: string | null
          evidence_document?: Json | null
          evidence_flow?: Json | null
          extracted_at?: string
          id?: string
          modality?: string | null
          negotiation_stage?: string | null
          prompt_version: string
          receiving_parties?: Json | null
          represented_party?: string | null
          represented_party_also_discloses?: boolean | null
          represented_party_role?: string | null
          requires_confirmation_document?: boolean
          requires_confirmation_flow?: boolean
        }
        Update: {
          analysis_id?: string
          applicable?: boolean | null
          business_nature?: string | null
          confidence_document?: number | null
          confidence_flow?: number | null
          context_schema_version?: string
          disclosing_parties?: Json | null
          document_purpose?: string | null
          document_type?: string | null
          evidence_document?: Json | null
          evidence_flow?: Json | null
          extracted_at?: string
          id?: string
          modality?: string | null
          negotiation_stage?: string | null
          prompt_version?: string
          receiving_parties?: Json | null
          represented_party?: string | null
          represented_party_also_discloses?: boolean | null
          represented_party_role?: string | null
          requires_confirmation_document?: boolean
          requires_confirmation_flow?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "analysis_shadow_context_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "contract_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_shadow_context_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "contract_analyses_gated"
            referencedColumns: ["id"]
          },
        ]
      }
      anchor_bank_releases: {
        Row: {
          active_anchor_count: number | null
          aggregation_policy: Json | null
          anchor_bank_version: string
          approved_at: string | null
          approved_by: string | null
          bands: Json | null
          hard_rule: string | null
          id: string
          imported_at: string
          inactive_anchor_count: number | null
          manifest: Json | null
          release_version: string | null
          risk_family_count: number | null
          status: string
        }
        Insert: {
          active_anchor_count?: number | null
          aggregation_policy?: Json | null
          anchor_bank_version: string
          approved_at?: string | null
          approved_by?: string | null
          bands?: Json | null
          hard_rule?: string | null
          id?: string
          imported_at?: string
          inactive_anchor_count?: number | null
          manifest?: Json | null
          release_version?: string | null
          risk_family_count?: number | null
          status: string
        }
        Update: {
          active_anchor_count?: number | null
          aggregation_policy?: Json | null
          anchor_bank_version?: string
          approved_at?: string | null
          approved_by?: string | null
          bands?: Json | null
          hard_rule?: string | null
          id?: string
          imported_at?: string
          inactive_anchor_count?: number | null
          manifest?: Json | null
          release_version?: string | null
          risk_family_count?: number | null
          status?: string
        }
        Relationships: []
      }
      ancoras: {
        Row: {
          anchor_bank_version: string | null
          applicability: Json | null
          approval: Json | null
          ativo: boolean
          categoria: string
          codigo: string
          condicoes_disparo: string
          created_at: string
          directionality: Json | null
          especie: string
          family_id: string | null
          gating: Json | null
          gravidade_referencia: number
          id: string
          qualitative_alert: Json | null
          razao: string
          regression: Json | null
          source_observation: string | null
          subfamily_id: string | null
          technical_notes: string | null
          titulo: string
          updated_at: string
          versao: number
        }
        Insert: {
          anchor_bank_version?: string | null
          applicability?: Json | null
          approval?: Json | null
          ativo?: boolean
          categoria: string
          codigo: string
          condicoes_disparo: string
          created_at?: string
          directionality?: Json | null
          especie: string
          family_id?: string | null
          gating?: Json | null
          gravidade_referencia: number
          id?: string
          qualitative_alert?: Json | null
          razao: string
          regression?: Json | null
          source_observation?: string | null
          subfamily_id?: string | null
          technical_notes?: string | null
          titulo: string
          updated_at?: string
          versao?: number
        }
        Update: {
          anchor_bank_version?: string | null
          applicability?: Json | null
          approval?: Json | null
          ativo?: boolean
          categoria?: string
          codigo?: string
          condicoes_disparo?: string
          created_at?: string
          directionality?: Json | null
          especie?: string
          family_id?: string | null
          gating?: Json | null
          gravidade_referencia?: number
          id?: string
          qualitative_alert?: Json | null
          razao?: string
          regression?: Json | null
          source_observation?: string | null
          subfamily_id?: string | null
          technical_notes?: string | null
          titulo?: string
          updated_at?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "ancoras_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "risk_families"
            referencedColumns: ["family_id"]
          },
        ]
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
      billing_audit_log: {
        Row: {
          actor: string
          created_at: string
          entity: string
          entity_id: string | null
          from_status: string | null
          id: number
          metadata: Json | null
          organization_id: string | null
          to_status: string | null
        }
        Insert: {
          actor: string
          created_at?: string
          entity: string
          entity_id?: string | null
          from_status?: string | null
          id?: number
          metadata?: Json | null
          organization_id?: string | null
          to_status?: string | null
        }
        Update: {
          actor?: string
          created_at?: string
          entity?: string
          entity_id?: string | null
          from_status?: string | null
          id?: number
          metadata?: Json | null
          organization_id?: string | null
          to_status?: string | null
        }
        Relationships: []
      }
      billing_customers: {
        Row: {
          address: Json | null
          created_at: string
          document_number: string
          document_type: string
          email: string
          id: string
          legal_name: string
          organization_id: string
          provider: string
          provider_customer_id: string | null
          updated_at: string
        }
        Insert: {
          address?: Json | null
          created_at?: string
          document_number: string
          document_type: string
          email: string
          id?: string
          legal_name: string
          organization_id: string
          provider: string
          provider_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: Json | null
          created_at?: string
          document_number?: string
          document_type?: string
          email?: string
          id?: string
          legal_name?: string
          organization_id?: string
          provider?: string
          provider_customer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_plans: {
        Row: {
          code: string
          created_at: string
          features: Json
          id: string
          interval: string
          is_active: boolean
          name: string
          price_cents: number
          sort_order: number
          trial_days: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          features?: Json
          id?: string
          interval?: string
          is_active?: boolean
          name: string
          price_cents: number
          sort_order?: number
          trial_days?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          features?: Json
          id?: string
          interval?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          sort_order?: number
          trial_days?: number
          updated_at?: string
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
      chargebacks: {
        Row: {
          amount_cents: number
          created_at: string
          documentation_due_at: string | null
          id: string
          organization_id: string
          payment_id: string
          provider_chargeback_id: string
          reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          documentation_due_at?: string | null
          id?: string
          organization_id: string
          payment_id: string
          provider_chargeback_id: string
          reason?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          documentation_due_at?: string | null
          id?: string
          organization_id?: string
          payment_id?: string
          provider_chargeback_id?: string
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chargebacks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chargebacks_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_attempts: {
        Row: {
          created_at: string
          id: number
          ip: unknown
          method: string | null
          organization_id: string | null
          outcome: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          ip?: unknown
          method?: string | null
          organization_id?: string | null
          outcome?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          ip?: unknown
          method?: string | null
          organization_id?: string | null
          outcome?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      clause_gating_shadow: {
        Row: {
          aggregation_version: string
          analysis_id: string
          anchor_bank_version: string | null
          candidate_anchor_id: string | null
          clause_id: string
          conditions_met: Json | null
          context_schema_version: string | null
          created_at: string
          evidence: string | null
          gating_anchor_id: string | null
          id: string
          matched: boolean
          prompt_version: string
          qualitative_alert: string | null
          score: number
          suppressor_triggered: string | null
        }
        Insert: {
          aggregation_version?: string
          analysis_id: string
          anchor_bank_version?: string | null
          candidate_anchor_id?: string | null
          clause_id: string
          conditions_met?: Json | null
          context_schema_version?: string | null
          created_at?: string
          evidence?: string | null
          gating_anchor_id?: string | null
          id?: string
          matched?: boolean
          prompt_version: string
          qualitative_alert?: string | null
          score?: number
          suppressor_triggered?: string | null
        }
        Update: {
          aggregation_version?: string
          analysis_id?: string
          anchor_bank_version?: string | null
          candidate_anchor_id?: string | null
          clause_id?: string
          conditions_met?: Json | null
          context_schema_version?: string | null
          created_at?: string
          evidence?: string | null
          gating_anchor_id?: string | null
          id?: string
          matched?: boolean
          prompt_version?: string
          qualitative_alert?: string | null
          score?: number
          suppressor_triggered?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clause_gating_shadow_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "contract_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clause_gating_shadow_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "contract_analyses_gated"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clause_gating_shadow_candidate_anchor_id_fkey"
            columns: ["candidate_anchor_id"]
            isOneToOne: false
            referencedRelation: "ancoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clause_gating_shadow_clause_id_fkey"
            columns: ["clause_id"]
            isOneToOne: false
            referencedRelation: "clause_risks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clause_gating_shadow_gating_anchor_id_fkey"
            columns: ["gating_anchor_id"]
            isOneToOne: false
            referencedRelation: "ancoras"
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
          finding_type: string
          gating_reason: string | null
          gravidade: number | null
          id: string
          impacto_identificado: Json | null
          justificativa_gravidade: string | null
          mitigacao: string | null
          onera_parte_representada: boolean | null
          original_text: string | null
          phase_a_ancora_id: string | null
          phase_a_gravidade: number | null
          polaridade_parte_representada: number | null
          qualitative_level: string | null
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
          finding_type?: string
          gating_reason?: string | null
          gravidade?: number | null
          id?: string
          impacto_identificado?: Json | null
          justificativa_gravidade?: string | null
          mitigacao?: string | null
          onera_parte_representada?: boolean | null
          original_text?: string | null
          phase_a_ancora_id?: string | null
          phase_a_gravidade?: number | null
          polaridade_parte_representada?: number | null
          qualitative_level?: string | null
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
          finding_type?: string
          gating_reason?: string | null
          gravidade?: number | null
          id?: string
          impacto_identificado?: Json | null
          justificativa_gravidade?: string | null
          mitigacao?: string | null
          onera_parte_representada?: boolean | null
          original_text?: string | null
          phase_a_ancora_id?: string | null
          phase_a_gravidade?: number | null
          polaridade_parte_representada?: number | null
          qualitative_level?: string | null
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
          anchor_gating_v1_enabled: boolean
          completeness_review: Json | null
          contract_id: string
          cost_usd: number | null
          courtesy_unlock: boolean
          created_at: string | null
          family_aggregation_shadow: Json | null
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
          anchor_gating_v1_enabled?: boolean
          completeness_review?: Json | null
          contract_id: string
          cost_usd?: number | null
          courtesy_unlock?: boolean
          created_at?: string | null
          family_aggregation_shadow?: Json | null
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
          anchor_gating_v1_enabled?: boolean
          completeness_review?: Json | null
          contract_id?: string
          cost_usd?: number | null
          courtesy_unlock?: boolean
          created_at?: string | null
          family_aggregation_shadow?: Json | null
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
          tokens_input: number | null
          tokens_output: number | null
          word_count: number | null
        }
        Insert: {
          contract_id: string
          id?: string
          ocr_applied?: boolean | null
          parsed_at?: string | null
          raw_text?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          word_count?: number | null
        }
        Update: {
          contract_id?: string
          id?: string
          ocr_applied?: boolean | null
          parsed_at?: string | null
          raw_text?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
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
          analysis_started_at: string | null
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
          analysis_started_at?: string | null
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
          analysis_started_at?: string | null
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
      fiscal_invoices: {
        Row: {
          attempts: number
          created_at: string
          id: string
          issued_at: string | null
          last_error: string | null
          number: string | null
          organization_id: string
          payment_id: string
          pdf_url: string | null
          provider: string
          provider_invoice_id: string | null
          status: string
          updated_at: string
          verification_code: string | null
          xml_url: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          issued_at?: string | null
          last_error?: string | null
          number?: string | null
          organization_id: string
          payment_id: string
          pdf_url?: string | null
          provider: string
          provider_invoice_id?: string | null
          status?: string
          updated_at?: string
          verification_code?: string | null
          xml_url?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          issued_at?: string | null
          last_error?: string | null
          number?: string | null
          organization_id?: string
          payment_id?: string
          pdf_url?: string | null
          provider?: string
          provider_invoice_id?: string | null
          status?: string
          updated_at?: string
          verification_code?: string | null
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_invoices_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
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
      invoices: {
        Row: {
          created_at: string
          data_emissao: string
          file_path: string
          id: string
          numero_nota: string
          org_id: string
          uploaded_by: string | null
          valor_cents: number
        }
        Insert: {
          created_at?: string
          data_emissao: string
          file_path: string
          id?: string
          numero_nota: string
          org_id: string
          uploaded_by?: string | null
          valor_cents: number
        }
        Update: {
          created_at?: string
          data_emissao?: string
          file_path?: string
          id?: string
          numero_nota?: string
          org_id?: string
          uploaded_by?: string | null
          valor_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mercadopago_webhook_events: {
        Row: {
          event_type: string
          id: string
          mp_event_id: string
          mp_subscription_id: string | null
          payload: Json | null
          processed_at: string
        }
        Insert: {
          event_type: string
          id?: string
          mp_event_id: string
          mp_subscription_id?: string | null
          payload?: Json | null
          processed_at?: string
        }
        Update: {
          event_type?: string
          id?: string
          mp_event_id?: string
          mp_subscription_id?: string | null
          payload?: Json | null
          processed_at?: string
        }
        Relationships: []
      }
      org_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: string
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_mercadopago_subscriptions: {
        Row: {
          created_at: string
          id: string
          mp_customer_id: string | null
          mp_subscription_id: string
          org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mp_customer_id?: string | null
          mp_subscription_id: string
          org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mp_customer_id?: string | null
          mp_subscription_id?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_mercadopago_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          risk_flagged: boolean
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
          risk_flagged?: boolean
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
          risk_flagged?: boolean
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
      payments: {
        Row: {
          amount_cents: number
          approved_at: string | null
          created_at: string
          fee_cents: number | null
          id: string
          idempotency_key: string
          method: string
          money_release_date: string | null
          net_cents: number | null
          organization_id: string
          period_end: string | null
          period_start: string | null
          pix_expires_at: string | null
          pix_qr_code: string | null
          pix_qr_code_base64: string | null
          provider: string
          provider_payment_id: string | null
          raw_last_response: Json | null
          released: boolean
          status: Database["public"]["Enums"]["payment_status"]
          status_detail: string | null
          subscription_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          approved_at?: string | null
          created_at?: string
          fee_cents?: number | null
          id?: string
          idempotency_key: string
          method: string
          money_release_date?: string | null
          net_cents?: number | null
          organization_id: string
          period_end?: string | null
          period_start?: string | null
          pix_expires_at?: string | null
          pix_qr_code?: string | null
          pix_qr_code_base64?: string | null
          provider: string
          provider_payment_id?: string | null
          raw_last_response?: Json | null
          released?: boolean
          status?: Database["public"]["Enums"]["payment_status"]
          status_detail?: string | null
          subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          approved_at?: string | null
          created_at?: string
          fee_cents?: number | null
          id?: string
          idempotency_key?: string
          method?: string
          money_release_date?: string | null
          net_cents?: number | null
          organization_id?: string
          period_end?: string | null
          period_start?: string | null
          pix_expires_at?: string | null
          pix_qr_code?: string | null
          pix_qr_code_base64?: string | null
          provider?: string
          provider_payment_id?: string | null
          raw_last_response?: Json | null
          released?: boolean
          status?: Database["public"]["Enums"]["payment_status"]
          status_detail?: string | null
          subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_families: {
        Row: {
          aggregation_use: string | null
          definition: string
          family_id: string
          name: string
          status: string
        }
        Insert: {
          aggregation_use?: string | null
          definition: string
          family_id: string
          name: string
          status?: string
        }
        Update: {
          aggregation_use?: string | null
          definition?: string
          family_id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      staff_audit_log: {
        Row: {
          action: string
          created_at: string
          id: number
          metadata: Json
          staff_id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: number
          metadata?: Json
          staff_id: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: number
          metadata?: Json
          staff_id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_audit_log_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          created_at: string
          full_platform_access: boolean
          id: string
          job_title: string | null
          roles: Database["public"]["Enums"]["staff_role"][]
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_platform_access?: boolean
          id: string
          job_title?: string | null
          roles?: Database["public"]["Enums"]["staff_role"][]
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_platform_access?: boolean
          id?: string
          job_title?: string | null
          roles?: Database["public"]["Enums"]["staff_role"][]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_day: number
          cancel_at_period_end: boolean
          cancel_reason: string | null
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          grace_period_ends_at: string | null
          id: string
          organization_id: string
          past_due_since: string | null
          payment_method: string | null
          pending_plan_id: string | null
          plan_id: string
          provider: string
          provider_subscription_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
        }
        Insert: {
          billing_day: number
          cancel_at_period_end?: boolean
          cancel_reason?: string | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          grace_period_ends_at?: string | null
          id?: string
          organization_id: string
          past_due_since?: string | null
          payment_method?: string | null
          pending_plan_id?: string | null
          plan_id: string
          provider?: string
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Update: {
          billing_day?: number
          cancel_at_period_end?: boolean
          cancel_reason?: string | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          grace_period_ends_at?: string | null
          id?: string
          organization_id?: string
          past_due_since?: string | null
          payment_method?: string | null
          pending_plan_id?: string | null
          plan_id?: string
          provider?: string
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_pending_plan_id_fkey"
            columns: ["pending_plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
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
          consent: boolean
          contracts_per_month: string | null
          created_at: string | null
          email: string
          id: string
          message: string | null
          name: string
          phone: string | null
          role: string | null
          source: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
        }
        Insert: {
          company?: string | null
          consent?: boolean
          contracts_per_month?: string | null
          created_at?: string | null
          email: string
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          role?: string | null
          source?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
        }
        Update: {
          company?: string | null
          consent?: boolean
          contracts_per_month?: string | null
          created_at?: string | null
          email?: string
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          role?: string | null
          source?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          action: string | null
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          payload: Json
          processed_at: string | null
          provider: string
          provider_event_id: string | null
          resource_id: string
          resource_type: string
          signature_valid: boolean
          status: string
          updated_at: string
        }
        Insert: {
          action?: string | null
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          payload: Json
          processed_at?: string | null
          provider: string
          provider_event_id?: string | null
          resource_id: string
          resource_type: string
          signature_valid: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          action?: string | null
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          payload?: Json
          processed_at?: string | null
          provider?: string
          provider_event_id?: string | null
          resource_id?: string
          resource_type?: string
          signature_valid?: boolean
          status?: string
          updated_at?: string
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
      organization_entitlements: {
        Row: {
          cancel_at_period_end: boolean | null
          current_period_end: string | null
          features: Json | null
          has_access: boolean | null
          max_users: number | null
          monthly_analysis_limit: number | null
          organization_id: string | null
          plan_code: string | null
          plan_name: string | null
          status: Database["public"]["Enums"]["subscription_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      claim_mercadopago_subscription_lock: {
        Args: { p_org_id: string; p_placeholder_id: string }
        Returns: boolean
      }
      claim_subscription_lock: {
        Args: {
          p_billing_day: number
          p_organization_id: string
          p_payment_method: string
          p_plan_id: string
          p_provider: string
        }
        Returns: string
      }
      get_admin_dashboard: { Args: never; Returns: Json }
      get_admin_finance_summary: { Args: never; Returns: Json }
      get_executive_dashboard: { Args: never; Returns: Json }
      get_org_id: { Args: never; Returns: string }
      get_support_stats: { Args: never; Returns: Json }
      has_staff_role: {
        Args: {
          p_role: Database["public"]["Enums"]["staff_role"]
          p_user_id?: string
        }
        Returns: boolean
      }
      is_staff: { Args: { p_user_id?: string }; Returns: boolean }
      list_admin_payments: { Args: { p_limit?: number }; Returns: Json }
      list_contracts: { Args: never; Returns: Json }
      list_open_chargebacks: { Args: never; Returns: Json }
      list_ponderum_staff: { Args: never; Returns: Json }
      list_recent_contracts: { Args: { p_limit?: number }; Returns: Json }
      list_staff_contracts: {
        Args: { p_page?: number; p_page_size?: number; p_search?: string }
        Returns: Json
      }
      list_staff_organizations: {
        Args: { p_page?: number; p_page_size?: number; p_search?: string }
        Returns: Json
      }
      log_staff_action: {
        Args: {
          p_action: string
          p_metadata?: Json
          p_target_id?: string
          p_target_type?: string
        }
        Returns: undefined
      }
      recalcular_indice_desequilibrio: {
        Args: { p_analysis_id: string }
        Returns: number
      }
      staff_create_invoice: {
        Args: {
          p_data_emissao: string
          p_file_path: string
          p_numero_nota: string
          p_org_id: string
          p_valor_cents: number
        }
        Returns: string
      }
      staff_renew_org_subscription: {
        Args: { p_org_id: string }
        Returns: undefined
      }
      staff_set_courtesy_unlock: {
        Args: { p_analysis_id: string; p_unlock: boolean }
        Returns: undefined
      }
      staff_set_org_blocked: {
        Args: { p_blocked: boolean; p_org_id: string }
        Returns: undefined
      }
      staff_set_org_plan_status: {
        Args: { p_org_id: string; p_plan_id?: string; p_status: string }
        Returns: undefined
      }
      staff_set_org_risk_flag: {
        Args: { p_org_id: string; p_risk_flagged: boolean }
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
        | {
            Args: {
              p_can_view_dev: boolean
              p_can_view_financeiro?: boolean
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
      payment_status:
        | "pending"
        | "approved"
        | "in_process"
        | "rejected"
        | "cancelled"
        | "expired"
        | "refunded"
        | "partially_refunded"
        | "charged_back"
        | "in_mediation"
      staff_role: "owner" | "dev" | "equipe" | "financeiro"
      subscription_status:
        | "incomplete"
        | "trialing"
        | "active"
        | "past_due"
        | "paused"
        | "canceled"
        | "expired"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      payment_status: [
        "pending",
        "approved",
        "in_process",
        "rejected",
        "cancelled",
        "expired",
        "refunded",
        "partially_refunded",
        "charged_back",
        "in_mediation",
      ],
      staff_role: ["owner", "dev", "equipe", "financeiro"],
      subscription_status: [
        "incomplete",
        "trialing",
        "active",
        "past_due",
        "paused",
        "canceled",
        "expired",
      ],
    },
  },
} as const
