import { useState } from "react";
import { Header } from "@/components/Header";
import { ToDoColumn } from "@/components/ToDoColumn";
import { CalendarColumn } from "@/components/CalendarColumn";
import { SlackColumn } from "@/components/SlackColumn";
import { ToDo } from "@/components/ToDoCard";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

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

  const handleConnectGoogle = () => {
    // In a real app, this would trigger OAuth flow
    setIsGoogleConnected(true);
    toast({
      title: "Google Calendar Connected",
      description: "Your calendar events are now synced.",
    });
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
              events={isGoogleConnected ? sampleCalendarEvents : []}
              isConnected={isGoogleConnected}
              onConnect={handleConnectGoogle}
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
    </div>
  );
};

export default Index;
