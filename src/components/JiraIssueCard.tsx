import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Calendar, User } from "lucide-react";

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

interface JiraIssueCardProps {
  issue: JiraIssue;
}

const getPriorityColor = (priority: string | null) => {
  switch (priority?.toLowerCase()) {
    case 'highest':
      return 'bg-destructive text-destructive-foreground';
    case 'high':
      return 'bg-orange-500 text-white';
    case 'medium':
      return 'bg-yellow-500 text-white';
    case 'low':
      return 'bg-green-500 text-white';
    case 'lowest':
      return 'bg-gray-500 text-white';
    default:
      return 'bg-secondary text-secondary-foreground';
  }
};

const getStatusColor = (status: string) => {
  const lowerStatus = status.toLowerCase();
  if (lowerStatus.includes('done') || lowerStatus.includes('closed') || lowerStatus.includes('resolved')) {
    return 'bg-green-100 text-green-800 border-green-200';
  }
  if (lowerStatus.includes('progress') || lowerStatus.includes('active')) {
    return 'bg-blue-100 text-blue-800 border-blue-200';
  }
  if (lowerStatus.includes('todo') || lowerStatus.includes('open') || lowerStatus.includes('backlog')) {
    return 'bg-gray-100 text-gray-800 border-gray-200';
  }
  return 'bg-yellow-100 text-yellow-800 border-yellow-200';
};

export const JiraIssueCard = ({ issue }: JiraIssueCardProps) => {
  const handleOpenIssue = () => {
    if (issue.issue_url) {
      window.open(issue.issue_url, '_blank');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleOpenIssue}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-mono text-muted-foreground">{issue.issue_key}</span>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </div>
            <h4 className="text-sm font-medium line-clamp-2 leading-tight">
              {issue.summary}
            </h4>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          <Badge variant="outline" className={getStatusColor(issue.status_name)}>
            {issue.status_name}
          </Badge>
          {issue.priority_name && (
            <Badge className={getPriorityColor(issue.priority_name)}>
              {issue.priority_name}
            </Badge>
          )}
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1">
            <span className="font-medium">{issue.project_name}</span>
          </div>
          
          {issue.assignee_display_name && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{issue.assignee_display_name}</span>
            </div>
          )}
          
          {issue.due_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Due: {formatDate(issue.due_date)}</span>
            </div>
          )}
          
          {issue.updated_at_jira && (
            <div className="text-xs text-muted-foreground/60">
              Updated: {formatDate(issue.updated_at_jira)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};