import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  link?: string;
}

serve(async (req) => {
  console.log('📅 Google Calendar Edge Function called');
  console.log('📝 Request method:', req.method);
  console.log('📝 Request URL:', req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request handled');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 Creating Supabase client...');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );
    console.log('✅ Supabase client created');

    // Get the current user
    console.log('👤 Getting current user...');
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      console.error('❌ No authenticated user found');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('✅ User authenticated:', user.id);

    if (req.method === 'GET') {
      console.log('🔄 Handling OAuth callback...');
      const url = new URL(req.url);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state'); // user_id
      
      console.log('📥 OAuth callback parameters:', { 
        hasCode: !!code, 
        hasState: !!state,
        state: state 
      });
      
      if (!code || !state) {
        console.error('❌ Missing authorization code or state');
        return new Response('Missing authorization code or state', { status: 400 });
      }

      console.log('🔄 Exchanging code for tokens...');
      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
          code,
          grant_type: 'authorization_code',
          redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-calendar`,
        }),
      });

      const tokens = await tokenResponse.json();
      console.log('📥 Token exchange response:', { 
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiresIn: tokens.expires_in,
        error: tokens.error 
      });
      
      if (tokens.error) {
        console.error('❌ Token exchange error:', tokens);
        return new Response(`Error: ${tokens.error}`, { status: 400 });
      }

      console.log('💾 Storing tokens in database...');
      // Store tokens in database
      const { error: insertError } = await supabaseClient
        .from('user_google_tokens')
        .upsert({
          user_id: state,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        });

      if (insertError) {
        console.error('❌ Error storing tokens:', insertError);
      } else {
        console.log('✅ Tokens stored successfully');
      }

      const redirectUrl = `${Deno.env.get('SITE_URL') || 'http://localhost:5173'}?calendar_connected=true`;
      console.log('🔄 Redirecting to:', redirectUrl);
      
      // Redirect back to app
      return new Response(null, {
        status: 302,
        headers: {
          'Location': redirectUrl,
        },
      });
    }

    console.log('📥 Parsing request body...');
    const { action } = await req.json();
    console.log('📥 Request action:', action);

    if (action === 'getAuthUrl') {
      console.log('🔄 Generating Google OAuth URL...');
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
      const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-calendar`;
      
      console.log('🔧 OAuth configuration:', { 
        clientId: clientId ? '***' : 'MISSING', 
        redirectUri 
      });
      
      const scope = 'https://www.googleapis.com/auth/calendar.readonly';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `state=${user.id}`;

      console.log('✅ OAuth URL generated');
      return new Response(
        JSON.stringify({ authUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'getEvents') {
      console.log('🔄 Fetching calendar events for user:', user.id);
      
      // Check if user has stored tokens
      console.log('🔍 Checking for stored tokens...');
      const { data: tokens } = await supabaseClient
        .from('user_google_tokens')
        .select('access_token, refresh_token')
        .eq('user_id', user.id)
        .single();

      if (!tokens?.access_token) {
        console.error('❌ No Google Calendar access found for user');
        return new Response(
          JSON.stringify({ error: 'No Google Calendar access. Please connect first.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('✅ Found stored tokens');

      // Get today's events from Google Calendar
      const today = new Date();
      const timeMin = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const timeMax = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      console.log('📅 Fetching events for date range:', { timeMin, timeMax });
      console.log('🌐 Calling Google Calendar API...');

      const calendarResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
          },
        }
      );

      console.log('📥 Google Calendar API response status:', calendarResponse.status);

      if (!calendarResponse.ok) {
        const errorText = await calendarResponse.text();
        console.error('❌ Google Calendar API error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch calendar events' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const calendarData = await calendarResponse.json();
      console.log('📥 Google Calendar API response:', { 
        eventCount: calendarData.items?.length || 0,
        nextPageToken: !!calendarData.nextPageToken
      });
      
      const events: CalendarEvent[] = calendarData.items?.map((event: any) => ({
        id: event.id,
        title: event.summary || 'Untitled Event',
        startTime: formatTime(event.start?.dateTime || event.start?.date),
        endTime: formatTime(event.end?.dateTime || event.end?.date),
        link: event.htmlLink,
      })) || [];

      console.log('✅ Returning', events.length, 'events');
      return new Response(
        JSON.stringify({ events }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.error('❌ Invalid action:', action);
    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function formatTime(dateTimeString: string): string {
  if (!dateTimeString) return '';
  
  const date = new Date(dateTimeString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}