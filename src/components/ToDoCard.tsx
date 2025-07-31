import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { format } from "date-fns";

export interface ToDo {
  id: string;
  title: string;
  description?: string;
  deadline?: Date;
  completed: boolean;
}

interface ToDoCardProps {
  todo: ToDo;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ToDoCard({ todo, onToggleComplete, onDelete }: ToDoCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`
      bg-card border border-muted rounded-lg p-4 card-shadow hover:card-shadow-hover transition-all group
      ${todo.completed ? 'opacity-50' : ''}
    `}>
      <div className="flex items-start gap-3">
        <Checkbox 
          checked={todo.completed}
          onCheckedChange={() => onToggleComplete(todo.id)}
          className="mt-1"
        />
        
        <div className="flex-1 min-w-0">
          <h3 className={`
            font-medium text-card-foreground
            ${todo.completed ? 'line-through' : ''}
          `}>
            {todo.title}
          </h3>
          
          {todo.deadline && (
            <p className="text-sm text-muted-foreground mt-1">
              Due: {format(todo.deadline, 'MMM d, yyyy')}
            </p>
          )}
          
          {todo.description && isExpanded && (
            <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
              {todo.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {todo.description && (
            <Button
              variant="icon-ghost"
              size="icon-sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
          
          <Button
            variant="icon-ghost"
            size="icon-sm"
            onClick={() => onDelete(todo.id)}
            className="hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}