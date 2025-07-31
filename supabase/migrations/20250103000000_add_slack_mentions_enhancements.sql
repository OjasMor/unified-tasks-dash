-- Add any missing columns to slack_mentions table
DO $$ 
BEGIN
  -- Add mentioned_by_username column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'slack_mentions' AND column_name = 'mentioned_by_username'
  ) THEN
    ALTER TABLE public.slack_mentions ADD COLUMN mentioned_by_username TEXT;
  END IF;
END $$;

-- Create function to get user's recent mentions with user info
CREATE OR REPLACE FUNCTION public.get_user_slack_mentions_with_users(p_user_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  conversation_id TEXT,
  conversation_name TEXT,
  conversation_type TEXT,
  is_channel BOOLEAN,
  message_ts TEXT,
  message_text TEXT,
  mentioned_by_user_id TEXT,
  mentioned_by_username TEXT,
  permalink TEXT,
  slack_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sm.id,
    sm.conversation_id,
    sm.conversation_name,
    sm.conversation_type,
    sm.is_channel,
    sm.message_ts,
    sm.message_text,
    sm.mentioned_by_user_id,
    COALESCE(sm.mentioned_by_username, 'Unknown User') as mentioned_by_username,
    sm.permalink,
    sm.slack_created_at
  FROM public.slack_mentions sm
  WHERE sm.user_id = p_user_id
  ORDER BY sm.slack_created_at DESC
  LIMIT p_limit;
END;
$$;

-- Create function to check if user has Slack connection
CREATE OR REPLACE FUNCTION public.has_slack_connection(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_connection BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.slack_oauth_tokens 
    WHERE user_id = p_user_id
  ) INTO has_connection;
  
  RETURN has_connection;
END;
$$;

-- Create function to get user's Slack team info
CREATE OR REPLACE FUNCTION public.get_user_slack_team_info(p_user_id UUID)
RETURNS TABLE (
  slack_team_id TEXT,
  slack_user_id TEXT,
  team_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sot.slack_team_id,
    sot.slack_user_id,
    'Team' as team_name -- In a real implementation, you'd store team name
  FROM public.slack_oauth_tokens sot
  WHERE sot.user_id = p_user_id
  LIMIT 1;
END;
$$; 