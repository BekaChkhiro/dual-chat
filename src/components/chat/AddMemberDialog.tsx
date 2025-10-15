import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";
import { UserPlus, Shield, Users, X, Search, Crown } from "lucide-react";
import { useUserSearch } from "@/hooks/useUserSearch";
import { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const emailsSchema = z.object({
  emails: z.string().trim(),
  role: z.enum(["admin", "team_member", "client"]),
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState<"admin" | "team_member" | "client">("client");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { users, loading } = useUserSearch(searchQuery, chatId);
  const searchRef = useRef<HTMLDivElement>(null);

  // Check if user is staff (admin or team_member)
  const { data: isStaff, isLoading: isLoadingRole } = useQuery({
    queryKey: ["is_staff", user?.id], // Changed from "user_roles" to avoid cache conflict
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "team_member"]);

      if (error) throw error;
      return data && data.length > 0;
    },
    enabled: !!user && open,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setPopoverOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addMembersMutation = useMutation({
    mutationFn: async ({
      emails,
      role,
    }: {
      emails: string;
      role: "admin" | "team_member" | "client";
    }) => {
      const validated = emailsSchema.parse({ emails, role });

      // Check if we have any emails to process
      if (!validated.emails || validated.emails.trim().length === 0) {
        throw new Error("სულ მცირე ერთი ელ. ფოსტა სავალდებულოა");
      }

      // Get chat details
      const { data: chat } = await supabase
        .from("chats")
        .select("client_name")
        .eq("id", chatId)
        .single();

      // Get inviter profile
      const { data: inviterProfile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user!.id)
        .single();

      const inviterName = inviterProfile?.full_name || inviterProfile?.email || "Someone";
      const chatName = chat?.client_name || "a chat";

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
        invited?: boolean;
      }[] = [];

      for (const email of emailList) {
        try {
          // Validate email format
          z.string().email().parse(email);

          // Check if user exists
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, email, full_name")
            .eq("email", email)
            .maybeSingle();

          if (profile) {
            // User exists - add directly
            const { data: existing } = await supabase
              .from("chat_members")
              .select("id")
              .eq("chat_id", chatId)
              .eq("user_id", profile.id)
              .maybeSingle();

            if (existing) {
              results.push({
                email,
                success: false,
                error: "უკვე არის წევრი",
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
              results.push({
                email,
                success: false,
                error: memberError.message,
              });
              continue;
            }

            // Assign role: delete all existing roles and add new one
            console.log('[AddMembers] Assigning role:', validated.role, 'to user:', profile.id);

            // Delete all existing roles
            await supabase
              .from("user_roles")
              .delete()
              .eq("user_id", profile.id);

            // Add new role (only if not "client" - client means no roles)
            if (validated.role !== "client") {
              const { error: roleError } = await supabase
                .from("user_roles")
                .insert({
                  user_id: profile.id,
                  role: validated.role,
                });

              if (roleError) {
                console.error('[AddMembers] Error assigning role:', roleError);
                // Don't fail the whole operation, just log it
              }
            }

            results.push({
              email,
              success: true,
              name: profile.full_name || undefined,
            });
          } else {
            // User doesn't exist - send invitation
            const token = crypto.randomUUID();
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

            // Create invitation
            const { error: inviteError } = await supabase
              .from("chat_invitations")
              .insert({
                chat_id: chatId,
                email,
                role: validated.role,
                invited_by: user!.id,
                token,
                expires_at: expiresAt.toISOString(),
              });

            if (inviteError) {
              // Check if invitation already exists
              if (inviteError.code === "23505") {
                results.push({
                  email,
                  success: false,
                  error: "მოსაწვევი უკვე გაგზავნილია",
                });
              } else {
                results.push({
                  email,
                  success: false,
                  error: inviteError.message,
                });
              }
              continue;
            }

            // Send invitation email
            const invitationUrl = `${window.location.origin}/auth?invitation=${token}`;
            
            try {
              await supabase.functions.invoke("send-chat-invitation", {
                body: {
                  email,
                  chatName,
                  inviterName,
                  invitationUrl,
                  role: validated.role,
                },
              });

              results.push({
                email,
                success: true,
                invited: true,
              });
            } catch (emailError) {
              console.error("[AddMembers] Email send error", { email, emailError });
              results.push({
                email,
                success: true,
                invited: true,
                error: "მოსაწვევი შეიქმნა, მაგრამ ელ. ფოსტის გაგზავნა ვერ მოხერხდა",
              });
            }
          }
        } catch (err) {
          console.debug("[AddMembers] Email validation error", { email, err });
          results.push({
            email,
            success: false,
            error: "არასწორი ელ. ფოსტის ფორმატი",
          });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      const addedCount = results.filter((r) => r.success && !r.invited).length;
      const invitedCount = results.filter((r) => r.success && r.invited).length;
      const failCount = results.filter((r) => !r.success).length;

      if (addedCount > 0) {
        toast.success(
          `დაემატა ${addedCount} წევრი ჩატში`
        );
      }

      if (invitedCount > 0) {
        toast.success(
          `გაიგზავნა ${invitedCount} მოსაწვევი ელ. ფოსტით`
        );
      }

      if (failCount > 0) {
        const failedEmails = results
          .filter((r) => !r.success)
          .map((r) => `${r.email} (${r.error})`)
          .join(", ");
        toast.error(`ვერ მოხერხდა: ${failedEmails}`);
      }

      queryClient.invalidateQueries({ queryKey: ["chat_members", chatId] });
      setEmails("");
      setRole("client");
      setSelectedUsers([]);
      setSearchQuery("");
      onOpenChange(false);
    },
    onError: (error) => {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("წევრების დამატება ვერ მოხერხდა");
        console.error("[AddMembers] Unexpected error", error);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Combine selected users' emails with manually entered emails
    const selectedEmails = selectedUsers.map(u => u.email).join(", ");
    const allEmails = [selectedEmails, emails.trim()]
      .filter(e => e.length > 0)
      .join(", ");

    if (allEmails.trim()) {
      addMembersMutation.mutate({ emails: allEmails, role });
    } else {
      toast.error("გთხოვთ აირჩიოთ ან შეიყვანოთ სულ მცირე ერთი ელ. ფოსტა");
    }
  };

  const handleSelectUser = (profile: Profile) => {
    if (!selectedUsers.find(u => u.id === profile.id)) {
      setSelectedUsers([...selectedUsers, profile]);
    }
    setSearchQuery("");
    setPopoverOpen(false);
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // Reset state when closing
      setEmails("");
      setRole("client");
      setSearchQuery("");
      setSelectedUsers([]);
    }
    onOpenChange(open);
  };

  // Show loading state while checking role
  if (isLoadingRole) {
    return (
      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="text-center py-8">იტვირთება...</div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show permission denied if not staff (admin or team_member)
  if (!isStaff) {
    return (
      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-destructive" />
              წვდომა აკრძალულია
            </DialogTitle>
            <DialogDescription>
              მხოლოდ ადმინისტრატორებს და გუნდის წევრებს აქვთ უფლება დაამატონ წევრები ჩატში
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogClose(false)}
            >
              დახურვა
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            წევრების დამატება ჩატში
          </DialogTitle>
          <DialogDescription>
            მოძებნეთ რეგისტრირებული მომხმარებლები ან შეიყვანეთ ელ. ფოსტის მისამართები
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role">როლი</Label>
              <Select value={role} onValueChange={(v: "admin" | "team_member" | "client") => setRole(v)}>
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
                      <span>კლიენტი</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="team_member">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <span>გუნდის წევრი (პერსონალი)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4" />
                      <span>ადმინისტრატორი</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {role === "client"
                  ? "კლიენტებს შეუძლიათ ნახონ და გააგზავნონ ჩვეულებრივი შეტყობინებები"
                  : role === "team_member"
                  ? "გუნდის წევრებს შეუძლიათ ნახონ ყველა შეტყობინება, მათ შორის პერსონალის შენიშვნები"
                  : "ადმინისტრატორებს აქვთ სრული წვდომა სისტემაზე და შეუძლიათ მართონ წევრები და როლები"}
              </p>
            </div>

            {/* User Search */}
            <div className="space-y-2">
              <Label htmlFor="search">მოძებნეთ რეგისტრირებული მომხმარებლები</Label>
              <div className="relative" ref={searchRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search"
                    type="text"
                    placeholder="აკრიფეთ ელ. ფოსტა ან სახელი..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setPopoverOpen(true)}
                    className="pl-9"
                    disabled={addMembersMutation.isPending}
                  />
                </div>

                {/* Dropdown Results */}
                {popoverOpen && searchQuery.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                    {loading ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        იტვირთება...
                      </div>
                    ) : users.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        მომხმარებელი ვერ მოიძებნა
                      </div>
                    ) : (
                      <div className="py-1">
                        {users.map((profile) => (
                          <button
                            key={profile.id}
                            type="button"
                            onClick={() => handleSelectUser(profile)}
                            className="w-full px-3 py-2 text-left hover:bg-accent cursor-pointer flex flex-col"
                            disabled={addMembersMutation.isPending}
                          >
                            <span className="font-medium text-sm">
                              {profile.full_name || profile.email}
                            </span>
                            {profile.full_name && (
                              <span className="text-xs text-muted-foreground">
                                {profile.email}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Users */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedUsers.map((user) => (
                    <Badge
                      key={user.id}
                      variant="secondary"
                      className="flex items-center gap-1 pl-3 pr-2 py-1"
                    >
                      <span className="text-sm">
                        {user.full_name || user.email}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveUser(user.id)}
                        className="ml-1 hover:bg-muted rounded-full p-0.5"
                        disabled={addMembersMutation.isPending}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Manual Email Input */}
            <div className="space-y-2">
              <Label htmlFor="emails">ან შეიყვანეთ ელ. ფოსტის მისამართები</Label>
              <Textarea
                id="emails"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder="user1@example.com, user2@example.com&#10;ან თითო ელ. ფოსტა ცალკე ხაზზე"
                rows={3}
                disabled={addMembersMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                განაცალკევეთ რამდენიმე ელ. ფოსტა მძიმით ან ახალი ხაზებით
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogClose(false)}
              disabled={addMembersMutation.isPending}
            >
              გაუქმება
            </Button>
            <Button type="submit" disabled={addMembersMutation.isPending}>
              {addMembersMutation.isPending ? "ემატება..." : "წევრების დამატება"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
