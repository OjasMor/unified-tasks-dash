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
      
      const { data, error } = await supabase.functions.invoke('jira-oauth-callback', {
        body: { action: 'oauth_redirect', state }
      });

      if (error) throw error;

      // Open OAuth window
      const popup = window.open(
        data.authUrl,
        'jira-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      // Listen for messages from the popup
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'JIRA_OAUTH_SUCCESS' && event.data.code) {
          try {
            // Exchange code for tokens
            const { data: tokenData, error: tokenError } = await supabase.functions.invoke('jira-oauth-callback', {
              body: { action: 'oauth_callback', code: event.data.code, state: event.data.state }
            });

            if (tokenError) throw tokenError;

            // Associate tokens with user and fetch issues
            const { data: fetchData, error: fetchError } = await supabase.functions.invoke('jira-oauth-callback', {
              body: { action: 'associate_and_fetch', tokenId: tokenData.tokenId }
            });
            
            if (fetchError) throw fetchError;
            
            toast({
              title: "Jira Connected Successfully",
              description: `Synced ${fetchData.issuesCount} issues from your Jira workspace.`,
            });
            onConnectionSuccess();
          } catch (err) {
            console.error('Error completing Jira connection:', err);
            toast({
              title: "Connection Failed",
              description: "Failed to complete Jira connection. Please try again.",
              variant: "destructive",
            });
          } finally {
            setIsConnecting(false);
            window.removeEventListener('message', handleMessage);
          }
        } else if (event.data.type === 'JIRA_OAUTH_ERROR') {
          toast({
            title: "Connection Failed",
            description: event.data.error || "Failed to connect to Jira. Please try again.",
            variant: "destructive",
          });
          setIsConnecting(false);
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);

      // Also check if popup is closed manually
      const checkPopup = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkPopup);
          setIsConnecting(false);
          window.removeEventListener('message', handleMessage);
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