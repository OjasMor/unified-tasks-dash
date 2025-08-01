import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const JiraOAuthCallback = () => {
  useEffect(() => {
    const handleCallback = () => {
      try {
        console.log('🔄 Jira OAuth callback received, processing...');
        console.log('📍 Current URL:', window.location.href);
        
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        
        console.log('🔍 URL params:', { code: code?.substring(0, 10) + '...', state, error });

        if (error) {
          console.error('❌ OAuth error from Jira:', error);
          window.opener?.postMessage({
            type: 'JIRA_OAUTH_ERROR',
            error: `Jira OAuth error: ${error}`
          }, window.location.origin);
          setTimeout(() => window.close(), 1000);
          return;
        }

        if (!code) {
          console.error('❌ No authorization code received from Jira');
          window.opener?.postMessage({
            type: 'JIRA_OAUTH_ERROR',
            error: 'No authorization code received from Jira. Please try again.'
          }, window.location.origin);
          setTimeout(() => window.close(), 1000);
          return;
        }

        console.log('✅ OAuth callback successful, sending message to parent');
        // Send success message with code and state to parent window
        window.opener?.postMessage({
          type: 'JIRA_OAUTH_SUCCESS',
          code,
          state
        }, window.location.origin);

        // Close the popup window after a brief delay
        setTimeout(() => window.close(), 500);
      } catch (error) {
        console.error('💥 Unexpected error in OAuth callback:', error);
        window.opener?.postMessage({
          type: 'JIRA_OAUTH_ERROR',
          error: error instanceof Error ? error.message : 'Unexpected error during OAuth callback'
        }, window.location.origin);
        setTimeout(() => window.close(), 1000);
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Connecting to Jira...</h2>
        <p className="text-muted-foreground">Please wait while we complete the connection.</p>
      </div>
    </div>
  );
};

export default JiraOAuthCallback;