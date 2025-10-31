-- Create automatic subscription expiration handling
-- Run this in your Supabase SQL editor

-- Create a function to update expired subscriptions
CREATE OR REPLACE FUNCTION update_expired_subscriptions()
RETURNS void AS $$
BEGIN
    -- Update subscriptions where end_date has passed
    UPDATE subscriptions 
    SET is_active = false 
    WHERE end_date < NOW() 
    AND is_active = true;
    
    -- Log the update (optional)
    RAISE NOTICE 'Updated expired subscriptions at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a function that can be called manually and returns results
CREATE OR REPLACE FUNCTION check_and_update_expired_subscriptions()
RETURNS TABLE(
    updated_count INTEGER,
    expired_subscriptions TEXT[]
) AS $$
DECLARE
    expired_subs TEXT[];
    count_result INTEGER;
BEGIN
    -- Get list of expired subscription IDs before updating
    SELECT ARRAY_AGG(id::TEXT) INTO expired_subs
    FROM subscriptions 
    WHERE end_date < NOW() 
    AND is_active = true;
    
    -- Update expired subscriptions
    UPDATE subscriptions 
    SET is_active = false 
    WHERE end_date < NOW() 
    AND is_active = true;
    
    -- Get count of updated rows
    GET DIAGNOSTICS count_result = ROW_COUNT;
    
    -- Return results
    RETURN QUERY SELECT count_result, expired_subs;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get current subscription status summary
CREATE OR REPLACE FUNCTION get_subscription_status_summary()
RETURNS TABLE(
    total_subscriptions INTEGER,
    active_subscriptions INTEGER,
    expired_subscriptions INTEGER,
    mismatched_subscriptions INTEGER
) AS $$
DECLARE
    total_count INTEGER;
    active_count INTEGER;
    expired_count INTEGER;
    mismatched_count INTEGER;
BEGIN
    -- Get total count
    SELECT COUNT(*) INTO total_count FROM subscriptions;
    
    -- Get active count (not expired and is_active = true)
    SELECT COUNT(*) INTO active_count 
    FROM subscriptions 
    WHERE end_date >= NOW() AND is_active = true;
    
    -- Get expired count (expired and is_active = false)
    SELECT COUNT(*) INTO expired_count 
    FROM subscriptions 
    WHERE end_date < NOW() AND is_active = false;
    
    -- Get mismatched count (expired but is_active = true, or active but is_active = false)
    SELECT COUNT(*) INTO mismatched_count 
    FROM subscriptions 
    WHERE (end_date < NOW() AND is_active = true) 
    OR (end_date >= NOW() AND is_active = false);
    
    -- Return results
    RETURN QUERY SELECT total_count, active_count, expired_count, mismatched_count;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_expired_subscriptions() TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_update_expired_subscriptions() TO authenticated;
GRANT EXECUTE ON FUNCTION get_subscription_status_summary() TO authenticated;

-- Test the functions
-- Uncomment these lines to test:
-- SELECT * FROM get_subscription_status_summary();
-- SELECT * FROM check_and_update_expired_subscriptions();
