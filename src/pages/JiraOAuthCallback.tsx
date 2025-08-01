import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const JiraOAuthCallback = () => {
  useEffect(() => {
    const handleCallback = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        if (error) {
          console.error('OAuth error:', error);
          // Send error message to parent window
          window.opener?.postMessage({
            type: 'JIRA_OAUTH_ERROR',
            error: error
          }, '*');
          window.close();
          return;
        }

        if (!code) {
          console.error('No authorization code received');
          // Send error message to parent window
          window.opener?.postMessage({
            type: 'JIRA_OAUTH_ERROR',
            error: 'No authorization code received'
          }, '*');
          window.close();
          return;
        }

        console.log('OAuth callback successful, sending message to parent');
        // Send success message with code and state to parent window
        window.opener?.postMessage({
          type: 'JIRA_OAUTH_SUCCESS',
          code,
          state
        }, '*');

        // Close the popup window
        window.close();
      } catch (error) {
        console.error('Error in OAuth callback:', error);
        // Send error message to parent window
        window.opener?.postMessage({
          type: 'JIRA_OAUTH_ERROR',
          error: error instanceof Error ? error.message : 'Unknown error'
        }, '*');
        window.close();
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