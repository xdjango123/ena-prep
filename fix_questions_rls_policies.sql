-- Fix RLS policies for questions table
-- This script ensures that authenticated users can read questions

-- Enable RLS on questions table if not already enabled
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to read questions" ON questions;
DROP POLICY IF EXISTS "Allow public read access to questions" ON questions;
DROP POLICY IF EXISTS "Users can view questions" ON questions;

-- Create a policy that allows authenticated users to read questions
-- This is the most permissive policy for reading questions
CREATE POLICY "Allow authenticated users to read questions" ON questions
  FOR SELECT 
  TO authenticated
  USING (true);

-- Alternative: If you want to allow public access to questions (for unauthenticated users)
-- Uncomment the following lines if you want to allow public access:
-- CREATE POLICY "Allow public read access to questions" ON questions
--   FOR SELECT 
--   TO anon
--   USING (true);

-- Grant necessary permissions
GRANT SELECT ON questions TO authenticated;
-- GRANT SELECT ON questions TO anon; -- Uncomment if you want public access

-- Verify the policies are working
-- You can test this by running:
-- SELECT * FROM questions LIMIT 5;
