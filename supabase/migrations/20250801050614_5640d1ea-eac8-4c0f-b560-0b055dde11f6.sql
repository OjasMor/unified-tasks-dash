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

-- Create RLS policies for jira_oauth_tokens
CREATE POLICY "Users can view their own Jira tokens" 
ON public.jira_oauth_tokens 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Jira tokens" 
ON public.jira_oauth_tokens 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Jira tokens" 
ON public.jira_oauth_tokens 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Jira tokens" 
ON public.jira_oauth_tokens 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for jira_projects
CREATE POLICY "Users can view their own Jira projects" 
ON public.jira_projects 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Jira projects" 
ON public.jira_projects 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Jira projects" 
ON public.jira_projects 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Jira projects" 
ON public.jira_projects 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for jira_issues
CREATE POLICY "Users can view their own Jira issues" 
ON public.jira_issues 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Jira issues" 
ON public.jira_issues 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Jira issues" 
ON public.jira_issues 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Jira issues" 
ON public.jira_issues 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for jira_sync_status
CREATE POLICY "Users can view their own Jira sync status" 
ON public.jira_sync_status 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Jira sync status" 
ON public.jira_sync_status 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Jira sync status" 
ON public.jira_sync_status 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create database functions
CREATE OR REPLACE FUNCTION public.has_jira_connection(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  has_connection BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.jira_oauth_tokens 
    WHERE user_id = p_user_id
  ) INTO has_connection;
  
  RETURN has_connection;
END;
$function$

CREATE OR REPLACE FUNCTION public.get_user_jira_info(p_user_id uuid)
RETURNS TABLE(cloud_id text, site_url text, access_token text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    jot.cloud_id,
    jot.site_url,
    jot.access_token
  FROM public.jira_oauth_tokens jot
  WHERE jot.user_id = p_user_id
  LIMIT 1;
END;
$function$

CREATE OR REPLACE FUNCTION public.get_user_jira_issues(p_user_id uuid, p_limit integer DEFAULT 15)
RETURNS TABLE(
  id uuid, 
  issue_key text, 
  summary text, 
  status_name text, 
  priority_name text, 
  assignee_display_name text,
  project_name text,
  due_date date,
  issue_url text,
  updated_at_jira timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ji.id,
    ji.issue_key,
    ji.summary,
    ji.status_name,
    ji.priority_name,
    ji.assignee_display_name,
    ji.project_name,
    ji.due_date,
    ji.issue_url,
    ji.updated_at_jira
  FROM public.jira_issues ji
  WHERE ji.user_id = p_user_id
  ORDER BY 
    CASE 
      WHEN ji.priority_name = 'Highest' THEN 1
      WHEN ji.priority_name = 'High' THEN 2
      WHEN ji.priority_name = 'Medium' THEN 3
      WHEN ji.priority_name = 'Low' THEN 4
      WHEN ji.priority_name = 'Lowest' THEN 5
      ELSE 6
    END,
    ji.updated_at_jira DESC
  LIMIT p_limit;
END;
$function$

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_jira_oauth_tokens_updated_at
    BEFORE UPDATE ON public.jira_oauth_tokens
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jira_projects_updated_at
    BEFORE UPDATE ON public.jira_projects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jira_issues_updated_at
    BEFORE UPDATE ON public.jira_issues
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jira_sync_status_updated_at
    BEFORE UPDATE ON public.jira_sync_status
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();