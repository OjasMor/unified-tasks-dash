import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get('SLACK_CLIENT_ID');
    
    if (!clientId) {
      throw new Error('SLACK_CLIENT_ID is not configured');
    }

    // Get user ID from auth token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Build Slack OAuth URL
    const scopes = [
      'channels:read',
      'channels:history', 
      'im:read',
      'im:history',
      'mpim:read',
      'mpim:history',
      'users:read'
    ].join(' ');

    const redirectUri = `https://dggmyssboghmwytvuuqq.supabase.co/auth/v1/callback`;
    
    const slackAuthUrl = new URL('https://slack.com/oauth/v2/authorize');
    slackAuthUrl.searchParams.set('client_id', clientId);
    slackAuthUrl.searchParams.set('scope', scopes);
    slackAuthUrl.searchParams.set('redirect_uri', redirectUri);
    slackAuthUrl.searchParams.set('response_type', 'code');

    return new Response(JSON.stringify({ 
      authUrl: slackAuthUrl.toString() 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in slack-oauth-start:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});