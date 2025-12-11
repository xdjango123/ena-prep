import { createClient } from '@supabase/supabase-js'

// Import V2 types
import type { 
  QuestionV2, 
  Subject, 
  ExamType, 
  Difficulty, 
  TestType,
  TestData,
  Passage
} from '../types/questions'

// Re-export V2 types for backward compatibility
export type { QuestionV2, Subject, ExamType, Difficulty, TestType, TestData, Passage }

// Legacy Question type - DEPRECATED, use QuestionV2 instead
// Keeping for any remaining legacy code during migration
/** @deprecated Use QuestionV2 instead */
export interface Question {
  id: string
  text: string
  options: string[]
  correct_index: number
  explanation?: string
  subject: Subject
  exam_type: ExamType
  difficulty: Difficulty
  test_type: TestType
  test_number: number | null
}

// Legacy snapshot type - DEPRECATED
// This was used for storing question state, now use QuestionV2 directly
/** @deprecated Use QuestionV2 instead */
export interface ExamQuestionSnapshotRow {
  id: string
  order: number
  text: string // Updated from question_text
  options: string[] // Updated from answer1-4
  correct_index: number // Updated from correct
  explanation: string
  subject: string // Updated from category
  difficulty: string
  test_type?: string
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Profile {
  id: string
  first_name: string
  last_name: string
  plan_name: 'CM' | 'CMS' | 'CS' | 'ALL' | null // Updated to use plan_name instead of exam_type
  email: string | null
  avatar_url: string | null
  created_at: string | null
  expiration_date: string | null
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
  test_type: TestType // V2: 'free_quiz' | 'quick_quiz' | 'practice' | 'exam_blanc'
  category: Subject // V2: 'ANG' | 'CG' | 'LOG'
  test_number: number | null
  score: number
  created_at: string
  exam_type?: ExamType // V2: 'CM' | 'CMS' | 'CS'
}

export interface EmailLog {
  id: string
  user_id: string | null
  type: string | null
  sent_at: string | null
  status: string | null
}

// Passage is now imported from '../types/questions'
// Re-exported above for backward compatibility

export interface UserAttempt {
  id: number
  user_id: string
  test_type: TestType | null // V2 test types
  category: Subject | null // V2 subject types
  sub_category: string | null
  test_number: number | null
  score: number | null
  test_data: TestData | null // V2 TestData type
  created_at: string
  exam_type?: ExamType // V2 exam types
}

export interface UserPlan {
  id: string
  user_id: string
  plan_name: 'Prépa CM' | 'Prépa CMS' | 'Prépa CS'
  exam_type: 'CM' | 'CMS' | 'CS'
  is_active: boolean
  start_date: string
  end_date: string
  created_at: string
}

export interface UserExamType {
  id: string
  user_id: string
  exam_type: 'CM' | 'CMS' | 'CS'
  is_active: boolean
  created_at: string
}
