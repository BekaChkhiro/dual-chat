import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, MoreVertical, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ka } from "date-fns/locale";

export type TaskStatus = "to_start" | "in_progress" | "completed" | "failed";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  due_date: string | null;
  assignee_id: string | null;
  created_by: string;
  created_at: string;
  assignee?: {
    full_name: string | null;
    email: string;
  };
}

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onClick?: () => void;
}

const statusColors: Record<TaskStatus, string> = {
  to_start: "bg-gray-500",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  failed: "bg-red-500",
};

const statusLabels: Record<TaskStatus, string> = {
  to_start: "დასაწყები",
  in_progress: "პროცესში",
  completed: "დასრულებული",
  failed: "ჩაიშალა",
};

export const TaskCard = ({ task, onEdit, onDelete, onStatusChange, onClick }: TaskCardProps) => {

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={(e) => {
        // Don't trigger if clicking on buttons or dropdown
        if (!(e.target as HTMLElement).closest('button')) {
          onClick?.();
        }
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="font-semibold">
              {task.title}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColors[task.status]}>
              {statusLabels[task.status]}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  <Edit className="w-4 h-4 mr-2" />
                  რედაქტირება
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(task.id)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  წაშლა
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Meta Info */}
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {task.due_date && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>
                {format(new Date(task.due_date), "d MMMM, yyyy", { locale: ka })}
              </span>
            </div>
          )}
          {task.assignee && (
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>{task.assignee.full_name || task.assignee.email}</span>
            </div>
          )}
        </div>

        {/* Status Change Buttons */}
        {task.status !== "completed" && task.status !== "failed" && (
          <div className="flex gap-2">
            {task.status === "to_start" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStatusChange(task.id, "in_progress")}
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                დაწყება
              </Button>
            )}
            {task.status === "in_progress" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onStatusChange(task.id, "completed")}
                  className="text-green-600 border-green-600 hover:bg-green-50"
                >
                  დასრულება
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onStatusChange(task.id, "failed")}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  ჩაშლა
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
