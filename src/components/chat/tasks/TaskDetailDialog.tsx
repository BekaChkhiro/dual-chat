import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, User, Clock, Edit, Trash2, Paperclip, FileText } from "lucide-react";
import { format } from "date-fns";
import { ka } from "date-fns/locale";
import { TaskStatus } from "./TaskCard";
import { TaskAttachment } from "./TaskFileUpload";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  due_date: string | null;
  assignee_id: string | null;
  created_by: string;
  created_at: string;
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
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  isDeleting?: boolean;
}

export const TaskDetailDialog = ({
  open,
  onOpenChange,
  task,
  onEdit,
  onDelete,
  onStatusChange,
  isDeleting,
}: TaskDetailDialogProps) => {
  if (!task) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-[600px] w-full overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-xl">{task.title}</SheetTitle>
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
          {task.description && (
            <div>
              <h4 className="font-semibold mb-2 text-sm text-muted-foreground">
                აღწერა
              </h4>
              <p className="text-sm whitespace-pre-wrap bg-muted/30 rounded-lg p-4">
                {task.description}
              </p>
            </div>
          )}

          {/* Attachments */}
          {task.attachments && task.attachments.length > 0 && (() => {
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
          })()}

          {/* Meta Information */}
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
          </div>
        </ScrollArea>

        {/* Actions - Fixed Footer */}
        <div className="border-t bg-background p-4 -mx-6 mt-auto">
          <div className="flex gap-2 px-6">
            <Button
              onClick={() => onEdit(task)}
              variant="outline"
              className="flex-1"
            >
              <Edit className="w-4 h-4 mr-2" />
              რედაქტირება
            </Button>
            <Button
              onClick={() => {
                onDelete(task.id);
              }}
              variant="destructive"
              className="flex-1"
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isDeleting ? "წაშლა..." : "წაშლა"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
