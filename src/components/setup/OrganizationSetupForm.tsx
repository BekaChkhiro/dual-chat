import { useState, useRef, ChangeEvent } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, X, Building2 } from "lucide-react";

interface OrganizationSetupFormProps {
  name: string;
  description: string;
  logoFile: File | null;
  logoPreview: string | null;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onLogoChange: (file: File | null, preview: string | null) => void;
}

export const OrganizationSetupForm = ({
  name,
  description,
  logoFile,
  logoPreview,
  onNameChange,
  onDescriptionChange,
  onLogoChange,
}: OrganizationSetupFormProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    onLogoChange(file, previewUrl);
  };

  const handleRemoveLogo = () => {
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
    }
    onLogoChange(null, null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">შექმენით ორგანიზაცია</h2>
        <p className="text-muted-foreground">
          ორგანიზაციაში შეძლებთ ჩატების მართვას და გუნდის წევრების დამატებას
        </p>
      </div>

      {/* Logo Upload */}
      <div className="flex justify-center">
        <div className="flex flex-col items-center gap-4">
          <Avatar className="w-32 h-32">
            {logoPreview ? (
              <AvatarImage src={logoPreview} alt="Organization logo" />
            ) : (
              <AvatarFallback className="text-4xl">
                <Building2 className="w-16 h-16" />
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
              onClick={handleClick}
            >
              <Upload className="w-4 h-4 mr-2" />
              ლოგოს ატვირთვა
            </Button>

            {logoPreview && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemoveLogo}
              >
                <X className="w-4 h-4 mr-2" />
                წაშლა
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            არასავალდებულო • მაქსიმუმ 5MB
          </p>
        </div>
      </div>

      {/* Organization Name */}
      <div className="space-y-2">
        <Label htmlFor="org-name">
          ორგანიზაციის სახელი <span className="text-red-500">*</span>
        </Label>
        <Input
          id="org-name"
          type="text"
          placeholder="მაგ: My Company"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          required
        />
      </div>

      {/* Organization Description */}
      <div className="space-y-2">
        <Label htmlFor="org-description">
          აღწერა <span className="text-muted-foreground">(არასავალდებულო)</span>
        </Label>
        <Textarea
          id="org-description"
          placeholder="მოკლე აღწერა თქვენი ორგანიზაციის შესახებ..."
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>
    </div>
  );
};
