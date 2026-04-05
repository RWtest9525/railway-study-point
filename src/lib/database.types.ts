export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type EmptyRel = never;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string
          is_premium: boolean
          premium_until: string | null
          premium_started_at: string | null
          role: 'admin' | 'student' | 'banned'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string
          phone?: string
          is_premium?: boolean
          premium_until?: string | null
          premium_started_at?: string | null
          role?: 'admin' | 'student' | 'banned'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          phone?: string
          is_premium?: boolean
          premium_until?: string | null
          premium_started_at?: string | null
          role?: 'admin' | 'student' | 'banned'
          created_at?: string
          updated_at?: string
        }
        Relationships: EmptyRel[]
      }
      support_queries: {
        Row: {
          id: string
          user_id: string
          message: string
          admin_reply: string | null
          status: 'open' | 'replied' | 'closed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          message: string
          admin_reply?: string | null
          status?: 'open' | 'replied' | 'closed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          message?: string
          admin_reply?: string | null
          status?: 'open' | 'replied' | 'closed'
          created_at?: string
          updated_at?: string
        }
        Relationships: EmptyRel[]
      }
      site_settings: {
        Row: {
          id: number
          premium_price_paise: number
          premium_validity_days: number
          trial_nudge_interval_seconds: number
          updated_at: string
        }
        Insert: {
          id?: number
          premium_price_paise?: number
          premium_validity_days?: number
          trial_nudge_interval_seconds?: number
          updated_at?: string
        }
        Update: {
          id?: number
          premium_price_paise?: number
          premium_validity_days?: number
          trial_nudge_interval_seconds?: number
          updated_at?: string
        }
        Relationships: EmptyRel[]
      }
      questions: {
        Row: {
          id: string
          category: 'ALP' | 'NTPC' | 'Group-D'
          question_text: string
          options: string[]
          correct_answer: number
          explanation: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          category: 'ALP' | 'NTPC' | 'Group-D'
          question_text: string
          options: string[]
          correct_answer: number
          explanation?: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          category?: 'ALP' | 'NTPC' | 'Group-D'
          question_text?: string
          options?: string[]
          correct_answer?: number
          explanation?: string
          created_by?: string | null
          created_at?: string
        }
        Relationships: EmptyRel[]
      }
      exams: {
        Row: {
          id: string
          title: string
          category: 'ALP' | 'NTPC' | 'Group-D'
          question_ids: string[]
          duration_minutes: number
          is_premium: boolean
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          category: 'ALP' | 'NTPC' | 'Group-D'
          question_ids?: string[]
          duration_minutes?: number
          is_premium?: boolean
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          category?: 'ALP' | 'NTPC' | 'Group-D'
          question_ids?: string[]
          duration_minutes?: number
          is_premium?: boolean
          created_by?: string | null
          created_at?: string
        }
        Relationships: EmptyRel[]
      }
      results: {
        Row: {
          id: string
          user_id: string
          exam_id: string
          score: number
          total_questions: number
          time_taken_seconds: number
          answers: Record<string, number>
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          exam_id: string
          score?: number
          total_questions: number
          time_taken_seconds: number
          answers?: Record<string, number>
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          exam_id?: string
          score?: number
          total_questions?: number
          time_taken_seconds?: number
          answers?: Record<string, number>
          created_at?: string
        }
        Relationships: EmptyRel[]
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          amount: number
          status: 'pending' | 'success' | 'failed'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          amount: number
          status?: 'pending' | 'success' | 'failed'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          amount?: number
          status?: 'pending' | 'success' | 'failed'
          created_at?: string
        }
        Relationships: EmptyRel[]
      }
    }
    Views: Record<string, never>
    Functions: {
      get_leaderboard: {
        Args: { limit_n?: number }
        Returns: {
          user_id: string
          full_name: string
          total_score: number
          exams_taken: number
        }[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
