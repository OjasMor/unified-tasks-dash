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
  id: string;
  name: string;
  latest_message: string;
  latest_message_ts: string;
  unread_count: number;
  is_channel?: boolean;
}

interface SlackMessage {
  id: string;
  timestamp: string;
  text: string;
  username: string;
  user_image?: string;
}

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

interface SlackPaneProps {
  onMentionsUpdate?: (mentions: SlackMention[]) => void;
  onSlackDataUpdate?: (slackData: {
    channels: SlackChannel[];
    messages: SlackMessage[];
    mentions: SlackMention[];
    isConnected: boolean;
  }) => void;
}

export function SlackPane({ onMentionsUpdate, onSlackDataUpdate }: SlackPaneProps) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<SlackChannel | null>(null);
  const [messages, setMessages] = useState<SlackMessage[]>([]);
  const [allChannelMessages, setAllChannelMessages] = useState<Record<string, SlackMessage[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [mentions, setMentions] = useState<SlackMention[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      checkSlackConnection();
    }
  }, [user]);

  // Notify parent component when any Slack data changes
  useEffect(() => {
    if (onSlackDataUpdate) {
      // Aggregate all messages from all channels
      const allMessages = Object.values(allChannelMessages).flat();
      onSlackDataUpdate({
        channels,
        messages: allMessages,
        mentions,
        isConnected
      });
    }
  }, [channels, allChannelMessages, mentions, isConnected, onSlackDataUpdate]);

  // Fetch mentions when connected and notify parent component
  useEffect(() => {
    if (isConnected && onMentionsUpdate) {
      fetchMentions();
    }
  }, [isConnected, onMentionsUpdate]);

  // Notify parent component when mentions change
  useEffect(() => {
    if (onMentionsUpdate) {
      onMentionsUpdate(mentions);
    }
  }, [mentions, onMentionsUpdate]);

  const fetchMentions = async () => {
    try {
      console.log('🔄 Fetching all messages from all channels to find mentions...');

      // Get user's first and last name from their profile
      const { firstName, lastName } = getUserFullName(user);
      console.log('👤 User name:', { firstName, lastName });

      // First, get all channels
      const channelsResponse = await fetch('https://dggmyssboghmwytvuuqq.supabase.co/functions/v1/slack-oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'fetch_channels',
          userId: user?.id || 'test-user'
        })
      });

      if (!channelsResponse.ok) {
        throw new Error('Failed to fetch channels');
      }

      const channelsData = await channelsResponse.json();
      if (!channelsData.success) {
        throw new Error(channelsData.error || 'Failed to fetch channels');
      }

      const channels = channelsData.channels || [];
      console.log(`📋 Found ${channels.length} channels to scan`);

      // Fetch messages from all channels
      const allMessages: any[] = [];

      for (const channel of channels) {
        try {
          console.log(`📝 Fetching messages from channel: ${channel.conversation_name}`);

          const messagesResponse = await fetch('https://dggmyssboghmwytvuuqq.supabase.co/functions/v1/slack-oauth', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'fetch_messages',
              userId: user?.id || 'test-user',
              channelId: channel.conversation_id
            })
          });

          if (messagesResponse.ok) {
            const messagesData = await messagesResponse.json();
            if (messagesData.success && messagesData.messages) {
              // Add channel info to each message
              const messagesWithChannel = messagesData.messages.map((msg: any) => ({
                ...msg,
                conversation_id: channel.conversation_id,
                conversation_name: channel.conversation_name,
                conversation_type: channel.conversation_type
              }));
              allMessages.push(...messagesWithChannel);
            }
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`Error fetching messages from channel ${channel.conversation_name}:`, error);
        }
      }

      console.log(`📊 Total messages fetched: ${allMessages.length}`);

      // Filter messages that contain mentions of the user
      const mentions = allMessages.filter(message =>
        containsUserMention(message.text, firstName, lastName)
      );

      console.log(`👤 Found ${mentions.length} mentions out of ${allMessages.length} messages`);

      // Format mentions to match the expected structure
      const formattedMentions = mentions.map(message => ({
        id: `${message.conversation_id}-${message.message_ts}`,
        conversation_id: message.conversation_id,
        conversation_name: message.conversation_name,
        conversation_type: message.conversation_type,
        is_channel: message.conversation_type === 'public_channel' || message.conversation_type === 'private_channel',
        message_ts: message.message_ts,
        message_text: message.text,
        mentioned_by_user_id: message.user_slack_id,
        mentioned_by_username: message.username,
        permalink: `https://slack.com/app_redirect?channel=${message.conversation_id}&message_ts=${message.message_ts}`,
        slack_created_at: message.slack_created_at
      }));

      setMentions(formattedMentions);
      console.log('✅ Mentions processed and set');

    } catch (error) {
      console.error('❌ Error fetching mentions:', error);
    }
  };

  // Helper function to extract user's first and last name
  const getUserFullName = (user: any): { firstName: string; lastName: string } => {
    // Try to get from user_metadata first
    if (user?.user_metadata) {
      const metadata = user.user_metadata;
      if (metadata.full_name) {
        const nameParts = metadata.full_name.split(' ');
        return {
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || ''
        };
      }
      if (metadata.first_name && metadata.last_name) {
        return {
          firstName: metadata.first_name,
          lastName: metadata.last_name
        };
      }
    }

    // Try to get from email (common pattern: firstname.lastname@domain.com)
    if (user?.email) {
      const emailName = user.email.split('@')[0];
      const nameParts = emailName.split('.');
      if (nameParts.length >= 2) {
        return {
          firstName: nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1),
          lastName: nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1)
        };
      }
    }

    // Fallback to email username
    if (user?.email) {
      const emailName = user.email.split('@')[0];
      return {
        firstName: emailName.charAt(0).toUpperCase() + emailName.slice(1),
        lastName: ''
      };
    }

    // Final fallback
    return {
      firstName: 'User',
      lastName: ''
    };
  };

  // Helper function to check if a message contains a mention of the user
  const containsUserMention = (messageText: string, firstName: string, lastName: string): boolean => {
    if (!messageText) return false;

    // Create patterns to match @FirstName LastName format
    const patterns = [
      new RegExp(`@${firstName}\\s+${lastName}`, 'i'),
      new RegExp(`@${firstName}`, 'i'),
      new RegExp(`@${firstName}${lastName}`, 'i')
    ];

    // If no last name, just check for first name
    if (!lastName) {
      patterns.push(new RegExp(`@${firstName}\\b`, 'i'));
    }

    return patterns.some(pattern => pattern.test(messageText));
  };

  const checkSlackConnection = async () => {
    try {
      setIsLoading(true);

      // Test bot token connection by fetching channels
      const response = await fetch('https://dggmyssboghmwytvuuqq.supabase.co/functions/v1/slack-oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'fetch_channels',
          userId: user?.id || 'test-user'
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (!data.error) {
          setIsConnected(true);
          // Load actual channels from Slack
          await loadChannels();
        } else {
          setIsConnected(false);
        }
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

  const loadChannels = async () => {
    try {
      const response = await fetch('https://dggmyssboghmwytvuuqq.supabase.co/functions/v1/slack-oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'fetch_channels',
          userId: user?.id || 'test-user'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Convert the channels data to match our interface
      const slackChannels = data.channels?.map((channel: any) => ({
        id: channel.conversation_id,
        name: channel.conversation_name,
        latest_message: channel.last_message_text || '',
        latest_message_ts: channel.last_message_ts ? new Date(parseFloat(channel.last_message_ts) * 1000).toISOString() : new Date().toISOString(),
        unread_count: 0,
        is_channel: channel.conversation_type === 'public_channel' || channel.conversation_type === 'private_channel'
      })) || [];

      setChannels(slackChannels);

      // Load messages for all channels on startup
      await loadAllChannelMessages(slackChannels);
    } catch (error) {
      console.error('Error loading Slack channels:', error);
      toast({
        title: "Error Loading Channels",
        description: error instanceof Error ? error.message : "Failed to load Slack channels",
        variant: "destructive",
      });
    }
  };

  const loadAllChannelMessages = async (channelsToLoad: SlackChannel[]) => {
    const messagePromises = channelsToLoad.map(async (channel) => {
      try {
        const response = await fetch('https://dggmyssboghmwytvuuqq.supabase.co/functions/v1/slack-oauth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'fetch_messages',
            userId: user?.id || 'test-user',
            channelId: channel.id
          })
        });

        if (!response.ok) {
          console.error(`Failed to load messages for channel ${channel.name}`);
          return { channelId: channel.id, messages: [] };
        }

        const data = await response.json();

        if (data.error) {
          console.error(`Error loading messages for channel ${channel.name}:`, data.error);
          return { channelId: channel.id, messages: [] };
        }

        const slackMessages = data.messages?.map((message: any) => ({
          id: message.id,
          timestamp: message.slack_created_at || new Date(parseFloat(message.message_ts) * 1000).toISOString(),
          text: message.text,
          username: message.username || 'Unknown User',
          user_image: message.user_image || ''
        })) || [];

        return { channelId: channel.id, messages: slackMessages };
      } catch (error) {
        console.error(`Error loading messages for channel ${channel.name}:`, error);
        return { channelId: channel.id, messages: [] };
      }
    });

    const results = await Promise.all(messagePromises);
    const messagesMap: Record<string, SlackMessage[]> = {};

    results.forEach(({ channelId, messages }) => {
      messagesMap[channelId] = messages;
    });

    setAllChannelMessages(messagesMap);
  };

  const loadMessages = async (channel: SlackChannel) => {
    setSelectedChannel(channel);
    // Use pre-loaded messages if available, otherwise load fresh
    if (allChannelMessages[channel.id]) {
      setMessages(allChannelMessages[channel.id]);
    } else {
      try {
        setIsLoadingMessages(true);

        const response = await fetch('https://dggmyssboghmwytvuuqq.supabase.co/functions/v1/slack-oauth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'fetch_messages',
            userId: user?.id || 'test-user',
            channelId: channel.id
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        const slackMessages = data.messages?.map((message: any) => ({
          id: message.id,
          timestamp: message.slack_created_at || new Date(parseFloat(message.message_ts) * 1000).toISOString(),
          text: message.text,
          username: message.username || 'Unknown User',
          user_image: message.user_image || ''
        })) || [];

        setMessages(slackMessages);
        // Cache the messages
        setAllChannelMessages(prev => ({ ...prev, [channel.id]: slackMessages }));
      } catch (error) {
        console.error('Error loading messages:', error);
        toast({
          title: "Error Loading Messages",
          description: error instanceof Error ? error.message : "Failed to load messages",
          variant: "destructive",
        });
        setMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    }
  };

  const handleSlackConnect = async () => {
    try {
      await checkSlackConnection();
      toast({
        title: "Slack Connected",
        description: "Successfully connected to Slack",
      });
    } catch (error) {
      console.error('Error connecting to Slack:', error);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const copySlackLink = (channel: SlackChannel, messageTs?: string) => {
    // Generate actual Slack deep links
    const baseUrl = `https://slack.com/app_redirect?channel=${channel.id}`;
    const url = messageTs ? `${baseUrl}&message_ts=${messageTs}` : baseUrl;

    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied",
      description: "Slack link copied to clipboard",
    });
  };

  const openInSlack = (channel: SlackChannel, messageTs?: string) => {
    const baseUrl = `https://slack.com/app_redirect?channel=${channel.id}`;
    const url = messageTs ? `${baseUrl}&message_ts=${messageTs}` : baseUrl;
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Slack
          </h2>
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        </div>
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Slack
          </h2>
        </div>
        <div className="text-center space-y-4 py-8">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-medium">Connect to Slack</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Connect your Slack workspace to view channels and messages
            </p>
          </div>
          <SlackConnectButton onSuccess={handleSlackConnect} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Slack
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMentions}
            className="text-xs"
          >
            Refresh Mentions
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSlackConnect}
            className="text-xs"
          >
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="channels" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="mentions" className="flex items-center gap-1">
            <AtSign className="h-3 w-3" />
            Mentions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Channels</h3>
              <ScrollArea className="h-64">
                <div className="space-y-1">
                  {channels.map((channel) => (
                    <div
                      key={channel.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedChannel?.id === channel.id
                        ? 'bg-accent border-accent-foreground'
                        : 'hover:bg-accent/50'
                        }`}
                      onClick={() => loadMessages(channel)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            #{channel.name}
                          </span>
                          {channel.is_channel && (
                            <span className="text-xs text-muted-foreground">
                              Channel
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
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
                            onClick={(e) => {
                              e.stopPropagation();
                              openInSlack(channel);
                            }}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {channel.latest_message && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {channel.latest_message}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Messages</h3>
              <ScrollArea className="h-64">
                {selectedChannel ? (
                  <div className="space-y-2">
                    {isLoadingMessages ? (
                      <div className="flex items-center justify-center h-32">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : messages.length > 0 ? (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className="p-3 rounded-lg border space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {message.user_image && (
                                <img
                                  src={message.user_image}
                                  alt={message.username}
                                  className="w-6 h-6 rounded-full"
                                />
                              )}
                              <span className="text-sm font-medium">
                                {message.username}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatTimestamp(message.timestamp)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copySlackLink(selectedChannel, message.timestamp)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openInSlack(selectedChannel, message.timestamp)}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm">{message.text}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        No messages in this channel
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Select a channel to view messages
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="mentions">
          <SlackMentions
            onMentionsUpdate={onMentionsUpdate}
            mentions={mentions}
            onRefreshMentions={fetchMentions}
            isRefreshing={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}