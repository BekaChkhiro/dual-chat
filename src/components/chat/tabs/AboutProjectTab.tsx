import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { FileText, Save, Edit, X, Building2, Users, Calendar as CalendarIcon, Copy, StickyNote, Trash2, Pin, PinOff } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AboutProjectTabProps {
  chatId: string;
}

export const AboutProjectTab = ({ chatId }: AboutProjectTabProps) => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState("");
  const [membersCount, setMembersCount] = useState<number | null>(null);
  const [newNote, setNewNote] = useState("");
  const { user } = useAuth();
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  // Docs (pages)
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [docEditMode, setDocEditMode] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docContent, setDocContent] = useState("");
  const [newDocTitle, setNewDocTitle] = useState("");

  const { data: chat, isLoading } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chats")
        .select("*")
        .eq("id", chatId)
        .single();

      if (error) throw error;

      // Initialize description state when data loads
      if (data?.project_description) {
        setDescription(data.project_description);
      }

      return data;
    },
  });

  // Load members count
  useQuery({
    queryKey: ["chat_members_count", chatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_members")
        .select("user_id").eq("chat_id", chatId);
      if (error) throw error;
      setMembersCount(data?.length || 0);
      return data?.length || 0;
    },
  });

  // Notes list
  const { data: notes = [] } = useQuery({
    queryKey: ["chat_notes", chatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_notes")
        .select("id, content, created_at, updated_at, created_by, pinned")
        .eq("chat_id", chatId)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) throw new Error("ცარიელი შენიშვნა");
      const { error } = await supabase.from("chat_notes").insert({
        chat_id: chatId,
        content: trimmed,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewNote("");
      queryClient.invalidateQueries({ queryKey: ["chat_notes", chatId] });
      toast.success("შენიშვნა დამატებულია");
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "ვერ დავამატე შენიშვნა");
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase.from("chat_notes").delete().eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat_notes", chatId] });
      toast.success("შენიშვნა წაიშალა");
    },
    onError: () => toast.error("შენიშვნის წაშლა ვერ მოხერხდა"),
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const trimmed = content.trim();
      if (!trimmed) throw new Error("ცარიელი შენიშვნა");
      const { error } = await supabase
        .from("chat_notes")
        .update({ content: trimmed })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat_notes", chatId] });
      toast.success("შენიშვნა განახლდა");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "ვერ განახლდა შენიშვნა"),
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const { error } = await supabase
        .from("chat_notes")
        .update({ pinned })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat_notes", chatId] });
    },
  });

  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const renderMarkdown = (raw: string) => {
    // Basic, safe-ish markdown rendering (bold, italic, code, links, line breaks)
    let s = raw;
    s = s.replace(/\r\n/g, "\n");
    // Code blocks ``` with horizontal scroll if long
    s = s.replace(/```([\s\S]*?)```/g, (_m, code) => `<pre class="bg-muted p-2 rounded overflow-x-auto"><code>${escapeHtml(code)}</code></pre>`);
    // Escape others before inline transforms
    s = escapeHtml(s);
    // Inline code
    s = s.replace(/`([^`]+)`/g, '<code class="bg-muted px-1 rounded">$1</code>');
    // Bold and italic
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // Links
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline text-primary">$1<\/a>');
    // Line breaks
    s = s.replace(/\n/g, '<br/>');
    return { __html: s };
  };

  // Project Docs (pages)
  const { data: docs = [] } = useQuery({
    queryKey: ["chat_docs", chatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_docs")
        .select("id, title, content, order_index, created_at, updated_at, created_by")
        .eq("chat_id", chatId)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    onSuccess: (list) => {
      if (list && list.length > 0 && !selectedDocId) {
        const first = list[0];
        setSelectedDocId(first.id);
        setDocTitle(first.title);
        setDocContent(first.content || "");
        setDocEditMode(false);
      }
    },
  });

  const createDocMutation = useMutation({
    mutationFn: async (title: string) => {
      const trimmed = title.trim();
      if (!trimmed) throw new Error("სათაური სავალდებულოა");
      const nextIndex = (docs?.length || 0) + 1;
      const { data, error } = await supabase
        .from("chat_docs")
        .insert({ chat_id: chatId, title: trimmed, content: "", order_index: nextIndex, created_by: user!.id })
        .select("id, title, content")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (doc) => {
      setNewDocTitle("");
      queryClient.invalidateQueries({ queryKey: ["chat_docs", chatId] });
      setSelectedDocId(doc.id);
      setDocTitle(doc.title);
      setDocContent(doc.content || "");
      setDocEditMode(true);
      toast.success("გვერდი შეიქმნა");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "ვერ შეიქმნა გვერდი"),
  });

  const updateDocMutation = useMutation({
    mutationFn: async ({ id, title, content }: { id: string; title: string; content: string }) => {
      const { error } = await supabase.from("chat_docs").update({ title: title.trim() || "Untitled", content }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat_docs", chatId] });
      setDocEditMode(false);
      toast.success("გვერდი შენახულია");
    },
    onError: () => toast.error("ვერ შეინახა დოკუმენტი"),
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (doc: any) => {
      const { error } = await supabase.from("chat_docs").delete().eq("id", doc.id);
      if (error) throw error;
      return doc;
    },
    onSuccess: (deletedDoc) => {
      queryClient.invalidateQueries({ queryKey: ["chat_docs", chatId] });
      if (selectedDocId === deletedDoc.id) {
        setSelectedDocId(null);
        setDocTitle("");
        setDocContent("");
        setDocEditMode(false);
      }
      toast.success("გვერდი წაიშალა", {
        action: {
          label: "დაბრუნება",
          onClick: async () => {
            const payload = {
              id: deletedDoc.id,
              chat_id: chatId,
              title: deletedDoc.title,
              content: deletedDoc.content || "",
              order_index: deletedDoc.order_index || 1,
              created_by: deletedDoc.created_by,
            } as any;
            const { error } = await supabase.from("chat_docs").insert(payload);
            if (error) {
              console.error("Doc undo failed:", error);
              toast.error("ვერ დავაბრუნე გვერდი");
            } else {
              queryClient.invalidateQueries({ queryKey: ["chat_docs", chatId] });
              toast.success("გვერდი დაბრუნებულია");
            }
          },
        },
      });
    },
    onError: () => toast.error("გვერდის წაშლა ვერ მოხერხდა"),
  });

  const updateDescriptionMutation = useMutation({
    mutationFn: async (newDescription: string) => {
      const { error } = await supabase
        .from("chats")
        .update({ project_description: newDescription })
        .eq("id", chatId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
      setIsEditing(false);
      toast.success("პროექტის აღწერა შენახულია");
    },
    onError: (error) => {
      toast.error("შენახვა ვერ მოხერხდა");
      console.error(error);
    },
  });

  const handleSave = () => {
    updateDescriptionMutation.mutate(description);
  };

  const handleCancel = () => {
    setDescription(chat?.project_description || "");
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">ჩატვირთვა...</p>
      </div>
    );
  }

return (
  <div className="flex-1 min-h-0 flex flex-col">
    <ScrollArea className="flex-1 p-6">
        <div className="max-w-full space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">პროექტის შესახებ</h2>
                <p className="text-sm text-muted-foreground">
                  დაამატეთ დეტალური ინფორმაცია პროექტის შესახებ
                </p>
              </div>
            </div>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                რედაქტირება
              </Button>
            )}
          </div>
          
          {/* Main Content Tabs */}
          <Tabs defaultValue="docs" className="w-full">
            <TabsList className="mb-4 w-full justify-start rounded-none border-b bg-transparent p-0">
              <TabsTrigger value="docs" className="rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground">დოკუმენტები</TabsTrigger>
              <TabsTrigger value="description" className="rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground">პროექტის აღწერა</TabsTrigger>
              <TabsTrigger value="notes" className="rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground">შენიშვნები</TabsTrigger>
              <TabsTrigger value="info" className="rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground">პროექტის ინფორმაცია</TabsTrigger>
            </TabsList>

            <TabsContent value="docs" className="m-0 data-[state=inactive]:hidden">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">დოკუმენტები</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="space-y-3 lg:col-span-1">
                      <div className="flex items-center gap-2">
                        <Input placeholder="ახალი გვერდის სათაური" value={newDocTitle} onChange={(e) => setNewDocTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') createDocMutation.mutate(newDocTitle); }} />
                        <Button onClick={() => createDocMutation.mutate(newDocTitle)} disabled={createDocMutation.isPending || !newDocTitle.trim()}>დამატება</Button>
                      </div>
                      <div className="border rounded-md divide-y">
                        {(docs || []).map((d: any) => (
                          <div key={d.id} className={`flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-muted ${selectedDocId === d.id ? 'bg-muted/50' : ''}`} onClick={() => { setSelectedDocId(d.id); setDocTitle(d.title); setDocContent(d.content || ''); setDocEditMode(false); }}>
                            <div className="truncate text-sm font-medium">{d.title || 'Untitled'}</div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => e.stopPropagation()} title="წაშლა">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>გვერდის წაშლა?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    ეს ქმედება შეუქცევადია. გსურთ წაშალოთ „{d.title || 'Untitled'}“?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>გაუქმება</AlertDialogCancel>
                                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.stopPropagation(); deleteDocMutation.mutate(d); }}>წაშლა</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        ))}
                        {(docs || []).length === 0 && (
                          <div className="p-3 text-sm text-muted-foreground">ჯერ არ არის გვერდები</div>
                        )}
                      </div>
                    </div>
                    <div className="lg:col-span-2">
                      {selectedDocId ? (
                        <div className="space-y-3">
                          {!docEditMode ? (
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-lg">{docTitle || 'Untitled'}</h3>
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => setDocEditMode(true)}>
                                  <Edit className="w-4 h-4 mr-2" /> რედაქტირება
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="გვერდის სათაური" />
                            </div>
                          )}
                          {!docEditMode ? (
                            <div className="prose prose-sm max-w-none bg-muted/30 rounded-lg p-4 break-words whitespace-pre-wrap" dangerouslySetInnerHTML={renderMarkdown(docContent)} />
                          ) : (
                            <div className="space-y-2">
                              <Textarea className="min-h-[320px]" value={docContent} onChange={(e) => setDocContent(e.target.value)} placeholder="შეიყვანეთ Markdown..." />
                              <div className="flex items-center gap-2">
                                <Button variant="outline" onClick={() => { setDocEditMode(false); const current = (docs || []).find((x:any)=>x.id===selectedDocId); setDocTitle(current?.title||''); setDocContent(current?.content||''); }}>გაუქმება</Button>
                                <Button onClick={() => updateDocMutation.mutate({ id: selectedDocId, title: docTitle, content: docContent })}>შენახვა</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">აირჩიეთ გვერდი ან შექმენით ახალი</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="description" className="m-0 data-[state=inactive]:hidden">
              {isEditing ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">პროექტის აღწერა</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="აღწერეთ პროექტი, მისი მიზნები, მოთხოვნები და ნებისმიერი სხვა დეტალი..." className="min-h-[380px] resize-none" maxLength={5000} />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{description.trim().split(/\s+/).filter(Boolean).length} სიტყვა • {description.length} / 5000 სიმბოლო</p>
                      <div className="flex gap-2">
                        <Button onClick={handleCancel} variant="outline" disabled={updateDescriptionMutation.isPending}><X className="w-4 h-4 mr-2" />გაუქმება</Button>
                        <Button onClick={handleSave} disabled={updateDescriptionMutation.isPending}><Save className="w-4 h-4 mr-2" />{updateDescriptionMutation.isPending ? "შენახვა..." : "შენახვა"}</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="pb-2 flex items-center justify-between">
                    <CardTitle className="text-base">პროექტის აღწერა</CardTitle>
                    {chat?.project_description && (
                      <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(chat.project_description || ""); toast.success("აღწერა დაკოპირდა"); }}><Copy className="w-4 h-4 mr-2" />დაკოპირება</Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {chat?.project_description ? (
                      <div className="bg-muted/30 rounded-lg p-6 whitespace-pre-wrap">{chat.project_description}</div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                        <p className="text-muted-foreground text-lg mb-2">პროექტის აღწერა არ არის დამატებული</p>
                        <p className="text-sm text-muted-foreground mb-4">დააჭირეთ რედაქტირების ღილაკს, რომ დაამატოთ აღწერა</p>
                        <Button onClick={() => setIsEditing(true)}><Edit className="w-4 h-4 mr-2" />აღწერის დამატება</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            <TabsContent value="notes" className="m-0 data-[state=inactive]:hidden">
              <Card>
                <CardHeader className="pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-base">შენიშვნები</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <button className={`px-3 py-1.5 rounded-full text-sm border ${showPinnedOnly ? "bg-background" : "bg-primary text-primary-foreground border-transparent"}`} onClick={() => setShowPinnedOnly(false)}>ყველა</button>
                    <button className={`px-3 py-1.5 rounded-full text-sm border ${showPinnedOnly ? "bg-primary text-primary-foreground border-transparent" : "bg-background"}`} onClick={() => setShowPinnedOnly(true)}>Pinned</button>
                  </div>
                  <div className="space-y-2">
                    <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="დაამატეთ შენიშვნა..." className="min-h-[90px]" maxLength={2000} />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{newNote.length} / 2000</span>
                      <Button size="sm" onClick={() => addNoteMutation.mutate(newNote)} disabled={addNoteMutation.isPending || !newNote.trim()}>დამატება</Button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {(notes || []).filter((n: any) => (showPinnedOnly ? n.pinned : true)).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">ჯერ არ არის შენიშვნები</p>
                    ) : (
                      notes.filter((n: any) => (showPinnedOnly ? n.pinned : true)).map((n: any) => (
                        <NoteItem key={n.id} note={n} onDelete={() => deleteNoteMutation.mutate(n.id)} onSave={(content) => updateNoteMutation.mutate({ id: n.id, content })} onTogglePin={() => togglePinMutation.mutate({ id: n.id, pinned: !n.pinned })} renderMarkdown={renderMarkdown} />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="info" className="m-0 data-[state=inactive]:hidden">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">პროექტის ინფორმაცია</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2"><div className="p-1.5 bg-muted rounded"><FileText className="w-4 h-4 text-muted-foreground" /></div><div className="text-muted-foreground">კლიენტი:</div><div className="font-medium">{chat?.client_name || "-"}</div></div>
                  <div className="flex items-center gap-2"><div className="p-1.5 bg-muted rounded"><Building2 className="w-4 h-4 text-muted-foreground" /></div><div className="text-muted-foreground">კომპანია:</div><div className="font-medium">{chat?.company_name || "-"}</div></div>
                  <div className="flex items-center gap-2"><div className="p-1.5 bg-muted rounded"><Users className="w-4 h-4 text-muted-foreground" /></div><div className="text-muted-foreground">გუნდის წევრები:</div><div className="font-medium">{membersCount ?? "-"}</div></div>
                  <div className="flex items-center gap-2"><div className="p-1.5 bg-muted rounded"><CalendarIcon className="w-4 h-4 text-muted-foreground" /></div><div className="text-muted-foreground">შექმნის თარიღი:</div><div className="font-medium">{chat?.created_at ? format(new Date(chat.created_at), "d MMM, yyyy", { locale: ka }) : "-"}</div></div>
                  {chat?.updated_at && (<div className="text-xs text-muted-foreground">ბოლო ცვლილება: {formatDistanceToNow(new Date(chat.updated_at), { addSuffix: true, locale: ka })}</div>)}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Legacy layout (hidden) */}
          {false && (
          <div className="grid gap-6 xl:grid-cols-3">
            {/* Left: Docs + Description (2 cols) */}
            <div className="space-y-4 xl:col-span-2">
              {/* Docs / Pages */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">დოკუმენტები</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 lg:grid-cols-3">
                    {/* Sidebar */}
                    <div className="space-y-3 lg:col-span-1">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="ახალი გვერდის სათაური"
                          value={newDocTitle}
                          onChange={(e) => setNewDocTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') createDocMutation.mutate(newDocTitle);
                          }}
                        />
                        <Button
                          onClick={() => createDocMutation.mutate(newDocTitle)}
                          disabled={createDocMutation.isPending || !newDocTitle.trim()}
                        >
                          დამატება
                        </Button>
                      </div>
                      <div className="border rounded-md divide-y">
                        {(docs || []).map((d: any) => (
                          <div
                            key={d.id}
                            className={`flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-muted ${selectedDocId === d.id ? 'bg-muted/50' : ''}`}
                            onClick={() => {
                              setSelectedDocId(d.id);
                              setDocTitle(d.title);
                              setDocContent(d.content || '');
                              setDocEditMode(false);
                            }}
                          >
                            <div className="truncate text-sm font-medium">{d.title || 'Untitled'}</div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => { e.stopPropagation(); deleteDocMutation.mutate(d.id); }}
                              title="წაშლა"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        {(docs || []).length === 0 && (
                          <div className="p-3 text-sm text-muted-foreground">ჯერ არ არის გვერდები</div>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="lg:col-span-2">
                      {selectedDocId ? (
                        <div className="space-y-3">
                          {!docEditMode ? (
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-lg">{docTitle || 'Untitled'}</h3>
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => setDocEditMode(true)}>
                                  <Edit className="w-4 h-4 mr-2" /> რედაქტირება
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="გვერდის სათაური" />
                            </div>
                          )}

                          {!docEditMode ? (
                            <div className="prose prose-sm max-w-none bg-muted/30 rounded-lg p-4 break-words whitespace-pre-wrap" dangerouslySetInnerHTML={renderMarkdown(docContent)} />
                          ) : (
                            <div className="space-y-2">
                              <Textarea className="min-h-[320px]" value={docContent} onChange={(e) => setDocContent(e.target.value)} placeholder="შეიყვანეთ Markdown..." />
                              <div className="flex items-center gap-2">
                                <Button variant="outline" onClick={() => { setDocEditMode(false); /* revert to current from docs list */ const current = (docs || []).find((x:any)=>x.id===selectedDocId); setDocTitle(current?.title||''); setDocContent(current?.content||''); }}>გაუქმება</Button>
                                <Button onClick={() => updateDocMutation.mutate({ id: selectedDocId, title: docTitle, content: docContent })}>შენახვა</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">აირჩიეთ გვერდი ან შექმენით ახალი</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              {isEditing ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">პროექტის აღწერა</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="აღწერეთ პროექტი, მისი მიზნები, მოთხოვნები და ნებისმიერი სხვა დეტალი..."
                      className="min-h-[380px] resize-none"
                      maxLength={5000}
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {description.trim().split(/\s+/).filter(Boolean).length} სიტყვა • {description.length} / 5000 სიმბოლო
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleCancel}
                          variant="outline"
                          disabled={updateDescriptionMutation.isPending}
                        >
                          <X className="w-4 h-4 mr-2" />
                          გაუქმება
                        </Button>
                        <Button
                          onClick={handleSave}
                          disabled={updateDescriptionMutation.isPending}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {updateDescriptionMutation.isPending ? "შენახვა..." : "შენახვა"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="pb-2 flex items-center justify-between">
                    <CardTitle className="text-base">პროექტის აღწერა</CardTitle>
                    {chat?.project_description && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(chat.project_description || "");
                          toast.success("აღწერა დაკოპირდა");
                        }}
                      >
                        <Copy className="w-4 h-4 mr-2" /> დაკოპირება
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {chat?.project_description ? (
                      <div className="bg-muted/30 rounded-lg p-6 whitespace-pre-wrap">
                        {chat.project_description}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                        <p className="text-muted-foreground text-lg mb-2">პროექტის აღწერა არ არის დამატებული</p>
                        <p className="text-sm text-muted-foreground mb-4">დააჭირეთ რედაქტირების ღილაკს, რომ დაამატოთ აღწერა</p>
                        <Button onClick={() => setIsEditing(true)}>
                          <Edit className="w-4 h-4 mr-2" /> აღწერის დამატება
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right: Project Info + Notes */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">პროექტის ინფორმაცია</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-muted rounded">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="text-muted-foreground">კლიენტი:</div>
                    <div className="font-medium">{chat?.client_name || "-"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-muted rounded">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="text-muted-foreground">კომპანია:</div>
                    <div className="font-medium">{chat?.company_name || "-"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-muted rounded">
                      <Users className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="text-muted-foreground">გუნდის წევრები:</div>
                    <div className="font-medium">{membersCount ?? "-"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-muted rounded">
                      <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="text-muted-foreground">შექმნის თარიღი:</div>
                    <div className="font-medium">
                      {chat?.created_at ? format(new Date(chat.created_at), "d MMM, yyyy", { locale: ka }) : "-"}
                    </div>
                  </div>
                  {chat?.updated_at && (
                    <div className="text-xs text-muted-foreground">
                      ბოლო ცვლილება: {formatDistanceToNow(new Date(chat.updated_at), { addSuffix: true, locale: ka })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader className="pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-base">შენიშვნები</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Filter */}
                  <div className="flex items-center gap-2">
                    <button
                      className={`px-3 py-1.5 rounded-full text-sm border ${
                        showPinnedOnly ? "bg-background" : "bg-primary text-primary-foreground border-transparent"
                      }`}
                      onClick={() => setShowPinnedOnly(false)}
                    >
                      ყველა
                    </button>
                    <button
                      className={`px-3 py-1.5 rounded-full text-sm border ${
                        showPinnedOnly ? "bg-primary text-primary-foreground border-transparent" : "bg-background"
                      }`}
                      onClick={() => setShowPinnedOnly(true)}
                    >
                     Pinned
                    </button>
                  </div>
                  <div className="space-y-2">
                    <Textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="დაამატეთ შენიშვნა..."
                      className="min-h-[90px]"
                      maxLength={2000}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{newNote.length} / 2000</span>
                      <Button
                        size="sm"
                        onClick={() => addNoteMutation.mutate(newNote)}
                        disabled={addNoteMutation.isPending || !newNote.trim()}
                      >
                        დამატება
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {(notes || []).filter((n: any) => (showPinnedOnly ? n.pinned : true)).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        ჯერ არ არის შენიშვნები
                      </p>
                    ) : (
                      notes
                        .filter((n: any) => (showPinnedOnly ? n.pinned : true))
                        .map((n: any) => (
                          <NoteItem
                            key={n.id}
                            note={n}
                            onDelete={() => deleteNoteMutation.mutate(n.id)}
                            onSave={(content) => updateNoteMutation.mutate({ id: n.id, content })}
                            onTogglePin={() => togglePinMutation.mutate({ id: n.id, pinned: !n.pinned })}
                            renderMarkdown={renderMarkdown}
                          />
                        ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

const NoteItem = ({
  note,
  onDelete,
  onSave,
  onTogglePin,
  renderMarkdown,
}: {
  note: any;
  onDelete: () => void;
  onSave: (content: string) => void;
  onTogglePin: () => void;
  renderMarkdown: (raw: string) => { __html: string };
}) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(note.content as string);
  const isEdited = note.updated_at && note.updated_at !== note.created_at;

  return (
    <div className={`rounded-md border p-3 ${note.pinned ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-muted/20'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm w-full">
          {editing ? (
            <div className="space-y-2">
              <Textarea value={val} onChange={(e) => setVal(e.target.value)} className="min-h-[100px]" />
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => { setEditing(false); setVal(note.content); }}>
                  <X className="w-4 h-4 mr-1" /> გაუქმება
                </Button>
                <Button size="sm" onClick={() => { onSave(val); setEditing(false); }} disabled={!val.trim()}>
                  <Save className="w-4 h-4 mr-1" /> შენახვა
                </Button>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={renderMarkdown(note.content)} />
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing((v) => !v)} title="რედაქტირება">
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onTogglePin} title={note.pinned ? 'Unpin' : 'Pin'}>
            {note.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
            title="წაშლა"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
        {formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: ka })}
        {isEdited && <span>• რედაქტირებული</span>}
        {note.pinned && <span>•Pinned</span>}
      </div>
    </div>
  );
};
