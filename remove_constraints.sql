-- Remove constraints from test_results table
-- Run these commands in your Supabase SQL Editor

-- 1. Remove the test_type check constraint
ALTER TABLE test_results DROP CONSTRAINT IF EXISTS test_results_test_type_check;

-- 2. Remove the category check constraint  
ALTER TABLE test_results DROP CONSTRAINT IF EXISTS test_results_category_check;

-- 3. Verify constraints are removed
SELECT conname, contype, confrelid 
FROM pg_constraint 
WHERE conrelid = 'test_results'::regclass 
AND conname LIKE '%test_results%';
