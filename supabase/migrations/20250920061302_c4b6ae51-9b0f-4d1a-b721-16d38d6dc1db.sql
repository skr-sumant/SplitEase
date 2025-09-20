-- Enable realtime for group_members table
ALTER TABLE public.group_members REPLICA IDENTITY FULL;

-- Add the table to supabase_realtime publication if not already added
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'group_members'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
    END IF;
END $$;