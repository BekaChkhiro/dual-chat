import { useState, useRef, ChangeEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AvatarUploadProps {
  avatarUrl: string | null;
  onAvatarChange: (url: string | null) => void;
}

export const AvatarUpload = ({ avatarUrl, onAvatarChange }: AvatarUploadProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(avatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) {
      console.log("[AvatarUpload] No file or user", { file: !!file, user: !!user });
      return;
    }

    console.log("[AvatarUpload] File selected:", {
      name: file.name,
      type: file.type,
      size: file.size,
      userId: user.id,
    });

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("გთხოვთ აირჩიოთ სურათი");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("ფაილის ზომა არ უნდა აღემატებოდეს 5MB-ს");
      return;
    }

    try {
      setUploading(true);

      // Create file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      console.log("[AvatarUpload] Uploading to path:", fileName);

      // Delete old avatar if exists (non-critical)
      if (avatarUrl && !avatarUrl.includes('token=')) {
        try {
          const oldPath = avatarUrl.split("/").slice(-2).join("/");
          console.log("[AvatarUpload] Removing old avatar:", oldPath);
          await supabase.storage.from("avatars").remove([oldPath]);
        } catch (e) {
          console.warn("[AvatarUpload] Could not delete old avatar:", e);
        }
      }

      // Upload new avatar
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      console.log("[AvatarUpload] Upload response:", { uploadData, uploadError });

      if (uploadError) {
        console.error("[AvatarUpload] Upload error:", uploadError);
        toast.error(`შეცდომა: ${uploadError.message}`);
        throw uploadError;
      }

      console.log("[AvatarUpload] Upload successful, creating signed URL");

      // Get signed URL for private bucket (valid for 1 year)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("avatars")
        .createSignedUrl(fileName, 31536000); // 1 year in seconds

      console.log("[AvatarUpload] Signed URL response:", {
        url: signedUrlData?.signedUrl?.substring(0, 50) + "...",
        error: signedUrlError
      });

      if (signedUrlError) {
        console.error("[AvatarUpload] Signed URL error:", signedUrlError);
        toast.error(`URL შეცდომა: ${signedUrlError.message}`);
        throw signedUrlError;
      }

      const newAvatarUrl = signedUrlData.signedUrl;
      setPreviewUrl(newAvatarUrl);
      onAvatarChange(newAvatarUrl);

      console.log("[AvatarUpload] Avatar upload complete!");
      toast.success("ავატარი აიტვირთა");
    } catch (error: any) {
      console.error("[AvatarUpload] Error uploading avatar:", error);
      toast.error(error?.message || "ავატარის ატვირთვა ვერ მოხერხდა");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onAvatarChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <Avatar className="w-32 h-32">
        {previewUrl ? (
          <AvatarImage src={previewUrl} alt="Avatar" />
        ) : (
          <AvatarFallback className="text-4xl">
            {user?.email?.[0]?.toUpperCase() || "?"}
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
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              იტვირთება...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              ავატარის ატვირთვა
            </>
          )}
        </Button>

        {previewUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemove}
            disabled={uploading}
          >
            <X className="w-4 h-4 mr-2" />
            წაშლა
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        მაქსიმუმ 5MB, JPG, PNG, GIF ან WebP
      </p>
    </div>
  );
};
