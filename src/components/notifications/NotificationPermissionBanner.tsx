import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { enablePushForCurrentUser } from "@/lib/push";
import { toast } from "sonner";

export function NotificationPermissionBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if we should show the banner
    const checkPermission = async () => {
      console.log("[NotificationBanner] Checking permission...");

      // Don't show if not supported
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        console.log("[NotificationBanner] Push notifications not supported");
        return;
      }

      // Don't show if already dismissed
      const dismissed = localStorage.getItem("notification-banner-dismissed");
      console.log("[NotificationBanner] Dismissed status:", dismissed);

      if (dismissed === "true") {
        console.log("[NotificationBanner] Banner was dismissed, not showing");
        return;
      }

      // Check current permission state
      const permission = Notification.permission;
      console.log("[NotificationBanner] Notification.permission:", permission);

      // Show banner if permission is default (not yet asked)
      if (permission === "default") {
        console.log("[NotificationBanner] Showing banner (permission is default)");
        setShowBanner(true);
      } else if (permission === "granted") {
        // Check if actually subscribed
        try {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          console.log("[NotificationBanner] Existing subscription:", sub ? "yes" : "no");

          if (!sub) {
            console.log("[NotificationBanner] Showing banner (permission granted but not subscribed)");
            setShowBanner(true);
          }
        } catch (error) {
          console.error("[NotificationBanner] Error checking subscription:", error);
        }
      }
    };

    checkPermission();
  }, []);

  const handleEnable = async () => {
    setIsLoading(true);
    try {
      const result = await enablePushForCurrentUser();

      if (result.ok) {
        if (result.reason === "already") {
          toast.success("შეტყობინებები უკვე ჩართულია");
        } else {
          toast.success("შეტყობინებები წარმატებით ჩაირთო");
        }
        setShowBanner(false);
        localStorage.setItem("notification-banner-dismissed", "true");
      } else {
        if (result.reason === "denied") {
          toast.error("შეტყობინებების ნებართვა უარყოფილია. გთხოვთ, ჩართოთ ის ბრაუზერის პარამეტრებში.");
        } else if (result.reason === "unsupported") {
          toast.error("შეტყობინებები არ არის მხარდაჭერილი ამ ბრაუზერში");
        } else if (result.reason === "missing_vapid") {
          toast.error("შეცდომა: VAPID გასაღები არ არის კონფიგურირებული");
        } else {
          toast.error("შეტყობინებების ჩართვა ვერ მოხერხდა");
        }
      }
    } catch (error) {
      console.error("Error enabling notifications:", error);
      toast.error("დაფიქსირდა შეცდომა");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("notification-banner-dismissed", "true");
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-3">
      <div className="flex items-center justify-between gap-3 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 p-2 bg-primary/20 rounded-lg">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              ჩართეთ შეტყობინებები
            </p>
            <p className="text-xs text-muted-foreground">
              მიიღეთ მყისიერი შეტყობინებები ახალი შეტყობინებების შესახებ
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            onClick={handleEnable}
            disabled={isLoading}
            className="whitespace-nowrap"
          >
            {isLoading ? "მიმდინარეობს..." : "ჩართვა"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            disabled={isLoading}
            className="px-2"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
