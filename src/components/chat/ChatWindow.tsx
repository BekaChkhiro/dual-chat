import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, MessageSquare, MoreVertical } from "lucide-react";
import { ModeToggle } from "./ModeToggle";
import { MessageBubble } from "./MessageBubble";
import { ChatDetailsSheet } from "./ChatDetailsSheet";
import { EmojiPicker } from "./EmojiPicker";
import { FileUploadButton, AttachmentPreview } from "./FileUpload";
import { AttachmentPreviewList } from "./AttachmentPreviewList";
import { toast } from "sonner";

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
}

export const ChatWindow = ({ chatId }: ChatWindowProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [isStaffMode, setIsStaffMode] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    queryKey: ["messages", chatId],
    queryFn: async () => {
      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
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

  const editMessageMutation = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      const { error } = await supabase
        .from("messages")
        .update({ content })
        .eq("id", messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
      toast.success("მესიჯი შეიცვალა");
    },
    onError: (error) => {
      toast.error("მესიჯის რედაქტირება ვერ მოხერხდა");
      console.error(error);
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
      toast.success("მესიჯი წაიშალა");
    },
    onError: (error) => {
      toast.error("მესიჯის წაშლა ვერ მოხერხდა");
      console.error(error);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, files }: { content: string; files: AttachmentPreview[] }) => {
      const uploadedAttachments: MessageAttachment[] = [];

      // Upload files to Supabase storage
      if (files.length > 0) {
        for (const attachment of files) {
          const fileExt = attachment.file.name.split('.').pop();
          const fileName = `${user!.id}/${chatId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('chat-attachments')
            .upload(fileName, attachment.file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error(`Failed to upload ${attachment.file.name}`);
          }

          // Get signed URL (valid for 1 year) - bucket is private
          // Use download: 'attachment.file.name' to preserve original filename when downloading
          const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from('chat-attachments')
            .createSignedUrl(fileName, 31536000, {
              download: false // Don't force download, allow inline viewing
            });

          if (signedUrlError) {
            console.error('Signed URL error:', signedUrlError);
            throw new Error(`Failed to create URL for ${attachment.file.name}`);
          }

          uploadedAttachments.push({
            name: attachment.file.name,
            type: attachment.file.type,
            url: signedUrlData.signedUrl,
            size: attachment.file.size,
          });
        }
      }

      // Insert message with attachments
      const { error } = await supabase.from("messages").insert({
        chat_id: chatId,
        sender_id: user!.id,
        content: content || '',
        is_staff_only: isStaffMode,
        attachments: uploadedAttachments,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
      setAttachments([]);
      queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to send message");
      console.error(error);
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if ((message.trim() || attachments.length > 0) && user) {
      sendMessageMutation.mutate({ content: message.trim(), files: attachments });
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const handleFilesSelect = (newFiles: AttachmentPreview[]) => {
    setAttachments((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => {
      const newAttachments = [...prev];
      const removed = newAttachments.splice(index, 1)[0];
      // Revoke object URL to prevent memory leaks
      if (removed.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return newAttachments;
    });
  };

  // Staff Mode: show only staff-only messages
  // Client Mode: show only non-staff messages
  const filteredMessages = messages?.filter((msg) =>
    isStaffMode ? msg.is_staff_only : !msg.is_staff_only
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-chat-bg">
        <p className="text-muted-foreground">შეტყობინებების ჩატვირთვა...</p>
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
          <div className="flex items-center gap-3">
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

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {filteredMessages && filteredMessages.length > 0 ? (
          <div className="space-y-4">
            {filteredMessages.map((msg) => (
              <MessageBubble
                key={msg.id}
                messageId={msg.id}
                message={msg.content}
                senderName={msg.profiles?.full_name || msg.profiles?.email || "Unknown"}
                isOwn={msg.sender_id === user?.id}
                isStaffOnly={msg.is_staff_only}
                timestamp={msg.created_at}
                attachments={msg.attachments}
                onEdit={(newContent) => editMessageMutation.mutate({ messageId: msg.id, content: newContent })}
                onDelete={() => deleteMessageMutation.mutate(msg.id)}
              />
            ))}
            <div ref={scrollRef} />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-center">
            <div>
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground text-lg mb-2">ჯერ არ არის შეტყობინებები</p>
              <p className="text-sm text-muted-foreground">
                დაიწყეთ საუბარი შეტყობინების გაგზავნით
              </p>
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t bg-card p-4">
        {/* Attachment Preview */}
        <AttachmentPreviewList
          attachments={attachments}
          onRemove={handleRemoveAttachment}
        />

        {/* Input Row - All in one line */}
        <form onSubmit={handleSend} className="flex items-center gap-2 w-full">
          <FileUploadButton
            onFilesSelect={handleFilesSelect}
            disabled={sendMessageMutation.isPending}
          />
          <EmojiPicker onEmojiSelect={handleEmojiSelect} />
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              isStaffMode
                ? "პერსონალის შეტყობინება..."
                : "შეიყვანეთ შეტყობინება..."
            }
            className="flex-1"
            disabled={sendMessageMutation.isPending}
          />
          <Button
            type="submit"
            disabled={(!message.trim() && attachments.length === 0) || sendMessageMutation.isPending}
            className={isStaffMode ? "bg-staff hover:bg-staff-hover" : ""}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>

        {/* Staff mode indicator */}
        {isStaffMode && (
          <p className="text-xs text-staff text-center mt-2">
            პერსონალის რეჟიმში გაგზავნილი შეტყობინებები ხილული იქნება მხოლოდ გუნდის წევრებისთვის
          </p>
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
