# Slack Integration Quick Fix

## Issues Found and Fixed

1. **Action Name Mismatch**: Fixed `'generate_oauth_url'` → `'initiate_oauth'` in SlackConnectButton.tsx
2. **Wrong API Endpoints**: Fixed `/api/slack-oauth` → `/functions/v1/slack-oauth` in multiple files
3. **Response Field Mismatch**: Fixed `oauthUrl` → `oauth_url` in the Edge Function
4. **Missing Function Config**: Added slack-oauth function to supabase/config.toml
5. **❌ WRONG URL ISSUE**: Fixed relative URLs → Full Supabase URLs

## ✅ MAJOR FIX APPLIED

The main issue was that the frontend was calling relative URLs like `/functions/v1/slack-oauth` on the Lovable domain, but the Edge Functions are hosted on the Supabase domain. 

**Fixed URLs in all components:**
- `SlackConnectButton.tsx`: `/functions/v1/slack-oauth` → `https://dggmyssboghmwytvuuqq.supabase.co/functions/v1/slack-oauth`
- `AuthCallback.tsx`: `/functions/v1/slack-oauth` → `https://dggmyssboghmwytvuuqq.supabase.co/functions/v1/slack-oauth`
- `SlackPane.tsx`: `/functions/v1/slack-oauth` → `https://dggmyssboghmwytvuuqq.supabase.co/functions/v1/slack-oauth`
- `SlackMentions.tsx`: `/functions/v1/slack-oauth` → `https://dggmyssboghmwytvuuqq.supabase.co/functions/v1/slack-oauth`

## Current Status

✅ **Fixed Issues:**
- Action name mismatch
- Wrong API endpoints
- Response field mismatch
- Missing function configuration
- **WRONG URL ISSUE (MAJOR FIX)**

⏳ **Remaining Issue:**
- User ID is coming through as "undefined" - this suggests an authentication issue

## Next Steps to Complete Setup

### 1. Test the Fix

The Edge Function is now working correctly and returning JSON instead of HTML. Try the Slack connection again in your app.

### 2. Fix Authentication Issue

The user ID is coming through as "undefined". This suggests:
1. The user might not be properly authenticated
2. The `user.id` might be null/undefined when the request is made

**To debug this:**
1. Check if the user is logged in when clicking "Connect with Slack"
2. Add console.log to see what `user.id` contains
3. Ensure the Supabase auth session is valid

### 3. Set Environment Variables (Still Needed)

You still need to set these environment variables in your Supabase project:

```bash
# Go to your Supabase dashboard
# Navigate to Settings > API > Environment Variables
# Add these variables:

SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_REDIRECT_URI=https://your-domain.com/auth/callback
```

### 4. Create Slack App (Still Needed)

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

## Error Explanation

The "Unexpected token '<', "<!DOCTYPE "... is not valid JSON" error was caused by:
1. **Frontend calling wrong URL**: The app was calling `/functions/v1/slack-oauth` on the Lovable domain instead of the Supabase domain
2. **HTML response**: The Lovable domain returned HTML instead of JSON
3. **JSON parsing error**: Frontend tried to parse HTML as JSON

**This is now FIXED!** The Edge Function is working correctly and returning proper JSON responses.

## Test Results

✅ **Edge Function Test**: 
```bash
curl -X POST https://dggmyssboghmwytvuuqq.supabase.co/functions/v1/slack-oauth \
  -H "Content-Type: application/json" \
  -d '{"action":"initiate_oauth","user_id":"test-user"}'
```

**Response**: `{"success":true,"message":"OAuth URL generated","oauth_url":"https://slack.com/oauth/v2/authorize?..."}`

The function is working! The only remaining issue is the authentication/user ID problem. 