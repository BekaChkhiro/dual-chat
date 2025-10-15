import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, FileText } from "lucide-react";
import { AttachmentPreview } from "./FileUpload";

interface AttachmentPreviewListProps {
  attachments: AttachmentPreview[];
  onRemove: (index: number) => void;
}

export const AttachmentPreviewList = ({
  attachments,
  onRemove,
}: AttachmentPreviewListProps) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {attachments.map((attachment, index) => (
        <div
          key={index}
          className="relative group bg-muted border rounded-md overflow-hidden"
        >
          {attachment.type === "image" && attachment.preview ? (
            <div className="relative">
              <img
                src={attachment.preview}
                alt={attachment.file.name}
                className="h-20 w-20 object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onRemove(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2 pr-8 min-w-[200px]">
              <FileText className="w-8 h-8 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {attachment.file.name}
                </p>
                <Badge variant="secondary" className="text-xs mt-1">
                  {formatFileSize(attachment.file.size)}
                </Badge>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onRemove(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
