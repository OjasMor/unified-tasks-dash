import { useState, useEffect } from "react";
import { AtSign, ExternalLink, RefreshCw, Loader2, MessageSquare, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

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
  userId?: string;
  onMentionsUpdate?: (mentions: SlackMention[]) => void;
}

export function SlackMentions({ userId, onMentionsUpdate }: SlackMentionsProps) {
  const { user } = useAuth();
  const [mentions, setMentions] = useState<SlackMention[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasConnection, setHasConnection] = useState(false);
  const { toast } = useToast();

  const currentUserId = userId || user?.id || 'test-user';

  // Check if user has Slack connection
  useEffect(() => {
    checkSlackConnection();
  }, [currentUserId]);

  // Notify parent component when mentions change
  useEffect(() => {
    if (onMentionsUpdate) {
      onMentionsUpdate(mentions);
    }
  }, [mentions, onMentionsUpdate]);

  const checkSlackConnection = async () => {
    try {
      // Test bot token connection by fetching mentions
      const response = await fetch('https://dggmyssboghmwytvuuqq.supabase.co/functions/v1/slack-oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'fetch_mentions',
          userId: currentUserId
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (!data.error) {
          setHasConnection(true);
          fetchMentions();
        } else {
          setHasConnection(false);
        }
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
      const response = await fetch('https://dggmyssboghmwytvuuqq.supabase.co/functions/v1/slack-oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'fetch_mentions',
          userId: currentUserId
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
      description: "Slack link copied to clipboard",
    });
  };

  if (!hasConnection) {
    return (
      <div className="text-center space-y-4 py-8">
        <AtSign className="h-12 w-12 mx-auto text-muted-foreground" />
        <div>
          <h3 className="text-lg font-medium">No Slack Connection</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Connect to Slack to view your mentions
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Recent Mentions</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshMentions}
          disabled={isRefreshing}
          className="text-xs"
        >
          {isRefreshing ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <RefreshCw className="h-3 w-3 mr-1" />
          )}
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : mentions.length > 0 ? (
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {mentions.map((mention) => (
              <div
                key={mention.id}
                className="p-4 rounded-lg border space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <AtSign className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">
                      {mention.mentioned_by_username}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {mention.conversation_type === 'private_channel' ? 'Private' : 'Public'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyPermalink(mention.permalink)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openInSlack(mention.permalink)}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MessageSquare className="h-3 w-3" />
                    <span>#{mention.conversation_name}</span>
                    <span>•</span>
                    <span>{formatTimestamp(mention.slack_created_at)}</span>
                  </div>
                  
                  <p className="text-sm leading-relaxed">
                    {mention.message_text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center space-y-4 py-8">
          <AtSign className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-medium">No Mentions Found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              You haven't been mentioned recently
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 