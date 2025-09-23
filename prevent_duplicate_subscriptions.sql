-- Prevent duplicate subscriptions by adding a unique constraint
-- This ensures that a user can only have one active subscription per plan

-- First, let's clean up any existing duplicates
-- Keep only the most recent subscription for each user/plan combination
WITH ranked_subscriptions AS (
  SELECT 
    id,
    user_id,
    plan_name,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, plan_name 
      ORDER BY start_date DESC, id DESC
    ) as rn
  FROM subscriptions
)
DELETE FROM subscriptions 
WHERE id IN (
  SELECT id 
  FROM ranked_subscriptions 
  WHERE rn > 1
);

-- Add a unique constraint to prevent future duplicates
-- This constraint ensures one active subscription per user per plan
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_subscription_per_user_plan 
ON subscriptions (user_id, plan_name) 
WHERE is_active = true;

-- Add a comment explaining the constraint
COMMENT ON INDEX unique_active_subscription_per_user_plan IS 
'Ensures each user can only have one active subscription per plan type';
