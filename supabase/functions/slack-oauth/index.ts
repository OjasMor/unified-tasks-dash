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

interface SlackChannelHistoryResponse {
  ok: boolean;
  messages?: Array<{
    type: string;
    user: string;
    text: string;
    ts: string;
    permalink?: string;
  }>;
  error?: string;
}

interface SlackChannelsResponse {
  ok: boolean;
  channels?: Array<{
    id: string;
    name: string;
    is_channel: boolean;
    is_private: boolean;
    is_archived: boolean;
    num_members: number;
    topic?: {
      value: string;
    };
    purpose?: {
      value: string;
    };
    last_read?: string;
    latest?: {
      text: string;
      ts: string;
      user: string;
    };
  }>;
  error?: string;
}

serve(async (req) => {
  console.log('🚀 Slack OAuth Edge Function called');
  console.log('📝 Request method:', req.method);
  console.log('📝 Request URL:', req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request handled');
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔧 Creating Supabase client...');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    console.log('✅ Supabase client created');

    const { action, userId, code, state, channelId } = await req.json()
    console.log('📥 Request payload:', { action, userId, channelId, hasCode: !!code, hasState: !!state });

    if (action === 'initiate_oauth') {
      console.log('🔄 Initiating OAuth flow for user:', userId);
      
      // Generate OAuth URL for Slack
      const clientId = Deno.env.get('SLACK_CLIENT_ID');
      const redirectUri = Deno.env.get('SLACK_REDIRECT_URI') || `${Deno.env.get('SUPABASE_URL')}/functions/v1/slack-oauth`;
      const scopes = 'search:read,users:read,channels:read,groups:read,channels:history,groups:history';
      
      console.log('🔧 OAuth configuration:', { 
        clientId: clientId ? '***' : 'MISSING', 
        redirectUri, 
        scopes 
      });
      
      // Check if required environment variables are set
      if (!clientId) {
        console.error('❌ SLACK_CLIENT_ID environment variable is not set');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Slack OAuth is not properly configured. Please contact the administrator.' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        )
      }
      
      const oauthUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${userId}`;
      
      console.log('✅ OAuth URL generated:', oauthUrl);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'OAuth URL generated',
          oauth_url: oauthUrl
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'handle_callback') {
      console.log('🔄 Handling OAuth callback');
      
      // Handle OAuth callback from Slack
      if (!code || !state) {
        console.error('❌ Missing required parameters:', { hasCode: !!code, hasState: !!state });
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

      console.log('🔧 Exchanging code for access token...');
      const clientId = Deno.env.get('SLACK_CLIENT_ID');
      const clientSecret = Deno.env.get('SLACK_CLIENT_SECRET');
      const redirectUri = Deno.env.get('SLACK_REDIRECT_URI') || `${Deno.env.get('SUPABASE_URL')}/functions/v1/slack-oauth`;

      console.log('🔧 Token exchange configuration:', { 
        clientId: clientId ? '***' : 'MISSING', 
        clientSecret: clientSecret ? '***' : 'MISSING', 
        redirectUri 
      });

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
      console.log('📥 Slack OAuth response:', { 
        ok: tokenData.ok, 
        hasAccessToken: !!tokenData.access_token,
        teamId: tokenData.team_id,
        userId: tokenData.user_id,
        error: tokenData.error 
      });

      if (!tokenData.ok || !tokenData.access_token) {
        console.error('❌ Slack OAuth failed:', tokenData.error);
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

      console.log('💾 Storing tokens in database...');
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
        console.error('❌ Error storing tokens:', insertError);
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

      console.log('✅ Tokens stored successfully');
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

    if (action === 'fetch_channels') {
      console.log('🔄 Fetching channels for user:', userId);
      
      // Get user's Slack tokens
      const { data: slackInfo, error: slackError } = await supabaseClient
        .from('slack_oauth_tokens')
        .select('access_token, slack_user_id, slack_team_id')
        .eq('user_id', userId)
        .single()

      if (slackError || !slackInfo) {
        console.error('❌ No Slack connection found for user:', userId);
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

      console.log('✅ Found Slack connection for user:', { 
        slackUserId: slackInfo.slack_user_id, 
        teamId: slackInfo.slack_team_id 
      });

      // Fetch channels from Slack API
      const channelsUrl = `https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=1000`;
      console.log('🌐 Fetching channels from Slack API:', channelsUrl);
      
      const channelsResponse = await fetch(channelsUrl, {
        headers: {
          'Authorization': `Bearer ${slackInfo.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const channelsData: SlackChannelsResponse = await channelsResponse.json();
      console.log('📥 Slack channels response:', { 
        ok: channelsData.ok, 
        channelCount: channelsData.channels?.length || 0,
        error: channelsData.error 
      });

      if (!channelsData.ok) {
        console.error('❌ Slack API error:', channelsData.error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Slack API error: ${channelsData.error}` 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      const channels = channelsData.channels || [];
      console.log('📊 Processing', channels.length, 'channels');

      // Store channels in database
      const channelsToInsert = channels.map(channel => ({
        user_id: userId,
        slack_team_id: slackInfo.slack_team_id,
        conversation_id: channel.id,
        conversation_type: channel.is_private ? 'private_channel' : 'public_channel',
        conversation_name: channel.name,
        conversation_topic: channel.topic?.value,
        conversation_purpose: channel.purpose?.value,
        member_count: channel.num_members,
        is_archived: channel.is_archived,
        last_message_ts: channel.latest?.ts,
        last_message_text: channel.latest?.text,
        is_member: true
      }));

      if (channelsToInsert.length > 0) {
        console.log('💾 Storing', channelsToInsert.length, 'channels in database...');
        const { error: insertError } = await supabaseClient
          .from('slack_conversations')
          .upsert(channelsToInsert, { 
            onConflict: 'slack_team_id,conversation_id'
          })

        if (insertError) {
          console.error('❌ Error inserting channels:', insertError)
        } else {
          console.log('✅ Channels stored successfully');
        }
      }

      console.log('✅ Returning', channelsToInsert.length, 'channels');
      return new Response(
        JSON.stringify({ 
          success: true, 
          channels: channelsToInsert,
          count: channelsToInsert.length
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'fetch_messages') {
      console.log('🔄 Fetching messages for channel:', channelId, 'user:', userId);
      
      // Get user's Slack tokens
      const { data: slackInfo, error: slackError } = await supabaseClient
        .from('slack_oauth_tokens')
        .select('access_token, slack_user_id, slack_team_id')
        .eq('user_id', userId)
        .single()

      if (slackError || !slackInfo) {
        console.error('❌ No Slack connection found for user:', userId);
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

      console.log('✅ Found Slack connection for user:', { 
        slackUserId: slackInfo.slack_user_id, 
        teamId: slackInfo.slack_team_id 
      });

      // Fetch messages from Slack API for the specific channel
      const historyUrl = `https://slack.com/api/conversations.history?channel=${channelId}&limit=50`;
      console.log('🌐 Fetching messages from Slack API:', historyUrl);
      
      const historyResponse = await fetch(historyUrl, {
        headers: {
          'Authorization': `Bearer ${slackInfo.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const historyData: SlackChannelHistoryResponse = await historyResponse.json();
      console.log('📥 Slack history response:', { 
        ok: historyData.ok, 
        messageCount: historyData.messages?.length || 0,
        error: historyData.error 
      });

      if (!historyData.ok) {
        console.error('❌ Slack API error:', historyData.error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Slack API error: ${historyData.error}` 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      const messages = historyData.messages || [];
      console.log('📊 Processing', messages.length, 'messages');

      // Get user info for each message
      console.log('👥 Fetching user info for messages...');
      const messagesWithUserInfo = await Promise.all(
        messages.map(async (message, index) => {
          console.log(`👤 Fetching user info for message ${index + 1}/${messages.length}`);
          
          // Fetch user info to get username
          const userResponse = await fetch(`https://slack.com/api/users.info?user=${message.user}`, {
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
            id: `${channelId}-${message.ts}`,
            message_ts: message.ts,
            text: message.text,
            username: username,
            user_image: userData.user?.profile?.image_72,
            slack_created_at: new Date(parseFloat(message.ts) * 1000).toISOString(),
            user_slack_id: message.user
          };
        })
      );

      console.log('✅ Returning', messagesWithUserInfo.length, 'messages with user info');
      return new Response(
        JSON.stringify({ 
          success: true, 
          messages: messagesWithUserInfo,
          count: messagesWithUserInfo.length
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'fetch_mentions') {
      console.log('🔄 Fetching mentions for user:', userId);
      
      // Get user's Slack tokens
      const { data: slackInfo, error: slackError } = await supabaseClient
        .from('slack_oauth_tokens')
        .select('access_token, slack_user_id, slack_team_id')
        .eq('user_id', userId)
        .single()

      if (slackError || !slackInfo) {
        console.error('❌ No Slack connection found for user:', userId);
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

      console.log('✅ Found Slack connection for user:', { 
        slackUserId: slackInfo.slack_user_id, 
        teamId: slackInfo.slack_team_id 
      });

      // Fetch mentions from Slack API
      const searchQuery = `@${slackInfo.slack_user_id}` // Search for mentions of the user
      const searchUrl = `https://slack.com/api/search.messages?query=${encodeURIComponent(searchQuery)}&count=50&sort=timestamp&sort_dir=desc`
      console.log('🌐 Searching for mentions:', searchQuery);
      console.log('🌐 Search URL:', searchUrl);
      
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'Authorization': `Bearer ${slackInfo.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const searchData: SlackSearchResponse = await searchResponse.json()
      console.log('📥 Slack search response:', { 
        ok: searchData.ok, 
        mentionCount: searchData.messages?.matches?.length || 0,
        error: searchData.error 
      });

      if (!searchData.ok) {
        console.error('❌ Slack API error:', searchData.error);
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
      console.log('📊 Processing', mentions.length, 'mentions');

      // Get user info for mentioned_by_username
      console.log('👥 Fetching user info for mentions...');
      const mentionsWithUserInfo = await Promise.all(
        mentions.map(async (match, index) => {
          console.log(`👤 Fetching user info for mention ${index + 1}/${mentions.length}`);
          
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
        console.log('💾 Storing', mentionsWithUserInfo.length, 'mentions in database...');
        const { error: insertError } = await supabaseClient
          .from('slack_mentions')
          .upsert(mentionsWithUserInfo, { 
            onConflict: 'user_id,slack_team_id,conversation_id,message_ts,mentioned_user_id'
          })

        if (insertError) {
          console.error('❌ Error inserting mentions:', insertError)
        } else {
          console.log('✅ Mentions stored successfully');
        }
      }

      console.log('✅ Returning', mentionsWithUserInfo.length, 'mentions');
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

    console.error('❌ Invalid action:', action);
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
    console.error('💥 Unexpected error:', error)
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