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
import { TaskDetailDialog } from "../tasks/TaskDetailDialog";
import { TaskStatus } from "../tasks/TaskCard";
import { toast } from "sonner";

interface KanbanBoardProps {
  chatId: string;
}

const columns: { status: TaskStatus; title: string }[] = [
  { status: "to_start", title: "დასაწყები" },
  { status: "in_progress", title: "პროცესში" },
  { status: "review", title: "მოწმდება" },
  { status: "completed", title: "დასრულებული" },
  { status: "failed", title: "ჩაიშალა" },
];

export const KanbanBoard = ({ chatId }: KanbanBoardProps) => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dropColumn, setDropColumn] = useState<TaskStatus | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

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

  type Task = {
    id: string;
    chat_id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    due_date: string | null;
    assignee_id: string | null;
    created_by: string;
    attachments?: any[];
    // plus any other columns; we'll ignore extra fields on insert
  };

  const deleteTaskMutation = useMutation({
    mutationFn: async (task: Task) => {
      const { error } = await supabase.from("tasks").delete().eq("id", task.id);
      if (error) throw error;
      return task;
    },
    onSuccess: (deletedTask) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", chatId] });
      toast.success("ამოცანა წაიშალა", {
        action: {
          label: "დაბრუნება",
          onClick: async () => {
            // Recreate the task with the same ID and fields (excluding computed props)
            const { id, chat_id, title, description, status, due_date, assignee_id, created_by, attachments } = deletedTask as Task;
            const { error } = await supabase.from("tasks").insert({
              id,
              chat_id,
              title,
              description,
              status,
              due_date,
              assignee_id,
              created_by,
              attachments: attachments || [],
            } as any);
            if (error) {
              console.error("Undo failed:", error);
              toast.error("ვერ დავაბრუნე ამოცანა");
            } else {
              queryClient.invalidateQueries({ queryKey: ["tasks", chatId] });
              toast.success("ამოცანა დაბრუნებულია");
            }
          },
        },
      });
    },
    onError: (error) => {
      toast.error("ამოცანის წაშლა ვერ მოხერხდა");
      console.error(error);
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: any) => {
    const over = event.over;
    if (!over) {
      setDropColumn(null);
      setDropIndex(null);
      return;
    }

    const overId = over.id as string;
    // If hovering over a column
    if (["to_start", "in_progress", "review", "completed", "failed"].includes(overId)) {
      const col = overId as TaskStatus;
      setDropColumn(col);
      setDropIndex(tasks.filter((t) => t.status === col).length);
      return;
    }

    // Otherwise hovering over a task card
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask) {
      const col = overTask.status as TaskStatus;
      const list = tasks.filter((t) => t.status === col);
      const idx = list.findIndex((t) => t.id === overTask.id);
      setDropColumn(col);
      setDropIndex(Math.max(0, idx));
      return;
    }

    setDropColumn(null);
    setDropIndex(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      setDropColumn(null);
      setDropIndex(null);
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
    setDropColumn(null);
    setDropIndex(null);
  };

  const handleEdit = (task: any) => {
    // Open preview/details sheet instead of edit dialog
    setSelectedTask(task);
    setTaskDetailOpen(true);
  };

  const handleDetailOpenChange = (open: boolean) => {
    setTaskDetailOpen(open);
    if (!open) setSelectedTask(null);
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
        <div className="p-4 overflow-x-auto w-full">
          {tasks.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
            >
              <div className="flex gap-4 min-h-[600px] w-[100%]">
                {columns.map((column) => (
                  <KanbanColumn
                    key={column.status}
                    status={column.status}
                    title={column.title}
                    tasks={tasksByStatus[column.status]}
                    dropIndex={dropColumn === column.status ? dropIndex : null}
                    isDragging={!!activeId}
                    onEdit={handleEdit}
                    onDelete={(task) => deleteTaskMutation.mutate(task as any)}
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

      {/* Task Preview/Details */}
      <TaskDetailDialog
        open={taskDetailOpen}
        onOpenChange={handleDetailOpenChange}
        task={selectedTask}
        onDelete={(taskId) => {
          const task = tasks.find((t) => t.id === taskId);
          if (task) deleteTaskMutation.mutate(task as any);
        }}
        onStatusChange={(taskId, status) => updateTaskStatusMutation.mutate({ taskId, status })}
        isDeleting={deleteTaskMutation.isPending}
      />
    </div>
  );
};
