import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SlackConversation {
  id: string;
  name?: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_mpim: boolean;
  user?: string;
}

interface SlackMessage {
  ts: string;
  user: string;
  text?: string;
  username?: string;
  subtype?: string;
}

interface SlackUser {
  id: string;
  name: string;
  real_name?: string;
  profile?: {
    image_72?: string;
    display_name?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all stored Slack tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('slack_oauth_tokens')
      .select('*')
      .not('user_id', 'is', null); // Only process tokens with valid user_id

    if (tokenError) {
      throw new Error(`Failed to fetch tokens: ${tokenError.message}`);
    }

    console.log(`Processing ${tokens?.length || 0} Slack integrations`);

    for (const token of tokens || []) {
      try {
        await syncUserSlackData(supabase, token);
        // Rate limiting - respect Slack's 1 call per minute limit for new apps
        await new Promise(resolve => setTimeout(resolve, 60000));
      } catch (error) {
        console.error(`Error syncing for user ${token.user_id}:`, error);
        continue;
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      processed: tokens?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in slack-sync:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function syncUserSlackData(supabase: any, token: any) {
  const headers = {
    'Authorization': `Bearer ${token.access_token}`,
    'Content-Type': 'application/json',
  };

  // Get user's conversations
  const conversationsResponse = await fetch(
    'https://slack.com/api/conversations.list?types=public_channel,private_channel,im,mpim&limit=200',
    { headers }
  );

  const conversationsData = await conversationsResponse.json();
  
  if (!conversationsData.ok) {
    throw new Error(`Conversations API error: ${conversationsData.error}`);
  }

  // Get user mapping for display names
  const usersResponse = await fetch('https://slack.com/api/users.list', { headers });
  const usersData = await usersResponse.json();
  const userMap = new Map<string, SlackUser>();
  
  if (usersData.ok) {
    usersData.members?.forEach((user: SlackUser) => {
      userMap.set(user.id, user);
    });
  }

  // Process each conversation
  for (const conversation of conversationsData.channels as SlackConversation[]) {
    try {
      // Get last sync timestamp for this conversation
      const { data: syncStatus } = await supabase
        .from('slack_sync_status')
        .select('last_sync_ts')
        .eq('user_id', token.user_id)
        .eq('conversation_id', conversation.id)
        .single();

      const lastSyncTs = syncStatus?.last_sync_ts;
      
      // Fetch recent messages
      const historyUrl = new URL('https://slack.com/api/conversations.history');
      historyUrl.searchParams.set('channel', conversation.id);
      historyUrl.searchParams.set('limit', '20');
      if (lastSyncTs) {
        historyUrl.searchParams.set('oldest', lastSyncTs);
      }

      const historyResponse = await fetch(historyUrl.toString(), { headers });
      const historyData = await historyResponse.json();

      if (!historyData.ok) {
        console.warn(`History API error for ${conversation.id}: ${historyData.error}`);
        continue;
      }

      const messages = historyData.messages as SlackMessage[];
      
      if (messages.length === 0) continue;

      // Prepare messages for insertion
      const messagesToInsert = messages
        .filter(msg => msg.text && !msg.subtype) // Filter out system messages
        .map(msg => {
          const user = userMap.get(msg.user);
          const conversationName = conversation.name || 
            (conversation.is_im && user ? `@${user.name}` : `Conversation ${conversation.id}`);

          return {
            user_id: token.user_id,
            slack_team_id: token.slack_team_id,
            conversation_id: conversation.id,
            message_ts: msg.ts,
            user_slack_id: msg.user,
            text: msg.text,
            username: user?.profile?.display_name || user?.real_name || user?.name || 'Unknown',
            user_image: user?.profile?.image_72,
            conversation_name: conversationName,
            conversation_type: conversation.is_channel ? 'channel' : 
                              conversation.is_group ? 'group' :
                              conversation.is_im ? 'im' : 'mpim',
            is_channel: conversation.is_channel,
            slack_created_at: new Date(parseFloat(msg.ts) * 1000).toISOString(),
          };
        });

      if (messagesToInsert.length > 0) {
        // Upsert messages
        const { error: messageError } = await supabase
          .from('slack_messages')
          .upsert(messagesToInsert, {
            onConflict: 'user_id,conversation_id,message_ts'
          });

        if (messageError) {
          console.error(`Error inserting messages for ${conversation.id}:`, messageError);
          continue;
        }

        // Update sync status
        const latestTs = Math.max(...messages.map(m => parseFloat(m.ts))).toString();
        
        await supabase
          .from('slack_sync_status')
          .upsert({
            user_id: token.user_id,
            conversation_id: conversation.id,
            last_sync_ts: latestTs,
            last_sync_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,conversation_id'
          });

        console.log(`Synced ${messagesToInsert.length} messages for ${conversationName}`);
      }

      // Rate limiting between conversations
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`Error processing conversation ${conversation.id}:`, error);
      continue;
    }
  }
}