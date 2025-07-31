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

      // Call the Slack OAuth start function
      const { data, error } = await supabase.functions.invoke('slack-oauth-start');

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.authUrl) {
        throw new Error('No auth URL received from server');
      }

      // Open Slack OAuth in a popup window
      const popup = window.open(
        data.authUrl,
        'slack-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      // Listen for the OAuth result
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'slack-oauth-success') {
          // Associate the Slack connection with the current user
          associateSlackWithUser(event.data.teamId, event.data.userId, event.data.teamName);
          popup?.close();
          window.removeEventListener('message', handleMessage);
        } else if (event.data.type === 'slack-oauth-error') {
          console.error('Slack OAuth error:', event.data.error);
          toast({
            title: "Connection Failed",
            description: event.data.error || "Failed to connect to Slack",
            variant: "destructive",
          });
          popup?.close();
          window.removeEventListener('message', handleMessage);
          setIsConnecting(false);
        }
      };

      window.addEventListener('message', handleMessage);

      // Handle popup closed
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
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

  const associateSlackWithUser = async (teamId: string, userId: string, teamName: string) => {
    try {
      // Call the associate user function
      const { data, error } = await supabase.functions.invoke('slack-associate-user', {
        body: { teamId, userId }
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Slack Connected",
        description: `Successfully connected to ${teamName}`,
      });

      if (onSuccess) {
        onSuccess(teamId, teamName);
      }

    } catch (error) {
      console.error('Error associating Slack with user:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to complete Slack connection",
        variant: "destructive",
      });
    } finally {
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