-- Create table to store per-user Slack OAuth tokens
CREATE TABLE public.slack_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  slack_team_id TEXT NOT NULL,
  slack_user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  scope TEXT NOT NULL,
  installed_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create unique index to prevent duplicate tokens per user/team
CREATE UNIQUE INDEX uniq_slack_user_per_supabase_user
  ON public.slack_oauth_tokens(user_id, slack_team_id);

-- Enable RLS
ALTER TABLE public.slack_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own slack tokens" 
  ON public.slack_oauth_tokens 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own slack tokens" 
  ON public.slack_oauth_tokens 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own slack tokens" 
  ON public.slack_oauth_tokens 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create table to store Slack messages and channels
CREATE TABLE public.slack_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  slack_team_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  message_ts TEXT NOT NULL,
  user_slack_id TEXT NOT NULL,
  text TEXT,
  username TEXT,
  user_image TEXT,
  conversation_name TEXT,
  conversation_type TEXT, -- channel, im, mpim
  is_channel BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  slack_created_at TIMESTAMPTZ
);

-- Create indexes for efficient queries
CREATE INDEX idx_slack_messages_user_conversation 
  ON public.slack_messages(user_id, conversation_id, slack_created_at DESC);

CREATE INDEX idx_slack_messages_ts 
  ON public.slack_messages(message_ts);

-- Enable RLS
ALTER TABLE public.slack_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own slack messages" 
  ON public.slack_messages 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own slack messages" 
  ON public.slack_messages 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create table to track sync status per conversation
CREATE TABLE public.slack_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL,
  last_sync_ts TEXT,
  last_sync_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX uniq_slack_sync_per_user_conversation
  ON public.slack_sync_status(user_id, conversation_id);

-- Enable RLS
ALTER TABLE public.slack_sync_status ENABLE ROW LEVEL SECURITY;

-- Create policies for sync status
CREATE POLICY "Users can manage their own sync status" 
  ON public.slack_sync_status 
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to get user's Slack channels with latest message preview
CREATE OR REPLACE FUNCTION public.get_user_slack_channels(p_user_id UUID)
RETURNS TABLE (
  conversation_id TEXT,
  conversation_name TEXT,
  conversation_type TEXT,
  is_channel BOOLEAN,
  latest_message_ts TEXT,
  latest_message_text TEXT,
  latest_message_user TEXT,
  message_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    sm.conversation_id,
    sm.conversation_name,
    sm.conversation_type,
    sm.is_channel,
    latest.message_ts as latest_message_ts,
    latest.text as latest_message_text,
    latest.username as latest_message_user,
    COUNT(sm.id) as message_count
  FROM public.slack_messages sm
  LEFT JOIN LATERAL (
    SELECT message_ts, text, username
    FROM public.slack_messages sm2
    WHERE sm2.user_id = sm.user_id 
      AND sm2.conversation_id = sm.conversation_id
    ORDER BY sm2.slack_created_at DESC
    LIMIT 1
  ) latest ON true
  WHERE sm.user_id = p_user_id
  GROUP BY sm.conversation_id, sm.conversation_name, sm.conversation_type, 
           sm.is_channel, latest.message_ts, latest.text, latest.username
  ORDER BY latest_message_ts DESC NULLS LAST;
END;
$$;