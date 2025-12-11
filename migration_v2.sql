-- ==============================================================================
-- ENA Project - Production Schema V2
-- Description: Normalized schema for questions, exams, and analytics.
-- ==============================================================================

-- 1. QUESTIONS V2
-- Normalized, clean question bank with proper constraints and JSONB options.
CREATE TABLE IF NOT EXISTS questions_v2 (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Content
    text text NOT NULL,
    options jsonb NOT NULL, -- Array of strings ["Opt A", "Opt B"...]
    correct_index integer NOT NULL CHECK (correct_index >= 0), -- 0-based index into options
    explanation text,
    
    -- Classification
    subject text NOT NULL CHECK (subject IN ('ANG', 'CG', 'LOG')),
    exam_type text NOT NULL CHECK (exam_type IN ('CM', 'CMS', 'CS')),
    difficulty text NOT NULL CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    
    -- Context & Usage
    test_type text NOT NULL CHECK (test_type IN ('free_quiz', 'quick_quiz', 'practice', 'exam_blanc')),
    test_number integer, -- Nullable, used for grouping into specific exams
    
    -- Metadata
    is_ai_generated boolean DEFAULT false,
    passage_id uuid REFERENCES passages(id) ON DELETE SET NULL,
    metadata jsonb DEFAULT '{}'::jsonb, -- Store legacy IDs, usage stats, hashes here
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Unique Constraint: Prevent duplicates based on Text + Options content
-- We create a unique index on the text and the JSON representation of options
CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_v2_content_unique 
ON questions_v2 (text, options);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_questions_v2_lookup 
ON questions_v2 (subject, exam_type, test_type);

CREATE INDEX IF NOT EXISTS idx_questions_v2_test_number 
ON questions_v2 (test_number) WHERE test_number IS NOT NULL;


-- 2. VISITORS V2
-- Clean visitor tracking linked to potential future users.
CREATE TABLE IF NOT EXISTS visitors_v2 (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fingerprint text, -- Browser fingerprint hash
    first_seen_at timestamptz DEFAULT now(),
    last_seen_at timestamptz DEFAULT now(),
    converted_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- The "Golden Link"
    metadata jsonb DEFAULT '{}'::jsonb -- Store device info, referrer, etc.
);

CREATE INDEX IF NOT EXISTS idx_visitors_v2_fingerprint ON visitors_v2 (fingerprint);
CREATE INDEX IF NOT EXISTS idx_visitors_v2_converted_user ON visitors_v2 (converted_user_id);


-- 3. EXAM SESSIONS
-- "Header" table for any test taken (Header info only).
CREATE TABLE IF NOT EXISTS exam_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Who
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    visitor_id uuid REFERENCES visitors_v2(id) ON DELETE SET NULL,
    
    -- Context
    test_type text NOT NULL CHECK (test_type IN ('free_quiz', 'quick_quiz', 'practice', 'exam_blanc')),
    exam_type text CHECK (exam_type IN ('CM', 'CMS', 'CS')), -- Context of the session
    test_number integer, -- If taking a specific numbered test
    
    -- State
    status text NOT NULL CHECK (status IN ('started', 'completed', 'abandoned')) DEFAULT 'started',
    started_at timestamptz DEFAULT now(),
    completed_at timestamptz,
    
    -- Aggregates (Calculated on completion)
    score_total float, -- e.g., 15.0
    score_percentage integer, -- e.g., 75
    total_questions integer,
    correct_answers integer,
    time_spent_seconds integer
);

CREATE INDEX IF NOT EXISTS idx_exam_sessions_user ON exam_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_visitor ON exam_sessions (visitor_id);


-- 4. EXAM ANSWERS
-- "Detail" table storing every single interaction/answer.
CREATE TABLE IF NOT EXISTS exam_answers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid REFERENCES exam_sessions(id) ON DELETE CASCADE,
    question_id uuid REFERENCES questions_v2(id) ON DELETE SET NULL,
    
    -- The Interaction
    selected_option_index integer, -- Which index (0-3) did they pick? Null if skipped.
    is_correct boolean NOT NULL,
    time_spent_ms integer, -- Optional: Time spent on this specific question
    
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_answers_session ON exam_answers (session_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_question ON exam_answers (question_id);

-- RLS POLICIES (Security) ---------------------------------------------------

-- Enable RLS
ALTER TABLE questions_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_answers ENABLE ROW LEVEL SECURITY;

-- Questions: Public read-only
CREATE POLICY "Public questions read" ON questions_v2 FOR SELECT USING (true);

-- Visitors: Insert public, Read own (by ID or fingerprint - simplied to public insert for now)
CREATE POLICY "Visitors insert" ON visitors_v2 FOR INSERT WITH CHECK (true);
CREATE POLICY "Visitors select own" ON visitors_v2 FOR SELECT USING (true); -- Logic handled by service

-- Sessions: Users see own, Visitors see own (handled via service logic mostly)
CREATE POLICY "Users see own sessions" ON exam_sessions 
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public insert sessions" ON exam_sessions 
    FOR INSERT WITH CHECK (auth.uid() IS NULL); -- Allow anon insert

-- Answers: Same as sessions
CREATE POLICY "Users see own answers" ON exam_answers 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM exam_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
    );

CREATE POLICY "Public insert answers" ON exam_answers 
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM exam_sessions s WHERE s.id = session_id AND s.user_id IS NULL)
    );










