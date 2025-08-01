import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JiraAccessibleResource {
  id: string;
  name: string;
  url: string;
  scopes: string[];
  avatarUrl: string;
}

interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    status: {
      name: string;
    };
    priority?: {
      name: string;
    };
    assignee?: {
      displayName: string;
    };
    project: {
      name: string;
    };
    duedate?: string;
    updated: string;
  };
  self: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request data - handle both JSON body and query parameters
    let action, code, state;
    
    if (req.method === 'GET') {
      // Handle OAuth redirect from Jira (GET request with query params)
      const url = new URL(req.url);
      code = url.searchParams.get('code');
      state = url.searchParams.get('state');
      action = 'oauth_callback';
    } else {
      // Handle JSON requests from frontend
      const body = await req.json();
      action = body.action;
      code = body.code;
      state = body.state;
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const jiraClientId = Deno.env.get('JIRA_CLIENT_ID')!;
    const jiraClientSecret = Deno.env.get('JIRA_CLIENT_SECRET')!;
    // Use the React callback page URL instead of the edge function URL
    const jiraRedirectUri = `${supabaseUrl.replace('https://dggmyssboghmwytvuuqq.supabase.co', 'https://dggmyssboghmwytvuuqq.lovableproject.com')}/jira-oauth-callback`;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === 'oauth_redirect') {
      // Generate OAuth URL
      const authUrl = `https://auth.atlassian.com/authorize?` +
        `audience=api.atlassian.com&` +
        `client_id=${jiraClientId}&` +
        `scope=read%3Ajira-user%20read%3Ajira-work&` +
        `redirect_uri=${encodeURIComponent(jiraRedirectUri)}&` +
        `state=${state}&` +
        `response_type=code&` +
        `prompt=consent`;

      return new Response(JSON.stringify({ authUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'oauth_callback') {
      // Exchange code for access token (no auth required for this step)
      const tokenResponse = await fetch('https://auth.atlassian.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: jiraClientId,
          client_secret: jiraClientSecret,
          code: code,
          redirect_uri: jiraRedirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for access token');
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Get accessible resources (Jira sites)
      const resourcesResponse = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      if (!resourcesResponse.ok) {
        throw new Error('Failed to get accessible resources');
      }

      const resources: JiraAccessibleResource[] = await resourcesResponse.json();
      
      if (resources.length === 0) {
        throw new Error('No Jira sites accessible');
      }

      const jiraSite = resources[0]; // Use the first available site

      // Store tokens temporarily with a unique ID
      const tokenId = crypto.randomUUID();
      
      const { error: insertError } = await supabase
        .from('jira_oauth_tokens')
        .insert({
          id: tokenId,
          user_id: '00000000-0000-0000-0000-000000000000', // Temporary placeholder
          access_token: accessToken,
          refresh_token: tokenData.refresh_token,
          cloud_id: jiraSite.id,
          site_url: jiraSite.url,
          scope: tokenData.scope,
          expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
        });

      if (insertError) {
        console.error('Error storing Jira OAuth token:', insertError);
        throw new Error('Failed to store OAuth token');
      }

      return new Response(JSON.stringify({ 
        success: true, 
        tokenId: tokenId,
        siteName: jiraSite.name 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'associate_and_fetch') {
      // Get the authenticated user
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        throw new Error('No authorization header');
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );

      if (userError || !user) {
        throw new Error('Failed to get user');
      }

      const { tokenId } = req.method === 'GET' ? 
        Object.fromEntries(new URL(req.url).searchParams) : 
        await req.json();

      if (!tokenId) {
        throw new Error('Token ID is required');
      }

      // Update the temporary token record with the real user ID
      const { error: updateError } = await supabase
        .from('jira_oauth_tokens')
        .update({ user_id: user.id })
        .eq('id', tokenId)
        .eq('user_id', '00000000-0000-0000-0000-000000000000');

      if (updateError) {
        console.error('Error associating token with user:', updateError);
        throw new Error('Failed to associate token with user');
      }

      // Continue with fetch_issues logic...
      // Get the updated token data
      const { data: tokenData, error: tokenError } = await supabase
        .from('jira_oauth_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (tokenError || !tokenData) {
        throw new Error('No Jira OAuth token found after association');
      }

      // Get user profile from Jira to find accountId
      const profileResponse = await fetch(`${tokenData.site_url}/rest/api/3/myself`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json',
        },
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to get user profile from Jira');
      }

      const userProfile = await profileResponse.json();
      const accountId = userProfile.accountId;

      // Fetch issues assigned to the user
      const jql = `assignee = "${accountId}" AND status != "Done" ORDER BY updated DESC`;
      const issuesResponse = await fetch(
        `${tokenData.site_url}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=50&fields=summary,status,priority,assignee,project,duedate,updated`,
        {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Accept': 'application/json',
          },
        }
      );

      if (!issuesResponse.ok) {
        throw new Error('Failed to fetch issues from Jira');
      }

      const issuesData = await issuesResponse.json();
      const issues: JiraIssue[] = issuesData.issues;

      // Store issues in database
      const issueInserts = issues.map(issue => ({
        user_id: user.id,
        issue_key: issue.key,
        jira_issue_id: issue.id,
        summary: issue.fields.summary,
        status_name: issue.fields.status.name,
        priority_name: issue.fields.priority?.name || null,
        assignee_display_name: issue.fields.assignee?.displayName || null,
        project_name: issue.fields.project.name,
        due_date: issue.fields.duedate || null,
        issue_url: `${tokenData.site_url}/browse/${issue.key}`,
        updated_at_jira: new Date(issue.fields.updated).toISOString(),
        cloud_id: tokenData.cloud_id,
        project_key: issue.key.split('-')[0],
        issue_type: 'Task'
      }));

      // Clear existing issues for this user and insert new ones
      const { error: deleteError } = await supabase
        .from('jira_issues')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Error deleting old Jira issues:', deleteError);
      }

      if (issueInserts.length > 0) {
        const { error: insertError } = await supabase
          .from('jira_issues')
          .insert(issueInserts);

        if (insertError) {
          console.error('Error inserting Jira issues:', insertError);
          throw new Error('Failed to store Jira issues');
        }
      }

      // Update sync status
      const { error: syncError } = await supabase
        .from('jira_sync_status')
        .upsert({
          user_id: user.id,
          cloud_id: tokenData.cloud_id,
          last_sync_at: new Date().toISOString(),
          issues_synced: issues.length,
        }, {
          onConflict: 'user_id'
        });

      if (syncError) {
        console.error('Error updating sync status:', syncError);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        issuesCount: issues.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'fetch_issues') {
      // Get current user from the authorization header
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        throw new Error('No authorization header');
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );

      if (userError || !user) {
        throw new Error('Failed to get user');
      }

      // Get stored OAuth token
      const { data: tokenData, error: tokenError } = await supabase
        .from('jira_oauth_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (tokenError || !tokenData) {
        throw new Error('No Jira OAuth token found');
      }

      // Get user profile from Jira to find accountId
      const profileResponse = await fetch(`${tokenData.site_url}/rest/api/3/myself`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json',
        },
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to get user profile from Jira');
      }

      const userProfile = await profileResponse.json();
      const accountId = userProfile.accountId;

      // Fetch issues assigned to the user
      const jql = `assignee = "${accountId}" AND status != "Done" ORDER BY updated DESC`;
      const issuesResponse = await fetch(
        `${tokenData.site_url}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=50&fields=summary,status,priority,assignee,project,duedate,updated`,
        {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Accept': 'application/json',
          },
        }
      );

      if (!issuesResponse.ok) {
        throw new Error('Failed to fetch issues from Jira');
      }

      const issuesData = await issuesResponse.json();
      const issues: JiraIssue[] = issuesData.issues;

      // Store issues in database
      const issueInserts = issues.map(issue => ({
        user_id: user.id,
        issue_key: issue.key,
        issue_id_jira: issue.id,
        summary: issue.fields.summary,
        status_name: issue.fields.status.name,
        priority_name: issue.fields.priority?.name || null,
        assignee_display_name: issue.fields.assignee?.displayName || null,
        project_name: issue.fields.project.name,
        due_date: issue.fields.duedate || null,
        issue_url: `${tokenData.site_url}/browse/${issue.key}`,
        updated_at_jira: new Date(issue.fields.updated).toISOString(),
      }));

      // Clear existing issues for this user and insert new ones
      const { error: deleteError } = await supabase
        .from('jira_issues')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Error deleting old Jira issues:', deleteError);
      }

      if (issueInserts.length > 0) {
        const { error: insertError } = await supabase
          .from('jira_issues')
          .insert(issueInserts);

        if (insertError) {
          console.error('Error inserting Jira issues:', insertError);
          throw new Error('Failed to store Jira issues');
        }
      }

      // Update sync status
      const { error: syncError } = await supabase
        .from('jira_sync_status')
        .upsert({
          user_id: user.id,
          last_sync_at: new Date().toISOString(),
          issues_count: issues.length,
        }, {
          onConflict: 'user_id'
        });

      if (syncError) {
        console.error('Error updating sync status:', syncError);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        issuesCount: issues.length,
        siteName: tokenData.site_name 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in jira-oauth-callback function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});