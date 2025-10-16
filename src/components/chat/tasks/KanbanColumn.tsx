import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { TaskStatus } from "./TaskCard";
import { KanbanTaskCard } from "./KanbanTaskCard";
import { Badge } from "@/components/ui/badge";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  due_date: string | null;
  assignee_id: string | null;
  assignee?: {
    full_name: string | null;
    email: string;
  };
}

interface KanbanColumnProps {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  dropIndex?: number | null;
  isDragging?: boolean;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

const statusColors: Record<TaskStatus, string> = {
  to_start: "bg-gray-500",
  in_progress: "bg-[#3c83f6]",
  review: "bg-[#f59f0a]",
  completed: "bg-green-500",
  failed: "bg-red-500",
};

export const KanbanColumn = ({
  status,
  title,
  tasks,
  dropIndex = null,
  isDragging = false,
  onEdit,
  onDelete,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      className="flex-none basis-full sm:basis-[calc((100%-16px)/2)] lg:basis-[calc((100%-32px)/3)] xl:basis-[calc((100%-48px)/4)] flex flex-col bg-card rounded-lg border overflow-hidden"
    >
      {/* Column Header */}
      <div className="p-4 border-b bg-card sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <Badge className={`${statusColors[status]} text-white shadow-sm`}>{tasks.length}</Badge>
        </div>
      </div>

      {/* Tasks */}
      <div
        ref={setNodeRef}
        className={`flex-1 p-3 space-y-3 min-h-[500px] bg-secondary transition ring-offset-1 ${
          isOver ? "ring-2 ring-primary/40" : "ring-0"
        }`}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.length > 0 ? (
            tasks.map((task, index) => (
              <div key={task.id}>
                {isDragging && dropIndex === index && (
                  <div className="h-3 rounded border-2 border-dashed border-primary/40 bg-primary/5" />
                )}
                <KanbanTaskCard task={task} onEdit={onEdit} onDelete={onDelete} />
                {isDragging && dropIndex === tasks.length && index === tasks.length - 1 && (
                  <div className="h-3 rounded border-2 border-dashed border-primary/40 bg-primary/5" />
                )}
              </div>
            ))
          ) : (
            <div className="text-center text-xs text-muted-foreground py-8 border-2 border-dashed border-muted rounded-lg">
              ამ სვეტში ამოცანები არ არის
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
};
