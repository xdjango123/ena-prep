-- Corrected function to approve AI questions and move them to questions table
create or replace function public.approve_ai_question(p_id uuid, p_reviewer uuid)
returns uuid
language plpgsql
as $$
declare
  s record;
  new_id uuid;
  mapped_difficulty text;
begin
  select *
  into s
  from public.ai_question_suggestions
  where id = p_id
    and status in ('draft','ready')
  for update;

  if not found then
    raise exception 'Suggestion % not found or not approvable', p_id;
  end if;

  -- Map difficulty from ai_question_suggestions format to questions table format
  mapped_difficulty := case s.difficulty
    when 'Easy' then 'EASY'
    when 'Medium' then 'MED'
    when 'Hard' then 'HARD'
    else 'MED'  -- default fallback
  end;

  -- sanity: ensure correct choice points to a non-null option
  if (s.correct = 'A' and s.answer1 is null)
     or (s.correct = 'B' and s.answer2 is null)
     or (s.correct = 'C' and s.answer3 is null)
     or (s.correct = 'D' and s.answer4 is null) then
    raise exception 'correct choice % points to NULL option', s.correct;
  end if;

  insert into public.questions (
    question_text,
    exam_type,        -- This comes from category in ai_question_suggestions
    difficulty,       -- Mapped to EASY/MED/HARD format
    category,         -- This comes from subject in ai_question_suggestions
    answer1, answer2, answer3, answer4,
    correct,          -- Letter (A, B, C, D)
    explanation,
    ai_generated,
    created_at, updated_at
  )
  values (
    s.question_text,
    s.category,       -- category in ai_question_suggestions = exam_type in questions
    mapped_difficulty, -- Converted difficulty
    s.subject,        -- subject in ai_question_suggestions = category in questions
    s.answer1, s.answer2, s.answer3, s.answer4,
    s.correct,        -- Copy the letter
    s.explanation,
    true,             -- mark as AI origin
    now(), now()
  )
  returning id into new_id;

  update public.ai_question_suggestions
     set status = 'approved',
         reviewed_by = p_reviewer,
         reviewed_at = now()
   where id = p_id;

  return new_id;
end $$; 