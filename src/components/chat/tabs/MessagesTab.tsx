import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, MessageSquare } from "lucide-react";
import { MessageBubble } from "../MessageBubble";
import { EmojiPicker } from "../EmojiPicker";
import { FileUploadButton, AttachmentPreview } from "../FileUpload";
import { AttachmentPreviewList } from "../AttachmentPreviewList";
import { MessageAttachment } from "../ChatWindow";
import { toast } from "sonner";

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

interface MessagesTabProps {
  chatId: string;
  messages: Message[] | undefined;
  isStaffMode: boolean;
}

export const MessagesTab = ({ chatId, messages, isStaffMode }: MessagesTabProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const listChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Auto scroll to bottom when chat changes (instant) or new message arrives (smooth)
  const prevChatIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      // If chat ID changed, scroll instantly to bottom
      if (prevChatIdRef.current !== chatId) {
        scrollRef.current.scrollIntoView({ behavior: "auto", block: "end" });
        prevChatIdRef.current = chatId;
      } else {
        // If new message in same chat, scroll smoothly
        scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }
  }, [messages, chatId]);

  // Setup broadcast channels (chat-specific and list-wide)
  useEffect(() => {
    const ch = supabase
      .channel(`chat:broadcast:${chatId}`, { config: { broadcast: { self: true } } })
      .on('broadcast', { event: '*' }, () => {
        // Refetch messages when any message event fires (new/update/delete)
        queryClient.refetchQueries({ queryKey: ["messages", chatId] });
      })
      .subscribe();
    channelRef.current = ch;
    const listCh = supabase
      .channel('chat:broadcast:list', { config: { broadcast: { self: true } } })
      .on('broadcast', { event: '*' }, () => {
        // Refresh chat list previews
        queryClient.refetchQueries({ queryKey: ["chats"] });
      })
      .subscribe();
    listChannelRef.current = listCh;
    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
      supabase.removeChannel(listCh);
      listChannelRef.current = null;
    };
  }, [chatId, queryClient]);

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
      try {
        channelRef.current?.send({ type: 'broadcast', event: 'update_message', payload: { chatId } });
        listChannelRef.current?.send({ type: 'broadcast', event: 'update_message', payload: { chatId } });
      } catch {}
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
      try {
        channelRef.current?.send({ type: 'broadcast', event: 'delete_message', payload: { chatId } });
        listChannelRef.current?.send({ type: 'broadcast', event: 'delete_message', payload: { chatId } });
      } catch {}
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
      const { data: messageData, error } = await supabase
        .from("messages")
        .insert({
          chat_id: chatId,
          sender_id: user!.id,
          content: content || '',
          is_staff_only: isStaffMode,
          attachments: uploadedAttachments,
        })
        .select()
        .single();

      if (error) throw error;

      // Send push notifications to chat members (async, don't wait for it)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          supabase.functions.invoke('notify-new-message', {
            body: {
              message_id: messageData.id,
              chat_id: chatId,
              sender_id: user!.id,
              message_text: content,
              is_staff_only: isStaffMode,
            },
          }).catch((err) => {
            // Log error but don't fail the message send
            console.warn('Failed to send push notifications:', err);
          });
        }
      } catch (err) {
        console.warn('Failed to trigger push notifications:', err);
      }

      return messageData;
    },
    onSuccess: () => {
      setMessage("");
      setAttachments([]);
      queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
      // Notify other clients via realtime broadcast
      try {
        channelRef.current?.send({ type: 'broadcast', event: 'new_message', payload: { chatId } });
        listChannelRef.current?.send({ type: 'broadcast', event: 'new_message', payload: { chatId } });
      } catch {}
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

  return (
    <>
      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 p-3 sm:p-4">
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
      <div className={`border-t bg-card p-3 sm:p-4 md:pb-4 ${!isStaffMode ? 'pb-[calc(env(safe-area-inset-bottom)+1.5rem)]' : ''}`}>
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
    </>
  );
};
