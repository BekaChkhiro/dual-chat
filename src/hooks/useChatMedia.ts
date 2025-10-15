import { useMemo } from "react";
import { MessageAttachment } from "@/components/chat/ChatWindow";

interface Message {
  id: string;
  content: string;
  created_at: string;
  attachments?: MessageAttachment[];
}

export interface MediaItem extends MessageAttachment {
  messageId: string;
  timestamp: string;
}

export interface LinkItem {
  url: string;
  messageId: string;
  timestamp: string;
  text?: string;
}

export const useChatMedia = (messages: Message[] | undefined) => {
  return useMemo(() => {
    if (!messages || messages.length === 0) {
      return {
        media: [],
        files: [],
        links: [],
      };
    }

    const media: MediaItem[] = [];
    const files: MediaItem[] = [];
    const links: LinkItem[] = [];

    // URL regex pattern
    const urlRegex = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi;

    messages.forEach((message) => {
      // Extract attachments
      if (message.attachments && message.attachments.length > 0) {
        message.attachments.forEach((attachment) => {
          const item: MediaItem = {
            ...attachment,
            messageId: message.id,
            timestamp: message.created_at,
          };

          if (attachment.type.startsWith("image/")) {
            media.push(item);
          } else {
            files.push(item);
          }
        });
      }

      // Extract links from message content
      if (message.content) {
        const matches = message.content.match(urlRegex);
        if (matches) {
          matches.forEach((url) => {
            links.push({
              url,
              messageId: message.id,
              timestamp: message.created_at,
            });
          });
        }
      }
    });

    // Sort by timestamp (newest first)
    const sortByTimestamp = (a: { timestamp: string }, b: { timestamp: string }) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();

    return {
      media: media.sort(sortByTimestamp),
      files: files.sort(sortByTimestamp),
      links: links.sort(sortByTimestamp),
    };
  }, [messages]);
};
