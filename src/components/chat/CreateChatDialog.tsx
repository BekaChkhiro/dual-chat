import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";

const chatSchema = z.object({
  clientName: z.string().trim().min(2, "Client name must be at least 2 characters").max(100),
  companyName: z.string().trim().min(2, "Company name must be at least 2 characters").max(100),
});

interface CreateChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateChatDialog = ({ open, onOpenChange }: CreateChatDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [clientName, setClientName] = useState("");
  const [companyName, setCompanyName] = useState("");

  const createChatMutation = useMutation({
    mutationFn: async () => {
      const validated = chatSchema.parse({ clientName, companyName });

      // Create chat
      const { data: chat, error: chatError } = await supabase
        .from("chats")
        .insert({
          client_name: validated.clientName,
          company_name: validated.companyName,
          created_by: user!.id,
        })
        .select()
        .single();

      if (chatError) throw chatError;

      // Add creator as member
      const { error: memberError } = await supabase
        .from("chat_members")
        .insert({
          chat_id: chat.id,
          user_id: user!.id,
        });

      if (memberError) throw memberError;

      return chat;
    },
    onSuccess: () => {
      toast.success("Chat created successfully!");
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      setClientName("");
      setCompanyName("");
      onOpenChange(false);
    },
    onError: (error) => {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Failed to create chat");
        console.error(error);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createChatMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Chat</DialogTitle>
          <DialogDescription>
            Start a new conversation with a client
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="John Doe"
                required
                disabled={createChatMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Corp"
                required
                disabled={createChatMutation.isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createChatMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createChatMutation.isPending}>
              {createChatMutation.isPending ? "Creating..." : "Create Chat"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
