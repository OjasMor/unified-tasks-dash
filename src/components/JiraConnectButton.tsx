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

      // Listen for OAuth completion
      const checkPopup = setInterval(() => {
        try {
          if (popup?.closed) {
            clearInterval(checkPopup);
            setIsConnecting(false);
            
            // Check if connection was successful by trying to fetch issues
            setTimeout(async () => {
              try {
                const { data: fetchData, error: fetchError } = await supabase.functions.invoke('jira-oauth-callback', {
                  body: { action: 'fetch_issues' }
                });
                
                if (fetchError) throw fetchError;
                
                toast({
                  title: "Jira Connected Successfully",
                  description: `Synced ${fetchData.issuesCount} issues from your Jira workspace.`,
                });
                onConnectionSuccess();
              } catch (err) {
                console.log('Issues fetch failed, connection might not be complete');
              }
            }, 1000);
          }
        } catch (e) {
          // Cross-origin error when popup is still open
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