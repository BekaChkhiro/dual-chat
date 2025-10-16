import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ListTodo } from "lucide-react";
import { TaskCard, TaskStatus } from "../tasks/TaskCard";
import { CreateTaskDialog } from "../tasks/CreateTaskDialog";
import { TaskDetailDialog } from "../tasks/TaskDetailDialog";
import { toast } from "sonner";
// Removed Select filter; replaced with pills + search

interface TasksTabProps {
  chatId: string;
}

export const TasksTab = ({ chatId }: TasksTabProps) => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | TaskStatus>("all");
  const [search, setSearch] = useState("");
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);

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

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
  };

  const handleDetailOpenChange = (open: boolean) => {
    setTaskDetailOpen(open);
    if (!open) {
      setSelectedTask(null);
    }
  };

  const handleTaskClick = (task: any) => {
    setSelectedTask(task);
    setTaskDetailOpen(true);
  };

  // Filter tasks by status + search
  const filteredTasks = (filterStatus === "all"
    ? tasks
    : tasks.filter((task) => task.status === filterStatus)
  ).filter((t) => (search.trim() ? t.title.toLowerCase().includes(search.trim().toLowerCase()) : true));

  // Status counts
  const statusCounts: Record<"all" | TaskStatus, number> = {
    all: tasks.length,
    to_start: tasks.filter((t: any) => t.status === "to_start").length,
    in_progress: tasks.filter((t: any) => t.status === "in_progress").length,
    review: tasks.filter((t: any) => t.status === "review").length,
    completed: tasks.filter((t: any) => t.status === "completed").length,
    failed: tasks.filter((t: any) => t.status === "failed").length,
  };

  const pillBase = "px-3 py-1.5 rounded-full text-sm border transition-colors";
  const pillActive = "bg-primary text-primary-foreground border-transparent";
  const pillIdle = "bg-background hover:bg-muted border-border text-foreground";

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">ამოცანების ჩატვირთვა...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ListTodo className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-semibold">ამოცანები</h3>
              <p className="text-sm text-muted-foreground">
                სულ: {tasks.length} ამოცანა
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              ახალი ამოცანა
            </Button>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <ScrollArea className="flex-1 p-4">
        {/* Toolbar: status pills + search */}
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {([
              { key: "all", label: "ყველა" },
              { key: "to_start", label: "დასაწყები" },
              { key: "in_progress", label: "პროცესში" },
              { key: "review", label: "მოწმდება" },
              { key: "completed", label: "დასრულებული" },
              { key: "failed", label: "ჩაიშალა" },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                className={`${pillBase} ${((filterStatus as string) === key ? pillActive : pillIdle)}`}
                onClick={() => setFilterStatus(key as any)}
              >
                {label}
                <span className="ml-2 inline-block rounded-full bg-black/10 dark:bg-white/10 px-2 text-xs">
                  {statusCounts[key]}
                </span>
              </button>
            ))}
          </div>
          <div className="w-full md:w-64">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ძებნა სათაურით..."
            />
          </div>
        </div>

        {filteredTasks.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onDelete={deleteTaskMutation.mutate}
                onStatusChange={(taskId, status) =>
                  updateTaskStatusMutation.mutate({ taskId, status })
                }
                onClick={() => handleTaskClick(task)}
              />
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-center">
            <div>
              <ListTodo className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground text-lg mb-2">
                {filterStatus === "all"
                  ? "ჯერ არ არის ამოცანები"
                  : "ამ სტატუსით ამოცანები არ მოიძებნა"}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                დააჭირეთ "ახალი ამოცანა" ღილაკს ამოცანის დასამატებლად
              </p>
              {filterStatus === "all" && (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  ახალი ამოცანა
                </Button>
              )}
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Create Dialog */}
      <CreateTaskDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        chatId={chatId}
      />

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        open={taskDetailOpen}
        onOpenChange={handleDetailOpenChange}
        task={selectedTask}
        onDelete={deleteTaskMutation.mutate}
        onStatusChange={(taskId, status) =>
          updateTaskStatusMutation.mutate({ taskId, status })
        }
        isDeleting={deleteTaskMutation.isPending}
      />
    </div>
  );
};
