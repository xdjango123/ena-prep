-- Add exam_type column to subscriptions table
-- This will be called from Python script

-- Add exam_type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' 
        AND column_name = 'exam_type'
    ) THEN
        ALTER TABLE subscriptions 
        ADD COLUMN exam_type VARCHAR(10);
        
        -- Add comment
        COMMENT ON COLUMN subscriptions.exam_type IS 'Exam type: CM, CMS, or CS';
        
        RAISE NOTICE 'exam_type column added to subscriptions table';
    ELSE
        RAISE NOTICE 'exam_type column already exists in subscriptions table';
    END IF;
END $$;
