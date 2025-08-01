import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Minimize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatBotProps {
  dashboardContext: {
    todos: any[];
    calendarEvents: any[];
    slackMentions?: any[];
    jiraIssues?: any[];
    slackData?: {
      channels: any[];
      messages: any[];
      mentions: any[];
      isConnected: boolean;
    };
  };
}

const formatMessage = (text: string) => {
  // Split text by lines and format each line
  const lines = text.split('\n');
  return lines.map((line, index) => {
    // Handle numbered lists (1. 2. etc.)
    if (/^\d+\.\s/.test(line)) {
      return (
        <div key={index} className="font-semibold text-foreground mb-2">
          {line}
        </div>
      );
    }
    
    // Handle bold text (**text**)
    const boldRegex = /\*\*(.*?)\*\*/g;
    const parts = line.split(boldRegex);
    const formattedLine = parts.map((part, partIndex) => {
      if (partIndex % 2 === 1) {
        return <strong key={partIndex} className="font-semibold">{part}</strong>;
      }
      
      // Handle links
      const urlRegex = /(https?:\/\/[^\s)]+)/g;
      const linkParts = part.split(urlRegex);
      return linkParts.map((linkPart, linkIndex) => {
        if (urlRegex.test(linkPart)) {
          return (
            <a
              key={linkIndex}
              href={linkPart}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline break-all"
            >
              {linkPart.length > 50 ? `${linkPart.substring(0, 50)}...` : linkPart}
            </a>
          );
        }
        return linkPart;
      });
    });
    
    return (
      <div key={index} className={index < lines.length - 1 ? "mb-1" : ""}>
        {formattedLine}
      </div>
    );
  });
};

export const ChatBot = ({ dashboardContext }: ChatBotProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm your executive assistant. I can help you prioritize your day, analyze your schedule, and answer questions about your dashboard. What would you like to know?",
      sender: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (customMessage?: string, displayMessage?: string) => {
    const messageToSend = customMessage || inputValue;
    const messageToDisplay = displayMessage || messageToSend;
    if (!messageToSend.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageToDisplay,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-assistant', {
        body: {
          message: messageToSend,
          context: dashboardContext
        }
      });

      if (error) throw error;

      console.log('📤 Chat context sent:', {
        messageLength: messageToSend.length,
        todosCount: dashboardContext.todos?.length || 0,
        calendarEventsCount: dashboardContext.calendarEvents?.length || 0,
        slackMentionsCount: dashboardContext.slackMentions?.length || 0,
        slackData: {
          channelsCount: dashboardContext.slackData?.channels?.length || 0,
          messagesCount: dashboardContext.slackData?.messages?.length || 0,
          mentionsCount: dashboardContext.slackData?.mentions?.length || 0,
          isConnected: dashboardContext.slackData?.isConnected || false
        }
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.message,
        sender: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[450px] h-[600px] bg-card border border-border rounded-lg shadow-lg flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Executive Assistant</h3>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-lg ${
                      message.sender === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {formatMessage(message.text)}
                    </div>
                    <span className="text-xs opacity-70 mt-1 block">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted text-muted-foreground p-3 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Pre-filled Questions */}
          <div className="px-4 pb-3 border-t border-border">
            <div className="flex gap-2 mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSendMessage("Give me a high level and detailed summary of my day including tasks pending, done, calendar invites, and slack summary", "Summarize my day")}
                disabled={isLoading}
                className="flex-1 text-xs"
              >
                Summary My Day
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSendMessage("Use common sense and my calendar info and slack mentions to prioritize important tasks for my day. Clearly mention parts of the day that are not booked up", "Prioritize my day")}
                disabled={isLoading}
                className="flex-1 text-xs"
              >
                Prioritize My Day
              </Button>
            </div>
          </div>

          {/* Input */}
          <div className="px-4 pb-4">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your schedule, todos..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isLoading}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};