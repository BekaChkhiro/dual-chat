import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip } from "lucide-react";

export interface AttachmentPreview {
  file: File;
  preview?: string;
  type: "image" | "file";
}

interface FileUploadButtonProps {
  onFilesSelect: (attachments: AttachmentPreview[]) => void;
  disabled?: boolean;
}

export const FileUploadButton = ({
  onFilesSelect,
  disabled,
}: FileUploadButtonProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    const newAttachments: AttachmentPreview[] = files.map((file) => {
      const isImage = file.type.startsWith("image/");
      const attachment: AttachmentPreview = {
        file,
        type: isImage ? "image" : "file",
      };

      if (isImage) {
        attachment.preview = URL.createObjectURL(file);
      }

      return attachment;
    });

    onFilesSelect(newAttachments);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.xls"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 w-10 flex-shrink-0"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
      >
        <Paperclip className="w-5 h-5" />
      </Button>
    </>
  );
};
