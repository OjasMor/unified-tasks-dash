import { Button } from "@/components/ui/button";
import { Calendar, MessageSquare, Check, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

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
              onClick={onConnectSlack}
              disabled={isSlackConnected}
              className="gap-2"
            >
              {isSlackConnected ? (
                <>
                  <Check className="h-4 w-4" />
                  Slack Connected
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