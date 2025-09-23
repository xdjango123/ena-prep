-- Create user_plans table to support multiple exam plans per user
CREATE TABLE IF NOT EXISTS user_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL CHECK (plan_name IN ('Prépa CM', 'Prépa CMS', 'Prépa CS')),
  exam_type TEXT NOT NULL CHECK (exam_type IN ('CM', 'CMS', 'CS')),
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique active plan per user per exam type
  UNIQUE(user_id, exam_type, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_plans_user_id ON user_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plans_active ON user_plans(user_id, is_active) WHERE is_active = true;

-- Add RLS (Row Level Security) policies
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own plans
CREATE POLICY "Users can view their own plans" ON user_plans
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own plans
CREATE POLICY "Users can insert their own plans" ON user_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own plans
CREATE POLICY "Users can update their own plans" ON user_plans
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own plans
CREATE POLICY "Users can delete their own plans" ON user_plans
  FOR DELETE USING (auth.uid() = user_id);

-- Add selected_plan column to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS selected_plan TEXT CHECK (selected_plan IN ('CM', 'CMS', 'CS'));

-- Create a function to automatically set selected_plan when a user gets their first plan
CREATE OR REPLACE FUNCTION set_default_selected_plan()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is the first active plan for the user, set it as selected
  IF NOT EXISTS (
    SELECT 1 FROM user_plans 
    WHERE user_id = NEW.user_id 
    AND is_active = true 
    AND id != NEW.id
  ) THEN
    UPDATE profiles 
    SET selected_plan = NEW.exam_type 
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set selected_plan
CREATE TRIGGER trigger_set_default_selected_plan
  AFTER INSERT ON user_plans
  FOR EACH ROW
  EXECUTE FUNCTION set_default_selected_plan();


