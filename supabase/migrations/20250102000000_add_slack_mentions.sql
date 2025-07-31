-- Create table to store Slack mentions
CREATE TABLE public.slack_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  slack_team_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  message_ts TEXT NOT NULL,
  mentioned_user_id TEXT NOT NULL, -- The user who was mentioned
  mentioned_by_user_id TEXT NOT NULL, -- The user who mentioned them
  message_text TEXT,
  conversation_name TEXT,
  conversation_type TEXT,
  is_channel BOOLEAN DEFAULT false,
  permalink TEXT, -- Slack permalink to the message
  created_at TIMESTAMPTZ DEFAULT now(),
  slack_created_at TIMESTAMPTZ
);

-- Create indexes for efficient queries
CREATE INDEX idx_slack_mentions_user_id 
  ON public.slack_mentions(user_id, slack_created_at DESC);

CREATE INDEX idx_slack_mentions_mentioned_user 
  ON public.slack_mentions(mentioned_user_id);

CREATE INDEX idx_slack_mentions_conversation 
  ON public.slack_mentions(conversation_id);

-- Enable RLS
ALTER TABLE public.slack_mentions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own slack mentions" 
  ON public.slack_mentions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own slack mentions" 
  ON public.slack_mentions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Add permalink column to existing slack_messages table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'slack_messages' AND column_name = 'permalink'
  ) THEN
    ALTER TABLE public.slack_messages ADD COLUMN permalink TEXT;
  END IF;
END $$;

-- Create function to get user's recent mentions
CREATE OR REPLACE FUNCTION public.get_user_slack_mentions(p_user_id UUID, p_limit INTEGER DEFAULT 50)
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
    sm.mentioned_by_username,
    sm.permalink,
    sm.slack_created_at
  FROM public.slack_mentions sm
  WHERE sm.user_id = p_user_id
  ORDER BY sm.slack_created_at DESC
  LIMIT p_limit;
END;
$$;

-- Create function to get user's Slack user ID from OAuth tokens
CREATE OR REPLACE FUNCTION public.get_user_slack_info(p_user_id UUID)
RETURNS TABLE (
  slack_team_id TEXT,
  slack_user_id TEXT,
  access_token TEXT,
  scope TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sot.slack_team_id,
    sot.slack_user_id,
    sot.access_token,
    sot.scope
  FROM public.slack_oauth_tokens sot
  WHERE sot.user_id = p_user_id
  LIMIT 1;
END;
$$; 