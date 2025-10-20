-- SQL script to expire user subscription for testing renewal functionality
-- User ID: 2a6a2422-1824-4d78-b2fb-906d8567be09

-- Option 1: Set end_date to past (more realistic)
UPDATE subscriptions 
SET 
    end_date = CURRENT_DATE - INTERVAL '7 days',
    is_active = false
WHERE user_id = '2a6a2422-1824-4d78-b2fb-906d8567be09';

-- Option 2: Just deactivate (simpler)
-- UPDATE subscriptions 
-- SET is_active = false
-- WHERE user_id = '2a6a2422-1824-4d78-b2fb-906d8567be09';

-- Verify the changes
SELECT 
    user_id,
    plan_name,
    is_active,
    start_date,
    end_date,
    CASE 
        WHEN end_date < CURRENT_DATE THEN 'EXPIRED'
        WHEN is_active = false THEN 'INACTIVE'
        ELSE 'ACTIVE'
    END as status
FROM subscriptions 
WHERE user_id = '2a6a2422-1824-4d78-b2fb-906d8567be09';

