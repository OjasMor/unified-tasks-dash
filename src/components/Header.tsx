import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Check, Loader2, MessageSquare, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

const SUPABASE_URL = "https://dggmyssboghmwytvuuqq.supabase.co";

interface HeaderProps {
  isGoogleConnected: boolean;
  isSlackConnected: boolean;
  isJiraConnected: boolean;
  onConnectGoogle: () => void;
  onConnectSlack: () => void;
}

export function Header({ 
  isGoogleConnected, 
  isSlackConnected, 
  isJiraConnected,
  onConnectGoogle, 
  onConnectSlack 
}: HeaderProps) {
  const [isConnectingSlack, setIsConnectingSlack] = useState(false);
  const { toast } = useToast();

  const handleSlackConnect = async () => {
    try {
      setIsConnectingSlack(true);
      console.log('🔄 Testing Slack bot connection...');

      // Test the bot token connection by fetching channels
      const response = await fetch(`${SUPABASE_URL}/functions/v1/slack-oauth`, {
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
      toast({
        title: "Slack Connected",
        description: "Successfully connected to Slack workspace",
        variant: "default",
      });
      
      onConnectSlack();

    } catch (error) {
      console.error('❌ Slack connection error:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to Slack. Please check bot token configuration.",
        variant: "destructive",
      });
    } finally {
      setIsConnectingSlack(false);
    }
  };

  return (
    <header className="bg-card border-b border-muted card-shadow">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">
            Productivity Pitstop
          </h1>
          
          <div className="flex items-center gap-3">
            <Button 
              variant={isGoogleConnected ? "connected" : "connect"}
              onClick={onConnectGoogle}
              disabled={isGoogleConnected}
              className="gap-2"
            >
              {isGoogleConnected ? (
                <>
                  <Check className="h-4 w-4" />
                  Google Connected
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4" />
                  Connect Google Calendar
                </>
              )}
            </Button>
            
            <Button 
              variant={isSlackConnected ? "connected" : "connect"}
              onClick={handleSlackConnect}
              disabled={isSlackConnected || isConnectingSlack}
              className="gap-2"
            >
              {isSlackConnected ? (
                <>
                  <Check className="h-4 w-4" />
                  Slack Connected
                </>
              ) : isConnectingSlack ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4" />
                  Connect Slack
                </>
              )}
            </Button>

            <Button 
              variant={isJiraConnected ? "connected" : "connect"}
              disabled={isJiraConnected}
              className="gap-2"
            >
              {isJiraConnected ? (
                <>
                  <Check className="h-4 w-4" />
                  Jira Connected
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4" />
                  Jira Available
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}