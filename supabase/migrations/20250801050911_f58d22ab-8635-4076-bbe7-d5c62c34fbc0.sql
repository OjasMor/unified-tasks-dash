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