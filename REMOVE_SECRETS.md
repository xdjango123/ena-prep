# Removing Secrets from Git History

## ⚠️ CRITICAL: Revoke Your API Key First!

Your OpenAI API key was exposed in git history. **You must revoke it immediately:**

1. Go to: https://platform.openai.com/api-keys
2. Find the exposed API key (look for keys that match the pattern in your git history)
3. Click "Revoke" or delete it
4. Generate a new key and update your `.env` file

## Steps to Remove Secrets from Git History

### Option 1: Using git filter-branch (Built-in)

```bash
cd /Users/joasyepidan/Documents/projects/ena/project

# Remove the hardcoded key from all commits
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch generate_questions_gpt5.py run_explanations.py' \
  --prune-empty --tag-name-filter cat -- --all

# Restore the files from current working directory
git checkout HEAD -- generate_questions_gpt5.py run_explanations.py

# Force push (WARNING: This rewrites history!)
git push origin --force --all
```

### Option 2: Using git-filter-repo (Recommended - cleaner)

```bash
# Install git-filter-repo first
pip3 install git-filter-repo

cd /Users/joasyepidan/Documents/projects/ena/project

# Create a script to rewrite the problematic commits
git filter-repo --path generate_questions_gpt5.py --path run_explanations.py --invert-paths --force

# Then restore the files
git checkout origin/master -- generate_questions_gpt5.py run_explanations.py
git add generate_questions_gpt5.py run_explanations.py
git commit -m "Restore files without secrets"

# Force push
git push origin --force --all
```

### Option 3: Interactive Rebase (Manual)

If you only have a few commits to fix:

```bash
cd /Users/joasyepidan/Documents/projects/ena/project

# Interactive rebase to edit the problematic commits
git rebase -i 404137e^  # Edit commits after the first problematic one

# In the editor, change 'pick' to 'edit' for commits 404137e and aa86cda
# Then when it stops at each commit:
git show HEAD:generate_questions_gpt5.py > /tmp/old_file.py
# Manually edit to remove the secret
git add generate_questions_gpt5.py
git commit --amend --no-edit
git rebase --continue

# Repeat for other commits
```

## After Removing Secrets

1. Update your `.env` with the NEW API key
2. Verify no secrets in current code: `grep -r "sk-" . --exclude-dir=node_modules`
3. Force push cleaned history
4. GitHub should allow the push after secrets are removed

## Verify No Secrets Remaining

```bash
# Check current working files
grep -r "sk-proj\|API_KEY.*=.*sk-" . --exclude-dir=node_modules --exclude-dir=.git

# Check git history
git log -p --all | grep -i "sk-proj\|API_KEY.*=.*sk-"
```

