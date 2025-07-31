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

      // Use Supabase's built-in Slack OAuth
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'slack',
        options: {
          scopes: 'channels:read channels:history im:read im:history mpim:read mpim:history users:read'
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // The OAuth flow will handle redirects automatically
      // Connection success will be handled by auth state changes
      
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