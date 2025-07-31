-- Create Slack OAuth tokens table
create table public.slack_oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  slack_team_id text not null,
  slack_user_id text not null,
  access_token text not null,
  scope text not null,
  installed_at timestamptz default now()
);

-- Create unique index to ensure one Slack user per Supabase user
create unique index uniq_slack_user_per_supabase_user
  on public.slack_oauth_tokens(user_id, slack_team_id);

-- Create Slack messages table
create table public.slack_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  slack_team_id text not null,
  conversation_id text not null,
  message_id text not null,
  slack_user_id text not null,
  message_text text,
  message_ts numeric not null,
  message_type text,
  thread_ts numeric,
  parent_user_id text,
  permalink text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes for efficient querying
create index idx_slack_messages_user_id on public.slack_messages(user_id);
create index idx_slack_messages_conversation_id on public.slack_messages(conversation_id);
create index idx_slack_messages_ts on public.slack_messages(message_ts);
create unique index uniq_slack_message on public.slack_messages(slack_team_id, conversation_id, message_id);

-- Create Slack conversations table for caching channel/DM info
create table public.slack_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  slack_team_id text not null,
  conversation_id text not null,
  conversation_type text not null, -- 'public_channel', 'private_channel', 'im', 'mpim'
  conversation_name text,
  conversation_topic text,
  conversation_purpose text,
  last_message_ts numeric,
  last_message_text text,
  member_count integer,
  is_archived boolean default false,
  is_member boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes for conversations
create index idx_slack_conversations_user_id on public.slack_conversations(user_id);
create index idx_slack_conversations_team_id on public.slack_conversations(slack_team_id);
create unique index uniq_slack_conversation on public.slack_conversations(slack_team_id, conversation_id);

-- Create table to store Slack mentions
CREATE TABLE public.slack_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  slack_team_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  message_ts TEXT NOT NULL,
  mentioned_user_id TEXT NOT NULL, -- The user who was mentioned
  mentioned_by_user_id TEXT NOT NULL, -- The user who mentioned them
  mentioned_by_username TEXT,
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

-- Create RLS policies
alter table public.slack_oauth_tokens enable row level security;
alter table public.slack_messages enable row level security;
alter table public.slack_conversations enable row level security;
alter table public.slack_mentions enable row level security;

-- RLS policies for slack_oauth_tokens
create policy "Users can view their own Slack tokens"
  on public.slack_oauth_tokens for select
  using (auth.uid() = user_id);

create policy "Users can insert their own Slack tokens"
  on public.slack_oauth_tokens for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own Slack tokens"
  on public.slack_oauth_tokens for update
  using (auth.uid() = user_id);

create policy "Users can delete their own Slack tokens"
  on public.slack_oauth_tokens for delete
  using (auth.uid() = user_id);

-- RLS policies for slack_messages
create policy "Users can view their own Slack messages"
  on public.slack_messages for select
  using (auth.uid() = user_id);

create policy "Users can insert their own Slack messages"
  on public.slack_messages for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own Slack messages"
  on public.slack_messages for update
  using (auth.uid() = user_id);

create policy "Users can delete their own Slack messages"
  on public.slack_messages for delete
  using (auth.uid() = user_id);

-- RLS policies for slack_conversations
create policy "Users can view their own Slack conversations"
  on public.slack_conversations for select
  using (auth.uid() = user_id);

create policy "Users can insert their own Slack conversations"
  on public.slack_conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own Slack conversations"
  on public.slack_conversations for update
  using (auth.uid() = user_id);

create policy "Users can delete their own Slack conversations"
  on public.slack_conversations for delete
  using (auth.uid() = user_id);

-- RLS policies for slack_mentions
CREATE POLICY "Users can view their own slack mentions" 
  ON public.slack_mentions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own slack mentions" 
  ON public.slack_mentions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Drop existing function if it exists to avoid conflicts
DROP FUNCTION IF EXISTS public.get_user_slack_channels(uuid);

-- Create function to get user's Slack channels with latest message preview
create or replace function public.get_user_slack_channels(user_uuid uuid)
returns table (
  conversation_id text,
  conversation_name text,
  conversation_type text,
  last_message_text text,
  last_message_ts numeric,
  member_count integer,
  is_archived boolean
) language sql security definer as $$
  select 
    c.conversation_id,
    c.conversation_name,
    c.conversation_type,
    c.last_message_text,
    c.last_message_ts,
    c.member_count,
    c.is_archived
  from public.slack_conversations c
  where c.user_id = user_uuid
    and c.is_member = true
    and c.is_archived = false
  order by c.last_message_ts desc nulls last;
$$;

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