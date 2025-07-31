export interface GoogleCalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  link?: string;
  description?: string;
  location?: string;
}

export interface GoogleCalendarResponse {
  items: Array<{
    id: string;
    summary: string;
    description?: string;
    location?: string;
    start: {
      dateTime?: string;
      date?: string;
    };
    end: {
      dateTime?: string;
      date?: string;
    };
    htmlLink?: string;
  }>;
}

export class GoogleCalendarService {
  private static async getAccessToken(): Promise<string | null> {
    try {
      // Get the current session from Supabase
      const { data: { session } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getSession());
      
      if (!session?.provider_token) {
        throw new Error('No provider token available');
      }
      
      return session.provider_token;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  static async fetchTodayEvents(): Promise<GoogleCalendarEvent[]> {
    try {
      const accessToken = await this.getAccessToken();
      
      if (!accessToken) {
        throw new Error('No access token available');
      }

      // Get today's date range in ISO format
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      
      const timeMin = startOfDay.toISOString();
      const timeMax = endOfDay.toISOString();

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${encodeURIComponent(timeMin)}&` +
        `timeMax=${encodeURIComponent(timeMax)}&` +
        `singleEvents=true&` +
        `orderBy=startTime`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Calendar API error: ${response.status} ${response.statusText}`);
      }

      const data: GoogleCalendarResponse = await response.json();
      
      return data.items.map(item => {
        const startTime = item.start.dateTime || item.start.date;
        const endTime = item.end.dateTime || item.end.date;
        
        // Format time for display
        const formatTime = (dateString: string) => {
          const date = new Date(dateString);
          return date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          });
        };

        return {
          id: item.id,
          title: item.summary || 'Untitled Event',
          startTime: startTime ? formatTime(startTime) : 'All day',
          endTime: endTime ? formatTime(endTime) : '',
          link: item.htmlLink,
          description: item.description,
          location: item.location,
        };
      });
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }
  }

  static async checkCalendarAccess(): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        return false;
      }

      // Try to fetch a single event to test access
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const timeMin = startOfDay.toISOString();

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${encodeURIComponent(timeMin)}&` +
        `maxResults=1`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Error checking calendar access:', error);
      return false;
    }
  }
} 