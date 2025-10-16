import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { MoreVertical, ArrowLeft } from "lucide-react";
import { ModeToggle } from "./ModeToggle";
import { ChatDetailsSheet } from "./ChatDetailsSheet";
import { StaffTabs } from "./StaffTabs";
import { MessagesTab } from "./tabs/MessagesTab";
import { AboutProjectTab } from "./tabs/AboutProjectTab";
import { TasksTab } from "./tabs/TasksTab";
import { KanbanBoard } from "./tabs/KanbanBoard";
import { CalendarView } from "./tabs/CalendarView";
import { FilesTab } from "./tabs/FilesTab";

export interface MessageAttachment {
  name: string;
  type: string;
  url: string;
  size: number;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  is_staff_only: boolean;
  created_at: string;
  attachments?: MessageAttachment[];
  profiles: {
    full_name: string | null;
    email: string;
  };
}

interface ChatWindowProps {
  chatId: string;
  onBack?: () => void;
}

export const ChatWindow = ({ chatId, onBack }: ChatWindowProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isStaffMode, setIsStaffMode] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Check if current user is staff
  const { data: currentUserRoles = [] } = useQuery({
    queryKey: ["user_roles", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) throw error;
      return data?.map((r) => r.role) || [];
    },
    enabled: !!user,
    staleTime: 0,
    cacheTime: 0,
  });

  const isStaff =
    Array.isArray(currentUserRoles) &&
    (currentUserRoles.includes("admin") || currentUserRoles.includes("team_member"));

  const { data: messages, isLoading } = useQuery({
    queryKey: ["messages", chatId, isStaffMode ? 'staff' : 'client'],
    queryFn: async () => {
      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .eq("is_staff_only", isStaffMode)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;

      if (!messagesData || messagesData.length === 0) {
        return [];
      }

      // Fetch profiles for all senders
      const senderIds = [...new Set(messagesData.map(m => m.sender_id))];

      if (senderIds.length === 0) {
        return messagesData.map(msg => ({
          ...msg,
          profiles: { full_name: null, email: "Unknown" }
        })) as Message[];
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", senderIds);

      if (profilesError) {
        console.error('[ChatWindow] Error fetching profiles:', profilesError);
        // Return messages with Unknown profiles if profile fetch fails
        return messagesData.map(msg => ({
          ...msg,
          profiles: { full_name: null, email: "Unknown User" }
        })) as Message[];
      }

      // Map profiles to messages
      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

      return messagesData.map(msg => {
        const profile = profilesMap.get(msg.sender_id);

        if (!profile) {
          console.warn('[ChatWindow] No profile found for sender:', msg.sender_id);
        }

        return {
          ...msg,
          profiles: profile || { full_name: null, email: "Unknown User" }
        };
      }) as Message[];
    },
  });

  const { data: chat } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chats")
        .select("*")
        .eq("id", chatId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        () => {
          queryClient.refetchQueries({ queryKey: ["messages", chatId, isStaffMode ? 'staff' : 'client'] });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        () => {
          queryClient.refetchQueries({ queryKey: ["messages", chatId, isStaffMode ? 'staff' : 'client'] });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        () => {
          queryClient.refetchQueries({ queryKey: ["messages", chatId, isStaffMode ? 'staff' : 'client'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, queryClient, isStaffMode]);

  // Realtime broadcast (works even if DB publication isn't enabled)
  useEffect(() => {
    const bcast = supabase
      .channel(`chat:broadcast:${chatId}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: '*' }, () => {
        queryClient.refetchQueries({ queryKey: ["messages", chatId, isStaffMode ? 'staff' : 'client'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(bcast);
    };
  }, [chatId, queryClient, isStaffMode]);


  if (isLoading) {
    return (
      <div className={`flex-1 flex items-center justify-center ${isStaffMode ? 'staff-mode bg-white' : 'bg-chat-bg'}`}>
        <p className="text-muted-foreground">შეტყობინებების ჩატვირთვა...</p>
      </div>
    );
  }

  const showingStaffTabs = isStaff && isStaffMode;

  return (
    <div className={`flex-1 min-h-0 flex flex-col overflow-x-hidden ${showingStaffTabs ? 'staff-mode' : 'bg-chat-bg'}`}>
      {/* Header */}
      <div className="border-b bg-card p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {onBack && (
              <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <h2 className="font-semibold text-lg">{chat?.client_name}</h2>
            <p className="text-sm text-muted-foreground">{chat?.company_name}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Only show ModeToggle for staff */}
            {isStaff && <ModeToggle isStaffMode={isStaffMode} onToggle={setIsStaffMode} />}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDetailsOpen(true)}
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content area fills remaining height */}
      <div className="flex-1 min-h-0 flex flex-col">
        {isStaff && isStaffMode ? (
          <StaffTabs chatId={chatId}>
            {{
              messages: <MessagesTab chatId={chatId} messages={messages} isStaffMode={isStaffMode} />,
              about: <AboutProjectTab chatId={chatId} />,
              tasks: <TasksTab chatId={chatId} />,
              kanban: <KanbanBoard chatId={chatId} />,
              calendar: <CalendarView chatId={chatId} />,
              files: <FilesTab chatId={chatId} />,
            }}
          </StaffTabs>
        ) : (
          <MessagesTab chatId={chatId} messages={messages} isStaffMode={isStaffMode} />
        )}
      </div>

      <ChatDetailsSheet
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        chatId={chatId}
        isStaffMode={isStaffMode}
        onToggleStaffMode={setIsStaffMode}
      />
    </div>
  );
};
