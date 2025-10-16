import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, User, GripVertical, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ka } from "date-fns/locale";
import { TaskStatus } from "./TaskCard";

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

interface KanbanTaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export const KanbanTaskCard = ({ task, onEdit, onDelete }: KanbanTaskCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const statusAccent =
    task.status === "in_progress"
      ? "border-[#3c83f6]"
      : task.status === "review"
      ? "border-[#f59f0a]"
      : task.status === "completed"
      ? "border-green-500"
      : task.status === "failed"
      ? "border-red-500"
      : "border-gray-300";

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow border-l-4 ${statusAccent} shadow-sm hover:bg-muted/30`}
      onClick={(e) => {
        e.stopPropagation();
        if (!isDragging) onEdit(task);
      }}
    >
      <CardHeader className="pb-3 p-3">
        <div className="flex items-start gap-2">
          <div className="mt-1 cursor-grab">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-sm leading-snug truncate">{task.title}</h4>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
          {/* Confirm delete with AlertDialog */}
          <DeleteButton task={task} onDelete={onDelete} />
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-0 space-y-2">
        {/* Meta Info */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {task.due_date && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{format(new Date(task.due_date), "d MMM", { locale: ka })}</span>
            </div>
          )}
          {task.assignee && (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span className="truncate max-w-[140px]">
                {task.assignee.full_name || task.assignee.email}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const DeleteButton = ({ task, onDelete }: { task: Task; onDelete: (task: Task) => void }) => {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Trash2 className="w-4 h-4" />
          <span className="sr-only">წაშლა</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ამოცანის წაშლა?</AlertDialogTitle>
          <AlertDialogDescription>
            მოქმედება შეუქცევადია. გსურთ წაშალოთ „{task.title}“?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>გაუქმება</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task);
            }}
          >
            წაშლა
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
