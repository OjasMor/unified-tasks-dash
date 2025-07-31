import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    const state = url.searchParams.get('state'); // This could contain user info

    if (error) {
      return new Response(`
        <html>
          <body>
            <script>
              window.opener?.postMessage({ type: 'slack-oauth-error', error: '${error}' }, '*');
              window.close();
            </script>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    if (!code) {
      throw new Error('No authorization code received');
    }

    const clientId = Deno.env.get('SLACK_CLIENT_ID');
    const clientSecret = Deno.env.get('SLACK_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!clientId || !clientSecret || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    // Exchange code for token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: `https://dggmyssboghmwytvuuqq.supabase.co/functions/v1/slack-oauth-callback`,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.ok) {
      throw new Error(`Slack OAuth error: ${tokenData.error}`);
    }

    // Get user info from Slack
    const userInfoResponse = await fetch('https://slack.com/api/auth.test', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    const userInfo = await userInfoResponse.json();
    
    if (!userInfo.ok) {
      throw new Error(`Failed to get user info: ${userInfo.error}`);
    }

    // Create Supabase client with service role key for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // For now, we'll store the token without a user_id and let the frontend handle the association
    // This is because we can't easily get the user context in the callback
    const { error: dbError } = await supabase
      .from('slack_oauth_tokens')
      .upsert({
        slack_team_id: tokenData.team.id,
        slack_user_id: userInfo.user_id,
        access_token: tokenData.access_token,
        scope: tokenData.scope,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'slack_team_id,slack_user_id'
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to store OAuth token');
    }

    // Return success page that communicates with parent window
    return new Response(`
      <html>
        <body>
          <script>
            window.opener?.postMessage({ 
              type: 'slack-oauth-success', 
              teamId: '${tokenData.team.id}',
              userId: '${userInfo.user_id}',
              teamName: '${tokenData.team.name}'
            }, '*');
            window.close();
          </script>
          <p>Slack connected successfully! You can close this window.</p>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' },
    });

  } catch (error) {
    console.error('Error in slack-oauth-callback:', error);
    return new Response(`
      <html>
        <body>
          <script>
            window.opener?.postMessage({ 
              type: 'slack-oauth-error', 
              error: '${error.message}' 
            }, '*');
            window.close();
          </script>
          <p>Error: ${error.message}</p>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' },
    });
  }
});