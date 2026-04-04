export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          is_premium: boolean
          role: 'admin' | 'student'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string
          is_premium?: boolean
          role?: 'admin' | 'student'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          is_premium?: boolean
          role?: 'admin' | 'student'
          created_at?: string
          updated_at?: string
        }
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
      }
    }
  }
}
