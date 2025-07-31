import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

const SUPABASE_URL = "https://dggmyssboghmwytvuuqq.supabase.co";

interface SlackConnectButtonProps {
  onSuccess?: () => void;
}

export function SlackConnectButton({ onSuccess }: SlackConnectButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      console.log('🔄 Starting Slack OAuth process...');

      // Get current user to pass to the OAuth URL
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      console.log('✅ User authenticated:', user.id);

      // Get session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No access token available');
      }
      console.log('✅ Session token available');

      // Use the slack-oauth edge function to handle OAuth
      console.log('📡 Calling edge function...');
      const response = await fetch(`${SUPABASE_URL}/functions/v1/slack-oauth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'initiate_oauth',
          userId: user.id
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

      if (!data.oauth_url) {
        throw new Error('No OAuth URL received from server');
      }

      console.log('✅ Redirecting to Slack OAuth URL');
      // Redirect to Slack OAuth URL
      window.location.href = data.oauth_url;

    } catch (error) {
      console.error('❌ Slack connection error:', error);
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