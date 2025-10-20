# Quick Start Guide - Examen Blanc Pipeline

## 🚀 Quick Start (3 Steps)

### Step 1: Install Dependencies
```bash
cd /Users/joasyepidan/Documents/projects/ena/project
python3 install_dependencies.py
```

### Step 2: Set API Keys
```bash
export OPENAI_API_KEY="your-openai-api-key"
export ANTHROPIC_API_KEY="your-anthropic-api-key"
```

### Step 3: Run Pipeline
```bash
python3 run_examen_blanc_pipeline.py
```

## 🔍 Test Everything First (Recommended)

Before running the full pipeline, test that everything is working:

```bash
python3 test_dependencies.py
```

This will check:
- ✅ All Python packages are installed
- ✅ API keys are set
- ✅ File directories are accessible
- ✅ Docx files are found

## 📊 What to Expect

- **Processing Time**: ~30-60 minutes for all 40 files
- **Questions**: ~2,400 questions (40 files × 60 questions each)
- **AI Validation**: GPT-5 + Claude dual validation
- **Manual Review**: <10% of questions may need manual review
- **Output**: Comprehensive statistics and reports

## 🆘 If Something Goes Wrong

1. **Missing packages**: Run `python3 install_dependencies.py`
2. **API errors**: Check your API keys and billing
3. **File errors**: Run `python3 test_dependencies.py` to diagnose
4. **Pipeline stops**: Check the generated reports for details

## 📁 Generated Files

After successful completion, you'll find:
- `parsed_questions/` - Parsed JSON files
- `ai_validated_questions/` - AI-validated questions
- `question_statistics_report.txt` - Final statistics
- `pipeline_report.txt` - Complete pipeline summary

## 🎯 Success Criteria

- All 40 files processed successfully
- ~2,400 questions inserted into database
- Questions marked as `test_type='examen_blanc'` and `difficulty='HARD'`
- AI-generated explanations for all questions
- Comprehensive statistics report generated

---

**Need help?** Check the full documentation in `EXAMEN_BLANC_PIPELINE_README.md`
