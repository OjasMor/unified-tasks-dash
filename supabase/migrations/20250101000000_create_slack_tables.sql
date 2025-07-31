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