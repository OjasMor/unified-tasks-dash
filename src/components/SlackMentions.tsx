import { useState, useEffect } from "react";
import { AtSign, ExternalLink, RefreshCw, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface SlackMention {
  id: string;
  conversation_id: string;
  conversation_name: string;
  conversation_type: string;
  is_channel: boolean;
  message_ts: string;
  message_text: string;
  mentioned_by_user_id: string;
  mentioned_by_username: string;
  permalink: string;
  slack_created_at: string;
}

interface SlackMentionsProps {
  userId: string;
}

export function SlackMentions({ userId }: SlackMentionsProps) {
  const [mentions, setMentions] = useState<SlackMention[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasConnection, setHasConnection] = useState(false);
  const { toast } = useToast();

  // Check if user has Slack connection
  useEffect(() => {
    checkSlackConnection();
  }, [userId]);

  const checkSlackConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('slack_oauth_tokens')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (data && !error) {
        setHasConnection(true);
        fetchMentions();
      } else {
        setHasConnection(false);
      }
    } catch (error) {
      console.error('Error checking Slack connection:', error);
      setHasConnection(false);
    }
  };

  const fetchMentions = async () => {
    try {
      setIsLoading(true);
      
      // Call the Supabase Edge Function to fetch mentions
      const response = await fetch('/api/slack-oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          action: 'fetch_mentions',
          userId: userId
        })
      });

      const result = await response.json();

      if (result.success) {
        setMentions(result.mentions || []);
        toast({
          title: "Mentions Updated",
          description: `Found ${result.count} recent mentions`,
        });
      } else {
        toast({
          title: "Error Fetching Mentions",
          description: result.error || "Failed to fetch mentions",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching mentions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch Slack mentions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshMentions = async () => {
    setIsRefreshing(true);
    await fetchMentions();
    setIsRefreshing(false);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const openInSlack = (permalink: string) => {
    window.open(permalink, '_blank');
  };

  const copyPermalink = (permalink: string) => {
    navigator.clipboard.writeText(permalink);
    toast({
      title: "Link Copied",
      description: "Slack message link copied to clipboard",
    });
  };

  if (!hasConnection) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <AtSign className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Slack Mentions</h2>
        </div>
        
        <div className="bg-card border border-muted rounded-lg p-6 text-center">
          <AtSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium text-card-foreground mb-2">
            Connect Slack to View Mentions
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Connect your Slack account to see when others mention you.
          </p>
          <Button variant="outline" onClick={checkSlackConnection}>
            Check Connection
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AtSign className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Slack Mentions</h2>
          <Badge variant="secondary" className="text-xs">
            {mentions.length} mentions
          </Badge>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={refreshMentions}
          disabled={isRefreshing}
          className="gap-2"
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="bg-card border border-muted rounded-lg p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading mentions...</p>
        </div>
      ) : mentions.length > 0 ? (
        <ScrollArea className="h-96">
          <div className="space-y-3">
            {mentions.map((mention) => (
              <div
                key={mention.id}
                className="bg-card border border-muted rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <AtSign className="h-4 w-4 text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-card-foreground text-sm">
                        {mention.mentioned_by_username || 'Unknown User'}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {mention.is_channel ? '#' : ''}{mention.conversation_name}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(mention.slack_created_at)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-card-foreground break-words mb-3">
                      {mention.message_text}
                    </p>
                    
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyPermalink(mention.permalink)}
                        className="h-8 px-2 gap-1"
                      >
                        <MessageSquare className="h-3 w-3" />
                        Copy Link
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openInSlack(mention.permalink)}
                        className="h-8 px-2 gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open in Slack
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="bg-card border border-muted rounded-lg p-6 text-center">
          <AtSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium text-card-foreground mb-2">
            No Recent Mentions
          </h3>
          <p className="text-sm text-muted-foreground">
            You haven't been mentioned recently. Mentions will appear here when others mention you in Slack.
          </p>
        </div>
      )}
    </div>
  );
} 