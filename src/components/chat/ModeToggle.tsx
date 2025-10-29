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
        "flex items-center gap-1.5 sm:gap-3 px-1.5 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg border sm:border-2 transition-all",
        isStaffMode
          ? "bg-staff-light border-staff"
          : "bg-primary-light border-primary"
      )}
    >
      {isStaffMode ? (
        <Shield className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-staff" />
      ) : (
        <Users className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-primary" />
      )}
      <div className="flex items-center gap-2">
        <Label htmlFor="mode-toggle" className="font-medium cursor-pointer text-sm hidden sm:block">
          {isStaffMode ? "პერსონალის რეჟიმი" : "კლიენტის რეჟიმი"}
        </Label>
        <Switch
          id="mode-toggle"
          checked={isStaffMode}
          onCheckedChange={onToggle}
          className={cn(
            "scale-75 sm:scale-100",
            isStaffMode ? "data-[state=checked]:bg-staff" : ""
          )}
        />
      </div>
    </div>
  );
};
