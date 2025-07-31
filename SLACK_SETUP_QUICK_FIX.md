# Slack Integration Quick Fix

## Issues Found and Fixed

1. **Action Name Mismatch**: Fixed `'generate_oauth_url'` → `'initiate_oauth'` in SlackConnectButton.tsx
2. **Wrong Endpoint**: Fixed `/api/slack-oauth` → `/functions/v1/slack-oauth` in multiple files
3. **Response Field Mismatch**: Fixed `oauthUrl` → `oauth_url` in the Edge Function
4. **Missing Function Config**: Added slack-oauth function to supabase/config.toml

## Next Steps to Complete Setup

### 1. Deploy the Edge Function

```bash
# Make sure you're in the project directory
cd /Users/draghunathan/unified-tasks-dash

# Deploy the slack-oauth function
supabase functions deploy slack-oauth
```

### 2. Set Environment Variables

You need to set these environment variables in your Supabase project:

```bash
# Go to your Supabase dashboard
# Navigate to Settings > API > Environment Variables
# Add these variables:

SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_REDIRECT_URI=https://your-domain.com/auth/callback
```

### 3. Create Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Create a new app
3. Go to "OAuth & Permissions"
4. Add these scopes:
   - `search:read`
   - `users:read`
   - `channels:read`
   - `groups:read`
   - `im:read`
   - `mpim:read`
5. Set redirect URL to: `https://your-domain.com/auth/callback`
6. Copy the Client ID and Client Secret

### 4. Run Database Migrations

Make sure the database tables are created by running the migrations in `supabase/migrations/`.

### 5. Test the Integration

After completing the above steps:

1. Start your development server
2. Try connecting to Slack
3. Check the browser console and Supabase function logs for any errors

## Current Status

✅ **Fixed Issues:**
- Action name mismatch
- Wrong API endpoints
- Response field mismatch
- Missing function configuration

⏳ **Pending Setup:**
- Environment variables configuration
- Slack app creation
- Edge function deployment
- Database migrations

## Error Explanation

The "Unexpected token '<', "<!DOCTYPE "... is not valid JSON" error occurs because:
1. The Edge Function wasn't deployed or configured properly
2. The function returns HTML error pages instead of JSON responses
3. The frontend tries to parse HTML as JSON, causing the error

Once you complete the setup steps above, the integration should work correctly. 