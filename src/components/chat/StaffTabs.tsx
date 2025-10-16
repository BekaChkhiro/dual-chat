import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, FileText, CheckSquare, LayoutGrid, Calendar } from "lucide-react";

interface StaffTabsProps {
  chatId: string;
  children: {
    messages: React.ReactNode;
    about: React.ReactNode;
    tasks: React.ReactNode;
    kanban: React.ReactNode;
    calendar: React.ReactNode;
  };
}

export const StaffTabs = ({ chatId, children }: StaffTabsProps) => {
  return (
    <Tabs defaultValue="messages" className="flex-1 flex flex-col">
      <TabsList className="w-full justify-start rounded-none border-b bg-white p-0">
        <TabsTrigger
          value="messages"
          className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground transition-all data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          შეტყობინებები
        </TabsTrigger>
        <TabsTrigger
          value="about"
          className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground transition-all data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
        >
          <FileText className="w-4 h-4 mr-2" />
          პროექტის შესახებ
        </TabsTrigger>
        <TabsTrigger
          value="tasks"
          className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground transition-all data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
        >
          <CheckSquare className="w-4 h-4 mr-2" />
          ამოცანები
        </TabsTrigger>
        <TabsTrigger
          value="kanban"
          className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground transition-all data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
        >
          <LayoutGrid className="w-4 h-4 mr-2" />
          კანბანი
        </TabsTrigger>
        <TabsTrigger
          value="calendar"
          className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground transition-all data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
        >
          <Calendar className="w-4 h-4 mr-2" />
          კალენდარი
        </TabsTrigger>
      </TabsList>

      <TabsContent value="messages" className="flex-1 flex flex-col m-0 p-0 bg-staff-light staff-mode data-[state=inactive]:hidden">
        {children.messages}
      </TabsContent>

      <TabsContent value="about" className="flex-1 flex flex-col m-0 p-0 bg-white data-[state=inactive]:hidden">
        {children.about}
      </TabsContent>

      <TabsContent value="tasks" className="flex-1 flex flex-col m-0 p-0 bg-white data-[state=inactive]:hidden">
        {children.tasks}
      </TabsContent>

      <TabsContent value="kanban" className="flex-1 flex flex-col m-0 p-0 bg-white data-[state=inactive]:hidden">
        {children.kanban}
      </TabsContent>

      <TabsContent value="calendar" className="flex-1 flex flex-col m-0 p-0 bg-white data-[state=inactive]:hidden">
        {children.calendar}
      </TabsContent>
    </Tabs>
  );
};
