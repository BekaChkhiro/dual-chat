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
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const statusColors: Record<TaskStatus, string> = {
  to_start: "bg-gray-500",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  failed: "bg-red-500",
};

export const KanbanColumn = ({
  status,
  title,
  tasks,
  onEdit,
  onDelete,
}: KanbanColumnProps) => {
  const { setNodeRef } = useDroppable({
    id: status,
  });

  return (
    <div className="flex-1 min-w-[280px] flex flex-col">
      {/* Column Header */}
      <div className="p-4 border-b bg-card">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <Badge className={statusColors[status]}>{tasks.length}</Badge>
        </div>
      </div>

      {/* Tasks */}
      <div
        ref={setNodeRef}
        className="flex-1 p-4 space-y-3 min-h-[500px] bg-muted/20"
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <KanbanTaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};
