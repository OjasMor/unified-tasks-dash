import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SlackSearchResponse {
  ok: boolean;
  messages?: {
    matches?: Array<{
      type: string;
      channel: {
        id: string;
        name: string;
        is_channel: boolean;
        is_private: boolean;
      };
      user: string;
      username: string;
      ts: string;
      text: string;
      permalink: string;
    }>;
  };
  error?: string;
}

interface SlackUserInfo {
  ok: boolean;
  user?: {
    id: string;
    name: string;
    real_name: string;
    profile: {
      display_name: string;
      real_name: string;
      image_72: string;
    };
  };
  error?: string;
}

interface SlackOAuthResponse {
  ok: boolean;
  access_token?: string;
  scope?: string;
  user_id?: string;
  team_id?: string;
  team_name?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, userId, code, state } = await req.json()

    if (action === 'initiate_oauth') {
      // Generate OAuth URL for Slack
      const clientId = Deno.env.get('SLACK_CLIENT_ID');
      const redirectUri = Deno.env.get('SLACK_REDIRECT_URI') || `${Deno.env.get('SUPABASE_URL')}/functions/v1/slack-oauth`;
      const scopes = 'search:read,users:read,channels:read,groups:read,im:read,mpim:read';
      
      const oauthUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${userId}`;
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'OAuth URL generated',
          oauthUrl: oauthUrl
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'handle_callback') {
      // Handle OAuth callback from Slack
      if (!code || !state) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Missing code or state parameter' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      const clientId = Deno.env.get('SLACK_CLIENT_ID');
      const clientSecret = Deno.env.get('SLACK_CLIENT_SECRET');
      const redirectUri = Deno.env.get('SLACK_REDIRECT_URI') || `${Deno.env.get('SUPABASE_URL')}/functions/v1/slack-oauth`;

      // Exchange code for access token
      const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId!,
          client_secret: clientSecret!,
          code: code,
          redirect_uri: redirectUri
        })
      });

      const tokenData: SlackOAuthResponse = await tokenResponse.json();

      if (!tokenData.ok || !tokenData.access_token) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Slack OAuth error: ${tokenData.error}` 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      // Store the tokens in database
      const { error: insertError } = await supabaseClient
        .from('slack_oauth_tokens')
        .upsert({
          user_id: state, // state contains the user ID
          slack_team_id: tokenData.team_id!,
          slack_user_id: tokenData.user_id!,
          access_token: tokenData.access_token,
          scope: tokenData.scope || '',
          installed_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,slack_team_id'
        });

      if (insertError) {
        console.error('Error storing tokens:', insertError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to store Slack tokens' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Slack connected successfully',
          team_id: tokenData.team_id,
          team_name: tokenData.team_name
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'fetch_mentions') {
      // Get user's Slack tokens
      const { data: slackInfo, error: slackError } = await supabaseClient
        .from('slack_oauth_tokens')
        .select('access_token, slack_user_id, slack_team_id')
        .eq('user_id', userId)
        .single()

      if (slackError || !slackInfo) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No Slack connection found. Please connect your Slack account first.' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      // Fetch mentions from Slack API
      const searchQuery = `@${slackInfo.slack_user_id}` // Search for mentions of the user
      const searchUrl = `https://slack.com/api/search.messages?query=${encodeURIComponent(searchQuery)}&count=50&sort=timestamp&sort_dir=desc`
      
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'Authorization': `Bearer ${slackInfo.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const searchData: SlackSearchResponse = await searchResponse.json()

      if (!searchData.ok) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Slack API error: ${searchData.error}` 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      const mentions = searchData.messages?.matches || []

      // Get user info for mentioned_by_username
      const mentionsWithUserInfo = await Promise.all(
        mentions.map(async (match) => {
          // Fetch user info to get username
          const userResponse = await fetch(`https://slack.com/api/users.info?user=${match.user}`, {
            headers: {
              'Authorization': `Bearer ${slackInfo.access_token}`,
              'Content-Type': 'application/json'
            }
          });

          const userData: SlackUserInfo = await userResponse.json();
          const username = userData.user?.profile?.display_name || 
                         userData.user?.profile?.real_name || 
                         userData.user?.name || 
                         'Unknown User';

          return {
            user_id: userId,
            slack_team_id: slackInfo.slack_team_id,
            conversation_id: match.channel.id,
            message_ts: match.ts,
            mentioned_user_id: slackInfo.slack_user_id,
            mentioned_by_user_id: match.user,
            mentioned_by_username: username,
            message_text: match.text,
            conversation_name: match.channel.name,
            conversation_type: match.channel.is_private ? 'private_channel' : 'public_channel',
            is_channel: match.channel.is_channel,
            permalink: match.permalink,
            slack_created_at: new Date(parseFloat(match.ts) * 1000).toISOString()
          };
        })
      );

      // Store mentions in database
      if (mentionsWithUserInfo.length > 0) {
        const { error: insertError } = await supabaseClient
          .from('slack_mentions')
          .upsert(mentionsWithUserInfo, { 
            onConflict: 'user_id,slack_team_id,conversation_id,message_ts,mentioned_user_id'
          })

        if (insertError) {
          console.error('Error inserting mentions:', insertError)
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          mentions: mentionsWithUserInfo,
          count: mentionsWithUserInfo.length
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Invalid action' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
}) 