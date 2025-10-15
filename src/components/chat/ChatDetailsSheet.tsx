import { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image, FileText, Link2, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useChatMedia } from "@/hooks/useChatMedia";
import { MediaGrid } from "./chat-details/MediaGrid";
import { FilesList } from "./chat-details/FilesList";
import { LinksList } from "./chat-details/LinksList";
import { MembersList } from "./chat-details/MembersList";
import { ModeToggle } from "./ModeToggle";

interface ChatDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string;
  isStaffMode: boolean;
  onToggleStaffMode: (value: boolean) => void;
}

export const ChatDetailsSheet = ({ open, onOpenChange, chatId, isStaffMode, onToggleStaffMode }: ChatDetailsSheetProps) => {
  const { user } = useAuth();

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
    enabled: !!user && open,
    staleTime: 0,
    cacheTime: 0,
  });

  const isStaff =
    Array.isArray(currentUserRoles) &&
    (currentUserRoles.includes("admin") || currentUserRoles.includes("team_member"));

  const { data: messages } = useQuery({
    queryKey: ["chat_details_messages", chatId], // Changed to avoid cache conflict with ChatWindow
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Filter messages based on staff mode
  const filteredMessages = useMemo(() => {
    if (!messages) return undefined;
    return messages.filter((msg) =>
      isStaffMode ? msg.is_staff_only : !msg.is_staff_only
    );
  }, [messages, isStaffMode]);

  const { media, files, links } = useChatMedia(filteredMessages);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto pt-12">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>ჩატის დეტალები</SheetTitle>
              <SheetDescription>
                მედია, ფაილები და ლინკები
              </SheetDescription>
            </div>
            {/* Only show ModeToggle for staff */}
            {isStaff && <ModeToggle isStaffMode={isStaffMode} onToggle={onToggleStaffMode} />}
          </div>
        </SheetHeader>

        <Tabs defaultValue={isStaff ? "members" : "media"} className="mt-6">
          <TabsList className={`grid w-full ${isStaff ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {/* Only show Members tab for staff */}
            {isStaff && (
              <TabsTrigger value="members" className="gap-2">
                <Users className="w-4 h-4" />
                წევრები
              </TabsTrigger>
            )}
            <TabsTrigger value="media" className="gap-2">
              <Image className="w-4 h-4" />
              მედია {media.length > 0 && `(${media.length})`}
            </TabsTrigger>
            <TabsTrigger value="files" className="gap-2">
              <FileText className="w-4 h-4" />
              ფაილები {files.length > 0 && `(${files.length})`}
            </TabsTrigger>
            <TabsTrigger value="links" className="gap-2">
              <Link2 className="w-4 h-4" />
              ლინკები {links.length > 0 && `(${links.length})`}
            </TabsTrigger>
          </TabsList>

          {/* Only show Members content for staff */}
          {isStaff && (
            <TabsContent value="members" className="mt-4">
              <MembersList chatId={chatId} />
            </TabsContent>
          )}

          <TabsContent value="media" className="mt-4">
            <MediaGrid media={media} />
          </TabsContent>

          <TabsContent value="files" className="mt-4">
            <FilesList files={files} />
          </TabsContent>

          <TabsContent value="links" className="mt-4">
            <LinksList links={links} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
