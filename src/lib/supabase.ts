import { createClient } from '@supabase/supabase-js'

// Question interface for test data
export interface Question {
  id: number
  type: 'multiple-choice' | 'true-false' | 'fill-blank' | 'matching'
  question: string
  options?: string[]
  correctAnswer: string | number
  explanation?: string
  difficulty: 'easy' | 'medium' | 'hard'
}

const supabaseUrl = 'https://ohngxnhnbwnystzkqzwy.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NTc2MzcsImV4cCI6MjA2NzQzMzYzN30.Epn0NnYiDRQh9NM3XRbe5j3YH6fuvQfX-UivRuQ8Sbk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Profile {
  id: string
  'First Name': string
  'Last Name': string
  exam_type: 'CM' | 'CMS' | 'CS' | 'ALL' | null
  email: string | null
  avatar_url: string | null
  created_at: string | null
  is_owner: boolean | null
}

export interface Subscription {
  id: string
  user_id: string
  plan_name: string
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
}

export interface Visitor {
  id: string
  session_id: string | null
  device_info: any | null
  created_at: string | null
  'quizQuiz Score': number | null
  'quickQuiz submit time': string | null
}

export interface TestResult {
  id: string
  user_id: string
  test_type: 'quick' | 'practice' | 'exam'
  category: 'ANG' | 'CG' | 'LOG'
  test_number: number | null
  score: number
  created_at: string
}

export interface EmailLog {
  id: string
  user_id: string | null
  type: string | null
  sent_at: string | null
  status: string | null
}

export interface Passage {
  id: string
  title: string | null
  content: string
  category: 'ANG' | 'CG' | 'LOG' | null
  sub_category: string | null
  difficulty_level: 'easy' | 'medium' | 'hard' | null
  created_at: string | null
}

export interface UserAttempt {
  id: number
  user_id: string
  test_type: string | null
  category: string | null
  sub_category: string | null
  test_number: number | null
  score: number | null
  test_data: {
    questions: Question[]
    userAnswers: [number, string | number][]
    correctAnswers: number
    totalQuestions: number
    timeSpent: number
  } | null
  created_at: string
} 