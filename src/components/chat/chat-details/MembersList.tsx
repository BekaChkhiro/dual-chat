import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Crown, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AddMemberDialog } from "../AddMemberDialog";

interface Member {
  user_id: string;
  profile?: {
    full_name: string | null;
    email: string;
  };
  roles?: Array<{
    role: "admin" | "team_member" | "client";
  }>;
}

interface MembersListProps {
  chatId: string;
}

export const MembersList = ({ chatId }: MembersListProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);

  // Fetch current user's roles
  const { data: currentUserRoles = [], error: rolesError, isLoading: isLoadingRoles } = useQuery({
    queryKey: ["user_roles", user?.id],
    queryFn: async () => {
      if (!user) return [];

      console.log('[MembersList] Fetching roles for user:', user.id);

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
        console.error('[MembersList] Error fetching roles:', error);
        throw error;
      }

      const roles = data?.map((r) => r.role) || [];
      console.log('[MembersList] Roles fetched:', roles);
      return roles;
    },
    enabled: !!user,
    staleTime: 0, // Always refetch
    cacheTime: 0, // Don't cache
  });

  const isStaff =
    Array.isArray(currentUserRoles) &&
    (currentUserRoles.includes("admin") ||
    currentUserRoles.includes("team_member"));

  console.log('[MembersList] currentUserRoles:', currentUserRoles);
  console.log('[MembersList] isStaff:', isStaff);
  console.log('[MembersList] rolesError:', rolesError);

  // Fetch chat members with their profiles and roles
  const { data: members, isLoading } = useQuery({
    queryKey: ["chat_members", chatId],
    queryFn: async () => {
      const { data: chatMembers, error: membersError } = await supabase
        .from("chat_members")
        .select("user_id")
        .eq("chat_id", chatId);

      if (membersError) throw membersError;

      if (!chatMembers || chatMembers.length === 0) return [];

      const userIds = chatMembers.map((m) => m.user_id);

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      if (rolesError) throw rolesError;

      // Combine data
      return chatMembers.map((member) => {
        const profile = profiles?.find((p) => p.id === member.user_id);
        const userRoles = roles?.filter((r) => r.user_id === member.user_id);

        return {
          user_id: member.user_id,
          profile: profile ? { full_name: profile.full_name, email: profile.email } : undefined,
          roles: userRoles?.map((r) => ({ role: r.role as "admin" | "team_member" | "client" })),
        };
      });
    },
    enabled: !!chatId && isStaff,
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({
      userId,
      oldRole,
      newRole,
    }: {
      userId: string;
      oldRole: string;
      newRole: "admin" | "team_member" | "client";
    }) => {
      // Don't do anything if role hasn't changed
      if (oldRole === newRole) return;

      console.log('[MembersList] Changing role:', { userId, oldRole, newRole });

      // Delete ALL existing roles for this user
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (deleteError) {
        console.error('[MembersList] Error deleting roles:', deleteError);
        throw deleteError;
      }

      // Add new role (only if not client - client means no roles)
      if (newRole !== "client") {
        const { error: insertError } = await supabase
          .from("user_roles")
          .insert({
            user_id: userId,
            role: newRole,
          });

        if (insertError) {
          console.error('[MembersList] Error inserting role:', insertError);
          throw insertError;
        }
      }

      console.log('[MembersList] Role changed successfully');
    },
    onSuccess: () => {
      toast.success("როლი წარმატებით შეიცვალა");
      queryClient.invalidateQueries({ queryKey: ["chat_members", chatId] });
      queryClient.invalidateQueries({ queryKey: ["user_roles"] });
    },
    onError: (error) => {
      console.error("Error updating role:", error);
      toast.error("როლის შეცვლა ვერ მოხერხდა");
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("chat_members")
        .delete()
        .eq("chat_id", chatId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("წევრი წარმატებით წაიშალა");
      queryClient.invalidateQueries({ queryKey: ["chat_members", chatId] });
      setMemberToRemove(null);
    },
    onError: (error) => {
      console.error("Error removing member:", error);
      toast.error("წევრის წაშლა ვერ მოხერხდა");
    },
  });

  const handleRoleChange = (userId: string, currentRole: string | undefined, newRole: string) => {
    if (userId === user?.id) {
      toast.error("არ შეგიძლიათ საკუთარი როლის შეცვლა");
      return;
    }

    updateRoleMutation.mutate({
      userId,
      oldRole: currentRole || "",
      newRole: newRole as "admin" | "team_member" | "client",
    });
  };

  const handleRemoveMember = (userId: string) => {
    if (userId === user?.id) {
      toast.error("არ შეგიძლიათ საკუთარი თავის წაშლა");
      return;
    }
    setMemberToRemove(userId);
  };

  const getRoleBadge = (roles?: Array<{ role: string }>) => {
    if (!roles || roles.length === 0) {
      return (
        <Badge variant="outline" className="gap-1">
          <Users className="w-3 h-3" />
          კლიენტი
        </Badge>
      );
    }

    if (roles.some((r) => r.role === "admin")) {
      return (
        <Badge variant="destructive" className="gap-1">
          <Crown className="w-3 h-3" />
          ადმინი
        </Badge>
      );
    }

    if (roles.some((r) => r.role === "team_member")) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Shield className="w-3 h-3" />
          პერსონალი
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="gap-1">
        <Users className="w-3 h-3" />
        კლიენტი
      </Badge>
    );
  };

  const getPrimaryRole = (roles?: Array<{ role: string }>) => {
    if (!roles || roles.length === 0) return "client";
    if (roles.some((r) => r.role === "admin")) return "admin";
    if (roles.some((r) => r.role === "team_member")) return "team_member";
    return "client";
  };

  if (!isStaff) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        მხოლოდ პერსონალს აქვს წვდომა წევრების სიაზე
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">იტვირთება...</div>
    );
  }

  if (!members || members.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        წევრები არ მოიძებნა
      </div>
    );
  }

  return (
    <>
      {/* Add Member Button - Only for Admins */}
      <div className="mb-4">
        <Button
          onClick={() => setAddMemberDialogOpen(true)}
          className="w-full"
          variant="outline"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          წევრის დამატება
        </Button>
      </div>

      <div className="space-y-3">
        {members.map((member) => {
          const initials = member.profile?.full_name
            ?.split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase() || member.profile?.email?.[0]?.toUpperCase() || "?";

          const primaryRole = getPrimaryRole(member.roles);
          const isCurrentUser = member.user_id === user?.id;

          return (
            <div
              key={member.user_id}
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {member.profile?.full_name || member.profile?.email}
                  {isCurrentUser && (
                    <span className="text-xs text-muted-foreground ml-2">(თქვენ)</span>
                  )}
                </div>
                {member.profile?.full_name && (
                  <div className="text-sm text-muted-foreground truncate">
                    {member.profile.email}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {getRoleBadge(member.roles)}

                {!isCurrentUser && (
                  <>
                    <Select
                      value={primaryRole}
                      onValueChange={(value) =>
                        handleRoleChange(member.user_id, primaryRole, value)
                      }
                      disabled={updateRoleMutation.isPending}
                    >
                      <SelectTrigger className="w-[130px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">
                          <div className="flex items-center gap-2">
                            <Users className="w-3 h-3" />
                            <span>კლიენტი</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="team_member">
                          <div className="flex items-center gap-2">
                            <Shield className="w-3 h-3" />
                            <span>პერსონალი</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Crown className="w-3 h-3" />
                            <span>ადმინი</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleRemoveMember(member.user_id)}
                      disabled={removeMemberMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog
        open={memberToRemove !== null}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>დარწმუნებული ხართ?</AlertDialogTitle>
            <AlertDialogDescription>
              ეს წევრი წაიშლება ჩატიდან. ამის შემდეგ მას აღარ ექნება წვდომა შეტყობინებებზე.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>გაუქმება</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToRemove && removeMemberMutation.mutate(memberToRemove)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              წაშლა
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Member Dialog */}
      <AddMemberDialog
        open={addMemberDialogOpen}
        onOpenChange={setAddMemberDialogOpen}
        chatId={chatId}
      />
    </>
  );
};
