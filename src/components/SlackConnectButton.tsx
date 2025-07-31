import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface SlackConnectButtonProps {
  onSuccess?: () => void;
}

export function SlackConnectButton({ onSuccess }: SlackConnectButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      setIsConnecting(true);

      // Get current user to pass to the OAuth URL
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Use the slack-oauth edge function to handle OAuth
      const { data, error } = await supabase.functions.invoke('slack-oauth', {
        body: {
          action: 'initiate_oauth',
          user_id: user.id
        }
      });

      if (error) {
        throw error;
      }
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Redirect to Slack OAuth URL
      window.location.href = data.oauth_url;

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
      {isConnecting ? "Connecting..." : "Connect with Slack"}
    </Button>
  );
}