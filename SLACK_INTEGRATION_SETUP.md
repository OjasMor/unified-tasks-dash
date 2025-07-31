# Slack Integration Setup Guide

This guide explains how to set up and use the Slack integration for reading user mentions.

## Features

- **Slack OAuth Flow**: Secure authentication with Slack using OAuth 2.0
- **User Mentions**: Fetch and display recent mentions of the logged-in user
- **Real-time Updates**: Refresh mentions to get the latest data
- **Direct Links**: Click to open messages directly in Slack
- **User-friendly UI**: Clean interface with tabs for channels and mentions

## Prerequisites

1. **Supabase Project**: You need a Supabase project with the following:
   - Database tables for Slack OAuth tokens and mentions
   - Edge Functions for handling OAuth flow
   - Proper RLS policies

2. **Slack App**: You need to create a Slack app with the following:
   - OAuth scopes: `search:read`, `users:read`, `channels:read`, `groups:read`, `im:read`, `mpim:read`
   - Redirect URL: `https://your-domain.com/auth/callback`

## Database Setup

Run the following SQL migrations in your Supabase database:

### 1. Create Slack Tables (20250101000000_create_slack_tables.sql)

```sql
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

-- Create RLS policies
alter table public.slack_oauth_tokens enable row level security;
alter table public.slack_messages enable row level security;
alter table public.slack_conversations enable row level security;

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
```

### 2. Add Slack Mentions (20250102000000_add_slack_mentions.sql)

```sql
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
```

### 3. Add Enhancements (20250103000000_add_slack_mentions_enhancements.sql)

```sql
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
```

## Environment Variables

Set the following environment variables in your Supabase project:

```bash
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_REDIRECT_URI=https://your-domain.com/auth/callback
```

## Slack App Configuration

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Create a new app or use an existing one
3. Go to "OAuth & Permissions"
4. Add the following scopes:
   - `search:read` - To search for mentions
   - `users:read` - To get user information
   - `channels:read` - To read channel information
   - `groups:read` - To read private channels
   - `im:read` - To read direct messages
   - `mpim:read` - To read group direct messages
5. Set the redirect URL to: `https://your-domain.com/auth/callback`
6. Copy the Client ID and Client Secret

## Edge Function Deployment

Deploy the Slack OAuth Edge Function to your Supabase project:

```bash
supabase functions deploy slack-oauth
```

## Usage

1. **Connect Slack**: Click "Connect with Slack" button
2. **Authorize**: Grant permissions in the Slack OAuth flow
3. **View Mentions**: Switch to the "Mentions" tab to see recent mentions
4. **Refresh**: Click the refresh button to get the latest mentions
5. **Open in Slack**: Click "Open in Slack" to view the message directly

## Features

- **Secure OAuth Flow**: Uses Slack's OAuth 2.0 for secure authentication
- **Real-time Mentions**: Fetches recent mentions from Slack API
- **User-friendly UI**: Clean interface with tabs and cards
- **Direct Links**: One-click access to messages in Slack
- **Error Handling**: Comprehensive error handling and user feedback
- **Responsive Design**: Works on desktop and mobile devices

## Troubleshooting

### Common Issues

1. **OAuth Error**: Check that your Slack app has the correct scopes and redirect URL
2. **No Mentions Found**: Ensure the user has been mentioned recently in accessible channels
3. **Connection Failed**: Verify that the Edge Function is deployed and environment variables are set
4. **Permission Denied**: Check that the Slack app has the required scopes

### Debug Steps

1. Check browser console for JavaScript errors
2. Verify Edge Function logs in Supabase dashboard
3. Test Slack API calls directly using the access token
4. Ensure database tables and policies are correctly set up

## Security Considerations

- All database operations use Row Level Security (RLS)
- OAuth tokens are stored securely in the database
- API calls are authenticated using Supabase JWT tokens
- User data is isolated per user ID
- Access tokens are encrypted and protected

## API Endpoints

The integration uses the following API endpoints:

- `POST /functions/v1/slack-oauth` - Handle OAuth flow and mentions fetching
- `GET /auth/callback` - Handle OAuth callback redirect

## Components

- `SlackConnectButton` - Initiates OAuth flow
- `SlackMentions` - Displays user mentions
- `SlackPane` - Main container with tabs
- `AuthCallback` - Handles OAuth redirect

## Future Enhancements

- Real-time updates using WebSocket connections
- Mention notifications and alerts
- Advanced filtering and search
- Integration with other productivity tools
- Analytics and usage statistics 