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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";
import { UserPlus, Shield, Users } from "lucide-react";

const emailsSchema = z.object({
  emails: z.string().trim().min(1, "At least one email is required"),
  role: z.enum(["team_member", "client"]),
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
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState<"team_member" | "client">("client");

  const addMembersMutation = useMutation({
    mutationFn: async ({
      emails,
      role,
    }: {
      emails: string;
      role: "team_member" | "client";
    }) => {
      const validated = emailsSchema.parse({ emails, role });

      // Split by comma or newline and clean up
      const emailList = validated.emails
        .split(/[,\n]/)
        .map((e) => e.trim())
        .filter((e) => e.length > 0);

      console.debug("[AddMembers] Starting", {
        emailList,
        role: validated.role,
        chatId,
      });

      const results: {
        email: string;
        success: boolean;
        name?: string;
        error?: string;
      }[] = [];

      for (const email of emailList) {
        try {
          // Validate email format
          z.string().email().parse(email);

          // Find user by email
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("id, email, full_name")
            .eq("email", email)
            .maybeSingle();

          if (profileError || !profile) {
            console.debug("[AddMembers] User not found", { email, profileError });
            results.push({
              email,
              success: false,
              error: "User not found",
            });
            continue;
          }

          // Check if already a member
          const { data: existing } = await supabase
            .from("chat_members")
            .select("id")
            .eq("chat_id", chatId)
            .eq("user_id", profile.id)
            .maybeSingle();

          if (existing) {
            console.debug("[AddMembers] Already a member", { email });
            results.push({
              email,
              success: false,
              error: "Already a member",
            });
            continue;
          }

          // Add as chat member
          const { error: memberError } = await supabase
            .from("chat_members")
            .insert({
              chat_id: chatId,
              user_id: profile.id,
            });

          if (memberError) {
            console.debug("[AddMembers] Member insert error", { email, memberError });
            results.push({
              email,
              success: false,
              error: memberError.message,
            });
            continue;
          }

          // Check if user already has this role
          const { data: existingRole } = await supabase
            .from("user_roles")
            .select("id")
            .eq("user_id", profile.id)
            .eq("role", validated.role)
            .maybeSingle();

          // Assign role if they don't have it
          if (!existingRole) {
            const { error: roleError } = await supabase
              .from("user_roles")
              .insert({
                user_id: profile.id,
                role: validated.role,
              });

            if (roleError) {
              console.debug("[AddMembers] Role assign error", { email, roleError });
            }
          }

          console.debug("[AddMembers] Success", { email, userId: profile.id });
          results.push({
            email,
            success: true,
            name: profile.full_name || undefined,
          });
        } catch (err) {
          console.debug("[AddMembers] Email validation error", { email, err });
          results.push({
            email,
            success: false,
            error: "Invalid email format",
          });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      if (successCount > 0) {
        toast.success(
          `Added ${successCount} member${successCount > 1 ? "s" : ""} to chat`
        );
      }

      if (failCount > 0) {
        const failedEmails = results
          .filter((r) => !r.success)
          .map((r) => `${r.email} (${r.error})`)
          .join(", ");
        toast.error(`Failed to add: ${failedEmails}`);
      }

      queryClient.invalidateQueries({ queryKey: ["chat_members", chatId] });
      setEmails("");
      setRole("client");
      onOpenChange(false);
    },
    onError: (error) => {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Failed to add members");
        console.error("[AddMembers] Unexpected error", error);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (emails.trim()) {
      addMembersMutation.mutate({ emails: emails.trim(), role });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add Members to Chat
          </DialogTitle>
          <DialogDescription>
            Enter email addresses (one per line or comma-separated) and select their role
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(v: "team_member" | "client") => setRole(v)}>
                <SelectTrigger
                  id="role"
                  disabled={addMembersMutation.isPending}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>Client</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="team_member">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <span>Team Member (Staff)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {role === "client"
                  ? "Clients can view and send regular messages"
                  : "Team members can view all messages including staff-only notes"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emails">Email Addresses</Label>
              <Textarea
                id="emails"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder="user1@example.com, user2@example.com&#10;or one email per line"
                rows={5}
                required
                disabled={addMembersMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Separate multiple emails with commas or new lines
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={addMembersMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addMembersMutation.isPending}>
              {addMembersMutation.isPending ? "Adding..." : "Add Members"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
