import { Calendar, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  link?: string;
}

interface CalendarColumnProps {
  events: CalendarEvent[];
  isConnected: boolean;
  onConnect: () => void;
}

export function CalendarColumn({ events, isConnected, onConnect }: CalendarColumnProps) {
  if (!isConnected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Today's Agenda</h2>
        </div>
        
        <div className="bg-card border border-muted rounded-lg p-6 card-shadow text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium text-card-foreground mb-2">
            Connect Your Google Calendar
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            See your daily schedule alongside your tasks for better planning.
          </p>
          <Button variant="default" onClick={onConnect} className="gap-2">
            <Calendar className="h-4 w-4" />
            Connect Google Calendar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">Today's Agenda</h2>
      </div>

      <div className="space-y-3">
        {events.length === 0 ? (
          <div className="bg-card border border-muted rounded-lg p-6 card-shadow text-center">
            <p className="text-muted-foreground">No events scheduled for today</p>
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="bg-card border border-muted rounded-lg p-4 card-shadow hover:card-shadow-hover transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-card-foreground mb-1">
                    {event.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {event.startTime} - {event.endTime}
                  </p>
                </div>
                
                {event.link && (
                  <Button
                    variant="icon-ghost"
                    size="icon-sm"
                    asChild
                  >
                    <a href={event.link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}