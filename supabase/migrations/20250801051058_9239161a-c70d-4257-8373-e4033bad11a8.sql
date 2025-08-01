CREATE OR REPLACE FUNCTION public.has_jira_connection(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
$function$;