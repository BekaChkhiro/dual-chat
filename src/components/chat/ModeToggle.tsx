import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Shield, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModeToggleProps {
  isStaffMode: boolean;
  onToggle: (value: boolean) => void;
}

export const ModeToggle = ({ isStaffMode, onToggle }: ModeToggleProps) => {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2 rounded-lg border-2 transition-all",
        isStaffMode
          ? "bg-staff-light border-staff"
          : "bg-primary-light border-primary"
      )}
    >
      {isStaffMode ? (
        <Shield className="w-5 h-5 text-staff" />
      ) : (
        <Users className="w-5 h-5 text-primary" />
      )}
      <div className="flex items-center gap-2">
        <Label htmlFor="mode-toggle" className="font-medium cursor-pointer">
          {isStaffMode ? "Staff Mode" : "Client Mode"}
        </Label>
        <Switch
          id="mode-toggle"
          checked={isStaffMode}
          onCheckedChange={onToggle}
          className={isStaffMode ? "data-[state=checked]:bg-staff" : ""}
        />
      </div>
    </div>
  );
};
