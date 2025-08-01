import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface JiraConnectButtonProps {
  onConnectionSuccess: () => void;
}

export const JiraConnectButton = ({ onConnectionSuccess }: JiraConnectButtonProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const state = Math.random().toString(36).substring(7);
      console.log('🚀 Starting Jira OAuth with state:', state);
      
      const { data, error } = await supabase.functions.invoke('jira-oauth-callback', {
        body: { action: 'oauth_redirect', state }
      });

      if (error) throw error;
      console.log('📋 Got OAuth URL:', data.authUrl);

      // Open OAuth window with better positioning
      const popup = window.open(
        data.authUrl,
        'jira-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes,left=' + 
        (window.screenX + (window.outerWidth - 600) / 2) + ',top=' + 
        (window.screenY + (window.outerHeight - 700) / 2)
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Listen for messages from the popup
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) {
          console.log('🚫 Ignored message from different origin:', event.origin);
          return;
        }
        
        console.log('📨 Received message:', event.data);
        
        if (event.data.type === 'JIRA_OAUTH_SUCCESS' && event.data.code) {
          try {
            console.log('✅ OAuth success, exchanging code for tokens...');
            // Exchange code for tokens
            const { data: tokenData, error: tokenError } = await supabase.functions.invoke('jira-oauth-callback', {
              body: { action: 'oauth_callback', code: event.data.code, state: event.data.state }
            });

            if (tokenError) throw tokenError;
            console.log('🔑 Token exchange successful');

            // Associate tokens with user and fetch issues
            const { data: fetchData, error: fetchError } = await supabase.functions.invoke('jira-oauth-callback', {
              body: { action: 'associate_and_fetch', tokenId: tokenData.tokenId }
            });
            
            if (fetchError) throw fetchError;
            console.log('🎯 Issues fetched:', fetchData.issuesCount);
            
            toast({
              title: "Jira Connected Successfully",
              description: `Synced ${fetchData.issuesCount} issues from your Jira workspace.`,
            });
            
            // Call onConnectionSuccess first, then clean up
            onConnectionSuccess();
            cleanupConnection();
          } catch (err) {
            console.error('❌ Error completing Jira connection:', err);
            toast({
              title: "Connection Failed",
              description: "Failed to complete Jira connection. Please try again.",
              variant: "destructive",
            });
            cleanupConnection();
          }
        } else if (event.data.type === 'JIRA_OAUTH_ERROR') {
          console.error('❌ OAuth error:', event.data.error);
          toast({
            title: "Connection Failed",
            description: event.data.error || "Failed to connect to Jira. Please try again.",
            variant: "destructive",
          });
          cleanupConnection();
        }
      };

      const cleanupConnection = () => {
        setIsConnecting(false);
        window.removeEventListener('message', handleMessage);
        if (checkPopupInterval) {
          clearInterval(checkPopupInterval);
        }
      };

      window.addEventListener('message', handleMessage);

      // Set up popup monitoring with timeout
      let checkPopupInterval: NodeJS.Timeout;
      const timeoutDuration = 300000; // 5 minutes
      
      const timeoutId = setTimeout(() => {
        console.log('⏰ OAuth timeout reached');
        if (!popup?.closed) {
          popup?.close();
        }
        toast({
          title: "Connection Timeout",
          description: "The Jira connection took too long. Please try again.",
          variant: "destructive",
        });
        cleanupConnection();
      }, timeoutDuration);

      // Check if popup is closed manually
      checkPopupInterval = setInterval(() => {
        if (popup?.closed) {
          console.log('🚪 Popup was closed manually');
          clearTimeout(timeoutId);
          cleanupConnection();
        }
      }, 1000);

    } catch (error) {
      console.error('Error connecting to Jira:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Jira. Please try again.",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  return (
    <Button 
      onClick={handleConnect} 
      disabled={isConnecting}
      className="w-full"
    >
      {isConnecting ? "Connecting..." : "Connect Jira"}
    </Button>
  );
};