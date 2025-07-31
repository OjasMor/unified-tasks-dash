# Google Calendar Integration

This document describes the Google Calendar integration feature that has been added to the Unified Tasks Dashboard.

## Overview

The Google Calendar integration allows users to:
- Sign in with Google and grant calendar access permissions
- View today's calendar events alongside their tasks
- See real-time calendar data from their Google Calendar

## Implementation Details

### Authentication Flow

1. **OAuth Scopes**: The Google OAuth flow now includes the calendar read-only scope:
   ```
   openid profile email https://www.googleapis.com/auth/calendar.readonly
   ```

2. **Access Token**: After successful authentication, the access token is retrieved from the Supabase session's `provider_token`.

### Calendar Service

The `GoogleCalendarService` class handles all calendar-related operations:

- **`fetchTodayEvents()`**: Fetches today's events from the primary calendar
- **`checkCalendarAccess()`**: Verifies if the user has granted calendar access
- **`getAccessToken()`**: Retrieves the access token from the current session

### API Endpoints

The service uses the Google Calendar API v3:
- **Endpoint**: `https://www.googleapis.com/calendar/v3/calendars/primary/events`
- **Parameters**:
  - `timeMin`: Start of current day (ISO 8601)
  - `timeMax`: End of current day (ISO 8601)
  - `singleEvents`: true
  - `orderBy`: startTime

### Component Updates

#### Index.tsx
- Added calendar events state management
- Integrated Google Calendar service
- Added automatic calendar access checking
- Updated OAuth flow with calendar scopes

#### CalendarColumn.tsx
- Added loading state support
- Enhanced error handling
- Improved user feedback

## Usage

### For Users

1. **Sign In**: Click "Continue with Google" to sign in
2. **Grant Permissions**: Accept the calendar access request
3. **View Events**: Today's calendar events will appear in the "Today's Agenda" column
4. **Connect Manually**: If events don't appear automatically, click "Connect Google Calendar"

### For Developers

#### Adding Calendar Events to State

```typescript
import { GoogleCalendarService } from '@/integrations/google/calendar';

const events = await GoogleCalendarService.fetchTodayEvents();
setCalendarEvents(events);
```

#### Checking Calendar Access

```typescript
const hasAccess = await GoogleCalendarService.checkCalendarAccess();
if (hasAccess) {
  // User has granted calendar permissions
}
```

## Error Handling

The integration includes comprehensive error handling:

- **No Access Token**: Shows appropriate error message
- **API Errors**: Displays user-friendly error notifications
- **Network Issues**: Graceful fallback with retry options
- **Permission Denied**: Guides user to grant permissions

## Security Considerations

- Access tokens are retrieved from Supabase session
- Only read-only calendar access is requested
- No calendar data is stored locally
- All API calls use HTTPS

## Future Enhancements

Potential improvements:
- Calendar event creation/editing
- Multiple calendar support
- Event reminders and notifications
- Calendar sync status indicators
- Offline calendar data caching

## Troubleshooting

### Common Issues

1. **Events not appearing**: Check if user granted calendar permissions
2. **Authentication errors**: Verify Supabase OAuth configuration
3. **API rate limits**: Implement exponential backoff for retries
4. **Token expiration**: Handle token refresh automatically

### Debug Steps

1. Check browser console for API errors
2. Verify access token in Supabase session
3. Test calendar API directly with token
4. Confirm OAuth scopes are correctly set

## Configuration

### Supabase OAuth Settings

Ensure your Supabase project has Google OAuth configured with:
- Client ID and Secret from Google Cloud Console
- Redirect URL: `https://your-project.supabase.co/auth/v1/callback`
- Scopes: `openid profile email https://www.googleapis.com/auth/calendar.readonly`

### Google Cloud Console

1. Enable Google Calendar API
2. Configure OAuth consent screen
3. Add calendar scope to allowed scopes
4. Set up proper redirect URIs 