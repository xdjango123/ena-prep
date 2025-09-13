-- Create table for storing examens blancs
CREATE TABLE IF NOT EXISTS examens_blancs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_number INTEGER NOT NULL,
    exam_type VARCHAR(10) NOT NULL CHECK (exam_type IN ('CM', 'CMS', 'CS')),
    total_questions INTEGER NOT NULL DEFAULT 60,
    questions_per_subject INTEGER NOT NULL DEFAULT 20,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(exam_number, exam_type)
);

-- Create table for storing examen blanc question assignments
CREATE TABLE IF NOT EXISTS examen_blanc_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    examen_blanc_id UUID NOT NULL REFERENCES examens_blancs(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    question_order INTEGER NOT NULL,
    subject_order INTEGER NOT NULL, -- 1=ANG, 2=CG, 3=LOG
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(examen_blanc_id, question_id),
    UNIQUE(examen_blanc_id, question_order)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_examens_blancs_exam_type ON examens_blancs(exam_type);
CREATE INDEX IF NOT EXISTS idx_examens_blancs_exam_number ON examens_blancs(exam_number);
CREATE INDEX IF NOT EXISTS idx_examen_blanc_questions_examen_id ON examen_blanc_questions(examen_blanc_id);
CREATE INDEX IF NOT EXISTS idx_examen_blanc_questions_question_id ON examen_blanc_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_examen_blanc_questions_order ON examen_blanc_questions(examen_blanc_id, question_order);
