import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { ToDoColumn } from "@/components/ToDoColumn";
import { CalendarColumn } from "@/components/CalendarColumn";
import { SlackColumn } from "@/components/SlackColumn";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ToDo } from "@/components/ToDoCard";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { GoogleCalendarService, GoogleCalendarEvent } from '@/integrations/google/calendar';
import { ChatBot } from '@/components/ChatBot';

// Sample data for demo purposes
const sampleCalendarEvents = [
  {
    id: "1",
    title: "Team Standup",
    startTime: "9:00 AM",
    endTime: "9:30 AM",
    link: "https://calendar.google.com"
  },
  {
    id: "2", 
    title: "Product Review Meeting",
    startTime: "2:00 PM",
    endTime: "3:30 PM",
    link: "https://calendar.google.com"
  },
  {
    id: "3",
    title: "1:1 with Manager",
    startTime: "4:00 PM", 
    endTime: "4:30 PM",
    link: "https://calendar.google.com"
  }
];

const sampleSlackMentions = [
  {
    id: "1",
    message: "@john can you review the new designs? We need your feedback before the client meeting tomorrow.",
    sender: "Sarah Chen",
    channel: "design-team",
    timestamp: "2 hours ago",
    link: "https://slack.com"
  },
  {
    id: "2",
    message: "Hey @john, the API endpoint is ready for testing. Let me know if you need any help integrating it.",
    sender: "Mike Rodriguez", 
    channel: "development",
    timestamp: "4 hours ago",
    link: "https://slack.com"
  },
  {
    id: "3",
    message: "@john don't forget about the quarterly planning session next week. Please prepare your team's roadmap.",
    sender: "Lisa Park",
    channel: "management",
    timestamp: "1 day ago", 
    link: "https://slack.com"
  }
];

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const [todos, setTodos] = useState<ToDo[]>([
    {
      id: "1",
      title: "Review quarterly budget proposal",
      description: "Go through the Q4 budget proposal and provide feedback on the marketing spend allocation.",
      deadline: new Date("2025-08-05"),
      completed: false
    },
    {
      id: "2", 
      title: "Prepare presentation for client meeting",
      deadline: new Date("2025-08-02"),
      completed: false
    },
    {
      id: "3",
      title: "Set up development environment",
      description: "Install Node.js, configure VS Code, and clone the project repository.",
      completed: true
    }
  ]);
  
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isSlackConnected, setIsSlackConnected] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const { toast } = useToast();

  const [authLoading, setAuthLoading] = useState(false);

  // Check for calendar access and fetch events when user is authenticated
  useEffect(() => {
    const checkCalendarAccess = async () => {
      if (user && !isGoogleConnected) {
        try {
          setCalendarLoading(true);
          const hasAccess = await GoogleCalendarService.checkCalendarAccess();
          
          if (hasAccess) {
            setIsGoogleConnected(true);
            const events = await GoogleCalendarService.fetchTodayEvents();
            setCalendarEvents(events);
          }
        } catch (error) {
          console.error('Error checking calendar access:', error);
        } finally {
          setCalendarLoading(false);
        }
      }
    };

    checkCalendarAccess();
  }, [user, isGoogleConnected]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  const handleGoogleLogin = async () => {
    try {
      setAuthLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          scopes: 'openid profile email https://www.googleapis.com/auth/calendar.readonly'
        }
      });

      if (error) {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Login failed",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setAuthLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-card rounded-lg card-shadow p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Welcome to Productivity Pitstop
            </h1>
            <p className="text-muted-foreground">
              Sign in with Google to access your dashboard
            </p>
          </div>
          
          <Button 
            onClick={handleGoogleLogin}
            disabled={authLoading}
            className="w-full gap-2"
            size="lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {authLoading ? 'Signing in...' : 'Continue with Google'}
          </Button>
        </div>
      </div>
    );
  }

  const handleAddTodo = (task: {
    title: string;
    description?: string;
    deadline?: Date;
  }) => {
    const newTodo: ToDo = {
      id: Date.now().toString(),
      ...task,
      completed: false
    };
    setTodos(prev => [newTodo, ...prev]);
    toast({
      title: "Task added",
      description: "Your new task has been added to the list.",
    });
  };

  const handleToggleComplete = (id: string) => {
    setTodos(prev => prev.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const handleDeleteTodo = (id: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== id));
    toast({
      title: "Task deleted",
      description: "The task has been removed from your list.",
    });
  };

  const handleConnectGoogle = async () => {
    try {
      setCalendarLoading(true);
      const hasAccess = await GoogleCalendarService.checkCalendarAccess();
      
      if (hasAccess) {
        setIsGoogleConnected(true);
        const events = await GoogleCalendarService.fetchTodayEvents();
        setCalendarEvents(events);
        toast({
          title: "Google Calendar Connected",
          description: "Your calendar events are now synced.",
        });
      } else {
        toast({
          title: "Calendar Access Required",
          description: "Please sign in with Google and grant calendar access.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error);
      toast({
        title: "Connection Failed",
        description: "Unable to connect to Google Calendar. Please try again.",
        variant: "destructive"
      });
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleConnectSlack = () => {
    // In a real app, this would trigger OAuth flow
    setIsSlackConnected(true);
    toast({
      title: "Slack Connected", 
      description: "Your mentions are now being tracked.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        isGoogleConnected={isGoogleConnected}
        isSlackConnected={isSlackConnected}
        onConnectGoogle={handleConnectGoogle}
        onConnectSlack={handleConnectSlack}
      />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
          {/* To-Do Column - 40% on large screens */}
          <div className="lg:col-span-4">
            <ToDoColumn
              todos={todos}
              onAddTodo={handleAddTodo}
              onToggleComplete={handleToggleComplete}
              onDeleteTodo={handleDeleteTodo}
            />
          </div>
          
          {/* Calendar Column - 30% on large screens */}
          <div className="lg:col-span-3">
            <CalendarColumn
              events={isGoogleConnected ? calendarEvents : []}
              isConnected={isGoogleConnected}
              onConnect={handleConnectGoogle}
              isLoading={calendarLoading}
            />
          </div>
          
          {/* Slack Column - 30% on large screens */}
          <div className="lg:col-span-3">
            <SlackColumn
              mentions={isSlackConnected ? sampleSlackMentions : []}
              isConnected={isSlackConnected}
              onConnect={handleConnectSlack}
            />
          </div>
        </div>
      </main>
      
      <ChatBot 
        dashboardContext={{
          todos,
          calendarEvents: isGoogleConnected ? calendarEvents : [],
          slackMentions: isSlackConnected ? sampleSlackMentions : []
        }}
      />
    </div>
  );
};

export default Index;
