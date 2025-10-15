import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Save, Edit, X } from "lucide-react";
import { toast } from "sonner";

interface AboutProjectTabProps {
  chatId: string;
}

export const AboutProjectTab = ({ chatId }: AboutProjectTabProps) => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState("");

  const { data: chat, isLoading } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chats")
        .select("*")
        .eq("id", chatId)
        .single();

      if (error) throw error;

      // Initialize description state when data loads
      if (data?.project_description) {
        setDescription(data.project_description);
      }

      return data;
    },
  });

  const updateDescriptionMutation = useMutation({
    mutationFn: async (newDescription: string) => {
      const { error } = await supabase
        .from("chats")
        .update({ project_description: newDescription })
        .eq("id", chatId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
      setIsEditing(false);
      toast.success("პროექტის აღწერა შენახულია");
    },
    onError: (error) => {
      toast.error("შენახვა ვერ მოხერხდა");
      console.error(error);
    },
  });

  const handleSave = () => {
    updateDescriptionMutation.mutate(description);
  };

  const handleCancel = () => {
    setDescription(chat?.project_description || "");
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">ჩატვირთვა...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <ScrollArea className="flex-1 p-6">
        <div className="max-w-full space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">პროექტის შესახებ</h2>
                <p className="text-sm text-muted-foreground">
                  დაამატეთ დეტალური ინფორმაცია პროექტის შესახებ
                </p>
              </div>
            </div>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                რედაქტირება
              </Button>
            )}
          </div>

          {/* Description Content */}
          <div className="space-y-4">
            {isEditing ? (
              <div className="space-y-4">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="აღწერეთ პროექტი, მისი მიზნები, მოთხოვნები და ნებისმიერი სხვა დეტალი..."
                  className="min-h-[400px] resize-none"
                  maxLength={5000}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {description.length} / 5000 სიმბოლო
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCancel}
                      variant="outline"
                      disabled={updateDescriptionMutation.isPending}
                    >
                      <X className="w-4 h-4 mr-2" />
                      გაუქმება
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={updateDescriptionMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateDescriptionMutation.isPending ? "შენახვა..." : "შენახვა"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                {chat?.project_description ? (
                  <div className="bg-muted/30 rounded-lg p-6 whitespace-pre-wrap">
                    {chat.project_description}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground text-lg mb-2">
                      პროექტის აღწერა არ არის დამატებული
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      დააჭირეთ რედაქტირების ღილაკს პროექტის აღწერის დასამატებლად
                    </p>
                    <Button onClick={() => setIsEditing(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      დაამატეთ აღწერა
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
