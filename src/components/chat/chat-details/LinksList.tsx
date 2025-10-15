import { format } from "date-fns";
import { LinkItem } from "@/hooks/useChatMedia";
import { Link2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LinksListProps {
  links: LinkItem[];
}

const getDomain = (url: string) => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
};

export const LinksList = ({ links }: LinksListProps) => {
  if (links.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Link2 className="w-12 h-12 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">ლინკები არ არის</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          გაზიარებული ბმულები გამოჩნდება აქ
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {links.map((link, index) => (
        <div
          key={`${link.messageId}-${index}`}
          className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 flex-shrink-0">
            <Link2 className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{getDomain(link.url)}</p>
            <p className="text-xs text-muted-foreground truncate">{link.url}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(link.timestamp), "PP")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  );
};
