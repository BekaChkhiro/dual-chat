import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ka } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { CreateTaskDialog } from "../tasks/CreateTaskDialog";
import { TaskDetailDialog } from "../tasks/TaskDetailDialog";
import { TaskStatus } from "../tasks/TaskCard";
import { toast } from "sonner";

interface CalendarViewProps {
  chatId: string;
}

const locales = {
  ka: ka,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: ka }),
  getDay,
  locales,
});

const statusColors: Record<TaskStatus, string> = {
  to_start: "#6b7280",
  in_progress: "#3b82f6",
  completed: "#22c55e",
  failed: "#ef4444",
};

const statusLabels: Record<TaskStatus, string> = {
  to_start: "დასაწყები",
  in_progress: "პროცესში",
  completed: "დასრულებული",
  failed: "ჩაიშალა",
};

export const CalendarView = ({ chatId }: CalendarViewProps) => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [pendingEditTask, setPendingEditTask] = useState<any>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", chatId],
    queryFn: async () => {
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: false });

      if (tasksError) throw tasksError;

      if (!tasksData || tasksData.length === 0) return [];

      // Fetch all unique user IDs (assignees and creators)
      const assigneeIds = tasksData
        .map((t) => t.assignee_id)
        .filter((id): id is string => id !== null);
      const creatorIds = tasksData.map((t) => t.created_by);
      const allUserIds = [...new Set([...assigneeIds, ...creatorIds])];

      if (allUserIds.length === 0) {
        return tasksData.map((t) => ({ ...t, assignee: null, creator: null }));
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", allUserIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        return tasksData.map((t) => ({ ...t, assignee: null, creator: null }));
      }

      const profilesMap = new Map(
        (profilesData || []).map((p) => [p.id, p])
      );

      return tasksData.map((task) => ({
        ...task,
        assignee: task.assignee_id ? profilesMap.get(task.assignee_id) || null : null,
        creator: profilesMap.get(task.created_by) || null,
      }));
    },
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status })
        .eq("id", taskId);

      if (error) throw error;
      return { taskId, status };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", chatId] });
      // Update selectedTask in modal
      if (selectedTask && selectedTask.id === data.taskId) {
        setSelectedTask({ ...selectedTask, status: data.status });
      }
      toast.success("სტატუსი განახლდა");
    },
    onError: (error) => {
      toast.error("სტატუსის განახლება ვერ მოხერხდა");
      console.error(error);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", chatId] });
      toast.success("ამოცანა წაიშალა");
      setTaskDetailOpen(false);
      setSelectedTask(null);
    },
    onError: (error) => {
      toast.error("ამოცანის წაშლა ვერ მოხერხდა");
      console.error(error);
    },
  });

  // Convert tasks to calendar events
  const events = useMemo(() => {
    return tasks
      .filter((task) => task.due_date)
      .map((task) => ({
        id: task.id,
        title: task.title,
        start: new Date(task.due_date!),
        end: new Date(task.due_date!),
        resource: task,
      }));
  }, [tasks]);

  const handleSelectEvent = (event: any) => {
    setSelectedTask(event.resource);
    setTaskDetailOpen(true);
  };

  const handleEdit = (task: any) => {
    setPendingEditTask(task);
    setTaskDetailOpen(false);
  };

  // Watch for preview closing and pending edit
  useEffect(() => {
    if (!taskDetailOpen && pendingEditTask) {
      // Wait for sheet animation to complete
      const timer = setTimeout(() => {
        setEditTask(pendingEditTask);
        setDialogOpen(true);
        setPendingEditTask(null);
      }, 350);

      return () => clearTimeout(timer);
    }
  }, [taskDetailOpen, pendingEditTask]);

  const handleDetailOpenChange = (open: boolean) => {
    setTaskDetailOpen(open);
    if (!open) {
      setSelectedTask(null);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditTask(null);
    }
  };

  const eventStyleGetter = (event: any) => {
    const task = event.resource;
    return {
      style: {
        backgroundColor: statusColors[task.status as TaskStatus],
        borderColor: statusColors[task.status as TaskStatus],
        color: "white",
      },
    };
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">ჩატვირთვა...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-semibold">კალენდარი</h3>
              <p className="text-sm text-muted-foreground">
                ამოცანები ვადის მიხედვით
              </p>
            </div>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            ახალი ამოცანა
          </Button>
        </div>
      </div>

      {/* Calendar */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {tasks.length > 0 ? (
            <div className="h-[700px] bg-card rounded-lg p-4">
              <BigCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                culture="ka"
                messages={{
                  next: "შემდეგი",
                  previous: "წინა",
                  today: "დღეს",
                  month: "თვე",
                  week: "კვირა",
                  day: "დღე",
                  agenda: "დღის წესრიგი",
                  date: "თარიღი",
                  time: "დრო",
                  event: "ამოცანა",
                  noEventsInRange: "ამ პერიოდში ამოცანები არ არის",
                  showMore: (total) => `+${total} მეტი`,
                }}
                views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
                defaultView={Views.MONTH}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={eventStyleGetter}
              />
            </div>
          ) : (
            <div className="h-[500px] flex items-center justify-center text-center">
              <div>
                <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground text-lg mb-2">
                  ჯერ არ არის ამოცანები
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  დააჭირეთ "ახალი ამოცანა" ღილაკს ამოცანის დასამატებლად
                </p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  ახალი ამოცანა
                </Button>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        open={taskDetailOpen}
        onOpenChange={handleDetailOpenChange}
        task={selectedTask}
        onEdit={handleEdit}
        onDelete={deleteTaskMutation.mutate}
        onStatusChange={(taskId, status) =>
          updateTaskStatusMutation.mutate({ taskId, status })
        }
        isDeleting={deleteTaskMutation.isPending}
      />

      {/* Create/Edit Dialog */}
      <CreateTaskDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        chatId={chatId}
        editTask={editTask}
      />
    </div>
  );
};
