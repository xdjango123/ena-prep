#!/bin/bash
# Script to remove hardcoded API keys from git history

set -e

echo "⚠️  WARNING: This will rewrite git history!"
echo "Make sure you've:"
echo "1. Revoked the exposed API key at https://platform.openai.com/api-keys"
echo "2. Backed up your repo"
echo "3. Updated .env with a NEW API key"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

cd "$(dirname "$0")"

# The exposed API key pattern to remove (DO NOT PUT ACTUAL KEYS HERE!)
# This will match any OpenAI API key starting with sk-proj-
EXPOSED_KEY_PATTERN="sk-proj-[A-Za-z0-9_-]{100,}"

echo "🔍 Checking for exposed keys in git history..."
if git log --all --source --full-history -p | grep -qiE "$EXPOSED_KEY_PATTERN"; then
    echo "❌ Found exposed key pattern in history!"
else
    echo "✅ No exposed keys found (might have been cleaned already)"
    exit 0
fi

echo ""
echo "🧹 Cleaning git history..."

# Use git filter-branch to remove the secret
git filter-branch --force --index-filter \
    "git rm --cached --ignore-unmatch generate_questions_gpt5.py run_explanations.py 2>/dev/null || true" \
    --prune-empty --tag-name-filter cat -- --all

# Now restore the current clean versions of these files
echo "📝 Restoring clean versions of files..."
git checkout HEAD -- generate_questions_gpt5.py run_explanations.py 2>/dev/null || true

# Alternative: Use sed to rewrite commits (more precise)
echo "🔧 Using sed to remove secret lines from history..."

# Backup current state
git stash

# Remove the problematic lines from all commits
git filter-branch --force --tree-filter '
    if [ -f generate_questions_gpt5.py ]; then
        sed -i "" "/os.environ\[\"OPENAI_API_KEY\"\] = /d" generate_questions_gpt5.py || true
        sed -i "" "/SUPABASE_URL = /d" generate_questions_gpt5.py || true
        sed -i "" "/SUPABASE_SERVICE_KEY = /d" generate_questions_gpt5.py || true
    fi
    if [ -f run_explanations.py ]; then
        sed -i "" "/^API_KEY = /d" run_explanations.py || true
        sed -i "" "/sk-proj/d" run_explanations.py || true
    fi
' --prune-empty --tag-name-filter cat -- --all

# Restore current files
git stash pop

echo ""
echo "✅ Git history cleaned!"
echo ""
echo "🔍 Verifying no secrets remain..."
if git log --all --source --full-history -p | grep -qiE "$EXPOSED_KEY_PATTERN"; then
    echo "⚠️  Warning: Key pattern still found in some commits"
    echo "You may need to use BFG Repo-Cleaner for a more thorough clean"
else
    echo "✅ No secrets found in history!"
fi

echo ""
echo "📤 Next steps:"
echo "1. Verify the cleanup: git log -p | grep -i 'sk-proj\|API_KEY'"
echo "2. Force push to GitHub: git push origin --force --all"
echo "3. Update your .env file with a NEW API key"
echo ""
echo "⚠️  IMPORTANT: Make sure everyone on your team knows about the history rewrite!"

