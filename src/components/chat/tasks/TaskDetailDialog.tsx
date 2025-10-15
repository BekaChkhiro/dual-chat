import { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, User, Clock, Edit, X, Trash2, Paperclip, FileText, Save } from "lucide-react";
import { format } from "date-fns";
import { ka } from "date-fns/locale";
import { TaskStatus } from "./TaskCard";
import { TaskAttachment, TaskFileUpload } from "./TaskFileUpload";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  due_date: string | null;
  assignee_id: string | null;
  created_by: string;
  created_at: string;
  chat_id: string;
  attachments?: TaskAttachment[];
  assignee?: {
    full_name: string | null;
    email: string;
  };
  creator?: {
    full_name: string | null;
    email: string;
  };
}

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  isDeleting?: boolean;
}

export const TaskDetailDialog = ({
  open,
  onOpenChange,
  task,
  onDelete,
  onStatusChange,
  isDeleting,
}: TaskDetailDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedDueDate, setEditedDueDate] = useState("");
  const [editedAssigneeId, setEditedAssigneeId] = useState("none");
  const [editedAttachments, setEditedAttachments] = useState<TaskAttachment[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // Initialize edited values when entering edit mode or task changes
  useEffect(() => {
    if (task && open) {
      setEditedTitle(task.title);
      setEditedDescription(task.description || "");
      setEditedDueDate(task.due_date || "");
      setEditedAssigneeId(task.assignee_id || "none");
      setEditedAttachments(task.attachments || []);
      setPendingFiles([]);
    }
  }, [task, open]);

  // Reset edit mode when dialog closes
  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      setPendingFiles([]);
    }
  }, [open]);

  // Fetch chat members for assignee dropdown
  const { data: members = [] } = useQuery({
    queryKey: ["chat_members", task?.chat_id],
    queryFn: async () => {
      if (!task) return [];

      const { data: membersData, error: membersError } = await supabase
        .from("chat_members")
        .select("user_id")
        .eq("chat_id", task.chat_id);

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
    enabled: open && !!task,
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

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async () => {
      if (!task || !user) return;

      const uploadedAttachments: TaskAttachment[] = [...editedAttachments];

      // Upload new files to Supabase storage
      if (pendingFiles.length > 0) {
        for (const file of pendingFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${task.chat_id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

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

      const { error } = await supabase
        .from("tasks")
        .update({
          title: editedTitle.trim(),
          description: editedDescription.trim() || null,
          due_date: editedDueDate || null,
          assignee_id: editedAssigneeId === "none" || !editedAssigneeId ? null : editedAssigneeId,
          attachments: uploadedAttachments,
        })
        .eq("id", task.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", task?.chat_id] });
      toast.success("ამოცანა განახლდა");
      setIsEditing(false);
      setPendingFiles([]);
    },
    onError: (error) => {
      toast.error("ამოცანის განახლება ვერ მოხერხდა");
      console.error(error);
    },
  });

  const handleSave = () => {
    if (editedTitle.trim()) {
      updateTaskMutation.mutate();
    }
  };

  const handleCancel = () => {
    if (task) {
      setEditedTitle(task.title);
      setEditedDescription(task.description || "");
      setEditedDueDate(task.due_date || "");
      setEditedAssigneeId(task.assignee_id || "none");
      setEditedAttachments(task.attachments || []);
      setPendingFiles([]);
    }
    setIsEditing(false);
  };

  if (!task) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-[600px] w-full overflow-hidden flex flex-col">
        <SheetHeader>
          {isEditing ? (
            <div className="space-y-2">
              <Label htmlFor="edit-title">სათაური *</Label>
              <Input
                id="edit-title"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder="ამოცანის სათაური"
                maxLength={200}
                className="text-xl font-semibold"
              />
            </div>
          ) : (
            <SheetTitle className="text-xl">{task.title}</SheetTitle>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6 pb-4">
          <div className="space-y-6">
          {/* Status Radio Group */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">სტატუსი</Label>
            <RadioGroup
              value={task.status}
              onValueChange={(value) => onStatusChange(task.id, value as TaskStatus)}
              className="grid grid-cols-2 gap-3"
            >
              <div>
                <RadioGroupItem
                  value="to_start"
                  id="to_start"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="to_start"
                  className="flex items-center justify-center gap-2 rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-gray-500 peer-data-[state=checked]:bg-gray-500/10 cursor-pointer transition-all"
                >
                  <div className="w-3 h-3 rounded-full bg-gray-500" />
                  <span className="font-medium text-sm">დასაწყები</span>
                </Label>
              </div>

              <div>
                <RadioGroupItem
                  value="in_progress"
                  id="in_progress"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="in_progress"
                  className="flex items-center justify-center gap-2 rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-500/10 cursor-pointer transition-all"
                >
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="font-medium text-sm">პროცესში</span>
                </Label>
              </div>

              <div>
                <RadioGroupItem
                  value="completed"
                  id="completed"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="completed"
                  className="flex items-center justify-center gap-2 rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:bg-green-500/10 cursor-pointer transition-all"
                >
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="font-medium text-sm">დასრულებული</span>
                </Label>
              </div>

              <div>
                <RadioGroupItem
                  value="failed"
                  id="failed"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="failed"
                  className="flex items-center justify-center gap-2 rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-red-500 peer-data-[state=checked]:bg-red-500/10 cursor-pointer transition-all"
                >
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="font-medium text-sm">ჩაიშალა</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Description */}
          {isEditing ? (
            <div className="space-y-2">
              <Label htmlFor="edit-description">აღწერა</Label>
              <Textarea
                id="edit-description"
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                placeholder="დეტალური აღწერა..."
                className="min-h-[100px]"
                maxLength={2000}
              />
            </div>
          ) : (
            task.description && (
              <div>
                <h4 className="font-semibold mb-2 text-sm text-muted-foreground">
                  აღწერა
                </h4>
                <p className="text-sm whitespace-pre-wrap bg-muted/30 rounded-lg p-4">
                  {task.description}
                </p>
              </div>
            )
          )}

          {/* Attachments */}
          {isEditing ? (
            <div className="space-y-2">
              <Label>ფაილები</Label>
              <TaskFileUpload
                attachments={[...editedAttachments, ...pendingFileAttachments]}
                onAdd={(files) => setPendingFiles([...pendingFiles, ...files])}
                onRemove={(index) => {
                  if (index < editedAttachments.length) {
                    setEditedAttachments(editedAttachments.filter((_, i) => i !== index));
                  } else {
                    const pendingIndex = index - editedAttachments.length;
                    setPendingFiles(pendingFiles.filter((_, i) => i !== pendingIndex));
                  }
                }}
                disabled={updateTaskMutation.isPending}
              />
            </div>
          ) : (
            task.attachments && task.attachments.length > 0 && (() => {
              const images = task.attachments.filter(att => att.type.startsWith('image/'));
              const otherFiles = task.attachments.filter(att => !att.type.startsWith('image/'));

              return (
                <div className="space-y-4">
                {/* Image Gallery */}
                {images.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 text-sm text-muted-foreground flex items-center gap-2">
                      <Paperclip className="w-4 h-4" />
                      ფოტოები ({images.length})
                    </h4>
                    <Carousel className="w-full">
                      <CarouselContent>
                        {images.map((image, index) => (
                          <CarouselItem key={index}>
                            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                              <img
                                src={image.url}
                                alt={image.name}
                                className="w-full h-full object-contain"
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                                <p className="text-white text-sm font-medium truncate">
                                  {image.name}
                                </p>
                                <p className="text-white/80 text-xs">
                                  {(image.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                              <a
                                href={image.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white px-3 py-1 rounded-md text-xs transition-colors"
                              >
                                ნახვა
                              </a>
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      {images.length > 1 && (
                        <>
                          <CarouselPrevious className="left-2" />
                          <CarouselNext className="right-2" />
                        </>
                      )}
                    </Carousel>
                  </div>
                )}

                {/* Other Files */}
                {otherFiles.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-sm text-muted-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      ფაილები ({otherFiles.length})
                    </h4>
                    <div className="space-y-2">
                      {otherFiles.map((attachment, index) => (
                        <a
                          key={index}
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors group"
                        >
                          <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate group-hover:text-primary">
                              {attachment.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(attachment.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })())}

          {/* Due Date and Assignee - Edit or View */}
          {isEditing ? (
            <div className="grid grid-cols-1 gap-4">
              {/* Due Date Input */}
              <div className="space-y-2">
                <Label htmlFor="edit-due-date">ვადა</Label>
                <Input
                  id="edit-due-date"
                  type="date"
                  value={editedDueDate}
                  onChange={(e) => setEditedDueDate(e.target.value)}
                />
              </div>

              {/* Assignee Select */}
              <div className="space-y-2">
                <Label htmlFor="edit-assignee">შემსრულებელი</Label>
                <Select value={editedAssigneeId} onValueChange={setEditedAssigneeId}>
                  <SelectTrigger id="edit-assignee">
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
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {/* Due Date */}
              {task.due_date && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">ვადა</span>
                  </div>
                  <p className="text-sm pl-6">
                    {format(new Date(task.due_date), "d MMMM, yyyy", {
                      locale: ka,
                    })}
                  </p>
                </div>
              )}

              {/* Assignee */}
              {task.assignee && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span className="font-medium">შემსრულებელი</span>
                  </div>
                  <p className="text-sm pl-6">
                    {task.assignee.full_name || task.assignee.email}
                  </p>
                </div>
              )}

              {/* Created Date */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">შეიქმნა</span>
                </div>
                <p className="text-sm pl-6">
                  {format(new Date(task.created_at), "d MMMM, yyyy HH:mm", {
                    locale: ka,
                  })}
                </p>
              </div>

              {/* Creator */}
              {task.creator && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span className="font-medium">შემქმნელი</span>
                  </div>
                  <p className="text-sm pl-6">
                    {task.creator.full_name || task.creator.email}
                  </p>
                </div>
              )}
            </div>
          )}
          </div>
        </ScrollArea>

        {/* Actions - Fixed Footer */}
        <div className="border-t bg-background p-4 -mx-6 mt-auto">
          <div className="flex gap-2 px-6">
            {isEditing ? (
              <>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="flex-1"
                  disabled={updateTaskMutation.isPending}
                >
                  <X className="w-4 h-4 mr-2" />
                  გაუქმება
                </Button>
                <Button
                  onClick={handleSave}
                  className="flex-1"
                  disabled={!editedTitle.trim() || updateTaskMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateTaskMutation.isPending ? "შენახვა..." : "შენახვა"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  რედაქტირება
                </Button>
                <Button
                  onClick={() => onDelete(task.id)}
                  variant="destructive"
                  className="flex-1"
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isDeleting ? "წაშლა..." : "წაშლა"}
                </Button>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
