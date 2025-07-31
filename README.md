# productivity-pitstop

A unified dashboard for productivity management, integrating to-do lists, Google Calendar events, and Slack messages.

## Features

- **To-Do Management**: Create, complete, and delete tasks with deadlines
- **Google Calendar Integration**: View today's calendar events with real-time sync
- **Slack Integration**: View channels, DMs, and recent messages with deep-linking
- **AI Chat Assistant**: Query your dashboard context with intelligent responses
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Integrations

### Google Calendar
- OAuth 2.0 authentication with Google
- Real-time calendar event fetching
- Automatic token refresh

### Slack Integration
- OAuth 2.0 authentication with Slack workspace
- Read access to public channels, private channels, DMs, and multi-party DMs
- Message history with user avatars and timestamps
- Deep-link integration to open conversations in Slack
- Rate-limited API calls to respect Slack's limits (1 call/min for new apps)

## Setup Instructions

### 1. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:

```bash
# Slack App Configuration
SLACK_CLIENT_ID=your_slack_client_id_here
SLACK_CLIENT_SECRET=your_slack_client_secret_here
SLACK_SIGNING_SECRET=your_slack_signing_secret_here

# Supabase Configuration (automatically configured by Lovable)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 2. Set Supabase Secrets

Configure the required secrets in your Supabase project:

```bash
supabase secrets set SLACK_CLIENT_ID=your_slack_client_id
supabase secrets set SLACK_CLIENT_SECRET=your_slack_client_secret
supabase secrets set SLACK_SIGNING_SECRET=your_slack_signing_secret
```

### 3. Slack App Setup

1. Create a new Slack app at https://api.slack.com/apps
2. Enable the following OAuth scopes under "OAuth & Permissions":
   - `channels:read` - View basic information about public channels
   - `channels:history` - View messages in public channels
   - `im:read` - View basic information about direct messages
   - `im:history` - View messages in direct messages
   - `mpim:read` - View basic information about group DMs
   - `mpim:history` - View messages in group DMs
   - `users:read` - View people in a workspace
3. Set up OAuth redirect URLs:
   - Development: `http://localhost:54321/functions/v1/slack-oauth-callback`
   - Production: `https://your-project.supabase.co/functions/v1/slack-oauth-callback`
4. Install the app to your workspace
5. Copy the Client ID, Client Secret, and Signing Secret to your environment variables

### 4. Deploy Edge Functions

The Slack integration uses several Supabase Edge Functions:

- `slack-oauth-start` - Initiates OAuth flow
- `slack-oauth-callback` - Handles OAuth callback and stores tokens
- `slack-sync` - Syncs messages from Slack (can be run as cron job)
- `slack-messages` - API for fetching channels and messages

Functions are automatically deployed when you push to your repository.

### 5. Google Calendar Integration

To enable Google Calendar integration:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API
4. Create credentials (OAuth 2.0 Client ID)
5. Add your domain to authorized redirect URIs
6. The app will handle OAuth flow automatically

## API Rate Limits

**Important**: New Slack apps (created after May 29, 2025) are limited to 1 `conversations.history` call per minute unless rate limits are lifted by Slack. The sync function implements aggressive caching and respects these limits with built-in delays.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Authentication**: Supabase Auth with Google OAuth
- **Calendar**: Google Calendar API
- **Chat**: Slack Web API
- **AI**: OpenAI GPT for chat assistant

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Deployment

Simply open [Lovable](https://lovable.dev/projects/f742c546-3ea7-4473-b7a1-2f544aa819f4) and click on Share → Publish to deploy your application.

You can also connect a custom domain by navigating to Project > Settings > Domains.