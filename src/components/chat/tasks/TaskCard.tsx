import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ka } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

export const TaskCard = ({ task, onDelete, onStatusChange, onClick }: TaskCardProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    onDelete(task.id);
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <Card
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={(e) => {
          // Don't trigger if clicking on buttons
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
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleDeleteClick}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

      <CardContent>
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
      </CardContent>
    </Card>

    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>დარწმუნებული ხართ?</AlertDialogTitle>
          <AlertDialogDescription>
            ეს მოქმედება შეუქცევადია. ამოცანა "{task.title}" სამუდამოდ წაიშლება.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>გაუქმება</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            წაშლა
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};
