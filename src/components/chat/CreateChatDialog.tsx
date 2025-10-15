import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
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
  clientName: z.string().trim().min(2, "კლიენტის სახელი უნდა შეიცავდეს მინიმუმ 2 სიმბოლოს").max(100),
  companyName: z.string().trim().min(2, "კომპანიის სახელი უნდა შეიცავდეს მინიმუმ 2 სიმბოლოს").max(100),
});

interface CreateChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateChatDialog = ({ open, onOpenChange }: CreateChatDialogProps) => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const [clientName, setClientName] = useState("");
  const [companyName, setCompanyName] = useState("");

  const createChatMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrganization) {
        throw new Error("გთხოვთ აირჩიოთ ორგანიზაცია");
      }

      const validated = chatSchema.parse({ clientName, companyName });

      // Debug: log context before creating
      console.debug("[CreateChat] Starting", {
        userId: user?.id,
        organizationId: currentOrganization.id,
        payload: { clientName: validated.clientName, companyName: validated.companyName },
      });

      // Debug: check server-side role via RPC
      try {
        const { data: hasTeam, error: roleErr } = await supabase.rpc("has_role", {
          _user_id: user!.id,
          _role: "team_member",
        });
        console.debug("[CreateChat] has_role(team_member)", { hasTeam, roleErr });
      } catch (e) {
        console.debug("[CreateChat] RPC has_role failed", e);
      }

      // Create chat with organization_id
      const { data: chat, error: chatError } = await supabase
        .from("chats")
        .insert({
          client_name: validated.clientName,
          company_name: validated.companyName,
          created_by: user!.id,
          organization_id: currentOrganization.id,
        })
        .select()
        .single();

      console.debug("[CreateChat] Insert chats response", { chat, chatError });
      if (chatError) throw chatError;

      // Add creator as member
      const { error: memberError } = await supabase
        .from("chat_members")
        .insert({
          chat_id: chat.id,
          user_id: user!.id,
        });

      console.debug("[CreateChat] Insert chat_members response", { memberError });
      if (memberError) throw memberError;

      return chat;
    },
    onSuccess: () => {
      toast.success("ჩატი წარმატებით შეიქმნა!");
      console.debug("[CreateChat] Success - invalidating chats list");
      queryClient.invalidateQueries({ queryKey: ["chats", currentOrganization?.id] });
      setClientName("");
      setCompanyName("");
      onOpenChange(false);
    },
    onError: (error) => {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("ჩატის შექმნა ვერ მოხერხდა");
        console.error("[CreateChat] Error details", {
          code: (error as any)?.code,
          message: (error as any)?.message,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
        });
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
          <DialogTitle>ახალი ჩატის შექმნა</DialogTitle>
          <DialogDescription>
            დაიწყეთ ახალი საუბარი კლიენტთან
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">კლიენტის სახელი</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="გიორგი ბერიძე"
                required
                disabled={createChatMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">კომპანიის სახელი</Label>
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
              გაუქმება
            </Button>
            <Button type="submit" disabled={createChatMutation.isPending}>
              {createChatMutation.isPending ? "იქმნება..." : "ჩატის შექმნა"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
