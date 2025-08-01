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

serve(async (req) => {
  console.log('🚀 Slack Bot Token Edge Function called');
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

    const { action, userId, channelId } = await req.json()
    console.log('📥 Request payload:', { action, userId, channelId });

    // Get the bot token from environment variables
    const botToken = Deno.env.get('SLACK_BOT_TOKEN');

    if (!botToken) {
      console.error('❌ SLACK_BOT_TOKEN environment variable is not set');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Slack bot token is not configured. Please contact the administrator.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }

    if (action === 'fetch_channels') {
      console.log('🔄 Fetching channels using bot token');

      // Fetch channels from Slack API using bot token
      const channelsUrl = `https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=1000`;
      console.log('🌐 Fetching channels from Slack API:', channelsUrl);

      const channelsResponse = await fetch(channelsUrl, {
        headers: {
          'Authorization': `Bearer ${botToken}`,
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
        slack_team_id: 'workspace', // Using a generic team ID since we're using bot token
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
      console.log('🔄 Fetching messages for channel:', channelId);

      // Fetch messages from Slack API for the specific channel using bot token
      const historyUrl = `https://slack.com/api/conversations.history?channel=${channelId}&limit=50`;
      console.log('🌐 Fetching messages from Slack API:', historyUrl);

      const historyResponse = await fetch(historyUrl, {
        headers: {
          'Authorization': `Bearer ${botToken}`,
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

      // Get user info for each message and replace mentions
      console.log('👥 Fetching user info for messages and replacing mentions...');

      // First, collect all unique user IDs from message authors and mentions
      const allUserIds = new Set<string>();

      // Add message authors
      messages.forEach(message => {
        if (message.user) {
          allUserIds.add(message.user);
        }
      });

      // Extract user mentions from message text (format: <@U1234567890>)
      const mentionRegex = /<@([A-Z0-9]+)>/g;
      messages.forEach(message => {
        let match;
        while ((match = mentionRegex.exec(message.text)) !== null) {
          allUserIds.add(match[1]);
        }
      });

      console.log('👥 Found', allUserIds.size, 'unique user IDs to fetch');

      // Fetch user info for all unique users
      const userInfoMap = new Map<string, { name: string; real_name: string; image_72?: string }>();

      for (const userId of allUserIds) {
        console.log(`👤 Fetching user info for ${userId}...`);

        const userResponse = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
          headers: {
            'Authorization': `Bearer ${botToken}`,
            'Content-Type': 'application/json'
          }
        });

        const userData: SlackUserInfo = await userResponse.json();

        if (userData.ok && userData.user) {
          const displayName = userData.user.profile?.display_name || '';
          const realName = userData.user.profile?.real_name || userData.user.real_name || userData.user.name || '';

          userInfoMap.set(userId, {
            name: displayName || realName,
            real_name: realName,
            image_72: userData.user.profile?.image_72
          });
        } else {
          console.warn(`⚠️ Could not fetch user info for ${userId}:`, userData.error);
          userInfoMap.set(userId, { name: 'Unknown User', real_name: 'Unknown User' });
        }
      }

      // Process messages and replace mentions
      const messagesWithUserInfo = messages.map((message, index) => {
        console.log(`📝 Processing message ${index + 1}/${messages.length}`);

        // Get message author info
        const authorInfo = userInfoMap.get(message.user) || { name: 'Unknown User', real_name: 'Unknown User' };
        const username = authorInfo.name || authorInfo.real_name || 'Unknown User';

        // Replace user mentions in message text
        let processedText = message.text;
        processedText = processedText.replace(/<@([A-Z0-9]+)>/g, (match, userId) => {
          const userInfo = userInfoMap.get(userId);
          if (userInfo) {
            const displayName = userInfo.name || userInfo.real_name;
            return `@${displayName}`;
          }
          return match; // Keep original if user info not found
        });

        return {
          id: `${channelId}-${message.ts}`,
          message_ts: message.ts,
          text: processedText,
          username: username,
          user_image: userInfoMap.get(message.user)?.image_72,
          slack_created_at: new Date(parseFloat(message.ts) * 1000).toISOString(),
          user_slack_id: message.user
        };
      });

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
      console.log('🔄 Fetching mentions using bot token');
      
      // Search for actual mentions using @ symbol and common mention patterns
      // This will find messages that contain @mentions, @here, @channel, etc.
      const searchQuery = '@here OR @channel OR @everyone OR @' // Search for various types of mentions

      const searchUrl = `https://slack.com/api/search.messages?query=${encodeURIComponent(searchQuery)}&count=50&sort=timestamp&sort_dir=desc`
      console.log('🌐 Searching for mentions:', searchQuery);
      console.log('🌐 Search URL:', searchUrl);

      const searchResponse = await fetch(searchUrl, {
        headers: {
          'Authorization': `Bearer ${botToken}`,
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
              'Authorization': `Bearer ${botToken}`,
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
            slack_team_id: 'workspace', // Using generic team ID
            conversation_id: match.channel.id,
            message_ts: match.ts,
            mentioned_user_id: 'bot', // Since we're using bot token
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