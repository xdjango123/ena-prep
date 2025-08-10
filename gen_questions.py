import os, json, hashlib, random
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client
from typing import List, Dict

# Load environment variables from .env file
load_dotenv()

# Choose your LLM provider. Example: OpenAI
from openai import OpenAI
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
oai = OpenAI(api_key=OPENAI_API_KEY)

def fetch_examples(exam_type:str, subject:str, difficulty:str, k:int=4) -> List[Dict]:
    # sample a few existing questions for style
    # Map difficulty to database format
    db_difficulty = {
        'Easy': 'EASY',
        'Medium': 'MED', 
        'Hard': 'HARD'
    }.get(difficulty, 'MED')
    
    res = sb.table("questions") \
        .select("exam_type,category,question_text,answer1,answer2,answer3,answer4,correct,explanation") \
        .eq("exam_type", exam_type) \
        .eq("category", subject) \
        .eq("difficulty", db_difficulty) \
        .limit(50).execute()
    data = res.data or []

    random.shuffle(data)
    examples = []
    for row in data[:k]:
        answers = [row["answer1"], row["answer2"]]
        if row.get("answer3"): answers.append(row["answer3"])
        if row.get("answer4"): answers.append(row["answer4"])
        examples.append({
            "exam_type": row["exam_type"],
            "subject": row["category"],  # category in questions table is actually the subject
            "difficulty": difficulty,  # Keep original difficulty for AI prompt
            "answers": answers,
            "correct_choice": row["correct"],   # letter
            "explanation": row.get("explanation") or ""
        })
    return examples

def unique_hash(item:Dict) -> str:
    base = f"{item['exam_type']}|{item['subject']}|{item['difficulty']}|{item['question_text']}|{'|'.join(item['answers'])}|{item['correct_choice']}"
    return hashlib.sha256(base.encode("utf-8")).hexdigest()

def call_llm(exam_type, subject, difficulty, examples, count:int):
    system = """Tu es un générateur d'items QCM pour le concours ENA de la cote d'ivoire.
Respecte exactement le format JSON demandé. N'invente pas de champs.

Rules:
- Langue: Français
- Type: QCM (2 à 4 choix max)
- La bonne réponse est donnée sous forme de lettre: "A", "B", "C" ou "D".
- Les propositions doivent être plausibles et non triviales.
- Pas de contenus offensants.
- N'utilise jamais des réponses identiques ou vides.
- Reste fidèle au niveau de difficulté et au style des exemples fournis.

Return JSON with schema:
{
  "items": [
    {
      "exam_type": "CM|CMS|CS",
      "subject": "ANG|CG|LOG",
      "difficulty": "Easy|Medium|Hard",
      "question_text": "string",
      "answers": ["string","string","string?","string?"],
      "correct_choice": "A|B|C|D",
      "explanation": "string (optional)"
    }
  ]
}
"""
    user = {
        "exemples": examples,
        "generate_for": {
            "exam_type": exam_type,
            "subject": subject,
            "difficulty": difficulty,
            "count": count
        }
    }

    resp = oai.chat.completions.create(
        model="gpt-4o",  # Best model for ENA questions - high accuracy, excellent French
        temperature=0.4,  # Lower temperature for more consistent quality
        messages=[
            {"role":"system","content":system},
            {"role":"user","content":json.dumps(user, ensure_ascii=False)}
        ]
    )
    content = resp.choices[0].message.content
    
    # Debug: Print the raw response to see what we're getting
    print(f"🔍 Raw AI Response (first 200 chars): {content[:200]}...")
    
    try:
        return json.loads(content)
    except json.JSONDecodeError as e:
        print(f"❌ JSON Parse Error: {e}")
        print(f"🔍 Full AI Response: {content}")
        print("🔄 Attempting to fix malformed JSON...")
        
        # Try to extract JSON from the response
        import re
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            try:
                fixed_json = json_match.group(0)
                print(f"🔧 Extracted JSON: {fixed_json[:200]}...")
                return json.loads(fixed_json)
            except:
                pass
        
        # If all else fails, return a default structure
        print("⚠️  Could not parse JSON, returning empty items")
        return {"items": []}

def validate_and_insert(items:List[Dict], created_by=None, model_name="gpt-4o"):
    idx = {'A':0,'B':1,'C':2,'D':3}
    inserted = 0
    for it in items:
        # normalize options
        answers = [a for a in it.get("answers", []) if a]  # drop empties
        if len(answers) < 2 or len(answers) > 4:
            continue
        letter = it.get("correct_choice")
        if letter not in idx or idx[letter] >= len(answers):
            continue
        # dedupe
        uh = unique_hash({
            "exam_type": it["exam_type"],
            "subject": it["subject"],
            "difficulty": it["difficulty"],
            "question_text": it["question_text"].strip(),
            "answers": answers,
            "correct_choice": letter
        })
        
        # Check for duplicates using the RPC function
        try:
            dup = sb.rpc("check_duplicate_aiq", {"p_hash": uh}).execute()
            is_dup = bool(dup.data)  # supabase-py returns True/False as data
            if is_dup:
                print(f"Skipping duplicate question: {it['question_text'][:50]}...")
                continue
        except Exception as e:
            print(f"Warning: Could not check for duplicates: {e}")
            # Continue anyway to avoid blocking the process

        # Map difficulty to database format for ai_question_suggestions
        db_difficulty = {
            'Easy': 'Easy',
            'Medium': 'Medium', 
            'Hard': 'Hard'
        }.get(it["difficulty"], 'Medium')
        
        payload = {
            "category": it["exam_type"],  # CM/CMS/CS goes in category field
            "subject": it["subject"],     # ANG/CG/LOG goes in subject field
            "difficulty": db_difficulty,  # Keep Easy/Medium/Hard for ai_question_suggestions
            "question_text": it["question_text"].strip(),
            "answer1": answers[0],
            "answer2": answers[1],
            "answer3": answers[2] if len(answers) > 2 else None,
            "answer4": answers[3] if len(answers) > 3 else None,
            "correct": letter,  # Fixed: was correct_choice
            "explanation": it.get("explanation") or None,
            "status": "ready",  # Changed from 'draft' to 'ready' as requested
            "created_by": created_by,
            "model_name": model_name,
            "unique_hash": uh
        }
        
        try:
            result = sb.table("ai_question_suggestions").insert(payload).execute()
            if result.data:
                inserted += 1
                print(f"✅ Inserted: {it['question_text'][:50]}...")
            else:
                print(f"❌ Failed to insert: {it['question_text'][:50]}...")
        except Exception as e:
            print(f"❌ Error inserting question: {e}")
            
    return inserted

if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--exam", required=True, choices=["CM","CMS","CS"])
    ap.add_argument("--subject", required=True, choices=["ANG","CG","LOG"])  # Changed from --category
    ap.add_argument("--difficulty", required=True, choices=["Easy","Medium","Hard"])
    ap.add_argument("--count", type=int, default=10)
    ap.add_argument("--created_by", help="admin user uuid to stamp")
    args = ap.parse_args()

    examples = fetch_examples(args.exam, args.subject, args.difficulty, k=4)
    if not examples:
        print("No examples found; you can still proceed but quality may vary.")
    else:
        print(f"Found {len(examples)} example questions for style reference.")
        
    out = call_llm(args.exam, args.subject, args.difficulty, examples, args.count)
    items = out.get("items", [])
    print(f"LLM returned {len(items)} items.")

    # Insert the generated questions
    print("Inserting…")
    n = validate_and_insert(items, created_by=args.created_by)
    print(f"Inserted {n} suggestions (status=ready).")
