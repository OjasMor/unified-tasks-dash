import { useState, useEffect } from "react";
import { MessageSquare, ExternalLink, Copy, Loader2, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { SlackConnectButton } from "./SlackConnectButton";
import { SlackMentions } from "./SlackMentions";
import { useAuth } from "@/hooks/useAuth";

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

// Mock data for demonstration
const mockChannels: SlackChannel[] = [
  {
    conversation_id: "general",
    conversation_name: "general",
    conversation_type: "public_channel",
    is_channel: true,
    latest_message_ts: "2025-01-31T22:00:00.000Z",
    latest_message_text: "Great work on the new feature!",
    latest_message_user: "Sarah Chen",
    message_count: 15
  },
  {
    conversation_id: "design-team",
    conversation_name: "design-team",
    conversation_type: "private_channel",
    is_channel: true,
    latest_message_ts: "2025-01-31T21:30:00.000Z",
    latest_message_text: "Can you review the new designs?",
    latest_message_user: "Mike Rodriguez",
    message_count: 8
  },
  {
    conversation_id: "development",
    conversation_name: "development",
    conversation_type: "public_channel",
    is_channel: true,
    latest_message_ts: "2025-01-31T21:00:00.000Z",
    latest_message_text: "API endpoint is ready for testing",
    latest_message_user: "Lisa Park",
    message_count: 12
  }
];

const mockMessages: SlackMessage[] = [
  {
    id: "1",
    message_ts: "2025-01-31T22:00:00.000Z",
    text: "Great work on the new feature! The UI looks really clean.",
    username: "Sarah Chen",
    user_image: "https://via.placeholder.com/32",
    slack_created_at: "2025-01-31T22:00:00.000Z",
    user_slack_id: "U123456"
  },
  {
    id: "2",
    message_ts: "2025-01-31T21:45:00.000Z",
    text: "Thanks! I spent a lot of time on the user experience.",
    username: "John Doe",
    user_image: "https://via.placeholder.com/32",
    slack_created_at: "2025-01-31T21:45:00.000Z",
    user_slack_id: "U789012"
  },
  {
    id: "3",
    message_ts: "2025-01-31T21:30:00.000Z",
    text: "When will this be ready for testing?",
    username: "Mike Rodriguez",
    user_image: "https://via.placeholder.com/32",
    slack_created_at: "2025-01-31T21:30:00.000Z",
    user_slack_id: "U345678"
  }
];

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
    // Simulate loading
    setTimeout(() => {
      setIsLoading(false);
      // For demo purposes, show as connected with mock data
      setIsConnected(true);
      setChannels(mockChannels);
    }, 1000);
  }, []);

  const loadMessages = async (channel: SlackChannel) => {
    try {
      setIsLoadingMessages(true);
      setSelectedChannel(channel);

      // Simulate API call delay
      setTimeout(() => {
        setMessages(mockMessages);
        setIsLoadingMessages(false);
      }, 500);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Error Loading Messages",
        description: "Failed to load Slack messages",
        variant: "destructive",
      });
      setIsLoadingMessages(false);
    }
  };

  const handleSlackConnect = () => {
    setIsConnected(true);
    setChannels(mockChannels);
    toast({
      title: "Slack Connected",
      description: "Successfully connected to Slack (demo mode)",
    });
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const copySlackLink = (channel: SlackChannel, messageTs?: string) => {
    // This would generate actual Slack deep links in production
    const baseUrl = `slack://channel?team=TEAM_ID&id=${channel.conversation_id}`;
    const url = messageTs ? `${baseUrl}&message=${messageTs}` : baseUrl;
    
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied",
      description: "Slack link copied to clipboard",
    });
  };

  const openInSlack = (channel: SlackChannel, messageTs?: string) => {
    const baseUrl = `slack://channel?team=TEAM_ID&id=${channel.conversation_id}`;
    const url = messageTs ? `${baseUrl}&message=${messageTs}` : baseUrl;
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
        <span className="text-xs text-muted-foreground">(Demo Mode)</span>
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