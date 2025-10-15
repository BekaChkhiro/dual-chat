import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid } from "lucide-react";
import { KanbanColumn } from "../tasks/KanbanColumn";
import { KanbanTaskCard } from "../tasks/KanbanTaskCard";
import { CreateTaskDialog } from "../tasks/CreateTaskDialog";
import { TaskStatus } from "../tasks/TaskCard";
import { toast } from "sonner";

interface KanbanBoardProps {
  chatId: string;
}

const columns: { status: TaskStatus; title: string }[] = [
  { status: "to_start", title: "დასაწყები" },
  { status: "in_progress", title: "პროცესში" },
  { status: "completed", title: "დასრულებული" },
  { status: "failed", title: "ჩაიშალა" },
];

export const KanbanBoard = ({ chatId }: KanbanBoardProps) => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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

      // Fetch assignee profiles
      const assigneeIds = tasksData
        .map((t) => t.assignee_id)
        .filter((id): id is string => id !== null);

      if (assigneeIds.length === 0) {
        return tasksData.map((t) => ({ ...t, assignee: null }));
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", assigneeIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        return tasksData.map((t) => ({ ...t, assignee: null }));
      }

      const profilesMap = new Map(
        (profilesData || []).map((p) => [p.id, p])
      );

      return tasksData.map((task) => ({
        ...task,
        assignee: task.assignee_id ? profilesMap.get(task.assignee_id) || null : null,
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", chatId] });
      toast.success("ამოცანა გადატანილია");
    },
    onError: (error) => {
      toast.error("გადატანა ვერ მოხერხდა");
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
    },
    onError: (error) => {
      toast.error("ამოცანის წაშლა ვერ მოხერხდა");
      console.error(error);
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;

    // Find the task being dragged
    const task = tasks.find((t) => t.id === taskId);

    if (task && task.status !== newStatus) {
      updateTaskStatusMutation.mutate({ taskId, status: newStatus });
    }

    setActiveId(null);
  };

  const handleEdit = (task: any) => {
    setEditTask(task);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditTask(null);
    }
  };

  // Group tasks by status
  const tasksByStatus = columns.reduce((acc, column) => {
    acc[column.status] = tasks.filter((task) => task.status === column.status);
    return acc;
  }, {} as Record<TaskStatus, typeof tasks>);

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

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
            <LayoutGrid className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-semibold">კანბანი</h3>
              <p className="text-sm text-muted-foreground">
                გადაათრიეთ ამოცანები სვეტებს შორის
              </p>
            </div>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            ახალი ამოცანა
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {tasks.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-4 min-h-[600px]">
                {columns.map((column) => (
                  <KanbanColumn
                    key={column.status}
                    status={column.status}
                    title={column.title}
                    tasks={tasksByStatus[column.status]}
                    onEdit={handleEdit}
                    onDelete={deleteTaskMutation.mutate}
                  />
                ))}
              </div>

              <DragOverlay>
                {activeTask ? (
                  <KanbanTaskCard
                    task={activeTask}
                    onEdit={handleEdit}
                    onDelete={deleteTaskMutation.mutate}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <div className="h-[500px] flex items-center justify-center text-center">
              <div>
                <LayoutGrid className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
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
