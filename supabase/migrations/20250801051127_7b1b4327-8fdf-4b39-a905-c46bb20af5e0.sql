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
SET search_path = public
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
$function$;