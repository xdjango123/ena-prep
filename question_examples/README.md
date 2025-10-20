# Question Examples Format Documentation

## Overview
This folder contains example questions for each exam type and subject combination. These examples will be used to train the AI models to generate high-quality, contextually appropriate questions.

## File Structure
```
question_examples/
├── CM_ANG_examples.json    # English questions for CM level
├── CM_CG_examples.json     # Culture Générale for CM (Côte d'Ivoire context)
├── CM_LOG_examples.json    # Logic questions for CM
├── CMS_ANG_examples.json   # English for CMS level
├── CMS_CG_examples.json    # CG for CMS (Côte d'Ivoire context)
├── CMS_LOG_examples.json   # Logic for CMS
├── CS_ANG_examples.json    # English for CS level
├── CS_CG_examples.json     # CG for CS (Côte d'Ivoire context)
├── CS_LOG_examples.json    # Logic for CS
└── README.md               # This file
```

## JSON Format
Each file should contain an array of question objects with the following structure:

```json
[
  {
    "question_text": "The complete question text here",
    "answer1": "First option",
    "answer2": "Second option", 
    "answer3": "Third option",
    "answer4": "Fourth option",
    "correct": "A",
    "explanation": "Detailed explanation of why this answer is correct",
    "difficulty": "EASY",
    "sub_category": "Grammar",
    "notes": "Additional context or notes about Côte d'Ivoire relevance"
  }
]
```

## Field Requirements

### Required Fields
- **question_text**: The complete question text
- **answer1-4**: All four answer options (A, B, C, D)
- **correct**: The correct answer ("A", "B", "C", or "D")
- **explanation**: Clear explanation of the correct answer
- **difficulty**: "EASY", "MED", or "HARD"
- **sub_category**: Relevant sub-category for the subject

### Optional Fields
- **notes**: Additional context, especially for Côte d'Ivoire relevance

## Subject-Specific Requirements

### ANG (English) Questions
- **Language**: Questions should be in English
- **Topics**: Grammar, vocabulary, reading comprehension, sentence structure, tenses, prepositions, articles, pronouns, phrasal verbs, idioms
- **Sub-categories**: Grammar, Vocabulary, Reading Comprehension, Sentence Structure
- **Quality**: Professional, exam-appropriate questions. Even EASY questions should require thought.
- **Standards**: International English standards suitable for competitive exams

### CG (Culture Générale) Questions
- **Language**: Questions should be in French
- **Context**: Must be tailored to **Côte d'Ivoire**
- **Topics**: History, geography, politics, economy of Côte d'Ivoire, regional and international knowledge relevant to Ivorian context, current events, cultural aspects
- **Sub-categories**: Histoire, Géographie, Sciences, Littérature, Actualités, Politique, Économie
- **Relevance**: All questions should have clear relevance to Côte d'Ivoire context

### LOG (Logique) Questions
- **Language**: Questions should be in French
- **Variety**: Numerical puzzles, matrices, sequences, patterns, equations, arithmetic, algebra, geometry problems, analytical reasoning, deduction, visual and numerical logic puzzles
- **Sub-categories**: Aptitude Numérique et Organisation, Logique Mathématique, Raisonnement Analytique
- **Types**: Mix of different question types to ensure variety

## Difficulty Guidelines

### EASY
- Basic concepts and straightforward applications
- Should still require some thought, not trivial
- Clear, unambiguous questions

### MED (Medium)
- Intermediate concepts requiring analysis
- May involve multiple steps or concepts
- Moderate complexity

### HARD
- Advanced concepts requiring deep understanding
- Complex reasoning or multi-step problem solving
- Challenging but fair questions

## Example Counts
Each file should contain approximately:
- **5-10 EASY questions**
- **5-10 MED questions** 
- **5-10 HARD questions**

**Total**: 15-30 example questions per file

## Quality Standards
1. **Clarity**: Questions should be clear and unambiguous
2. **Accuracy**: All information should be factually correct
3. **Relevance**: Questions should be relevant to ENA exam preparation
4. **Difficulty**: Difficulty level should match the specified difficulty
5. **Options**: All answer options should be plausible but only one should be correct
6. **Explanations**: Explanations should be clear and educational

## Notes for Côte d'Ivoire Context
For CG questions especially, include notes about:
- Historical relevance to Côte d'Ivoire
- Current political/economic context
- Cultural significance
- Regional importance
- International connections relevant to Ivorian context

## Usage
These example files will be used by the question generation scripts to:
1. Provide context and style examples to AI models
2. Ensure generated questions match the expected format and quality
3. Maintain consistency with Côte d'Ivoire context requirements
4. Guide difficulty level calibration


