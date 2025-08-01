import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, AlertCircle, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface JiraIssue {
  key: string;
  summary: string;
  status: string;
  priority: string;
  project: string;
  dueDate?: string;
  created: string;
  updated: string;
  url: string;
}

export function JiraAssignedWidget() {
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJiraIssues();
  }, []);

  const fetchJiraIssues = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('jira-assigned-issues');

      if (error) {
        console.error('Error calling Jira function:', error);
        setError('Failed to fetch Jira issues');
        return;
      }

      if (data?.error) {
        setError(data.error);
        return;
      }

      setIssues(data?.issues || []);
    } catch (err) {
      console.error('Error fetching Jira issues:', err);
      setError('Failed to fetch Jira issues');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'highest':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-black';
      case 'low':
        return 'bg-blue-500 text-white';
      case 'lowest':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'to do':
      case 'open':
        return 'bg-slate-500 text-white';
      case 'in progress':
        return 'bg-blue-500 text-white';
      case 'done':
      case 'closed':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString();
  };

  const isOverdue = (dueDate: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-blue-500" />
          My Assigned Issues
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && issues.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">No assigned issues found</p>
          </div>
        )}

        {!loading && !error && issues.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {issues.map((issue) => (
              <div
                key={issue.key}
                className="p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">
                      {issue.key}: {issue.summary}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {issue.project}
                    </p>
                  </div>
                  <a
                    href={issue.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 p-1 hover:bg-muted rounded"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="flex flex-wrap gap-1 mb-2">
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${getPriorityColor(issue.priority)}`}
                  >
                    {issue.priority}
                  </Badge>
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${getStatusColor(issue.status)}`}
                  >
                    {issue.status}
                  </Badge>
                </div>

                {issue.dueDate && (
                  <div className={`flex items-center gap-1 text-xs ${
                    isOverdue(issue.dueDate) ? 'text-red-500' : 'text-muted-foreground'
                  }`}>
                    <Calendar className="h-3 w-3" />
                    Due: {formatDate(issue.dueDate)}
                    {isOverdue(issue.dueDate) && ' (Overdue)'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}