import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SlackConnectButtonProps {
  onSuccess?: (teamId: string, teamName: string) => void;
}

export function SlackConnectButton({ onSuccess }: SlackConnectButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      setIsConnecting(true);

      // Get auth URL from our edge function
      const { data, error } = await supabase.functions.invoke('slack-oauth-start');
      
      if (error) {
        throw new Error(error.message);
      }

      if (!data?.authUrl) {
        throw new Error('No auth URL received');
      }

      // Open OAuth window
      const popup = window.open(
        data.authUrl,
        'slack-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Listen for OAuth completion
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'slack-oauth-success') {
          window.removeEventListener('message', handleMessage);
          popup.close();

          // Update the token with the current user's ID
          const { data: user } = await supabase.auth.getUser();
          if (user.user) {
            await supabase
              .from('slack_oauth_tokens')
              .update({ user_id: user.user.id })
              .eq('slack_team_id', event.data.teamId)
              .eq('slack_user_id', event.data.userId);
          }

          toast({
            title: "Slack Connected!",
            description: `Successfully connected to ${event.data.teamName}`,
          });

          onSuccess?.(event.data.teamId, event.data.teamName);
          setIsConnecting(false);
        } else if (event.data.type === 'slack-oauth-error') {
          window.removeEventListener('message', handleMessage);
          popup.close();
          throw new Error(event.data.error);
        }
      };

      window.addEventListener('message', handleMessage);

      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          setIsConnecting(false);
        }
      }, 1000);

    } catch (error) {
      console.error('Slack connection error:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to Slack",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  return (
    <Button 
      variant="default" 
      onClick={handleConnect} 
      disabled={isConnecting}
      className="gap-2"
    >
      {isConnecting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MessageSquare className="h-4 w-4" />
      )}
      {isConnecting ? "Connecting..." : "Connect Slack"}
    </Button>
  );
}