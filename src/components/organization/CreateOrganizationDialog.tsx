import { useState, useRef, ChangeEvent } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
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
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateOrganizationDialog = ({
  open,
  onOpenChange,
}: CreateOrganizationDialogProps) => {
  const { user } = useAuth();
  const { createOrganization } = useOrganization();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("გთხოვთ აირჩიოთ სურათი");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("ფაილის ზომა არ უნდა აღემატებოდეს 5MB-ს");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setLogoFile(file);
    setLogoPreview(previewUrl);
  };

  const handleRemoveLogo = () => {
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("გთხოვთ შეიყვანოთ ორგანიზაციის სახელი");
      return;
    }

    if (!user) return;

    try {
      setCreating(true);

      // Upload logo if provided
      let logoUrl: string | null = null;
      if (logoFile) {
        const fileExt = logoFile.name.split(".").pop();
        const fileName = `${user.id}/logo-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("organization-logos")
          .upload(fileName, logoFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Logo upload error:", uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from("organization-logos")
            .getPublicUrl(fileName);
          logoUrl = urlData.publicUrl;
        }
      }

      // Create organization
      await createOrganization({
        name: name.trim(),
        description: description.trim() || undefined,
        logo_url: logoUrl || undefined,
      });

      // Reset form
      setName("");
      setDescription("");
      handleRemoveLogo();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating organization:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    if (!creating) {
      setName("");
      setDescription("");
      handleRemoveLogo();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>ახალი ორგანიზაციის შექმნა</DialogTitle>
          <DialogDescription>
            შექმენით ახალი ორგანიზაცია ჩატების მოსართავად
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="flex flex-col items-center gap-3">
              <Avatar className="w-24 h-24">
                {logoPreview ? (
                  <AvatarImage src={logoPreview} alt="Logo" />
                ) : (
                  <AvatarFallback>
                    <Building2 className="w-12 h-12" />
                  </AvatarFallback>
                )}
              </Avatar>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={creating}
                >
                  <Upload className="w-3 h-3 mr-2" />
                  ლოგო
                </Button>

                {logoPreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveLogo}
                    disabled={creating}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              სახელი <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="მაგ: My Company"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={creating}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">აღწერა (არასავალდებულო)</Label>
            <Textarea
              id="description"
              placeholder="მოკლე აღწერა..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={creating}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={creating}
          >
            გაუქმება
          </Button>
          <Button onClick={handleCreate} disabled={creating || !name.trim()}>
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                იქმნება...
              </>
            ) : (
              "შექმნა"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
