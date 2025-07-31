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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the current user
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action } = await req.json();

    if (action === 'getAuthUrl') {
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
      const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-calendar`;
      
      const scope = 'https://www.googleapis.com/auth/calendar.readonly';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `state=${user.id}`;

      return new Response(
        JSON.stringify({ authUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'getEvents') {
      // Check if user has stored tokens
      const { data: tokens } = await supabaseClient
        .from('user_google_tokens')
        .select('access_token, refresh_token')
        .eq('user_id', user.id)
        .single();

      if (!tokens?.access_token) {
        return new Response(
          JSON.stringify({ error: 'No Google Calendar access. Please connect first.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get today's events from Google Calendar
      const today = new Date();
      const timeMin = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const timeMax = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      const calendarResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
          },
        }
      );

      if (!calendarResponse.ok) {
        console.error('Google Calendar API error:', await calendarResponse.text());
        return new Response(
          JSON.stringify({ error: 'Failed to fetch calendar events' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const calendarData = await calendarResponse.json();
      
      const events: CalendarEvent[] = calendarData.items?.map((event: any) => ({
        id: event.id,
        title: event.summary || 'Untitled Event',
        startTime: formatTime(event.start?.dateTime || event.start?.date),
        endTime: formatTime(event.end?.dateTime || event.end?.date),
        link: event.htmlLink,
      })) || [];

      return new Response(
        JSON.stringify({ events }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle OAuth callback
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state'); // user_id
      
      if (!code || !state) {
        return new Response('Missing authorization code or state', { status: 400 });
      }

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
      
      if (tokens.error) {
        console.error('Token exchange error:', tokens);
        return new Response(`Error: ${tokens.error}`, { status: 400 });
      }

      // Store tokens in database
      await supabaseClient
        .from('user_google_tokens')
        .upsert({
          user_id: state,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        });

      // Redirect back to app
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${Deno.env.get('SITE_URL') || 'http://localhost:5173'}?calendar_connected=true`,
        },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge function error:', error);
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