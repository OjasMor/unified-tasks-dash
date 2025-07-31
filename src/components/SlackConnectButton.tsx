import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2 } from "lucide-react";
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

      // Simulate OAuth process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate successful connection
      toast({
        title: "Slack Connected",
        description: "Successfully connected to Slack (demo mode)",
      });

      if (onSuccess) {
        onSuccess("demo-team-id", "Demo Team");
      }

    } catch (error) {
      console.error('Slack connection error:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to Slack",
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
      {isConnecting ? "Connecting..." : "Connect Slack (Demo)"}
    </Button>
  );
}