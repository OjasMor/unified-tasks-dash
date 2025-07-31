import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddTaskForm } from "./AddTaskForm";
import { ToDoCard, ToDo } from "./ToDoCard";

interface ToDoColumnProps {
  todos: ToDo[];
  onAddTodo: (task: {
    title: string;
    description?: string;
    deadline?: Date;
  }) => void;
  onToggleComplete: (id: string) => void;
  onDeleteTodo: (id: string) => void;
}

export function ToDoColumn({ 
  todos, 
  onAddTodo, 
  onToggleComplete, 
  onDeleteTodo 
}: ToDoColumnProps) {
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddTask = (task: {
    title: string;
    description?: string;
    deadline?: Date;
  }) => {
    onAddTodo(task);
    setShowAddForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">My Tasks</h2>
        {!showAddForm && (
          <Button 
            variant="add-task" 
            size="sm"
            onClick={() => setShowAddForm(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        )}
      </div>

      {showAddForm && (
        <AddTaskForm
          onSubmit={handleAddTask}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <div className="space-y-3">
        {todos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No tasks yet. Add your first task to get started!</p>
          </div>
        ) : (
          todos.map((todo) => (
            <ToDoCard
              key={todo.id}
              todo={todo}
              onToggleComplete={onToggleComplete}
              onDelete={onDeleteTodo}
            />
          ))
        )}
      </div>
    </div>
  );
}