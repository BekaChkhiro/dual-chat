import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Shield } from "lucide-react";

interface MessageBubbleProps {
  message: string;
  senderName: string;
  isOwn: boolean;
  isStaffOnly: boolean;
  timestamp: string;
}

export const MessageBubble = ({
  message,
  senderName,
  isOwn,
  isStaffOnly,
  timestamp,
}: MessageBubbleProps) => {
  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[70%] space-y-1")}>
        {!isOwn && (
          <div className="flex items-center gap-2 px-3">
            <span className="text-xs font-medium text-foreground">
              {senderName}
            </span>
            {isStaffOnly && (
              <Shield className="w-3 h-3 text-staff" />
            )}
          </div>
        )}
        <div
          className={cn(
            "rounded-2xl px-4 py-2 shadow-sm",
            isOwn
              ? isStaffOnly
                ? "bg-staff text-staff-foreground rounded-tr-sm"
                : "bg-chat-sent text-primary-foreground rounded-tr-sm"
              : "bg-chat-received text-foreground rounded-tl-sm"
          )}
        >
          <p className="text-sm break-words whitespace-pre-wrap">{message}</p>
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
          {isOwn && isStaffOnly && (
            <Shield className="w-3 h-3 text-staff" />
          )}
        </div>
      </div>
    </div>
  );
};
