#!/bin/bash
# Quick script to remove the API key from the specific commit GitHub is complaining about

set -e

cd "$(dirname "$0")"

echo "🔧 Fixing commit 430fe51 to remove hardcoded API key..."

# Use git filter-branch to rewrite that specific commit
git filter-branch --force --tree-filter '
    if [ -f clean_git_history.sh ]; then
        sed -i "" "/^EXPOSED_KEY=\"/d" clean_git_history.sh 2>/dev/null || true
        sed -i "" "s/EXPOSED_KEY=\"/EXPOSED_KEY_PATTERN=\"/g" clean_git_history.sh 2>/dev/null || true
        sed -i "" "/sk-proj-t1-BZ61FvDFW0jwv68DJuaHUh6F1E/d" clean_git_history.sh 2>/dev/null || true
    fi
' --prune-empty --tag-name-filter cat 430fe51..HEAD

echo ""
echo "✅ History cleaned! Now force push with:"
echo "   git push origin --force --all"


