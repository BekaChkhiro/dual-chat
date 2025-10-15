import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { TaskStatus } from "./TaskCard";
import { TaskFileUpload, TaskAttachment } from "./TaskFileUpload";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string;
  editTask?: {
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    due_date: string | null;
    assignee_id: string | null;
    attachments?: TaskAttachment[];
  } | null;
}

export const CreateTaskDialog = ({
  open,
  onOpenChange,
  chatId,
  editTask,
}: CreateTaskDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(editTask?.title || "");
  const [description, setDescription] = useState(editTask?.description || "");
  const [status, setStatus] = useState<TaskStatus>(editTask?.status || "to_start");
  const [dueDate, setDueDate] = useState(editTask?.due_date || "");
  const [assigneeId, setAssigneeId] = useState(editTask?.assignee_id || "none");
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // Reset form when dialog opens/closes or editTask changes
  useEffect(() => {
    if (open) {
      setTitle(editTask?.title || "");
      setDescription(editTask?.description || "");
      setStatus(editTask?.status || "to_start");
      setDueDate(editTask?.due_date || "");
      setAssigneeId(editTask?.assignee_id || "none");
      setAttachments(editTask?.attachments || []);
      setPendingFiles([]);
    }
  }, [open, editTask]);

  // Fetch chat members to show as assignee options
  const { data: members = [] } = useQuery({
    queryKey: ["chat_members", chatId],
    queryFn: async () => {
      const { data: membersData, error: membersError } = await supabase
        .from("chat_members")
        .select("user_id")
        .eq("chat_id", chatId);

      if (membersError) throw membersError;

      if (!membersData || membersData.length === 0) return [];

      const userIds = membersData.map((m) => m.user_id);

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      return profilesData || [];
    },
    enabled: open,
  });

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      const uploadedAttachments: TaskAttachment[] = [...attachments];

      // Upload new files to Supabase storage
      if (pendingFiles.length > 0) {
        for (const file of pendingFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user!.id}/${chatId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('task-attachments')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error(`Failed to upload ${file.name}`);
          }

          // Get signed URL (valid for 1 year)
          const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from('task-attachments')
            .createSignedUrl(fileName, 31536000, {
              download: false
            });

          if (signedUrlError) {
            console.error('Signed URL error:', signedUrlError);
            throw new Error(`Failed to create URL for ${file.name}`);
          }

          uploadedAttachments.push({
            name: file.name,
            type: file.type,
            url: signedUrlData.signedUrl,
            size: file.size,
          });
        }
      }

      const taskData = {
        chat_id: chatId,
        title: title.trim(),
        description: description.trim() || null,
        status,
        due_date: dueDate || null,
        assignee_id: assigneeId === "none" || !assigneeId ? null : assigneeId,
        created_by: user!.id,
        attachments: uploadedAttachments,
      };

      if (editTask) {
        const { error } = await supabase
          .from("tasks")
          .update(taskData)
          .eq("id", editTask.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("tasks").insert(taskData);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", chatId] });
      toast.success(editTask ? "ამოცანა განახლდა" : "ამოცანა შეიქმნა");
      onOpenChange(false);
      // Reset form
      setTitle("");
      setDescription("");
      setStatus("to_start");
      setDueDate("");
      setAssigneeId("none");
      setAttachments([]);
      setPendingFiles([]);
    },
    onError: (error) => {
      toast.error("ამოცანის შენახვა ვერ მოხერხდა");
      console.error(error);
    },
  });

  // Create blob URLs for pending file previews
  const pendingFileAttachments = useMemo(() => {
    return pendingFiles.map((file) => ({
      name: file.name,
      type: file.type,
      url: file.type.startsWith('image/') ? URL.createObjectURL(file) : "",
      size: file.size,
    }));
  }, [pendingFiles]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      pendingFileAttachments.forEach((attachment) => {
        if (attachment.url) {
          URL.revokeObjectURL(attachment.url);
        }
      });
    };
  }, [pendingFileAttachments]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      createTaskMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {editTask ? "ამოცანის რედაქტირება" : "ახალი ამოცანა"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">სათაური *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ამოცანის სათაური"
              maxLength={200}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">აღწერა</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="დეტალური აღწერა..."
              className="min-h-[100px]"
              maxLength={2000}
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">სტატუსი</Label>
            <Select value={status} onValueChange={(val) => setStatus(val as TaskStatus)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="to_start">დასაწყები</SelectItem>
                <SelectItem value="in_progress">პროცესში</SelectItem>
                <SelectItem value="completed">დასრულებული</SelectItem>
                <SelectItem value="failed">ჩაიშალა</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="due_date">ვადა</Label>
            <Input
              id="due_date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label htmlFor="assignee">შემსრულებელი</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger id="assignee">
                <SelectValue placeholder="აირჩიეთ შემსრულებელი" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">არავინ</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name || member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Attachments */}
          <div className="space-y-2">
            <Label>ფაილები</Label>
            <TaskFileUpload
              attachments={[...attachments, ...pendingFileAttachments]}
              onAdd={(files) => setPendingFiles([...pendingFiles, ...files])}
              onRemove={(index) => {
                if (index < attachments.length) {
                  // Remove from existing attachments
                  setAttachments(attachments.filter((_, i) => i !== index));
                } else {
                  // Remove from pending files
                  const pendingIndex = index - attachments.length;
                  setPendingFiles(pendingFiles.filter((_, i) => i !== pendingIndex));
                }
              }}
              disabled={createTaskMutation.isPending}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createTaskMutation.isPending}
            >
              გაუქმება
            </Button>
            <Button type="submit" disabled={!title.trim() || createTaskMutation.isPending}>
              {createTaskMutation.isPending
                ? "შენახვა..."
                : editTask
                ? "განახლება"
                : "შექმნა"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
