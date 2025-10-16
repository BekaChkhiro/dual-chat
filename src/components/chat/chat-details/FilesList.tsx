import { useMemo, useState } from "react";
import { format } from "date-fns";
import { MediaItem } from "@/hooks/useChatMedia";
import { FilePreviewModal } from "../FilePreviewModal";
import { MessageAttachment } from "../ChatWindow";
import { FileText, FileSpreadsheet, File, Eye, Download, Folder, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageGalleryModal } from "@/components/chat/ImageGalleryModal";

interface FilesListProps {
  files: MediaItem[];
}

const getFileIcon = (type: string) => {
  if (type === "application/pdf") return FileText;
  if (type.includes("spreadsheet") || type.includes("excel") || type.includes("csv"))
    return FileSpreadsheet;
  return File;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

export const FilesList = ({ files }: FilesListProps) => {
  const [previewAttachment, setPreviewAttachment] = useState<MessageAttachment | null>(null);
  const [imageOpen, setImageOpen] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [filter, setFilter] = useState<"images" | "pdf" | "other">("images");
  const images = useMemo(() => files.filter((f) => f.type?.startsWith("image/")), [files]);
  const pdfs = useMemo(() => files.filter((f) => f.type === "application/pdf"), [files]);
  const others = useMemo(() => files.filter((f) => f.type !== "application/pdf" && !f.type?.startsWith("image/")), [files]);
  const filtered = useMemo(() => {
    if (filter === "images") return images;
    if (filter === "pdf") return pdfs;
    return others;
  }, [filter, images, pdfs, others]);

  const handleDownload = async (file: MediaItem) => {
    try {
      // Fetch the file as a blob
      const response = await fetch(file.url);
      const blob = await response.blob();

      // Create a blob URL
      const blobUrl = URL.createObjectURL(blob);

      // Create a temporary link and trigger download
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const canPreview = (type: string) => type === "application/pdf" || type?.startsWith("image/");

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Folder className="w-12 h-12 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">დოკუმენტები არ არის</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          გაზიარებული ფაილები გამოჩნდება აქ
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Filters */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {([
          { key: "images", label: "სურათები" },
          { key: "pdf", label: "PDF" },
          { key: "other", label: "სხვა" },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              filter === key ? "bg-primary text-primary-foreground border-transparent" : "bg-background"
            }`}
            onClick={() => setFilter(key as any)}
          >
            {label}
          </button>
        ))}
        <div className="ml-auto text-xs text-muted-foreground">
          სულ: {files.length} • სურათები: {images.length} • PDF: {pdfs.length}
        </div>
      </div>

      {/* Image strip only on Images filter */}
      {filter === "images" && images.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {images.map((img, idx) => (
              <button
                key={`${img.url}-${idx}`}
                className="flex-shrink-0 w-56 h-40 rounded-md overflow-hidden border hover:ring-2 hover:ring-primary/40 transition"
                onClick={() => {
                  setImageIndex(idx);
                  setImageOpen(true);
                }}
                title={img.name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {(filter === "images" ? [] : filtered).map((file, index) => {
          const FileIcon = getFileIcon(file.type);
          return (
            <div
              key={`${file.messageId}-${index}`}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              {file.type?.startsWith("image/") ? (
                <Image className="w-8 h-8 flex-shrink-0 text-muted-foreground" />
              ) : (
                <FileIcon className="w-8 h-8 flex-shrink-0 text-muted-foreground" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)} • {format(new Date(file.timestamp), "PP")}
                </p>
              </div>
              <div className="flex gap-1">
                {canPreview(file.type) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      if (file.type === "application/pdf") {
                        setPreviewAttachment(file);
                      } else if (file.type?.startsWith("image/")) {
                        const idx = images.findIndex((img) => img.url === file.url && img.name === file.name);
                        setImageIndex(idx >= 0 ? idx : 0);
                        setImageOpen(true);
                      }
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDownload(file)}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <FilePreviewModal
        attachment={previewAttachment}
        open={!!previewAttachment}
        onOpenChange={(open) => !open && setPreviewAttachment(null)}
      />

      <ImageGalleryModal
        images={images}
        initialIndex={imageIndex}
        open={imageOpen}
        onOpenChange={setImageOpen}
      />
    </>
  );
};
