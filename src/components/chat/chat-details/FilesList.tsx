import { useState } from "react";
import { format } from "date-fns";
import { MediaItem } from "@/hooks/useChatMedia";
import { FilePreviewModal } from "../FilePreviewModal";
import { MessageAttachment } from "../ChatWindow";
import { FileText, FileSpreadsheet, File, Eye, Download, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilesListProps {
  files: MediaItem[];
}

const getFileIcon = (type: string) => {
  if (type === "application/pdf") return FileText;
  if (type.includes("spreadsheet") || type.includes("excel") || type.includes("csv"))
    return FileSpreadsheet;
  return File;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

export const FilesList = ({ files }: FilesListProps) => {
  const [previewAttachment, setPreviewAttachment] = useState<MessageAttachment | null>(null);

  const handleDownload = async (file: MediaItem) => {
    try {
      // Fetch the file as a blob
      const response = await fetch(file.url);
      const blob = await response.blob();

      // Create a blob URL
      const blobUrl = URL.createObjectURL(blob);

      // Create a temporary link and trigger download
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const canPreview = (type: string) => type === "application/pdf";

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Folder className="w-12 h-12 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">დოკუმენტები არ არის</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          გაზიარებული ფაილები გამოჩნდება აქ
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {files.map((file, index) => {
          const FileIcon = getFileIcon(file.type);
          return (
            <div
              key={`${file.messageId}-${index}`}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <FileIcon className="w-8 h-8 flex-shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)} • {format(new Date(file.timestamp), "PP")}
                </p>
              </div>
              <div className="flex gap-1">
                {/* Only show preview button for PDFs */}
                {canPreview(file.type) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPreviewAttachment(file)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDownload(file)}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <FilePreviewModal
        attachment={previewAttachment}
        open={!!previewAttachment}
        onOpenChange={(open) => !open && setPreviewAttachment(null)}
      />
    </>
  );
};
