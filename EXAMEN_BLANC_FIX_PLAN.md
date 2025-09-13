# Examen Blanc Questions Fix Plan

## Current Issues Analysis

Based on the analysis of 577 examen blanc questions:

### Critical Issues Found:
- **229/577 questions (40%) have issues**
- **CG questions are most problematic: 210/265 (79%) have issues**
- **ANG questions: 13/115 (11%) have issues** 
- **LOG questions: 6/197 (3%) have issues**

### Specific Issues by Category:

#### CG (Culture Générale) - 210 issues:
- **157 questions** have English options (should be French)
- **91 questions** have inconsistent option lengths
- **16 questions** have English explanations (should be French)
- **2 questions** have explanation mismatches

#### ANG (English) - 13 issues:
- **7 questions** are too advanced for French speakers
- **5 questions** have explanation mismatches
- **1 question** has inconsistent options

#### LOG (Logic) - 6 issues:
- **6 questions** have inconsistent option lengths

## Root Cause Analysis

1. **Wrong Format**: Current questions use 4 options (A,B,C,D) but CM exams use 3 options (A,B,C)
2. **Language Inconsistency**: CG questions have English options/explanations
3. **Difficulty Mismatch**: ANG questions too advanced for French speakers
4. **Option Inconsistency**: Some options are full descriptions while others are short
5. **Explanation Mismatches**: Explanations don't match the actual questions

## Fix Strategy

### Phase 1: Clean Up Existing Questions
1. **Delete all current examen_blanc questions** (577 questions)
2. **Keep only good questions** that match CM format exactly

### Phase 2: Generate New Questions Following CM Format

#### ANG Questions (Target: 200 questions)
- **Format**: 3 options (A, B, C)
- **Difficulty**: Basic to intermediate English for French speakers
- **Topics**: 
  - Verb patterns (suggest + gerund, agree to + infinitive)
  - Simple tenses (past simple, present perfect)
  - Basic grammar (articles, prepositions)
  - Vocabulary (common words)
- **Language**: English questions, French explanations
- **Options**: Short, consistent length

#### CG Questions (Target: 200 questions)
- **Format**: 3 options (A, B, C)
- **Language**: All French (questions, options, explanations)
- **Topics**:
  - Vocabulary and spelling
  - Proverbs and idioms
  - Basic general knowledge
  - Simple facts about history, geography, science
- **Options**: Short, consistent (single words or short phrases)

#### LOG Questions (Target: 200 questions)
- **Format**: 3 options (A, B, C)
- **Language**: All French
- **Topics**:
  - Basic arithmetic
  - Simple algebra
  - Logical sequences
  - Word problems
  - Basic geometry
- **Options**: Short numbers or brief answers

### Phase 3: Quality Assurance
1. **Language Check**: All CG in French, ANG explanations in French
2. **Format Check**: All questions have exactly 3 options
3. **Consistency Check**: All options similar length
4. **Difficulty Check**: ANG questions appropriate for French speakers
5. **Explanation Check**: Explanations match questions and are in correct language

## Implementation Plan

### Step 1: Backup Current Questions
- Export current examen_blanc questions to backup file

### Step 2: Delete Current Questions
- Remove all questions where test_type = 'examen_blanc'

### Step 3: Generate New Questions
- Use improved prompt based on CM exam examples
- Generate 200 questions per category (600 total)
- Ensure 3-option format
- Language consistency
- Appropriate difficulty

### Step 4: Validation
- Run analysis script to verify no issues
- Manual spot-check of generated questions
- Test with sample users

## Expected Outcome
- **600 high-quality questions** (200 per category)
- **100% French** for CG and LOG
- **Appropriate difficulty** for French speakers
- **Consistent format** matching CM exams
- **No explanation mismatches**
- **Consistent option lengths**

## Files to Create/Modify
1. `backup_examen_blanc_questions.py` - Backup current questions
2. `delete_examen_blanc_questions.py` - Clean up current questions  
3. `generate_cm_format_questions.py` - Generate new questions
4. `validate_questions.py` - Final validation
5. Update existing generation scripts with CM format
