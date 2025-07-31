# productivity-pitstop

A unified dashboard for productivity management, integrating to-do lists, Google Calendar events, and Slack messages.

## Features

- **To-Do Management**: Create, complete, and delete tasks with deadlines
- **Google Calendar Integration**: View today's calendar events with real-time sync
- **Slack Integration**: View channels, DMs, and recent messages (Demo Mode)
- **AI Chat Assistant**: Query your dashboard context with intelligent responses
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Integrations

### Google Calendar
- OAuth 2.0 authentication with Google
- Real-time calendar event fetching
- Automatic token refresh

### Slack Integration (Demo Mode)
- **Note**: Slack backend functionality has been temporarily removed
- UI components are preserved and show mock data for demonstration
- Ready for future backend integration

## Setup Instructions

### 1. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:

```bash
# Supabase Configuration (automatically configured by Lovable)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 2. Google Calendar Integration

To enable Google Calendar integration:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API
4. Create credentials (OAuth 2.0 Client ID)
5. Add your domain to authorized redirect URIs
6. The app will handle OAuth flow automatically

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Authentication**: Supabase Auth with Google OAuth
- **Calendar**: Google Calendar API
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