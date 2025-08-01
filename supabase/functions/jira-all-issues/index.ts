import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const jiraDomain = Deno.env.get('JIRA_DOMAIN');
    const jiraEmail = Deno.env.get('JIRA_EMAIL');
    const jiraApiToken = Deno.env.get('JIRA_API_TOKEN');
    const jiraProject = Deno.env.get('JIRA_PROJECT_KEY'); // Add project key for filtering

    if (!jiraDomain || !jiraEmail || !jiraApiToken) {
      console.error('Missing Jira configuration:', { jiraDomain, jiraEmail, hasToken: !!jiraApiToken });
      return new Response(
        JSON.stringify({ error: 'Jira configuration not found' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const auth = btoa(`${jiraEmail}:${jiraApiToken}`);
    
    // If project key is specified, filter by project, otherwise get all accessible issues
    let jql = 'resolution = Unresolved ORDER BY priority DESC, updated DESC';
    if (jiraProject) {
      jql = `project = "${jiraProject}" AND resolution = Unresolved ORDER BY priority DESC, updated DESC`;
    }
    
    const url = `https://${jiraDomain}/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=summary,status,priority,assignee,project,duedate,created,updated,reporter&maxResults=50`;

    console.log('Fetching all Jira issues from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Jira API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Jira API error: ${response.status}` }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    console.log('Fetched all issues count:', data.issues?.length || 0);

    const formattedIssues = data.issues?.map((issue: any) => ({
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status?.name || 'Unknown',
      priority: issue.fields.priority?.name || 'None',
      project: issue.fields.project?.name || 'Unknown',
      projectKey: issue.fields.project?.key || 'Unknown',
      assignee: issue.fields.assignee?.displayName || 'Unassigned',
      reporter: issue.fields.reporter?.displayName || 'Unknown',
      dueDate: issue.fields.duedate,
      created: issue.fields.created,
      updated: issue.fields.updated,
      url: `https://${jiraDomain}/browse/${issue.key}`
    })) || [];

    return new Response(
      JSON.stringify({ issues: formattedIssues }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error fetching all Jira issues:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch all Jira issues' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});