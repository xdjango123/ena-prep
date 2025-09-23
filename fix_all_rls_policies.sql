-- Fix RLS policies for all tables used by the application
-- This script ensures that authenticated users can access the data they need

-- 1. Questions table - Allow authenticated users to read questions
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read questions" ON questions;
DROP POLICY IF EXISTS "Allow public read access to questions" ON questions;

-- Create policy for authenticated users to read questions
CREATE POLICY "Allow authenticated users to read questions" ON questions
  FOR SELECT 
  TO authenticated
  USING (true);

-- Grant permissions
GRANT SELECT ON questions TO authenticated;

-- 2. Profiles table - Users can only see their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = id);

-- Grant permissions
GRANT SELECT, UPDATE ON profiles TO authenticated;

-- 3. Subscriptions table - Users can only see their own subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON subscriptions;

-- Create policies for subscriptions
CREATE POLICY "Users can view their own subscriptions" ON subscriptions
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON subscriptions
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON subscriptions
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON subscriptions TO authenticated;

-- 4. Test results table - Users can only see their own test results
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own test results" ON test_results;
DROP POLICY IF EXISTS "Users can insert their own test results" ON test_results;
DROP POLICY IF EXISTS "Users can update their own test results" ON test_results;
DROP POLICY IF EXISTS "Users can delete their own test results" ON test_results;

-- Create policies for test_results
CREATE POLICY "Users can view their own test results" ON test_results
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own test results" ON test_results
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own test results" ON test_results
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own test results" ON test_results
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON test_results TO authenticated;

-- 5. User attempts table - Users can only see their own attempts
ALTER TABLE user_attempts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own attempts" ON user_attempts;
DROP POLICY IF EXISTS "Users can insert their own attempts" ON user_attempts;
DROP POLICY IF EXISTS "Users can update their own attempts" ON user_attempts;
DROP POLICY IF EXISTS "Users can delete their own attempts" ON user_attempts;

-- Create policies for user_attempts
CREATE POLICY "Users can view their own attempts" ON user_attempts
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own attempts" ON user_attempts
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attempts" ON user_attempts
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own attempts" ON user_attempts
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_attempts TO authenticated;

-- 6. Email logs table - Users can only see their own email logs
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own email logs" ON email_logs;
DROP POLICY IF EXISTS "Users can insert their own email logs" ON email_logs;
DROP POLICY IF EXISTS "Users can update their own email logs" ON email_logs;

-- Create policies for email_logs
CREATE POLICY "Users can view their own email logs" ON email_logs
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email logs" ON email_logs
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email logs" ON email_logs
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON email_logs TO authenticated;

-- 7. Visitors table - Allow public access for anonymous users
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public access to visitors" ON visitors;

-- Create policy for visitors (public access)
CREATE POLICY "Allow public access to visitors" ON visitors
  FOR ALL 
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON visitors TO anon, authenticated;

-- 8. Passages table - Allow authenticated users to read passages
ALTER TABLE passages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read passages" ON passages;

-- Create policy for passages
CREATE POLICY "Allow authenticated users to read passages" ON passages
  FOR SELECT 
  TO authenticated
  USING (true);

-- Grant permissions
GRANT SELECT ON passages TO authenticated;

-- Verify the policies are working
-- You can test this by running:
-- SELECT * FROM questions LIMIT 5;
-- SELECT * FROM profiles WHERE id = auth.uid();
-- SELECT * FROM subscriptions WHERE user_id = auth.uid();
