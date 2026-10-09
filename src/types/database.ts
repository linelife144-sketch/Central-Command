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
      audit_logs: {
        Row: {
          action: string
          change_summary: string | null
          created_at: string | null
          created_date: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          user_role: Database["public"]["Enums"]["user_role"] | null
        }
        Insert: {
          action: string
          change_summary?: string | null
          created_at?: string | null
          created_date?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_role?: Database["public"]["Enums"]["user_role"] | null
        }
        Update: {
          action?: string
          change_summary?: string | null
          created_at?: string | null
          created_date?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_role?: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_banking: {
        Row: {
          account_holder_name: string
          account_number_encrypted: string
          account_number_masked: string | null
          account_type: string | null
          bank_name: string | null
          contractor_id: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          is_verified: boolean | null
          routing_number_encrypted: string
          updated_at: string | null
          updated_by: string | null
          verified_at: string | null
        }
        Insert: {
          account_holder_name: string
          account_number_encrypted: string
          account_number_masked?: string | null
          account_type?: string | null
          bank_name?: string | null
          contractor_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          is_verified?: boolean | null
          routing_number_encrypted: string
          updated_at?: string | null
          updated_by?: string | null
          verified_at?: string | null
        }
        Update: {
          account_holder_name?: string
          account_number_encrypted?: string
          account_number_masked?: string | null
          account_type?: string | null
          bank_name?: string | null
          contractor_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          is_verified?: boolean | null
          routing_number_encrypted?: string
          updated_at?: string | null
          updated_by?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_banking_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_banking_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_banking_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_invitation_pay_setups: {
        Row: {
          actor_id: string
          contractor_id: string | null
          created_at: string
          email: string
          terms: Json
        }
        Insert: {
          actor_id: string
          contractor_id?: string | null
          created_at?: string
          email: string
          terms: Json
        }
        Update: {
          actor_id?: string
          contractor_id?: string | null
          created_at?: string
          email?: string
          terms?: Json
        }
        Relationships: [
          {
            foreignKeyName: "contractor_invitation_pay_setups_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_invitation_pay_setups_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_invitations: {
        Row: {
          email: string
          first_name: string
          invited_by: string
          last_name: string
          last_result: string
          profile_id: string
          send_count: number
          sent_at: string
        }
        Insert: {
          email: string
          first_name?: string
          invited_by: string
          last_name?: string
          last_result: string
          profile_id: string
          send_count?: number
          sent_at?: string
        }
        Update: {
          email?: string
          first_name?: string
          invited_by?: string
          last_name?: string
          last_result?: string
          profile_id?: string
          send_count?: number
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_invitations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_invoices: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          billing_period_end: string
          billing_period_start: string
          contractor_id: string
          created_at: string | null
          created_by: string | null
          id: string
          invoice_number: string
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_reference: string | null
          pdf_url: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          storm_event_id: string | null
          submitted_at: string | null
          subtotal_expenses: number | null
          subtotal_time: number | null
          threshold_warning: boolean | null
          total_amount: number | null
          updated_at: string | null
          updated_by: string | null
          ytd_payments: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          billing_period_end: string
          billing_period_start: string
          contractor_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_number: string
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_reference?: string | null
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          storm_event_id?: string | null
          submitted_at?: string | null
          subtotal_expenses?: number | null
          subtotal_time?: number | null
          threshold_warning?: boolean | null
          total_amount?: number | null
          updated_at?: string | null
          updated_by?: string | null
          ytd_payments?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          billing_period_end?: string
          billing_period_start?: string
          contractor_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_number?: string
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_reference?: string | null
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          storm_event_id?: string | null
          submitted_at?: string | null
          subtotal_expenses?: number | null
          subtotal_time?: number | null
          threshold_warning?: boolean | null
          total_amount?: number | null
          updated_at?: string | null
          updated_by?: string | null
          ytd_payments?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_invoices_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_invoices_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_invoices_storm_event_id_fkey"
            columns: ["storm_event_id"]
            isOneToOne: false
            referencedRelation: "storm_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_invoices_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_pay_agreements: {
        Row: {
          contractor_id: string
          created_at: string
          created_by: string | null
          effective_from: string
          id: string
          terms: Json
        }
        Insert: {
          contractor_id: string
          created_at?: string
          created_by?: string | null
          effective_from: string
          id?: string
          terms: Json
        }
        Update: {
          contractor_id?: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          id?: string
          terms?: Json
        }
        Relationships: [
          {
            foreignKeyName: "contractor_pay_agreements_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_pay_agreements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_rates: {
        Row: {
          contractor_id: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          effective_from: string
          effective_to: string | null
          hourly_rate: number
          id: string
          work_type: Database["public"]["Enums"]["work_type"]
        }
        Insert: {
          contractor_id: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          effective_from?: string
          effective_to?: string | null
          hourly_rate: number
          id?: string
          work_type: Database["public"]["Enums"]["work_type"]
        }
        Update: {
          contractor_id?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          effective_from?: string
          effective_to?: string | null
          hourly_rate?: number
          id?: string
          work_type?: Database["public"]["Enums"]["work_type"]
        }
        Relationships: [
          {
            foreignKeyName: "contractor_rates_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_rates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contractors: {
        Row: {
          account_setup_requested_at: string | null
          address_line1: string | null
          address_line2: string | null
          approved_at: string | null
          approved_by: string | null
          business_email: string | null
          business_name: string
          business_phone: string | null
          business_type: string | null
          city: string | null
          created_at: string | null
          created_by: string | null
          eligibility_reason: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string | null
          id: string
          is_deleted: boolean | null
          is_eligible_for_assignment: boolean | null
          last_name: string | null
          onboarding_completed_at: string | null
          onboarding_status: string | null
          profile_id: string | null
          role: Database["public"]["Enums"]["contractor_role"]
          state: string | null
          tax_id: string | null
          tax_id_encrypted: string | null
          updated_at: string | null
          updated_by: string | null
          vehicle_registration_photo_path: string | null
          zip_code: string | null
        }
        Insert: {
          account_setup_requested_at?: string | null
          address_line1?: string | null
          address_line2?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_email?: string | null
          business_name: string
          business_phone?: string | null
          business_type?: string | null
          city?: string | null
          created_at?: string | null
          created_by?: string | null
          eligibility_reason?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string | null
          id?: string
          is_deleted?: boolean | null
          is_eligible_for_assignment?: boolean | null
          last_name?: string | null
          onboarding_completed_at?: string | null
          onboarding_status?: string | null
          profile_id?: string | null
          role?: Database["public"]["Enums"]["contractor_role"]
          state?: string | null
          tax_id?: string | null
          tax_id_encrypted?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle_registration_photo_path?: string | null
          zip_code?: string | null
        }
        Update: {
          account_setup_requested_at?: string | null
          address_line1?: string | null
          address_line2?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_email?: string | null
          business_name?: string
          business_phone?: string | null
          business_type?: string | null
          city?: string | null
          created_at?: string | null
          created_by?: string | null
          eligibility_reason?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string | null
          id?: string
          is_deleted?: boolean | null
          is_eligible_for_assignment?: boolean | null
          last_name?: string | null
          onboarding_completed_at?: string | null
          onboarding_status?: string | null
          profile_id?: string | null
          role?: Database["public"]["Enums"]["contractor_role"]
          state?: string | null
          tax_id?: string | null
          tax_id_encrypted?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle_registration_photo_path?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractors_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractors_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          created_by: string | null
          customer_code: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_code: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_code?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      damage_assessments: {
        Row: {
          assessed_at: string | null
          assessed_by: string | null
          contractor_id: string
          created_at: string | null
          created_by: string | null
          damage_cause: string | null
          digital_signature: string | null
          estimated_repair_cost: number | null
          estimated_repair_hours: number | null
          field_assessment: Json | null
          id: string
          immediate_actions: string | null
          photo_evidence: Json | null
          priority: Database["public"]["Enums"]["priority_level"] | null
          repair_vs_replace: string | null
          review_notes: string | null
          review_stage: string
          reviewed_at: string | null
          reviewed_by: string | null
          safety_observations: Json | null
          sync_status: Database["public"]["Enums"]["sync_status"] | null
          team_review_notes: string | null
          team_reviewed_at: string | null
          team_reviewed_by: string | null
          ticket_id: string
          updated_at: string | null
          updated_by: string | null
          weather_conditions: string | null
        }
        Insert: {
          assessed_at?: string | null
          assessed_by?: string | null
          contractor_id: string
          created_at?: string | null
          created_by?: string | null
          damage_cause?: string | null
          digital_signature?: string | null
          estimated_repair_cost?: number | null
          estimated_repair_hours?: number | null
          field_assessment?: Json | null
          id?: string
          immediate_actions?: string | null
          photo_evidence?: Json | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          repair_vs_replace?: string | null
          review_notes?: string | null
          review_stage?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          safety_observations?: Json | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          team_review_notes?: string | null
          team_reviewed_at?: string | null
          team_reviewed_by?: string | null
          ticket_id: string
          updated_at?: string | null
          updated_by?: string | null
          weather_conditions?: string | null
        }
        Update: {
          assessed_at?: string | null
          assessed_by?: string | null
          contractor_id?: string
          created_at?: string | null
          created_by?: string | null
          damage_cause?: string | null
          digital_signature?: string | null
          estimated_repair_cost?: number | null
          estimated_repair_hours?: number | null
          field_assessment?: Json | null
          id?: string
          immediate_actions?: string | null
          photo_evidence?: Json | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          repair_vs_replace?: string | null
          review_notes?: string | null
          review_stage?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          safety_observations?: Json | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          team_review_notes?: string | null
          team_reviewed_at?: string | null
          team_reviewed_by?: string | null
          ticket_id?: string
          updated_at?: string | null
          updated_by?: string | null
          weather_conditions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "damage_assessments_assessed_by_fkey"
            columns: ["assessed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "damage_assessments_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "damage_assessments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "damage_assessments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "damage_assessments_team_reviewed_by_fkey"
            columns: ["team_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "damage_assessments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "damage_assessments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_assessments: {
        Row: {
          condition: Database["public"]["Enums"]["equipment_condition"]
          created_at: string | null
          damage_assessment_id: string
          damage_description: string | null
          equipment_description: string | null
          equipment_tag: string | null
          equipment_type_id: string | null
          id: string
          photo_urls: string[] | null
          requires_replacement: boolean | null
          updated_at: string | null
        }
        Insert: {
          condition: Database["public"]["Enums"]["equipment_condition"]
          created_at?: string | null
          damage_assessment_id: string
          damage_description?: string | null
          equipment_description?: string | null
          equipment_tag?: string | null
          equipment_type_id?: string | null
          id?: string
          photo_urls?: string[] | null
          requires_replacement?: boolean | null
          updated_at?: string | null
        }
        Update: {
          condition?: Database["public"]["Enums"]["equipment_condition"]
          created_at?: string | null
          damage_assessment_id?: string
          damage_description?: string | null
          equipment_description?: string | null
          equipment_tag?: string | null
          equipment_type_id?: string | null
          id?: string
          photo_urls?: string[] | null
          requires_replacement?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_assessments_damage_assessment_id_fkey"
            columns: ["damage_assessment_id"]
            isOneToOne: false
            referencedRelation: "damage_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assessments_equipment_type_id_fkey"
            columns: ["equipment_type_id"]
            isOneToOne: false
            referencedRelation: "equipment_types"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_types: {
        Row: {
          category: string
          created_at: string | null
          damage_indicators: Json | null
          equipment_code: string | null
          equipment_name: string
          id: string
          is_active: boolean | null
          manufacturer: string | null
          model_pattern: string | null
          ppe_requirements: string[] | null
          replacement_criteria: Json | null
          safe_approach_distance: number | null
          updated_at: string | null
          voltage_rating: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          damage_indicators?: Json | null
          equipment_code?: string | null
          equipment_name: string
          id?: string
          is_active?: boolean | null
          manufacturer?: string | null
          model_pattern?: string | null
          ppe_requirements?: string[] | null
          replacement_criteria?: Json | null
          safe_approach_distance?: number | null
          updated_at?: string | null
          voltage_rating?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          damage_indicators?: Json | null
          equipment_code?: string | null
          equipment_name?: string
          id?: string
          is_active?: boolean | null
          manufacturer?: string | null
          model_pattern?: string | null
          ppe_requirements?: string[] | null
          replacement_criteria?: Json | null
          safe_approach_distance?: number | null
          updated_at?: string | null
          voltage_rating?: string | null
        }
        Relationships: []
      }
      expense_items: {
        Row: {
          amount: number
          approval_reason: string | null
          billable_to_client: boolean | null
          category: Database["public"]["Enums"]["expense_category"]
          client_billable_amount: number | null
          client_markup_percent: number | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string
          expense_date: string
          expense_report_id: string
          from_location: string | null
          id: string
          mileage_calculated_amount: number | null
          mileage_end: number | null
          mileage_rate: number | null
          mileage_start: number | null
          policy_flags: string[] | null
          receipt_ocr_text: string | null
          receipt_url: string | null
          requires_approval: boolean | null
          ticket_id: string | null
          to_location: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          amount: number
          approval_reason?: string | null
          billable_to_client?: boolean | null
          category: Database["public"]["Enums"]["expense_category"]
          client_billable_amount?: number | null
          client_markup_percent?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description: string
          expense_date: string
          expense_report_id: string
          from_location?: string | null
          id?: string
          mileage_calculated_amount?: number | null
          mileage_end?: number | null
          mileage_rate?: number | null
          mileage_start?: number | null
          policy_flags?: string[] | null
          receipt_ocr_text?: string | null
          receipt_url?: string | null
          requires_approval?: boolean | null
          ticket_id?: string | null
          to_location?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          amount?: number
          approval_reason?: string | null
          billable_to_client?: boolean | null
          category?: Database["public"]["Enums"]["expense_category"]
          client_billable_amount?: number | null
          client_markup_percent?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string
          expense_date?: string
          expense_report_id?: string
          from_location?: string | null
          id?: string
          mileage_calculated_amount?: number | null
          mileage_end?: number | null
          mileage_rate?: number | null
          mileage_start?: number | null
          policy_flags?: string[] | null
          receipt_ocr_text?: string | null
          receipt_url?: string | null
          requires_approval?: boolean | null
          ticket_id?: string | null
          to_location?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_items_expense_report_id_fkey"
            columns: ["expense_report_id"]
            isOneToOne: false
            referencedRelation: "expense_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_items_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_items_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_policies: {
        Row: {
          auto_approve_threshold: number | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string | null
          created_by: string | null
          daily_limit: number | null
          effective_from: string | null
          effective_to: string | null
          id: string
          is_active: boolean | null
          mileage_rate: number | null
          mileage_rate_effective_date: string | null
          per_diem_location: string | null
          per_diem_rate: number | null
          policy_name: string
          receipt_required_threshold: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          auto_approve_threshold?: number | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          created_by?: string | null
          daily_limit?: number | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          mileage_rate?: number | null
          mileage_rate_effective_date?: string | null
          per_diem_location?: string | null
          per_diem_rate?: number | null
          policy_name: string
          receipt_required_threshold?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          auto_approve_threshold?: number | null
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          created_by?: string | null
          daily_limit?: number | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          mileage_rate?: number | null
          mileage_rate_effective_date?: string | null
          per_diem_location?: string | null
          per_diem_rate?: number | null
          policy_name?: string
          receipt_required_threshold?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_policies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_policies_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_reports: {
        Row: {
          contractor_id: string
          created_at: string | null
          created_by: string | null
          id: string
          invoice_id: string | null
          is_deleted: boolean | null
          item_count: number | null
          mileage_total: number | null
          rejection_reason: string | null
          report_period_end: string
          report_period_start: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["expense_status"] | null
          storm_event_id: string | null
          submitted_at: string | null
          sync_status: Database["public"]["Enums"]["sync_status"] | null
          total_amount: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          contractor_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          is_deleted?: boolean | null
          item_count?: number | null
          mileage_total?: number | null
          rejection_reason?: string | null
          report_period_end: string
          report_period_start: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["expense_status"] | null
          storm_event_id?: string | null
          submitted_at?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          total_amount?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          contractor_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          is_deleted?: boolean | null
          item_count?: number | null
          mileage_total?: number | null
          rejection_reason?: string | null
          report_period_end?: string
          report_period_start?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["expense_status"] | null
          storm_event_id?: string | null
          submitted_at?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          total_amount?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_reports_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_reports_storm_event_id_fkey"
            columns: ["storm_event_id"]
            isOneToOne: false
            referencedRelation: "storm_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_reports_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      field_crews: {
        Row: {
          assessor_id: string
          created_at: string
          created_by: string
          driver_id: string
          id: string
          is_active: boolean
          name: string
          storm_event_id: string
          team_lead_id: string
        }
        Insert: {
          assessor_id: string
          created_at?: string
          created_by: string
          driver_id: string
          id?: string
          is_active?: boolean
          name: string
          storm_event_id: string
          team_lead_id: string
        }
        Update: {
          assessor_id?: string
          created_at?: string
          created_by?: string
          driver_id?: string
          id?: string
          is_active?: boolean
          name?: string
          storm_event_id?: string
          team_lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_crews_assessor_id_fkey"
            columns: ["assessor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_crews_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_crews_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_crews_storm_event_id_fkey"
            columns: ["storm_event_id"]
            isOneToOne: false
            referencedRelation: "storm_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_crews_team_lead_id_fkey"
            columns: ["team_lead_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hazard_categories: {
        Row: {
          created_at: string | null
          description: string | null
          hazard_code: string
          hazard_name: string
          id: string
          immediate_actions: string[] | null
          is_active: boolean | null
          notification_required: boolean | null
          notification_targets: string[] | null
          ppe_required: string[] | null
          safe_distance_feet: number | null
          updated_at: string | null
          voltage_assumption: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          hazard_code: string
          hazard_name: string
          id?: string
          immediate_actions?: string[] | null
          is_active?: boolean | null
          notification_required?: boolean | null
          notification_targets?: string[] | null
          ppe_required?: string[] | null
          safe_distance_feet?: number | null
          updated_at?: string | null
          voltage_assumption?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          hazard_code?: string
          hazard_name?: string
          id?: string
          immediate_actions?: string[] | null
          is_active?: boolean | null
          notification_required?: boolean | null
          notification_targets?: string[] | null
          ppe_required?: string[] | null
          safe_distance_feet?: number | null
          updated_at?: string | null
          voltage_assumption?: string | null
        }
        Relationships: []
      }
      invoice_line_items: {
        Row: {
          amount: number
          created_at: string | null
          description: string
          id: string
          invoice_id: string
          item_type: string
          quantity: number | null
          rate: number | null
          reference_id: string
          unit: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          description: string
          id?: string
          invoice_id: string
          item_type: string
          quantity?: number | null
          rate?: number | null
          reference_id: string
          unit?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string
          item_type?: string
          quantity?: number | null
          rate?: number | null
          reference_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "contractor_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          captured_at: string | null
          checksum_sha256: string | null
          contractor_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          exif_data: Json | null
          file_name: string
          file_size_bytes: number | null
          file_type: Database["public"]["Enums"]["media_type"]
          gps_accuracy: number | null
          gps_latitude: number | null
          gps_longitude: number | null
          id: string
          mime_type: string | null
          original_name: string | null
          public_url: string | null
          retention_until: string | null
          storage_bucket: string
          storage_path: string
          thumbnail_url: string | null
          updated_at: string | null
          upload_status: string | null
          uploaded_by: string | null
        }
        Insert: {
          captured_at?: string | null
          checksum_sha256?: string | null
          contractor_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          exif_data?: Json | null
          file_name: string
          file_size_bytes?: number | null
          file_type: Database["public"]["Enums"]["media_type"]
          gps_accuracy?: number | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          mime_type?: string | null
          original_name?: string | null
          public_url?: string | null
          retention_until?: string | null
          storage_bucket: string
          storage_path: string
          thumbnail_url?: string | null
          updated_at?: string | null
          upload_status?: string | null
          uploaded_by?: string | null
        }
        Update: {
          captured_at?: string | null
          checksum_sha256?: string | null
          contractor_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          exif_data?: Json | null
          file_name?: string
          file_size_bytes?: number | null
          file_type?: Database["public"]["Enums"]["media_type"]
          gps_accuracy?: number | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          mime_type?: string | null
          original_name?: string | null
          public_url?: string | null
          retention_until?: string | null
          storage_bucket?: string
          storage_path?: string
          thumbnail_url?: string | null
          updated_at?: string | null
          upload_status?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          body: string
          channel: string | null
          created_at: string | null
          data: Json | null
          dedup_key: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          read_at: string | null
          sent_at: string | null
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          channel?: string | null
          created_at?: string | null
          data?: Json | null
          dedup_key?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          read_at?: string | null
          sent_at?: string | null
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          channel?: string | null
          created_at?: string | null
          data?: Json | null
          dedup_key?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          notification_type?: Database["public"]["Enums"]["notification_type"]
          read_at?: string | null
          sent_at?: string | null
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_configuration: {
        Row: {
          flat_multiplier: number
          id: boolean
          legacy_vehicle_hourly_rate: number
          multiplier_options: Json
          timezone: string
          week_start_day: number
        }
        Insert: {
          flat_multiplier: number
          id?: boolean
          legacy_vehicle_hourly_rate: number
          multiplier_options: Json
          timezone: string
          week_start_day: number
        }
        Update: {
          flat_multiplier?: number
          id?: boolean
          legacy_vehicle_hourly_rate?: number
          multiplier_options?: Json
          timezone?: string
          week_start_day?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string
          first_name: string
          id: string
          is_active: boolean | null
          is_email_verified: boolean | null
          last_login_at: string | null
          last_name: string
          mfa_enabled: boolean | null
          mfa_secret_encrypted: string | null
          must_reset_password: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email: string
          first_name: string
          id: string
          is_active?: boolean | null
          is_email_verified?: boolean | null
          last_login_at?: string | null
          last_name: string
          mfa_enabled?: boolean | null
          mfa_secret_encrypted?: string | null
          must_reset_password?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean | null
          is_email_verified?: boolean | null
          last_login_at?: string | null
          last_name?: string
          mfa_enabled?: boolean | null
          mfa_secret_encrypted?: string | null
          must_reset_password?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_rate_defaults: {
        Row: {
          currency: string
          hourly_rate: number
          role: Database["public"]["Enums"]["contractor_role"]
          updated_at: string
          updated_by: string | null
          work_type: Database["public"]["Enums"]["work_type"]
        }
        Insert: {
          currency?: string
          hourly_rate: number
          role: Database["public"]["Enums"]["contractor_role"]
          updated_at?: string
          updated_by?: string | null
          work_type: Database["public"]["Enums"]["work_type"]
        }
        Update: {
          currency?: string
          hourly_rate?: number
          role?: Database["public"]["Enums"]["contractor_role"]
          updated_at?: string
          updated_by?: string | null
          work_type?: Database["public"]["Enums"]["work_type"]
        }
        Relationships: [
          {
            foreignKeyName: "role_rate_defaults_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      storm_contractor_compensation: {
        Row: {
          contractor_id: string
          pay_rate_override: number | null
          storm_event_id: string
          updated_at: string
          updated_by: string | null
          vehicle_hourly_rate: number | null
        }
        Insert: {
          contractor_id: string
          pay_rate_override?: number | null
          storm_event_id: string
          updated_at?: string
          updated_by?: string | null
          vehicle_hourly_rate?: number | null
        }
        Update: {
          contractor_id?: string
          pay_rate_override?: number | null
          storm_event_id?: string
          updated_at?: string
          updated_by?: string | null
          vehicle_hourly_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "storm_contractor_compensation_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storm_contractor_compensation_storm_event_id_fkey"
            columns: ["storm_event_id"]
            isOneToOne: false
            referencedRelation: "storm_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storm_contractor_compensation_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      storm_event_authorization_logs: {
        Row: {
          authorization_type: string
          authorized_at: string
          contact_channel: string | null
          contact_name: string | null
          created_at: string
          created_by: string | null
          evidence: Json
          id: string
          notes: string | null
          received_by: string | null
          source_reference: string | null
          storm_event_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          authorization_type: string
          authorized_at?: string
          contact_channel?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          evidence?: Json
          id?: string
          notes?: string | null
          received_by?: string | null
          source_reference?: string | null
          storm_event_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          authorization_type?: string
          authorized_at?: string
          contact_channel?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          evidence?: Json
          id?: string
          notes?: string | null
          received_by?: string | null
          source_reference?: string | null
          storm_event_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storm_event_authorization_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storm_event_authorization_logs_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storm_event_authorization_logs_storm_event_id_fkey"
            columns: ["storm_event_id"]
            isOneToOne: false
            referencedRelation: "storm_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storm_event_authorization_logs_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      storm_event_documents: {
        Row: {
          created_at: string
          created_by: string | null
          document_name: string
          document_type: string
          external_url: string | null
          id: string
          metadata: Json
          mime_type: string | null
          storage_path: string | null
          storm_event_id: string
          updated_at: string
          updated_by: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_name: string
          document_type: string
          external_url?: string | null
          id?: string
          metadata?: Json
          mime_type?: string | null
          storage_path?: string | null
          storm_event_id: string
          updated_at?: string
          updated_by?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_name?: string
          document_type?: string
          external_url?: string | null
          id?: string
          metadata?: Json
          mime_type?: string | null
          storage_path?: string | null
          storm_event_id?: string
          updated_at?: string
          updated_by?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storm_event_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storm_event_documents_storm_event_id_fkey"
            columns: ["storm_event_id"]
            isOneToOne: false
            referencedRelation: "storm_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storm_event_documents_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storm_event_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      storm_event_logistics_entries: {
        Row: {
          category: string
          contractor_id: string | null
          created_at: string
          created_by: string | null
          details: Json
          effective_at: string | null
          id: string
          notes: string | null
          phase: number
          reference_code: string | null
          status: string
          storm_event_id: string
          updated_at: string
          updated_by: string | null
          vendor_name: string | null
        }
        Insert: {
          category: string
          contractor_id?: string | null
          created_at?: string
          created_by?: string | null
          details?: Json
          effective_at?: string | null
          id?: string
          notes?: string | null
          phase: number
          reference_code?: string | null
          status?: string
          storm_event_id: string
          updated_at?: string
          updated_by?: string | null
          vendor_name?: string | null
        }
        Update: {
          category?: string
          contractor_id?: string | null
          created_at?: string
          created_by?: string | null
          details?: Json
          effective_at?: string | null
          id?: string
          notes?: string | null
          phase?: number
          reference_code?: string | null
          status?: string
          storm_event_id?: string
          updated_at?: string
          updated_by?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storm_event_logistics_entries_contractor_fk"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storm_event_logistics_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storm_event_logistics_entries_storm_event_id_fkey"
            columns: ["storm_event_id"]
            isOneToOne: false
            referencedRelation: "storm_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storm_event_logistics_entries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      storm_event_phase_steps: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          evidence: Json
          id: string
          notes: string | null
          phase: number
          status: string
          step_key: string
          step_label: string
          storm_event_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          evidence?: Json
          id?: string
          notes?: string | null
          phase: number
          status?: string
          step_key: string
          step_label: string
          storm_event_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          evidence?: Json
          id?: string
          notes?: string | null
          phase?: number
          status?: string
          step_key?: string
          step_label?: string
          storm_event_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storm_event_phase_steps_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storm_event_phase_steps_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storm_event_phase_steps_storm_event_id_fkey"
            columns: ["storm_event_id"]
            isOneToOne: false
            referencedRelation: "storm_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storm_event_phase_steps_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      storm_event_roster_members: {
        Row: {
          assignment_role: string | null
          contact_attempts: number
          contact_last_attempt_at: string | null
          contractor_id: string | null
          created_at: string
          created_by: string | null
          id: string
          member_status: string
          notes: string | null
          roster_revision_id: string
          team_name: string | null
          travel_zone: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assignment_role?: string | null
          contact_attempts?: number
          contact_last_attempt_at?: string | null
          contractor_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          member_status?: string
          notes?: string | null
          roster_revision_id: string
          team_name?: string | null
          travel_zone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assignment_role?: string | null
          contact_attempts?: number
          contact_last_attempt_at?: string | null
          contractor_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          member_status?: string
          notes?: string | null
          roster_revision_id?: string
          team_name?: string | null
          travel_zone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storm_event_roster_members_contractor_fk"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storm_event_roster_members_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storm_event_roster_members_roster_revision_id_fkey"
            columns: ["roster_revision_id"]
            isOneToOne: false
            referencedRelation: "storm_event_roster_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storm_event_roster_members_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      storm_event_roster_revisions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_locked: boolean
          notes: string | null
          revision_label: string | null
          revision_number: number
          storm_event_id: string
          submitted_by: string | null
          submitted_to_client_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_locked?: boolean
          notes?: string | null
          revision_label?: string | null
          revision_number: number
          storm_event_id: string
          submitted_by?: string | null
          submitted_to_client_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_locked?: boolean
          notes?: string | null
          revision_label?: string | null
          revision_number?: number
          storm_event_id?: string
          submitted_by?: string | null
          submitted_to_client_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storm_event_roster_revisions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storm_event_roster_revisions_storm_event_id_fkey"
            columns: ["storm_event_id"]
            isOneToOne: false
            referencedRelation: "storm_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storm_event_roster_revisions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storm_event_roster_revisions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      storm_role_pay_rates: {
        Row: {
          hourly_rate: number
          role: Database["public"]["Enums"]["contractor_role"]
          storm_event_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          hourly_rate: number
          role: Database["public"]["Enums"]["contractor_role"]
          storm_event_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          hourly_rate?: number
          role?: Database["public"]["Enums"]["contractor_role"]
          storm_event_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storm_role_pay_rates_storm_event_id_fkey"
            columns: ["storm_event_id"]
            isOneToOne: false
            referencedRelation: "storm_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storm_role_pay_rates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      storm_events: {
        Row: {
          city: string | null
          city_code: string | null
          config_snapshot: Json
          contract_reference: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          end_date: string | null
          event_code: string
          event_date: string | null
          event_sequence: number
          id: string
          is_deleted: boolean | null
          name: string
          notes: string | null
          region: string | null
          start_date: string | null
          status: string
          ticket_template_key: string
          updated_at: string | null
          updated_by: string | null
          utility_client: string
          utility_id: string | null
        }
        Insert: {
          city?: string | null
          city_code?: string | null
          config_snapshot?: Json
          contract_reference?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          end_date?: string | null
          event_code: string
          event_date?: string | null
          event_sequence?: number
          id?: string
          is_deleted?: boolean | null
          name: string
          notes?: string | null
          region?: string | null
          start_date?: string | null
          status?: string
          ticket_template_key: string
          updated_at?: string | null
          updated_by?: string | null
          utility_client: string
          utility_id?: string | null
        }
        Update: {
          city?: string | null
          city_code?: string | null
          config_snapshot?: Json
          contract_reference?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          end_date?: string | null
          event_code?: string
          event_date?: string | null
          event_sequence?: number
          id?: string
          is_deleted?: boolean | null
          name?: string
          notes?: string | null
          region?: string | null
          start_date?: string | null
          status?: string
          ticket_template_key?: string
          updated_at?: string | null
          updated_by?: string | null
          utility_client?: string
          utility_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storm_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storm_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storm_events_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storm_events_utility_id_fkey"
            columns: ["utility_id"]
            isOneToOne: false
            referencedRelation: "utilities"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_queue: {
        Row: {
          attempt_count: number | null
          created_at: string | null
          device_id: string | null
          entity_id: string
          entity_type: string
          id: string
          last_error: string | null
          operation: string
          payload: Json
          processed_at: string | null
          retry_after: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string | null
          device_id?: string | null
          entity_id: string
          entity_type: string
          id?: string
          last_error?: string | null
          operation: string
          payload: Json
          processed_at?: string | null
          retry_after?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          attempt_count?: number | null
          created_at?: string | null
          device_id?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          last_error?: string | null
          operation?: string
          payload?: Json
          processed_at?: string | null
          retry_after?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_1099_tracking: {
        Row: {
          contractor_id: string
          created_at: string | null
          form_1099_irs_filed: boolean | null
          form_1099_issued: boolean | null
          form_1099_issued_at: string | null
          form_1099_recipient_copy_sent: boolean | null
          id: string
          tax_year: number
          threshold_reached: boolean | null
          threshold_reached_at: string | null
          total_invoices: number | null
          total_payments: number | null
          updated_at: string | null
        }
        Insert: {
          contractor_id: string
          created_at?: string | null
          form_1099_irs_filed?: boolean | null
          form_1099_issued?: boolean | null
          form_1099_issued_at?: string | null
          form_1099_recipient_copy_sent?: boolean | null
          id?: string
          tax_year: number
          threshold_reached?: boolean | null
          threshold_reached_at?: string | null
          total_invoices?: number | null
          total_payments?: number | null
          updated_at?: string | null
        }
        Update: {
          contractor_id?: string
          created_at?: string | null
          form_1099_irs_filed?: boolean | null
          form_1099_issued?: boolean | null
          form_1099_issued_at?: string | null
          form_1099_recipient_copy_sent?: boolean | null
          id?: string
          tax_year?: number
          threshold_reached?: boolean | null
          threshold_reached_at?: string | null
          total_invoices?: number | null
          total_payments?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_1099_tracking_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_assessment_drafts: {
        Row: {
          assessment_id: string
          contractor_id: string
          field_assessment: Json
          photo_evidence: Json
          saved_at: string
          saved_by: string
          ticket_id: string
          version: number
        }
        Insert: {
          assessment_id: string
          contractor_id: string
          field_assessment: Json
          photo_evidence: Json
          saved_at?: string
          saved_by: string
          ticket_id: string
          version?: number
        }
        Update: {
          assessment_id?: string
          contractor_id?: string
          field_assessment?: Json
          photo_evidence?: Json
          saved_at?: string
          saved_by?: string
          ticket_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ticket_assessment_drafts_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_assessment_drafts_saved_by_fkey"
            columns: ["saved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_assessment_drafts_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          storage_path: string
          storm_event_id: string
          ticket_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          storage_path: string
          storm_event_id: string
          ticket_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          storage_path?: string
          storm_event_id?: string
          ticket_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_storm_event_id_fkey"
            columns: ["storm_event_id"]
            isOneToOne: false
            referencedRelation: "storm_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_entergy_forms: {
        Row: {
          created_at: string
          created_by: string
          form_kind: string
          id: string
          payload: Json
          photo_evidence: Json
          saved_at: string
          saved_by: string
          status: string
          submitted_at: string | null
          ticket_id: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by: string
          form_kind: string
          id?: string
          payload: Json
          photo_evidence?: Json
          saved_at?: string
          saved_by: string
          status?: string
          submitted_at?: string | null
          ticket_id: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          form_kind?: string
          id?: string
          payload?: Json
          photo_evidence?: Json
          saved_at?: string
          saved_by?: string
          status?: string
          submitted_at?: string | null
          ticket_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ticket_entergy_forms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_entergy_forms_saved_by_fkey"
            columns: ["saved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_entergy_forms_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_extraction_sessions: {
        Row: {
          attachment_id: string | null
          confidence: Json
          created_at: string
          created_by: string | null
          draft_payload: Json
          id: string
          ocr_text: string | null
          status: string
          storm_event_id: string
          updated_at: string
          utility_client: string
          warnings: string[]
        }
        Insert: {
          attachment_id?: string | null
          confidence?: Json
          created_at?: string
          created_by?: string | null
          draft_payload?: Json
          id?: string
          ocr_text?: string | null
          status?: string
          storm_event_id: string
          updated_at?: string
          utility_client: string
          warnings?: string[]
        }
        Update: {
          attachment_id?: string | null
          confidence?: Json
          created_at?: string
          created_by?: string | null
          draft_payload?: Json
          id?: string
          ocr_text?: string | null
          status?: string
          storm_event_id?: string
          updated_at?: string
          utility_client?: string
          warnings?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "ticket_extraction_sessions_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "ticket_attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_extraction_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_extraction_sessions_storm_event_id_fkey"
            columns: ["storm_event_id"]
            isOneToOne: false
            referencedRelation: "storm_events"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_payloads: {
        Row: {
          extraction_confidence: Json
          extraction_warnings: string[]
          payload: Json
          payload_version: number
          ticket_id: string
          updated_at: string
        }
        Insert: {
          extraction_confidence?: Json
          extraction_warnings?: string[]
          payload?: Json
          payload_version?: number
          ticket_id: string
          updated_at?: string
        }
        Update: {
          extraction_confidence?: Json
          extraction_warnings?: string[]
          payload?: Json
          payload_version?: number
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_payloads_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_routes: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          estimated_duration_minutes: number | null
          id: string
          optimization_type: string | null
          route_name: string
          started_at: string | null
          status: string | null
          ticket_ids: string[]
          total_distance_miles: number | null
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          optimization_type?: string | null
          route_name: string
          started_at?: string | null
          status?: string | null
          ticket_ids: string[]
          total_distance_miles?: number | null
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          optimization_type?: string | null
          route_name?: string
          started_at?: string | null
          status?: string | null
          ticket_ids?: string[]
          total_distance_miles?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_routes_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_routes_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_routes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_status_history: {
        Row: {
          change_reason: string | null
          changed_at: string | null
          changed_by: string | null
          created_at: string | null
          device_fingerprint: string | null
          from_status: Database["public"]["Enums"]["ticket_status"] | null
          gps_accuracy: number | null
          gps_latitude: number | null
          gps_longitude: number | null
          id: string
          ip_address: unknown
          ticket_id: string
          to_status: Database["public"]["Enums"]["ticket_status"]
          user_agent: string | null
        }
        Insert: {
          change_reason?: string | null
          changed_at?: string | null
          changed_by?: string | null
          created_at?: string | null
          device_fingerprint?: string | null
          from_status?: Database["public"]["Enums"]["ticket_status"] | null
          gps_accuracy?: number | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          ip_address?: unknown
          ticket_id: string
          to_status: Database["public"]["Enums"]["ticket_status"]
          user_agent?: string | null
        }
        Update: {
          change_reason?: string | null
          changed_at?: string | null
          changed_by?: string | null
          created_at?: string | null
          device_fingerprint?: string | null
          from_status?: Database["public"]["Enums"]["ticket_status"] | null
          gps_accuracy?: number | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          id?: string
          ip_address?: unknown
          ticket_id?: string
          to_status?: Database["public"]["Enums"]["ticket_status"]
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_status_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_templates: {
        Row: {
          created_at: string
          created_by: string | null
          default_values: Json
          description: string | null
          field_definitions: Json
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          payload_version: number
          template_key: string
          updated_at: string
          utility_client: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_values?: Json
          description?: string | null
          field_definitions?: Json
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          payload_version?: number
          template_key: string
          updated_at?: string
          utility_client: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_values?: Json
          description?: string | null
          field_definitions?: Json
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          payload_version?: number
          template_key?: string
          updated_at?: string
          utility_client?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_work_notes: {
        Row: {
          actor_profile_id: string
          body: string
          created_at: string
          id: string
          kind: string
          reported_at: string
          ticket_id: string
        }
        Insert: {
          actor_profile_id: string
          body: string
          created_at?: string
          id: string
          kind: string
          reported_at: string
          ticket_id: string
        }
        Update: {
          actor_profile_id?: string
          body?: string
          created_at?: string
          id?: string
          kind?: string
          reported_at?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_work_notes_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_work_notes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          address: string
          address_line2: string | null
          assigned_at: string | null
          assigned_by: string | null
          assigned_driver_id: string | null
          assigned_to: string | null
          city: string | null
          client_contact_name: string | null
          client_contact_phone: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          crew_id: string | null
          current_assessment_id: string | null
          damage_types: string[] | null
          deleted_at: string | null
          deleted_by: string | null
          due_date: string | null
          estimated_travel_time: number | null
          geofence_radius_meters: number | null
          id: string
          is_deleted: boolean | null
          is_important: boolean
          latitude: number | null
          longitude: number | null
          raw_ocr_text: string | null
          review_stage: string
          route_batch_id: string | null
          route_order: number | null
          scheduled_date: string | null
          severity: string | null
          source_file_id: string | null
          source_type: Database["public"]["Enums"]["ticket_source_type"]
          special_instructions: string | null
          started_at: string | null
          state: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          storm_event_id: string | null
          team_lead_id: string | null
          template_key: string | null
          ticket_number: string
          updated_at: string | null
          updated_by: string | null
          utility_client: string
          utility_submission_reference: string | null
          utility_submitted_at: string | null
          utility_submitted_by: string | null
          work_description: string | null
          work_order_ref: string | null
          zip_code: string | null
        }
        Insert: {
          address: string
          address_line2?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_driver_id?: string | null
          assigned_to?: string | null
          city?: string | null
          client_contact_name?: string | null
          client_contact_phone?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          crew_id?: string | null
          current_assessment_id?: string | null
          damage_types?: string[] | null
          deleted_at?: string | null
          deleted_by?: string | null
          due_date?: string | null
          estimated_travel_time?: number | null
          geofence_radius_meters?: number | null
          id?: string
          is_deleted?: boolean | null
          is_important?: boolean
          latitude?: number | null
          longitude?: number | null
          raw_ocr_text?: string | null
          review_stage?: string
          route_batch_id?: string | null
          route_order?: number | null
          scheduled_date?: string | null
          severity?: string | null
          source_file_id?: string | null
          source_type?: Database["public"]["Enums"]["ticket_source_type"]
          special_instructions?: string | null
          started_at?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          storm_event_id?: string | null
          team_lead_id?: string | null
          template_key?: string | null
          ticket_number: string
          updated_at?: string | null
          updated_by?: string | null
          utility_client: string
          utility_submission_reference?: string | null
          utility_submitted_at?: string | null
          utility_submitted_by?: string | null
          work_description?: string | null
          work_order_ref?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string
          address_line2?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_driver_id?: string | null
          assigned_to?: string | null
          city?: string | null
          client_contact_name?: string | null
          client_contact_phone?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          crew_id?: string | null
          current_assessment_id?: string | null
          damage_types?: string[] | null
          deleted_at?: string | null
          deleted_by?: string | null
          due_date?: string | null
          estimated_travel_time?: number | null
          geofence_radius_meters?: number | null
          id?: string
          is_deleted?: boolean | null
          is_important?: boolean
          latitude?: number | null
          longitude?: number | null
          raw_ocr_text?: string | null
          review_stage?: string
          route_batch_id?: string | null
          route_order?: number | null
          scheduled_date?: string | null
          severity?: string | null
          source_file_id?: string | null
          source_type?: Database["public"]["Enums"]["ticket_source_type"]
          special_instructions?: string | null
          started_at?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          storm_event_id?: string | null
          team_lead_id?: string | null
          template_key?: string | null
          ticket_number?: string
          updated_at?: string | null
          updated_by?: string | null
          utility_client?: string
          utility_submission_reference?: string | null
          utility_submitted_at?: string | null
          utility_submitted_by?: string | null
          work_description?: string | null
          work_order_ref?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "field_crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_current_assessment_id_fkey"
            columns: ["current_assessment_id"]
            isOneToOne: false
            referencedRelation: "damage_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_source_file_id_fkey"
            columns: ["source_file_id"]
            isOneToOne: false
            referencedRelation: "ticket_attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_storm_event_id_fkey"
            columns: ["storm_event_id"]
            isOneToOne: false
            referencedRelation: "storm_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_team_lead_id_fkey"
            columns: ["team_lead_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_utility_submitted_by_fkey"
            columns: ["utility_submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          activity_intervals: Json
          billable_amount: number | null
          billable_minutes: number | null
          break_minutes: number | null
          calculation_version: string
          clock_in_accuracy: number | null
          clock_in_at: string
          clock_in_ip: unknown
          clock_in_latitude: number | null
          clock_in_longitude: number | null
          clock_in_photo_url: string | null
          clock_in_user_agent: string | null
          clock_out_accuracy: number | null
          clock_out_at: string | null
          clock_out_ip: unknown
          clock_out_latitude: number | null
          clock_out_longitude: number | null
          clock_out_photo_url: string | null
          contractor_id: string
          contractor_role: Database["public"]["Enums"]["contractor_role"] | null
          created_at: string | null
          created_by: string | null
          id: string
          invoice_id: string | null
          is_deleted: boolean | null
          legacy_vehicle_rate_applied: number | null
          overtime_minutes: number | null
          overtime_pay_amount: number | null
          overtime_rate_applied: number | null
          paid_minutes_exact: number | null
          pay_rate_applied: number | null
          pay_segments: Json
          payroll_amount: number | null
          regular_minutes: number | null
          regular_pay_amount: number | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          storm_event_id: string | null
          sync_error: string | null
          sync_status: Database["public"]["Enums"]["sync_status"] | null
          ticket_id: string | null
          total_minutes: number | null
          updated_at: string | null
          updated_by: string | null
          utility_bill_amount: number | null
          utility_bill_rate_applied: number | null
          vehicle_hourly_rate_applied: number | null
          vehicle_allowance_amount: number | null
          vehicle_minutes: number | null
          weekly_allocations: Json
          work_type: Database["public"]["Enums"]["work_type"]
          work_type_rate: number
        }
        Insert: {
          activity_intervals?: Json
          billable_amount?: number | null
          billable_minutes?: number | null
          break_minutes?: number | null
          calculation_version?: string
          clock_in_accuracy?: number | null
          clock_in_at: string
          clock_in_ip?: unknown
          clock_in_latitude?: number | null
          clock_in_longitude?: number | null
          clock_in_photo_url?: string | null
          clock_in_user_agent?: string | null
          clock_out_accuracy?: number | null
          clock_out_at?: string | null
          clock_out_ip?: unknown
          clock_out_latitude?: number | null
          clock_out_longitude?: number | null
          clock_out_photo_url?: string | null
          contractor_id: string
          contractor_role?:
            | Database["public"]["Enums"]["contractor_role"]
            | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          is_deleted?: boolean | null
          legacy_vehicle_rate_applied?: number | null
          overtime_minutes?: number | null
          overtime_pay_amount?: number | null
          overtime_rate_applied?: number | null
          paid_minutes_exact?: number | null
          pay_rate_applied?: number | null
          pay_segments?: Json
          payroll_amount?: number | null
          regular_minutes?: number | null
          regular_pay_amount?: number | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          storm_event_id?: string | null
          sync_error?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          ticket_id?: string | null
          total_minutes?: number | null
          updated_at?: string | null
          updated_by?: string | null
          utility_bill_amount?: number | null
          utility_bill_rate_applied?: number | null
          vehicle_hourly_rate_applied?: number | null
          vehicle_allowance_amount?: number | null
          vehicle_minutes?: number | null
          weekly_allocations?: Json
          work_type: Database["public"]["Enums"]["work_type"]
          work_type_rate: number
        }
        Update: {
          activity_intervals?: Json
          billable_amount?: number | null
          billable_minutes?: number | null
          break_minutes?: number | null
          calculation_version?: string
          clock_in_accuracy?: number | null
          clock_in_at?: string
          clock_in_ip?: unknown
          clock_in_latitude?: number | null
          clock_in_longitude?: number | null
          clock_in_photo_url?: string | null
          clock_in_user_agent?: string | null
          clock_out_accuracy?: number | null
          clock_out_at?: string | null
          clock_out_ip?: unknown
          clock_out_latitude?: number | null
          clock_out_longitude?: number | null
          clock_out_photo_url?: string | null
          contractor_id?: string
          contractor_role?:
            | Database["public"]["Enums"]["contractor_role"]
            | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          is_deleted?: boolean | null
          legacy_vehicle_rate_applied?: number | null
          overtime_minutes?: number | null
          overtime_pay_amount?: number | null
          overtime_rate_applied?: number | null
          paid_minutes_exact?: number | null
          pay_rate_applied?: number | null
          pay_segments?: Json
          payroll_amount?: number | null
          regular_minutes?: number | null
          regular_pay_amount?: number | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          storm_event_id?: string | null
          sync_error?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          ticket_id?: string | null
          total_minutes?: number | null
          updated_at?: string | null
          updated_by?: string | null
          utility_bill_amount?: number | null
          utility_bill_rate_applied?: number | null
          vehicle_hourly_rate_applied?: number | null
          vehicle_allowance_amount?: number | null
          vehicle_minutes?: number | null
          weekly_allocations?: Json
          work_type?: Database["public"]["Enums"]["work_type"]
          work_type_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_storm_event_id_fkey"
            columns: ["storm_event_id"]
            isOneToOne: false
            referencedRelation: "storm_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entry_vehicle_claims: {
        Row: {
          amount: number
          capped: boolean
          contractor_id: string
          created_at: string
          declared_hours: number
          id: string
          license_plate_photo_url: string
          notes: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          time_entry_id: string
          updated_at: string
          vehicle_photo_url: string
          vehicle_type: string
        }
        Insert: {
          amount?: number
          capped?: boolean
          contractor_id: string
          created_at?: string
          declared_hours: number
          id?: string
          license_plate_photo_url: string
          notes: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          time_entry_id: string
          updated_at?: string
          vehicle_photo_url: string
          vehicle_type: string
        }
        Update: {
          amount?: number
          capped?: boolean
          contractor_id?: string
          created_at?: string
          declared_hours?: number
          id?: string
          license_plate_photo_url?: string
          notes?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          time_entry_id?: string
          updated_at?: string
          vehicle_photo_url?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entry_vehicle_claims_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entry_vehicle_claims_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entry_vehicle_claims_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: true
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permission_versions: {
        Row: {
          profile_id: string
          version: string
        }
        Insert: {
          profile_id: string
          version?: string
        }
        Update: {
          profile_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_versions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          effect: string
          permission_key: string
          profile_id: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          effect: string
          permission_key: string
          profile_id: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          effect?: string
          permission_key?: string
          profile_id?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      utilities: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          utility_client_key: string
          utility_code: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          utility_client_key: string
          utility_code: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          utility_client_key?: string
          utility_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "utilities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      utility_billing_rates: {
        Row: {
          currency: string
          hourly_rate: number
          id: string
          role: Database["public"]["Enums"]["contractor_role"] | null
          storm_event_id: string | null
          updated_at: string
          updated_by: string | null
          work_type: Database["public"]["Enums"]["work_type"] | null
        }
        Insert: {
          currency?: string
          hourly_rate: number
          id?: string
          role?: Database["public"]["Enums"]["contractor_role"] | null
          storm_event_id?: string | null
          updated_at?: string
          updated_by?: string | null
          work_type?: Database["public"]["Enums"]["work_type"] | null
        }
        Update: {
          currency?: string
          hourly_rate?: number
          id?: string
          role?: Database["public"]["Enums"]["contractor_role"] | null
          storm_event_id?: string | null
          updated_at?: string
          updated_by?: string | null
          work_type?: Database["public"]["Enums"]["work_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "utility_billing_rates_storm_event_id_fkey"
            columns: ["storm_event_id"]
            isOneToOne: false
            referencedRelation: "storm_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utility_billing_rates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wire_sizes: {
        Row: {
          ampacity: number | null
          category: string
          created_at: string | null
          id: string
          size_code: string
          size_name: string
          typical_use: string | null
        }
        Insert: {
          ampacity?: number | null
          category: string
          created_at?: string | null
          id?: string
          size_code: string
          size_name: string
          typical_use?: string | null
        }
        Update: {
          ampacity?: number | null
          category?: string
          created_at?: string | null
          id?: string
          size_code?: string
          size_name?: string
          typical_use?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_contractor_record: {
        Args: {
          p_actor_id: string
          p_email: string
          p_first_name: string
          p_last_name: string
          p_phone: string
          p_terms: Json
        }
        Returns: Json
      }
      assign_contractor_to_storm: {
        Args: { p_contractor_id: string; p_storm_id: string }
        Returns: undefined
      }
      assign_contractor_to_storm_with_compensation: {
        Args: {
          p_contractor_id: string
          p_pay_rate_override: number | null
          p_storm_id: string
          p_vehicle_hourly_rate: number | null
        }
        Returns: undefined
      }
      assign_ticket_crew: {
        Args: { p_crew_id: string; p_ticket_id: string }
        Returns: {
          address: string
          address_line2: string | null
          assigned_at: string | null
          assigned_by: string | null
          assigned_driver_id: string | null
          assigned_to: string | null
          city: string | null
          client_contact_name: string | null
          client_contact_phone: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          crew_id: string | null
          current_assessment_id: string | null
          damage_types: string[] | null
          deleted_at: string | null
          deleted_by: string | null
          due_date: string | null
          estimated_travel_time: number | null
          geofence_radius_meters: number | null
          id: string
          is_deleted: boolean | null
          is_important: boolean
          latitude: number | null
          longitude: number | null
          raw_ocr_text: string | null
          review_stage: string
          route_batch_id: string | null
          route_order: number | null
          scheduled_date: string | null
          severity: string | null
          source_file_id: string | null
          source_type: Database["public"]["Enums"]["ticket_source_type"]
          special_instructions: string | null
          started_at: string | null
          state: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          storm_event_id: string | null
          team_lead_id: string | null
          template_key: string | null
          ticket_number: string
          updated_at: string | null
          updated_by: string | null
          utility_client: string
          utility_submission_reference: string | null
          utility_submitted_at: string | null
          utility_submitted_by: string | null
          work_description: string | null
          work_order_ref: string | null
          zip_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tickets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assign_ticket_team_lead: {
        Args: { p_team_lead_id: string; p_ticket_id: string }
        Returns: {
          address: string
          address_line2: string | null
          assigned_at: string | null
          assigned_by: string | null
          assigned_driver_id: string | null
          assigned_to: string | null
          city: string | null
          client_contact_name: string | null
          client_contact_phone: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          crew_id: string | null
          current_assessment_id: string | null
          damage_types: string[] | null
          deleted_at: string | null
          deleted_by: string | null
          due_date: string | null
          estimated_travel_time: number | null
          geofence_radius_meters: number | null
          id: string
          is_deleted: boolean | null
          is_important: boolean
          latitude: number | null
          longitude: number | null
          raw_ocr_text: string | null
          review_stage: string
          route_batch_id: string | null
          route_order: number | null
          scheduled_date: string | null
          severity: string | null
          source_file_id: string | null
          source_type: Database["public"]["Enums"]["ticket_source_type"]
          special_instructions: string | null
          started_at: string | null
          state: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          storm_event_id: string | null
          team_lead_id: string | null
          template_key: string | null
          ticket_number: string
          updated_at: string | null
          updated_by: string | null
          utility_client: string
          utility_submission_reference: string | null
          utility_submitted_at: string | null
          utility_submitted_by: string | null
          work_description: string | null
          work_order_ref: string | null
          zip_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tickets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_contractor_account_setup: {
        Args: { p_email: string }
        Returns: Json
      }
      complete_account_password_setup: {
        Args: { p_profile_id: string }
        Returns: undefined
      }
      complete_contractor_onboarding: {
        Args: { p_details: Json; p_profile_id: string }
        Returns: undefined
      }
      complete_invitation_pay_setup: {
        Args: { p_actor: string; p_email: string; p_profile: string }
        Returns: string
      }
      create_field_crew: {
        Args: {
          p_assessor_id: string
          p_driver_id: string
          p_name: string
          p_team_lead_id: string
          p_ticket_id: string
        }
        Returns: {
          assessor_id: string
          created_at: string
          created_by: string
          driver_id: string
          id: string
          is_active: boolean
          name: string
          storm_event_id: string
          team_lead_id: string
        }
        SetofOptions: {
          from: "*"
          to: "field_crews"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_storm_event_with_rates: {
        Args: { p_event: Json; p_role_rates: Json }
        Returns: Json
      }
      get_storm_compensation_rates: {
        Args: { p_storm_id: string }
        Returns: Json
      }
      save_storm_compensation_rates: {
        Args: { p_role_rates: Json; p_storm_id: string }
        Returns: undefined
      }
      create_storm_ticket: {
        Args: {
          p_common: Json
          p_confidence?: Json
          p_payload: Json
          p_storm_id: string
          p_warnings?: string[]
        }
        Returns: string
      }
      current_user_role: { Args: never; Returns: string }
      finalize_contractor_invite: {
        Args: {
          p_actor_id: string
          p_email: string
          p_first_name: string
          p_last_name: string
          p_phone: string
          p_profile_id: string
          p_resend: boolean
        }
        Returns: Json
      }
      get_assigned_storm_ticket_context: {
        Args: { p_storm_id: string }
        Returns: Json
      }
      get_my_permissions: { Args: never; Returns: Json }
      get_privileged_payroll_entries: {
        Args: {
          p_contractor?: string
          p_from?: string
          p_storm?: string
          p_to?: string
        }
        Returns: Json
      }
      get_user_permission_settings: {
        Args: { p_profile_id: string }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      list_assignable_storm_contractors: {
        Args: { p_storm_id: string }
        Returns: Json
      }
      list_storm_contractors: { Args: { p_storm_id: string }; Returns: Json }
      mark_ticket_notification_read: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      record_ticket_work_note: {
        Args: {
          p_body: string
          p_id: string
          p_kind: string
          p_reported_at: string
          p_ticket_id: string
        }
        Returns: {
          actor_profile_id: string
          body: string
          created_at: string
          id: string
          kind: string
          reported_at: string
          ticket_id: string
        }
        SetofOptions: {
          from: "*"
          to: "ticket_work_notes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_ticket_field_action: {
        Args: { p_action: string; p_ticket_id: string }
        Returns: Database["public"]["Tables"]["tickets"]["Row"]
        SetofOptions: {
          from: "*"
          to: "tickets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_ticket_utility_handoff: {
        Args: { p_reference: string; p_ticket_id: string }
        Returns: {
          address: string
          address_line2: string | null
          assigned_at: string | null
          assigned_by: string | null
          assigned_driver_id: string | null
          assigned_to: string | null
          city: string | null
          client_contact_name: string | null
          client_contact_phone: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          crew_id: string | null
          current_assessment_id: string | null
          damage_types: string[] | null
          deleted_at: string | null
          deleted_by: string | null
          due_date: string | null
          estimated_travel_time: number | null
          geofence_radius_meters: number | null
          id: string
          is_deleted: boolean | null
          is_important: boolean
          latitude: number | null
          longitude: number | null
          raw_ocr_text: string | null
          review_stage: string
          route_batch_id: string | null
          route_order: number | null
          scheduled_date: string | null
          severity: string | null
          source_file_id: string | null
          source_type: Database["public"]["Enums"]["ticket_source_type"]
          special_instructions: string | null
          started_at: string | null
          state: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          storm_event_id: string | null
          team_lead_id: string | null
          template_key: string | null
          ticket_number: string
          updated_at: string | null
          updated_by: string | null
          utility_client: string
          utility_submission_reference: string | null
          utility_submitted_at: string | null
          utility_submitted_by: string | null
          work_description: string | null
          work_order_ref: string | null
          zip_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tickets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      review_ticket_assessment: {
        Args: { p_assessment_id: string; p_decision: string; p_notes?: string }
        Returns: {
          assessed_at: string | null
          assessed_by: string | null
          contractor_id: string
          created_at: string | null
          created_by: string | null
          damage_cause: string | null
          digital_signature: string | null
          estimated_repair_cost: number | null
          estimated_repair_hours: number | null
          field_assessment: Json | null
          id: string
          immediate_actions: string | null
          photo_evidence: Json | null
          priority: Database["public"]["Enums"]["priority_level"] | null
          repair_vs_replace: string | null
          review_notes: string | null
          review_stage: string
          reviewed_at: string | null
          reviewed_by: string | null
          safety_observations: Json | null
          sync_status: Database["public"]["Enums"]["sync_status"] | null
          team_review_notes: string | null
          team_reviewed_at: string | null
          team_reviewed_by: string | null
          ticket_id: string
          updated_at: string | null
          updated_by: string | null
          weather_conditions: string | null
        }
        SetofOptions: {
          from: "*"
          to: "damage_assessments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_entergy_ticket_form: {
        Args: {
          p_expected_version?: number
          p_id: string
          p_kind: string
          p_payload: Json
          p_photos: Json
          p_submit?: boolean
          p_ticket_id: string
        }
        Returns: {
          created_at: string
          created_by: string
          form_kind: string
          id: string
          payload: Json
          photo_evidence: Json
          saved_at: string
          saved_by: string
          status: string
          submitted_at: string | null
          ticket_id: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "ticket_entergy_forms"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_ticket_assessment_draft: {
        Args: {
          p_assessment_id: string
          p_expected_version?: number
          p_payload: Json
          p_photos: Json
          p_ticket_id: string
        }
        Returns: {
          assessment_id: string
          contractor_id: string
          field_assessment: Json
          photo_evidence: Json
          saved_at: string
          saved_by: string
          ticket_id: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "ticket_assessment_drafts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_ticket_disabled: {
        Args: { p_disabled: boolean; p_ticket_id: string }
        Returns: Database["public"]["Tables"]["tickets"]["Row"]
        SetofOptions: {
          from: "*"
          to: "tickets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_user_permissions: {
        Args: { p_overrides: Json; p_profile_id: string; p_version?: string }
        Returns: Json
      }
      submit_ticket_assessment: {
        Args: {
          p_assessment_id: string
          p_expected_version: number
          p_ticket_id: string
        }
        Returns: {
          assessed_at: string | null
          assessed_by: string | null
          contractor_id: string
          created_at: string | null
          created_by: string | null
          damage_cause: string | null
          digital_signature: string | null
          estimated_repair_cost: number | null
          estimated_repair_hours: number | null
          field_assessment: Json | null
          id: string
          immediate_actions: string | null
          photo_evidence: Json | null
          priority: Database["public"]["Enums"]["priority_level"] | null
          repair_vs_replace: string | null
          review_notes: string | null
          review_stage: string
          reviewed_at: string | null
          reviewed_by: string | null
          safety_observations: Json | null
          sync_status: Database["public"]["Enums"]["sync_status"] | null
          team_review_notes: string | null
          team_reviewed_at: string | null
          team_reviewed_by: string | null
          ticket_id: string
          updated_at: string | null
          updated_by: string | null
          weather_conditions: string | null
        }
        SetofOptions: {
          from: "*"
          to: "damage_assessments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ticket_dispatch_options: { Args: { p_ticket_id: string }; Returns: Json }
      update_ticket_field_status: {
        Args: {
          p_accuracy: number
          p_latitude: number
          p_longitude: number
          p_status: string
          p_ticket_id: string
        }
        Returns: {
          address: string
          address_line2: string | null
          assigned_at: string | null
          assigned_by: string | null
          assigned_driver_id: string | null
          assigned_to: string | null
          city: string | null
          client_contact_name: string | null
          client_contact_phone: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          crew_id: string | null
          current_assessment_id: string | null
          damage_types: string[] | null
          deleted_at: string | null
          deleted_by: string | null
          due_date: string | null
          estimated_travel_time: number | null
          geofence_radius_meters: number | null
          id: string
          is_deleted: boolean | null
          is_important: boolean
          latitude: number | null
          longitude: number | null
          raw_ocr_text: string | null
          review_stage: string
          route_batch_id: string | null
          route_order: number | null
          scheduled_date: string | null
          severity: string | null
          source_file_id: string | null
          source_type: Database["public"]["Enums"]["ticket_source_type"]
          special_instructions: string | null
          started_at: string | null
          state: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          storm_event_id: string | null
          team_lead_id: string | null
          template_key: string | null
          ticket_number: string
          updated_at: string | null
          updated_by: string | null
          utility_client: string
          utility_submission_reference: string | null
          utility_submitted_at: string | null
          utility_submitted_by: string | null
          work_description: string | null
          work_order_ref: string | null
          zip_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tickets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      validate_storm_ticket_payload: {
        Args: { p_payload: Json; p_storm_id: string }
        Returns: undefined
      }
    }
    Enums: {
      contractor_role:
        | "STORM_MANAGER"
        | "TEAM_LEAD"
        | "SR_DAMAGE_ASSESSER"
        | "DAMAGE_ASSESSER"
        | "DRIVER"
      equipment_condition: "GOOD" | "FAIR" | "DAMAGED" | "DESTROYED"
      expense_category:
        | "MILEAGE"
        | "FUEL"
        | "LODGING"
        | "MEALS"
        | "TOLLS"
        | "PARKING"
        | "MATERIALS"
        | "EQUIPMENT_RENTAL"
        | "OTHER"
      expense_status:
        | "DRAFT"
        | "SUBMITTED"
        | "UNDER_REVIEW"
        | "APPROVED"
        | "REJECTED"
        | "PAID"
      invoice_status:
        | "DRAFT"
        | "SUBMITTED"
        | "UNDER_REVIEW"
        | "APPROVED"
        | "PAID"
        | "VOID"
      media_type: "PHOTO" | "VIDEO" | "DOCUMENT" | "SIGNATURE"
      notification_type:
        | "TICKET_ASSIGNED"
        | "TICKET_UPDATED"
        | "TIME_APPROVED"
        | "EXPENSE_APPROVED"
        | "INVOICE_GENERATED"
        | "PAYMENT_PROCESSED"
        | "DOCUMENT_EXPIRING"
        | "SAFETY_ALERT"
      payment_method: "ACH" | "CHECK" | "WIRE" | "OTHER"
      pole_size: "30'" | "35'" | "40'" | "45'" | "50'" | "55'" | "60'"
      priority_level: "A" | "B" | "C" | "X"
      sync_status: "SYNCED" | "PENDING" | "FAILED" | "CONFLICT"
      ticket_source_type:
        | "MANUAL"
        | "OCR_SCAN"
        | "PDF_IMPORT"
        | "CSV_IMPORT"
        | "API"
      ticket_status:
        | "DRAFT"
        | "ASSIGNED"
        | "REJECTED"
        | "IN_ROUTE"
        | "ON_SITE"
        | "IN_PROGRESS"
        | "COMPLETE"
        | "PENDING_REVIEW"
        | "APPROVED"
        | "NEEDS_REWORK"
        | "CLOSED"
        | "ARCHIVED"
        | "EXPIRED"
      user_role: "CEO" | "SUPER_ADMIN" | "ADMIN" | "CONTRACTOR"
      wire_size:
        | "#6"
        | "#4"
        | "#2"
        | "1/0"
        | "2/0"
        | "3/0"
        | "4/0"
        | "336"
        | "556"
        | "795"
      work_type:
        | "Working"
        | "MOB"
        | "DE-MOB"
        | "Stand-by"
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
      contractor_role: [
        "STORM_MANAGER",
        "TEAM_LEAD",
        "SR_DAMAGE_ASSESSER",
        "DAMAGE_ASSESSER",
        "DRIVER",
      ],
      equipment_condition: ["GOOD", "FAIR", "DAMAGED", "DESTROYED"],
      expense_category: [
        "MILEAGE",
        "FUEL",
        "LODGING",
        "MEALS",
        "TOLLS",
        "PARKING",
        "MATERIALS",
        "EQUIPMENT_RENTAL",
        "OTHER",
      ],
      expense_status: [
        "DRAFT",
        "SUBMITTED",
        "UNDER_REVIEW",
        "APPROVED",
        "REJECTED",
        "PAID",
      ],
      invoice_status: [
        "DRAFT",
        "SUBMITTED",
        "UNDER_REVIEW",
        "APPROVED",
        "PAID",
        "VOID",
      ],
      media_type: ["PHOTO", "VIDEO", "DOCUMENT", "SIGNATURE"],
      notification_type: [
        "TICKET_ASSIGNED",
        "TICKET_UPDATED",
        "TIME_APPROVED",
        "EXPENSE_APPROVED",
        "INVOICE_GENERATED",
        "PAYMENT_PROCESSED",
        "DOCUMENT_EXPIRING",
        "SAFETY_ALERT",
      ],
      payment_method: ["ACH", "CHECK", "WIRE", "OTHER"],
      pole_size: ["30'", "35'", "40'", "45'", "50'", "55'", "60'"],
      priority_level: ["A", "B", "C", "X"],
      sync_status: ["SYNCED", "PENDING", "FAILED", "CONFLICT"],
      ticket_source_type: [
        "MANUAL",
        "OCR_SCAN",
        "PDF_IMPORT",
        "CSV_IMPORT",
        "API",
      ],
      ticket_status: [
        "DRAFT",
        "ASSIGNED",
        "REJECTED",
        "IN_ROUTE",
        "ON_SITE",
        "IN_PROGRESS",
        "COMPLETE",
        "PENDING_REVIEW",
        "APPROVED",
        "NEEDS_REWORK",
        "CLOSED",
        "ARCHIVED",
        "EXPIRED",
      ],
      user_role: ["CEO", "SUPER_ADMIN", "ADMIN", "CONTRACTOR"],
      wire_size: [
        "#6",
        "#4",
        "#2",
        "1/0",
        "2/0",
        "3/0",
        "4/0",
        "336",
        "556",
        "795",
      ],
      work_type: [
        "Working",
        "MOB",
        "DE-MOB",
        "Stand-by",
      ],
    },
  },
} as const
