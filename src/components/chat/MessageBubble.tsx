import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Shield, FileText, Download, Image as ImageIcon, FileSpreadsheet, File, Eye, Trash2, MoreVertical, Edit2, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageAttachment } from "./ChatWindow";
import { useState } from "react";
import { FilePreviewModal } from "./FilePreviewModal";
import { ImageGalleryModal } from "./ImageGalleryModal";
import { MediaItem } from "@/hooks/useChatMedia";

interface MessageBubbleProps {
  messageId: string;
  message: string;
  senderName: string;
  isOwn: boolean;
  isStaffOnly: boolean;
  timestamp: string;
  attachments?: MessageAttachment[];
  onDelete: () => void;
  onEdit: (newContent: string) => void;
}

export const MessageBubble = ({
  messageId,
  message,
  senderName,
  isOwn,
  isStaffOnly,
  timestamp,
  attachments,
  onDelete,
  onEdit,
}: MessageBubbleProps) => {
  const [previewAttachment, setPreviewAttachment] = useState<MessageAttachment | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMessage, setEditedMessage] = useState(message);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const isImage = (type: string) => type.startsWith("image/");
  const isPdf = (type: string) => type === "application/pdf";
  const isSpreadsheet = (type: string) =>
    type.includes("spreadsheet") || type.includes("excel") || type.includes("csv");

  const getFileIcon = (type: string) => {
    if (isImage(type)) return ImageIcon;
    if (isPdf(type)) return FileText;
    if (isSpreadsheet(type)) return FileSpreadsheet;
    return File;
  };

  const handleDownload = async (attachment: MessageAttachment) => {
    try {
      // Fetch the file as a blob
      const response = await fetch(attachment.url);
      const blob = await response.blob();

      // Create a blob URL
      const blobUrl = URL.createObjectURL(blob);

      // Create a temporary link and trigger download
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    onDelete();
    setShowDeleteDialog(false);
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setEditedMessage(message);
  };

  const handleSaveEdit = () => {
    if (editedMessage.trim() && editedMessage !== message) {
      onEdit(editedMessage.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedMessage(message);
  };

  return (
    <div className={cn("flex gap-2 group", isOwn ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[70%] space-y-1")}>
        {!isOwn && (
          <div className="flex items-center gap-2 px-3">
            <span className="text-xs font-medium text-foreground">
              {senderName}
            </span>
            {isStaffOnly && <Shield className="w-3 h-3 text-staff" />}
          </div>
        )}
        <div
          className={cn(
            "rounded-2xl shadow-sm overflow-hidden",
            isOwn
              ? isStaffOnly
                ? "bg-staff text-staff-foreground rounded-tr-sm"
                : "bg-chat-sent text-primary-foreground rounded-tr-sm"
              : "bg-chat-received text-foreground rounded-tl-sm"
          )}
        >
          {/* Message text */}
          {message && (
            <div className="px-4 py-2">
              <p className="text-sm break-words whitespace-pre-wrap">{message}</p>
            </div>
          )}

          {/* Attachments */}
          {attachments && attachments.length > 0 && (
            <div className={cn("space-y-2", message && "px-4 pb-2")}>
              {(() => {
                const images = attachments.filter((a) => isImage(a.type));
                const files = attachments.filter((a) => !isImage(a.type));

                return (
                  <>
                    {/* Image Carousel */}
                    {images.length > 0 && (
                      <div className="relative">
                        {images.length === 1 ? (
                          // Single image
                          <div
                            className="block cursor-pointer"
                            onClick={() => {
                              setGalleryStartIndex(0);
                              setGalleryOpen(true);
                            }}
                          >
                            <img
                              src={images[0].url}
                              alt={images[0].name}
                              className="max-w-full h-auto rounded-lg hover:opacity-90 transition-opacity"
                              style={{ maxHeight: "300px" }}
                            />
                          </div>
                        ) : (
                          // Multiple images carousel
                          <div className="relative">
                            <div
                              className="cursor-pointer"
                              onClick={() => {
                                setGalleryStartIndex(currentImageIndex);
                                setGalleryOpen(true);
                              }}
                            >
                              <img
                                src={images[currentImageIndex].url}
                                alt={images[currentImageIndex].name}
                                className="max-w-full h-auto rounded-lg hover:opacity-90 transition-opacity"
                                style={{ maxHeight: "300px" }}
                              />
                            </div>

                            {/* Navigation Arrows */}
                            {images.length > 1 && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentImageIndex((prev) =>
                                      prev > 0 ? prev - 1 : images.length - 1
                                    );
                                  }}
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentImageIndex((prev) =>
                                      prev < images.length - 1 ? prev + 1 : 0
                                    );
                                  }}
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </Button>
                              </>
                            )}

                            {/* Dots Indicator */}
                            {images.length > 1 && (
                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                                {images.map((_, index) => (
                                  <button
                                    key={index}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCurrentImageIndex(index);
                                    }}
                                    className={cn(
                                      "h-2 rounded-full transition-all",
                                      index === currentImageIndex
                                        ? "w-6 bg-white"
                                        : "w-2 bg-white/50 hover:bg-white/75"
                                    )}
                                  />
                                ))}
                              </div>
                            )}

                            {/* Counter Badge */}
                            {images.length > 1 && (
                              <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                                {currentImageIndex + 1} / {images.length}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Files */}
                    {files.map((attachment, index) => {
                      const FileIcon = getFileIcon(attachment.type);
                      const canPreview = isPdf(attachment.type);

                      return (
                        <div key={`file-${index}`}>
                          {/* Other files - card with view/download buttons inline */}
                          <div
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border",
                              isOwn
                                ? "bg-background/10 border-background/20"
                                : "bg-background border-border"
                            )}
                          >
                            <FileIcon className="w-8 h-8 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {attachment.name}
                              </p>
                              <p className="text-xs opacity-70">
                                {formatFileSize(attachment.size)}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              {/* Only show preview button for PDFs */}
                              {canPreview && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setPreviewAttachment(attachment)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDownload(attachment)}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Edit mode input - appears below message */}
        {isEditing && (
          <div className="px-3 pb-3">
            <div className="flex items-end gap-2 bg-background/50 p-2 rounded-lg border">
              <Input
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                placeholder="რედაქტირება..."
                className="flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveEdit();
                  } else if (e.key === "Escape") {
                    handleCancelEdit();
                  }
                }}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10"
                onClick={handleSaveEdit}
              >
                <Check className="w-5 h-5 text-green-600" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10"
                onClick={handleCancelEdit}
              >
                <X className="w-5 h-5 text-red-600" />
              </Button>
            </div>
          </div>
        )}

        <div
          className={cn(
            "flex items-center gap-2 px-3",
            isOwn && "justify-end"
          )}
        >
          <span className="text-xs text-muted-foreground">
            {format(new Date(timestamp), "p")}
          </span>
          {isOwn && isStaffOnly && <Shield className="w-3 h-3 text-staff" />}
        </div>
      </div>

      {/* Actions menu - only show for own messages */}
      {isOwn && !isEditing && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* Only allow editing text-only messages */}
            {!attachments || attachments.length === 0 ? (
              <DropdownMenuItem onClick={handleEditClick} className="gap-2">
                <Edit2 className="w-4 h-4" />
                რედაქტირება
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={handleDeleteClick} className="gap-2 text-destructive focus:text-destructive">
              <Trash2 className="w-4 h-4" />
              წაშლა
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>მესიჯის წაშლა</AlertDialogTitle>
            <AlertDialogDescription>
              დარწმუნებული ხართ, რომ გსურთ ამ მესიჯის წაშლა? ეს მოქმედება შეუქცევადია.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>გაუქმება</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
              წაშლა
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* File Preview Modal */}
      <FilePreviewModal
        attachment={previewAttachment}
        open={!!previewAttachment}
        onOpenChange={(open) => !open && setPreviewAttachment(null)}
      />

      {/* Image Gallery Modal */}
      {attachments && (
        <ImageGalleryModal
          images={attachments.filter((a) => isImage(a.type)).map((a) => ({
            ...a,
            messageId: messageId,
            timestamp: timestamp,
          }))}
          initialIndex={galleryStartIndex}
          open={galleryOpen}
          onOpenChange={setGalleryOpen}
        />
      )}
    </div>
  );
};
