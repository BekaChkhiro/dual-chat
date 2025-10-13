import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, MessageSquare } from "lucide-react";
import { ModeToggle } from "./ModeToggle";
import { MessageBubble } from "./MessageBubble";
import { toast } from "sonner";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  is_staff_only: boolean;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string;
  };
}

interface ChatWindowProps {
  chatId: string;
}

export const ChatWindow = ({ chatId }: ChatWindowProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [isStaffMode, setIsStaffMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: ["messages", chatId],
    queryFn: async () => {
      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;

      // Fetch profiles for all senders
      const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", senderIds);

      if (profilesError) throw profilesError;

      // Map profiles to messages
      const profilesMap = new Map(profilesData.map(p => [p.id, p]));
      
      return messagesData.map(msg => ({
        ...msg,
        profiles: profilesMap.get(msg.sender_id) || { full_name: null, email: "Unknown" }
      })) as Message[];
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
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, queryClient]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("messages").insert({
        chat_id: chatId,
        sender_id: user!.id,
        content,
        is_staff_only: isStaffMode,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
    },
    onError: (error) => {
      toast.error("Failed to send message");
      console.error(error);
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && user) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  // Staff Mode: show only staff-only messages
  // Client Mode: show only non-staff messages
  const filteredMessages = messages?.filter((msg) =>
    isStaffMode ? msg.is_staff_only : !msg.is_staff_only
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-chat-bg">
        <p className="text-muted-foreground">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-chat-bg">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg">{chat?.client_name}</h2>
            <p className="text-sm text-muted-foreground">{chat?.company_name}</p>
          </div>
          <ModeToggle isStaffMode={isStaffMode} onToggle={setIsStaffMode} />
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {filteredMessages && filteredMessages.length > 0 ? (
          <div className="space-y-4 max-w-4xl mx-auto">
            {filteredMessages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg.content}
                senderName={msg.profiles?.full_name || msg.profiles?.email || "Unknown"}
                isOwn={msg.sender_id === user?.id}
                isStaffOnly={msg.is_staff_only}
                timestamp={msg.created_at}
              />
            ))}
            <div ref={scrollRef} />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-center">
            <div>
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground text-lg mb-2">No messages yet</p>
              <p className="text-sm text-muted-foreground">
                Start the conversation by sending a message below
              </p>
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t bg-card p-4">
        <form onSubmit={handleSend} className="flex gap-2 max-w-4xl mx-auto">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              isStaffMode
                ? "Staff-only message..."
                : "Type a message..."
            }
            className="flex-1"
            disabled={sendMessageMutation.isPending}
          />
          <Button
            type="submit"
            disabled={!message.trim() || sendMessageMutation.isPending}
            className={isStaffMode ? "bg-staff hover:bg-staff-hover" : ""}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        {isStaffMode && (
          <p className="text-xs text-staff text-center mt-2">
            Messages sent in staff mode are only visible to team members
          </p>
        )}
      </div>
    </div>
  );
};
