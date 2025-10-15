import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Chat {
  id: string;
  client_name: string;
  company_name: string;
  created_at: string;
  organization_id: string | null;
  last_message?: {
    content: string;
    sender_name: string;
    created_at: string;
    attachments?: any[];
  };
}

interface ChatListProps {
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onCreateChat: () => void;
}

export const ChatList = ({ selectedChatId, onSelectChat, onCreateChat }: ChatListProps) => {
  const { currentOrganization } = useOrganization();

  const { data: chats, isLoading } = useQuery({
    queryKey: ["chats", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) return [];

      // Fetch chats for the current organization
      const { data: chatsData, error: chatsError } = await supabase
        .from("chats")
        .select("*")
        .eq("organization_id", currentOrganization.id)
        .order("updated_at", { ascending: false });

      if (chatsError) throw chatsError;

      // Fetch last message for each chat
      const chatsWithMessages = await Promise.all(
        chatsData.map(async (chat) => {
          const { data: lastMessage } = await supabase
            .from("messages")
            .select(`
              content,
              created_at,
              attachments,
              profiles:sender_id (
                full_name,
                email
              )
            `)
            .eq("chat_id", chat.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          return {
            ...chat,
            last_message: lastMessage
              ? {
                  content: lastMessage.content,
                  sender_name: lastMessage.profiles?.full_name || lastMessage.profiles?.email || "Unknown",
                  created_at: lastMessage.created_at,
                  attachments: lastMessage.attachments,
                }
              : undefined,
          };
        })
      );

      return chatsWithMessages as Chat[];
    },
  });

  if (isLoading) {
    return (
      <div className="w-[400px] border-r bg-sidebar-bg flex items-center justify-center">
        <p className="text-muted-foreground">ჩატების ჩატვირთვა...</p>
      </div>
    );
  }

  return (
    <div className="w-[400px] border-r bg-sidebar-bg flex flex-col">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-lg">ჩატები</h2>
        </div>
        <Button onClick={onCreateChat} className="w-full" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          ახალი ჩატი
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {chats && chats.length > 0 ? (
          <div className="p-2 space-y-1">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={cn(
                  "w-full p-3 rounded-lg text-left transition-colors hover:bg-sidebar-hover",
                  selectedChatId === chat.id && "bg-accent"
                )}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {chat.client_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <div className="font-medium truncate">{chat.client_name}</div>
                      {chat.last_message && (
                        <div className="text-xs text-muted-foreground flex-shrink-0">
                          {formatDistanceToNow(new Date(chat.last_message.created_at), {
                            addSuffix: false,
                          })}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground truncate mb-1">
                      {chat.company_name}
                    </div>
                    {chat.last_message && (
                      <div className="text-sm text-muted-foreground truncate">
                        <span className="font-medium">{chat.last_message.sender_name}: </span>
                        {chat.last_message.attachments && chat.last_message.attachments.length > 0 ? (
                          <span className="italic">📎 Attachment</span>
                        ) : (
                          <span>{chat.last_message.content || "..."}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>ჯერ არ არის ჩატები</p>
            <p className="text-sm">შექმენით თქვენი პირველი ჩატი დასაწყებად</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
