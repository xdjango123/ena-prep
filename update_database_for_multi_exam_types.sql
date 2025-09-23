-- Update database schema to support multiple exam types per user
-- Run this in your Supabase SQL editor

-- 1. Add a user_selected_exam_type column to profiles table
-- This will track which exam type the user currently has selected/active
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS user_selected_exam_type 'CM' | 'CMS' | 'CS' | 'ALL' DEFAULT 'CM';

-- 2. Create a user_exam_types table to track all exam types a user has access to
CREATE TABLE IF NOT EXISTS user_exam_types (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_type 'CM' | 'CMS' | 'CS' NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, exam_type)
);

-- 3. Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_user_exam_types_user_id ON user_exam_types(user_id);
CREATE INDEX IF NOT EXISTS idx_user_exam_types_exam_type ON user_exam_types(exam_type);

-- 4. Migrate existing data from profiles.exam_type to user_exam_types
INSERT INTO user_exam_types (user_id, exam_type, is_active)
SELECT 
  id as user_id,
  exam_type,
  true as is_active
FROM profiles 
WHERE exam_type IS NOT NULL
ON CONFLICT (user_id, exam_type) DO NOTHING;

-- 5. Update user_selected_exam_type to match the first exam_type from user_exam_types
UPDATE profiles 
SET user_selected_exam_type = (
  SELECT exam_type 
  FROM user_exam_types 
  WHERE user_id = profiles.id 
  ORDER BY created_at ASC 
  LIMIT 1
)
WHERE user_selected_exam_type IS NULL;

-- 6. Create a function to get user's active exam types
CREATE OR REPLACE FUNCTION get_user_active_exam_types(user_uuid uuid)
RETURNS TABLE(exam_type 'CM' | 'CMS' | 'CS', is_active boolean) AS $$
BEGIN
  RETURN QUERY
  SELECT uet.exam_type, uet.is_active
  FROM user_exam_types uet
  WHERE uet.user_id = user_uuid
  AND uet.is_active = true
  ORDER BY uet.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- 7. Create a function to add exam type to user
CREATE OR REPLACE FUNCTION add_user_exam_type(
  user_uuid uuid,
  new_exam_type 'CM' | 'CMS' | 'CS'
)
RETURNS boolean AS $$
BEGIN
  INSERT INTO user_exam_types (user_id, exam_type, is_active)
  VALUES (user_uuid, new_exam_type, true)
  ON CONFLICT (user_id, exam_type) 
  DO UPDATE SET is_active = true, created_at = now();
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- 8. Create a function to remove exam type from user
CREATE OR REPLACE FUNCTION remove_user_exam_type(
  user_uuid uuid,
  exam_type_to_remove 'CM' | 'CMS' | 'CS'
)
RETURNS boolean AS $$
BEGIN
  UPDATE user_exam_types 
  SET is_active = false 
  WHERE user_id = user_uuid 
  AND exam_type = exam_type_to_remove;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- 9. Create a function to set user's selected exam type
CREATE OR REPLACE FUNCTION set_user_selected_exam_type(
  user_uuid uuid,
  selected_exam_type 'CM' | 'CMS' | 'CS'
)
RETURNS boolean AS $$
BEGIN
  -- Check if user has access to this exam type
  IF EXISTS (
    SELECT 1 FROM user_exam_types 
    WHERE user_id = user_uuid 
    AND exam_type = selected_exam_type 
    AND is_active = true
  ) THEN
    UPDATE profiles 
    SET user_selected_exam_type = selected_exam_type
    WHERE id = user_uuid;
    RETURN true;
  ELSE
    RETURN false;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- 10. Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_active_exam_types(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION add_user_exam_type(uuid, 'CM' | 'CMS' | 'CS') TO authenticated;
GRANT EXECUTE ON FUNCTION remove_user_exam_type(uuid, 'CM' | 'CMS' | 'CS') TO authenticated;
GRANT EXECUTE ON FUNCTION set_user_selected_exam_type(uuid, 'CM' | 'CMS' | 'CS') TO authenticated;

-- 11. Create RLS policies for user_exam_types table
ALTER TABLE user_exam_types ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own exam types
CREATE POLICY "Users can view their own exam types" ON user_exam_types
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own exam types
CREATE POLICY "Users can insert their own exam types" ON user_exam_types
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own exam types
CREATE POLICY "Users can update their own exam types" ON user_exam_types
  FOR UPDATE USING (auth.uid() = user_id);

-- 12. Test the functions
-- Uncomment these lines to test:
-- SELECT * FROM get_user_active_exam_types('your-user-id-here');
-- SELECT add_user_exam_type('your-user-id-here', 'CMS');
-- SELECT set_user_selected_exam_type('your-user-id-here', 'CMS');
