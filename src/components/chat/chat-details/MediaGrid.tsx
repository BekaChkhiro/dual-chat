import { useState } from "react";
import { MediaItem } from "@/hooks/useChatMedia";
import { ImageGalleryModal } from "../ImageGalleryModal";
import { Image } from "lucide-react";

interface MediaGridProps {
  media: MediaItem[];
}

export const MediaGrid = ({ media }: MediaGridProps) => {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Image className="w-12 h-12 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">მედია ფაილები არ არის</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          გაზიარებული სურათები გამოჩნდება აქ
        </p>
      </div>
    );
  }

  const handleImageClick = (index: number) => {
    setSelectedIndex(index);
    setGalleryOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {media.map((item, index) => (
          <div
            key={`${item.messageId}-${index}`}
            className="aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative group"
            onClick={() => handleImageClick(index)}
          >
            <img
              src={item.url}
              alt={item.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <Image className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ))}
      </div>

      <ImageGalleryModal
        images={media}
        initialIndex={selectedIndex}
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
      />
    </>
  );
};
