import { Button } from "@/components/ui/button";
import { Calendar, MessageSquare, Check, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

const SUPABASE_URL = "https://dggmyssboghmwytvuuqq.supabase.co";

interface HeaderProps {
  isGoogleConnected: boolean;
  isSlackConnected: boolean;
  onConnectGoogle: () => void;
  onConnectSlack: () => void;
}

export function Header({ 
  isGoogleConnected, 
  isSlackConnected, 
  onConnectGoogle, 
  onConnectSlack 
}: HeaderProps) {
  const { user, signOut } = useAuth();
  const [isConnectingSlack, setIsConnectingSlack] = useState(false);
  const { toast } = useToast();

  const handleSlackConnect = async () => {
    try {
      setIsConnectingSlack(true);
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
          user_id: user.id
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

            <div className="flex items-center gap-2 ml-4 pl-4 border-l border-muted">
              <span className="text-sm text-muted-foreground">
                {user?.email}
              </span>
              <Button 
                variant="ghost" 
                size="icon-sm"
                onClick={signOut}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}