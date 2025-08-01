import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface JiraIssue {
  id: string;
  issue_key: string;
  summary: string;
  status_name: string;
  priority_name: string | null;
  assignee_display_name: string | null;
  project_name: string;
  due_date: string | null;
  issue_url: string | null;
  updated_at_jira: string | null;
}

const getPriorityColor = (priority: string | null) => {
  if (!priority) return "bg-muted text-muted-foreground";
  
  switch (priority.toLowerCase()) {
    case "highest": return "bg-red-500 text-white";
    case "high": return "bg-orange-500 text-white";
    case "medium": return "bg-yellow-500 text-black";
    case "low": return "bg-blue-500 text-white";
    case "lowest": return "bg-gray-500 text-white";
    default: return "bg-muted text-muted-foreground";
  }
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "to do": return "bg-blue-100 text-blue-800 border-blue-200";
    case "in progress": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "done": return "bg-green-100 text-green-800 border-green-200";
    case "blocked": return "bg-red-100 text-red-800 border-red-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const formatDueDate = (dateString: string | null) => {
  if (!dateString) return null;
  
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) {
    return { text: "Due today", color: "text-red-600" };
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return { text: "Due tomorrow", color: "text-orange-600" };
  } else if (date > today) {
    const diffTime = Math.abs(date.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return { text: `Due in ${diffDays} days`, color: "text-blue-600" };
  } else {
    return { text: "Overdue", color: "text-red-600" };
  }
};

export const JiraAssignedIssues = () => {
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const loadIssues = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.functions.invoke('jira-integration', {
        body: { 
          action: 'getMyIssues',
          jiraEmail: 'user@example.com',
          jiraToken: 'your-jira-token',
          jiraBaseUrl: 'https://your-domain.atlassian.net'
        }
      });

      if (error) throw error;
      
      setIssues(data.issues || []);
    } catch (error) {
      console.error('Error loading Jira issues:', error);
      toast({
        title: "Error",
        description: "Failed to load assigned issues.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadIssues();
      toast({
        title: "Refreshed",
        description: "Assigned issues updated.",
      });
    } catch (error) {
      console.error('Error refreshing Jira issues:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadIssues();
  }, []);

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500 text-white rounded flex items-center justify-center text-sm font-bold">
              J
            </div>
            Assigned Issues
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500 text-white rounded flex items-center justify-center text-sm font-bold">
              J
            </div>
            Assigned Issues
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div className="space-y-3 h-full overflow-y-auto">
          {issues.map((issue) => {
            const dueDate = formatDueDate(issue.due_date);
            
            return (
              <div
                key={issue.id}
                className="bg-blue-50 border border-blue-200 rounded-lg p-4 cursor-pointer hover:bg-blue-100 transition-colors relative"
                onClick={() => issue.issue_url && window.open(issue.issue_url, '_blank')}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-sm text-gray-900 flex-1 pr-8">
                    {issue.summary}
                  </h3>
                  <ExternalLink className="h-4 w-4 text-gray-400 absolute top-4 right-4" />
                </div>
                
                <div className="text-xs text-gray-600 mb-3">
                  {issue.project_name} • {issue.issue_key} • Assigned to {issue.assignee_display_name || 'Unassigned'}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getStatusColor(issue.status_name)}`}
                    >
                      {issue.status_name}
                    </Badge>
                    {issue.priority_name && (
                      <Badge 
                        className={`text-xs ${getPriorityColor(issue.priority_name)}`}
                      >
                        {issue.priority_name}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Today</div>
                    {dueDate && (
                      <div className={`text-xs ${dueDate.color}`}>
                        {dueDate.text}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};