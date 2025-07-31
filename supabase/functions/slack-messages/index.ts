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
    const authHeader = req.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(JSON.stringify({ 
        error: 'No authorization header provided',
        connected: false 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration');
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          authorization: authHeader,
        },
      },
    });

    const url = new URL(req.url);
    const conversationId = url.searchParams.get('conversation_id');
    const action = url.searchParams.get('action') || 'messages';

    console.log('Action:', action, 'Conversation ID:', conversationId);

    if (action === 'channels') {
      // Get user's Slack channels with latest message preview
      const { data: user, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('User authentication error:', userError);
        return new Response(JSON.stringify({ 
          error: 'Authentication failed',
          connected: false 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (!user.user) {
        console.error('No authenticated user found');
        return new Response(JSON.stringify({ 
          error: 'No authenticated user found',
          connected: false 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Authenticated user:', user.user.id);

      const { data, error } = await supabase
        .rpc('get_user_slack_channels', { p_user_id: user.user.id });

      if (error) {
        console.error('Failed to fetch channels:', error);
        throw new Error(`Failed to fetch channels: ${error.message}`);
      }

      return new Response(JSON.stringify({ channels: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'messages' && conversationId) {
      // Get messages for a specific conversation
      const { data, error } = await supabase
        .from('slack_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('slack_created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Failed to fetch messages:', error);
        throw new Error(`Failed to fetch messages: ${error.message}`);
      }

      return new Response(JSON.stringify({ messages: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'status') {
      // Check if user has connected Slack
      const { data: user, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('User authentication error in status check:', userError);
        return new Response(JSON.stringify({ 
          connected: false,
          error: 'Authentication failed'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (!user.user) {
        console.error('No authenticated user found in status check');
        return new Response(JSON.stringify({ 
          connected: false,
          error: 'No authenticated user found'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Checking Slack connection for user:', user.user.id);

      const { data, error } = await supabase
        .from('slack_oauth_tokens')
        .select('slack_team_id, installed_at')
        .eq('user_id', user.user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Database error checking Slack connection:', error);
        return new Response(JSON.stringify({ 
          connected: false,
          error: 'Database error'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const connected = !error && !!data;
      console.log('Slack connection status:', connected);

      return new Response(JSON.stringify({ 
        connected,
        teamId: data?.slack_team_id,
        connectedAt: data?.installed_at
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action or missing parameters');

  } catch (error) {
    console.error('Error in slack-messages:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      connected: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});