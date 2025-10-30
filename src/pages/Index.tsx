import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { ChatList } from "@/components/chat/ChatList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { CreateChatDialog } from "@/components/chat/CreateChatDialog";
import { OrganizationSwitcher } from "@/components/organization/OrganizationSwitcher";
import { NotificationPermissionBanner } from "@/components/notifications/NotificationPermissionBanner";
import { Button } from "@/components/ui/button";
import { LogOut, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Index = () => {
  const { user, loading } = useAuth();
  const { currentOrganization } = useOrganization();
  const navigate = useNavigate();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [setupCompleted, setSetupCompleted] = useState<boolean | null>(null);

  // Check if user has completed setup
  useEffect(() => {
    const checkSetup = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("setup_completed")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error checking setup status:", error);
        return;
      }

      if (data && data.setup_completed === false) {
        navigate("/setup");
      } else {
        setSetupCompleted(true);
      }
    };

    if (!loading && user) {
      checkSetup();
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Handle deep linking from push notifications
  useEffect(() => {
    // Check URL for chat parameter
    const urlParams = new URLSearchParams(window.location.search);
    const chatId = urlParams.get('chat');

    if (chatId && user && setupCompleted) {
      // Set the selected chat
      setSelectedChatId(chatId);

      // Clean up URL (remove query parameter)
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [user, setupCompleted]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("წარმატებით გახვედით სისტემიდან");
    navigate("/auth");
  };

  if (loading || setupCompleted === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">იტვირთება...</p>
      </div>
    );
  }

  if (!user || !setupCompleted) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Notification Permission Banner */}
      <NotificationPermissionBanner />

      {/* Top Header */}
      <header className="border-b bg-card px-3 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-base sm:text-xl">WorkChat</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                პროფესიონალური გუნდური კომუნიკაცია
              </p>
            </div>
          </div>
        </div>

        {/* Organization Switcher and Logout Button */}
        <div className="flex items-center gap-1 sm:gap-2">
          <OrganizationSwitcher />
          {/* Desktop: Show button with text */}
          <Button variant="outline" size="sm" onClick={handleLogout} className="hidden sm:flex">
            <LogOut className="w-4 h-4 mr-2" />
            გასვლა
          </Button>
          {/* Mobile: Show icon only */}
          <Button variant="outline" size="icon" onClick={handleLogout} className="sm:hidden h-9 w-9">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      {/* Mobile: show either list or chat fullscreen */}
      <div className="flex-1 min-h-0 flex md:hidden overflow-hidden">
        {selectedChatId ? (
          <div className="flex flex-col flex-1 min-w-0 min-h-0">
            <ChatWindow chatId={selectedChatId} onBack={() => setSelectedChatId(null)} />
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-w-0 min-h-0">
            <ChatList
              selectedChatId={selectedChatId}
              onSelectChat={setSelectedChatId}
              onCreateChat={() => setCreateDialogOpen(true)}
            />
          </div>
        )}
      </div>

      {/* Desktop: two-pane layout */}
      <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">
        <ChatList
          selectedChatId={selectedChatId}
          onSelectChat={setSelectedChatId}
          onCreateChat={() => setCreateDialogOpen(true)}
        />
        {selectedChatId ? (
          <div className="flex flex-col flex-1 min-w-0 min-h-0">
            <ChatWindow chatId={selectedChatId} />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-chat-bg">
            <div className="text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full inline-block">
                <MessageSquare className="w-16 h-16 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">მოგესალმებით WorkChat-ში</h2>
                <p className="text-muted-foreground max-w-md">
                  აირჩიეთ ჩატი გვერდითი პანელიდან, რომ დაიწყოთ კომუნიკაცია თქვენს კლიენტებთან,
                  ან შექმენით ახალი ჩატი დასაწყებად.
                </p>
              </div>
              <Button onClick={() => setCreateDialogOpen(true)}>
                შექმენით თქვენი პირველი ჩატი
              </Button>
            </div>
          </div>
        )}
      </div>

      <CreateChatDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
};

export default Index;
