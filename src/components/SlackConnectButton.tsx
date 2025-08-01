import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SlackConnectButtonProps {
  onSuccess?: () => void;
}

export function SlackConnectButton({ onSuccess }: SlackConnectButtonProps) {
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      console.log('🔄 Testing Slack bot connection...');

      // Test the bot token connection by fetching channels
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dggmyssboghmwytvuuqq.supabase.co'}/functions/v1/slack-oauth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'fetch_channels',
          userId: 'test-user'
        })
      });

      console.log('📥 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP error:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('📥 Response data:', data);
      
      if (data.error) {
        throw new Error(data.error);
      }

      console.log('✅ Slack bot connection successful');
      setIsConnected(true);
      toast({
        title: "Slack Connected",
        description: "Successfully connected to Slack workspace",
        variant: "default",
      });
      
      if (onSuccess) {
        onSuccess();
      }

    } catch (error) {
      console.error('❌ Slack connection error:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to Slack. Please check bot token configuration.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button 
      variant={isConnected ? "outline" : "default"}
      onClick={handleConnect} 
      className="gap-2"
    >
      {isConnected ? (
        <CheckCircle className="h-4 w-4 text-green-600" />
      ) : (
        <MessageSquare className="h-4 w-4" />
      )}
      {isConnected ? "Slack Connected" : "Test Slack Connection"}
    </Button>
  );
}