import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface JiraAccessibleResource {
  id: string
  url: string
  name: string
  scopes: string[]
  avatarUrl: string
}

interface JiraIssue {
  id: string
  key: string
  fields: {
    summary: string
    description?: string
    status: {
      name: string
      statusCategory: {
        name: string
      }
    }
    priority?: {
      name: string
      id: string
    }
    issuetype: {
      name: string
    }
    assignee?: {
      accountId: string
      displayName: string
    }
    reporter?: {
      accountId: string
    }
    project: {
      key: string
      name: string
    }
    created: string
    updated: string
    duedate?: string
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { action, code, state } = await req.json()

    console.log('Jira OAuth action:', action)

    switch (action) {
      case 'oauth_redirect': {
        const jiraClientId = Deno.env.get('JIRA_CLIENT_ID')
        const jiraRedirectUri = Deno.env.get('JIRA_REDIRECT_URI')
        
        if (!jiraClientId || !jiraRedirectUri) {
          throw new Error('Missing Jira OAuth configuration')
        }

        const scope = 'read:jira-work read:jira-user offline_access'
        const authUrl = `https://auth.atlassian.com/authorize?` +
          `audience=api.atlassian.com&` +
          `client_id=${jiraClientId}&` +
          `scope=${encodeURIComponent(scope)}&` +
          `redirect_uri=${encodeURIComponent(jiraRedirectUri)}&` +
          `state=${state}&` +
          `response_type=code&` +
          `prompt=consent`

        return new Response(JSON.stringify({ authUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'oauth_callback': {
        const jiraClientId = Deno.env.get('JIRA_CLIENT_ID')
        const jiraClientSecret = Deno.env.get('JIRA_CLIENT_SECRET')
        const jiraRedirectUri = Deno.env.get('JIRA_REDIRECT_URI')

        if (!jiraClientId || !jiraClientSecret || !jiraRedirectUri) {
          throw new Error('Missing Jira OAuth configuration')
        }

        // Exchange code for access token
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
        })

        const tokenData = await tokenResponse.json()
        console.log('Token exchange response:', tokenData)

        if (!tokenResponse.ok) {
          throw new Error(`Token exchange failed: ${tokenData.error_description || tokenData.error}`)
        }

        // Get accessible resources
        const resourcesResponse = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Accept': 'application/json',
          },
        })

        const resources: JiraAccessibleResource[] = await resourcesResponse.json()
        console.log('Accessible resources:', resources)

        if (resources.length === 0) {
          throw new Error('No accessible Jira sites found')
        }

        const cloudId = resources[0].id
        const siteUrl = resources[0].url

        // Get user from token
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          throw new Error('Authentication required')
        }

        // Store OAuth token
        const { error: insertError } = await supabase
          .from('jira_oauth_tokens')
          .upsert({
            user_id: user.id,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            cloud_id: cloudId,
            site_url: siteUrl,
            expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
            scope: tokenData.scope,
          }, {
            onConflict: 'user_id'
          })

        if (insertError) {
          console.error('Error storing token:', insertError)
          throw insertError
        }

        return new Response(JSON.stringify({ 
          success: true, 
          cloudId, 
          siteUrl,
          siteName: resources[0].name 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'fetch_issues': {
        // Get user from token
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          throw new Error('Authentication required')
        }

        // Get stored OAuth token
        const { data: tokenData, error: tokenError } = await supabase
          .from('jira_oauth_tokens')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (tokenError || !tokenData) {
          throw new Error('No Jira connection found')
        }

        // Fetch issues assigned to user
        const jql = encodeURIComponent('assignee = currentUser() ORDER BY updated DESC')
        const issuesResponse = await fetch(
          `${tokenData.site_url}/rest/api/3/search?jql=${jql}&maxResults=50&fields=summary,description,status,priority,issuetype,assignee,reporter,project,created,updated,duedate`,
          {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
              'Accept': 'application/json',
            },
          }
        )

        if (!issuesResponse.ok) {
          throw new Error(`Failed to fetch issues: ${issuesResponse.statusText}`)
        }

        const issuesData = await issuesResponse.json()
        console.log('Fetched issues:', issuesData.total)

        // Store issues in database
        if (issuesData.issues && issuesData.issues.length > 0) {
          const issuesToInsert = issuesData.issues.map((issue: JiraIssue) => ({
            user_id: user.id,
            jira_issue_id: issue.id,
            issue_key: issue.key,
            summary: issue.fields.summary,
            description: issue.fields.description || null,
            status_name: issue.fields.status.name,
            status_category: issue.fields.status.statusCategory.name,
            priority_name: issue.fields.priority?.name || null,
            priority_id: issue.fields.priority?.id || null,
            issue_type: issue.fields.issuetype.name,
            assignee_account_id: issue.fields.assignee?.accountId || null,
            assignee_display_name: issue.fields.assignee?.displayName || null,
            reporter_account_id: issue.fields.reporter?.accountId || null,
            project_key: issue.fields.project.key,
            project_name: issue.fields.project.name,
            created_at_jira: issue.fields.created,
            updated_at_jira: issue.fields.updated,
            due_date: issue.fields.duedate || null,
            cloud_id: tokenData.cloud_id,
            issue_url: `${tokenData.site_url}/browse/${issue.key}`,
          }))

          // Clear existing issues and insert new ones
          await supabase
            .from('jira_issues')
            .delete()
            .eq('user_id', user.id)

          const { error: insertError } = await supabase
            .from('jira_issues')
            .insert(issuesToInsert)

          if (insertError) {
            console.error('Error storing issues:', insertError)
            throw insertError
          }
        }

        // Update sync status
        await supabase
          .from('jira_sync_status')
          .upsert({
            user_id: user.id,
            cloud_id: tokenData.cloud_id,
            last_sync_at: new Date().toISOString(),
            sync_status: 'success',
            issues_synced: issuesData.issues?.length || 0,
          }, {
            onConflict: 'user_id,cloud_id'
          })

        return new Response(JSON.stringify({ 
          success: true, 
          issuesCount: issuesData.issues?.length || 0 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      default:
        throw new Error(`Unknown action: ${action}`)
    }
  } catch (error) {
    console.error('Jira OAuth error:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})