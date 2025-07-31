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

      // Use Supabase's built-in OAuth with slack_oidc provider
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'slack_oidc',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        throw error;
      }

      // The redirect will happen automatically if successful

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