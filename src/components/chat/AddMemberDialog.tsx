import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { UserPlus } from "lucide-react";

const emailSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
});

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string;
}

export const AddMemberDialog = ({
  open,
  onOpenChange,
  chatId,
}: AddMemberDialogProps) => {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");

  const addMemberMutation = useMutation({
    mutationFn: async (email: string) => {
      const validated = emailSchema.parse({ email });

      console.debug("[AddMember] Starting", { email: validated.email, chatId });

      // Find user by email
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("email", validated.email)
        .single();

      if (profileError || !profile) {
        console.debug("[AddMember] User not found", { profileError });
        throw new Error("User with this email not found");
      }

      console.debug("[AddMember] Found user", { userId: profile.id });

      // Check if already a member
      const { data: existing, error: checkError } = await supabase
        .from("chat_members")
        .select("id")
        .eq("chat_id", chatId)
        .eq("user_id", profile.id)
        .maybeSingle();

      if (checkError) {
        console.debug("[AddMember] Check error", { checkError });
        throw checkError;
      }

      if (existing) {
        console.debug("[AddMember] Already a member");
        throw new Error("This user is already a member of this chat");
      }

      // Add as member
      const { error: insertError } = await supabase
        .from("chat_members")
        .insert({
          chat_id: chatId,
          user_id: profile.id,
        });

      console.debug("[AddMember] Insert result", { insertError });
      if (insertError) throw insertError;

      return profile;
    },
    onSuccess: (profile) => {
      toast.success(`${profile.full_name || profile.email} added to chat`);
      queryClient.invalidateQueries({ queryKey: ["chat_members", chatId] });
      setEmail("");
      onOpenChange(false);
    },
    onError: (error) => {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to add member");
        console.error("[AddMember] Unexpected error", error);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      addMemberMutation.mutate(email.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add Member to Chat
          </DialogTitle>
          <DialogDescription>
            Enter the email address of the person you want to add to this chat
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                disabled={addMemberMutation.isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={addMemberMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addMemberMutation.isPending}>
              {addMemberMutation.isPending ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
