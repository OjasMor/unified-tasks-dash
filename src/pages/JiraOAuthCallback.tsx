import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const JiraOAuthCallback = () => {
  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');

        if (!code) {
          console.error('No authorization code received');
          window.close();
          return;
        }

        // Exchange code for tokens
        const { data, error } = await supabase.functions.invoke('jira-oauth-callback', {
          body: { action: 'oauth_callback', code, state }
        });

        if (error) {
          console.error('Error exchanging code for tokens:', error);
        } else {
          console.log('OAuth callback successful:', data);
        }

        // Close the popup window
        window.close();
      } catch (error) {
        console.error('Error in OAuth callback:', error);
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