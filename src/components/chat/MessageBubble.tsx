import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Shield, FileText, Download, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageAttachment } from "./ChatWindow";

interface MessageBubbleProps {
  message: string;
  senderName: string;
  isOwn: boolean;
  isStaffOnly: boolean;
  timestamp: string;
  attachments?: MessageAttachment[];
}

export const MessageBubble = ({
  message,
  senderName,
  isOwn,
  isStaffOnly,
  timestamp,
  attachments,
}: MessageBubbleProps) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const isImage = (type: string) => type.startsWith("image/");

  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
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
              {attachments.map((attachment, index) => (
                <div key={index}>
                  {isImage(attachment.type) ? (
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={attachment.url}
                        alt={attachment.name}
                        className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        style={{ maxHeight: "300px" }}
                      />
                    </a>
                  ) : (
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={attachment.name}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                        isOwn
                          ? "bg-background/10 border-background/20 hover:bg-background/20"
                          : "bg-background border-border hover:bg-muted"
                      )}
                    >
                      <FileText className="w-8 h-8 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {attachment.name}
                        </p>
                        <p className="text-xs opacity-70">
                          {formatFileSize(attachment.size)}
                        </p>
                      </div>
                      <Download className="w-4 h-4 flex-shrink-0" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
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
    </div>
  );
};
