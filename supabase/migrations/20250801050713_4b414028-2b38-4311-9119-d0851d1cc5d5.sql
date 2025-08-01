-- Create Jira OAuth tokens table
CREATE TABLE public.jira_oauth_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  cloud_id TEXT NOT NULL,
  site_url TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Jira projects table
CREATE TABLE public.jira_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  jira_project_id TEXT NOT NULL,
  project_key TEXT NOT NULL,
  project_name TEXT NOT NULL,
  project_type TEXT,
  lead_account_id TEXT,
  cloud_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Jira issues table
CREATE TABLE public.jira_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  jira_issue_id TEXT NOT NULL,
  issue_key TEXT NOT NULL,
  summary TEXT NOT NULL,
  description TEXT,
  status_name TEXT NOT NULL,
  status_category TEXT,
  priority_name TEXT,
  priority_id TEXT,
  issue_type TEXT NOT NULL,
  assignee_account_id TEXT,
  assignee_display_name TEXT,
  reporter_account_id TEXT,
  project_key TEXT NOT NULL,
  project_name TEXT NOT NULL,
  created_at_jira TIMESTAMP WITH TIME ZONE,
  updated_at_jira TIMESTAMP WITH TIME ZONE,
  due_date DATE,
  cloud_id TEXT NOT NULL,
  issue_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Jira sync status table
CREATE TABLE public.jira_sync_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cloud_id TEXT NOT NULL,
  last_sync_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sync_status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  issues_synced INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.jira_oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_sync_status ENABLE ROW LEVEL SECURITY;