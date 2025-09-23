-- Remove duplicate subscriptions for user Dj
-- Keep only the most recent subscription per plan_name

-- First, let's see what we have for user Dj
SELECT 
    p.first_name, 
    p.last_name, 
    s.plan_name, 
    s.start_date, 
    s.end_date,
    s.id,
    s.is_active
FROM profiles p
LEFT JOIN subscriptions s ON p.id = s.user_id
WHERE p.first_name LIKE '%Dj%'
ORDER BY s.plan_name, s.end_date DESC;

-- Create a temporary table with the subscriptions to keep
-- (most recent subscription per plan_name for user Dj)
WITH user_dj_subscriptions AS (
    SELECT DISTINCT ON (s.plan_name)
        s.id,
        s.user_id,
        s.plan_name,
        s.start_date,
        s.end_date,
        s.is_active,
        s.external_subscription_id
    FROM subscriptions s
    JOIN profiles p ON s.user_id = p.id
    WHERE p.first_name LIKE '%Dj%'
    ORDER BY s.plan_name, s.end_date DESC, s.start_date DESC
),
-- Get all subscription IDs for user Dj
all_dj_subscription_ids AS (
    SELECT s.id
    FROM subscriptions s
    JOIN profiles p ON s.user_id = p.id
    WHERE p.first_name LIKE '%Dj%'
),
-- Get the IDs of subscriptions to keep
subscriptions_to_keep AS (
    SELECT id FROM user_dj_subscriptions
),
-- Get the IDs of subscriptions to delete
subscriptions_to_delete AS (
    SELECT id 
    FROM all_dj_subscription_ids 
    WHERE id NOT IN (SELECT id FROM subscriptions_to_keep)
)
-- Delete the duplicate subscriptions
DELETE FROM subscriptions 
WHERE id IN (SELECT id FROM subscriptions_to_delete);

-- Verify the cleanup by showing remaining subscriptions for user Dj
SELECT 
    p.first_name, 
    p.last_name, 
    s.plan_name, 
    s.start_date, 
    s.end_date,
    s.id,
    s.is_active
FROM profiles p
LEFT JOIN subscriptions s ON p.id = s.user_id
WHERE p.first_name LIKE '%Dj%'
ORDER BY s.plan_name;
