import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FilesList } from "@/components/chat/chat-details/FilesList";
import type { MediaItem } from "@/hooks/useChatMedia";

interface FilesTabProps {
  chatId: string;
}

export const FilesTab = ({ chatId }: FilesTabProps) => {
  // Load messages with attachments
  const { data: messages = [] } = useQuery({
    queryKey: ["files_messages", chatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, created_at, attachments")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Load tasks with attachments
  const { data: tasks = [] } = useQuery({
    queryKey: ["files_tasks", chatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, created_at, attachments")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const files: MediaItem[] = useMemo(() => {
    const out: MediaItem[] = [];
    // From messages
    for (const m of messages as any[]) {
      if (m.attachments && Array.isArray(m.attachments)) {
        for (const a of m.attachments) {
          if (!a || !a.url) continue;
          out.push({
            name: a.name,
            type: a.type,
            url: a.url,
            size: a.size || 0,
            messageId: m.id,
            timestamp: m.created_at,
          });
        }
      }
    }
    // From tasks
    for (const t of tasks as any[]) {
      if (t.attachments && Array.isArray(t.attachments)) {
        for (const a of t.attachments) {
          if (!a || !a.url) continue;
          out.push({
            name: a.name,
            type: a.type,
            url: a.url,
            size: a.size || 0,
            messageId: `task:${t.id}`,
            timestamp: t.created_at,
          });
        }
      }
    }
    // sort by timestamp desc
    return out.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [messages, tasks]);

  return (
    <ScrollArea className="flex-1 p-4">
      <FilesList files={files} />
    </ScrollArea>
  );
};
