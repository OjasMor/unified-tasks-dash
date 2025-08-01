import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate the request method
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get JWT token from request headers
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify JWT and get user
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse the incoming request body
    const { jiraEmail, jiraToken, jiraBaseUrl, action, issueData } = await req.json();
    
    // Validate required parameters
    if (!jiraEmail || !jiraToken || !jiraBaseUrl) {
      return new Response(JSON.stringify({
        error: 'Missing Jira credentials'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Base64 encode credentials for Basic Auth
    const credentials = btoa(`${jiraEmail}:${jiraToken}`);

    // Handle different Jira actions
    switch(action) {
      case 'createIssue':
        const createResponse = await fetch(`${jiraBaseUrl}/rest/api/3/issue`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              project: {
                key: issueData.projectKey
              },
              summary: issueData.summary,
              description: issueData.description,
              issuetype: {
                name: issueData.issueType || 'Task'
              }
            }
          })
        });
        
        const createResult = await createResponse.json();
        return new Response(JSON.stringify(createResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'getIssue':
        const getResponse = await fetch(`${jiraBaseUrl}/rest/api/3/issue/${issueData.issueKey}`, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json'
          }
        });
        
        const getResult = await getResponse.json();
        return new Response(JSON.stringify(getResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'getMyIssues':
        // Get current user's account ID first
        const myselfResponse = await fetch(`${jiraBaseUrl}/rest/api/3/myself`, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!myselfResponse.ok) {
          throw new Error('Failed to get user info from Jira');
        }
        
        const userInfo = await myselfResponse.json();
        const accountId = userInfo.accountId;

        // Search for issues assigned to the current user
        const searchResponse = await fetch(`${jiraBaseUrl}/rest/api/3/search`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jql: `assignee = "${accountId}" AND status != Done ORDER BY priority DESC, updated DESC`,
            fields: ['summary', 'status', 'priority', 'assignee', 'project', 'duedate', 'updated'],
            maxResults: 50
          })
        });
        
        const searchResult = await searchResponse.json();
        
        // Transform the issues to match our expected format
        const transformedIssues = searchResult.issues?.map((issue: any) => ({
          id: issue.id,
          issue_key: issue.key,
          summary: issue.fields.summary,
          status_name: issue.fields.status?.name,
          priority_name: issue.fields.priority?.name,
          assignee_display_name: issue.fields.assignee?.displayName,
          project_name: issue.fields.project?.name,
          due_date: issue.fields.duedate,
          issue_url: `${jiraBaseUrl}/browse/${issue.key}`,
          updated_at_jira: issue.fields.updated
        })) || [];

        return new Response(JSON.stringify({
          issues: transformedIssues,
          total: searchResult.total || 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      default:
        return new Response(JSON.stringify({
          error: 'Unsupported action'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Jira integration error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});