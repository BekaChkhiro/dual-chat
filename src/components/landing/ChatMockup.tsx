import { MessageSquare, Users, MoreVertical, Shield, Send, FileText, CheckSquare, LayoutGrid, Calendar } from "lucide-react";
import { useState, useRef, useEffect, useMemo, memo } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface Message {
  id: number;
  sender: string;
  content: string;
  time: string;
  isStaffOnly: boolean;
  isOwn: boolean;
}

// Separate memoized component for message input to prevent remounting
interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSend: () => void;
  isStaffMode: boolean;
}

const MessageInput = memo(({ value, onChange, onKeyPress, onSend, isStaffMode }: MessageInputProps) => {
  return (
    <div className="bg-card border-t px-4 py-3">
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder="დაწერეთ მესიჯი..."
          className="flex-1"
        />
        <Button
          onClick={onSend}
          disabled={!value.trim()}
          size="icon"
          className={cn(
            "h-9 w-9",
            isStaffMode && "bg-staff hover:bg-staff-hover"
          )}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
});

MessageInput.displayName = "MessageInput";

export const ChatMockup = () => {
  const [isStaffMode, setIsStaffMode] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "თქვენ",
      content: "გამარჯობა! როდის გვექნება შემდეგი შეხვედრა?",
      time: "14:30",
      isStaffOnly: false,
      isOwn: true,
    },
    {
      id: 2,
      sender: "კლიენტი",
      content: "გამარჯობა! პარასკევს 15:00 საათზე გამოვა?",
      time: "14:32",
      isStaffOnly: false,
      isOwn: false,
    },
    {
      id: 3,
      sender: "გიორგი",
      content: "არ დაგვავიწყდეს პრეზენტაციის მომზადება შეხვედრამდე",
      time: "14:33",
      isStaffOnly: true,
      isOwn: false,
    },
    {
      id: 4,
      sender: "თქვენ",
      content: "კარგი, მე მოვამზადებ დოკუმენტაციას",
      time: "14:34",
      isStaffOnly: true,
      isOwn: true,
    },
    {
      id: 5,
      sender: "თქვენ",
      content: "შესანიშნავია! პარასკევს 15:00 დაგელოდებით",
      time: "14:35",
      isStaffOnly: false,
      isOwn: true,
    },
  ]);

  const filteredMessages = messages.filter((msg) =>
    isStaffMode ? msg.isStaffOnly : !msg.isStaffOnly
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  const getCurrentTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;

    const newMessage: Message = {
      id: messages.length + 1,
      sender: "თქვენ",
      content: messageInput,
      time: getCurrentTime(),
      isStaffOnly: isStaffMode,
      isOwn: true,
    };

    setMessages([...messages, newMessage]);
    setMessageInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Messages display area - memoized
  const MessagesDisplay = useMemo(() => (
    <div className={cn(
      "flex-1 overflow-y-auto p-4 space-y-4",
      isStaffMode ? "bg-staff-light" : "bg-white"
    )}>
      {filteredMessages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
          <MessageSquare className="w-12 h-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {isStaffMode ? "არ არის staff მესიჯები" : "არ არის კლიენტის მესიჯები"}
          </p>
        </div>
      ) : (
        <>
          {filteredMessages.map((msg, index) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-2",
                msg.isOwn ? "justify-end" : "justify-start",
                "animate-fade-in-up"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="max-w-[70%] space-y-1">
                {!msg.isOwn && (
                  <div className="flex items-center gap-2 px-3">
                    <span className="text-xs font-medium text-foreground">
                      {msg.sender}
                    </span>
                    {msg.isStaffOnly && <Shield className="w-3 h-3 text-staff" />}
                  </div>
                )}
                <div
                  className={cn(
                    "rounded-2xl shadow-sm",
                    msg.isOwn
                      ? msg.isStaffOnly
                        ? "bg-staff text-staff-foreground rounded-tr-sm"
                        : "bg-chat-sent text-primary-foreground rounded-tr-sm"
                      : "bg-chat-received text-foreground rounded-tl-sm"
                  )}
                >
                  <div className="px-4 py-2">
                    <p className="text-sm break-words">{msg.content}</p>
                  </div>
                </div>
                <div
                  className={cn(
                    "text-xs px-3",
                    msg.isOwn ? "text-right" : "text-left",
                    "text-muted-foreground/70"
                  )}
                >
                  {msg.time}
                </div>
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </>
      )}
    </div>
  ), [filteredMessages, isStaffMode, scrollRef]);

  // About tab mockup content
  const AboutContent = () => (
    <div className="flex-1 overflow-y-auto p-6 bg-white">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">პროექტის აღწერა</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Marketing Project - ციფრული მარკეტინგის სრული სერვისების პაკეტი. პროექტი მოიცავს
            სოციალური მედიის მართვას, კონტენტის შექმნას და რეკლამის კამპანიების ორგანიზებას.
          </p>
        </div>
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">სტატუსი</span>
            <span className="font-medium text-primary">მიმდინარე</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">დაწყების თარიღი</span>
            <span className="font-medium">15 იანვარი 2025</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">ბიუჯეტი</span>
            <span className="font-medium">$5,000</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Tasks tab mockup content
  const TasksContent = () => (
    <div className="flex-1 overflow-y-auto p-4 bg-white">
      <div className="space-y-3">
        {[
          { title: "დიზაინის მომზადება", status: "მიმდინარე", priority: "high" },
          { title: "კონტენტის შექმნა", status: "to_start", priority: "medium" },
          { title: "რეკლამის გაშვება", status: "review", priority: "high" },
        ].map((task, index) => (
          <div key={index} className="bg-card p-4 rounded-lg border space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 flex-1">
                <CheckSquare className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{task.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {task.status === "მიმდინარე" ? "მიმდინარე" : task.status === "to_start" ? "დასაწყებად" : "განხილვაში"}
                  </p>
                </div>
              </div>
              <span className={cn(
                "text-xs px-2 py-1 rounded whitespace-nowrap",
                task.priority === "high"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary"
              )}>
                {task.priority === "high" ? "მაღალი" : "საშუალო"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Kanban tab mockup content
  const KanbanContent = () => (
    <div className="flex-1 overflow-x-auto p-4 bg-white">
      <div className="flex gap-4 min-w-max pb-4">
        {[
          { name: "დასაწყებად", tasks: [{ title: "კონტენტის შექმნა", date: "10 თებ" }] },
          { name: "მიმდინარე", tasks: [{ title: "დიზაინის მომზადება", date: "5 თებ" }] },
          { name: "განხილვაში", tasks: [{ title: "რეკლამის გაშვება", date: "8 თებ" }] },
          { name: "დასრულებული", tasks: [] },
        ].map((column, index) => (
          <div key={index} className="w-72 space-y-3">
            <div className="flex items-center justify-between px-2">
              <h4 className="font-medium text-sm text-muted-foreground">{column.name}</h4>
              <span className="text-xs text-muted-foreground">{column.tasks.length}</span>
            </div>
            <div className="space-y-2">
              {column.tasks.map((task, taskIndex) => (
                <div key={taskIndex} className="bg-card p-3 rounded-lg border">
                  <p className="text-sm font-medium mb-1">{task.title}</p>
                  <p className="text-xs text-muted-foreground">ვადა: {task.date}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Calendar tab mockup content
  const CalendarContent = () => (
    <div className="flex-1 overflow-y-auto p-6 bg-white">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">თებერვალი 2025</h3>
        </div>
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-3 pb-3 border-b">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">თებ</div>
              <div className="text-lg font-semibold">5</div>
            </div>
            <div className="flex-1">
              <div className="bg-primary/10 text-primary px-2 py-1 rounded text-sm">
                დიზაინის მომზადება
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 pb-3 border-b">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">თებ</div>
              <div className="text-lg font-semibold">8</div>
            </div>
            <div className="flex-1">
              <div className="bg-destructive/10 text-destructive px-2 py-1 rounded text-sm">
                რეკლამის გაშვება
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">თებ</div>
              <div className="text-lg font-semibold">10</div>
            </div>
            <div className="flex-1">
              <div className="bg-primary/10 text-primary px-2 py-1 rounded text-sm">
                კონტენტის შექმნა
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Files tab mockup content
  const FilesContent = () => (
    <div className="flex-1 overflow-y-auto p-4 bg-white">
      <div className="space-y-2">
        {[
          { name: "პრეზენტაცია.pdf", size: "2.4 MB", date: "20 იან, 2025" },
          { name: "ბიუჯეტი.xlsx", size: "156 KB", date: "18 იან, 2025" },
          { name: "დიზაინი.fig", size: "8.2 MB", date: "15 იან, 2025" },
        ].map((file, index) => (
          <div key={index} className="bg-card p-3 rounded-lg border flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{file.size} • {file.date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="w-full h-full bg-background border rounded-lg shadow-2xl overflow-hidden flex flex-col relative group">
      {/* Interactive Badge */}
      <div className="absolute top-2 left-2 z-10 bg-primary text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
        <span className="w-2 h-2 bg-primary-foreground rounded-full animate-pulse" />
        {isStaffMode ? "სცადეთ ტაბები!" : "სცადეთ გაგზავნა!"}
      </div>

      {/* Chat Header with Mode Toggle */}
      <div className="bg-card border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">კლიენტი - Marketing Project</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" />3 წევრი
            </p>
          </div>
        </div>

        {/* Right side: Mode Toggle and Menu */}
        <div className="flex items-center gap-3">
          {/* Mode Toggle */}
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all",
              isStaffMode
                ? "bg-staff-light border-staff"
                : "bg-primary-light border-primary"
            )}
          >
            {isStaffMode ? (
              <Shield className="w-4 h-4 text-staff" />
            ) : (
              <Users className="w-4 h-4 text-primary" />
            )}
            <Label htmlFor="mode-toggle" className="font-medium cursor-pointer text-xs hidden sm:inline">
              {isStaffMode ? "Staff" : "კლიენტი"}
            </Label>
            <Switch
              id="mode-toggle"
              checked={isStaffMode}
              onCheckedChange={setIsStaffMode}
              className={cn(
                "scale-75",
                isStaffMode ? "data-[state=checked]:bg-staff" : ""
              )}
            />
          </div>

          {/* More menu */}
          <button className="p-2 hover:bg-accent rounded-md transition-colors">
            <MoreVertical className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Content - either simple client view or staff tabs */}
      {!isStaffMode ? (
        <div className="flex-1 flex flex-col min-h-0">
          {MessagesDisplay}
          <MessageInput
            value={messageInput}
            onChange={setMessageInput}
            onKeyPress={handleKeyPress}
            onSend={handleSendMessage}
            isStaffMode={isStaffMode}
          />
        </div>
      ) : (
        <Tabs defaultValue="messages" className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="w-full overflow-x-auto overflow-y-hidden no-scrollbar">
            <TabsList className="min-w-max inline-flex w-auto justify-start rounded-none border-b bg-white p-0 whitespace-nowrap h-auto">
              <TabsTrigger
                value="messages"
                className="relative shrink-0 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground transition-all data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                შეტყობინებები
              </TabsTrigger>
              <TabsTrigger
                value="about"
                className="relative shrink-0 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground transition-all data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                <FileText className="w-4 h-4 mr-2" />
                პროექტის შესახებ
              </TabsTrigger>
              <TabsTrigger
                value="tasks"
                className="relative shrink-0 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground transition-all data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                ამოცანები
              </TabsTrigger>
              <TabsTrigger
                value="kanban"
                className="relative shrink-0 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground transition-all data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                კანბანი
              </TabsTrigger>
              <TabsTrigger
                value="calendar"
                className="relative shrink-0 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground transition-all data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                <Calendar className="w-4 h-4 mr-2" />
                კალენდარი
              </TabsTrigger>
              <TabsTrigger
                value="files"
                className="relative shrink-0 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground transition-all data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                <FileText className="w-4 h-4 mr-2" />
                ფაილები
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="messages" className="flex-1 min-h-0 flex flex-col m-0 p-0 data-[state=inactive]:hidden">
            {MessagesDisplay}
            <MessageInput
              value={messageInput}
              onChange={setMessageInput}
              onKeyPress={handleKeyPress}
              onSend={handleSendMessage}
              isStaffMode={isStaffMode}
            />
          </TabsContent>

          <TabsContent value="about" className="flex-1 min-h-0 flex flex-col m-0 p-0 data-[state=inactive]:hidden">
            <AboutContent />
          </TabsContent>

          <TabsContent value="tasks" className="flex-1 flex flex-col m-0 p-0 data-[state=inactive]:hidden">
            <TasksContent />
          </TabsContent>

          <TabsContent value="kanban" className="flex-1 flex flex-col m-0 p-0 data-[state=inactive]:hidden">
            <KanbanContent />
          </TabsContent>

          <TabsContent value="calendar" className="flex-1 flex flex-col m-0 p-0 data-[state=inactive]:hidden">
            <CalendarContent />
          </TabsContent>

          <TabsContent value="files" className="flex-1 flex flex-col m-0 p-0 data-[state=inactive]:hidden">
            <FilesContent />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
