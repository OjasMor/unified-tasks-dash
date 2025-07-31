import { MessageSquare, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SlackMention {
  id: string;
  message: string;
  sender: string;
  channel: string;
  timestamp: string;
  link?: string;
}

interface SlackColumnProps {
  mentions: SlackMention[];
  isConnected: boolean;
  onConnect: () => void;
}

export function SlackColumn({ mentions, isConnected, onConnect }: SlackColumnProps) {
  if (!isConnected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Slack Mentions</h2>
        </div>
        
        <div className="bg-card border border-muted rounded-lg p-6 card-shadow text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium text-card-foreground mb-2">
            Connect Your Slack Workspace
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Stay on top of messages where you've been mentioned.
          </p>
          <Button variant="default" onClick={onConnect} className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Connect Slack
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">Slack Mentions</h2>
      </div>

      <div className="space-y-3">
        {mentions.length === 0 ? (
          <div className="bg-card border border-muted rounded-lg p-6 card-shadow text-center">
            <p className="text-muted-foreground">No recent mentions</p>
          </div>
        ) : (
          mentions.map((mention) => (
            <div
              key={mention.id}
              className="bg-card border border-muted rounded-lg p-4 card-shadow hover:card-shadow-hover transition-all"
            >
              <div className="space-y-2">
                <p className="text-sm text-card-foreground line-clamp-3">
                  {mention.message}
                </p>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    From: <span className="font-medium">{mention.sender}</span> in{" "}
                    <span className="font-medium">#{mention.channel}</span>
                  </span>
                  
                  {mention.link && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 text-xs hover:text-primary"
                      asChild
                    >
                      <a href={mention.link} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View on Slack
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}