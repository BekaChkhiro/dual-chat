import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { ChatList } from "@/components/chat/ChatList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { CreateChatDialog } from "@/components/chat/CreateChatDialog";
import { OrganizationSwitcher } from "@/components/organization/OrganizationSwitcher";
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
      {/* Top Header */}
      <header className="border-b bg-card px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-xl">DualChat</h1>
              <p className="text-xs text-muted-foreground">
                პროფესიონალური გუნდური კომუნიკაცია
              </p>
            </div>
          </div>

          {/* Organization Switcher */}
          <div className="border-l pl-4">
            <OrganizationSwitcher />
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          გასვლა
        </Button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <ChatList
          selectedChatId={selectedChatId}
          onSelectChat={setSelectedChatId}
          onCreateChat={() => setCreateDialogOpen(true)}
        />

        {selectedChatId ? (
          <ChatWindow chatId={selectedChatId} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-chat-bg">
            <div className="text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full inline-block">
                <MessageSquare className="w-16 h-16 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">მოგესალმებით DualChat-ში</h2>
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
