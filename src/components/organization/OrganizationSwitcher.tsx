import { useState } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CreateOrganizationDialog } from "./CreateOrganizationDialog";
import { Building2, ChevronDown, Check, Plus, Loader2 } from "lucide-react";

export const OrganizationSwitcher = () => {
  const { currentOrganization, organizations, switchOrganization, isLoading } =
    useOrganization();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSwitchOrganization = (orgId: string) => {
    switchOrganization(orgId);
    setDropdownOpen(false);
  };

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ჩატვირთვა...
      </Button>
    );
  }

  if (!currentOrganization && organizations.length === 0) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          ორგანიზაციის შექმნა
        </Button>
        <CreateOrganizationDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </>
    );
  }

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 px-3">
            <Avatar className="w-6 h-6">
              {currentOrganization?.logo_url ? (
                <AvatarImage
                  src={currentOrganization.logo_url}
                  alt={currentOrganization.name}
                />
              ) : (
                <AvatarFallback className="text-xs">
                  <Building2 className="w-3 h-3" />
                </AvatarFallback>
              )}
            </Avatar>
            <span className="font-medium max-w-[150px] truncate">
              {currentOrganization?.name || "აირჩიეთ ორგანიზაცია"}
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-[280px]">
          <DropdownMenuLabel>თქვენი ორგანიზაციები</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => handleSwitchOrganization(org.id)}
              className="flex items-center gap-3 cursor-pointer"
            >
              <Avatar className="w-8 h-8">
                {org.logo_url ? (
                  <AvatarImage src={org.logo_url} alt={org.name} />
                ) : (
                  <AvatarFallback className="text-xs">
                    <Building2 className="w-4 h-4" />
                  </AvatarFallback>
                )}
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{org.name}</div>
                {org.description && (
                  <div className="text-xs text-muted-foreground truncate">
                    {org.description}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {org.role && (
                  <Badge variant="secondary" className="text-xs">
                    {org.role === "owner"
                      ? "მფლობელი"
                      : org.role === "admin"
                      ? "ადმინი"
                      : "წევრი"}
                  </Badge>
                )}
                {currentOrganization?.id === org.id && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </div>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => {
              setDropdownOpen(false);
              setCreateDialogOpen(true);
            }}
            className="cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />
            ახალი ორგანიზაცია
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateOrganizationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </>
  );
};
