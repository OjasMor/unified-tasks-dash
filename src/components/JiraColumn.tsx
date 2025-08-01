import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { JiraConnectButton } from "./JiraConnectButton";
import { JiraIssueCard } from "./JiraIssueCard";

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

interface JiraColumnProps {
  onJiraDataUpdate?: (issues: JiraIssue[]) => void;
}

export const JiraColumn = ({ onJiraDataUpdate }: JiraColumnProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const checkConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('has_jira_connection', {
        p_user_id: user.id
      });

      if (error) throw error;
      setIsConnected(data);

      if (data) {
        await loadIssues();
      }
    } catch (error) {
      console.error('Error checking Jira connection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadIssues = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('get_user_jira_issues', {
        p_user_id: user.id,
        p_limit: 15
      });

      if (error) throw error;
      
      setIssues(data || []);
      onJiraDataUpdate?.(data || []);
    } catch (error) {
      console.error('Error loading Jira issues:', error);
      toast({
        title: "Error",
        description: "Failed to load Jira issues.",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('jira-oauth', {
        body: { action: 'fetch_issues' }
      });

      if (error) throw error;

      toast({
        title: "Sync Complete",
        description: `Synced ${data.issuesCount} issues from Jira.`,
      });

      await loadIssues();
    } catch (error) {
      console.error('Error syncing Jira issues:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync issues from Jira.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleConnectionSuccess = () => {
    setIsConnected(true);
    loadIssues();
  };

  useEffect(() => {
    checkConnection();
  }, []);

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Jira Issues
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

  if (!isConnected) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Jira Issues
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ExternalLink className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Connect to Jira</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              Connect your Jira workspace to view and manage your issues directly from your dashboard.
            </p>
            <JiraConnectButton onConnectionSuccess={handleConnectionSuccess} />
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
            <ExternalLink className="h-5 w-5" />
            Jira Issues
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
        {issues.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <ExternalLink className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No issues found</p>
              <p className="text-sm text-muted-foreground/60">
                Issues assigned to you will appear here
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 h-full overflow-y-auto">
            {issues.map((issue) => (
              <JiraIssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};