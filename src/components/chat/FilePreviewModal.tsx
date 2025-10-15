import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";
import { MessageAttachment } from "./ChatWindow";

interface FilePreviewModalProps {
  attachment: MessageAttachment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FilePreviewModal = ({ attachment, open, onOpenChange }: FilePreviewModalProps) => {
  if (!attachment) return null;

  const isImage = attachment.type.startsWith("image/");
  const isPdf = attachment.type === "application/pdf";
  const isWord = attachment.type.includes("word") || attachment.type.includes("document");
  const isExcel = attachment.type.includes("spreadsheet") || attachment.type.includes("excel");
  const canPreview = isImage || isPdf;

  const handleDownload = async () => {
    try {
      // Fetch the file as a blob
      const response = await fetch(attachment.url);
      const blob = await response.blob();

      // Create a blob URL
      const blobUrl = URL.createObjectURL(blob);

      // Create a temporary link and trigger download
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const handleOpenInNewTab = () => {
    window.open(attachment.url, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{attachment.name}</DialogTitle>
        </DialogHeader>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto">
          {isImage ? (
            <div className="flex items-center justify-center bg-muted/20 rounded-lg p-4">
              <img
                src={attachment.url}
                alt={attachment.name}
                className="max-w-full h-auto max-h-[60vh] object-contain"
              />
            </div>
          ) : isPdf ? (
            <iframe
              src={attachment.url}
              className="w-full h-[60vh] rounded-lg border"
              title={attachment.name}
            />
          ) : (
            <div className="flex items-center justify-center h-[60vh] bg-muted/20 rounded-lg">
              <div className="text-center max-w-md mx-auto p-8">
                <div className="mb-6">
                  {isWord && (
                    <FileText className="w-20 h-20 mx-auto text-blue-500 mb-4" />
                  )}
                  {isExcel && (
                    <FileText className="w-20 h-20 mx-auto text-green-500 mb-4" />
                  )}
                  {!isWord && !isExcel && (
                    <FileText className="w-20 h-20 mx-auto text-muted-foreground mb-4" />
                  )}
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {isWord && "Word დოკუმენტის პრევიუ"}
                  {isExcel && "Excel დოკუმენტის პრევიუ"}
                  {!isWord && !isExcel && "ფაილის პრევიუ"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {isWord && "Word ფაილების პრევიუ ბრაუზერში არ არის ხელმისაწვდომი"}
                  {isExcel && "Excel ფაილების პრევიუ ბრაუზერში არ არის ხელმისაწვდომი"}
                  {!isWord && !isExcel && "ამ ფაილის პრევიუ მიუწვდომელია"}
                </p>
                <div className="flex flex-col gap-2 mt-6">
                  <Button onClick={handleOpenInNewTab} className="w-full gap-2">
                    <ExternalLink className="w-4 h-4" />
                    გადმოწერა და გახსნა
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    ფაილი გადმოიწერება და გაიხსნება თქვენს კომპიუტერში
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <Button variant="outline" onClick={handleOpenInNewTab} className="gap-2">
            <ExternalLink className="w-4 h-4" />
            ახალ ტაბში გახსნა
          </Button>
          <Button onClick={handleDownload} className="gap-2">
            <Download className="w-4 h-4" />
            გადმოწერა
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
