# Slack Bot Token Setup Guide

## Changes Made

I've successfully updated the Slack integration to use **app-level bot tokens** instead of user-level OAuth, which should eliminate the "Invalid permission, invalid scope" errors you were experiencing.

### Key Changes:

1. **Updated Edge Function** (`supabase/functions/slack-oauth/index.ts`):
   - Removed OAuth flow (initiate_oauth, handle_callback)
   - Added bot token authentication
   - Simplified API calls using single bot token
   - Updated all endpoints to use bot token

2. **Updated Frontend Components**:
   - `SlackConnectButton.tsx`: Now tests bot connection instead of OAuth
   - `SlackPane.tsx`: Removed OAuth-specific logic, simplified connection check
   - `SlackMentions.tsx`: Updated to work with bot token approach

## Environment Variables

**Remove these old variables:**
```bash
SLACK_CLIENT_ID
SLACK_CLIENT_SECRET
SLACK_REDIRECT_URI
```

**Add this new variable:**
```bash
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
```

## How to Get Your Bot Token

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Select your Slack app
3. Go to "OAuth & Permissions" in the left sidebar
4. Look for "Bot User OAuth Token" (starts with `xoxb-`)
5. Copy this token

## Required Bot Scopes

Make sure your Slack app has these bot scopes:
- `channels:read`
- `channels:history`
- `users:read`
- `search:read`
- `groups:read` (for private channels)

## Deploy the Updated Function

You need to deploy the updated Edge Function. You can do this by:

1. **Using Supabase CLI** (if you have access):
   ```bash
   supabase login
   supabase functions deploy slack-oauth
   ```

2. **Using Supabase Dashboard**:
   - Go to your Supabase project dashboard
   - Navigate to Edge Functions
   - Find the `slack-oauth` function
   - Replace the code with the updated version from `supabase/functions/slack-oauth/index.ts`

## Benefits of This Approach

✅ **No Permission Issues**: Bot tokens have workspace-level permissions
✅ **Simpler Setup**: No individual user authorization needed
✅ **More Reliable**: No token expiration or refresh issues
✅ **Easier to Debug**: Single token to manage
✅ **No OAuth Flow**: Direct API access

## Testing the Setup

Once deployed, you can test the connection by:

1. Setting the `SLACK_BOT_TOKEN` environment variable
2. Clicking "Test Slack Connection" in the app
3. The app should now fetch channels and messages without OAuth errors

## What's Different

**Before (User-Level OAuth):**
- Each user individually authorizes the Slack app
- Each user gets their own access token
- Complex OAuth flow with redirects
- Permission issues with scopes

**After (Bot Token):**
- Single bot token for the entire workspace
- Bot is installed once to the workspace
- Direct API access without user authorization
- No permission issues

## Next Steps

1. **Set Environment Variable**: Add `SLACK_BOT_TOKEN` to your Supabase project
2. **Deploy Function**: Update the Edge Function with the new code
3. **Test Connection**: Try the "Test Slack Connection" button
4. **Verify Data**: Check that channels and messages load correctly

The integration should now work without the permission errors you were experiencing! 