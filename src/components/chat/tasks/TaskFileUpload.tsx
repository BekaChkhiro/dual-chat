import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, X, FileText, Image as ImageIcon, File } from "lucide-react";

export interface TaskAttachment {
  name: string;
  type: string;
  url: string;
  size: number;
}

interface TaskFileUploadProps {
  attachments: TaskAttachment[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
}

const getFileIcon = (type: string) => {
  if (type.startsWith("image/")) {
    return <ImageIcon className="w-full h-full" />;
  }
  if (
    type.includes("word") ||
    type.includes("document") ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return <FileText className="w-full h-full" />;
  }
  if (
    type.includes("sheet") ||
    type.includes("excel") ||
    type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return <FileText className="w-full h-full" />;
  }
  return <File className="w-full h-full" />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
};

export const TaskFileUpload = ({
  attachments,
  onAdd,
  onRemove,
  disabled,
}: TaskFileUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onAdd(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      {/* Upload Button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          <Paperclip className="w-4 h-4 mr-2" />
          ფაილის დამატება
        </Button>
      </div>

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {attachments.map((attachment, index) => {
            const isImage = attachment.type.startsWith("image/");

            return (
              <div
                key={index}
                className="relative group rounded-lg overflow-hidden border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                {isImage ? (
                  // Image Preview
                  <div className="aspect-square">
                    {attachment.url ? (
                      <img
                        src={attachment.url}
                        alt={attachment.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ) : (
                  // File Icon Preview
                  <div className="aspect-square flex flex-col items-center justify-center p-4 bg-muted">
                    <div className="text-muted-foreground">
                      <div className="w-12 h-12 flex items-center justify-center">
                        {getFileIcon(attachment.type)}
                      </div>
                    </div>
                  </div>
                )}

                {/* File Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-white text-xs font-medium truncate">
                    {attachment.name}
                  </p>
                  <p className="text-white/70 text-xs">
                    {formatFileSize(attachment.size)}
                  </p>
                </div>

                {/* Remove Button */}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onRemove(index)}
                  disabled={disabled}
                >
                  <X className="w-3 h-3" />
                </Button>

                {/* View Link for uploaded files */}
                {attachment.url && (
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-1 left-1 bg-black/60 hover:bg-black/80 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ნახვა
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
