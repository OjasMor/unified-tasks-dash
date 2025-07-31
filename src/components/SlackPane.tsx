import { useState, useEffect } from "react";
import { MessageSquare, ExternalLink, Copy, Loader2, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { SlackConnectButton } from "./SlackConnectButton";
import { SlackMentions } from "./SlackMentions";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

interface SlackChannel {
  conversation_id: string;
  conversation_name: string;
  conversation_type: string;
  is_channel: boolean;
  latest_message_ts: string;
  latest_message_text: string;
  latest_message_user: string;
  message_count: number;
}

interface SlackMessage {
  id: string;
  message_ts: string;
  text: string;
  username: string;
  user_image?: string;
  slack_created_at: string;
  user_slack_id: string;
}

export function SlackPane() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<SlackChannel | null>(null);
  const [messages, setMessages] = useState<SlackMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      checkSlackConnection();
    }
  }, [user]);

  const checkSlackConnection = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('slack_oauth_tokens')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (data && !error) {
        setIsConnected(true);
        await fetchChannels();
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Error checking Slack connection:', error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChannels = async () => {
    try {
      // Call the Edge Function to fetch channels from Slack API
      const response = await fetch('/api/slack-oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          action: 'fetch_channels',
          userId: user?.id
        })
      });

      const result = await response.json();

      if (result.success) {
        setChannels(result.channels || []);
      } else {
        console.error('Error fetching channels:', result.error);
        toast({
          title: "Error Loading Channels",
          description: result.error || "Failed to load Slack channels",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching channels:', error);
      toast({
        title: "Error Loading Channels",
        description: "Failed to load Slack channels",
        variant: "destructive",
      });
    }
  };

  const loadMessages = async (channel: SlackChannel) => {
    try {
      setIsLoadingMessages(true);
      setSelectedChannel(channel);

      // Call the Edge Function to fetch messages for this channel
      const response = await fetch('/api/slack-oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          action: 'fetch_messages',
          userId: user?.id,
          channelId: channel.conversation_id
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessages(result.messages || []);
      } else {
        toast({
          title: "Error Loading Messages",
          description: result.error || "Failed to load Slack messages",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Error Loading Messages",
        description: "Failed to load Slack messages",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSlackConnect = async () => {
    try {
      await checkSlackConnection();
      if (isConnected) {
        toast({
          title: "Slack Connected",
          description: "Successfully connected to Slack",
        });
      }
    } catch (error) {
      console.error('Error connecting to Slack:', error);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const copySlackLink = (channel: SlackChannel, messageTs?: string) => {
    // Generate actual Slack deep links
    const baseUrl = `https://slack.com/app_redirect?channel=${channel.conversation_id}`;
    const url = messageTs ? `${baseUrl}&message_ts=${messageTs}` : baseUrl;
    
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied",
      description: "Slack link copied to clipboard",
    });
  };

  const openInSlack = (channel: SlackChannel, messageTs?: string) => {
    const baseUrl = `https://slack.com/app_redirect?channel=${channel.conversation_id}`;
    const url = messageTs ? `${baseUrl}&message_ts=${messageTs}` : baseUrl;
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Slack</h2>
        </div>
        <div className="bg-card border border-muted rounded-lg p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading Slack...</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Slack</h2>
        </div>
        
        <div className="bg-card border border-muted rounded-lg p-6 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium text-card-foreground mb-2">
            Connect Your Slack Workspace
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            View your channels, recent messages, and mentions in one place.
          </p>
          <SlackConnectButton onSuccess={handleSlackConnect} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">Slack</h2>
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
      </div>

      <Tabs defaultValue="channels" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="channels" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Channels
          </TabsTrigger>
          <TabsTrigger value="mentions" className="flex items-center gap-2">
            <AtSign className="h-4 w-4" />
            Mentions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Channels List */}
            <div className="space-y-3">
              <h3 className="font-medium text-foreground">Channels & DMs</h3>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {channels.map((channel) => (
                    <div
                      key={channel.conversation_id}
                      className={`bg-card border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${
                        selectedChannel?.conversation_id === channel.conversation_id
                          ? 'border-primary shadow-md'
                          : 'border-muted'
                      }`}
                      onClick={() => loadMessages(channel)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-card-foreground truncate">
                          {channel.is_channel ? '#' : ''}{channel.conversation_name}
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {channel.message_count}
                        </span>
                      </div>
                      
                      {channel.latest_message_text && (
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">{channel.latest_message_user}:</span>{' '}
                          <span className="line-clamp-1">{channel.latest_message_text}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {channel.latest_message_ts && formatTimestamp(channel.latest_message_ts)}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              copySlackLink(channel);
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              openInSlack(channel);
                            }}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {channels.length === 0 && (
                    <div className="bg-card border rounded-lg p-6 text-center">
                      <p className="text-muted-foreground">No channels found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Messages */}
            <div className="space-y-3">
              <h3 className="font-medium text-foreground">
                {selectedChannel ? `Messages in ${selectedChannel.conversation_name}` : 'Select a channel'}
              </h3>
              
              {isLoadingMessages ? (
                <div className="bg-card border rounded-lg p-6 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">Loading messages...</p>
                </div>
              ) : selectedChannel ? (
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className="bg-card border border-muted rounded-lg p-3"
                      >
                        <div className="flex items-start gap-3">
                          {message.user_image ? (
                            <img 
                              src={message.user_image} 
                              alt={message.username}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-muted-foreground">
                                {message.username?.charAt(0)?.toUpperCase() || 'U'}
                              </span>
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-card-foreground text-sm">
                                {message.username}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatTimestamp(message.slack_created_at)}
                              </span>
                            </div>
                            
                            <p className="text-sm text-card-foreground break-words">
                              {message.text}
                            </p>
                            
                            <div className="flex justify-end gap-1 mt-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => copySlackLink(selectedChannel, message.message_ts)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => openInSlack(selectedChannel, message.message_ts)}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {messages.length === 0 && (
                      <div className="bg-card border rounded-lg p-6 text-center">
                        <p className="text-muted-foreground">No messages found</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="bg-card border rounded-lg p-6 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Select a channel to view messages</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="mentions" className="space-y-4">
          {user ? (
            <SlackMentions userId={user.id} />
          ) : (
            <div className="bg-card border border-muted rounded-lg p-6 text-center">
              <AtSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Please sign in to view mentions</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}